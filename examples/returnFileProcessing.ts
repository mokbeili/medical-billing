/**
 * Example usage of return file parsing and storage functions
 *
 * This file demonstrates how to use the return file processing functionality
 * in different scenarios.
 */

import {
  parseBiweeklyReturnFile,
  parseDailyReturnFile,
  storeBiweeklyReturnFileRecords,
  storeDailyReturnFileRecords,
} from "@/utils/returnFileParser";

// ==================== EXAMPLE 1: Parse a Daily Return File ====================

export async function exampleParseDailyReturnFile() {
  const sampleDailyFile = `
10123400001000                                                                                                   8 
501234123451123456789010125M                          123                  010325012345670123456781 E         A BC001R0102                                                                                                                                                              AB1234567890
901234            001000100000012345                                                                         BC
  `.trim();

  const records = parseDailyReturnFile(sampleDailyFile);

  return records;
}

// ==================== EXAMPLE 2: Parse a Biweekly Return File ====================

export async function exampleParseBiweeklyReturnFile() {
  const sampleBiweeklyFile = `
1123400012345P                              012 34 25020000123A 000012345 000012000     A BC8 0001234 0000123450001  1          AB            AB1234567890
1123400012345T                                        Items Appr            00001234500 0001200000     0000123000 0000123000 0001234500                                                                                                                      BC
  `.trim();

  const records = parseBiweeklyReturnFile(sampleBiweeklyFile);

  return records;
}

// ==================== EXAMPLE 3: Store Daily Return File Records ====================

export async function exampleStoreDailyReturnFile(
  fileContent: string,
  physicianId: string,
  providerId: number
) {
  // Step 1: Parse the file
  const records = parseDailyReturnFile(fileContent);

  // Step 2: Store the records in the database
  const result = await storeDailyReturnFileRecords(
    records,
    physicianId,
    providerId
  );

  return result;
}

// ==================== EXAMPLE 4: Store Biweekly Return File Records ====================

export async function exampleStoreBiweeklyReturnFile(
  fileContent: string,
  physicianId: string,
  providerId: number
) {
  // Step 1: Parse the file
  const records = parseBiweeklyReturnFile(fileContent);

  // Step 2: Store the records in the database
  const result = await storeBiweeklyReturnFileRecords(
    records,
    physicianId,
    providerId
  );

  return result;
}

// ==================== EXAMPLE 5: Full Workflow with API ====================

export async function exampleFullWorkflow(
  fileContent: string,
  fileType: "DAILY" | "BIWEEKLY"
) {
  // Step 1: Upload the file
  const uploadResponse = await fetch("/api/return-files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileType,
      fileContent,
      fileName: `return_file_${new Date().toISOString().split("T")[0]}.txt`,
    }),
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.statusText}`);
  }

  const { id } = await uploadResponse.json();

  // Step 2: Process the file
  const processResponse = await fetch("/api/return-files", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnFileId: id }),
  });

  if (!processResponse.ok) {
    throw new Error(`Processing failed: ${processResponse.statusText}`);
  }

  const { result } = await processResponse.json();

  return result;
}

// ==================== EXAMPLE 6: List Return Files ====================

export async function exampleListReturnFiles() {
  const response = await fetch("/api/return-files");

  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.statusText}`);
  }

  const files = await response.json();

  return files;
}

// ==================== EXAMPLE 7: Error Handling ====================

export async function exampleErrorHandling(fileContent: string) {
  try {
    // Attempt to parse the file
    const records = parseBiweeklyReturnFile(fileContent);

    // Attempt to process with dummy IDs (will likely cause errors)
    const result = await storeBiweeklyReturnFileRecords(
      records,
      "dummy-physician-id",
      999999
    );

    return result;
  } catch (error) {
    throw error;
  }
}

// ==================== USAGE NOTES ====================

/*
To use these examples in your application:

1. Import the functions you need:
   ```typescript
   import { exampleFullWorkflow } from '@/examples/returnFileProcessing';
   ```

2. Call them with real data:
   ```typescript
   const fileContent = // ... read from file upload
   await exampleFullWorkflow(fileContent, 'BIWEEKLY');
   ```

3. Adapt the examples to your specific needs:
   - Add custom error handling
   - Integrate with your UI components
   - Add logging or analytics
   - Implement retry logic
   - Add notifications

Remember:
- Always validate file content before parsing
- Handle errors gracefully in production
- Log processing results for auditing
- Keep original files for compliance
- Monitor processing performance
*/
