# Medical Billing System - New Features

## Day Range Functionality

When a billing code has a day range defined, the system automatically maintains that the difference between the service start date and service end date equals the day range (inclusive).

### Example:

- If a code has a day range of 10 days and the start date is June 1, the end date will automatically be set to June 10
- The system ensures the period is exactly the specified number of days inclusive

### Visual Indicators:

- Day range information is displayed with "(Auto-calculated)" label
- Green checkmark shows when the day range is correctly applied
- Service period is clearly displayed showing start and end dates

## Previous Codes for Type 57 Billing Codes

When a billing code with billing record type 57 is selected and has previous codes defined, the system automatically sets the service start date to be equal to the previous code's end date + 1 day.

### Logic:

1. When adding a type 57 code, the system checks if it has previous codes defined
2. If any of those previous codes are already selected in the form, it uses the most recent end date
3. The start date is set to the previous code's end date + 1 day
4. If no previous codes are selected, it falls back to the previous code in the form sequence

### Visual Indicators:

- Type 57 codes with previous codes show "(Uses previous codes)" label
- The system automatically calculates the appropriate start date

## Max Units Validation

The system prevents users from requesting more units than the maximum allowed for a billing code.

### Features:

- Max units limit is displayed next to the "Number of Units" label
- Input field has a max attribute set to the billing code's max units
- Plus button is disabled when the current value reaches the maximum
- Manual input is automatically capped to the maximum value
- Visual feedback shows the maximum limit

### Example:

- If a code has max_units = 5, users cannot request more than 5 units
- The plus button becomes disabled when 5 units are selected
- If a user manually types "10", it will be automatically reduced to 5

## Technical Implementation

### Database Schema:

- `billing_codes` table includes `max_units` and `day_range` fields
- `billing_code_relations` table manages previous/next code relationships

### API Updates:

- Search API now includes previous codes and next codes information
- All search queries return the complete billing code data including relationships

### Frontend Logic:

- `handleAddCode` function implements day range and previous code logic
- `handleUpdateBillingCode` function includes max units validation
- UI components show relevant information and validation feedback

## Usage Examples

### Day Range:

1. Select a billing code with a day range (e.g., 10 days)
2. Set the service start date to June 1
3. The system automatically sets the end date to June 10
4. Visual indicator confirms the 10-day period is correctly applied

### Previous Codes (Type 57):

1. Add a billing code with billing record type 57
2. If the code has previous codes defined, the start date is automatically calculated
3. The system uses the most recent end date from selected previous codes
4. Visual indicator shows "(Uses previous codes)" for clarity

### Max Units:

1. Select a billing code with multiple unit indicator "U"
2. The max units limit is displayed (e.g., "Max: 5")
3. Users cannot exceed this limit through the UI
4. Plus button becomes disabled when limit is reached
