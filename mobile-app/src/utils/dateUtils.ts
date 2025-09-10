/**
 * Date formatting utilities for mobile application
 * Consistent with web application date formatting
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
    let dateObj: Date;

    if (typeof date === "string") {
      // Handle YYYY-MM-DD format as local date to avoid timezone issues
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split("-").map(Number);
        dateObj = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }

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
 * Formats a date for display in mobile screens
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
    let dateObj: Date;

    if (typeof date === "string") {
      // Handle YYYY-MM-DD format as local date to avoid timezone issues
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split("-").map(Number);
        dateObj = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    // Use local date components to avoid timezone conversion
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
    let dateObj: Date;

    if (typeof date === "string") {
      // Handle YYYY-MM-DD format as local date to avoid timezone issues
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split("-").map(Number);
        dateObj = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }

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
 * Parses flexible date input formats and returns a standardized YYYY-MM-DD string
 * Supports various formats including:
 * - 22 Feb 1961, Feb 23 1961 (with month names)
 * - 23/02/1961, 02/23/1961 (with slashes)
 * - 1961-02-23 (ISO format)
 * - 22-02-1961 (dash separated)
 *
 * @param dateInput - Flexible date string input
 * @returns Standardized YYYY-MM-DD string or empty string if invalid
 */
export function parseFlexibleDate(dateInput: string): string {
  if (!dateInput || typeof dateInput !== "string") return "";

  const trimmedInput = dateInput.trim();
  if (!trimmedInput) return "";

  // Month name mappings (both full and abbreviated)
  const monthMap: { [key: string]: number } = {
    january: 1,
    jan: 1,
    february: 2,
    feb: 2,
    march: 3,
    mar: 3,
    april: 4,
    apr: 4,
    may: 5,
    june: 6,
    jun: 6,
    july: 7,
    jul: 7,
    august: 8,
    aug: 8,
    september: 9,
    sep: 9,
    sept: 9,
    october: 10,
    oct: 10,
    november: 11,
    nov: 11,
    december: 12,
    dec: 12,
  };

  try {
    // Try parsing as ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmedInput)) {
      const date = new Date(trimmedInput);
      if (!isNaN(date.getTime())) {
        return formatDateInput(date);
      }
    }

    // Try parsing formats with month names
    const monthNamePattern =
      /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i;
    const monthNameMatch = trimmedInput.match(monthNamePattern);

    if (monthNameMatch) {
      const day = parseInt(monthNameMatch[1], 10);
      const monthName = monthNameMatch[2].toLowerCase();
      const year = parseInt(monthNameMatch[3], 10);
      const month = monthMap[monthName];

      if (month && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const date = new Date(year, month - 1, day);
        if (
          !isNaN(date.getTime()) &&
          date.getDate() === day &&
          date.getMonth() === month - 1 &&
          date.getFullYear() === year
        ) {
          return formatDateInput(date);
        }
      }
    }

    // Try parsing formats with month names (month first)
    const monthFirstPattern =
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s+(\d{4})/i;
    const monthFirstMatch = trimmedInput.match(monthFirstPattern);

    if (monthFirstMatch) {
      const monthName = monthFirstMatch[1].toLowerCase();
      const day = parseInt(monthFirstMatch[2], 10);
      const year = parseInt(monthFirstMatch[3], 10);
      const month = monthMap[monthName];

      if (month && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const date = new Date(year, month - 1, day);
        if (
          !isNaN(date.getTime()) &&
          date.getDate() === day &&
          date.getMonth() === month - 1 &&
          date.getFullYear() === year
        ) {
          return formatDateInput(date);
        }
      }
    }

    // Try parsing slash-separated formats (DD/MM/YYYY or MM/DD/YYYY)
    const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const slashMatch = trimmedInput.match(slashPattern);

    if (slashMatch) {
      const first = parseInt(slashMatch[1], 10);
      const second = parseInt(slashMatch[2], 10);
      const year = parseInt(slashMatch[3], 10);

      // Try both DD/MM/YYYY and MM/DD/YYYY
      for (const [day, month] of [
        [first, second],
        [second, first],
      ]) {
        if (
          month >= 1 &&
          month <= 12 &&
          day >= 1 &&
          day <= 31 &&
          year >= 1900 &&
          year <= 2100
        ) {
          const date = new Date(year, month - 1, day);
          if (
            !isNaN(date.getTime()) &&
            date.getDate() === day &&
            date.getMonth() === month - 1 &&
            date.getFullYear() === year
          ) {
            return formatDateInput(date);
          }
        }
      }
    }

    // Try parsing dash-separated formats (DD-MM-YYYY or MM-DD-YYYY)
    const dashPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
    const dashMatch = trimmedInput.match(dashPattern);

    if (dashMatch) {
      const first = parseInt(dashMatch[1], 10);
      const second = parseInt(dashMatch[2], 10);
      const year = parseInt(dashMatch[3], 10);

      // Try both DD-MM-YYYY and MM-DD-YYYY
      for (const [day, month] of [
        [first, second],
        [second, first],
      ]) {
        if (
          month >= 1 &&
          month <= 12 &&
          day >= 1 &&
          day <= 31 &&
          year >= 1900 &&
          year <= 2100
        ) {
          const date = new Date(year, month - 1, day);
          if (
            !isNaN(date.getTime()) &&
            date.getDate() === day &&
            date.getMonth() === month - 1 &&
            date.getFullYear() === year
          ) {
            return formatDateInput(date);
          }
        }
      }
    }

    // Try parsing with spaces and different separators
    const spacePattern = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/;
    const spaceMatch = trimmedInput.match(spacePattern);

    if (spaceMatch) {
      const first = parseInt(spaceMatch[1], 10);
      const second = parseInt(spaceMatch[2], 10);
      const year = parseInt(spaceMatch[3], 10);

      // Try both DD-MM-YYYY and MM-DD-YYYY
      for (const [day, month] of [
        [first, second],
        [second, first],
      ]) {
        if (
          month >= 1 &&
          month <= 12 &&
          day >= 1 &&
          day <= 31 &&
          year >= 1900 &&
          year <= 2100
        ) {
          const date = new Date(year, month - 1, day);
          if (
            !isNaN(date.getTime()) &&
            date.getDate() === day &&
            date.getMonth() === month - 1 &&
            date.getFullYear() === year
          ) {
            return formatDateInput(date);
          }
        }
      }
    }

    // Fallback: try JavaScript's built-in date parsing
    const fallbackDate = new Date(trimmedInput);
    if (!isNaN(fallbackDate.getTime())) {
      return formatDateInput(fallbackDate);
    }

    return "";
  } catch (error) {
    console.error("Error parsing flexible date:", error);
    return "";
  }
}

/**
 * Validates if a date string is in a valid format and returns a boolean
 * @param dateInput - Date string to validate
 * @returns True if the date is valid, false otherwise
 */
export function isValidFlexibleDate(dateInput: string): boolean {
  return parseFlexibleDate(dateInput) !== "";
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

/**
 * Formats a date string (YYYY-MM-DD) for relative display
 * Shows "Today", "Yesterday", weekday name, or formatted date
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Relative date string
 */
export function formatRelativeDate(dateString: string): string {
  if (!dateString) return "";

  try {
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;

    const target = new Date(year, month, day);
    const now = new Date();

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

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

    // Check if it's today
    if (target.toDateString() === now.toDateString()) {
      return "Today";
    }

    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (target.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    // Check if it's within the last week
    const diffMs = Math.abs(now.getTime() - target.getTime());
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 6) {
      return dayNames[target.getDay()];
    }

    // For older dates, show formatted date
    return formatFullDate(target);
  } catch (error) {
    console.error("Error formatting relative date:", error);
    return dateString;
  }
}
