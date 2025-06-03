"use client"

import { Button } from "@/components/Button_S"
import axios from "axios"
import { useState } from "react"

export default function LoginPage() {
  // Pre-filled for testing
  const [email, setEmail] = useState("admin@test.com")
  const [password, setPassword] = useState("admin123")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      console.log("Login form submitted with email:", email)

      // Direct API call to login
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        {
          email,
          password,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      )

      console.log("Login response:", response.data)

      // Store token and user info in localStorage
      localStorage.setItem("token", response.data.token)
      localStorage.setItem("user", JSON.stringify(response.data.user))

      // Also store token in cookies for server-side middleware
      document.cookie = `token=${response.data.token}; path=/; max-age=86400`

      // Redirect based on role
      console.log(
        "Login successful, redirecting based on role:",
        response.data.user.role,
      )

      // Use window.location for a hard redirect instead of router.push
      // This ensures a complete page reload with the new authentication state
      if (response.data.user.role === "admin") {
        console.log("Redirecting admin to /admin")
        window.location.href = "/admin"
      } else {
        console.log("Redirecting farmer to /overview")
        window.location.href = "/overview"
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.response?.data?.error || err.message || "Failed to login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Background with modern gradient and animated shapes */}
      {/* Left side background - clean white */}
      <div className="absolute inset-y-0 left-0 hidden w-1/2 overflow-hidden bg-white lg:block">
        {/* Subtle background pattern */}
        <div className="absolute left-0 top-0 h-full w-full overflow-hidden opacity-5">
          <div className="animate-blob absolute left-[15%] top-[10%] h-96 w-96 rounded-full bg-blue-400 mix-blend-multiply blur-3xl filter"></div>
          <div className="animate-blob animation-delay-4000 absolute bottom-[20%] left-[25%] h-96 w-96 rounded-full bg-indigo-400 mix-blend-multiply blur-3xl filter"></div>
        </div>
      </div>

      {/* Right side background - lighter, more vibrant */}
      <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-blue-800 via-indigo-700 to-purple-800 lg:inset-y-0 lg:left-1/2 lg:right-0">
        {/* Animated background shapes for right side */}
        <div className="absolute left-0 top-0 h-full w-full overflow-hidden opacity-20">
          <div className="animate-blob animation-delay-2000 absolute right-[15%] top-[20%] h-96 w-96 rounded-full bg-purple-400 mix-blend-multiply blur-3xl filter"></div>
          <div className="animate-blob absolute bottom-[15%] right-[25%] h-96 w-96 rounded-full bg-blue-300 mix-blend-multiply blur-3xl filter"></div>
        </div>
      </div>

      {/* Divider between left and right sides */}
      <div className="absolute bottom-0 left-1/2 top-0 z-10 hidden w-[1px] bg-gradient-to-b from-gray-200/0 via-gray-200/70 to-gray-200/0 lg:block"></div>

      <div className="relative flex w-full flex-col lg:flex-row">
        {/* Left side - Minimalistic Brand/Logo section */}
        <div className="z-10 hidden flex-col items-center justify-center p-12 lg:flex lg:w-1/2">
          <div className="mx-auto max-w-md">
            <div className="mb-16">
              {/* Minimalistic logo */}
              <div className="mb-12">
                <h1 className="text-7xl font-bold tracking-tight text-blue-900">
                  PAAL
                </h1>
                <div className="my-6 h-1 w-16 bg-blue-500/60"></div>
                <p className="text-xl font-light text-gray-600">
                  Agricultural Monitoring
                </p>
              </div>

              {/* Simple tagline */}
              <p className="max-w-sm text-lg font-light leading-relaxed text-gray-500">
                Streamlined monitoring and management for modern agricultural
                operations
              </p>
            </div>

            {/* Minimalistic feature indicators */}
            <div className="mt-auto space-y-6">
              <div className="group flex items-center space-x-3 text-gray-600">
                <div className="h-[1px] w-8 bg-blue-400/50 transition-all duration-300 group-hover:w-12"></div>
                <span className="text-sm font-light uppercase tracking-wider">
                  Real-time Monitoring
                </span>
              </div>

              <div className="group flex items-center space-x-3 text-gray-600">
                <div className="h-[1px] w-8 bg-blue-400/50 transition-all duration-300 group-hover:w-12"></div>
                <span className="text-sm font-light uppercase tracking-wider">
                  Enterprise Security
                </span>
              </div>

              <div className="group flex items-center space-x-3 text-gray-600">
                <div className="h-[1px] w-8 bg-blue-400/50 transition-all duration-300 group-hover:w-12"></div>
                <span className="text-sm font-light uppercase tracking-wider">
                  Advanced Analytics
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="z-10 flex w-full items-center justify-center p-8">
          <div className="w-full max-w-md rounded-xl bg-white/95 p-10 shadow-xl backdrop-blur-lg dark:bg-gray-900/95">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
                Welcome back
              </h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Sign in to your account
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-center rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2 h-4 w-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email input */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Password input */}
              <div>
                <div className="mb-1 flex justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Remember me checkbox */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  Remember me
                </label>
              </div>

              {/* Sign in button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  isLoading={isLoading}
                  loadingText="Signing in..."
                >
                  Sign in
                </Button>
              </div>
            </form>

            {/* Test accounts info */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                    Test accounts
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs">
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    Admin
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    admin@test.com / admin123
                  </p>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    Farmer
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    farmer@test.com / farmer123
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
