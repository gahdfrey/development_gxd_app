"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/app/contexts/SidebarContext";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export default function SideMenu() {
  const { isExpanded, isLocked, setIsExpanded } = useSidebar();
  const pathname = usePathname();
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const { data: user } = useSWR("/api/wai", fetcher, {
    shouldRetryOnError: false, // Don't retry on auth failures
    revalidateOnFocus: false, // Don't revalidate when window regains focus
    dedupingInterval: 60000, // Cache for 1 minute to reduce repeated calls
  });

  const hasPermission = useCallback(
    (module: string, permission: string) => {
      // Handle case when user is null or doesn't exist
      if (!user || user.user === null || !user.permissions) return true; // Default to true if no permissions set
      const modulePermissions = user.permissions[module];

      // Handle missing module permissions - default to true
      if (!modulePermissions) return true;

      // Handle NEW structure: { "dashboard": { "view": true, "add": false } }
      if (
        typeof modulePermissions === "object" &&
        !Array.isArray(modulePermissions)
      ) {
        return modulePermissions[permission] === true;
      }

      // Handle OLD structure: { "dashboard": ["view", "add", "edit"] }
      if (Array.isArray(modulePermissions)) {
        return modulePermissions.includes(permission);
      }

      // Unknown structure - default to true for safety
      return true;
    },
    [user],
  );

  const handleMouseEnter = useCallback(() => {
    if (!isLocked) {
      setIsExpanded(true);
    }
  }, [isLocked, setIsExpanded]);

  const handleMouseLeave = useCallback(() => {
    if (!isLocked) {
      setIsExpanded(false);
    }
  }, [isLocked, setIsExpanded]);

  const isActive = useCallback(
    (href: string) => {
      return pathname === href;
    },
    [pathname],
  );

  // Hide the entire sidebar for patients — they only have My History / My Appointments
  if (user?.userrole === "Patient") return null;

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed left-0 top-24 bottom-0 z-40 bg-white/80 backdrop-blur-md rounded-r-lg border-gray-200 transition-all duration-400 ease-out shadow-lg  ${
        isExpanded ? "w-50" : "w-16"
      }`}
    >
      <div className="flex flex-col h-full py-4 px-2 overflow-hidden">
        {/* Menu Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none">
          {/* Dashboard Link */}
          {hasPermission("dashboard", "view") && (
            <Link
              href="/dashboard"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/dashboard")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/dashboard") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Dashboard
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Dashboard
                </div>
              )}
            </Link>
          )}

          {/* Appointments Link */}
          {hasPermission("appointments", "view") && (
            <Link
              href="/appointments"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/appointments")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/appointments") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Appointments
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Appointments
                </div>
              )}
            </Link>
          )}

          {/* My History Link - Patient portal */}
          {hasPermission("my-history", "view") && (
            <Link
              href="/my-history"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/my-history")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/my-history") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                My History
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  My History
                </div>
              )}
            </Link>
          )}

          {/* My Appointments Link - Permission-based only */}
          {hasPermission("my-appointments", "view") && (
            <Link
              href="/my-appointments"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/my-appointments")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/my-appointments") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                My Appointments
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  My Appointments
                </div>
              )}
            </Link>
          )}

          {/* All Appointments Link */}
          {hasPermission("all-appointments", "view") && (
            <Link
              href="/all-appointments"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/all-appointments")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/all-appointments") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                All Appointments
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  All Appointments
                </div>
              )}
            </Link>
          )}

                    {/* Laboratory Link */}
          {hasPermission("laboratory", "view") && (
            <Link
              href="/laboratory"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/laboratory")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/laboratory") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Laboratory
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Laboratory
                </div>
              )}
            </Link>
          )}

          {/* Radiography Link */}
          {hasPermission("radiography", "view") && (
            <Link
              href="/radiology"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/radiology")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/radiology") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Radiology
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Radiology
                </div>
              )}
            </Link>
          )}

          {/* Users Link */}
          {hasPermission("users", "view") && (
            <Link
              href="/users"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/users")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/users") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Users
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Users
                </div>
              )}
            </Link>
          )}

          {/* Roles Link */}
          {hasPermission("roles", "view") && (
            <Link
              href="/roles"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/roles")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/roles") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Roles
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Roles
                </div>
              )}
            </Link>
          )}

          {/* Supply Orders Link */}
          {hasPermission("supply-orders", "view") && (
            <Link
              href="/inventory/orders"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/inventory/orders")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/inventory/orders") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 4h6m-6 4h6"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Supply Orders
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Supply Orders
                </div>
              )}
            </Link>
          )}

          {/* Orders Link */}
          {hasPermission("orders", "view") && (
            <Link
              href="/orders"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                pathname.startsWith("/orders")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={pathname.startsWith("/orders") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"}`}>
                Orders
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Orders
                </div>
              )}
            </Link>
          )}

          {/* Products Link */}
          {hasPermission("products", "view") && (
            <Link
              href="/product-inventory"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/product-inventory")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/product-inventory") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"}`}>
                Inventory
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Inventory
                </div>
              )}
            </Link>
          )}

          {/* Finance Link */}
          {hasPermission("finance", "view") && (
            <Link
              href="/finance"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/finance")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/finance") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Finance
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Finance
                </div>
              )}
            </Link>
          )}

          {/* Pharmacy Link */}
          {hasPermission("pharmacy", "view") && (
            <Link
              href="/pharmacy"
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                isActive("/pharmacy")
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              }`}
              aria-current={isActive("/pharmacy") ? "page" : undefined}
            >
              <div className="shrink-0 relative p-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Pharmacy
              </span>
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Pharmacy
                </div>
              )}
            </Link>
          )}

          {/* Setup Accordion */}
          {hasPermission("setup", "view") && (
            <div className="space-y-1">
              {/* Setup Parent Item */}
              <button
                onClick={() => setIsSetupOpen(!isSetupOpen)}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 w-full ${
                  pathname.startsWith("/setup")
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
                }`}
              >
                <div className="shrink-0 relative p-1">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                </div>
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 flex-1 text-left ${
                    isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
                  }`}
                >
                  Setup
                </span>
                {isExpanded && (
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isSetupOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
                {!isExpanded && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                    Setup
                  </div>
                )}
              </button>

              {/* Setup Children - Only show when accordion is open and sidebar is expanded */}
              {isSetupOpen && isExpanded && (
                <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
                  {/* HMO Setup */}
                  <Link
                    href="/setup/hmo"
                    className={`group relative flex items-center gap-3 px-3 py-2 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                      isActive("/setup/hmo")
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    aria-current={isActive("/setup/hmo") ? "page" : undefined}
                  >
                    <span className="overflow-hidden whitespace-nowrap">
                      HMO Setup
                    </span>
                  </Link>

                  {/* Org Setup */}
                  <Link
                    href="/setup/org"
                    className={`group relative flex items-center gap-3 px-3 py-2 rounded-r-lg text-sm font-medium transition-all duration-200 ${
                      isActive("/setup/org")
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    aria-current={isActive("/setup/org") ? "page" : undefined}
                  >
                    <span className="overflow-hidden whitespace-nowrap">
                      Org Setup
                    </span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="pt-6 border-t border-gray-200 space-y-1 mt-auto">
          <Link
            href="/settings"
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
              isActive("/settings")
                ? "bg-blue-50 text-blue-600"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            }`}
            aria-label="Settings"
            aria-current={isActive("/settings") ? "page" : undefined}
          >
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
              }`}
            >
              Settings
            </span>
            {!isExpanded && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                Settings
              </div>
            )}
          </Link>
          <Link
            href="/help"
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${
              isActive("/help")
                ? "bg-blue-50 text-blue-600"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            }`}
            aria-label="Help"
            aria-current={isActive("/help") ? "page" : undefined}
          >
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                isExpanded ? "max-w-48 opacity-100" : "max-w-0 opacity-0"
              }`}
            >
              Help
            </span>
            {!isExpanded && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                Help
              </div>
            )}
          </Link>
        </div>
      </div>
    </aside>
  );
}
