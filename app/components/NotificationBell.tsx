"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { BellIcon } from "@heroicons/react/24/outline";
import { BellAlertIcon } from "@heroicons/react/24/solid";

interface NotificationItem {
  id: number;
  requestId: number;
  patientId: number | null;
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

  // Treat future timestamps (clock drift, etc.) as "just now"
  if (diffMs < 0) return "just now";

  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "just now";

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? "min" : "mins"} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} ${diffWeeks === 1 ? "week" : "weeks"} ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? "month" : "months"} ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} ${diffYears === 1 ? "year" : "years"} ago`;
}

export default function NotificationBell({ userRole }: NotificationBellProps) {
  const isDoctor = userRole?.toLowerCase().includes("doctor");
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, mutate } = useSWR<{ unreadCount: number; notifications: NotificationItem[] }>(
    isDoctor ? "/api/notifications?limit=5" : null,
    fetcher,
    { refreshInterval: 30000 },
  );

  const unreadCount = data?.unreadCount ?? 0;
  const notifList = data?.notifications ?? [];

  const markAllRead = async () => {
    if (unreadCount > 0) {
      try {
        await fetch("/api/notifications/read-all", { method: "PATCH" });
        mutate();
      } catch {}
    }
  };

  const handleMouseEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    // Small delay so the user can move the mouse from bell to dropdown without it closing
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      markAllRead();
    }, 150);
  };

  if (!isDoctor) return null;

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Bell button */}
      <button
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

      {/* Dropdown — shown on hover */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">

          {/* ── Top bar: title + "Show all" link ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                  {unreadCount} new
                </span>
              )}
            </div>
            <Link
              href="/notifications"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              Show all
            </Link>
          </div>

          {/* ── Notification list ── */}
          <div className="divide-y divide-gray-50">
            {notifList.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <BellIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifList.map((notif) => {
                const patientName =
                  `${notif.patientFirstname ?? ""} ${notif.patientLastname ?? ""}`.trim() ||
                  "Unknown patient";
                const href = notif.patientId
                  ? `/patients/${notif.patientId}/history`
                  : "/notifications";
                return (
                  <Link
                    key={notif.id}
                    href={href}
                    className={`block px-4 py-3 transition-colors border-l-2 ${
                      !notif.isRead
                        ? "bg-blue-50 hover:bg-blue-100/70 border-l-blue-500"
                        : "hover:bg-gray-50 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${
                          !notif.isRead ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-sm ${!notif.isRead ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                            {patientName}
                          </p>
                          {!notif.isRead && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500 text-white uppercase tracking-wide leading-none">
                              New
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${!notif.isRead ? "text-gray-700" : "text-gray-500"}`}>
                          Result from{" "}
                          <span className="font-medium">{notif.departmentName ?? "department"}</span>
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
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
