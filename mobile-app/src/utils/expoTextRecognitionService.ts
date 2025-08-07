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
  dateOfBirth: string;
  gender: string;
  serviceDate?: string;
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
      console.error("Text recognition error:", error);
      throw new Error("Failed to extract text from image. Please try again.");
    }
  }

  // Parse patient data from extracted text (same logic as AWS Textract)
  parsePatientData(text: string): PatientData | null {
    try {
      const lines = text.split("\n").map((line) => line.trim());

      // Extract billing number (SK# followed by 9 digits)
      const skLine = lines.find((line) => line.includes("SK#"));
      const billingNumberMatch = skLine?.match(/SK#\s*(\d{9})/);
      const billingNumber = billingNumberMatch?.[1] || "";

      // Find the line with MRN and get the name from the next line
      const mrnIndex = lines.findIndex((line) => line.includes("MRN:"));
      let firstName = "";
      let lastName = "";

      if (mrnIndex !== -1 && mrnIndex + 1 < lines.length) {
        const nameLine = lines[mrnIndex + 1];
        // Parse name in format "LASTNAME, FIRSTNAME"
        const nameMatch = nameLine.match(/^([^,]+),\s*([^,\s]+)/);
        if (nameMatch) {
          lastName = nameMatch[1].trim();
          firstName = nameMatch[2].trim();
        }
      }

      // If we didn't find the name after MRN, look for it in the format "LASTNAME, FIRSTNAME" anywhere
      if (!firstName || !lastName) {
        for (const line of lines) {
          const nameMatch = line.match(/^([^,]+),\s*([^,\s]+)$/);
          if (nameMatch) {
            lastName = nameMatch[1].trim();
            firstName = nameMatch[2].trim();
            break;
          }
        }
      }

      // Find date of birth and gender
      let dateOfBirth = "";
      let gender = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for date pattern DD-MMM-YYYY
        const dobMatch = line.match(/^(\d{2})-([A-Z]{3})-(\d{4})$/);
        if (dobMatch) {
          const day = dobMatch[1];
          const month = dobMatch[2];
          const year = dobMatch[3];

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
            dateOfBirth = `${year}-${monthNum}-${day}`;
          }

          // Look for gender on the next line or the same line
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const genderMatch = nextLine.match(/^([MF])$/);
            if (genderMatch) {
              gender = genderMatch[1];
            }
          } else {
            // Fallback: try to find gender on the same line
            const genderMatch = line.match(/\b([MF])\b/);
            if (genderMatch) {
              gender = genderMatch[1];
            }
          }
          break;
        }
      }

      // If we still don't have gender, look for it anywhere
      if (!gender) {
        for (const line of lines) {
          const genderMatch = line.match(/^([MF])$/);
          if (genderMatch) {
            gender = genderMatch[1];
            break;
          }
        }
      }

      // Find admit date (Admit Date: DD-MMM-YYYY)
      let serviceDate: string | undefined;
      const admitLine = lines.find((line) => line.includes("Admit Date:"));
      if (admitLine) {
        const admitMatch = admitLine.match(
          /Admit Date:\s*(\d{2})-([A-Z]{3})-(\d{4})/
        );
        if (admitMatch) {
          const day = admitMatch[1];
          const month = admitMatch[2];
          const year = admitMatch[3];

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
            serviceDate = `${year}-${monthNum}-${day}`;
          }
        }
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
        dateOfBirth,
        gender,
        serviceDate,
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
