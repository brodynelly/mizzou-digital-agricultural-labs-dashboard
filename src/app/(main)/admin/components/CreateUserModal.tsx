import { Button } from "@/components/Button_S"
import { Input } from "@/components/Input"
import { Label } from "@/components/Label"
import { Permission, ROLE_TEMPLATES } from "@/types/permissions"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  Shield,
  User,
  UserCheck,
} from "lucide-react"
import { useState } from "react"

type CreateUserModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (userData: {
    email: string
    firstName: string
    lastName: string
    role: string
    password: string
    permissions: Permission[]
  }) => void
}

type Step = "userInfo" | "rolePermissions"

export function CreateUserModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateUserModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("userInfo")
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "Farm Manager",
    password: "",
    permissions: ROLE_TEMPLATES.FARM_MANAGER.permissions,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target

    if (name === "role") {
      // Update permissions based on role template
      const roleKey = Object.keys(ROLE_TEMPLATES).find(
        (key) =>
          ROLE_TEMPLATES[key as keyof typeof ROLE_TEMPLATES].name === value,
      )
      // updated comments
      // test comment
      // test comment

      if (roleKey) {
        const template = ROLE_TEMPLATES[roleKey as keyof typeof ROLE_TEMPLATES]
        setFormData((prev) => ({
          ...prev,
          role: value,
          permissions: template.permissions,
        }))
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }))
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateUserInfoStep = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid"
    }

    if (!formData.firstName) {
      newErrors.firstName = "First name is required"
    }

    if (!formData.lastName) {
      newErrors.lastName = "Last name is required"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateRoleStep = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.role) {
      newErrors.role = "Role is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = () => {
    if (currentStep === "userInfo" && validateUserInfoStep()) {
      setCurrentStep("rolePermissions")
    }
  }

  const handlePrevStep = () => {
    setCurrentStep("userInfo")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === "userInfo") {
      if (validateUserInfoStep()) {
        setCurrentStep("rolePermissions")
      }
    } else if (currentStep === "rolePermissions") {
      if (validateRoleStep()) {
        onSubmit({
          ...formData,
          permissions: [...formData.permissions], // Convert readonly array to mutable array
        })
        // Reset form
        setFormData({
          email: "",
          firstName: "",
          lastName: "",
          role: "Farm Manager",
          password: "",
          permissions: ROLE_TEMPLATES.FARM_MANAGER.permissions,
        })
        setCurrentStep("userInfo")
      }
    }
  }

  const handleCancel = () => {
    // Reset form
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      role: "Farm Manager",
      password: "",
      permissions: ROLE_TEMPLATES.FARM_MANAGER.permissions,
    })
    setCurrentStep("userInfo")
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-gray-800">
        <div className="mb-6 flex items-center gap-2">
          <div className="rounded-full bg-indigo-100 p-2 dark:bg-indigo-900">
            <UserCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Create New User</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentStep === "userInfo"
                ? "Step 1: Enter basic user information"
                : "Step 2: Assign role and permissions"}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                currentStep === "userInfo"
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300"
              }`}
            >
              <span className="text-sm font-medium">1</span>
            </div>
            <div className="mx-2 h-1 flex-1 bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-full ${currentStep === "userInfo" ? "w-0" : "w-full"} bg-indigo-600 transition-all duration-300`}
              ></div>
            </div>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                currentStep === "rolePermissions"
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300"
              }`}
            >
              <span className="text-sm font-medium">2</span>
            </div>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-xs font-medium text-gray-500">
              User Information
            </span>
            <span className="text-xs font-medium text-gray-500">
              Role & Permissions
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: User Information */}
          {currentStep === "userInfo" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-gray-500" />
                  User Information
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="user@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={errors.firstName ? "border-red-500" : ""}
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.firstName}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={errors.lastName ? "border-red-500" : ""}
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className={errors.password ? "border-red-500" : ""}
                    />
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.password}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Role & Permissions */}
          {currentStep === "rolePermissions" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-gray-500" />
                  Role & Permissions
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="role">User Role</Label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    >
                      {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                        <option key={key} value={template.name}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    {errors.role && (
                      <p className="mt-1 text-xs text-red-500">{errors.role}</p>
                    )}
                  </div>

                  <div className="rounded-md bg-indigo-50 p-3 dark:bg-indigo-900/30">
                    <div className="mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                        Role Description
                      </span>
                    </div>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      {Object.entries(ROLE_TEMPLATES).find(
                        ([_, template]) => template.name === formData.role,
                      )?.[1].description || ""}
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label className="mb-0">Default Permissions</Label>
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                        {formData.permissions.length} permissions
                      </span>
                    </div>
                    <div className="rounded border border-gray-200 bg-gray-100 p-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      <p className="mb-2">
                        This role includes permissions for:
                      </p>
                      <ul className="list-disc space-y-1 pl-5">
                        {formData.permissions.slice(0, 3).map((perm, index) => (
                          <li key={index}>{perm}</li>
                        ))}
                        {formData.permissions.length > 3 && (
                          <li>...and {formData.permissions.length - 3} more</li>
                        )}
                      </ul>
                      <p className="mt-2 italic">
                        You can customize these after creating the user
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Summary */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-gray-500" />
                  User Summary
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium">
                      {formData.firstName} {formData.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            {currentStep === "userInfo" ? (
              <>
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Next Step
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={handlePrevStep}
                  type="button"
                  className="flex items-center"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex items-center bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Create User
                  </Button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
