# GST Package API Reference

Quick reference guide for the @accounts/gst package.

## Table of Contents

- [Validation](#validation)
- [Calculation](#calculation)
- [Returns Generation](#returns-generation)
- [Portal Integration](#portal-integration)
- [Utilities](#utilities)
- [Types](#types)

---

## Validation

### GSTIN Validation

```typescript
import { GST, GSTINValidator } from '@accounts/gst'

// Validate GSTIN format and checksum
const isValid = GST.validateGSTIN('27AAPFU0939F1ZV')
// or
const isValid = GSTINValidator.validate('27AAPFU0939F1ZV')
// Returns: boolean

// Extract GSTIN information
const info = GST.extractGSTINInfo('27AAPFU0939F1ZV')
// Returns: {
//   stateCode: '27',
//   stateName: 'Maharashtra',
//   pan: 'AAPFU0939F',
//   entityNumber: '1',
//   checkDigit: 'V'
// }

// Generate check digit for GSTIN
const checkDigit = GST.generateGSTINCheckDigit('27AAPFU0939F1Z')
// Returns: 'V'
```

### PAN Validation

```typescript
import { GST, PANValidator } from '@accounts/gst'

// Validate PAN format
const isValid = GST.validatePAN('AAPFU0939F')
// Returns: boolean

// Extract PAN information
const info = GST.extractPANInfo('AAPFU0939F')
// Returns: {
//   entityType: 'F' (Individual),
//   isValid: true
// }
```

### HSN/SAC Validation

```typescript
import { GST, HSNValidator, SACValidator } from '@accounts/gst'

// Validate HSN code (2-8 digits)
const isValidHSN = GST.validateHSN('84713000')
// Returns: boolean

// Get HSN chapter information
const hsnInfo = GST.getHSNChapterInfo('84713000')
// Returns: { chapter: '84', description: '...' }

// Validate SAC code (6 digits)
const isValidSAC = GST.validateSAC('998314')
// Returns: boolean

// Get SAC category information
const sacInfo = GST.getSACCategoryInfo('998314')
// Returns: { category: '99', description: '...' }
```

---

## Calculation

### Basic Tax Calculation

```typescript
import { GST, GSTCalculator } from '@accounts/gst'

// Quick calculation (recommended for simple use)
const result = GST.quickCalculate(
  10000,  // amount
  18,     // GST rate
  '27',   // supplier state
  '29',   // customer state
  {
    isInclusive: false,        // optional
    cessRate: 0,               // optional
    applyReverseCharge: false  // optional
  }
)

// Returns: TaxBreakdown
// {
//   taxableAmount: 10000,
//   cgst: 0,
//   sgst: 0,
//   igst: 1800,
//   cess: 0,
//   totalTax: 1800,
//   totalAmount: 11800,
//   gstRate: 18,
//   isInterState: true,
//   isInclusive: false
// }

// Advanced calculation
const result = GSTCalculator.calculateTax({
  amount: 10000,
  gstRate: 18,
  isInclusive: false,
  applyReverseCharge: false,
  isInterState: true,
  cessRate: 0
})
```

### Invoice Calculation

```typescript
import { GSTCalculator, GSTInvoice } from '@accounts/gst'

const invoice: GSTInvoice = {
  invoiceNumber: 'INV-001',
  invoiceDate: new Date(),
  invoiceType: GSTInvoiceType.TAX_INVOICE,
  transactionType: GSTTransactionType.B2B,
  placeOfSupply: '29',

  supplierGSTIN: '27AAPFU0939F1ZV',
  supplierName: 'ABC Corp',
  supplierAddress: 'Mumbai',
  supplierState: '27',

  customerGSTIN: '29BBBBB1234C1Z5',
  customerName: 'XYZ Ltd',
  customerAddress: 'Bangalore',
  customerState: '29',

  lineItems: [
    {
      serialNo: 1,
      description: 'Product',
      hsnSac: '84713000',
      quantity: 1,
      unit: 'NOS',
      unitPrice: 10000,
      discount: 0,
      gstRate: 18,
      cessRate: 0,
      isService: false
    }
  ],

  reverseCharge: false
}

const calculation = GSTCalculator.calculateInvoiceTax(invoice)
// Returns: InvoiceCalculation with lineItemCalculations and totals
```

### Batch Calculation

```typescript
import { GST } from '@accounts/gst'

const items = [
  { amount: 10000, gstRate: 18, description: 'Laptop' },
  { amount: 5000, gstRate: 12, description: 'Accessories' }
]

const results = GST.batchCalculate(items, '27', '29')
// Returns: Array<TaxBreakdown>
```

### Reverse GST Calculation

```typescript
import { GSTCalculator } from '@accounts/gst'

// Find base amount from tax-inclusive total
const result = GSTCalculator.calculateReverseGST(
  11800,  // total amount with GST
  18,     // GST rate
  true    // is inter-state
)
// Returns: { taxableAmount: 10000, igst: 1800, ... }
```

---

## Returns Generation

### GSTR-1 Generation

```typescript
import { GST, GSTReturnGenerator } from '@accounts/gst'

// Generate GSTR-1
const gstr1 = GST.generateGSTR1(
  '27AAPFU0939F1ZV',  // GSTIN
  '032024',           // Period (MMYYYY)
  invoices            // Array of GSTInvoice
)

// Validate GSTR-1
const validation = GST.validateGSTR1(gstr1)
// Returns: { isValid: boolean, errors: string[] }

// Export as JSON
const json = GST.exportGSTR1JSON(gstr1)
// Returns: string (JSON)
```

### GSTR-3B Generation

```typescript
import { GST, GSTReturnGenerator } from '@accounts/gst'

// Generate GSTR-3B
const gstr3b = GST.generateGSTR3B(
  '27AAPFU0939F1ZV',  // GSTIN
  '032024',           // Period (MMYYYY)
  {
    // Outward supplies
    taxable: 1000000,
    igst: 180000,
    cgst: 0,
    sgst: 0,
    cess: 0
  },
  {
    // Inward supplies (reverse charge)
    reverseCharge: {
      taxable: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0
    }
  },
  {
    // ITC data
    available: {
      igst: 150000,
      cgst: 0,
      sgst: 0,
      cess: 0
    },
    reversed: {
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0
    }
  }
)

// Validate GSTR-3B
const validation = GST.validateGSTR3B(gstr3b)

// Export as JSON
const json = GST.exportGSTR3BJSON(gstr3b)
```

---

## Portal Integration

### Export Portal-Ready Files

```typescript
import { GSTPortalHelper } from '@accounts/gst'
import { writeFileSync } from 'fs'

// Export GSTR-1 for portal upload
const result = GSTPortalHelper.exportGSTR1ForPortal(gstr1, {
  pretty: true,     // Format JSON (default: true)
  validate: true    // Validate before export (default: true)
})

// Save to file
writeFileSync(result.filename, result.json)

console.log('Filename:', result.filename)
console.log('Size:', result.size, 'bytes')
console.log('Valid:', result.validation?.isValid)
console.log('Summary:', result.summary)

// Export GSTR-3B for portal upload
const result = GSTPortalHelper.exportGSTR3BForPortal(gstr3b)
writeFileSync(result.filename, result.json)
```

### Generate Complete Package

```typescript
import { GSTPortalHelper } from '@accounts/gst'

const pkg = GSTPortalHelper.generatePortalPackage(gstr1, gstr3b)

// Save both files
writeFileSync(pkg.gstr1.filename, pkg.gstr1.json)
writeFileSync(pkg.gstr3b.filename, pkg.gstr3b.json)

console.log('Package Summary:', pkg.packageSummary)
```

### Upload Instructions

```typescript
import { GSTPortalHelper } from '@accounts/gst'

// Print step-by-step upload instructions
GSTPortalHelper.printUploadInstructions('GSTR-1')
GSTPortalHelper.printUploadInstructions('GSTR-3B')

// Validate file size
const sizeCheck = GSTPortalHelper.validateFileSize(result.size)
console.log(sizeCheck.message)
```

---

## Utilities

### State Utilities

```typescript
import { GST, GSTUtils } from '@accounts/gst'

// Check if intra-state transaction
const isIntra = GST.isIntraState('27', '27')
// Returns: true

// Get state name from code
const stateName = GST.getStateName('27')
// Returns: 'Maharashtra'

// Validate state code
const isValid = GST.isValidStateCode('27')
// Returns: true
```

### Date and Amount Formatting

```typescript
import { GST, GSTUtils } from '@accounts/gst'

// Format date for GST (DD-MM-YYYY)
const formatted = GST.formatGSTDate(new Date('2024-03-15'))
// Returns: '15-03-2024'

// Format return period
const period = GST.formatReturnPeriod(3, 2024)
// Returns: '032024'

// Validate return period
const isValid = GST.isValidReturnPeriod('032024')
// Returns: true

// Format amount (2 decimal places)
const amount = GST.formatAmount(1234.567)
// Returns: 1234.57
```

### Rate Management

```typescript
import { GST, GSTRateManager } from '@accounts/gst'

// Set custom GST rate for HSN/SAC
GST.setCustomGSTRate('84713000', 18)

// Get rate for HSN/SAC
const rate = GST.getGSTRate('84713000')
// Returns: 18

// Get all standard rates
const rates = GST.getAllStandardGSTRates()
// Returns: { EXEMPT: 0, GST_5: 5, GST_12: 12, GST_18: 18, GST_28: 28 }

// Clear custom rates
GST.clearCustomGSTRates()
```

---

## Types

### Main Types

```typescript
import type {
  // Invoice Types
  GSTInvoice,
  GSTInvoiceLineItem,
  GSTInvoiceType,
  GSTTransactionType,

  // Calculation Types
  TaxCalculationInput,
  TaxBreakdown,

  // Return Types
  GSTR1Return,
  GSTR3BReturn,
  GSTR1B2BEntry,
  GSTR1B2CLEntry,
  GSTR1B2CSEntry,
  GSTR1ExportEntry,
  GSTR1HSNEntry,

  // Error Types
  GSTError,
  GSTINValidationError,
  TaxCalculationError,
  ReturnGenerationError,

  // Portal Types
  PortalFileOptions,
  PortalFileResult
} from '@accounts/gst'
```

### Enums

```typescript
// Invoice Types
enum GSTInvoiceType {
  TAX_INVOICE = 'Tax Invoice',
  BILL_OF_SUPPLY = 'Bill of Supply',
  CREDIT_NOTE = 'Credit Note',
  DEBIT_NOTE = 'Debit Note',
  EXPORT_INVOICE = 'Export Invoice',
  SEZ_INVOICE = 'SEZ Invoice'
}

// Transaction Types
enum GSTTransactionType {
  B2B = 'B2B',        // Business to Business
  B2C = 'B2C',        // Business to Consumer
  B2CL = 'B2CL',      // B2C Large (>₹2.5L inter-state)
  EXPORT = 'EXP',     // Export
  SEZ = 'SEZWP',      // SEZ with payment
  SEZWOP = 'SEZWOP',  // SEZ without payment
  DEEMED_EXPORT = 'DEXP',
  IMPORT = 'IMP'
}

// Return Types
enum GSTReturnType {
  GSTR1 = 'GSTR1',
  GSTR3B = 'GSTR3B',
  GSTR2A = 'GSTR2A',
  GSTR2B = 'GSTR2B',
  GSTR4 = 'GSTR4',
  GSTR9 = 'GSTR9',
  GSTR9C = 'GSTR9C'
}
```

### Constants

```typescript
// Standard GST Rates
const GST_RATES = {
  EXEMPT: 0,
  GST_5: 5,
  GST_12: 12,
  GST_18: 18,
  GST_28: 28
}

// State Codes
const GST_STATE_CODES = {
  '01': 'Jammu and Kashmir',
  '07': 'Delhi',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '33': 'Tamil Nadu',
  // ... all 38 states/UTs
}
```

---

## Error Handling

```typescript
import {
  GSTError,
  GSTINValidationError,
  TaxCalculationError,
  ReturnGenerationError
} from '@accounts/gst'

try {
  const result = GST.validateGSTIN('INVALID')
} catch (error) {
  if (error instanceof GSTINValidationError) {
    console.error('GSTIN Error:', error.message)
    console.error('Code:', error.code)
    console.error('Details:', error.details)
  } else if (error instanceof GSTError) {
    console.error('GST Error:', error.message)
  }
}
```

---

## Complete Example

```typescript
import { GST, GSTPortalHelper } from '@accounts/gst'
import { writeFileSync } from 'fs'

// 1. Validate GSTIN
const isValid = GST.validateGSTIN('27AAPFU0939F1ZV')

// 2. Calculate tax
const tax = GST.quickCalculate(10000, 18, '27', '29')

// 3. Generate returns
const gstr1 = GST.generateGSTR1('27AAPFU0939F1ZV', '032024', invoices)
const gstr3b = GST.generateGSTR3B('27AAPFU0939F1ZV', '032024', ...)

// 4. Export for portal
const result = GSTPortalHelper.exportGSTR1ForPortal(gstr1)
writeFileSync(result.filename, result.json)

// 5. Print upload instructions
GSTPortalHelper.printUploadInstructions('GSTR-1')
```

---

## Official Resources

- **GST Portal**: https://www.gst.gov.in/
- **Developer Portal**: https://developer.gst.gov.in/apiportal/
- **Offline Tools**: https://www.gst.gov.in/download/returns
- **Tutorials**: https://tutorial.gst.gov.in/

---

For detailed documentation, see [README.md](./README.md)
