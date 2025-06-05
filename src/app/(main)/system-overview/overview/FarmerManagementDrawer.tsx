"use client"
import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/Drawer"
import { Input } from "@/components/Input"
import { Label } from "@/components/Label"
import api from "@/lib/axios"
import React, { useCallback, useEffect, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog"
import { RiAddLine, RiDeleteBin4Fill } from "@remixicon/react"
import { ArrowUpWideNarrow, MapPinHouse } from "lucide-react"
import { toast } from "react-hot-toast" // optional for better feedback UX
import {
  Select,
  SelectContent,
  SelectItemExtended,
  SelectTrigger,
  SelectValue,
} from "../../../../components/Select"

var farmCount = 0
var barnCount = 0
var stallCount = 0

// -------------------------
// Types for API data

type Farm = {
  _id: string
  name: string
  location?: string
  barns: Barn[] // Each farm now has an empty barns array.
}

type Barn = {
  _id: string
  name: string
  barns: {
    _id: string
    name: string
    description?: string
    farmId: string
  }
  description?: string
  farmId: string
}

type Stall = {
  _id: string
  name: string
  barnId: {
    _id: string
    name: string
  }
  farmId: string
  createdAt: string
  updatedAt: string
}

// -------------------------
// Pig Form Data type matching your Pig model
// Note: pigId and age are input as strings and converted on submission.
type PigFormData = {
  pigId: string // user-defined pigId (unique, numeric)
  tag: string // required tag field
  farm: string // farm _id
  barn: string // barn _id
  stall: string // stall _id
  breed: string
  age: string // will be converted to Number on submit
}

// -------------------------
// Form field component

const FormField = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div>
    <Label className="font-medium">{label}</Label>
    <div className="mt-2">{children}</div>
  </div>
)

// -------------------------
// First Page: Cascading selections for Farms, Barns, and Stalls

interface FirstPageProps {
  formData: PigFormData
  onUpdateForm: (updates: Partial<PigFormData>) => void
  farms: Farm[]
  barns: Barn[]
  stalls: Stall[]
  onStallClick: (stallId: string) => void
  refreshData: () => void
}

