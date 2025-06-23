"use client"

import { Button } from "@/components/Button"
import { Calendar } from "@/components/Calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { DateRange } from "react-day-picker"
import { usePostureData } from "./PostureDataProvider"

// Add TypeScript interface for the global variable
declare global {
  interface Window {
    pigPostureDateRange?: {
      minDate: string
      maxDate: string
    }
  }
}

export function DateRangeSelectorWithApply() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get date range from context
  const { dateRange } = usePostureData()

  // State for available date range
  const [availableDateRange, setAvailableDateRange] = useState({
    minDate: dateRange.minDate || new Date("2022-07-22"), // Default min date
    maxDate: dateRange.maxDate || new Date("2022-08-25"), // Default max date
  })

  // Initialize date range from URL params or default to available range
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const startParam = searchParams.get("start")
    const endParam = searchParams.get("end")

    if (startParam && endParam) {
      return {
        from: new Date(startParam),
        to: new Date(endParam),
      }
    }

    // Default to the available date range
    return {
      from: availableDateRange.minDate,
      to: availableDateRange.maxDate,
    }
  })

  // Temporary date state for the calendar
  const [tempDate, setTempDate] = useState<DateRange | undefined>(date)

  // State for popover
  const [open, setOpen] = useState(false)

  // Update available date range when it becomes available from context
  useEffect(() => {
    if (dateRange.minDate && dateRange.maxDate) {
      // Set the available date range
      setAvailableDateRange({
        minDate: dateRange.minDate,
        maxDate: dateRange.maxDate,
      })

      // Update the date range if it's outside the available range
      if (date?.from && date?.to) {
        const newFrom =
          dateRange.minDate && date.from < dateRange.minDate
            ? dateRange.minDate
            : date.from
        const newTo =
          dateRange.maxDate && date.to > dateRange.maxDate
            ? dateRange.maxDate
            : date.to

        if (newFrom !== date.from || newTo !== date.to) {
          setDate({ from: newFrom, to: newTo })
          setTempDate({ from: newFrom, to: newTo })
        }
      }
    }
  }, [date?.from, date?.to, dateRange])

  // Handle apply button click
  const handleApply = () => {
    if (tempDate?.from && tempDate?.to) {
      setDate(tempDate)

      // Update URL with new date range
      const params = new URLSearchParams(searchParams.toString())
      params.set("start", format(tempDate.from, "yyyy-MM-dd"))
      params.set("end", format(tempDate.to, "yyyy-MM-dd"))
      router.push(`${pathname}?${params.toString()}`)

      // Close the popover
      setOpen(false)
    }
  }

  return (
    <div className="grid gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="secondary"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDate?.from}
              selected={tempDate}
              onSelect={(newDate) => {
                // Ensure the selected date is within the available range
                if (newDate?.from && newDate?.to) {
                  const { minDate, maxDate } = availableDateRange

                  // Adjust dates if they're outside the available range
                  const adjustedFrom =
                    minDate && newDate.from < minDate ? minDate : newDate.from
                  const adjustedTo =
                    maxDate && newDate.to > maxDate ? maxDate : newDate.to

                  setTempDate({ from: adjustedFrom, to: adjustedTo })
                } else {
                  setTempDate(newDate)
                }
              }}
              numberOfMonths={2}
              disabled={{
                before: availableDateRange.minDate,
                after: availableDateRange.maxDate,
              }}
            />
            <div className="p-2 text-center text-sm text-gray-500">
              Available data: {availableDateRange.minDate?.toLocaleDateString()}{" "}
              - {availableDateRange.maxDate?.toLocaleDateString()}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 p-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setTempDate(date)
                  setOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
