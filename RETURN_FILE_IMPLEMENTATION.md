# Return File Processing Implementation

## Overview

This implementation provides comprehensive parsing and storage functionality for Saskatchewan MSB (Medical Services Branch) return files, including both daily and biweekly return file formats.

## What Was Implemented

### 1. Parser Functions (`/utils/returnFileParser.ts`)

A complete parsing system that handles:

#### Daily Return Files
- **Header Records (Type 10)** - Practitioner and submission information
- **Rejected Visit/Procedure Records (Type 50)** - Rejected visit and procedure services
- **Rejected Hospital Care Records (Type 57)** - Rejected hospital care services  
- **Rejected Comment Records (Type 60)** - Comments about rejected claims
- **Rejected Reciprocal Billing Records (Type 89)** - Out-of-province beneficiary rejections
- **Trailer Records (Type 90)** - Submission totals and validation

#### Biweekly Return Files
- **Paid Line Records (Type P)** - Approved and paid claims with payment details
- **Total Line Records (Type T)** - Summary totals by category
- **Message Line Records (Type M)** - System messages from the processor
- **Rejected Records (Types 50, 57, 60, 89 with status R)** - Rejected claims
- **Pended Records (Types 50, 57, 89 with status P)** - Claims pending review

### 2. Storage Functions

Automatic database updates for:
- Service code approval/rejection status
- Payment information (fees, premiums, program payments)
- Explanatory codes (up to 3 per service)
- Total line records for accounting
- Service status updates (PENDING for pended claims)

### 3. API Endpoints (`/app/api/return-files/route.ts`)

Three REST endpoints:

#### POST `/api/return-files`
- Upload and encrypt return files
- Validates file type (DAILY or BIWEEKLY)
- Associates file with authenticated physician
- Returns file ID for processing

#### PUT `/api/return-files`
- Process uploaded return files
- Parses records based on file type
- Updates database with payment/rejection information
- Returns processing statistics and errors

#### GET `/api/return-files`
- List all return files for authenticated user
- Admin users can filter by physician
- Includes physician and jurisdiction information

### 4. Documentation

Comprehensive documentation in `/docs/RETURN_FILE_PROCESSING.md` covering:
- File format specifications
- API usage examples
- Database schema updates
- Error handling
- Best practices
- Troubleshooting guide

## Key Features

### 1. Fixed-Width Field Parsing
- Accurate extraction of data from specific character positions (1-indexed)
- Handles numeric fields with implied decimal places
- Properly parses negative values and zero-filled fields

### 2. Record Type Detection
- Automatic identification of record types
- Status detection (Paid/Rejected/Pended)
- Robust handling of malformed or incomplete records

### 3. Data Matching
- Matches return records to existing service codes via CPS claim number
- Fallback matching using claim number + sequence
- Physician verification to ensure data integrity

### 4. Explanatory Code Management
- Automatic creation of new explanatory code records
- Links codes to service codes with duplicate prevention
- Stores up to 3 explanatory codes per service

### 5. Security
- File content encryption (AES-256-CBC)
- Authentication required for all operations
- Authorization checks (users can only process their own files)
- Admin override capabilities

### 6. Error Handling
- Graceful handling of missing service codes
- Detailed error messages for troubleshooting
- Processing continues even if individual records fail
- Error summary returned to caller

## File Format Compliance

The implementation follows the Saskatchewan MSB specifications exactly:

### Field Position Examples

**Paid Line (Biweekly)**
```
Position 1:     Mode (1 char)
Position 2-5:   Practitioner Number (4 chars)
Position 6-8:   Clinic Number (3 chars)
Position 9-13:  Claim Number (5 chars)
Position 14:    Record Type 'P'
...and so on
```

**Rejected Record (Type 50)**
```
Position 1-2:   Record Type "50"
Position 3-6:   Practitioner Number
Position 7-11:  Claim Number
Position 12:    Sequence Number
...and so on
```

### Amount Parsing

Amounts have 2 implied decimal places:
- `"0012345"` → `123.45`
- `"-0012345"` → `-123.45`

## Database Schema Integration

### Updated Tables

#### `ServiceCodes`
- `approved` - Boolean indicating payment status
- `paymentRunCode` - Run code from return file
- `feeSubmitted` - Amount submitted
- `feeApproved` - Amount approved
- `approvedBillingCodeId` - Foreign key to approved billing code
- `totalPremiumAmount` - Premium paid
- `programPayment` - Program payment amount
- `totalPaidAmount` - Total amount paid
- `paidNumberOfUnits` - Number of units approved
- `paidLocationOfService` - Location code approved

