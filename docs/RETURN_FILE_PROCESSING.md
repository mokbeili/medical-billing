# Return File Processing Documentation

This document describes how to parse and store information from daily and biweekly return files in the Medical Billing system.

## Overview

The return file processing system handles two types of files:
1. **Daily Return Files** - Contains rejected claims from daily processing
2. **Biweekly Return Files** - Contains paid, rejected, and pended claims from biweekly processing

## File Format Specifications

### Daily Return File Structure

Daily return files contain the following record types:

| Record Type | Description |
|-------------|-------------|
| `10` | Header Record - Contains practitioner and submission information |
| `50` | Rejected Visit and Procedure Service Record |
| `57` | Rejected Hospital Care Service Record |
| `60` | Rejected Comment Record |
| `89` | Rejected Reciprocal Billing - Out-of-Province Beneficiary Record |
| `90` | Trailer Record - Contains submission totals |

### Biweekly Return File Structure

Biweekly return files contain the following record types:

| Record Type | Status | Description |
|-------------|--------|-------------|
| `P` | - | Paid Line - Contains approved payment information |
| `T` | - | Total Line - Contains summary totals |
| `M` | - | Message Line - Contains messages from the processor |
| `50` | `R` | Rejected Visit and Procedure Service Record |
| `50` | `P` | Pended Visit and Procedure Service Record |
| `57` | `R` | Rejected Hospital Care Service Record |
| `57` | `P` | Pended Hospital Care Service Record |
| `60` | - | Comment Record |
| `89` | `R` | Rejected Reciprocal Billing Record |
| `89` | `P` | Pended Reciprocal Billing Record |

## API Endpoints

### 1. Upload Return File

**Endpoint:** `POST /api/return-files`

**Description:** Upload and encrypt a return file for processing.

**Request Body:**
```json
{
  "fileType": "DAILY" | "BIWEEKLY",
  "fileContent": "string (plain text file content)",
  "fileName": "string (original filename)"
}
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "id": "uuid-of-return-file"
}
```

**Example:**
```typescript
const response = await fetch('/api/return-files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileType: 'BIWEEKLY',
    fileContent: fileTextContent,
    fileName: 'return_file_2025_10_31.txt'
  })
});

const result = await response.json();
console.log('Return file ID:', result.id);
```

### 2. Process Return File

**Endpoint:** `PUT /api/return-files`

**Description:** Parse and store the information from an uploaded return file.

**Request Body:**
```json
{
  "returnFileId": "uuid-of-return-file"
}
```

**Response:**
```json
{
  "message": "Return file processed successfully",
  "result": {
    "paidCount": 10,          // For biweekly files
    "rejectedCount": 2,       // For both file types
    "pendedCount": 1,         // For biweekly files
    "totalCount": 1,          // For biweekly files
    "errors": []              // Array of error messages, if any
  }
}
```

**Example:**
```typescript
const response = await fetch('/api/return-files', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    returnFileId: 'uuid-from-upload-step'
  })
});

const result = await response.json();
console.log('Processing result:', result.result);
```

### 3. List Return Files

**Endpoint:** `GET /api/return-files`

**Description:** Retrieve all return files for the authenticated user.

**Query Parameters:**
- `physicianId` (optional, admin only) - Filter by specific physician

**Response:**
```json
[
  {
    "id": "uuid",
    "fileName": "return_file_2025_10_31.txt",
    "fileType": "BIWEEKLY",
    "physicianId": "physician-uuid",
    "jurisdictionId": 1,
    "createdAt": "2025-10-31T12:00:00Z",
    "updatedAt": "2025-10-31T12:00:00Z",
    "physician": {
      "firstName": "John",
      "lastName": "Doe",
      "billingNumber": "1234"
    },
    "jurisdiction": {
      "country": "Canada",
      "region": "Saskatchewan"
    }
  }
]
```

## Parsing Functions

### Daily Return File Parsing

```typescript
import { parseDailyReturnFile } from '@/utils/returnFileParser';

// Parse the file content
const records = parseDailyReturnFile(fileContent);

// Records will be an array of:
// - DailyHeaderRecord (type 10)
// - RejectedVisitProcedureRecord (type 50)
// - RejectedHospitalCareRecord (type 57)
// - RejectedCommentRecord (type 60)
// - RejectedReciprocalBillingRecord (type 89)
// - DailyTrailerRecord (type 90)
```

