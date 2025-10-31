import { prisma } from "@/lib/prisma";

// ==================== TYPES ====================

interface BiweeklyPaidLineRecord {
  recordType: "P";
  mode: string;
  practitionerNumber: string;
  clinicNumber: string;
  claimNumber: number;
  name: string;
  healthServicesNumber: string;
  claimSequenceNumber: number;
  dayOfService: string;
  monthOfService: string;
  yearOfService: string;
  submittedNumberOfUnits: number;
  feeScheduleCodeSubmitted: string;
  feeSubmitted: number;
  feeScheduleCodeApproved: string;
  feeApproved: number;
  explanatoryCode: string;
  corporationIndicator: string;
  paymentRunCode: string;
  formType: string;
  totalPremiumAmount: number;
  programPayment: number;
  totalPaidAmount: number;
  explanatoryCode2: string;
  explanatoryCode3: string;
  paidNumberOfUnits: number;
  paidLocationOfService: string;
  oopProvinceCode: string;
  oopHSN: string;
  originalRunCode: string;
  cpsClaimNumber: string;
}

interface BiweeklyTotalLineRecord {
  recordType: "T";
  mode: string;
  practitionerNumber: string;
  clinicNumber: string;
  totalLineType: string;
  feeSubmitted: number;
  feeApproved: number;
  corporationIndicator: string;
  totalPremiumAmount: number;
  totalProgramPayment: number;
  totalPaidAmount: number;
  runCode: string;
}

interface BiweeklyMessageLineRecord {
  recordType: "M";
  mode: string;
  practitionerNumber: string;
  clinicNumber: string;
  message: string;
  runCode: string;
}

interface RejectedVisitProcedureRecord {
  recordType: "50";
  practitionerNumber: string;
  claimNumber: number;
  claimSequenceNumber: number;
  healthServicesNumber: string;
  dateOfBirth: string;
  sex: string;
  name: string;
  diagnosticCode: string;
  referringPractitionerNumber: string;
  dateOfService: string;
  numberOfUnits: number;
  locationOfService: string;
  feeScheduleCodeSubmitted: string;
  feeSubmitted: number;
  mode: string;
  formType: string;
  corporationIndicator: string;
  explanatoryCode: string;
  paymentRunCode: string;
  clinicNumber: string;
  status: string;
  explanatoryCode2: string;
  explanatoryCode3: string;
  originalRunCode: string;
  cpsClaimNumber: string;
}

interface RejectedHospitalCareRecord {
  recordType: "57";
  practitionerNumber: string;
  claimNumber: number;
  claimSequenceNumber: number;
  healthServicesNumber: string;
  dateOfBirth: string;
  sex: string;
  name: string;
  diagnosticCode: string;
  referringPractitionerNumber: string;
  firstDateOfService: string;
  lastDateOfService: string;
  numberOfVisits: number;
  feeScheduleCodeSubmitted: string;
  feeSubmitted: number;
  mode: string;
  formType: string;
  corporationIndicator: string;
  paymentRunCode: string;
  explanatoryCode: string;
  clinicNumber: string;
  status: string;
  explanatoryCode2: string;
  explanatoryCode3: string;
  originalRunCode: string;
  cpsClaimNumber: string;
}

interface RejectedCommentRecord {
  recordType: "60";
  practitionerNumber: string;
  claimNumber: number;
  lineNumber: number;
  healthServicesNumber: string;
  comments: string;
  clinicNumber: string;
  originalRunCode: string;
  cpsClaimNumber: string;
}

interface RejectedReciprocalBillingRecord {
  recordType: "89";
  practitionerNumber: string;
  claimNumber: number;
  claimSequenceNumber: number;
  province: string;
  beneficiarySurname: string;
  beneficiaryFirstName: string;
  beneficiarySecondInitial: string;
  outOfProvinceHSN: string;
  clinicNumber: string;
  originalRunCode: string;
  cpsClaimNumber: string;
}

