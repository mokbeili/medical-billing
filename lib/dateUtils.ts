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
 * Formats a date without timezone conversion - treats the date as a local date
 * This is useful for dates that are stored as dates only (without time) and should
 * not be affected by timezone conversions
 *
 * @param date - Date object, date string, or ISO string
 * @returns Formatted date string in DD MMM YYYY format without timezone conversion
 */
export function formatDateWithoutTimezone(
  date: Date | string | null | undefined
): string {
  if (!date) return "";

  try {
    let dateObj: Date;

    if (typeof date === "string") {
      // If it's a string, check if it's in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Parse as local date without timezone conversion
        const [year, month, day] = date.split("-").map(Number);
        dateObj = new Date(year, month - 1, day);
      } else if (/^\d{4}-\d{2}-\d{2}\s/.test(date)) {
        // Handle datetime strings like "2025-09-25 00:00:00.000"
        // Extract just the date part and parse as local date
        const datePart = date.split(" ")[0];
        const [year, month, day] = datePart.split("-").map(Number);
        dateObj = new Date(year, month - 1, day);
      } else {
        // For other string formats, use regular Date parsing
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn(
        `Invalid date provided to formatDateWithoutTimezone: ${date}`
      );
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
    console.error("Error formatting date without timezone:", error);
    return "";
  }
}

/**
 * Get the current date in a specific timezone as YYYY-MM-DD string
 * @param timezone - IANA timezone string (e.g., "America/Regina")
 * @returns Current date in the specified timezone as YYYY-MM-DD string
 */
export function getTodayInTimezone(timezone: string): string {
  try {
    const now = new Date();

    // Get date parts in the specified timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find((p) => p.type === "year")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const day = parts.find((p) => p.type === "day")?.value || "";

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error getting today's date in timezone:", error);
    // Fallback to local date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const dayNum = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${dayNum}`;
  }
}

/**
 * Convert a date from one timezone to another and return as YYYY-MM-DD string
 * This is useful when you have a date in one timezone and want to see what date it is in another timezone
 * @param date - Date object or YYYY-MM-DD string
 * @param fromTimezone - Source IANA timezone string
 * @param toTimezone - Target IANA timezone string
 * @returns Date string in YYYY-MM-DD format in the target timezone
 */
export function convertDateBetweenTimezones(
  date: Date | string,
  fromTimezone: string,
  toTimezone: string
): string {
  try {
    let dateObj: Date;

    if (typeof date === "string") {
      // Parse as a date in the source timezone
      const [year, month, day] = date.split("-").map(Number);
      // Create a date string that represents this date at noon in the source timezone
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}T12:00:00`;

      // Parse the date assuming it's in the source timezone
      dateObj = new Date(dateStr);
    } else {
      dateObj = date;
    }

    // Format in the target timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: toTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(dateObj);
    const year = parts.find((p) => p.type === "year")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const day = parts.find((p) => p.type === "day")?.value || "";

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error converting date between timezones:", error);
    return typeof date === "string" ? date : formatDateInput(date);
  }
}

/**
 * Parse a flexible date input in the context of a specific timezone
 * This ensures that when a user enters "22 Feb 2024", it's interpreted as
 * February 22, 2024 in the physician's timezone, not the browser's timezone
 * @param dateInput - Flexible date string input
 * @param timezone - IANA timezone string (e.g., "America/Regina")
 * @returns Standardized YYYY-MM-DD string representing the date in the specified timezone
 */
export function parseFlexibleDateInTimezone(
  dateInput: string,
  timezone: string
): string {
  if (!dateInput || typeof dateInput !== "string") return "";

  // First parse the date using the standard flexible parser
  const parsedDate = parseFlexibleDate(dateInput);
  if (!parsedDate) return "";

  // The parsed date is in YYYY-MM-DD format, which represents a date without timezone
  // We want to ensure this date is interpreted in the physician's timezone
  // Since YYYY-MM-DD represents a calendar date, we can return it as-is
  // because it already represents the correct date independent of timezone
  return parsedDate;
}

/**
 * Get today's date in the physician's timezone as YYYY-MM-DD
 * This is a convenience wrapper around getTodayInTimezone
 * @param physicianTimezone - IANA timezone string (e.g., "America/Regina")
 * @returns Today's date in YYYY-MM-DD format in the physician's timezone
 */
export function getTodayForPhysician(physicianTimezone: string): string {
  return getTodayInTimezone(physicianTimezone);
}

/**
 * Convert a local date string (YYYY-MM-DD) to a UTC timestamp representing
 * midnight (00:00:00) in the specified timezone
 *
 * Example: "2025-01-25" in "America/Regina" (UTC-6) becomes
 * "2025-01-25T06:00:00.000Z" (which is Jan 25 midnight in Regina)
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param timezone - IANA timezone string (e.g., "America/Regina")
 * @returns ISO string representing midnight in the specified timezone
 */
export function convertLocalDateToTimezoneUTC(
  dateString: string,
  timezone: string
): string {
  try {
    // Parse the date string to get year, month, day
    const [year, month, day] = dateString.split("-").map(Number);

    // Create a string representing midnight in the target timezone
    // Format: YYYY-MM-DDTHH:MM:SS
    const localDateTimeString = `${year}-${String(month).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}T00:00:00`;

    // Use Intl.DateTimeFormat to convert this to UTC
    // The trick is to format a known UTC time in the target timezone,
    // then calculate the offset

    // Create two dates: one that we'll interpret as being in the target timezone
    // and we want to find what UTC time that corresponds to

    // Method: Create the date, format it in the target timezone,
    // and calculate the offset from that
    const tentativeDate = new Date(`${localDateTimeString}Z`); // Start with UTC interpretation

    // Get the date/time components as they would appear in the target timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // What does our tentative UTC date look like in the target timezone?
    const formatted = formatter.format(tentativeDate);
    const [datePart, timePart] = formatted.split(", ");

    // Parse the parts to see the difference
    const [fYear, fMonth, fDay] = datePart.split("-").map(Number);
    const [fHour, fMinute, fSecond] = timePart.split(":").map(Number);

    // Calculate the offset: the difference between what we want (00:00:00 on the date)
    // and what we got when interpreting the date as UTC
    const targetMillis = new Date(
      Date.UTC(year, month - 1, day, 0, 0, 0, 0)
    ).getTime();
    const actualMillis = new Date(
      Date.UTC(fYear, fMonth - 1, fDay, fHour, fMinute, fSecond, 0)
    ).getTime();

    const offset = actualMillis - targetMillis;

    // Adjust the tentative date by the offset to get the correct UTC time
    const correctedDate = new Date(tentativeDate.getTime() - offset);

    return correctedDate.toISOString();
  } catch (error) {
    console.error("Error converting local date to timezone UTC:", error);
    // Fallback: return the date as-is in ISO format
    return `${dateString}T00:00:00.000Z`;
  }
}

/**
 * Combines a date string (YYYY-MM-DD) with a time string (HH:MM) in a specific timezone
 * and returns a UTC Date object
 *
 * Example: combineDateAndTimeInTimezone("2025-01-25", "07:00", "America/Regina")
 * returns a Date object representing 7:00 AM on Jan 25, 2025 in Regina time, converted to UTC
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format (24-hour) or null
 * @param timezone - IANA timezone string (e.g., "America/Regina")
 * @returns Date object in UTC representing the local date/time, or null if timeStr is null
 */
export function combineDateAndTimeInTimezone(
  dateStr: string,
  timeStr: string | null,
  timezone: string
): Date | null {
  // Return null if timeStr is null, undefined, or empty string
  if (!timeStr || timeStr.trim() === "") return null;

  try {
    // If timeStr is already a full ISO datetime, just convert it
    if (timeStr.includes("T") || timeStr.includes("Z")) {
      return new Date(timeStr);
    }

    // Validate timeStr is in HH:MM format
    if (!/^\d{1,2}:\d{2}$/.test(timeStr.trim())) {
      console.warn(`Invalid time format: ${timeStr}, expected HH:MM format`);
      return null;
    }

    // Parse the date and time components
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);

    // Validate parsed values
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.warn(`Invalid time values: hours=${hours}, minutes=${minutes}`);
      return null;
    }

    // Create a string representing the local date/time in the target timezone
    const localDateTimeString = `${year}-${String(month).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}T${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(2, "0")}:00`;

    // Use the same approach as convertLocalDateToTimezoneUTC to handle timezone conversion
    // Start with UTC interpretation
    const tentativeDate = new Date(`${localDateTimeString}Z`);

    // Get the date/time components as they would appear in the target timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // What does our tentative UTC date look like in the target timezone?
    const formatted = formatter.format(tentativeDate);
    const [datePart, timePart] = formatted.split(", ");

    // Parse the parts to see the difference
    const [fYear, fMonth, fDay] = datePart.split("-").map(Number);
    const [fHour, fMinute, fSecond] = timePart.split(":").map(Number);

    // Calculate the offset between what we want and what we got
    const targetMillis = new Date(
      Date.UTC(year, month - 1, day, hours, minutes, 0, 0)
    ).getTime();
    const actualMillis = new Date(
      Date.UTC(fYear, fMonth - 1, fDay, fHour, fMinute, fSecond, 0)
    ).getTime();

    const offset = actualMillis - targetMillis;

    // Adjust the tentative date by the offset to get the correct UTC time
    const correctedDate = new Date(tentativeDate.getTime() - offset);

    return correctedDate;
  } catch (error) {
    console.error("Error combining date and time in timezone:", error);
    return null;
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
