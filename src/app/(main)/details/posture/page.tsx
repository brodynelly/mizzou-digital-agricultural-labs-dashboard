"use client"

import { useEffect, useState } from "react"

export default function PosturePage() {
  const [postureData, setPostureData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initial data fetch
  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    const fetchData = async () => {
      try {
        // This would need to be updated to fetch all posture data, not just for a specific pig
        const response = await fetch('/api/pigs/posture', { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        if (!isMounted) return
        setPostureData(data)
        setIsLoading(false)
      } catch (error: any) {
        if (error.name === 'AbortError') return
        console.error('Error fetching posture data:', error)
        if (!isMounted) return
        setError('Failed to fetch posture data. Please try again later.')
        setIsLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>)
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <h1 className="text-lg font-semibold">Error</h1>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50">
        Pig Posture Data
      </h1>
      <div className="mt-4 sm:mt-6 lg:mt-10">
        <p className="mb-4">This page will display posture data for all pigs.</p>
        {/* Add your posture data table or visualization here */}
      </div>
    </>
  )
}
