/**
 * Date formatting utilities for consistent date display across web and mobile applications
 */

/**
 * Formats a date to the new standard format: DD MMM YYYY
 * Example: "15 Jan 2024"
 *
 * @param date - Date object, date string, or ISO string
 * @returns Formatted date string in DD MMM YYYY format
 */
export function formatFullDate(date: Date | string | null | undefined): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn(`Invalid date provided to formatFullDate: ${date}`);
      return "";
    }

    const day = String(dateObj.getDate()).padStart(2, "0");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();

    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

/**
 * Formats a date for display in tables and lists (shorter format)
 * Uses the same DD MMM YYYY format but can be extended for different contexts
 *
 * @param date - Date object, date string, or ISO string
 * @returns Formatted date string
 */
export function formatDisplayDate(
  date: Date | string | null | undefined
): string {
  return formatFullDate(date);
}

/**
 * Formats a date for form inputs (YYYY-MM-DD format)
 * This is used for date inputs and API calls
 *
 * @param date - Date object, date string, or ISO string
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDateInput(
  date: Date | string | null | undefined
): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    return dateObj.toISOString().split("T")[0];
  } catch (error) {
    console.error("Error formatting date for input:", error);
    return "";
  }
}

/**
 * Formats a date with time for detailed views
 * Format: DD MMM YYYY, HH:MM AM/PM
 *
 * @param date - Date object, date string, or ISO string
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    const dateStr = formatFullDate(dateObj);
    const timeStr = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${dateStr}, ${timeStr}`;
  } catch (error) {
    console.error("Error formatting date and time:", error);
    return "";
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use formatFullDate instead
 */
export function formatDateToMonthDay(dateString: string): string {
  if (!dateString) return "";

  try {
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthName = monthNames[month];
    return `${String(day).padStart(2, "0")} ${monthName} ${year}`;
  } catch (error) {
    return dateString;
  }
}