const FirstPage = ({
  formData,
  onUpdateForm,
  farms,
  barns,
  stalls,
  onStallClick,
  refreshData,
}: FirstPageProps) => {
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(
    formData.farm,
  )
  const [selectedBarnId, setSelectedBarnId] = useState<string | null>(
    formData.barn,
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedStallId, setSelectedStallId] = useState<string | null>(null)
  const [newFarmName, setNewFarmName] = useState("")
  const [newBarnName, setNewBarnName] = useState("")
  const [newStallName, setNewStallName] = useState("")
  const [isAddingFarm, setIsAddingFarm] = useState(false)
  const [isAddingBarn, setIsAddingBarn] = useState(false)
  const [isAddingStall, setIsAddingStall] = useState(false)

  const handleSelectFarm = (farmId: string) => {
    setSelectedFarmId(farmId)
    setSelectedBarnId(null)
    onUpdateForm({ farm: farmId, barn: "", stall: "" })
  }

  const handleSelectBarn = (barnId: string) => {
    setSelectedBarnId(barnId)
    onUpdateForm({ barn: barnId, stall: "" })
  }

  const handleMoreStalls = (stallId: string) => {
    setSelectedStallId(stallId)
    setIsDialogOpen(true)
  }

  const filteredBarns = barns.filter((barn) => barn.farmId == formData.farm)
  const selectedBarn = filteredBarns.find((barn) => barn._id === formData.barn)

  const handleAddFarm = async () => {
    if (!newFarmName) {
      console.log(newFarmName)
      return
    }
    try {
      farmCount++
      console.log(newFarmName)
      await api.post("/farms", {
        name: newFarmName,
        location: "Default Location", // Provide a non-empty location value
      })
      setNewFarmName("")
      setIsAddingFarm(false)
      refreshData()
    } catch (error) {
      console.error("Error adding farm:", error)
      toast.error(
        "Failed to add farm. Make sure you provide a name and have admin permissions.",
      )
    }
  }

  const handleAddBarn = async () => {
    if (!newBarnName || !formData.farm) return
    try {
      barnCount++
      await api.post("/barns", {
        name: newBarnName,
        farmId: formData.farm,
      })
      setNewBarnName("")
      setIsAddingBarn(false)
      refreshData()
    } catch (error) {
      console.error("Error adding barn:", error)
      toast.error("Failed to add barn. Please try again.")
    }
  }

  const handleAddStall = async () => {
    if (!newStallName || !formData.barn || !formData.farm) return
    try {
      stallCount++
      await api.post("/stalls", {
        name: newStallName,
        barnId: formData.barn,
        farmId: formData.farm,
      })
      setNewStallName("")
      setIsAddingStall(false)
      refreshData()
    } catch (error) {
      console.error("Error adding stall:", error)
      toast.error("Failed to add stall. Please try again.")
    }
  }

  // utility function
  const deleteEntity = async (
    type: "farms" | "barns" | "stalls",
    id: string,
    cascade = false,
  ) => {
    try {
      let url = `/${type}/${id}`
      if (type !== "stalls" && cascade) {
        url += "?cascade=true"
      }
      await api.delete(url)
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
      )

      if (type == "stalls") {
        stallCount--
      }
      if (type == "barns") {
        barnCount--
      }
      if (type == "farms") {
        farmCount--
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error)
      toast.error(`Failed to delete ${type}`)
    }
  }

  // in FirstPa

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>
          <p>Add Farm Details</p>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-500">
            Farm, Barn & Stall Information
          </span>
        </DrawerTitle>
      </DrawerHeader>
      <DrawerBody className="-mx-6 space-y-6 overflow-y-scroll border-t border-gray-200 px-6 dark:border-gray-800">
        <FormField label="Farms">
          <div className="flex items-center gap-2">
            <div className="flex-grow">
              <Select
                value={selectedFarmId || ""}
                onValueChange={(value: string) => handleSelectFarm(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Farm" />
                </SelectTrigger>
                <SelectContent>
                  {farms.map((farm) => (
                    <SelectItemExtended
                      key={farm._id}
                      value={farm._id}
                      option={farm.name}
                      description={`${farm.barns?.length || 0} Barns`}
                    />
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedFarmId && (
              <Button
                variant="ghost"
                className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 hover:dark:text-gray-300"
                onClick={async () => {
                  await deleteEntity("farms", selectedFarmId)
                  setSelectedFarmId(null)
                  refreshData()
                }}
              >
                <RiDeleteBin4Fill className="size-5 shrink-0" />
                <span className="sr-only">Remove farm</span>
              </Button>
            )}
          </div>

          <div className="mt-4 flex w-full items-center space-x-2">
            {isAddingFarm ? (
              <>
                <div className="mt-10 flex w-full items-center space-x-2 sm:mt-0">
                  <Button
                    onClick={handleAddFarm}
                    variant="ghost"
                    className="sm:text-md size-10 text-base"
                  >
                    {" "}
                    <ArrowUpWideNarrow />{" "}
                  </Button>
                  <Input
                    value={newFarmName}
                    onChange={(e) => setNewFarmName(e.target.value)}
                    placeholder="Add Farm..."
                    type="barn"
                  />
                </div>
              </>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setIsAddingFarm(true)}
                className="w-full"
              >
                <RiAddLine className="mr-2 size-4" />
                Add New Farm
              </Button>
            )}
          </div>
        </FormField>

        {selectedFarmId && (
          <>
            <FormField label="Barns">
              <ul
                role="list"
                className="mt-2 divide-y divide-gray-200 dark:divide-gray-800"
              >
                {filteredBarns.map((barn) => {
                  const isSelected = barn._id === selectedBarnId
                  return (
                    <li
                      key={barn._id}
                      onClick={() => handleSelectBarn(barn._id)}
                      className={`flex cursor-pointer items-center justify-between space-x-4 py-2.5 text-sm transition ${isSelected ? "rounded-md border-blue-500 bg-blue-100 pl-2 dark:bg-blue-900" : "rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >
                      <div className="flex items-center space-x-4 truncate">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500">
                          <MapPinHouse className="size-5" />
                        </span>
                        <span className="truncate text-gray-700 dark:text-gray-300">
                          {barn.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center whitespace-nowrap rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          {
                            stalls.filter((s) => s.barnId._id === barn._id)
                              .length
                          }{" "}
                          Stalls
                        </span>
                        <Button
                          variant="ghost"
                          className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 hover:dark:text-gray-300"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await deleteEntity("barns", barn._id)
                            refreshData()
                          }}
                        >
                          <RiDeleteBin4Fill className="size-5 shrink-0" />
                          <span className="sr-only">Remove {barn.name}</span>
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 flex w-full items-center space-x-2">
                {isAddingBarn ? (
                  <>
                    <div className="mt-10 flex w-full items-center space-x-2 sm:mt-0">
                      <Button
                        onClick={handleAddBarn}
                        variant="ghost"
                        className="sm:text-md size-10 text-base"
                      >
                        {" "}
                        <ArrowUpWideNarrow />{" "}
                      </Button>
                      <Input
                        value={newBarnName}
                        onChange={(e) => setNewBarnName(e.target.value)}
                        placeholder="Add Barn..."
                        type="barn"
                      />
                    </div>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setIsAddingBarn(true)}
                    className="w-full"
                  >
                    <RiAddLine className="mr-2 size-4" />
                    Add New Barn
                  </Button>
                )}
              </div>
            </FormField>
          </>
        )}

        {selectedBarnId && (
          <FormField label="Stalls">
            <ul
              role="list"
              className="mt-2 divide-y divide-gray-200 dark:divide-gray-800"
            >
              {stalls.length > 4 ? (
                <>
                  {stalls.slice(0, 3).map((stall) => (
                    <li
                      key={stall._id}
                      className={`flex items-center justify-between space-x-4 py-2.5 text-sm transition`}
                    >
                      <div className="flex items-center space-x-4 truncate">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500">
                          <MapPinHouse className="size-5" />
                        </span>
                        <span className="truncate text-gray-700 dark:text-gray-300">
                          {stall.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 hover:dark:text-gray-300"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await deleteEntity("stalls", stall._id)
                            refreshData()
                          }}
                        >
                          <RiDeleteBin4Fill className="size-5 shrink-0" />
                          <span className="sr-only">Remove {stall.name}</span>
                        </Button>
                      </div>
                    </li>
                  ))}
                  <li
                    className={`flex items-center justify-between space-x-4 py-2.5 text-sm transition`}
                  >
                    <div
                      onClick={() =>
                        onStallClick(stalls[stalls.length - 1]._id)
                      }
                      className="mx-auto cursor-pointer"
                    >
                      ...
                    </div>
                  </li>
                  <li
                    key={stalls[stalls.length - 1]._id}
                    className={`flex items-center justify-between space-x-4 py-2.5 text-sm transition`}
                  >
                    <div className="flex items-center space-x-4 truncate">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500">
                        <MapPinHouse className="size-5" />
                      </span>
                      <span className="truncate text-gray-700 dark:text-gray-300">
                        {stalls[stalls.length - 1].name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 hover:dark:text-gray-300"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await deleteEntity(
                            "stalls",
                            stalls[stalls.length - 1]._id,
                          )
                          refreshData()
                        }}
                      >
                        <RiDeleteBin4Fill className="size-5 shrink-0" />
                        <span className="sr-only">
                          Remove {stalls[stalls.length - 1].name}
                        </span>
                      </Button>
                    </div>
                  </li>
                </>
              ) : (
                stalls.map((stall) => (
                  <li
                    key={stall._id}
                    className={`flex cursor-pointer items-center justify-between space-x-4 py-2.5 text-sm transition`}
                  >
                    <div className="flex items-center space-x-4 truncate">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500">
                        <MapPinHouse className="size-5" />
                      </span>
                      <span className="truncate text-gray-700 dark:text-gray-300">
                        {stall.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 hover:dark:text-gray-300"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await deleteEntity("stalls", stall._id)
                          refreshData()
                        }}
                      >
                        <RiDeleteBin4Fill className="size-5 shrink-0" />
                        <span className="sr-only">Remove {stall.name}</span>
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>

            <div className="mt-4 flex w-full items-center space-x-2">
              {isAddingStall ? "" : ""}
            </div>

            <div className="mt-10 flex w-full items-center space-x-2 sm:mt-0">
              <Button
                onClick={handleAddStall}
                variant="ghost"
                className="sm:text-md size-10 text-base"
              >
                {" "}
                <ArrowUpWideNarrow />{" "}
              </Button>
              <Input
                value={newStallName}
                onChange={(e) => setNewStallName(e.target.value)}
                placeholder="Add Stall..."
                type="barn"
              />
            </div>
          </FormField>
        )}
      </DrawerBody>
    </>
  )
}

// -------------------------
// Summary Page: Review Pig Data

const SummaryItem = ({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) => (
  <div className="space-y-1">
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <p className="text-sm">{value ?? "Not provided"}</p>
  </div>
)

const SummaryPage = ({
  formData,
  farms,
  barns,
  stalls,
}: {
  formData: PigFormData
  farms: Farm[]
  barns: Barn[]
  stalls: Stall[]
}) => {
  const selectedFarm = farms.find((farm) => farm._id === formData.farm)
  const selectedBarn = barns.find((barn) => barn._id === formData.barn)
  const selectedStall = formData.barn
    ? stalls.find((stall) => stall._id === formData.stall)
    : undefined

  interface FormatCountParams {
    currentLength: number
    countFromStats: number
  }

  const formatCountWithDelta = (
    currentLength: number,
    countFromStats: number,
  ): string => {
    const delta: number = countFromStats
    if (countFromStats === 0) {
      return `${currentLength}`
    }
    const sign: string = delta > 0 ? "+" : ""
    return `${currentLength}    (${sign}${countFromStats})`
  }

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>
          <p>Review Farm Data</p>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-500">
            Please review all details before submitting
          </span>
        </DrawerTitle>
      </DrawerHeader>
      <DrawerBody className="-mx-6 space-y-4 overflow-y-scroll border-t border-gray-200 px-6 dark:border-gray-800">
        <div className="rounded-md border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="font-medium">Barn Information</h3>
          <div className="mt-4 space-y-4">
            <SummaryItem
              label="Number of Farms"
              value={formatCountWithDelta(farms.length, farmCount)}
            />
            <SummaryItem
              label={`Number of Barns for Farm:  ${selectedFarm?.name}`}
              value={formatCountWithDelta(barns.length, barnCount)}
            />
            <SummaryItem
              label={`Number of Barns for Barn:  ${selectedBarn?.name}`}
              value={formatCountWithDelta(stalls.length, stallCount)}
            />
          </div>
        </div>
      </DrawerBody>
    </>
  )
}

// -------------------------
// Main Drawer Component

interface PigDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FarmerManagementDrawer({ open, onOpenChange }: PigDrawerProps) {
  // Form data state
  const [formData, setFormData] = useState<PigFormData>({
    pigId: "",
    tag: "",
    farm: "",
    barn: "",
    stall: "",
    breed: "",
    age: "",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // API data states for farms, barns, and stalls
  const [farms, setFarms] = useState<Farm[]>([])
  const [barns, setBarns] = useState<Barn[]>([])
  const [stalls, setStalls] = useState<Stall[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null)

  // Fetch farms
  useEffect(() => {
    api
      .get("/farms")
      .then((res) => setFarms(res.data))

      .catch(console.error)
  }, [])

  // Fetch barns when farm is selected
  useEffect(() => {
    if (formData.farm) {
      api
        .get(`/barns/farm/${formData.farm}`)
        .then((res) => setBarns(res.data))
        .catch(console.error)
    } else {
      setBarns([])
    }
  }, [formData.farm])

  // Fetch all stalls
  useEffect(() => {
    if (formData.barn) {
      api
        .get(`/stalls/barn/${formData.barn}`)
        .then((res) => setStalls(res.data))
        .catch(console.error)
    } else {
      setStalls([])
    }
  }, [formData.barn])

  const refreshData = useCallback(async () => {
    try {
      const farmsRes = await api.get("/farms")
      setFarms(farmsRes.data)

      if (formData.farm) {
        const barnsRes = await api.get(`/barns/farm/${formData.farm}`)
        setBarns(barnsRes.data)
      }

      if (formData.barn) {
        const stallsRes = await api.get(`/stalls/barn/${formData.barn}`)
        setStalls(stallsRes.data)
      }
    } catch (error) {
      console.error("Error refreshing data:", error)
    }
  }, [formData.farm, formData.barn]) // 🧠 Add dependencies here!

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const handleUpdateForm = (updates: Partial<PigFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const handleStallClick = (stallId: string) => {
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Prepare data to match your Pig model.
      const preparedData = {
        pigId: Number(formData.pigId),
        tag: formData.tag,
        breed: formData.breed,
        age: Number(formData.age),
        currentLocation: {
          farmId: formData.farm,
          barnId: formData.barn,
          stallId: formData.stall,
        },
      }
      await api.post("/pigs", preparedData)
      console.log("Pig data submitted:", preparedData)
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting pig data:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderPage = () => {
    switch (currentPage) {
      case 1:
        return (
          <FirstPage
            formData={formData}
            onUpdateForm={handleUpdateForm}
            farms={farms}
            barns={barns}
            stalls={stalls}
            onStallClick={handleStallClick}
            refreshData={refreshData}
          />
        )
      case 2:
      case 3:
        return (
          <SummaryPage
            formData={formData}
            farms={farms}
            barns={barns}
            stalls={stalls}
          />
        )
      default:
        return null
    }
  }

  const renderFooter = () => {
    if (currentPage === 1) {
      return (
        <>
          <DrawerClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DrawerClose>
          <Button
            onClick={() => setCurrentPage(3)}
            disabled={!formData.farm || !formData.barn}
          >
            Review
          </Button>
        </>
      )
    }
    if (currentPage === 2) {
      return (
        <>
          <Button variant="secondary" onClick={() => setCurrentPage(1)}>
            Back
          </Button>
          <Button onClick={() => setCurrentPage(3)}>Review</Button>
        </>
      )
    }
    return (
      <>
        <Button variant="secondary" onClick={() => setCurrentPage(1)}>
          Back
        </Button>
      </>
    )
  }

  return (
    <>
      {" "}
      {isDialogOpen ? (
        <div className="flex items-center justify-center py-24">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Open Dialog</Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pigs in this Stall</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {stalls.map((stall) => {
                  return (
                    <li
                      key={stall._id}
                      className={`flex cursor-pointer items-center justify-between space-x-4 py-2.5 text-sm transition`}
                    >
                      <div className="flex items-center space-x-4 truncate">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500">
                          <MapPinHouse className="size-5" />
                        </span>
                        <span className="truncate text-gray-700 dark:text-gray-300">
                          {stall.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center whitespace-nowrap rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          N/a Stalls
                        </span>
                        <Button
                          variant="ghost"
                          className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 hover:dark:text-gray-300"
                        >
                          <RiDeleteBin4Fill className="size-5 shrink-0" />
                          <span className="sr-only">Remove {stall.name}</span>
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="overflow-x-hidden sm:max-w-lg">
          {renderPage()}
          <DrawerFooter className="-mx-6 -mb-2 gap-2 px-6 sm:justify-between">
            {renderFooter()}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}
