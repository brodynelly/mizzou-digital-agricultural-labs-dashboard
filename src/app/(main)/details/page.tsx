"use client"

import { columns } from "@/components/ui/data-table/columns"
import { DataTable } from "@/components/ui/data-table/DataTable"
import { subscribeToPigs } from "@/lib/socket"
import { useEffect, useState } from "react"

export default function Example() {
  const [pigData, setPigData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch("/api/pigs")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setPigData(data)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching pig data:", error)
        setError("Failed to fetch pig data. Please try again later.")
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToPigs((data) => {
      setPigData(data)
      console.log(data)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    console.error(error) // Log Error into the consol, nothing else
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50">
        Pig Monitoring Details
      </h1>
      <div className="mt-4 sm:mt-6 lg:mt-10">
        <DataTable data={pigData} columns={columns} />
      </div>
    </>
  )
}
