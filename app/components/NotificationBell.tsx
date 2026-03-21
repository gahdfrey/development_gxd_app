"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { BellIcon } from "@heroicons/react/24/outline";
import { BellAlertIcon } from "@heroicons/react/24/solid";

interface NotificationItem {
  id: number;
  requestId: number;
  patientFirstname: string | null;
  patientLastname: string | null;
  departmentName: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  userRole: string | null | undefined;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function NotificationBell({ userRole }: NotificationBellProps) {
  const isDoctor = userRole?.toLowerCase().includes("doctor");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR<{ unreadCount: number; notifications: NotificationItem[] }>(
    isDoctor ? "/api/notifications?limit=5" : null,
    fetcher,
    { refreshInterval: 30000 },
  );

  const unreadCount = data?.unreadCount ?? 0;
  const notifList = data?.notifications ?? [];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleOpen = async () => {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      // Mark all as read
      try {
        await fetch("/api/notifications/read-all", { method: "PATCH" });
        mutate();
      } catch {}
    }
  };

  if (!isDoctor) return null;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <div className="relative group">
        <button
          onClick={handleOpen}
          className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
          aria-label="Notifications"
        >
          {unreadCount > 0 ? (
            <BellAlertIcon className="h-5 w-5 text-gray-700" />
          ) : (
            <BellIcon className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        {/* Tooltip */}
        {!open && (
          <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Show all
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount === 0 && (
              <span className="text-xs text-gray-400">All caught up</span>
            )}
          </div>

          {/* List */}
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {notifList.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <BellIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifList.map((notif) => {
                const patientName =
                  `${notif.patientFirstname ?? ""} ${notif.patientLastname ?? ""}`.trim() || "Unknown patient";
                return (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                      !notif.isRead ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">{patientName}</span>
                          {" — "}
                          <span className="text-gray-600">
                            Result from {notif.departmentName ?? "department"}
                          </span>
                        </p>
                        {notif.message && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate italic">
                            &ldquo;{notif.message}&rdquo;
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatRelativeTime(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Show all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
