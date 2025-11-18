# GST Frontend Integration Package

Complete TypeScript/React integration for all GST features including HSN Registry, validation, and portal exports.

## 📦 Package Contents

```
frontend-integration/
├── api/
│   └── gst-client.ts          # API client with all GST endpoints
├── types/
│   └── gst-types.ts           # TypeScript type definitions
├── hooks/
│   ├── useGST.ts              # GST calculation & validation hooks
│   ├── useHSNRegistry.ts      # HSN Registry hooks
│   └── useGSTReturns.ts       # GSTR export & generation hooks
├── components/
│   ├── HSNSearch.tsx          # HSN code search component
│   ├── HSNBrowser.tsx         # HSN chapter browser component
│   ├── GSTINValidator.tsx     # GSTIN validation component
│   └── GSTRExporter.tsx       # GSTR-1/3B export component
├── index.ts                   # Main export file
└── README.md                  # This file
```

## 🚀 Quick Start

### 1. Installation

Copy the `frontend-integration` directory into your frontend project:

```bash
cp -r frontend-integration /path/to/your-frontend/src/lib/gst
```

### 2. Initialize the API Client

In your app's initialization file (e.g., `App.tsx` or `main.tsx`):

```typescript
import { initGSTClient } from '@/lib/gst'

// Initialize with your API base URL and auth token
initGSTClient('http://localhost:3000/api', localStorage.getItem('authToken'))
```

### 3. Use Components

```tsx
import { HSNSearch, GSTINValidator, GSTRExporter } from '@/lib/gst'

function MyComponent() {
  return (
    <div>
      {/* HSN Code Search */}
      <HSNSearch
        onSelect={(code) => console.log('Selected:', code)}
        placeholder="Search for HSN codes..."
      />

      {/* GSTIN Validation */}
      <GSTINValidator
        onValidation={(isValid, info) => {
          console.log('Valid:', isValid, info)
        }}
      />

      {/* GSTR Export */}
      <GSTRExporter returnType="GSTR-1" />
    </div>
  )
}
```

## 📚 API Client

### Initialization

```typescript
import { initGSTClient, getGSTClient } from '@/lib/gst'

// Initialize once
const client = initGSTClient('https://api.yourapp.com', authToken)

// Use anywhere
const client = getGSTClient()
```

### Available Methods

#### GST Calculation
```typescript
const result = await client.calculateGST({
  amount: 10000,
  gstRate: 18,
  supplierState: '27',
  customerState: '29',
  isInclusive: false
})
```

#### Validation
```typescript
// GSTIN
const gstinResult = await client.validateGSTIN('27AAPFU0939F1ZV')

// PAN
const panResult = await client.validatePAN('AAPFU0939F')

// HSN
const hsnResult = await client.validateHSN('847130')

// SAC
const sacResult = await client.validateSAC('998314')
```

#### HSN Registry
```typescript
// Get all chapters
const chapters = await client.getHSNChapters()

// Search codes
const results = await client.searchHSNCodes('laptop')

// Lookup code details
const details = await client.lookupHSN('847130')

// Get codes by chapter
const codes = await client.getHSNCodesByChapter('84')

// Get codes by GST rate
const codes18 = await client.getHSNCodesByRate(18)
```

#### GST Returns
```typescript
// Generate GSTR-1
const gstr1 = await client.generateGSTR1('03-2024')

// Generate GSTR-3B
const gstr3b = await client.generateGSTR3B('03-2024')

// Export for portal
const exportResult = await client.exportGSTR1ForPortal({
  period: '03-2024',
  pretty: true,
  validate: true
})

// Get portal instructions
const instructions = await client.getPortalInstructions('GSTR-1')
```

## 🪝 React Hooks

### useGSTCalculation

```typescript
import { useGSTCalculation } from '@/lib/gst'

function Calculator() {
  const { calculating, result, error, calculate } = useGSTCalculation()

  const handleCalculate = async () => {
    await calculate({
      amount: 10000,
      gstRate: 18,
      supplierState: '27',
      customerState: '29'
    })
  }

  return (
    <div>
      <button onClick={handleCalculate} disabled={calculating}>
        Calculate GST
      </button>
      {result && <div>Total Tax: ₹{result.totalTax}</div>}
      {error && <div>Error: {error}</div>}
    </div>
  )
}
```

