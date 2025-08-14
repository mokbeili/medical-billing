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

  // Parse patient data from extracted text with support for multiple formats
  parsePatientData(text: string): PatientData | null {
    try {
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Extract billing number - look for 9 digits pattern (999 999 999)
      let billingNumber = "";
      for (const line of lines) {
        // Look for 3 groups of 3 digits separated by spaces
        const billingMatch = line.match(/^(\d{3})\s+(\d{3})\s+(\d{3})/);
        if (billingMatch) {
          billingNumber = billingMatch[1] + billingMatch[2] + billingMatch[3];
          break;
        }
      }

      // Extract visit number - look for V# pattern or V pattern
      let visitNumber = "";
      for (const line of lines) {
        // Pattern 1: V#12345678
        const visitMatch1 = line.match(/V#(\d+)/);
        if (visitMatch1) {
          visitNumber = visitMatch1[1];
          break;
        }

        // Pattern 2: V12345678 (without #)
        const visitMatch2 = line.match(/V(\d+)/);
        if (visitMatch2) {
          visitNumber = visitMatch2[1];
          break;
        }
      }

      // Extract patient name - look for LAST, FIRST [MIDDLE] pattern
      let firstName = "";
      let lastName = "";
      let middleInitial = "";

      for (const line of lines) {
        // Pattern: LAST, FIRST [MIDDLE] - handle full middle names, not just initials
        // Use word boundaries to properly separate names
        const nameMatch = line.match(/^([A-Z]+),\s*([A-Z]+)(?:\s+([A-Z]+))?$/);
        if (nameMatch) {
          lastName = nameMatch[1].trim();
          firstName = nameMatch[2].trim();
          middleInitial = nameMatch[3] || "";
          break;
        }
      }

      // If no name found with comma pattern, look for other patterns
      if (!firstName || !lastName) {
        for (const line of lines) {
          // Pattern: LAST FIRST [MIDDLE] (without comma) - more flexible
          const nameMatch2 = line.match(
            /^([A-Z]+)\s+([A-Z]+)(?:\s+([A-Z]+))?$/
          );
          if (nameMatch2) {
            lastName = nameMatch2[1].trim();
            firstName = nameMatch2[2].trim();
            middleInitial = nameMatch2[3] || "";
            break;
          }
        }
      }

      // Extract date of birth - look for various date formats
      let dateOfBirth = "";
      for (const line of lines) {
        // Look for lines that contain age information (like "74y") as these are likely birth dates
        if (line.includes("y") || line.includes("Y")) {
          // Pattern: MMM-DD-YYYY or MMM-DD-YY - Month-Day-Year format
          const dobMatch = line.match(/([A-Za-z]{3,4})-(\d{1,2})-(\d{2,4})/);
          if (dobMatch) {
            const month = dobMatch[1].toUpperCase();
            const day = dobMatch[2].padStart(2, "0");
            let year = dobMatch[3];

            // Convert month abbreviation to number
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

            const monthNum = monthMap[month];
            if (monthNum) {
              // Handle 2-digit years
              if (year.length === 2) {
                year = parseInt(year) < 50 ? "20" + year : "19" + year;
              }
              dateOfBirth = `${year}-${monthNum}-${day}`;
              break;
            }
          }
        }
      }

      // Extract gender - look for M or F
      let gender = "";
      for (const line of lines) {
        const genderMatch = line.match(/\b([MF])\b/);
        if (genderMatch) {
          gender = genderMatch[1];
          break;
        }
      }

      // Extract service date - look for various patterns
      let serviceDate: string | undefined;

      // Pattern 1: ADM: MMM-DD-YYYY
      for (const line of lines) {
        const admMatch = line.match(
          /ADM:\s*([A-Za-z]{3,4})-(\d{1,2})-(\d{2,4})/
        );
        if (admMatch) {
          const month = admMatch[1].toUpperCase();
          const day = admMatch[2].padStart(2, "0");
          let year = admMatch[3];

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

          const monthNum = monthMap[month];
          if (monthNum) {
            if (year.length === 2) {
              year = parseInt(year) < 50 ? "20" + year : "19" + year;
            }
            serviceDate = `${year}-${monthNum}-${day}`;
            break;
          }
        }
      }

      // Pattern 2: Admin Date: MMM-DD-YYYY
      if (!serviceDate) {
        for (const line of lines) {
          const adminMatch = line.match(
            /Admin Date:\s*([A-Za-z]{3,4})-(\d{1,2})-(\d{2,4})/
          );
          if (adminMatch) {
            const month = adminMatch[1].toUpperCase();
            const day = adminMatch[2].padStart(2, "0");
            let year = adminMatch[3];

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

            const monthNum = monthMap[month];
            if (monthNum) {
              if (year.length === 2) {
                year = parseInt(year) < 50 ? "20" + year : "19" + year;
              }
              serviceDate = `${year}-${monthNum}-${day}`;
              break;
            }
          }
        }
      }

      // Pattern 3: Admit Date: MMM-DD-YYYY - look for the pattern anywhere in the line
      if (!serviceDate) {
        for (const line of lines) {
          // Look for "Admit Date:" followed by the date pattern anywhere in the line
          const admitMatch = line.match(
            /Admit Date:.*?([A-Za-z]{3,4})-(\d{1,2})-(\d{2,4})/
          );
          if (admitMatch) {
            const month = admitMatch[1].toUpperCase();
            const day = admitMatch[2].padStart(2, "0");
            let year = admitMatch[3];

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

            const monthNum = monthMap[month];
            if (monthNum) {
              if (year.length === 2) {
                year = parseInt(year) < 50 ? "20" + year : "19" + year;
              }
              serviceDate = `${year}-${monthNum}-${day}`;
              break;
            }
          }
        }
      }

      // Extract attending physician
      let attendingPhysician = "";
      let hasEmptyAtn = false; // Track if we found an empty ATN field

      for (const line of lines) {
        // Check for empty ATN field first
        if (line.trim() === "ATN:" || line.match(/^ATN:\s*$/)) {
          hasEmptyAtn = true;
          continue;
        }

        // Pattern 1: ATN: NAME (only if there's actually a name)
        const atnMatch = line.match(/ATN:\s*(.+)/);
        if (atnMatch && atnMatch[1].trim()) {
          attendingPhysician = atnMatch[1].trim();
          break;
        }

        // Pattern 2: UNASSIGNED, PHYSICIAN (only if not already found and no empty ATN)
        if (
          !attendingPhysician &&
          !hasEmptyAtn &&
          line.includes("UNASSIGNED") &&
          line.includes(",")
        ) {
          const parts = line.split(",");
          if (parts.length > 1) {
            attendingPhysician = parts[1].trim();
            break;
          }
        }
      }

      // If we found an empty ATN field, don't set a default attending physician
      if (hasEmptyAtn && !attendingPhysician) {
        // No attending physician assigned
      }

      // Extract family physician
      let familyPhysician = "";
      for (const line of lines) {
        // Pattern 1: FAM: NAME
        const famMatch1 = line.match(/FAM:\s*(.+)/);
        if (famMatch1) {
          familyPhysician = famMatch1[1].trim();
          break;
        }

        // Pattern 2: FAM NAME (without colon)
        const famMatch2 = line.match(/FAM\s+(.+)/);
        if (famMatch2) {
          familyPhysician = famMatch2[1].trim();
          break;
        }
      }

      // Clean up physician names - remove common prefixes and suffixes
      if (attendingPhysician) {
        attendingPhysician = attendingPhysician
          .replace(/^(DR\.|DR|DOCTOR|PHYSICIAN)\s*/i, "")
          .trim();
      }
      if (familyPhysician) {
        familyPhysician = familyPhysician
          .replace(/^(DR\.|DR|DOCTOR|PHYSICIAN)\s*/i, "")
          .trim();
      }

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
