/**
 * Utility functions for handling billing code operations,
 * particularly for time-based billing codes with multiple locations of service
 */

export interface LocationOfService {
  id: number;
  code: string;
  name: string;
  startTime: Date | string | null;
  endTime: Date | string | null;
  holidayStartTime?: Date | string | null;
  holidayEndTime?: Date | string | null;
}

export interface ProviderHoliday {
  id: number;
  date: Date | string;
  description: string | null;
}

export interface BillingCodeToSplit {
  codeId: number;
  code?: string;
  title?: string;
  multiple_unit_indicator?: string | null;
  billing_unit_type?: string | null;
  serviceStartTime?: string | null | undefined;
  serviceEndTime?: string | null | undefined;
  numberOfUnits?: number | null;
  bilateralIndicator?: string | null;
  specialCircumstances?: string | null;
  serviceDate?: string | null;
  serviceEndDate?: string | null;
  locationOfService?: string | null | undefined;
  [key: string]: any;
}

export interface SplitBillingCode {
  codeId: number;
  serviceStartTime: string | null;
  serviceEndTime: string | null;
  numberOfUnits: number;
  locationOfService: string | null;
  bilateralIndicator?: string | null;
  specialCircumstances?: string | null;
  serviceDate?: string | null;
  serviceEndDate?: string | null;
  [key: string]: any;
}

/**
 * Check if a given date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Check if a given date is a holiday
 */
export function isHoliday(date: Date, holidays: ProviderHoliday[]): boolean {
  const dateStr = date.toISOString().split("T")[0];
  return holidays.some((holiday) => {
    const holidayDate =
      typeof holiday.date === "string"
        ? holiday.date.split("T")[0]
        : holiday.date.toISOString().split("T")[0];
    return holidayDate === dateStr;
  });
}

/**
 * Check if a given date is a weekend or holiday
 */
