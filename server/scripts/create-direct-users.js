require("dotenv").config()
const { MongoClient, ObjectId } = require("mongodb")
const bcrypt = require('bcryptjs')

// Connection details
const DATABASE_HOST = process.env.DATABASE_HOST || "mongo"
const DATABASE_PORT = process.env.DATABASE_PORT || "27017"
const DATABASE_DB = process.env.MONGO_INITDB_DATABASE || "paalab"
const DATABASE_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME || "PAAL"
const DATABASE_PASSWORD = process.env.MONGO_INITDB_ROOT_PASSWORD || "PAAL"

// Try different connection strings
let URI = `mongodb://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@mongo:${DATABASE_PORT}/${DATABASE_DB}?authSource=admin`

// Log non-sensitive connection details
console.log("Attempting to connect to MongoDB with the following details:")
console.log("DATABASE_HOST:", DATABASE_HOST)
console.log("DATABASE_PORT:", DATABASE_PORT)
console.log("DATABASE_DB:", DATABASE_DB)

async function createDirectUsers() {
  let client

  try {
    console.log("Connecting to MongoDB...")

    try {
      client = new MongoClient(URI)
      await client.connect()
    } catch (connectionError) {
      console.error("First connection attempt failed:", connectionError.message)

      // Try alternative connection string
      console.log("Trying alternative connection details...")
      URI = `mongodb://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_DB}?authSource=admin`
      // Do not log the alternative URI to avoid exposing sensitive information

      client = new MongoClient(URI)
      await client.connect()
    }

    console.log("Connected to MongoDB")

    const db = client.db(DATABASE_DB)
    const usersCollection = db.collection("users")

    // Using plain text passwords for seeding
    const adminPassword = "admin123"
    const farmerPassword = "farmer123"

    console.log("Hashing passwords for secure storage...")

    // Create test users with specific IDs and hashed passwords
    const users = [
      {
        _id: new ObjectId("67f1cac0399bf2dda1ea08a8"),
        email: "admin@test.com",
        password: await bcrypt.hash(adminPassword, 10), // Hashed password for seeding
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
      },
      {
        _id: new ObjectId("67f1cac0399bf2dda1ea08a9"),
        email: "farmer@test.com",
        password: await bcrypt.hash(farmerPassword, 10), // Hashed password for seeding
        firstName: "Farmer",
        lastName: "User",
        role: "farmer",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
      },
    ]

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await usersCollection.findOne({
        email: userData.email,
      })

      if (existingUser) {
        console.log(
          `User ${userData.email} already exists with ID: ${existingUser._id}`,
        )
        console.log(`Desired ID: ${userData._id}`)

        if (existingUser._id.toString() !== userData._id.toString()) {
          console.log(
            `⚠️ IDs don't match. Deleting existing user and creating new one with correct ID...`,
          )
          await usersCollection.deleteOne({ email: userData.email })
          await usersCollection.insertOne(userData)
          console.log(`✅ User ${userData.email} recreated with correct ID`)
        } else {
          console.log(`✅ User ${userData.email} already has the correct ID`)
          // Update other fields except _id
          const { _id, ...updateData } = userData
          await usersCollection.updateOne(
            { email: userData.email },
            { $set: { ...updateData, updatedAt: new Date() } },
          )
          console.log(`✅ User ${userData.email} updated`)
        }
      } else {
        console.log(`Creating user ${userData.email}...`)
        await usersCollection.insertOne(userData)
        console.log(`✅ User ${userData.email} created`)
      }
    }

    console.log("Test users created successfully")

    // List all users
    console.log("Listing all users:")
    const allUsers = await usersCollection.find({}).toArray()
    allUsers.forEach((user) => {
      console.log(`- ${user.email} (${user.role})`)
    })
  } catch (error) {
    console.error("Error creating test users:", error)
  } finally {
    if (client) {
      await client.close()
      console.log("Disconnected from MongoDB")
    }
  }
}

createDirectUsers()
