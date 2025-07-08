type PractitionerHeader = {
  practitionerNumber: string;
  groupNumber: string;
  clinicNumber: string;
  name: string;
  address: string;
  cityProvince: string;
  postalCode: string;
  corporationIndicator: string;
};

type ServiceRecord = {
  claimNumber: number;
  sequence: number;
  hsn: string;
  dob: string; // MMYY
  sex: "M" | "F";
  name: string; // "LAST,FIRST"
  diagnosticCode: string;
  refPractitioner?: string;
  dateOfService: string; // DDMMYY
  lastServiceDate?: string; // DDMMYY
  units: string;
  locationOfService: string;
  feeCode: string;
  feeCents: number;
  mode: string;
  formType: "8" | "E";
  specialCircumstances?: string;
  bilateral?: "L" | "R" | "B";
  startTime?: string;
  stopTime?: string;
  facilityNumber?: string;
  claimType?: string;
  serviceLocation?: string;
  billingRecordType: "50" | "57";
};

function pad(
  value: string | number,
  length: number,
  align: "left" | "right" = "right"
): string {
  const str = value.toString();
  return (
    align === "left" ? str.padEnd(length) : str.padStart(length, "0")
  ).slice(0, length);
}

function formatHeader(p: PractitionerHeader): string {
  return (
    "10" +
    pad(p.practitionerNumber, 4) +
    pad(p.groupNumber, 3) +
    "000" + // filler
    pad(p.clinicNumber, 3) +
    pad(p.name.toUpperCase(), 25, "left") +
    pad(p.address.toUpperCase(), 25, "left") +
    pad(p.cityProvince.toUpperCase(), 25, "left") +
    p.postalCode.replace(/\s+/g, "").toUpperCase().padEnd(6) +
    "8" + // submission type
    (p.corporationIndicator || " ")
  );
}

function formatService50(practitionerNumber: string, s: ServiceRecord): string {
  return (
    s.billingRecordType +
    pad(practitionerNumber, 4) +
    pad(s.claimNumber, 5) +
    s.sequence.toString() +
    pad(s.hsn, 9) +
    s.dob +
    s.sex +
    pad(s.name.toUpperCase(), 25, "left") +
    pad(s.diagnosticCode, 3) +
    pad(s.refPractitioner || "", 4) +
    s.dateOfService +
    pad(s.units, 2) +
    s.locationOfService +
    pad(s.feeCode, 4) +
    pad(s.feeCents, 6) +
    s.mode +
    s.formType +
    pad(s.specialCircumstances || "", 2) +
    (s.bilateral || " ") +
    (s.startTime || "    ") +
    (s.stopTime || "    ") +
    pad(s.facilityNumber || "", 5) +
    (s.claimType || " ") +
    (s.serviceLocation || " ") +
    " "
  );
}

function formatService57(practitionerNumber: string, s: ServiceRecord): string {
  return (
    s.billingRecordType +
    pad(practitionerNumber, 4) +
    pad(s.claimNumber, 5) +
    s.sequence.toString() +
    pad(s.hsn, 9) +
    s.dob +
    s.sex +
    pad(s.name.toUpperCase(), 25, "left") +
    pad(s.diagnosticCode, 3) +
    pad(s.refPractitioner || "", 4) +
    s.dateOfService +
    s.lastServiceDate +
    pad(s.units, 2) +
    pad(s.feeCode, 4) +
    pad(s.feeCents, 6) +
    s.mode +
    s.formType +
    pad(s.specialCircumstances || "", 2) +
    pad(s.facilityNumber || "", 5) +
    (s.claimType || " ") +
    (s.serviceLocation || " ") +
    " "
  );
}

function formatTrailer(
  practitionerNumber: string,
  totalRecords: number,
  totalServiceRecords: number,
  totalCents: number
): string {
  return (
    "90" +
    pad(practitionerNumber, 4) +
    "999999" +
    pad(totalRecords, 5) +
    pad(totalServiceRecords, 5) +
    pad(totalCents, 7) +
    "".padEnd(69)
  );
}

export function generateClaimBatch(
  practitioner: PractitionerHeader,
  serviceRecords: ServiceRecord[]
): string {
  const header = formatHeader(practitioner);

  const serviceLines = serviceRecords.map((s) =>
    s.billingRecordType === "50"
      ? formatService50(practitioner.practitionerNumber, s)
      : formatService57(practitioner.practitionerNumber, s)
  );

  const trailer = formatTrailer(
    practitioner.practitionerNumber,
    2 + serviceRecords.length, // header + services + trailer
    serviceRecords.length,
    serviceRecords.reduce((sum, r) => sum + r.feeCents, 0)
  );

  const allLines = [header, ...serviceLines, trailer].map(
    (line) => line + "\r\n"
  );
  return allLines.join("");
}
