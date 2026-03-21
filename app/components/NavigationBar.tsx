"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { NavigationToggle } from "./NavigationToggle";
import { useSidebar } from "@/app/contexts/SidebarContext";
import type { Session } from "next-auth";
import NotificationBell from "./NotificationBell";

interface NavigationBarProps {
  session: Session | null;
}

export default function NavigationBar({ session }: NavigationBarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { isLocked, toggleLock } = useSidebar();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <header className="fixed inset-x-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 py-1 shadow-sm h-16 transition-colors duration-300">
      <div className="flex items-center justify-between px-6 h-full">
        <div className="flex items-center gap-4">
          <NavigationToggle isExpanded={isLocked} onToggle={toggleLock} />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
              G
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-purple-600">
              GXD App
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">Client Logo</div>

        <div className="flex items-center gap-4">
          <NotificationBell userRole={session?.user?.role} />
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-all duration-200 border border-transparent hover:border-gray-200"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                {session?.user?.firstname && session?.user?.lastname
                  ? `${session.user.firstname.charAt(
                      0,
                    )}${session.user.lastname.charAt(0)}`.toUpperCase()
                  : session?.user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-700">
                  {session?.user?.firstname && session?.user?.lastname
                    ? `${session.user.firstname} ${session.user.lastname}`
                    : session?.user?.username || "User"}
                </p>
                <p className="text-xs text-gray-500">
                  {/* {session?.user?.email || "user@example.com"} */}
                  {session?.user?.role || "User"}
                </p>
              </div>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                  isProfileOpen ? "rotate-180" : ""
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
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden animate-fade-in z-50">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-900">
                    {session?.user?.firstname && session?.user?.lastname
                      ? `${session.user.firstname} ${session.user.lastname}`
                      : session?.user?.username || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {/* {session?.user?.email} */}
                    {session?.user?.role || "User"}
                  </p>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-medium"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