interface PendedVisitProcedureRecord extends RejectedVisitProcedureRecord {
  status: "P";
}

interface PendedHospitalCareRecord extends RejectedHospitalCareRecord {
  status: "P";
}

interface PendedReciprocalBillingRecord
  extends RejectedReciprocalBillingRecord {}

interface DailyHeaderRecord {
  recordType: "10";
  practitionerNumber: string;
  groupNumber: string;
  clinicNumber: string;
  submissionType: string;
  corporationIndicator: string;
}

interface DailyTrailerRecord {
  recordType: "90";
  practitionerNumber: string;
  numberOfRecordsSubmitted: number;
  numberOfServiceRecordsSubmitted: number;
  totalDollarAmountSubmitted: number;
  runCode: string;
}

type BiweeklyRecord =
  | BiweeklyPaidLineRecord
  | BiweeklyTotalLineRecord
  | BiweeklyMessageLineRecord
  | RejectedVisitProcedureRecord
  | RejectedHospitalCareRecord
  | RejectedCommentRecord
  | RejectedReciprocalBillingRecord
  | PendedVisitProcedureRecord
  | PendedHospitalCareRecord
  | PendedReciprocalBillingRecord;

type DailyRecord =
  | DailyHeaderRecord
  | RejectedVisitProcedureRecord
  | RejectedHospitalCareRecord
  | RejectedCommentRecord
  | RejectedReciprocalBillingRecord
  | DailyTrailerRecord;

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract a substring from a line based on position (1-indexed)
 */
function extract(line: string, from: number, to: number): string {
  return line.substring(from - 1, to).trim();
}

/**
 * Parse a numeric field with implied decimal places
 */
function parseAmount(value: string, decimalPlaces: number = 2): number {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "" || trimmed === "-") return 0;

  // Handle negative values
  const isNegative = trimmed.startsWith("-");
  const absoluteValue = trimmed.replace("-", "").trim();

  const parsed = parseInt(absoluteValue, 10);
  if (isNaN(parsed)) return 0;

  const amount = parsed / Math.pow(10, decimalPlaces);
  return isNegative ? -amount : amount;
}

/**
 * Parse an integer field
 */
function parseIntField(value: string): number {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "") return 0;

  const parsed = Number.parseInt(trimmed, 10);
  return isNaN(parsed) ? 0 : parsed;
}

// ==================== BIWEEKLY FILE PARSERS ====================

/**
 * Parse a Paid Line record from a biweekly return file
 */
function parseBiweeklyPaidLine(line: string): BiweeklyPaidLineRecord {
  return {
    recordType: "P",
    mode: extract(line, 1, 1),
    practitionerNumber: extract(line, 2, 5),
    clinicNumber: extract(line, 6, 8),
    claimNumber: parseIntField(extract(line, 9, 13)),
    name: extract(line, 16, 34),
    healthServicesNumber: extract(line, 36, 44),
    claimSequenceNumber: parseIntField(extract(line, 51, 51)),
    dayOfService: extract(line, 53, 54),
    monthOfService: extract(line, 56, 57),
    yearOfService: extract(line, 59, 60),
    submittedNumberOfUnits: parseIntField(extract(line, 61, 62)),
    feeScheduleCodeSubmitted: extract(line, 64, 67),
    feeSubmitted: parseAmount(extract(line, 69, 75)),
    feeScheduleCodeApproved: extract(line, 77, 80),
    feeApproved: parseAmount(extract(line, 82, 88)),
    explanatoryCode: extract(line, 90, 91),
    corporationIndicator: extract(line, 95, 95),
    paymentRunCode: extract(line, 96, 97),
    formType: extract(line, 98, 98),
    totalPremiumAmount: parseAmount(extract(line, 99, 105)),
    programPayment: parseAmount(extract(line, 106, 112)),
    totalPaidAmount: parseAmount(extract(line, 113, 123)),
    explanatoryCode2: extract(line, 124, 125),
    explanatoryCode3: extract(line, 126, 127),
    paidNumberOfUnits: parseIntField(extract(line, 128, 130)),
    paidLocationOfService: extract(line, 131, 131),
    oopProvinceCode: extract(line, 132, 133),
    oopHSN: extract(line, 134, 145),
    originalRunCode: extract(line, 244, 245),
    cpsClaimNumber: extract(line, 246, 255),
  };
}

