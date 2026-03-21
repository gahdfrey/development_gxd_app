"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { BellIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
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

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const { data, isLoading, mutate } = useSWR<{
    unreadCount: number;
    notifications: NotificationItem[];
  }>("/api/notifications", fetcher);

  const unreadCount = data?.unreadCount ?? 0;
  const notifList = data?.notifications ?? [];

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
      mutate();
    } catch {}
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {unreadCount > 0 ? (
              <BellAlertIcon className="h-6 w-6 text-blue-600" />
            ) : (
              <BellIcon className="h-6 w-6 text-gray-500" />
            )}
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Results sent back from lab and radiography departments
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CheckCircleIcon className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : notifList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No notifications yet</p>
          <p className="text-sm text-gray-400 mt-1">
            You&apos;ll be notified here when a result is sent back for one of your requests.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          {notifList.map((notif) => {
            const patientName =
              `${notif.patientFirstname ?? ""} ${notif.patientLastname ?? ""}`.trim() ||
              "Unknown patient";
            return (
              <div
                key={notif.id}
                className={`px-5 py-4 flex items-start gap-4 transition-colors ${
                  !notif.isRead ? "bg-blue-50/50" : "hover:bg-gray-50"
                }`}
              >
                <div
                  className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                    !notif.isRead ? "bg-blue-500" : "bg-gray-300"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{patientName}</span>
                    <span className="text-gray-500"> — result received from </span>
                    <span className="font-medium text-gray-800">
                      {notif.departmentName ?? "department"}
                    </span>
                  </p>
                  {notif.message && (
                    <p className="text-sm text-gray-600 mt-1 italic bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      &ldquo;{notif.message}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">
                    {formatDateTime(notif.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
