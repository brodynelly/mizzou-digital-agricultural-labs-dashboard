// Overview.tsx
"use client"
import { ChartCard } from "@/components/ui/overview/DashboardChartCard"
import FertilityProgressCard from "@/components/ui/overview/DashboardFertilityCard"
import { Filterbar } from "@/components/ui/overview/DashboardFilterbar"
import HeatProgressCard from "@/components/ui/overview/DashboardHeatCard"
import { ProgressBarCard } from "@/components/ui/overview/DashboardProgressBarCard"
import { BarnStallCard } from "@/components/ui/overview/DashboardStallBarCard"
import { subDays } from "date-fns"
import React from "react"
import { categories, maxDate } from "./components/constants"
import PlaceHolder from "./components/placeholder"
import PigOnboardingWalkthrough from "./components/placeHolderPig"
import { useOverviewData } from "./components/useOverviewData"

export default function Overview() {
  const {
    selectedDates,
    setSelectedDates,
    selectedPeriod,
    setSelectedPeriod,
    selectedCategories,
    setSelectedCategories,
    timeSeriesData,
    deviceData,
    healthData,
    FertilityStatus,
    heatStats,
    barnStats,
    stallStats,
    selectedBarn,
    setSelectedBarn,
    error,
    isLoading,
  } = useOverviewData()

  // Transform time-series data for the ChartCard component
  const chartData = React.useMemo(() => {
    return Object.entries(timeSeriesData).map(([date, metrics]) => ({
      date,
      totalPigs: metrics.totalPigs,
      totalPigsInHeat: metrics.totalPigsInHeat,
      totalPigsReadyToBreed: metrics.totalPigsReadyToBreed,
    }))
  }, [timeSeriesData])

  const heatChartData = React.useMemo(() => {
    return Object.entries(timeSeriesData).map(([date, metrics]) => ({
      date,
      totalPigs: metrics.totalPigs,
      totalPigsInHeat: metrics.totalPigsInHeat,
      totalPigsReadyToBreed: metrics.totalPigsReadyToBreed,
      open: metrics.heatStatus.open,
      bred: metrics.heatStatus.bred,
      pregnant: metrics.heatStatus.pregnant,
      farrowing: metrics.heatStatus.farrowing,
      weaning: metrics.heatStatus.weaning,
    }))
  }, [timeSeriesData])

  const fertilityChartData = React.useMemo(() => {
    return Object.entries(timeSeriesData).map(([date, metrics]) => ({
      date,
      totalPigs: metrics.totalPigs,
      totalPigsInHeat: metrics.totalPigsInHeat,
      totalPigsReadyToBreed: metrics.totalPigsReadyToBreed,
      inHeat: metrics.fertilityStatus.inHeat,
      preHeat: metrics.fertilityStatus.preHeat,
      open: metrics.fertilityStatus.open,
      readyToBreed: metrics.fertilityStatus.readyToBreed,
    }))
  }, [timeSeriesData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return <div> error </div>
  }

  // return the onboarding for adding farms
  if (barnStats.length < 1 || stallStats.length < 1) {
    return (
      <div>
        <PlaceHolder />
      </div>
    )
  }

  if (stallStats.length > 0 && healthData[0].allowed < 1) {
    return (
      <div>
        {" "}
        <PigOnboardingWalkthrough />{" "}
      </div>
    )
  }

  console.log(stallStats.length)

  return (
    <>
      <section aria-labelledby="current-status">
        <h1
          id="current-status"
          className="scroll-mt-10 text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50"
        >
          Current Status
        </h1>
        <div className="mt-4 grid grid-cols-1 gap-14 sm:mt-8 sm:grid-cols-2 lg:mt-10 xl:grid-cols-3">
          <ProgressBarCard
            title={"Device Metrics"}
            change="+1.2%"
            value={`${deviceData[0].percentage}%`}
            valueDescription="of devices online"
            ctaDescription="Device maintenance due in 5 days."
            ctaText="View devices"
            ctaLink="/system-overview/insights"
            data={deviceData}
          />
          <ProgressBarCard
            title="Health Metrics"
            change="Healthy"
            value={`${healthData[1].percentage}`}
            valueDescription="normal health indicators"
            ctaDescription={`${
              healthData[0].current +
              healthData[2].current +
              healthData[3].current
            } pigs require attention.`}
            ctaText="View details"
            ctaLink="/details"
            data={healthData}
          />

          <BarnStallCard
            title="Barn/Stall Metrics"
            change="Farm 1"
            value={`${healthData[0].allowed}`}
            valueDescription="Total Pigs"
            ctaDescription="View stall details."
            ctaText="View details"
            ctaLink="/barn-stall-details"
            data={
              selectedBarn
                ? stallStats.filter((stall) => stall.parent === selectedBarn)
                : []
            }
            barns={barnStats.map((barn) => ({ title: barn.title, href: "#" }))}
            selectedBarn={selectedBarn}
            onBarnSelect={(barn) => setSelectedBarn(barn)}
          />

          <FertilityProgressCard
            title="Fertility Metrics"
            change=""
            value={`${FertilityStatus[1].current}`}
            valueDescription="optimal breeding conditions"
            ctaDescription={`${FertilityStatus[1].current} pigs ready for breeding.`}
            ctaText="View details"
            ctaLink="/details"
            data={FertilityStatus}
          />
          <HeatProgressCard
            title="Heat Metrics"
            change=""
            value={`${heatStats[1].current}`}
            valueDescription="optimal breeding conditions"
            ctaDescription={`${heatStats[1].current} pigs ready for breeding.`}
            ctaText="View details"
            ctaLink="/details"
            data={heatStats}
          />
        </div>
      </section>

      {/* Set the Visibility only if the Graph has Data */}
      {!chartData && (
        <section aria-labelledby="monitoring-overview">
          <h1
            id="monitoring-overview"
            className="mt-16 scroll-mt-8 text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50"
          >
            Monitoring Overview
          </h1>
          <div className="sticky top-16 z-20 flex items-center justify-between border-b border-gray-200 bg-white pb-4 pt-4 sm:pt-6 lg:top-0 lg:mx-0 lg:px-0 lg:pt-8 dark:border-gray-800 dark:bg-gray-950">
            <Filterbar
              maxDate={maxDate}
              minDate={subDays(maxDate, 30)}
              selectedDates={{
                from: selectedDates.from,
                to:
                  selectedDates.to instanceof Date
                    ? selectedDates.to
                    : selectedDates.to
                      ? new Date(selectedDates.to)
                      : undefined,
              }}
              onDatesChange={(dates) => {
                if (dates?.from && dates?.to) {
                  setSelectedDates({ from: dates.from, to: dates.to })
                }
              }}
              selectedPeriod={selectedPeriod}
              onPeriodChange={(period) => setSelectedPeriod(period)}
              categories={categories}
              setSelectedCategories={setSelectedCategories}
              selectedCategories={selectedCategories}
            />
          </div>
          <dl className="mt-10 grid grid-cols-1 gap-14 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            <ChartCard
              title="Total Pigs"
              type="unit"
              selectedDates={{
                from: selectedDates.from,
                to:
                  selectedDates.to instanceof Date
                    ? selectedDates.to
                    : selectedDates.to
                      ? new Date(selectedDates.to)
                      : undefined,
              }}
              selectedPeriod={selectedPeriod}
              data={chartData}
              categories={["totalPigs"]}
              colors={["blue"]}
            />
            <ChartCard
              title="Heat Status"
              type="unit"
              selectedDates={{
                from: selectedDates.from,
                to:
                  selectedDates.to instanceof Date
                    ? selectedDates.to
                    : selectedDates.to
                      ? new Date(selectedDates.to)
                      : undefined,
              }}
              selectedPeriod={selectedPeriod}
              data={heatChartData}
              categories={["open", "bred", "pregnant", "farrowing", "weaning"]}
              colors={["amber", "amber", "cyan", "emerald", "blue"]}
            />
            <ChartCard
              title="Fertility Status"
              type="unit"
              selectedDates={{
                from: selectedDates.from,
                to:
                  selectedDates.to instanceof Date
                    ? selectedDates.to
                    : selectedDates.to
                      ? new Date(selectedDates.to)
                      : undefined,
              }}
              selectedPeriod={selectedPeriod}
              data={fertilityChartData}
              categories={["inHeat", "preHeat", "readyToBreed"]}
              colors={["emerald", "pink", "indigo"]}
            />
          </dl>
        </section>
      )}
    </>
  )
}