### useHSNSearch

```typescript
import { useHSNSearch } from '@/lib/gst'

function SearchComponent() {
  const { searching, results, search } = useHSNSearch()

  return (
    <div>
      <input
        onChange={(e) => search(e.target.value)}
        placeholder="Search HSN codes..."
      />
      {searching && <span>Searching...</span>}
      {results.map(code => (
        <div key={code.code}>
          {code.code} - {code.description}
        </div>
      ))}
    </div>
  )
}
```

### useGSTR1Export

```typescript
import { useGSTR1Export } from '@/lib/gst'

function ExportComponent() {
  const { exporting, result, exportGSTR1, downloadJSON } = useGSTR1Export()

  const handleExport = async () => {
    await exportGSTR1({
      period: '03-2024',
      pretty: true,
      validate: true
    })
  }

  return (
    <div>
      <button onClick={handleExport} disabled={exporting}>
        Export GSTR-1
      </button>
      {result && (
        <button onClick={() => downloadJSON()}>
          Download JSON
        </button>
      )}
    </div>
  )
}
```

## 🎨 Components

### HSNSearch

Search for HSN codes by description with autocomplete.

**Props:**
- `onSelect?: (code: HSNCode) => void` - Called when a code is selected
- `placeholder?: string` - Input placeholder text
- `className?: string` - Additional CSS classes

**Example:**
```tsx
<HSNSearch
  onSelect={(code) => {
    console.log('Selected HSN:', code.code)
    setSelectedHSN(code)
  }}
  placeholder="Search products..."
/>
```

### HSNBrowser

Browse HSN chapters and codes by section.

**Props:**
- `onSelectCode?: (code: HSNCode) => void` - Called when a code is selected
- `className?: string` - Additional CSS classes

**Example:**
```tsx
<HSNBrowser
  onSelectCode={(code) => {
    console.log('Selected:', code)
  }}
/>
```

### GSTINValidator

Validate GSTIN and display information.

**Props:**
- `onValidation?: (isValid: boolean, info?: any) => void` - Validation callback
- `className?: string` - Additional CSS classes

**Example:**
```tsx
<GSTINValidator
  onValidation={(isValid, info) => {
    if (isValid) {
      console.log('State:', info.stateName)
      console.log('PAN:', info.panNumber)
    }
  }}
/>
```

### GSTRExporter

Export GSTR-1 or GSTR-3B for portal upload.

**Props:**
- `returnType: 'GSTR-1' | 'GSTR-3B'` - Type of return to export
- `className?: string` - Additional CSS classes

**Example:**
```tsx
<GSTRExporter returnType="GSTR-1" />
```

## 🎨 Styling

Each component exports its default styles. You can use them or provide your own:

```tsx
// Import component styles
import { hsnSearchStyles } from '@/lib/gst'

// Add to your global styles or component
<style dangerouslySetInnerHTML={{ __html: hsnSearchStyles }} />
```

Or use your own CSS with the provided class names:
- `.hsn-search`
- `.hsn-browser`
- `.gstin-validator`
- `.gstr-exporter`

## 📝 TypeScript Types

All types are fully typed and exported:

```typescript
import type {
  HSNCode,
  HSNChapter,
  GSTCalculationRequest,
  GSTCalculationResponse,
  GSTR1ExportResponse,
  // ... and many more
} from '@/lib/gst'
```

## 🔧 Configuration

### Custom API Base URL

```typescript
// Development
initGSTClient('http://localhost:3000/api', token)

// Production
initGSTClient('https://api.yourapp.com', token)
```

### Auth Token Management

Update the auth token when the user logs in:

```typescript
import { initGSTClient } from '@/lib/gst'

function handleLogin(token: string) {
  localStorage.setItem('authToken', token)
  initGSTClient(API_BASE_URL, token)
}
```

