"use client"

import { Badge } from "@/components/Badge"
import { Card } from "@/components/Card"
import { LineChart } from "@/components/LineChart"
// import { getBadgeType } from "@/components/ui/overview/DashboardChartCard"
import { overviewData } from "@/data/overview-data"
import { formatters } from "@/lib/utils"
import { useParams } from "next/navigation"

export default function MetricPage() {
  const params = useParams()
  const metric = decodeURIComponent(params.metric as string)
  const getBadgeType = (
    value: number,
  ): "success" | "warning" | "error" | "default" => {
    if (value > 50) return "success"
    if (value < 50) return "warning"
    return "default"
  }

  // Calculate metrics
  const currentValue = overviewData.reduce(
    (sum, item) => sum + ((item as any)[metric] || 0),
    0,
  )
  const previousValue = overviewData
    .slice(0, -1)
    .reduce((sum, item) => sum + ((item as any)[metric] || 0), 0)
  const evolution = (currentValue - previousValue) / previousValue

  // Determine formatter based on metric type
  const formatter = metric.toLowerCase().includes("temperature")
    ? formatters.unit
    : formatters.unit

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
          {metric} Analysis
        </h1>
        <Badge variant={getBadgeType(evolution * 100)}>
          {(evolution * 100).toFixed(1)}%
        </Badge>
      </div>

      <div className="h-[400px] w-full">
        <LineChart
          data={overviewData}
          index="date"
          categories={[metric]}
          colors={["indigo"]}
          valueFormatter={formatter}
          showLegend={false}
          showXAxis={true}
          showYAxis={true}
          showGridLines={true}
          yAxisWidth={56}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h3 className="text-lg font-medium">Historical Trends</h3>
          <p className="mt-2 text-sm text-gray-500">
            Analysis of {metric.toLowerCase()} patterns over time shows typical
            fluctuations between{" "}
            {formatter(
              Math.min(...overviewData.map((d) => (d as any)[metric])),
            )}{" "}
            and{" "}
            {formatter(
              Math.max(...overviewData.map((d) => (d as any)[metric])),
            )}
          </p>
          <div className="mt-4">
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Average</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-50">
                  {formatter(
                    overviewData.reduce(
                      (sum, item) => sum + ((item as any)[metric] || 0),
                      0,
                    ) / overviewData.length,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Range</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-50">
                  {formatter(
                    Math.max(...overviewData.map((d) => (d as any)[metric])) -
                      Math.min(...overviewData.map((d) => (d as any)[metric])),
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-medium">Key Insights</h3>
          <div className="mt-2 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">
                Latest Reading
              </h4>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-50">
                {formatter(
                  (overviewData[overviewData.length - 1] as any)[metric],
                )}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">
                Change Rate
              </h4>
              <p className="mt-1 text-sm text-gray-500">
                The {metric.toLowerCase()} has shown a{" "}
                {evolution > 0 ? "positive" : "negative"} trend over the
                monitored period, with a {Math.abs(evolution * 100).toFixed(1)}%
                change.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