### Biweekly Return File Parsing

```typescript
import { parseBiweeklyReturnFile } from '@/utils/returnFileParser';

// Parse the file content
const records = parseBiweeklyReturnFile(fileContent);

// Records will be an array of:
// - BiweeklyPaidLineRecord (recordType: "P")
// - BiweeklyTotalLineRecord (recordType: "T")
// - BiweeklyMessageLineRecord (recordType: "M")
// - RejectedVisitProcedureRecord (recordType: "50", status: "R")
// - PendedVisitProcedureRecord (recordType: "50", status: "P")
// - RejectedHospitalCareRecord (recordType: "57", status: "R")
// - PendedHospitalCareRecord (recordType: "57", status: "P")
// - RejectedCommentRecord (recordType: "60")
// - RejectedReciprocalBillingRecord (recordType: "89")
```

## Storage Functions

### Store Daily Return File Records

```typescript
import { storeDailyReturnFileRecords } from '@/utils/returnFileParser';

const result = await storeDailyReturnFileRecords(
  records,
  physicianId,
  providerId
);

// Result contains:
// {
//   rejectedCount: number,
//   errors: string[]
// }
```

### Store Biweekly Return File Records

```typescript
import { storeBiweeklyReturnFileRecords } from '@/utils/returnFileParser';

const result = await storeBiweeklyReturnFileRecords(
  records,
  physicianId,
  providerId
);

// Result contains:
// {
//   paidCount: number,
//   rejectedCount: number,
//   pendedCount: number,
//   totalCount: number,
//   errors: string[]
// }
```

## Database Updates

### Paid Claims (Biweekly Only)

When a paid record is processed, the system updates the corresponding `ServiceCodes` record with:

- `approved` = `true`
- `paymentRunCode` = Run code from the file
- `feeSubmitted` = Fee amount submitted
- `feeApproved` = Fee amount approved
- `approvedBillingCodeId` = ID of the approved billing code
- `totalPremiumAmount` = Premium amount
- `programPayment` = Program payment amount
- `totalPaidAmount` = Total paid amount
- `paidNumberOfUnits` = Number of units paid
- `paidLocationOfService` = Location of service code

Additionally, explanatory codes (if present) are linked to the service code.

### Rejected Claims

When a rejected record is processed, the system updates the corresponding `ServiceCodes` record with:

- `approved` = `false`
- `paymentRunCode` = Run code from the file

Explanatory codes (if present) are linked to the service code.

### Pended Claims (Biweekly Only)

When a pended record is processed, the system updates the corresponding `ServiceCodes` record with:

- `approved` = `null` (indicates pending status)
- `paymentRunCode` = Run code from the file

The corresponding `Service` record is updated with:

- `status` = `"PENDING"`

### Total Records (Biweekly Only)

Total records are stored in the `ServiceCodesTotals` table, linked to the first service code found for the practitioner and run code. This includes:

- `mode` = Billing mode
- `totalLineType` = Type of total line (e.g., "Items Appr", "Items Rej", etc.)
- `feeSubmitted` = Total fees submitted
- `feeApproved` = Total fees approved
- `totalPremiumAmount` = Total premium amount
- `totalProgramPayment` = Total program payment
- `totalPaidAmount` = Total paid amount
- `runCode` = Payment run code

## Record Matching

The system matches return file records to existing service codes using:

1. **CPS Claim Number** + **Sequence Number** (preferred method)
2. **Claim Number** + **Sequence Number** (fallback method)

Additionally, the physician ID is verified to ensure the record belongs to the correct physician.

## Explanatory Codes

Explanatory codes provide additional information about claim processing results. Up to 3 explanatory codes can be associated with each service:

- Explanatory Code 1
- Explanatory Code 2
- Explanatory Code 3

The system automatically:
1. Creates new explanatory code records if they don't exist
2. Links explanatory codes to the service code via the `ServiceCodeExplanatoryCode` table
3. Prevents duplicate linkages using a unique constraint

## Error Handling

The processing functions return arrays of error messages for records that could not be processed. Common errors include:

