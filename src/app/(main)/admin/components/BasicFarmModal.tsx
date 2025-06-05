"use client"

import { Button } from "@/components/Button_S"
import { Input } from "@/components/Input"
import { Label } from "@/components/Label"
import { Switch } from "@/components/Switch"
import { Textarea } from "@/components/Textarea"
import { useEffect, useState } from "react"
import { BasicModal } from "./BasicModal"

type FarmType = {
  _id: string
  name: string
  location: string
  description?: string
  isActive?: boolean
  createdAt: string
  updatedAt: string
}

type BasicFarmModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (farmData: any) => void
  farm?: FarmType | null
  mode: "view" | "edit" | "create"
}

export function BasicFarmModal({
  isOpen,
  onClose,
  onSubmit,
  farm = null,
  mode = "view",
}: BasicFarmModalProps) {
  const [formData, setFormData] = useState<any>({
    name: "",
    location: "",
    description: "",
    isActive: true,
  })

  // Initialize form data when farm changes
  useEffect(() => {
    if (farm) {
      setFormData({
        _id: farm._id,
        name: farm.name || "",
        location: farm.location || "",
        description: farm.description || "",
        isActive: farm.isActive !== false, // Default to true if undefined
      })
    } else {
      setFormData({
        name: "",
        location: "",
        description: "",
        isActive: true,
      })
    }
  }, [farm])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev: any) => ({ ...prev, isActive: checked }))
  }

  const handleSubmit = () => {
    if (mode === "view" || !onSubmit) {
      onClose()
      return
    }

    onSubmit(formData)
  }

  const getModalTitle = () => {
    switch (mode) {
      case "create":
        return "Add New Farm"
      case "edit":
        return "Edit Farm"
      case "view":
        return "Farm Details"
      default:
        return "Farm"
    }
  }

  return (
    <BasicModal isOpen={isOpen} onClose={onClose} title={getModalTitle()}>
      {mode === "view" ? (
        <div className="space-y-4">
          <div>
            <Label className="mb-1 block">Farm Name</Label>
            <p className="rounded border bg-gray-50 p-2 dark:bg-gray-900">
              {farm?.name || "N/A"}
            </p>
          </div>

          <div>
            <Label className="mb-1 block">Location</Label>
            <p className="rounded border bg-gray-50 p-2 dark:bg-gray-900">
              {farm?.location || "N/A"}
            </p>
          </div>

          <div>
            <Label className="mb-1 block">Description</Label>
            <p className="min-h-[60px] rounded border bg-gray-50 p-2 dark:bg-gray-900">
              {farm?.description || "N/A"}
            </p>
          </div>

          <div>
            <Label className="mb-1 block">Status</Label>
            <p className="rounded border bg-gray-50 p-2 dark:bg-gray-900">
              {farm?.isActive !== false ? "Active" : "Inactive"}
            </p>
          </div>

          <div>
            <Label className="mb-1 block">Created At</Label>
            <p className="rounded border bg-gray-50 p-2 dark:bg-gray-900">
              {farm?.createdAt
                ? new Date(farm.createdAt).toLocaleString()
                : "N/A"}
            </p>
          </div>

          <div>
            <Label className="mb-1 block">Last Updated</Label>
            <p className="rounded border bg-gray-50 p-2 dark:bg-gray-900">
              {farm?.updatedAt
                ? new Date(farm.updatedAt).toLocaleString()
                : "N/A"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="mb-1 block">
              Farm Name
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={mode === "edit" || mode === "create" ? false : true}
            />
          </div>

          <div>
            <Label htmlFor="location" className="mb-1 block">
              Location
            </Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              disabled={mode === "edit" || mode === "create" ? false : true}
            />
          </div>

          <div>
            <Label htmlFor="description" className="mb-1 block">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={mode === "edit" || mode === "create" ? false : true}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.isActive}
              onCheckedChange={handleSwitchChange}
              disabled={false}
              id="isActive"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          {(mode === "edit" || mode === "create") && (
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>

              <Button type="button" onClick={handleSubmit}>
                {mode === "create" ? "Create Farm" : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      )}
    </BasicModal>
  )
}
