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

// Add TypeScript interface for the global variable
declare global {
  interface Window {
    pigPostureDateRange?: {
      minDate: string
      maxDate: string
    }
  }
}

export function DateRangeSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // State for available date range
  const [availableDateRange, setAvailableDateRange] = useState({
    minDate: new Date("2022-07-22"), // Default min date
    maxDate: new Date("2022-08-25"), // Default max date
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

  // Update available date range when it becomes available - only once
  useEffect(() => {
    // Only update if we don't already have a date range set
    if (
      window.pigPostureDateRange &&
      (!availableDateRange.minDate || !availableDateRange.maxDate)
    ) {
      const { minDate, maxDate } = window.pigPostureDateRange

      // Set the available date range
      setAvailableDateRange({
        minDate: minDate ? new Date(minDate) : new Date("2022-07-22"),
        maxDate: maxDate ? new Date(maxDate) : new Date("2022-08-25"),
      })

      // Update the date range if it's outside the available range
      if (date?.from && date?.to) {
        const newFrom =
          minDate && date.from < new Date(minDate)
            ? new Date(minDate)
            : date.from
        const newTo =
          maxDate && date.to > new Date(maxDate) ? new Date(maxDate) : date.to

        if (newFrom !== date.from || newTo !== date.to) {
          setDate({ from: newFrom, to: newTo })
        }
      }
    }
  }, [
    availableDateRange.maxDate,
    availableDateRange.minDate,
    date?.from,
    date?.to,
  ])

  // Update URL when date range changes
  useEffect(() => {
    if (date?.from && date?.to) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("start", format(date.from, "yyyy-MM-dd"))
      params.set("end", format(date.to, "yyyy-MM-dd"))
      router.push(`${pathname}?${params.toString()}`)
    }
  }, [date, pathname, router, searchParams])

  return (
    <div className="grid gap-2">
      <Popover>
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
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              // Ensure the selected date is within the available range
              if (newDate?.from && newDate?.to) {
                const { minDate, maxDate } = availableDateRange

                // Adjust dates if they're outside the available range
                const adjustedFrom =
                  minDate && newDate.from < minDate ? minDate : newDate.from
                const adjustedTo =
                  maxDate && newDate.to > maxDate ? maxDate : newDate.to

                setDate({ from: adjustedFrom, to: adjustedTo })
              } else {
                setDate(newDate)
              }
            }}
            numberOfMonths={2}
            disabled={{
              before: availableDateRange.minDate,
              after: availableDateRange.maxDate,
            }}
            footer={
              <div className="p-2 text-center text-sm text-gray-500">
                Available data:{" "}
                {availableDateRange.minDate?.toLocaleDateString()} -{" "}
                {availableDateRange.maxDate?.toLocaleDateString()}
              </div>
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
