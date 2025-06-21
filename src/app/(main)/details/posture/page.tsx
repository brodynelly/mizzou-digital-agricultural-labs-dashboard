"use client"

import { useEffect, useState } from "react"

export default function PosturePage() {
  const [postureData, setPostureData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
        const response = await fetch(`${apiUrl}/api/stats`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setPostureData(data.postureDistribution || [])
        setError(null)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching posture data:', error)
        }
        setError('Failed to fetch posture data. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
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
        {postureData.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No posture data available.</p>
        ) : (
          <pre className="whitespace-pre-wrap rounded-md bg-gray-100 p-4 text-xs dark:bg-gray-800">
            {JSON.stringify(postureData, null, 2)}
          </pre>
        )}
      </div>
    </>
  )
}
