"use client"
import { siteConfig } from "@/app/siteConfig"
import { useAuth } from "@/components/AuthProvider"
import { Divider } from "@/components/Divider"
import { Input } from "@/components/Input"
import { LogoutButton } from "@/components/LogoutButton"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarLink,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarSubLink,
} from "@/components/Sidebar"
import { cx } from "@/lib/utils"
import { RiArrowDownSFill, RiCloseLine } from "@remixicon/react"
import { BookText, House, Link, Settings, Table2 } from "lucide-react"
import { usePathname } from "next/navigation"
import * as React from "react"
import { UserProfile } from "./UserProfile"

// Define a type for navigation items to ensure consistency
type NavigationItem = {
  name: string
  href: string
  icon: React.ComponentType<any>
  notifications?: boolean
  adminOnly?: boolean
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/overview",
    icon: House,
    notifications: false,
  },
  {
    name: "Pig Table",
    href: "/details",
    icon: Table2,
    notifications: false,
  },
  {
    name: "Admin",
    href: "/admin",
    icon: Settings,
    notifications: false,
    adminOnly: true,
  },
]

// Define a type for navigation items with children
type NavigationItemWithChildren = NavigationItem & {
  children?: Array<{
    name: string
    href: string
  }>
}

const navigation2: NavigationItemWithChildren[] = [
  {
    name: "System Overview",
    href: siteConfig.baseLinks.systemOverview.farms,
    icon: BookText,
    notifications: false,
    children: [
      {
        name: "Farms",
        href: siteConfig.baseLinks.systemOverview.farms,
      },
      {
        name: "Monitoring",
        href: siteConfig.baseLinks.systemOverview.monitoring,
      },
      {
        name: "Insights",
        href: siteConfig.baseLinks.systemOverview.insights,
      },
    ],
  },
]

