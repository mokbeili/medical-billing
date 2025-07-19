# Services Screens for Mobile App

This document describes the new Services screens that have been added to the mobile app, providing functionality similar to the web app's Services pages.

## Screens Overview

### 1. ServicesScreen (Services List)

- **Location**: `src/screens/ServicesScreen.tsx`
- **Purpose**: Displays a list of all services with filtering and selection capabilities
- **Features**:
  - View all services with patient information, service dates, and billing codes
  - Filter services by patient name, billing number, service date, code, and section
  - Select multiple services for claim creation
  - Create claims from selected services
  - Navigate to edit individual services
  - Add new services

### 2. NewServiceScreen (Create Service)

- **Location**: `src/screens/NewServiceScreen.tsx`
- **Purpose**: Form to create new services
- **Features**:
  - Select physician and patient
  - Create new patients inline
  - Set service date
  - Search and select ICD codes
  - Search and select referring physicians
  - Select health institution
  - Add billing codes via search
  - Write service summary

### 3. EditServiceScreen (Edit Service)

- **Location**: `src/screens/EditServiceScreen.tsx`
- **Purpose**: Form to edit existing services
- **Features**:
  - Pre-populated with existing service data
  - Same form fields as NewServiceScreen
  - Update service information
  - Modify billing codes

### 4. BillingCodeSearchScreen (Billing Code Search)

- **Location**: `src/screens/BillingCodeSearchScreen.tsx`
- **Purpose**: Search and select billing codes
- **Features**:
  - Search billing codes by title or code
  - Display code details with section and jurisdiction
  - Select codes to add to services

## Navigation Structure

```
MainTabs
├── Search (AI Search)
├── Services (ServicesStack)
│   ├── ServicesList (ServicesScreen)
│   ├── NewService (NewServiceScreen)
│   ├── EditService (EditServiceScreen)
│   └── BillingCodeSearch (BillingCodeSearchScreen)
└── Profile
```

## API Integration

The screens use the following API endpoints:

- `servicesAPI.getAll()` - Get all services
- `servicesAPI.getById(id)` - Get specific service
- `servicesAPI.create(data)` - Create new service
- `servicesAPI.update(id, data)` - Update service
- `physiciansAPI.getAll()` - Get all physicians
- `patientsAPI.getAll()` - Get all patients
- `patientsAPI.create(data)` - Create new patient
- `icdCodesAPI.search(query)` - Search ICD codes
- `referringPhysiciansAPI.search(query)` - Search referring physicians
- `healthInstitutionsAPI.getAll()` - Get all health institutions
- `billingCodesAPI.search(query)` - Search billing codes

## Key Features

### Service Selection and Claim Creation

- Users can select multiple services that share the same physician and jurisdiction
- Selected services can be grouped into claims
- Services already claimed are marked and cannot be selected

### Patient Management

- View existing patients
- Create new patients directly from the service form
- Patient validation with required fields

### Billing Code Management

- Search and add billing codes to services
- Remove billing codes from services
- Display code details including section and jurisdiction

### Search and Filtering

- Real-time search for ICD codes and referring physicians
- Filter services by various criteria
- Responsive search results

## Styling

The screens use a consistent design system with:

- Clean, modern UI with cards and proper spacing
- Blue color scheme (#2563eb) for primary actions
- Proper loading states and error handling
- Responsive layouts for different screen sizes

## Usage

1. **View Services**: Navigate to the Services tab to see all services
2. **Create Service**: Tap the "+" button to create a new service
3. **Edit Service**: Tap on any service card to edit it
4. **Create Claims**: Select multiple services and tap "Create Claim"
5. **Filter Services**: Use the filter inputs to find specific services

## Dependencies

- React Navigation for screen navigation
- React Query for data fetching and caching
- React Native Paper for UI components
- Expo Vector Icons for icons
- Axios for API communication
