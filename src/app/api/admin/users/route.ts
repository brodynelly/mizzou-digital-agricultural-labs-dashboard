import { auth, clerkClient } from "@clerk/nextjs"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Check if user is authenticated and is an admin
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // In a real app, you would check if the user is an admin here
    // For now, we'll assume any authenticated user can create users

    const { email, password, firstName, lastName, role } = await request.json()

    // Validate input
    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      )
    }

    // Create user in Clerk
    const user = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error("Error creating user:", error)

    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    // Check if user is authenticated and is an admin
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // In a real app, you would check if the user is an admin here

    // Get all users from Clerk
    const users = await clerkClient.users.getUserList()

    return NextResponse.json(users)
  } catch (error: any) {
    console.error("Error fetching users:", error)

    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 },
    )
  }
}
