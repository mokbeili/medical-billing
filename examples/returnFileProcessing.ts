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
  
  console.log("Daily Return File Records:");
  records.forEach((record) => {
    console.log(`  Record Type: ${record.recordType}`);
    if (record.recordType === "10") {
      console.log(`    Practitioner: ${record.practitionerNumber}`);
      console.log(`    Clinic: ${record.clinicNumber}`);
    } else if (record.recordType === "50" || record.recordType === "57") {
      console.log(`    Claim: ${record.claimNumber}`);
      console.log(`    HSN: ${record.healthServicesNumber}`);
      console.log(`    Status: ${record.status}`);
    } else if (record.recordType === "90") {
      console.log(`    Records Submitted: ${record.numberOfRecordsSubmitted}`);
      console.log(`    Total Amount: $${record.totalDollarAmountSubmitted}`);
    }
  });
  
  return records;
}

// ==================== EXAMPLE 2: Parse a Biweekly Return File ====================

export async function exampleParseBiweeklyReturnFile() {
  const sampleBiweeklyFile = `
1123400012345P                              012 34 25020000123A 000012345 000012000     A BC8 0001234 0000123450001  1          AB            AB1234567890
1123400012345T                                        Items Appr            00001234500 0001200000     0000123000 0000123000 0001234500                                                                                                                      BC
  `.trim();

  const records = parseBiweeklyReturnFile(sampleBiweeklyFile);
  
  console.log("Biweekly Return File Records:");
  records.forEach((record) => {
    if (record.recordType === "P") {
      console.log("  Paid Line Record:");
      console.log(`    Claim: ${record.claimNumber}`);
      console.log(`    Fee Submitted: $${record.feeSubmitted}`);
      console.log(`    Fee Approved: $${record.feeApproved}`);
      console.log(`    Total Paid: $${record.totalPaidAmount}`);
    } else if (record.recordType === "T") {
      console.log("  Total Line Record:");
      console.log(`    Type: ${record.totalLineType}`);
      console.log(`    Total Approved: $${record.feeApproved}`);
      console.log(`    Total Paid: $${record.totalPaidAmount}`);
    } else if (record.recordType === "M") {
      console.log("  Message:");
      console.log(`    ${record.message}`);
    } else if (record.recordType === "50" || record.recordType === "57") {
      console.log(`  Service Record (Type ${record.recordType}):`);
      console.log(`    Claim: ${record.claimNumber}`);
      console.log(`    Status: ${record.status}`);
      if ("explanatoryCode" in record) {
        console.log(`    Explanatory Code: ${record.explanatoryCode}`);
      }
    }
  });
  
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
  
  console.log(`Parsed ${records.length} records from daily return file`);
  
  // Step 2: Store the records in the database
  const result = await storeDailyReturnFileRecords(
    records,
    physicianId,
    providerId
  );
  
  console.log("Daily Return File Processing Results:");
  console.log(`  Rejected Claims: ${result.rejectedCount}`);
  console.log(`  Errors: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log("\nErrors encountered:");
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
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
  
  console.log(`Parsed ${records.length} records from biweekly return file`);
  
  // Step 2: Store the records in the database
  const result = await storeBiweeklyReturnFileRecords(
    records,
    physicianId,
    providerId
  );
  
  console.log("Biweekly Return File Processing Results:");
  console.log(`  Paid Claims: ${result.paidCount}`);
  console.log(`  Rejected Claims: ${result.rejectedCount}`);
  console.log(`  Pended Claims: ${result.pendedCount}`);
  console.log(`  Total Records: ${result.totalCount}`);
  console.log(`  Errors: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log("\nErrors encountered:");
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  return result;
}

// ==================== EXAMPLE 5: Full Workflow with API ====================

export async function exampleFullWorkflow(fileContent: string, fileType: "DAILY" | "BIWEEKLY") {
  console.log("=== Full Return File Processing Workflow ===\n");
  
  // Step 1: Upload the file
  console.log("Step 1: Uploading return file...");
  const uploadResponse = await fetch("/api/return-files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileType,
      fileContent,
      fileName: `return_file_${new Date().toISOString().split('T')[0]}.txt`,
    }),
  });
  
  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.statusText}`);
  }
  
  const { id, message } = await uploadResponse.json();
  console.log(`✓ ${message}`);
  console.log(`  File ID: ${id}\n`);
  
  // Step 2: Process the file
  console.log("Step 2: Processing return file...");
  const processResponse = await fetch("/api/return-files", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnFileId: id }),
  });
  
  if (!processResponse.ok) {
    throw new Error(`Processing failed: ${processResponse.statusText}`);
  }
  
  const { result } = await processResponse.json();
  console.log("✓ Processing complete\n");
  
  // Step 3: Display results
  console.log("Step 3: Results Summary:");
  if (fileType === "BIWEEKLY") {
    console.log(`  Paid Claims: ${result.paidCount}`);
    console.log(`  Rejected Claims: ${result.rejectedCount}`);
    console.log(`  Pended Claims: ${result.pendedCount}`);
    console.log(`  Total Records: ${result.totalCount}`);
  } else {
    console.log(`  Rejected Claims: ${result.rejectedCount}`);
  }
  
  if (result.errors.length > 0) {
    console.log(`\n⚠ ${result.errors.length} error(s) encountered:`);
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  } else {
    console.log("\n✓ No errors");
  }
  
  return result;
}

// ==================== EXAMPLE 6: List Return Files ====================

export async function exampleListReturnFiles() {
  console.log("Fetching return files...\n");
  
  const response = await fetch("/api/return-files");
  
  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.statusText}`);
  }
  
  const files = await response.json();
  
  console.log(`Found ${files.length} return file(s):\n`);
  
  files.forEach((file: any, index: number) => {
    console.log(`${index + 1}. ${file.fileName}`);
    console.log(`   Type: ${file.fileType}`);
    console.log(`   Physician: ${file.physician.firstName} ${file.physician.lastName}`);
    console.log(`   Uploaded: ${new Date(file.createdAt).toLocaleString()}`);
    console.log(`   Jurisdiction: ${file.jurisdiction.region}, ${file.jurisdiction.country}\n`);
  });
  
  return files;
}

// ==================== EXAMPLE 7: Error Handling ====================

export async function exampleErrorHandling(fileContent: string) {
  try {
    // Attempt to parse the file
    const records = parseBiweeklyReturnFile(fileContent);
    
    console.log(`Successfully parsed ${records.length} records`);
    
    // Attempt to process with dummy IDs (will likely cause errors)
    const result = await storeBiweeklyReturnFileRecords(
      records,
      "dummy-physician-id",
      999999
    );
    
    // Check for errors
    if (result.errors.length > 0) {
      console.log("\n⚠ Processing completed with errors:");
      console.log(`  Successful: ${result.paidCount + result.rejectedCount + result.pendedCount}`);
      console.log(`  Failed: ${result.errors.length}`);
      
      // Log first few errors
      const errorsToShow = result.errors.slice(0, 3);
      errorsToShow.forEach((error, index) => {
        console.log(`\n  Error ${index + 1}:`);
        console.log(`    ${error}`);
      });
      
      if (result.errors.length > 3) {
        console.log(`\n  ... and ${result.errors.length - 3} more error(s)`);
      }
    }
    
    return result;
  } catch (error) {
    console.error("Fatal error during processing:");
    console.error(error);
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