/**
 * Parse a Total Line record from a biweekly return file
 */
function parseBiweeklyTotalLine(line: string): BiweeklyTotalLineRecord {
  return {
    recordType: "T",
    mode: extract(line, 1, 1),
    practitionerNumber: extract(line, 2, 5),
    clinicNumber: extract(line, 6, 8),
    totalLineType: extract(line, 54, 63),
    feeSubmitted: parseAmount(extract(line, 65, 75)),
    feeApproved: parseAmount(extract(line, 78, 88)),
    corporationIndicator: extract(line, 95, 95),
    totalPremiumAmount: parseAmount(extract(line, 99, 109)),
    totalProgramPayment: parseAmount(extract(line, 110, 120)),
    totalPaidAmount: parseAmount(extract(line, 121, 131)),
    runCode: extract(line, 254, 255),
  };
}

/**
 * Parse a Message Line record from a biweekly return file
 */
function parseBiweeklyMessageLine(line: string): BiweeklyMessageLineRecord {
  return {
    recordType: "M",
    mode: extract(line, 1, 1),
    practitionerNumber: extract(line, 2, 5),
    clinicNumber: extract(line, 6, 8),
    message: extract(line, 15, 94),
    runCode: extract(line, 254, 255),
  };
}

/**
 * Parse a Rejected/Pended Visit and Procedure Service Record
 */
function parseRejectedVisitProcedure(
  line: string,
  status: "R" | "P"
): RejectedVisitProcedureRecord | PendedVisitProcedureRecord {
  return {
    recordType: "50",
    practitionerNumber: extract(line, 3, 6),
    claimNumber: parseIntField(extract(line, 7, 11)),
    claimSequenceNumber: parseIntField(extract(line, 12, 12)),
    healthServicesNumber: extract(line, 13, 21),
    dateOfBirth: extract(line, 22, 25),
    sex: extract(line, 26, 26),
    name: extract(line, 27, 51),
    diagnosticCode: extract(line, 52, 54),
    referringPractitionerNumber: extract(line, 55, 58),
    dateOfService: extract(line, 59, 64),
    numberOfUnits: parseIntField(extract(line, 65, 66)),
    locationOfService: extract(line, 67, 67),
    feeScheduleCodeSubmitted: extract(line, 68, 71),
    feeSubmitted: parseAmount(extract(line, 72, 77)),
    mode: extract(line, 78, 78),
    formType: extract(line, 79, 79),
    corporationIndicator: extract(line, 89, 89),
    explanatoryCode: extract(line, 90, 91),
    paymentRunCode: extract(line, 92, 93),
    clinicNumber: extract(line, 96, 98),
    status,
    explanatoryCode2: extract(line, 100, 101),
    explanatoryCode3: extract(line, 102, 103),
    originalRunCode: extract(line, 244, 245),
    cpsClaimNumber: extract(line, 246, 255),
  };
}

/**
 * Parse a Rejected/Pended Hospital Care Service Record
 */