- **Service code not found**: The CPS claim number, claim number, or sequence does not match any existing service code
- **Missing file content**: The return file has no content to process
- **Invalid file type**: The file type is neither DAILY nor BIWEEKLY
- **Unauthorized access**: User attempting to process a file they don't own

### Error Response Example

```json
{
  "message": "Return file processed successfully",
  "result": {
    "paidCount": 8,
    "rejectedCount": 2,
    "pendedCount": 1,
    "totalCount": 1,
    "errors": [
      "Error storing 50: Service code not found for CPS claim 1234567890, claim 12345, sequence 1"
    ]
  }
}
```

## Best Practices

1. **Upload First, Process Second**: Always upload the file first to save a record, then process it separately
2. **Monitor Errors**: Check the `errors` array in the processing result to identify issues
3. **Verify Matching**: Ensure service codes have been assigned CPS claim numbers during submission
4. **Review Explanatory Codes**: Check explanatory code meanings to understand why claims were rejected or pended
5. **Handle Pending Status**: Follow up on pended claims and resubmit if necessary
6. **Backup Files**: Keep original return files as they contain important audit information

## Common Use Cases

### Processing a Biweekly Return File

```typescript
// Step 1: Upload the file
const uploadResponse = await fetch('/api/return-files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileType: 'BIWEEKLY',
    fileContent: fileTextContent,
    fileName: 'biweekly_return_2025_10_31.txt'
  })
});

const { id } = await uploadResponse.json();

// Step 2: Process the file
const processResponse = await fetch('/api/return-files', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ returnFileId: id })
});

const { result } = await processResponse.json();

// Step 3: Handle results
console.log(`Processed:
  - ${result.paidCount} paid claims
  - ${result.rejectedCount} rejected claims
  - ${result.pendedCount} pended claims
  - ${result.totalCount} total records
`);

if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

### Processing a Daily Return File

```typescript
// Step 1: Upload the file
const uploadResponse = await fetch('/api/return-files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileType: 'DAILY',
    fileContent: fileTextContent,
    fileName: 'daily_return_2025_10_31.txt'
  })
});

const { id } = await uploadResponse.json();

// Step 2: Process the file
const processResponse = await fetch('/api/return-files', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ returnFileId: id })
});

const { result } = await processResponse.json();

// Step 3: Handle results
console.log(`Processed ${result.rejectedCount} rejected claims`);

if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

## Security Considerations

1. **Encryption**: All return file content is encrypted before storage using AES-256-CBC
2. **Authentication**: All endpoints require user authentication via NextAuth
3. **Authorization**: Users can only process their own files (or all files if they're an admin)
4. **Data Privacy**: Patient information in return files is matched to encrypted records

## Technical Details

### File Format

Return files are fixed-width text files where each field occupies a specific character position. The parser uses 1-indexed positions as specified in the file format documentation.

### Position Extraction

```typescript
// Extract characters from position 3 to 6 (1-indexed)
const practitionerNumber = extract(line, 3, 6);
```

### Amount Parsing

Amounts are stored with implied decimal places (typically 2):

```typescript
// "0012345" with 2 decimal places = 123.45
const amount = parseAmount("0012345", 2); // Returns 123.45
```

### Integer Parsing

Integers are right-justified and zero-filled:

```typescript
// "  005" = 5
const units = parseIntField("  005"); // Returns 5
```

## Troubleshooting

### Issue: Records Not Matching

**Problem**: Return file records are not matching existing service codes.

**Solution**: 
- Verify that CPS claim numbers were assigned during claim submission
- Check that claim numbers and sequence numbers match between submission and return
- Ensure the file belongs to the correct physician

### Issue: Explanatory Codes Not Found

**Problem**: Explanatory codes in the return file don't have descriptions.

**Solution**: 
- The system creates placeholder explanatory codes automatically
- Update the `ExplanatoryCode` records with proper titles and explanations
- Consult the provider's explanatory code documentation

### Issue: Processing Errors

**Problem**: Some records fail to process.

**Solution**:
- Check the `errors` array in the processing result
- Verify database constraints (e.g., service codes exist, foreign keys are valid)
- Review application logs for detailed error messages

## Related Documentation

- [Batch Claim Generation](./BATCH_CLAIM_GENERATION.md)
- [Service Management](./SERVICE_MANAGEMENT.md)
- [Billing Codes](./BILLING_CODES.md)

