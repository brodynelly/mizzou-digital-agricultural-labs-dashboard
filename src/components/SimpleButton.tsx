"use client"

import React from "react"

interface SimpleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline"
}

export function SimpleButton({
  children,
  className = "",
  variant = "primary",
  ...props
}: SimpleButtonProps) {
  const baseStyles =
    "px-4 py-2 rounded font-medium focus:outline-none focus:ring-2 focus:ring-offset-2"

  const variantStyles = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500",
    secondary:
      "bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500",
    outline:
      "border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-gray-500",
  }

  const buttonStyles = `${baseStyles} ${variantStyles[variant]} ${className}`

  return (
    <button className={buttonStyles} {...props}>
      {children}
    </button>
  )
}