function parseRejectedHospitalCare(
  line: string,
  status: "R" | "P"
): RejectedHospitalCareRecord | PendedHospitalCareRecord {
  return {
    recordType: "57",
    practitionerNumber: extract(line, 3, 6),
    claimNumber: parseIntField(extract(line, 7, 11)),
    claimSequenceNumber: parseIntField(extract(line, 12, 12)),
    healthServicesNumber: extract(line, 13, 21),
    dateOfBirth: extract(line, 22, 25),
    sex: extract(line, 26, 26),
    name: extract(line, 27, 51),
    diagnosticCode: extract(line, 52, 54),
    referringPractitionerNumber: extract(line, 55, 58),
    firstDateOfService: extract(line, 59, 64),
    lastDateOfService: extract(line, 65, 70),
    numberOfVisits: parseIntField(extract(line, 71, 72)),
    feeScheduleCodeSubmitted: extract(line, 73, 76),
    feeSubmitted: parseAmount(extract(line, 77, 82)),
    mode: extract(line, 83, 83),
    formType: extract(line, 84, 84),
    corporationIndicator: extract(line, 89, 89),
    paymentRunCode: extract(line, 92, 93),
    explanatoryCode: extract(line, 94, 95),
    clinicNumber: extract(line, 96, 98),
    status,
    explanatoryCode2: extract(line, 100, 101),
    explanatoryCode3: extract(line, 102, 103),
    originalRunCode: extract(line, 244, 245),
    cpsClaimNumber: extract(line, 246, 255),
  };
}

/**
 * Parse a Rejected Comment Record
 */
function parseRejectedComment(line: string): RejectedCommentRecord {
  return {
    recordType: "60",
    practitionerNumber: extract(line, 3, 6),
    claimNumber: parseIntField(extract(line, 7, 11)),
    lineNumber: parseIntField(extract(line, 12, 12)),
    healthServicesNumber: extract(line, 13, 21),
    comments: extract(line, 22, 95),
    clinicNumber: extract(line, 96, 98),
    originalRunCode: extract(line, 244, 245),
    cpsClaimNumber: extract(line, 246, 255),
  };
}

/**
 * Parse a Rejected/Pended Reciprocal Billing Record
 */
function parseRejectedReciprocalBilling(
  line: string
): RejectedReciprocalBillingRecord {
  return {
    recordType: "89",
    practitionerNumber: extract(line, 3, 6),
    claimNumber: parseIntField(extract(line, 7, 11)),
    claimSequenceNumber: parseIntField(extract(line, 12, 12)),
    province: extract(line, 22, 23),
    beneficiarySurname: extract(line, 24, 41),
    beneficiaryFirstName: extract(line, 42, 50),
    beneficiarySecondInitial: extract(line, 51, 51),
    outOfProvinceHSN: extract(line, 52, 63),
    clinicNumber: extract(line, 96, 98),
    originalRunCode: extract(line, 244, 245),
    cpsClaimNumber: extract(line, 246, 255),
  };
}

/**
 * Parse a single line from a biweekly return file
 */
function parseBiweeklyLine(line: string): BiweeklyRecord | null {
  if (line.length < 14) return null;

  const recordType = extract(line, 1, 2);
  const recordTypeChar = extract(line, 14, 14);

  // Paid, Total, or Message line
  if (recordTypeChar === "P") {
    return parseBiweeklyPaidLine(line);
  } else if (recordTypeChar === "T") {
    return parseBiweeklyTotalLine(line);
  } else if (recordTypeChar === "M") {
    return parseBiweeklyMessageLine(line);
  }

  // Service records based on record type number
  const status = line.length >= 99 ? extract(line, 99, 99) : "";

  switch (recordType) {
    case "50":
      return parseRejectedVisitProcedure(line, status as "R" | "P");
    case "57":
      return parseRejectedHospitalCare(line, status as "R" | "P");
    case "60":
      return parseRejectedComment(line);
    case "89":
      return parseRejectedReciprocalBilling(line);
    default:
      return null;
  }
}

/**
 * Parse the entire biweekly return file
 */
export function parseBiweeklyReturnFile(fileContent: string): BiweeklyRecord[] {
  const lines = fileContent.split("\n");
  const records: BiweeklyRecord[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) continue;

    const record = parseBiweeklyLine(line);
    if (record) {
      records.push(record);
    }
  }

  return records;
}

// ==================== DAILY FILE PARSERS ====================

/**
 * Parse a Header Record from a daily return file
 */
function parseDailyHeader(line: string): DailyHeaderRecord {
  return {
    recordType: "10",
    practitionerNumber: extract(line, 3, 6),
    groupNumber: extract(line, 7, 9),
    clinicNumber: extract(line, 13, 15),
    submissionType: extract(line, 97, 97),
    corporationIndicator: extract(line, 98, 98),
  };
}

