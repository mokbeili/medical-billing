import * as TextRecognition from "expo-text-recognition";

// Text Recognition Service using expo-text-recognition
export interface TextRecognitionResult {
  text: string;
  confidence: number;
  blocks: any[];
}

export interface PatientData {
  billingNumber: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  dateOfBirth: string;
  gender: string;
  serviceDate?: string;
  visitNumber?: string;
  mrn?: string;
  attendingPhysician?: string;
  familyPhysician?: string;
}

export class ExpoTextRecognitionService {
  private isConfigured: boolean = true; // Always configured since it's local

  constructor() {
    // No configuration needed for expo-text-recognition
  }

  // Extract text using expo-text-recognition
  async extractText(imageUri: string): Promise<TextRecognitionResult> {
    try {
      // Use expo-text-recognition to extract text from image
      const textLines = await TextRecognition.getTextFromFrame(imageUri);

      if (!textLines || textLines.length === 0) {
        throw new Error("No text detected in the image");
      }

      // Join all text lines into a single string
      const extractedText = textLines.join("\n");

      // Calculate average confidence (expo-text-recognition doesn't provide confidence per block)
      // We'll use a default confidence of 0.8 since it's generally reliable
      const confidence = 0.8;

      // Create blocks structure similar to AWS Textract for compatibility
      const blocks = textLines.map((text, index) => ({
        Text: text,
        Confidence: 80,
        BlockType: "LINE",
        Id: index,
      }));

      return {
        text: extractedText,
        confidence: confidence,
        blocks: blocks,
      };
    } catch (error) {
      throw new Error("Failed to extract text from image. Please try again.");
    }
  }

