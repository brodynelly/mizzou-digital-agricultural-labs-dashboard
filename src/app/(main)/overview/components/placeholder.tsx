"use client"

import { Button } from "@/components/Button"
import { Input } from "@/components/Input"
import { Card, CardContent } from "@/components/ui/card"
import api from "@/lib/axios"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, FolderPlus, GitBranch, MapPinHouse } from "lucide-react"
import { useState } from "react"

export default function PlaceHolder() {
  const [step, setStep] = useState<"start" | "farm" | "barn" | "stall">("start")

  const [farmName, setFarmName] = useState("")
  const [barnName, setBarnName] = useState("")
  const [stallName, setStallName] = useState("")

  const [farmId, setFarmId] = useState<string | null>(null)
  const [barnId, setBarnId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)

  const handleAddFarm = async () => {
    if (!farmName) return
    setLoading(true)
    try {
      const res = await api.post("/farms", {
        name: farmName,
        location: "Default Location", // Add required location field
      })
      setFarmId(res.data._id)
      setFarmName("")
      setStep("barn")
    } catch (e) {
      console.error("Error adding farm", e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBarn = async () => {
    if (!barnName || !farmId) return
    setLoading(true)
    try {
      const res = await api.post("/barns", { name: barnName, farmId })
      setBarnId(res.data._id)
      setBarnName("")
      setStep("stall")
    } catch (e) {
      console.error("Error adding barn", e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStall = async () => {
    if (!stallName || !farmId || !barnId) return
    setLoading(true)
    try {
      await api.post("/stalls", {
        name: stallName,
        farmId,
        barnId,
      })
      setStallName("")
      window.location.reload() // Force page reload
    } catch (e) {
      console.error("Error adding stall", e)
    } finally {
      setLoading(false)
    }
  }

  const ProgressStep = ({
    label,
    active,
  }: {
    label: string
    active: boolean
  }) => (
    <div
      className={`flex items-center gap-2 ${active ? "text-blue-600" : "text-gray-400"}`}
    >
      <CheckCircle2
        className={`h-5 w-5 ${active ? "text-green-500" : "text-gray-300"}`}
      />
      <span>{label}</span>
    </div>
  )

  const slideVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6 text-center">
      <h2 className="text-2xl font-semibold">Onboard Your Farm System</h2>
      <div className="flex justify-center gap-6">
        <ProgressStep label="Farm" active={step !== "start"} />
        <ProgressStep
          label="Barn"
          active={step === "barn" || step === "stall"}
        />
        <ProgressStep label="Stall" active={step === "stall"} />
      </div>

      <AnimatePresence mode="wait">
        {step === "start" && (
          <motion.div
            key="start"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={slideVariants}
          >
            <Card className="rounded-xl border border-dashed shadow-md">
              <CardContent className="space-y-4 p-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Let’s begin by adding your first farm. You can add barns and
                  stalls afterward.
                </p>
                <Button onClick={() => setStep("farm")}>
                  Start Onboarding
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "farm" && (
          <motion.div
            key="farm"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={slideVariants}
          >
            <Card className="rounded-xl border border-blue-300 shadow-md">
              <CardContent className="space-y-4 p-6">
                <GitBranch className="mx-auto h-8 w-8 text-blue-500" />
                <h3 className="text-lg font-semibold">Add a Farm</h3>
                <Input
                  placeholder="Farm Name"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                />
                <Button onClick={handleAddFarm} disabled={loading}>
                  {loading ? "Adding..." : "Add Farm"}
                </Button>
                <div className="pt-4">
                  <Button variant="secondary" onClick={() => setStep("start")}>
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "barn" && (
          <motion.div
            key="barn"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={slideVariants}
          >
            <Card className="rounded-xl border border-purple-300 shadow-md">
              <CardContent className="space-y-4 p-6">
                <MapPinHouse className="mx-auto h-8 w-8 text-purple-500" />
                <h3 className="text-lg font-semibold">Add a Barn</h3>
                <Input
                  placeholder="Barn Name"
                  value={barnName}
                  onChange={(e) => setBarnName(e.target.value)}
                />
                <Button onClick={handleAddBarn} disabled={loading}>
                  {loading ? "Adding..." : "Add Barn"}
                </Button>
                <div className="flex justify-between pt-4">
                  <Button variant="secondary" onClick={() => setStep("farm")}>
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "stall" && (
          <motion.div
            key="stall"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={slideVariants}
          >
            <Card className="rounded-xl border border-green-300 shadow-md">
              <CardContent className="space-y-4 p-6">
                <FolderPlus className="mx-auto h-8 w-8 text-green-500" />
                <h3 className="text-lg font-semibold">Add a Stall</h3>
                <Input
                  placeholder="Stall Name"
                  value={stallName}
                  onChange={(e) => setStallName(e.target.value)}
                />
                <Button onClick={handleAddStall} disabled={loading}>
                  {loading ? "Adding..." : "Add Stall"}
                </Button>
                <div className="pt-4">
                  <Button variant="secondary" onClick={() => setStep("barn")}>
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
