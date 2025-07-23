import AsyncStorage from "@react-native-async-storage/async-storage";
import CryptoJS from "crypto-js";
import * as Constants from "expo-constants";
import { Platform } from "react-native";

// AWS Textract Service for OCR functionality
export interface TextractResult {
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

export class AWSTextractService {
  private accessKeyId: string = "";
  private secretAccessKey: string = "";
  private region: string = "us-east-1";
  private isConfigured: boolean = false;

  constructor() {
    // Try to load configuration from environment variables first, then AsyncStorage
    this.loadConfiguration();
  }

  // Load configuration from environment variables or AsyncStorage
  private async loadConfiguration() {
    try {
      // First, try to load from environment variables
      const envConfig = (Constants as any).expoConfig?.extra;

      if (
        envConfig?.awsConfigured &&
        envConfig?.awsAccessKeyId &&
        envConfig?.awsSecretAccessKey
      ) {
        // Use environment variables
        this.accessKeyId = envConfig.awsAccessKeyId;
        this.secretAccessKey = envConfig.awsSecretAccessKey;
        this.region = envConfig.awsRegion || "us-east-1";
        this.isConfigured = true;
        console.log("AWS Textract configured from environment variables");
        return;
      }

      // Fallback to AsyncStorage if environment variables are not set
      const accessKeyId = await AsyncStorage.getItem("aws_access_key_id");
      const secretAccessKey = await AsyncStorage.getItem(
        "aws_secret_access_key"
      );
      const region = await AsyncStorage.getItem("aws_region");
      const configured = await AsyncStorage.getItem("aws_configured");

      if (accessKeyId && secretAccessKey && configured === "true") {
        this.accessKeyId = accessKeyId;
        this.secretAccessKey = secretAccessKey;
        this.region = region || "us-east-1";
        this.isConfigured = true;
        console.log("AWS Textract configured from AsyncStorage");
      }
    } catch (error) {
      console.error("Error loading AWS configuration:", error);
    }
  }

  // Configure AWS credentials
  configure(credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region?: string;
  }) {
    this.accessKeyId = credentials.accessKeyId;
    this.secretAccessKey = credentials.secretAccessKey;
    this.region = credentials.region || "us-east-1";
    this.isConfigured = true;
  }

  // Convert image to base64 for AWS Textract
  private async imageToBase64(imageUri: string): Promise<string> {
    try {
      // For React Native, we need to handle the image URI
      if (Platform.OS === "ios" || Platform.OS === "android") {
        // Convert file URI to base64
        const response = await fetch(imageUri);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix
            const base64Data = base64.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // For web, handle differently
        const response = await fetch(imageUri);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.error("Error converting image to base64:", error);
      throw new Error("Failed to process image");
    }
  }

  // Generate AWS Signature V4
  private generateSignatureV4(
    method: string,
    service: string,
    region: string,
    endpoint: string,
    payload: string,
    accessKeyId: string,
    secretAccessKey: string
  ) {
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = date.slice(0, 8);
    const timeStamp = date.slice(8, 14);

    // Step 1: Create canonical request
    const canonicalUri = "/";
    const canonicalQueryString = "";
    const canonicalHeaders = `content-type:application/x-amz-json-1.1\nhost:${endpoint}\nx-amz-date:${date}\n`;
    const signedHeaders = "content-type;host;x-amz-date";
    const payloadHash = CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex);

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    // Step 2: Create string to sign
    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      date,
      credentialScope,
      CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex),
    ].join("\n");

    // Step 3: Calculate signature
    const kDate = CryptoJS.HmacSHA256(dateStamp, `AWS4${secretAccessKey}`);
    const kRegion = CryptoJS.HmacSHA256(region, kDate);
    const kService = CryptoJS.HmacSHA256(service, kRegion);
    const kSigning = CryptoJS.HmacSHA256("aws4_request", kService);
    const signature = CryptoJS.HmacSHA256(stringToSign, kSigning).toString(
      CryptoJS.enc.Hex
    );

    // Step 4: Create authorization header
    const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      authorizationHeader,
      date,
      signedHeaders,
    };
  }

  // Extract text using AWS Textract via REST API
  async extractText(imageUri: string): Promise<TextractResult> {
    if (!this.isConfigured) {
      throw new Error(
        "AWS Textract not configured. Please set up credentials first."
      );
    }

    try {
      // Convert image to base64
      const imageBytes = await this.imageToBase64(imageUri);

      // Prepare the request payload
      const payload = JSON.stringify({
        Document: {
          Bytes: imageBytes,
        },
      });

      const service = "textract";
      const endpoint = `${service}.${this.region}.amazonaws.com`;
      const method = "POST";

      // Generate AWS Signature V4
      const signature = this.generateSignatureV4(
        method,
        service,
        this.region,
        endpoint,
        payload,
        this.accessKeyId,
        this.secretAccessKey
      );

      // Make the request
      const response = await fetch(`https://${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": "Textract.DetectDocumentText",
          "X-Amz-Date": signature.date,
          Authorization: signature.authorizationHeader,
          "Content-Length": payload.length.toString(),
        },
        body: payload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AWS Textract API error:", errorText);

        if (response.status === 403) {
          throw new Error(
            "Access denied. Please check your AWS permissions for Textract."
          );
        } else if (response.status === 400) {
          throw new Error("Invalid request. Please check your image format.");
        } else if (response.status === 429) {
          throw new Error(
            "Too many requests. Please wait a moment and try again."
          );
        } else {
          throw new Error(
            `AWS Textract error: ${response.status} ${response.statusText}`
          );
        }
      }

      const result = await response.json();

      if (!result.Blocks) {
        throw new Error("No text detected in the image");
      }

      // Extract text from blocks
      const textBlocks = result.Blocks.filter(
        (block: any) => block.BlockType === "LINE"
      );

      const extractedText = textBlocks
        .map((block: any) => block.Text)
        .filter((text: string) => text)
        .join("\n");

      // Calculate average confidence
      const confidence =
        textBlocks.length > 0
          ? textBlocks.reduce(
              (sum: number, block: any) => sum + (block.Confidence || 0),
              0
            ) / textBlocks.length
          : 0;

      return {
        text: extractedText,
        confidence: confidence / 100, // Convert to 0-1 scale
        blocks: result.Blocks,
      };
    } catch (error) {
      console.error("AWS Textract error:", error);

      if (error instanceof Error) {
        if (error.message.includes("InvalidSignatureException")) {
          throw new Error(
            "AWS credentials are invalid. Please check your access key and secret."
          );
        } else if (error.message.includes("AccessDenied")) {
          throw new Error(
            "Access denied. Please check your AWS permissions for Textract."
          );
        } else if (error.message.includes("ThrottlingException")) {
          throw new Error(
            "Too many requests. Please wait a moment and try again."
          );
        }
      }

      throw new Error("Failed to extract text from image. Please try again.");
    }
  }

  // Parse patient data from extracted text
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

      // Find date of birth and gender (format: DD-MMM-YYYY AGE GENDER)
      let dateOfBirth = "";
      let gender = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for date pattern DD-MMM-YYYY
        const dobMatch = line.match(/(\d{2})-([A-Z]{3})-(\d{4})/);
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

          // Extract gender (M or F) from the same line
          const genderMatch = line.match(/\b([MF])\b/);
          if (genderMatch) {
            gender = genderMatch[1];
          }
          break;
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
      console.error("Error parsing patient data:", error);
      return null;
    }
  }

  // Check if AWS is configured
  get configured(): boolean {
    return this.isConfigured;
  }
}

// Create singleton instance
export const textractService = new AWSTextractService();

export default textractService;