/**
 * Parse a Trailer Record from a daily return file
 */
function parseDailyTrailer(line: string): DailyTrailerRecord {
  return {
    recordType: "90",
    practitionerNumber: extract(line, 3, 6),
    numberOfRecordsSubmitted: parseIntField(extract(line, 13, 17)),
    numberOfServiceRecordsSubmitted: parseIntField(extract(line, 18, 22)),
    totalDollarAmountSubmitted: parseAmount(extract(line, 23, 29)),
    runCode: extract(line, 97, 98),
  };
}

/**
 * Parse a single line from a daily return file
 */
function parseDailyLine(line: string): DailyRecord | null {
  if (line.length < 2) return null;

  const recordType = extract(line, 1, 2);
  const status = line.length >= 99 ? extract(line, 99, 99) : "R";

  switch (recordType) {
    case "10":
      return parseDailyHeader(line);
    case "50":
      return parseRejectedVisitProcedure(line, "R");
    case "57":
      return parseRejectedHospitalCare(line, "R");
    case "60":
      return parseRejectedComment(line);
    case "89":
      return parseRejectedReciprocalBilling(line);
    case "90":
      return parseDailyTrailer(line);
    default:
      return null;
  }
}

/**
 * Parse the entire daily return file
 */
export function parseDailyReturnFile(fileContent: string): DailyRecord[] {
  const lines = fileContent.split("\n");
  const records: DailyRecord[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) continue;

    const record = parseDailyLine(line);
    if (record) {
      records.push(record);
    }
  }

  return records;
}

// ==================== DATABASE STORAGE FUNCTIONS ====================

/**
 * Store biweekly return file records in the database
 */
export async function storeBiweeklyReturnFileRecords(
  records: BiweeklyRecord[],
  physicianId: string,
  providerId: number
): Promise<{
  paidCount: number;
  rejectedCount: number;
  pendedCount: number;
  totalCount: number;
  errors: string[];
}> {
  let paidCount = 0;
  let rejectedCount = 0;
  let pendedCount = 0;
  let totalCount = 0;
  const errors: string[] = [];

  for (const record of records) {
    try {
      if (record.recordType === "P") {
        // Paid Line Record
        await storePaidLineRecord(record, physicianId, providerId);
        paidCount++;
      } else if (record.recordType === "T") {
        // Total Line Record
        await storeTotalLineRecord(record, physicianId);
        totalCount++;
      } else if (record.recordType === "M") {
        // Message Line Record - could be logged or stored separately
        console.log(
          `Message for practitioner ${record.practitionerNumber}: ${record.message}`
        );
      } else if (
        record.recordType === "50" ||
        record.recordType === "57" ||
        record.recordType === "60" ||
        record.recordType === "89"
      ) {
        if ("status" in record) {
          if (record.status === "R") {
            await storeRejectedRecord(record, physicianId, providerId);
            rejectedCount++;
          } else if (record.status === "P") {
            await storePendedRecord(record, physicianId);
            pendedCount++;
          }
        } else {
          // Comment or reciprocal billing records
          await storeRejectedRecord(record, physicianId, providerId);
          rejectedCount++;
        }
      }
    } catch (error) {
      console.error(`Error storing record:`, error);
      errors.push(`Error storing ${record.recordType}: ${error}`);
    }
  }

  return {
    paidCount,
    rejectedCount,
    pendedCount,
    totalCount,
    errors,
  };
}

/**
 * Store daily return file records in the database
 */