const navigation3: NavigationItem[] = [
  {
    name: "Insights",
    href: "http://localhost:8080/system-overview/insights",
    icon: Link,
    notifications: false,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  // Only run on client-side
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const [openMenus, setOpenMenus] = React.useState<string[]>([
    navigation2[0].name,
    navigation2[1]?.name,
  ])

  const isActive = React.useCallback(
    (itemHref: string): boolean => {
      if (!mounted || !itemHref) return false
      return pathname === itemHref || pathname.startsWith(`${itemHref}/`)
    },
    [pathname, mounted],
  )

  const toggleMenu = React.useCallback((name: string) => {
    setOpenMenus((prev) => {
      if (prev.includes(name)) {
        return prev.filter((item) => item !== name)
      }
      return [...prev, name]
    })
  }, [])

  // Filter navigation items based on user role and search term
  const filteredNavigation = React.useMemo(() => {
    return navigation.filter((item) => {
      // First filter by admin role
      if ("adminOnly" in item && item.adminOnly) {
        if (user?.role !== "admin") {
          return false
        }
      }

      // Then filter by search term if one exists
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase()
        return item.name.toLowerCase().includes(term)
      }

      return true
    })
  }, [user, searchTerm])

  // Filter system navigation items by search term
  const filteredNavigation2 = React.useMemo(() => {
    // First apply admin filter
    const adminFiltered = navigation2.filter((item) => {
      if ("adminOnly" in item && item.adminOnly) {
        return user?.role === "admin"
      }
      return true
    })

    // Then apply search filter if needed
    if (searchTerm.trim() === "") {
      return adminFiltered
    }

    const term = searchTerm.toLowerCase()
    return adminFiltered.filter((item) => {
      // Check if the main item name matches
      if (item.name.toLowerCase().includes(term)) {
        return true
      }

      // Check if any child item names match
      if (item.children) {
        return item.children.some((child) =>
          child.name.toLowerCase().includes(term),
        )
      }

      return false
    })
  }, [user, searchTerm])

  // Filter shortcuts by search term
  const filteredNavigation3 = React.useMemo(() => {
    if (searchTerm.trim() === "") {
      return navigation3
    }

    const term = searchTerm.toLowerCase()
    return navigation3.filter((item) => item.name.toLowerCase().includes(term))
  }, [searchTerm])

  return (
    <Sidebar {...props} className="dark:bg-gray-925 justify-center bg-gray-50">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-white p-1.5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-6 text-yellow-600 dark:text-yellow-400"
            >
              <path d="M15 11v.01" />
              <path d="M16 16a5 5 0 0 0 5-5c0-1.34-.55-2.44-1.41-3.3C17.5 5.75 14.5 4 11 4c-3.2 0-6 1.5-8 4 2 2.5 4.8 4 8 4h1" />
              <path d="M11 20a5 5 0 0 0 5-5" />
              <path d="M19 16c-1.3 0-2.4-.84-2.82-2" />
              <path d="M3 8c0 3.8 2.5 7 6 8" />
              <path d="M16.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
            </svg>
          </span>
          <div>
            <span className="block text-sm font-semibold text-gray-900 dark:text-gray-50">
              PAALABS
            </span>
            <span className="block text-xs text-gray-900 dark:text-gray-50">
              PAAL @ MIZZOU
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="relative">
              <Input
                type="search"
                placeholder="Search items..."
                className="[&>input]:sm:py-1.5"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm.trim() !== "" && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  <RiCloseLine className="size-4" />
                </button>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigation.length > 0 ? (
                filteredNavigation.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarLink
                      href={item.href}
                      isActive={isActive(item.href)}
                      icon={item.icon}
                      notifications={item.notifications}
                    >
                      {item.name}
                    </SidebarLink>
                  </SidebarMenuItem>
                ))
              ) : searchTerm.trim() !== "" ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No results found for &quot;{searchTerm}&quot;
                </div>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="px-3">
          <Divider className="my-0 py-0" />
        </div>
        <SidebarGroup className="my-4">
          <SidebarGroupContent title="System">
            <SidebarMenu>
              {filteredNavigation2.length > 0 ? (
                filteredNavigation2.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarLink
                      href={item.href}
                      isActive={isActive(item.href)}
                      icon={item.icon}
                      onClick={
                        item.children
                          ? (e) => {
                              e.preventDefault()
                              toggleMenu(item.name)
                            }
                          : undefined
                      }
                      suffix={
                        item.children ? (
                          <RiArrowDownSFill
                            className={cx(
                              "size-4 text-gray-500 transition-transform",
                              openMenus.includes(item.name) && "rotate-180",
                            )}
                          />
                        ) : null
                      }
                    >
                      {item.name}
                    </SidebarLink>
                    {item.children && (
                      <SidebarMenuSub
                        className={cx(
                          "overflow-hidden transition-all",
                          openMenus.includes(item.name)
                            ? "max-h-96"
                            : "max-h-0",
                        )}
                      >
                        {item.children
                          .filter(
                            (child) =>
                              searchTerm.trim() === "" ||
                              child.name
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()),
                          )
                          .map((child) => (
                            <SidebarMenuItem key={child.name}>
                              <SidebarSubLink
                                href={child.href}
                                isActive={isActive(child.href)}
                              >
                                {child.name}
                              </SidebarSubLink>
                            </SidebarMenuItem>
                          ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                ))
              ) : searchTerm.trim() !== "" ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No system items found for &quot;{searchTerm}&quot;
                </div>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="px-3">
          <Divider className="my-0 py-0" />
        </div>
        <SidebarGroup className="my-4">
          <SidebarGroupContent title="Shortcuts">
            <SidebarMenu className="">
              {filteredNavigation3.length > 0 ? (
                filteredNavigation3.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarLink
                      href={item.href}
                      isActive={isActive(item.href)}
                      icon={item.icon}
                      notifications={item.notifications}
                    >
                      {item.name}
                    </SidebarLink>
                  </SidebarMenuItem>
                ))
              ) : searchTerm.trim() !== "" ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No shortcuts found for &quot;{searchTerm}&quot;
                </div>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="border-t border-gray-200 dark:border-gray-800" />
        <UserProfile />
        <div className="px-3 py-2">
          <LogoutButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
