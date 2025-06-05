import { Badge } from "@/components/Badge"
import { ProgressBar } from "@/components/ProgressBar"

import { KpiEntry } from "@/app/(main)/overview/components/constants"

export type CardProps = {
  title: string
  change: string
  value: string
  valueDescription: string
  ctaDescription: string
  ctaText: string
  ctaLink: string
  data: KpiEntry[]
}

export function ProgressBarCard({
  title,
  change,
  value,
  valueDescription,
  ctaDescription,
  ctaText,
  ctaLink,
  data,
}: CardProps) {
  // Check if this is the Device Metrics card and if devices are zero
  const isDeviceMetricsWithZeroDevices =
    title === "Device Metrics" &&
    (data.length === 0 || data.every((item) => item.current === 0))

  // Check if this is the Health Metrics card and if all health conditions have zero pigs
  const isHealthMetricsWithZeroPigs =
    title === "Health Metrics" &&
    (data.length === 0 || data.every((item) => item.current === 0))

  // If no data or specific conditions for placeholders, display a message
  if (
    !data ||
    data.length === 0 ||
    isDeviceMetricsWithZeroDevices ||
    isHealthMetricsWithZeroPigs
  ) {
    return (
      <div className="flex flex-col justify-between rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <div className="flex items-center gap-2">
            <dt className="font-bold text-gray-900 sm:text-sm dark:text-gray-50">
              {title}
            </dt>
            <Badge variant="neutral">{change}</Badge>
          </div>
          <dd className="mt-2 flex items-baseline gap-2">
            <span className="text-xl text-gray-900 dark:text-gray-50">0</span>
            <span className="text-sm text-gray-500">{valueDescription}</span>
          </dd>
          <div className="flex h-40 items-center justify-center">
            <div className="text-center">
              <p className="mb-2 text-gray-500">No pig information available</p>
              <p className="text-xs text-gray-400">
                {title === "Device Metrics"
                  ? "Add devices to see metrics"
                  : "Add pigs to see metrics"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            {ctaDescription}{" "}
            <a href={ctaLink} className="text-indigo-600 dark:text-indigo-400">
              {ctaText}
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <dt className="font-bold text-gray-900 sm:text-sm dark:text-gray-50">
              {title}
            </dt>
            <Badge variant="neutral">{change}</Badge>
          </div>
          <dd className="mt-2 flex items-baseline gap-2">
            <span className="text-xl text-gray-900 dark:text-gray-50">
              {value}
            </span>
            <span className="text-sm text-gray-500">{valueDescription}</span>
          </dd>
          <ul role="list" className="mt-4 space-y-5">
            {data.map((item) => (
              <li key={item.title}>
                <p className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-50">
                    {item.title}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-50">
                    {item.current}
                    <span className="font-normal text-gray-500">
                      /{item.allowed}
                      {item.unit}
                    </span>
                  </span>
                </p>
                <ProgressBar
                  value={item.percentage}
                  className="mt-2 [&>*]:h-1.5"
                />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mt-6 text-xs text-gray-500">
            {ctaDescription}{" "}
            <a href={ctaLink} className="text-indigo-600 dark:text-indigo-400">
              {ctaText}
            </a>
          </p>
        </div>
      </div>
    </>
  )
}