export async function storeDailyReturnFileRecords(
  records: DailyRecord[],
  physicianId: string,
  providerId: number
): Promise<{
  rejectedCount: number;
  errors: string[];
}> {
  let rejectedCount = 0;
  const errors: string[] = [];

  for (const record of records) {
    try {
      if (record.recordType === "10" || record.recordType === "90") {
        // Header and Trailer records - could be used for validation
        continue;
      } else if (
        record.recordType === "50" ||
        record.recordType === "57" ||
        record.recordType === "60" ||
        record.recordType === "89"
      ) {
        await storeRejectedRecord(record, physicianId, providerId);
        rejectedCount++;
      }
    } catch (error) {
      console.error(`Error storing record:`, error);
      errors.push(`Error storing ${record.recordType}: ${error}`);
    }
  }

  return {
    rejectedCount,
    errors,
  };
}

/**
 * Store a Paid Line Record in the database
 */
async function storePaidLineRecord(
  record: BiweeklyPaidLineRecord,
  physicianId: string,
  providerId: number
): Promise<void> {
  // Find the service code by CPS claim number and claim sequence
  const serviceCode = await prisma.serviceCodes.findFirst({
    where: {
      cpsClaimNumber: parseIntField(record.cpsClaimNumber),
      sequence: record.claimSequenceNumber,
      claimNumber: record.claimNumber,
      service: {
        physicianId: physicianId,
      },
    },
  });

  if (!serviceCode) {
    throw new Error(
      `Service code not found for CPS claim ${record.cpsClaimNumber}, claim ${record.claimNumber}, sequence ${record.claimSequenceNumber}`
    );
  }

  // Find the approved billing code
  const approvedBillingCode = await prisma.billingCode.findFirst({
    where: {
      code: record.feeScheduleCodeApproved,
    },
  });

  // Update the service code with payment information
  await prisma.serviceCodes.update({
    where: { id: serviceCode.id },
    data: {
      approved: true,
      paymentRunCode: record.paymentRunCode,
      feeSubmitted: record.feeSubmitted,
      feeApproved: record.feeApproved,
      approvedBillingCodeId: approvedBillingCode?.id,
      totalPremiumAmount: record.totalPremiumAmount,
      programPayment: record.programPayment,
      totalPaidAmount: record.totalPaidAmount,
      paidNumberOfUnits: record.paidNumberOfUnits,
      paidLocationOfService: record.paidLocationOfService,
    },
  });

  // Store explanatory codes
  const explanatoryCodes = [
    record.explanatoryCode,
    record.explanatoryCode2,
    record.explanatoryCode3,
  ].filter((code) => code && code.trim() !== "");

  for (const code of explanatoryCodes) {
    await storeExplanatoryCode(serviceCode.id, code, providerId);
  }
}

/**
 * Store a Total Line Record in the database
 */
async function storeTotalLineRecord(
  record: BiweeklyTotalLineRecord,
  physicianId: string
): Promise<void> {
  // Find service codes for this practitioner and run code
  const serviceCodes = await prisma.serviceCodes.findMany({
    where: {
      paymentRunCode: record.runCode,
      service: {
        physicianId: physicianId,
      },
    },
  });

  if (serviceCodes.length === 0) {
    console.warn(
      `No service codes found for run code ${record.runCode} and practitioner ${record.practitionerNumber}`
    );
    return;
  }

  // Create a total record for each service code (or you could create one total for all)
  // For simplicity, we'll attach it to the first service code found
  const firstServiceCode = serviceCodes[0];

  await prisma.serviceCodesTotals.create({
    data: {
      serviceCodeId: firstServiceCode.id,
      mode: record.mode,
      totalLineType: record.totalLineType,
      feeSubmitted: record.feeSubmitted,
      feeApproved: record.feeApproved,
      totalPremiumAmount: record.totalPremiumAmount,
      totalProgramPayment: record.totalProgramPayment,
      totalPaidAmount: record.totalPaidAmount,
      runCode: record.runCode,
    },
  });
}

/**
 * Store a Rejected Record in the database
 */
