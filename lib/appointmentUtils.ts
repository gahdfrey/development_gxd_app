import { format } from "date-fns";

/**
 * Formats a time string (HH:MM) to a human-readable format
 * @param time - Time string in HH:MM format (e.g., "14:30")
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export const formatTime = (time: string): string => {
  try {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, "h:mm a");
  } catch {
    return time;
  }
};

/**
 * Formats a date string to a human-readable format
 * @param dateStr - Date string in ISO format (e.g., "2026-01-11")
 * @returns Formatted date string (e.g., "Jan 11, 2026")
 */
export const formatDate = (dateStr: string): string => {
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
};

/**
 * Converts a private Vercel Blob URL into a proxied download URL that is
 * accessible only to authenticated users via /api/blob/download.
 * Use this wherever you display or link to uploaded result files.
 */
export function getBlobUrl(filePath: string, forceDownload = false): string {
  const base = `/api/blob/download?url=${encodeURIComponent(filePath)}`;
  return forceDownload ? `${base}&dl=1` : base;
}

/**
 * Formats a date string as a relative time (e.g., "2 mins ago", "3 days ago")
 * @param dateStr - Date string in ISO format
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();

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

/**
 * Checks if the appointment date is today
 * @param dateStr - Date string in ISO format (e.g., "2026-01-11")
 * @returns True if the appointment is today, false otherwise
 */
export const hasAppointmentDatePassed = (dateStr: string): boolean => {
  try {
    // Parse the appointment date
    const appointmentDate = new Date(dateStr);

    // Get current date
    const now = new Date();

    // Check if the appointment date is today or has passed
    const isToday =
      appointmentDate.getDate() === now.getDate() &&
      appointmentDate.getMonth() === now.getMonth() &&
      appointmentDate.getFullYear() === now.getFullYear();

    // Return true if it's today (no time check)
    return isToday;
  } catch {
    return false;
  }
};