#### `ServiceCodesTotals`
- `serviceCodeId` - Foreign key to service code
- `mode` - Billing mode
- `totalLineType` - Type of total (e.g., "Items Appr")
- `feeSubmitted` - Total submitted
- `feeApproved` - Total approved
- `totalPremiumAmount` - Total premiums
- `totalProgramPayment` - Total program payments
- `totalPaidAmount` - Total paid
- `runCode` - Payment run code

#### `ServiceCodeExplanatoryCode`
- Links explanatory codes to service codes
- Unique constraint prevents duplicates

#### `ExplanatoryCode`
- `code` - Explanatory code (e.g., "01", "AR")
- `title` - Short description
- `explanation` - Full explanation
- `providerId` - Foreign key to provider

#### `Service`
- `status` - Updated to PENDING for pended claims

## Usage Example

```typescript
// 1. Upload a return file
const uploadResponse = await fetch('/api/return-files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileType: 'BIWEEKLY',
    fileContent: fileContent,
    fileName: 'return_2025_10_31.txt'
  })
});

const { id } = await uploadResponse.json();

// 2. Process the return file
const processResponse = await fetch('/api/return-files', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ returnFileId: id })
});

const { result } = await processResponse.json();

// 3. Review results
console.log(`
  Paid: ${result.paidCount}
  Rejected: ${result.rejectedCount}
  Pended: ${result.pendedCount}
  Totals: ${result.totalCount}
  Errors: ${result.errors.length}
`);
```

## Testing Recommendations

### Unit Tests
1. Test field extraction at various positions
2. Test amount parsing with positive, negative, and zero values
3. Test integer parsing with zero-filled values
4. Test record type detection for all types

### Integration Tests
1. Test parsing complete daily return files
2. Test parsing complete biweekly return files
3. Test database updates for paid records
4. Test database updates for rejected records
5. Test database updates for pended records
6. Test explanatory code creation and linking

### End-to-End Tests
1. Upload and process a real daily return file
2. Upload and process a real biweekly return file
3. Verify service code updates in database
4. Verify service status changes
5. Test error handling for missing service codes

## Known Limitations

1. **Comment Records (Type 60)**: Currently logged but not stored in a dedicated table
2. **Reciprocal Billing Records (Type 89)**: Currently logged but not stored in a dedicated table
3. **Message Lines**: Currently logged but not stored
4. **Totals Linking**: Total records are linked to the first service code found for a practitioner/run code combination (may need refinement)
5. **Explanatory Code Descriptions**: Created with placeholder text; requires manual update with actual descriptions

## Future Enhancements

### Potential Improvements
1. Create dedicated tables for comment records and messages
2. Add a table for reciprocal billing records
3. Improve total record linking (perhaps at claim level)
4. Add explanatory code lookup API or bulk import
5. Add validation rules based on record types
6. Add support for other provinces/jurisdictions
7. Add batch processing for multiple files
8. Add reporting/analytics for return file data
9. Add email notifications for rejected/pended claims
10. Add automatic resubmission workflow for rejected claims

### Performance Optimizations
1. Batch database updates instead of individual updates
2. Add transaction support for atomic operations
3. Add caching for explanatory codes
4. Add indexing on frequently queried fields

## File Structure

```
/utils/
  returnFileParser.ts          # Main parsing and storage functions

/app/api/return-files/
  route.ts                     # API endpoints (GET, POST, PUT)

/docs/
  RETURN_FILE_PROCESSING.md    # Comprehensive documentation

/prisma/
  schema.prisma                # Database schema (already existed)
  migrations/
    20251030000003_add_return_files_table/
      migration.sql            # ReturnFile table migration
```

## Dependencies

- **Prisma ORM** - Database operations
- **crypto** (Node.js) - File encryption/decryption
- **NextAuth** - Authentication
- **Next.js** - API routes and server functions

## Security Notes

- All file content is encrypted at rest using AES-256-CBC
- Encryption key must be set in environment variable `ENCRYPTION_KEY`
- Files are associated with physicians and jurisdictions for access control
- Admin role required to access files across all physicians

## Compliance

This implementation follows:
- Saskatchewan MSB Return File Format Specifications
- Fixed-width field parsing standards
- Saskatchewan Healthcare billing regulations
- HIPAA/PHIPA security requirements (via encryption)

## Support

For questions or issues:
1. Review the documentation in `/docs/RETURN_FILE_PROCESSING.md`
2. Check error messages in the processing result
3. Review application logs for detailed error information
4. Verify database constraints and foreign key relationships

## Version History

**Version 1.0** (October 31, 2025)
- Initial implementation
- Support for daily and biweekly return files
- Full parsing of all record types
- Database storage for paid, rejected, and pended claims
- API endpoints for upload, processing, and listing
- Comprehensive documentation

