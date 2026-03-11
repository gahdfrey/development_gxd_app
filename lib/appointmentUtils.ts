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
