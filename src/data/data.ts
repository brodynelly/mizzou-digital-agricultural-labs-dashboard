import { Usage } from "./schema"

export const roles = [
  {
    value: "admin",
    label: "Admin",
  },
  {
    value: "member",
    label: "Member",
  },
  {
    value: "viewer",
    label: "Viewer",
  },
]

export const users = [
  {
    name: "Emma Stone",
    email: "emma.stone@acme.com",
    initials: "ES",
    role: "admin",
  },
  {
    name: "John Smith",
    email: "john.smith@acme.com",
    initials: "JS",
    role: "member",
  },
  {
    name: "Sarah Wilson",
    email: "sarah.wilson@acme.com",
    initials: "SW",
    role: "viewer",
  },
]

export const invitedUsers = [
  {
    email: "invited.user1@acme.com",
    initials: "IU",
    role: "member",
    expires: 7,
  },
  {
    email: "invited.user2@acme.com",
    initials: "IU",
    role: "viewer",
    expires: 5,
  },
]

export const healthStatuses: {
  value: string
  label: string
  variant: string
}[] = [
  {
    value: "healthy",
    label: "Healthy",
    variant: "success",
  },
  {
    value: "suspicious",
    label: "Suspicious",
    variant: "warning",
  },
  {
    value: "critical",
    label: "Critical",
    variant: "error",
  },
  {
    value: "inheat",
    label: "In Heat",
    variant: "neutral",
  },
]

export const pigGroups: { value: string; label: string }[] = [
  {
    value: "Group 1",
    label: "Group 1",
  },
  {
    value: "Group 2",
    label: "Group 2",
  },
  {
    value: "Group 3",
    label: "Group 3",
  },
  {
    value: "Group 4",
    label: "Group 4",
  },
]

export const conditions: { value: string; label: string }[] = [
  {
    value: "is-equal-to",
    label: "is equal to",
  },
  {
    value: "is-between",
    label: "is between",
  },
  {
    value: "is-greater-than",
    label: "is greater than",
  },
  {
    value: "is-less-than",
    label: "is less than",
  },
]

// Generate 100 pig records with realistic data
export const pigData: Usage[] = Array.from({ length: 100 }, (_, i) => {
  const healthRisk = Math.floor(Math.random() * 100)
  let status
  if (healthRisk < 30) {
    status = "healthy"
  } else if (healthRisk < 75) {
    status = "suspicious"
  } else if (healthRisk < 90) {
    status = "critical"
  } else {
    status = "inheat"
  }

  const breeds = [
    "Large White",
    "Landrace",
    "Yorkshire",
    "Duroc",
    "Hampshire",
    "Berkshire",
    "Pietrain",
    "Meishan",
  ]
  const breed = breeds[Math.floor(Math.random() * breeds.length)]

  // Age between 1-5 years (12-60 months)
  const age = Math.floor(Math.random() * 48) + 12

  // Assign to one of 4 groups
  const group = `Group ${Math.floor(Math.random() * 4) + 1}`

  // Generate last edited timestamp within the last week
  const lastEdited = new Date(
    Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
  )

  return {
    owner: `PIG-${(i + 1).toString().padStart(3, "0")}`,
    status,
    costs: age,
    region: group,
    stability: healthRisk,
    lastEdited: lastEdited.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    breed,
  }
})