export function isWeekendOrHoliday(
  date: Date,
  holidays: ProviderHoliday[]
): boolean {
  return isWeekend(date) || isHoliday(date, holidays);
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 * Handles times past midnight (>= 1440 minutes) by wrapping to next day
 */
function minutesToTime(minutes: number): string {
  // Wrap times past midnight back to 0-23 hours
  const normalizedMinutes = minutes % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Calculate the number of units (in minutes) between start and end times
 */
function calculateMinutes(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return endMinutes - startMinutes;
}

/**
 * Calculate the number of units based on billing unit type
 * Rounds up to the nearest unit
 */
function calculateUnits(
  minutes: number,
  billingUnitType?: string | null
): number {
  if (!billingUnitType) {
    return minutes; // Default to minutes if no unit type specified
  }

  if (billingUnitType.includes("FIVE_MINUTES")) {
    return Math.ceil(minutes / 5);
  } else if (billingUnitType.includes("FIFTEEN_MINUTES")) {
    return Math.ceil(minutes / 15);
  } else if (billingUnitType.includes("THIRTY_MINUTES")) {
    return Math.ceil(minutes / 30);
  } else if (billingUnitType.includes("MINUTES")) {
    return minutes; // Already in minutes
  }

  return minutes; // Default fallback
}

/**
 * Create time ranges based on physician's locations of service
 * This function splits a time range into multiple segments based on location of service boundaries
 */
function createTimeRanges(
  startTime: string,
  endTime: string,
  locationsOfService: LocationOfService[],
  billingUnitType?: string | null,
  isWeekendOrHoliday: boolean = false
): Array<{
  startTime: string;
  endTime: string;
  locationCode: string;
  minutes: number;
  units: number;
  isNextDay: boolean;
}> {
  // Helper to get appropriate time fields based on whether it's a weekend/holiday
  const getStartTime = (loc: LocationOfService) => {
    if (isWeekendOrHoliday && loc.holidayStartTime) {
      return loc.holidayStartTime;
    }
    return loc.startTime;
  };

  const getEndTime = (loc: LocationOfService) => {
    if (isWeekendOrHoliday && loc.holidayEndTime) {
      return loc.holidayEndTime;
    }
    return loc.endTime;
  };

  // Filter locations: on weekends/holidays, only use locations with holiday times defined
  const effectiveLocations = isWeekendOrHoliday
    ? locationsOfService.filter(
        (loc) => loc.holidayStartTime && loc.holidayEndTime
      )
    : locationsOfService.filter((loc) => loc.startTime && loc.endTime);

  // If no effective locations, return single range
  if (!effectiveLocations.length) {
    const minutes = calculateMinutes(startTime, endTime);
    return [
      {
        startTime,
        endTime,
        locationCode: "1", // Default to Office
        minutes,
        units: calculateUnits(minutes, billingUnitType),
        isNextDay: false,
      },
    ];
  }

  const ranges: Array<{
    startTime: string;
    endTime: string;
    locationCode: string;
    minutes: number;
    units: number;
    isNextDay: boolean;
  }> = [];

  const serviceStartMinutes = timeToMinutes(startTime);
  let serviceEndMinutes = timeToMinutes(endTime);

  // Handle case where end time is on the next day (e.g., 8 PM to 2 AM)
  if (serviceEndMinutes <= serviceStartMinutes) {
    serviceEndMinutes += 1440; // Add 24 hours (1440 minutes)
  }

  // Helper to extract time string from Date object or string
  const getTimeString = (time: Date | string): string => {
    if (typeof time === "string") {
      // If it's already a string, extract HH:MM
      // Handle formats like "HH:MM:SS", "HH:MM", or ISO datetime strings
      const match = time.match(/(\d{2}):(\d{2})/);
      if (match) {
        return `${match[1]}:${match[2]}`;
      }
      return time;
    } else {
      // If it's a Date object, pad with zeros
      const hours = time.getUTCHours().toString().padStart(2, "0");
      const minutes = time.getUTCMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }
  };

  // Sort locations by start time and handle midnight crossings
  let sortedLocations = [...effectiveLocations]
    .map((loc) => {
      const locStartTime = getStartTime(loc);
      const locEndTime = getEndTime(loc);

      const startMins = locStartTime
        ? timeToMinutes(getTimeString(locStartTime))
        : 0;
      let endMins = locEndTime
        ? timeToMinutes(getTimeString(locEndTime))
        : 1440;

      // Handle location times that cross midnight (e.g., Night Shift: 20:00-06:00)
      if (endMins <= startMins) {
        endMins += 1440; // Add 24 hours
      }

      return {
        ...loc,
        startMinutes: startMins,
        endMinutes: endMins,
      };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);

  // If service crosses midnight, duplicate early-morning locations for the next day
  // E.g., Location "00:00-07:00" should also be available as "1440-1860" for next day
  if (serviceEndMinutes > 1440) {
    const nextDayLocations = sortedLocations
      .filter((loc) => loc.startMinutes < 720) // Locations starting before noon
      .map((loc) => ({
        ...loc,
        startMinutes: loc.startMinutes + 1440,
        endMinutes: loc.endMinutes + 1440,
      }));

    sortedLocations = [...sortedLocations, ...nextDayLocations].sort(
      (a, b) => a.startMinutes - b.startMinutes
    );
  }

  let currentMinutes = serviceStartMinutes;

  while (currentMinutes < serviceEndMinutes) {
    // Find which location this time falls into
    const location = sortedLocations.find(
      (loc) =>
        currentMinutes >= loc.startMinutes && currentMinutes < loc.endMinutes
    );

    if (location) {
      // Calculate the end of this segment (either the service end or the location boundary)
      const segmentEnd = Math.min(serviceEndMinutes, location.endMinutes);
      const minutes = segmentEnd - currentMinutes;

      ranges.push({
        startTime: minutesToTime(currentMinutes),
        endTime: minutesToTime(segmentEnd),
        locationCode: location.code,
        minutes,
        units: calculateUnits(minutes, billingUnitType),
        isNextDay: currentMinutes >= 1440, // Check if we've crossed midnight
      });

      currentMinutes = segmentEnd;
    } else {
      // No matching location, use default (Office)
      // Find the next location boundary or use service end
      const nextLocation = sortedLocations.find(
        (loc) => loc.startMinutes > currentMinutes
      );
      const segmentEnd = nextLocation
        ? Math.min(serviceEndMinutes, nextLocation.startMinutes)
        : serviceEndMinutes;
      const minutes = segmentEnd - currentMinutes;

      ranges.push({
        startTime: minutesToTime(currentMinutes),
        endTime: minutesToTime(segmentEnd),
        locationCode: "1", // Default to Office
        minutes,
        units: calculateUnits(minutes, billingUnitType),
        isNextDay: currentMinutes >= 1440, // Check if we've crossed midnight
      });

      currentMinutes = segmentEnd;
    }
  }

  return ranges;
}

/**
 * Split a billing code into multiple codes based on time ranges and locations of service
 * This is used when multiple_unit_indicator === "U" and billing_unit_type includes "MINUTES"
 */
export function splitBillingCodeByTimeAndLocation(
  billingCode: BillingCodeToSplit,
  locationsOfService: LocationOfService[],
  physicianTimezone: string = "America/Regina",
  holidays: ProviderHoliday[] = []
): SplitBillingCode[] {
  // Check if this billing code should be split
  if (
    !billingCode.multiple_unit_indicator ||
    billingCode.multiple_unit_indicator !== "U" ||
    !billingCode.billing_unit_type?.includes("MINUTES")
  ) {
    // Return as-is if doesn't meet criteria
    return [billingCode as SplitBillingCode];
  }

  // Check if start and end times are provided
  if (!billingCode.serviceStartTime || !billingCode.serviceEndTime) {
    // Return as-is if no time range provided
    return [billingCode as SplitBillingCode];
  }

  // Determine if service date is a weekend or holiday
  let isWeekendOrHolidayDate = false;
  if (billingCode.serviceDate) {
    const serviceDate = new Date(billingCode.serviceDate);
    isWeekendOrHolidayDate = isWeekendOrHoliday(serviceDate, holidays);
  }

  // Create time ranges based on locations of service
  const timeRanges = createTimeRanges(
    billingCode.serviceStartTime,
    billingCode.serviceEndTime,
    locationsOfService,
    billingCode.billing_unit_type,
    isWeekendOrHolidayDate
  );

  // Create a billing code for each time range
  return timeRanges.map((range) => {
    // If this range is on the next day, increment the serviceDate
    let adjustedServiceDate = billingCode.serviceDate;
    let adjustedServiceEndDate = billingCode.serviceEndDate;

    if (range.isNextDay && billingCode.serviceDate) {
      const date = new Date(billingCode.serviceDate);
      date.setDate(date.getDate() + 1);
      adjustedServiceDate = date.toISOString().split("T")[0]; // Format as YYYY-MM-DD

      // Also adjust serviceEndDate if it exists
      if (billingCode.serviceEndDate) {
        const endDate = new Date(billingCode.serviceEndDate);
        endDate.setDate(endDate.getDate() + 1);
        adjustedServiceEndDate = endDate.toISOString().split("T")[0];
      }
    }

    return {
      ...billingCode,
      serviceStartTime: range.startTime,
      serviceEndTime: range.endTime,
      numberOfUnits: range.units,
      locationOfService: range.locationCode,
      serviceDate: adjustedServiceDate || undefined,
      serviceEndDate: adjustedServiceEndDate || undefined,
    };
  });
}

/**
 * Generate a human-readable description of the split operation
 */
export function generateSplitDescription(
  originalCode: BillingCodeToSplit,
  splitCodes: SplitBillingCode[],
  locationsOfService: LocationOfService[]
): string {
  if (splitCodes.length === 1) {
    return `No split needed. The billing code will be saved as-is.`;
  }

  const codeTitle = originalCode.title || originalCode.code || "Billing code";
  const lines = [
    `The billing code "${codeTitle}" will be split into ${splitCodes.length} separate codes based on your locations of service:`,
    "",
  ];

  splitCodes.forEach((code, index) => {
    const location = locationsOfService.find(
      (loc) => loc.code === code.locationOfService
    );
    const locationName = location?.name || `Location ${code.locationOfService}`;

    // Determine the unit label based on billing_unit_type
    let unitLabel = "minutes";
    if (originalCode.billing_unit_type?.includes("FIVE_MINUTES")) {
      unitLabel = "units (5-min)";
    } else if (originalCode.billing_unit_type?.includes("FIFTEEN_MINUTES")) {
      unitLabel = "units (15-min)";
    } else if (originalCode.billing_unit_type?.includes("THIRTY_MINUTES")) {
      unitLabel = "units (30-min)";
    }

    // Show date if it differs from original (indicating next day)
    const dateInfo =
      code.serviceDate && code.serviceDate !== originalCode.serviceDate
        ? ` [${code.serviceDate}]`
        : "";

    lines.push(
      `${index + 1}. ${code.serviceStartTime} - ${code.serviceEndTime} (${
        code.numberOfUnits
      } units) at ${locationName}${dateInfo}`
    );
  });

  return lines.join("\n");
}
