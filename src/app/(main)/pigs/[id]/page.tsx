"use client"

import { Badge } from "@/components/Badge"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Tabs"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import api from "@/lib/axios"
import {
  Activity,
  ArrowLeft,
  Calendar,
  Clock,
  Heart,
  Info,
  Scale,
  Thermometer,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { AddHealthRecordDrawer } from "./_components/AddHealthRecordDrawer"
import { EditPigDrawer } from "./_components/EditPigDrawer"
import { HealthMetricCard } from "./_components/HealthMetricCard"
import { HealthStatusCard } from "./_components/HealthStatusCard"
import { LineChart } from "./_components/LineChartReal"
import { TransactionChart } from "./_components/TransactionChartSimple"

interface PigData {
  _id: string // The MongoDB ObjectId as a string
  pigId: number // Numeric pig ID
  tag: string
  breed: string
  age: number
  lastUpdate: string // ISO 8601 formatted date-time string
  active: boolean
  currentLocation?: {
    farmId?: string
    barnId?: string
    stallId?: string
  }
  __v: number // Version key, can be omitted in some cases
}

interface BCSData {
  _id: string // The MongoDB ObjectId as a string
  pigId: number // Numeric pig ID
  timestamp: string // ISO 8601 formatted date-time string
  score: number // BCS score value
  __v: number // Version key, can be omitted in some cases
}

interface PostureData {
  _id: string // The MongoDB ObjectId as a string
  pigId: number // Numeric pig ID
  timestamp: string // ISO 8601 formatted date-time string
  score: number // Posture score
  __v: number // Version key, can be omitted in some cases
}

export default function PigDashboard() {
  const params = useParams()
  const router = useRouter()
  const [pig, setPig] = useState<PigData | null>(null)
  // We still need to fetch BCS and posture data for other tabs
  const [bcsHistory, setBcsHistory] = useState<BCSData[]>([])
  const [postureHistory, setPostureHistory] = useState<PostureData[]>([])
  const [healthHistory, setHealthHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  // State for action buttons
  const [editPigOpen, setEditPigOpen] = useState(false)
  const [addHealthRecordOpen, setAddHealthRecordOpen] = useState(false)

  // State for location names
  const [farmName, setFarmName] = useState<string>("Not assigned")
  const [barnName, setBarnName] = useState<string>("Not assigned")
  const [stallName, setStallName] = useState<string>("No stall")

  // Function to fetch pig data
  const fetchPigData = useCallback(async () => {
    try {
      setIsLoading(true)

      // First get the pig data to get the numeric pigId
      const pigResponse = await api.get(`/pigs/${params.id}`)
      setPig(pigResponse.data)

      // Use the numeric pigId for subsequent requests
      const numericPigId = pigResponse.data.pigId

      try {
        // Fetch BCS and posture data
        const [bcsResponse, postureResponse] = await Promise.all([
          api.get(`/pigs/${numericPigId}/bcs`),
          api.get(`/pigs/${numericPigId}/posture/aggregated`),
        ])

        setBcsHistory(bcsResponse.data)
        setPostureHistory(postureResponse.data)
      } catch (dataError) {
        console.error("Error fetching BCS or posture data:", dataError)
        // Continue execution even if these fail
      }

      // Fetch health history separately with better error handling
      try {
        // Try with numeric ID first
        const healthHistoryResponse = await api.get(
          `/pigs/${numericPigId}/health-status`,
        )
        setHealthHistory(healthHistoryResponse.data || [])
      } catch (healthError) {
        console.error(
          "Error fetching health status data with numeric ID:",
          healthError,
        )

        try {
          // If that fails, try with the original ID parameter
          const healthHistoryResponse = await api.get(
            `/pigs/${params.id}/health-status`,
          )
          setHealthHistory(healthHistoryResponse.data || [])
        } catch (fallbackError) {
          console.error(
            "Error fetching health status data with original ID:",
            fallbackError,
          )
          // Set empty array if both attempts fail
          setHealthHistory([])
        }
      }
    } catch (error) {
      console.error("Error fetching pig data:", error)
      setError("Failed to fetch pig data")
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  // Function to handle printing report
  const handlePrintReport = () => {
    // Create a new window for printing
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Please allow pop-ups to print the report")
      return
    }

    // Get health status
    const healthStatus = getHealthStatus(pig?.age || 0).label

    // Generate report content
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pig #${pig?.pigId} Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          .section { margin-bottom: 20px; }
          .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .info-item { margin-bottom: 10px; }
          .label { font-weight: bold; color: #555; }
          .value { font-size: 16px; }
          .header { display: flex; justify-content: space-between; align-items: center; }
          .date { color: #777; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pig #${pig?.pigId} Report</h1>
          <div class="date">Generated: ${new Date().toLocaleString()}</div>
        </div>

        <div class="section">
          <h2>Basic Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">ID</div>
              <div class="value">${pig?.pigId}</div>
            </div>
            <div class="info-item">
              <div class="label">Tag</div>
              <div class="value">${pig?.tag}</div>
            </div>
            <div class="info-item">
              <div class="label">Breed</div>
              <div class="value">${pig?.breed}</div>
            </div>
            <div class="info-item">
              <div class="label">Age</div>
              <div class="value">${pig?.age} months</div>
            </div>
            <div class="info-item">
              <div class="label">Status</div>
              <div class="value">${pig?.active ? "Active" : "Inactive"}</div>
            </div>
            <div class="info-item">
              <div class="label">Added Date</div>
              <div class="value">${new Date(pig?.lastUpdate || "").toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Location</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Farm</div>
              <div class="value">${farmName}</div>
            </div>
            <div class="info-item">
              <div class="label">Barn</div>
              <div class="value">${barnName}</div>
            </div>
            <div class="info-item">
              <div class="label">Stall</div>
              <div class="value">${stallName}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Health Status</h2>
          <div class="info-item">
            <div class="label">Overall Health</div>
            <div class="value">${healthStatus}</div>
          </div>
        </div>

        <div class="section">
          <h2>Notes</h2>
          <p>This report was generated automatically from the Pig Management System.</p>
        </div>
      </body>
      </html>
    `

    // Write content to the new window and print
    printWindow.document.open()
    printWindow.document.write(reportContent)
    printWindow.document.close()

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  // Fetch data when the component mounts or the ID changes
  useEffect(() => {
    if (params.id) {
      fetchPigData()
    }
  }, [fetchPigData, params.id]) // fetchPigData is defined inside the component, so it's stable

  // Fetch location names when pig data changes
  useEffect(() => {
    const fetchLocationNames = async () => {
      try {
        console.log("Pig location data:", pig?.currentLocation)

        // First, try to get the stall data which should contain references to barn and farm
        if (pig?.currentLocation?.stallId) {
          console.log("Fetching stall with ID:", pig.currentLocation.stallId)
          try {
            const stallResponse = await api.get(
              `/stalls/${pig.currentLocation.stallId}`,
            )
            console.log("Stall response:", stallResponse.data)

            // Set stall name
            if (stallResponse.data && stallResponse.data.name) {
              setStallName(stallResponse.data.name)
              console.log("Set stall name to:", stallResponse.data.name)
            }

            // Get barn data from stall
            if (stallResponse.data && stallResponse.data.barnId) {
              // If barnId is an object with _id property
              const barnId =
                typeof stallResponse.data.barnId === "object" &&
                stallResponse.data.barnId?._id
                  ? stallResponse.data.barnId._id
                  : stallResponse.data.barnId

              console.log("Fetching barn with ID from stall:", barnId)
              try {
                const barnResponse = await api.get(`/barns/${barnId}`)
                console.log("Barn response:", barnResponse.data)

                // Set barn name
                if (barnResponse.data && barnResponse.data.name) {
                  setBarnName(barnResponse.data.name)
                  console.log("Set barn name to:", barnResponse.data.name)
                }

                // Get farm data from barn
                if (barnResponse.data && barnResponse.data.farmId) {
                  console.log(
                    "Fetching farm with ID from barn:",
                    barnResponse.data.farmId,
                  )
                  try {
                    const farmResponse = await api.get(
                      `/farms/${barnResponse.data.farmId}`,
                    )
                    console.log("Farm response:", farmResponse.data)

                    // Set farm name
                    if (farmResponse.data && farmResponse.data.name) {
                      setFarmName(farmResponse.data.name)
                      console.log("Set farm name to:", farmResponse.data.name)
                    }
                  } catch (farmError) {
                    console.error("Error fetching farm from barn:", farmError)
                  }
                }
              } catch (barnError) {
                console.error("Error fetching barn from stall:", barnError)
              }
            }
          } catch (stallError) {
            console.error("Error fetching stall:", stallError)
          }
        }
        // If no stall ID, try barn ID
        else if (pig?.currentLocation?.barnId) {
          console.log("Fetching barn with ID:", pig.currentLocation.barnId)
          try {
            const barnResponse = await api.get(
              `/barns/${pig.currentLocation.barnId}`,
            )
            console.log("Barn response:", barnResponse.data)

            // Set barn name
            if (barnResponse.data && barnResponse.data.name) {
              setBarnName(barnResponse.data.name)
              console.log("Set barn name to:", barnResponse.data.name)
            }

            // Get farm data from barn
            if (barnResponse.data && barnResponse.data.farmId) {
              console.log(
                "Fetching farm with ID from barn:",
                barnResponse.data.farmId,
              )
              try {
                const farmResponse = await api.get(
                  `/farms/${barnResponse.data.farmId}`,
                )
                console.log("Farm response:", farmResponse.data)

                // Set farm name
                if (farmResponse.data && farmResponse.data.name) {
                  setFarmName(farmResponse.data.name)
                  console.log("Set farm name to:", farmResponse.data.name)
                }
              } catch (farmError) {
                console.error("Error fetching farm from barn:", farmError)
              }
            }
          } catch (barnError) {
            console.error("Error fetching barn:", barnError)
          }
        }
        // If no stall or barn ID, try farm ID directly
        else if (pig?.currentLocation?.farmId) {
          console.log("Fetching farm with ID:", pig.currentLocation.farmId)
          try {
            const farmResponse = await api.get(
              `/farms/${pig.currentLocation.farmId}`,
            )
            console.log("Farm response:", farmResponse.data)

            // Set farm name
            if (farmResponse.data && farmResponse.data.name) {
              setFarmName(farmResponse.data.name)
              console.log("Set farm name to:", farmResponse.data.name)
            }
          } catch (farmError) {
            console.error("Error fetching farm:", farmError)
          }
        } else {
          console.log("No location IDs found in pig data")
        }
      } catch (error) {
        console.error("Error in fetchLocationNames:", error)
      }
    }

    if (pig) {
      fetchLocationNames()
    }
  }, [pig])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="mx-auto mt-8 max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.back()}>Go Back</Button>
        </CardFooter>
      </Card>
    )
  }

  if (!pig) {
    return (
      <Card className="mx-auto mt-8 max-w-md">
        <CardHeader>
          <CardTitle>Pig Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested pig could not be found.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.back()}>Go Back</Button>
        </CardFooter>
      </Card>
    )
  }

  // Helper function to determine health status
  const getHealthStatus = (score: number) => {
    if (score >= 4) return { label: "Critical", variant: "error" }
    if (score >= 3) return { label: "Healthy", variant: "success" }
    return { label: "Attention Needed", variant: "warning" }
  }

  // Make sure pig is not null before rendering
  if (!pig) {
    return (
      <Card className="mx-auto mt-8 max-w-md">
        <CardHeader>
          <CardTitle>Pig Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested pig could not be found.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.back()}>Go Back</Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with back button and actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="light" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              Pig #{pig?.pigId}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tag: {pig?.tag} • Breed: {pig?.breed}
            </p>
          </div>
        </div>
        {/* We don't need this right now, we can have placeholder for something else later */}
        {/* <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setAddHealthRecordOpen(true)}>
            Add Health Record
          </Button>
          <Button variant="light" onClick={() => setEditPigOpen(true)}>
            Edit Pig
          </Button>
          <Button variant="light" onClick={handlePrintReport}>
            Print Report
          </Button>
        </div> */}
      </div>

      {/* We'll use the dynamic health metrics cards instead of static ones */}

      {/* Main content tabs */}
      <Tabs
        defaultValue="overview"
        className="w-full"
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health Metrics</TabsTrigger>
          <TabsTrigger value="posture">Posture Analysis</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Health Metrics Cards - Real Data */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* BCS Card */}
            <HealthMetricCard
              title="Body Condition Score"
              endpoint={`/pigs/${pig?.pigId}/bcs/latest`}
              icon={<Scale className="h-6 w-6" />}
              optimalRange="2.5-3.5"
              formatValue={(value) => value.toFixed(1)}
              formatMetric={(data) => {
                if (!data || typeof data.score !== "number") {
                  return {
                    value: 0,
                    status: "default",
                    label: "No Data",
                    trend: "No data available",
                    trendDetail: "Unable to retrieve data",
                  }
                }
                return {
                  value: data.score,
                  status:
                    data.score >= 2.5 && data.score <= 3.5
                      ? "success"
                      : data.score < 2.0 || data.score > 4.0
                        ? "error"
                        : "warning",
                  label:
                    data.score >= 2.5 && data.score <= 3.5
                      ? "Healthy"
                      : data.score < 2.0
                        ? "Underweight"
                        : data.score > 4.0
                          ? "Overweight"
                          : "Borderline",
                  trend: "Stable condition",
                  trendDetail: "Based on recent measurements",
                }
              }}
            />

            {/* Breathing Rate Card */}
            <HealthMetricCard
              title="Breathing Rate"
              endpoint={`/pigs/${pig?.pigId}/breath-rate/latest`}
              icon={<Heart className="h-6 w-6" />}
              optimalRange="15-25 bpm"
              formatValue={(value) => `${value} bpm`}
              formatMetric={(data) => {
                if (!data || typeof data.rate !== "number") {
                  return {
                    value: 0,
                    status: "default",
                    label: "No Data",
                    trend: "No data available",
                    trendDetail: "Unable to retrieve data",
                  }
                }
                return {
                  value: data.rate,
                  status:
                    data.rate >= 15 && data.rate <= 25
                      ? "success"
                      : data.rate > 30
                        ? "error"
                        : "warning",
                  label:
                    data.rate >= 15 && data.rate <= 25
                      ? "Normal"
                      : data.rate > 30
                        ? "Critical"
                        : "Elevated",
                  trend:
                    data.rate > 25
                      ? "Elevated breathing rate"
                      : "Normal breathing rate",
                  trendDetail: "Monitor for changes",
                }
              }}
            />

            {/* Posture Card */}
            <HealthMetricCard
              title="Posture Score"
              endpoint={`/pigs/${pig?.pigId}/posture/latest`}
              icon={<Activity className="h-6 w-6" />}
              optimalRange="Score 1-2 is optimal"
              formatValue={(value) => value.toString()}
              formatMetric={(data) => {
                const postureLabels = {
                  1: "Standing",
                  2: "Lying",
                  3: "Sitting",
                  4: "Moving",
                  5: "Other",
                }

                if (!data || typeof data.score !== "number") {
                  return {
                    value: 0,
                    status: "default",
                    label: "No Data",
                    trend: "No data available",
                    trendDetail: "Unable to retrieve data",
                  }
                }

                return {
                  value: data.score,
                  status:
                    data.score <= 2
                      ? "success"
                      : data.score >= 4
                        ? "warning"
                        : "default",
                  label:
                    postureLabels[data.score as keyof typeof postureLabels] ||
                    "Unknown",
                  trend: `Current posture: ${postureLabels[data.score as keyof typeof postureLabels] || "Unknown"}`,
                  trendDetail: "Based on latest observation",
                }
              }}
            />
          </div>

          {/* Charts with real data */}

          {/* Pig Information and Health Status */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-blue-100 p-2 dark:bg-blue-900/20">
                      <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                      Pig Information
                    </h2>
                  </div>
                  <Badge
                    variant={pig?.active ? "success" : "error"}
                    className="text-xs"
                  >
                    {pig?.active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="mb-6 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        ID:
                      </span>
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
                        #{pig?.pigId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Tag:
                      </span>
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
                        {pig?.tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Breed:
                      </span>
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
                        {pig?.breed}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="flex flex-col items-center justify-center rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <Clock className="mb-2 h-6 w-6 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Age
                    </h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
                      {pig?.age}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      months
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <Calendar className="mb-2 h-6 w-6 text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Added
                    </h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
                      {new Date(pig?.lastUpdate || "").toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      registration date
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <div className="mb-2 flex h-6 w-6 items-center justify-center text-gray-400">
                      <span className="text-lg font-bold">🏠</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Location
                    </h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
                      {farmName}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {barnName} • {stallName}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                  <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-100 p-1.5 dark:bg-purple-900/20">
                        <Heart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Health Status
                        </p>
                        <p className="text-xs text-gray-500">
                          {healthHistory && healthHistory.length > 0
                            ? `Last check: ${new Date(healthHistory[0].timestamp).toLocaleDateString()}`
                            : "No health records"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 p-1.5 dark:bg-green-900/20">
                        <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Activity Level
                        </p>
                        <p className="text-xs text-gray-500">Normal range</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <HealthStatusCard pigId={pig?.pigId} />
          </div>
        </TabsContent>

        {/* Health Metrics Tab */}
        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Body Condition Score
                </CardTitle>
                <CardDescription>
                  BCS trend over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <LineChart yAxisWidth={70} type="bcs" className="h-80" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Breathing Rate
                </CardTitle>
                <CardDescription>
                  Breathing rate (breaths per minute) over time
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <LineChart yAxisWidth={70} type="breathing" className="h-80" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="h-5 w-5" />
                Vulva Swelling
              </CardTitle>
              <CardDescription>
                Vulva swelling measurements over time
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <LineChart yAxisWidth={70} type="vulva" className="h-80" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posture Analysis Tab */}
        <TabsContent value="posture" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Daily Posture Distribution
              </CardTitle>
              <CardDescription>
                Distribution of posture values (1-5) recorded each day
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <TransactionChart
                yAxisWidth={70}
                type="amount"
                className="h-[500px]"
                showPercentage={true}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Posture by Category</CardTitle>
                <CardDescription>
                  Posture distribution by category
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <TransactionChart
                  yAxisWidth={70}
                  type="category"
                  className="h-80"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Posture Interpretation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Score 1</Badge>
                      <h3 className="font-semibold">Lying flat on side</h3>
                    </div>
                    <p className="mt-2 text-sm">
                      Pig is lying completely flat on its side, often in deep
                      sleep.
                    </p>
                  </div>

                  <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
                    <div className="flex items-center gap-2">
                      <Badge variant="success">Score 2-3</Badge>
                      <h3 className="font-semibold">Lying on sternum</h3>
                    </div>
                    <p className="mt-2 text-sm">
                      Pig is lying on its sternum, a normal resting position.
                    </p>
                  </div>

                  <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">Score 4</Badge>
                      <h3 className="font-semibold">Standing</h3>
                    </div>
                    <p className="mt-2 text-sm">
                      Pig is standing on all four legs, alert and active.
                    </p>
                  </div>

                  <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                    <div className="flex items-center gap-2">
                      <Badge variant="error">Score 5</Badge>
                      <h3 className="font-semibold">Abnormal posture</h3>
                    </div>
                    <p className="mt-2 text-sm">
                      Pig is showing signs of discomfort or abnormal posture,
                      may require attention.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Recent activity and events for this pig
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Display actual health history data */}
                {healthHistory && healthHistory.length > 0 ? (
                  healthHistory.slice(0, 5).map((record, index) => {
                    // Determine the color based on health status
                    let statusColor = "bg-primary"
                    if (record.status === "critical") statusColor = "bg-red-500"
                    else if (record.status === "at risk")
                      statusColor = "bg-yellow-500"
                    else if (record.status === "healthy")
                      statusColor = "bg-green-500"
                    else if (record.status === "no movement")
                      statusColor = "bg-gray-500"

                    // Format the date
                    const recordDate = new Date(record.timestamp)
                    const dateString = recordDate.toLocaleDateString()
                    const timeString = recordDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })

                    // Format metrics if available
                    const metricsText = []
                    if (record.metrics) {
                      if (record.metrics.temperature)
                        metricsText.push(
                          `Temperature: ${record.metrics.temperature}°C`,
                        )
                      if (record.metrics.respiratoryRate)
                        metricsText.push(
                          `Respiratory Rate: ${record.metrics.respiratoryRate} bpm`,
                        )
                      if (record.metrics.weight)
                        metricsText.push(`Weight: ${record.metrics.weight} kg`)
                    }

                    return (
                      <div className="flex gap-4" key={record._id}>
                        <div className="relative flex-none">
                          {index < healthHistory.length - 1 && (
                            <div className="absolute bottom-0 left-2.5 top-0 w-px bg-gray-200 dark:bg-gray-800"></div>
                          )}
                          <div
                            className={`relative z-10 h-5 w-5 rounded-full ${statusColor}`}
                          ></div>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-sm font-medium">
                            Health Status:{" "}
                            {record.status.charAt(0).toUpperCase() +
                              record.status.slice(1)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {dateString} at {timeString}
                          </p>
                          {metricsText.length > 0 && (
                            <p className="mt-2 text-sm">
                              {metricsText.join(" • ")}
                            </p>
                          )}
                          <p className="mt-1 text-sm">{record.notes}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-gray-500">
                      No health records found for this pig.
                    </p>
                    <Button
                      variant="light"
                      className="mt-2"
                      onClick={() => setAddHealthRecordOpen(true)}
                    >
                      Add First Health Record
                    </Button>
                  </div>
                )}

                {/* System entry - always show */}
                <div className="flex gap-4">
                  <div className="relative flex-none">
                    <div className="relative z-10 h-5 w-5 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-medium">Added to system</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(pig?.lastUpdate || "").toLocaleDateString()}
                    </p>
                    <p className="mt-2 text-sm">
                      Pig #{pig?.pigId} with tag {pig?.tag} was added to the
                      system
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="light" onClick={() => setEditPigOpen(true)}>
          Edit Pig
        </Button>
        <Button variant="light" onClick={handlePrintReport}>
          Print Report
        </Button>
        <Button onClick={() => setAddHealthRecordOpen(true)}>
          Add Health Record
        </Button>
      </div>

      {/* Edit Pig Drawer */}
      <EditPigDrawer
        open={editPigOpen}
        onOpenChange={setEditPigOpen}
        pigData={
          pig
            ? {
                ...pig,
                currentLocation: pig.currentLocation || {},
              }
            : null
        }
        onSuccess={() => {
          // Refresh pig data after successful edit
          fetchPigData()
        }}
      />

      {/* Add Health Record Drawer */}
      <AddHealthRecordDrawer
        open={addHealthRecordOpen}
        onOpenChange={setAddHealthRecordOpen}
        pigId={pig?.pigId}
        onSuccess={() => {
          // Refresh pig data after adding health record
          fetchPigData()
        }}
      />
    </div>
  )
}
