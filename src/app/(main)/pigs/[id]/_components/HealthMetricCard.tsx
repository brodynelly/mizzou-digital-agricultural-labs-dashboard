"use client"

import { Badge } from "@/components/Badge"
import { Card } from "@/components/Card"
import { ProgressCircle } from "@/components/ProgressCircle_S"
import api from "@/lib/axios"
import { useSearchParams } from "next/navigation"
import { ReactNode, useEffect, useRef, useState } from "react"

interface HealthMetricCardProps {
  title: string
  endpoint: string
  icon: ReactNode
  optimalRange: string
  formatValue: (value: number) => string
  formatMetric: (data: any) => {
    value: number
    status: "success" | "warning" | "error" | "default"
    label: string
    trend: string
    trendDetail: string
  }
}

export function HealthMetricCard({
  title,
  endpoint,
  icon,
  optimalRange,
  formatValue,
  formatMetric,
}: HealthMetricCardProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use a ref to track if we've already fetched the data
  const dataFetchedRef = useRef(false)

  // Get search params
  const searchParams = useSearchParams()

  // Reset the dataFetchedRef when the search params change (date range)
  useEffect(() => {
    const startParam = searchParams.get("start")
    const endParam = searchParams.get("end")

    // If the date range changes, reset the dataFetchedRef
    if (startParam || endParam) {
      dataFetchedRef.current = false
    }
  }, [searchParams])

  useEffect(() => {
    // Skip fetching if we've already fetched data
    if (dataFetchedRef.current && data) {
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // For all endpoints, use the API directly
        try {
          const response = await api.get(endpoint)

          // Store the available date range in a global variable if it's the posture endpoint
          if (endpoint.includes("/posture/") && response.data.dateRange) {
            // Also store in global variable for backward compatibility
            window.pigPostureDateRange = response.data.dateRange
            console.log(
              "Available date range from HealthMetricCard:",
              response.data.dateRange,
            )
          }

          // Mark that we've fetched data
          dataFetchedRef.current = true

          setData(response.data)
        } catch (error) {
          console.error(`Error fetching data from ${endpoint}:`, error)
          setError(`Failed to fetch data from ${endpoint}`)
        }
      } catch (error) {
        console.error(`Error fetching ${title} data:`, error)
        setError(`Failed to fetch ${title} data`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [data, endpoint, title])

  if (isLoading) {
    return (
      <Card>
        <div className="flex h-[200px] items-center justify-center p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <div className="flex h-[200px] flex-col items-center justify-center p-6">
          <p className="text-red-500">{error || "No data available"}</p>
        </div>
      </Card>
    )
  }

  // Check if data has the expected structure
  try {
    const metric = formatMetric(data)
    const progressValue = Math.min(Math.max((metric.value / 5) * 100, 0), 100) // Normalize to 0-100%

    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {title}
            </h3>
            <Badge variant={metric.status} className="text-xs">
              {metric.label}
            </Badge>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {formatValue(metric.value)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {optimalRange}
              </p>
            </div>
            <div>
              <ProgressCircle
                value={progressValue}
                variant={metric.status}
                radius={32}
                strokeWidth={6}
                showAnimation
              >
                <span className="text-sm font-medium">
                  {progressValue.toFixed(0)}%
                </span>
              </ProgressCircle>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-10 w-10 rounded-full bg-${metric.status === "success" ? "green" : metric.status === "warning" ? "amber" : metric.status === "error" ? "red" : "blue"}-100 p-2 dark:bg-${metric.status === "success" ? "green" : metric.status === "warning" ? "amber" : metric.status === "error" ? "red" : "blue"}-900/20`}
              >
                {icon}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {metric.trend}
                </p>
                <p className="text-xs text-gray-500">{metric.trendDetail}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  } catch (err) {
    console.error(`Error formatting ${title} data:`, err)
    return (
      <Card>
        <div className="flex h-[200px] flex-col items-center justify-center p-6">
          <p className="text-red-500">Data format error</p>
          <p className="mt-2 text-sm text-gray-500">
            Unable to display {title}
          </p>
        </div>
      </Card>
    )
  }
}