async function storeRejectedRecord(
  record:
    | RejectedVisitProcedureRecord
    | RejectedHospitalCareRecord
    | RejectedCommentRecord
    | RejectedReciprocalBillingRecord,
  physicianId: string,
  providerId: number
): Promise<void> {
  if (record.recordType === "60") {
    // Comment record - could be stored in a separate table or logged
    console.log(`Comment for claim ${record.claimNumber}: ${record.comments}`);
    return;
  }

  if (record.recordType === "89") {
    // Reciprocal billing - could be handled separately
    console.log(`Reciprocal billing rejected for claim ${record.claimNumber}`);
    return;
  }

  // Find the service code by CPS claim number or claim number
  const serviceCode = await prisma.serviceCodes.findFirst({
    where: {
      OR: [
        {
          cpsClaimNumber: parseIntField(record.cpsClaimNumber),
          sequence: record.claimSequenceNumber,
        },
        {
          claimNumber: record.claimNumber,
          sequence: record.claimSequenceNumber,
        },
      ],
      service: {
        physicianId: physicianId,
      },
    },
  });

  if (!serviceCode) {
    throw new Error(
      `Service code not found for claim ${record.claimNumber}, sequence ${record.claimSequenceNumber}`
    );
  }

  // Update the service code to mark it as rejected
  await prisma.serviceCodes.update({
    where: { id: serviceCode.id },
    data: {
      approved: false,
      paymentRunCode: record.paymentRunCode,
    },
  });

  // Store explanatory codes
  const explanatoryCodes = [
    record.explanatoryCode,
    "explanatoryCode2" in record ? record.explanatoryCode2 : "",
    "explanatoryCode3" in record ? record.explanatoryCode3 : "",
  ].filter((code) => code && code.trim() !== "");

  for (const code of explanatoryCodes) {
    await storeExplanatoryCode(serviceCode.id, code, providerId);
  }
}

/**
 * Store a Pended Record in the database
 */
async function storePendedRecord(
  record: PendedVisitProcedureRecord | PendedHospitalCareRecord,
  physicianId: string
): Promise<void> {
  // Find the service code
  const serviceCode = await prisma.serviceCodes.findFirst({
    where: {
      OR: [
        {
          cpsClaimNumber: parseIntField(record.cpsClaimNumber),
          sequence: record.claimSequenceNumber,
        },
        {
          claimNumber: record.claimNumber,
          sequence: record.claimSequenceNumber,
        },
      ],
      service: {
        physicianId: physicianId,
      },
    },
  });

  if (!serviceCode) {
    throw new Error(
      `Service code not found for claim ${record.claimNumber}, sequence ${record.claimSequenceNumber}`
    );
  }

  // Update the service code to mark it as pending (null approved status)
  await prisma.serviceCodes.update({
    where: { id: serviceCode.id },
    data: {
      approved: null,
      paymentRunCode: record.paymentRunCode,
    },
  });

  // Update the service status to PENDING
  await prisma.service.update({
    where: { id: serviceCode.serviceId },
    data: {
      status: "PENDING",
    },
  });
}

/**
 * Store an Explanatory Code
 */
async function storeExplanatoryCode(
  serviceCodeId: number,
  code: string,
  providerId: number
): Promise<void> {
  // Find or create the explanatory code
  let explanatoryCode = await prisma.explanatoryCode.findFirst({
    where: {
      code: code,
      providerId: providerId,
    },
  });

  if (!explanatoryCode) {
    // Create a placeholder explanatory code
    // In a real implementation, you'd have a lookup table or API for explanatory codes
    explanatoryCode = await prisma.explanatoryCode.create({
      data: {
        code: code,
        title: `Explanatory Code ${code}`,
        explanation: `Explanatory code ${code} - please update with proper explanation`,
        providerId: providerId,
      },
    });
  }

  // Link the explanatory code to the service code
  await prisma.serviceCodeExplanatoryCode.upsert({
    where: {
      serviceCodeId_explanatoryCodeId: {
        serviceCodeId: serviceCodeId,
        explanatoryCodeId: explanatoryCode.id,
      },
    },
    create: {
      serviceCodeId: serviceCodeId,
      explanatoryCodeId: explanatoryCode.id,
    },
    update: {},
  });
}