  // Parse patient data from extracted text with support for 4 specific formats
  parsePatientData(text: string): PatientData | null {
    try {
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Helper function to convert month abbreviation to number
      const monthMap: { [key: string]: string } = {
        JAN: "01",
        FEB: "02",
        MAR: "03",
        APR: "04",
        MAY: "05",
        JUN: "06",
        JUL: "07",
        AUG: "08",
        SEP: "09",
        OCT: "10",
        NOV: "11",
        DEC: "12",
      };

      // Helper function to fix common OCR errors in month names
      const fixOCRMonthErrors = (monthStr: string): string => {
        // Replace common OCR errors
        return monthStr
          .replace(/^0CT$/i, "OCT") // 0CT -> OCT
          .replace(/^0EC$/i, "DEC") // 0EC -> DEC
          .replace(/^N0V$/i, "NOV") // N0V -> NOV
          .replace(/^MAY$/i, "MAY") // MAY is fine
          .replace(/^JUN$/i, "JUN") // JUN is fine
          .replace(/^JUL$/i, "JUL") // JUL is fine
          .replace(/^AU6$/i, "AUG") // AU6 -> AUG
          .replace(/^5EP$/i, "SEP") // 5EP -> SEP
          .replace(/^FE8$/i, "FEB") // FE8 -> FEB
          .toUpperCase();
      };

      // Helper function to parse date formats
      const parseDate = (dateStr: string): string => {
        // MMM-DD-YYYY format
        let match = dateStr.match(/([A-Za-z0-9]{3,4})-(\d{1,2})-(\d{2,4})/);
        if (match) {
          const fixedMonth = fixOCRMonthErrors(match[1]);
          const month = monthMap[fixedMonth];
          if (month) {
            const day = match[2].padStart(2, "0");
            let year = match[3];
            if (year.length === 2) {
              year = parseInt(year) < 50 ? "20" + year : "19" + year;
            }
            return `${year}-${month}-${day}`;
          }
        }

        // DD-MMM-YYYY format
        match = dateStr.match(/(\d{1,2})-([A-Za-z0-9]{3,4})-(\d{2,4})/);
        if (match) {
          const fixedMonth = fixOCRMonthErrors(match[2]);
          const month = monthMap[fixedMonth];
          if (month) {
            const day = match[1].padStart(2, "0");
            let year = match[3];
            if (year.length === 2) {
              year = parseInt(year) < 50 ? "20" + year : "19" + year;
            }
            return `${year}-${month}-${day}`;
          }
        }

        return "";
      };

      // Helper function to clean physician names
      const cleanPhysicianName = (name: string): string => {
        return name.replace(/^(DR\.|DR|DOCTOR|PHYSICIAN)\s*/i, "").trim();
      };

      // Initialize result variables
      let billingNumber = "";
      let firstName = "";
      let lastName = "";
      let middleInitial = "";
      let dateOfBirth = "";
      let gender = "";
      let serviceDate: string | undefined;
      let visitNumber: string | undefined;
      let mrn: string | undefined;
      let attendingPhysician: string | undefined;
      let familyPhysician: string | undefined;

      // Helper function to extract 9-digit billing number from various formats
      const extractBillingNumber = (lines: string[]): string => {
        // First pass: look for labeled formats
        for (const line of lines) {
          // Pattern 1: SK# 790112233 (with space)
          let match = line.match(/SK#\s+(\d{9})/);
          if (match) {
            return match[1];
          }

          // Pattern 2: SK#790112233 (without space)
          match = line.match(/SK#(\d{9})/);
          if (match) {
            return match[1];
          }

          // Pattern 2: HSN: 123456789
          match = line.match(/HSN:\s*(\d{9})/);
          if (match) {
            return match[1];
          }

          // Pattern 3: Health Services Number: 123456789
          match = line.match(/Health Services Number:\s*(\d{9})/);
          if (match) {
            return match[1];
          }
        }

        // Second pass: look for 999 999 999 format (with spaces)
        for (const line of lines) {
          const match = line.match(/^(\d{3})\s+(\d{3})\s+(\d{3})/);
          if (match) {
            return match[1] + match[2] + match[3];
          }
        }

        // Third pass: look for any 9-digit number anywhere in the text
        for (const line of lines) {
          const match = line.match(/(\d{9})/);
          if (match) {
            return match[1];
          }
        }

        return "";
      };

      // Helper function to extract visit number
      const extractVisitNumber = (lines: string[]): string => {
        // First pass: look for V# format (higher priority)
        for (const line of lines) {
          // Pattern 1: V# 4433221100 (with space)
          let match = line.match(/V#\s+(\d+)/);
          if (match) {
            return match[1];
          }

          // Pattern 2: V#4433221100 (without space)
          match = line.match(/V#(\d+)/);
          if (match) {
            return match[1];
          }
        }

        // Second pass: look for Visit # format
        for (const line of lines) {
          // Pattern 1: Visit # 12345678
          let match = line.match(/Visit #\s*(\d+)/);
          if (match) {
            return match[1];
          }

          // Pattern 2: Visit #12345678 (no space)
          match = line.match(/Visit #(\d+)/);
          if (match) {
            return match[1];
          }
        }
        return "";
      };

      // Helper function to extract MRN (Medical Record Number)
      const extractMRN = (lines: string[]): string => {
        for (const line of lines) {
          // Pattern 1: MRN: 0123456
          let match = line.match(/MRN:\s*(\d+)/);
          if (match) {
            return match[1];
          }

          // Pattern 2: Medical Record Number: 0123456
          match = line.match(/Medical Record Number:\s*(\d+)/);
          if (match) {
            return match[1];
          }

          // Pattern 3: Patient ID: 0123456
          match = line.match(/Patient ID:\s*(\d+)/);
          if (match) {
            return match[1];
          }
        }
        return "";
      };

      // Helper function to extract admit date
      const extractAdmitDate = (lines: string[]): string => {
        for (const line of lines) {
          // Pattern 1: Admit Date: 15-FEB-2025
          let match = line.match(/Admit Date:\s*([A-Za-z0-9-]+)/);
          if (match) {
            const parsed = parseDate(match[1]);
            if (parsed) return parsed;
          }

          // Pattern 2: ADM: 15-FEB-2025
          match = line.match(/ADM:\s*([A-Za-z0-9-]+)/);
          if (match) {
            const parsed = parseDate(match[1]);
            if (parsed) return parsed;
          }
        }
        return "";
      };

      // Helper function to extract patient name (LAST, FIRST MIDDLE format)
      const extractPatientName = (
        lines: string[]
      ): { firstName: string; lastName: string; middleInitial: string } => {
        // Look for patient name patterns, prioritizing those that don't contain common medical terms
        for (const line of lines) {
          // Look for LAST, FIRST MIDDLE pattern (unlabeled)
          const nameMatch = line.match(
            /^([A-Z]+),\s*([A-Z]+)(?:\s+([A-Z]+))?$/
          );
          if (nameMatch) {
            const lastName = nameMatch[1].trim();
            const firstName = nameMatch[2].trim();
            const middleInitial = nameMatch[3] || "";

            // Skip if this contains 'PHYSICIAN' anywhere in the name
            if (
              lastName.includes("PHYSICIAN") ||
              firstName.includes("PHYSICIAN") ||
              middleInitial.includes("PHYSICIAN")
            ) {
              continue;
            }

            // Skip other common medical terms
            const medicalTerms = [
              "UNASSIGNED",
              "DOCTOR",
              "DR",
              "NURSE",
              "TECH",
              "TECHNICIAN",
            ];
            if (
              medicalTerms.some(
                (term) =>
                  lastName.includes(term) ||
                  firstName.includes(term) ||
                  middleInitial.includes(term)
              )
            ) {
              continue;
            }

            return {
              lastName,
              firstName,
              middleInitial,
            };
          }
        }

        // If no clean name found, try to find the last occurrence (often the patient name is at the bottom)
        for (let i = lines.length - 1; i >= 0; i--) {
          const nameMatch = lines[i].match(
            /^([A-Z]+),\s*([A-Z]+)(?:\s+([A-Z]+))?$/
          );
          if (nameMatch) {
            const lastName = nameMatch[1].trim();
            const firstName = nameMatch[2].trim();
            const middleInitial = nameMatch[3] || "";

            // Skip if this contains 'PHYSICIAN' anywhere in the name
            if (
              lastName.includes("PHYSICIAN") ||
              firstName.includes("PHYSICIAN") ||
              middleInitial.includes("PHYSICIAN")
            ) {
              continue;
            }

            // Skip other common medical terms
            const medicalTerms = [
              "UNASSIGNED",
              "DOCTOR",
              "DR",
              "NURSE",
              "TECH",
              "TECHNICIAN",
            ];
            if (
              medicalTerms.some(
                (term) =>
                  lastName.includes(term) ||
                  firstName.includes(term) ||
                  middleInitial.includes(term)
              )
            ) {
              continue;
            }

            return {
              lastName,
              firstName,
              middleInitial,
            };
          }
        }

        return { firstName: "", lastName: "", middleInitial: "" };
      };

      // Helper function to extract physician names (attending and family)
      const extractPhysicians = (
        lines: string[]
      ): { attending: string; family: string } => {
        let attending = "";
        let family = "";

        for (const line of lines) {
          // ATN: last, first
          let match = line.match(/ATN:\s*(.+)/);
          if (match) {
            attending = cleanPhysicianName(match[1].trim());
            continue;
          }

          // FAM: last, first
          match = line.match(/FAM:\s*(.+)/);
          if (match) {
            family = cleanPhysicianName(match[1].trim());
            continue;
          }

          // PCP: last, first
          match = line.match(/PCP:\s*(.+)/);
          if (match) {
            family = cleanPhysicianName(match[1].trim());
            continue;
          }
        }

        // If no labeled physicians found, try to find unlabeled ones
        // Look at the last 2-3 lines for potential physician names
        if (!attending && !family) {
          const lastLines = lines.slice(-3);
          for (const line of lastLines) {
            // Look for "Last, First" pattern that might be a physician
            const nameMatch = line.match(/^([A-Z]+),\s*([A-Z]+)$/);
            if (nameMatch && !attending) {
              attending = `${nameMatch[2]} ${nameMatch[1]}`;
            } else if (nameMatch && attending && !family) {
              family = `${nameMatch[2]} ${nameMatch[1]}`;
            }
          }
        }

        return { attending, family };
      };

      // Extract all data using flexible helpers (order-independent parsing)
      billingNumber = extractBillingNumber(lines);

      // Extract patient name using flexible helper
      const patientName = extractPatientName(lines);
      firstName = patientName.firstName;
      lastName = patientName.lastName;
      middleInitial = patientName.middleInitial;

      // Extract all dates first, then determine which is DOB vs Admit Date
      const allDates: { date: string; line: string; isLabeled: boolean }[] = [];

      for (const line of lines) {
        // Look for DOB in various formats
        if (line.includes("DOB:")) {
          const dobMatch = line.match(/DOB:\s*([A-Za-z0-9-]+)/);
          if (dobMatch) {
            const parsed = parseDate(dobMatch[1]);
            if (parsed) {
              allDates.push({ date: parsed, line, isLabeled: true });
            }
          }
        }
        // Look for Admit Date patterns
        else if (line.includes("Admit Date:") || line.includes("ADM:")) {
          const admitMatch = line.match(
            /(?:Admit Date:|ADM:)\s*([A-Za-z0-9-]+)/
          );
          if (admitMatch) {
            const parsed = parseDate(admitMatch[1]);
            if (parsed) {
              allDates.push({ date: parsed, line, isLabeled: true });
            }
          }
        }
        // Look for unlabeled date patterns
        else if (
          line.match(/([A-Za-z]{3,4}-\d{1,2}-\d{2,4})/) ||
          line.match(/(\d{1,2}-[A-Za-z]{3,4}-\d{2,4})/)
        ) {
          const dateMatch = line.match(/([A-Za-z0-9-]+)/);
          if (dateMatch) {
            const parsed = parseDate(dateMatch[1]);
            if (parsed) {
              allDates.push({ date: parsed, line, isLabeled: false });
            }
          }
        }
      }

      // Sort dates by recency (most recent first)
      allDates.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Assign dates based on recency and labels
      if (allDates.length >= 2) {
        // Two or more dates found - most recent is admit date, oldest is DOB
        serviceDate = allDates[0].date; // Most recent
        dateOfBirth = allDates[allDates.length - 1].date; // Oldest
      } else if (allDates.length === 1) {
        // Only one date found - check if it's labeled
        const dateInfo = allDates[0];
        if (dateInfo.isLabeled) {
          if (dateInfo.line.includes("DOB:")) {
            dateOfBirth = dateInfo.date;
          } else if (
            dateInfo.line.includes("Admit Date:") ||
            dateInfo.line.includes("ADM:")
          ) {
            serviceDate = dateInfo.date;
          } else {
            // Labeled but unclear - assume it's DOB if it's old, admit date if recent
            const dateYear = new Date(dateInfo.date).getFullYear();
            const currentYear = new Date().getFullYear();
            if (dateYear < currentYear - 10) {
              dateOfBirth = dateInfo.date; // Likely a birth year
            } else {
              serviceDate = dateInfo.date; // Likely a recent admit date
            }
          }
        } else {
          // Unlabeled single date - make educated guess based on year
          const dateYear = new Date(dateInfo.date).getFullYear();
          const currentYear = new Date().getFullYear();
          if (dateYear < currentYear - 10) {
            dateOfBirth = dateInfo.date; // Likely a birth year
          } else {
            serviceDate = dateInfo.date; // Likely a recent admit date
          }
        }
      }

      // Extract Sex from any line
      for (const line of lines) {
        // Look for explicit Sex: label
        let sexMatch = line.match(/Sex[:\s]*([MF])/);
        if (sexMatch) {
          gender = sexMatch[1];
          break;
        }

        // Look for M or F at the end of a line (common pattern)
        sexMatch = line.match(/\s+([MF])$/);
        if (sexMatch) {
          gender = sexMatch[1];
          break;
        }
      }

      // Extract other fields using helpers
      visitNumber = extractVisitNumber(lines);
      mrn = extractMRN(lines);

      // Extract admit date
      serviceDate = extractAdmitDate(lines);

      const physicians = extractPhysicians(lines);
      attendingPhysician = physicians.attending;
      familyPhysician = physicians.family;

      // Validate that we have the essential information

      if (
        !billingNumber ||
        !firstName ||
        !lastName ||
        !dateOfBirth ||
        !gender
      ) {
        return null;
      }

      return {
        billingNumber,
        firstName,
        lastName,
        middleInitial,
        dateOfBirth,
        gender,
        serviceDate,
        visitNumber,
        mrn,
        attendingPhysician,
        familyPhysician,
      };
    } catch (error) {
      return null;
    }
  }

  // Check if service is configured (always true for expo-text-recognition)
  get configured(): boolean {
    return this.isConfigured;
  }
}

// Create singleton instance
export const textRecognitionService = new ExpoTextRecognitionService();

export default textRecognitionService;