## 🌐 API Endpoints Reference

All endpoints are automatically called by the hooks and components:

### Validation
- `POST /gst/validate-gstin` - Validate GSTIN
- `POST /gst/validate-pan` - Validate PAN
- `POST /gst/validate-hsn` - Validate HSN code
- `POST /gst/validate-sac` - Validate SAC code

### HSN Registry
- `GET /gst/hsn/chapters` - Get all HSN chapters
- `GET /gst/hsn/chapters/:code` - Get specific chapter
- `GET /gst/hsn/search?q=query` - Search HSN codes
- `GET /gst/hsn/:code` - Lookup HSN code details
- `GET /gst/hsn/chapter/:chapter/codes` - Get codes by chapter
- `GET /gst/hsn/rate/:rate` - Get codes by GST rate
- `GET /gst/hsn/codes` - Get all registered codes
- `GET /gst/hsn/stats` - Get registry statistics

### GST Returns
- `POST /gst/returns/gstr1` - Generate GSTR-1
- `POST /gst/returns/gstr3b` - Generate GSTR-3B
- `POST /gst/returns/gstr1/export` - Export GSTR-1 for portal
- `POST /gst/returns/gstr3b/export` - Export GSTR-3B for portal
- `GET /gst/portal/instructions/:returnType` - Get upload instructions

### Calculation
- `POST /gst/calculate` - Calculate GST
- `GET /gst/rates` - Get available GST rates
- `GET /gst/rate/:hsnSac` - Get rate for HSN/SAC code

## 🔍 Example: Complete Invoice Form

```tsx
import { useState } from 'react'
import { HSNSearch, useGSTCalculation, INDIAN_STATES } from '@/lib/gst'

function InvoiceLineItem() {
  const [item, setItem] = useState({
    description: '',
    hsnCode: '',
    quantity: 1,
    unitPrice: 0,
    gstRate: 18
  })

  const { calculate, result } = useGSTCalculation()

  const handleHSNSelect = (code) => {
    setItem(prev => ({
      ...prev,
      hsnCode: code.code,
      description: code.description,
      gstRate: code.gstRate
    }))
  }

  const calculateTotal = async () => {
    const amount = item.quantity * item.unitPrice
    await calculate({
      amount,
      gstRate: item.gstRate,
      supplierState: '27',
      customerState: '29'
    })
  }

  return (
    <div>
      <HSNSearch onSelect={handleHSNSelect} />
      <input
        type="number"
        value={item.quantity}
        onChange={(e) => setItem({ ...item, quantity: +e.target.value })}
      />
      <input
        type="number"
        value={item.unitPrice}
        onChange={(e) => setItem({ ...item, unitPrice: +e.target.value })}
      />
      <button onClick={calculateTotal}>Calculate</button>
      {result && (
        <div>
          <div>Taxable: ₹{result.taxableAmount}</div>
          <div>IGST: ₹{result.igst}</div>
          <div>Total: ₹{result.totalAmount}</div>
        </div>
      )}
    </div>
  )
}
```

## 📱 Framework Integration

### Next.js

```tsx
// app/providers.tsx
'use client'

import { useEffect } from 'react'
import { initGSTClient } from '@/lib/gst'

export function GSTProvider({ children }) {
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    initGSTClient(process.env.NEXT_PUBLIC_API_URL!, token)
  }, [])

  return <>{children}</>
}

// app/layout.tsx
import { GSTProvider } from './providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GSTProvider>{children}</GSTProvider>
      </body>
    </html>
  )
}
```

### Vite/Create React App

```tsx
// main.tsx / index.tsx
import { initGSTClient } from './lib/gst'

const token = localStorage.getItem('authToken')
initGSTClient(import.meta.env.VITE_API_URL, token)

// Now use components anywhere
```

## 🐛 Error Handling

All hooks return error states:

```tsx
const { error, result, calculate } = useGSTCalculation()

if (error) {
  return <div className="error">{error}</div>
}
```

## 📄 License

This integration package is part of the Accounts Management Platform.

## 🤝 Support

For API documentation and backend setup, see the main project README.
