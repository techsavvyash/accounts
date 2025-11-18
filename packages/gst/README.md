# @accounts/gst - GST Compliance Package for India

A comprehensive TypeScript package for handling GST (Goods and Services Tax) calculations, validations, and return generation for Indian businesses.

## Features

✅ **GST Calculations**
- Intra-state (CGST + SGST) and Inter-state (IGST) calculations
- Support for reverse charge mechanism
- Cess calculation
- Line item and invoice-level tax aggregation
- Tax-inclusive and tax-exclusive calculations

✅ **GSTIN Validation**
- 15-character format validation with Luhn algorithm
- State code validation for all 38 Indian states/UTs
- PAN extraction from GSTIN
- HSN/SAC code validation

✅ **GST Returns Generation**
- **GSTR-1**: Outward supplies return (B2B, B2C, B2CL, Exports, HSN Summary)
- **GSTR-3B**: Summary return with tax liability and ITC details
- Portal-ready JSON export for direct upload to GST portal

✅ **Tax Rate Management**
- Standard GST rates (0%, 5%, 12%, 18%, 28%)
- Custom rate configuration per HSN/SAC code
- Rate lookup by HSN/SAC code

## Installation

```bash
bun add @accounts/gst
```

## Quick Start

```typescript
import { GST } from '@accounts/gst'

// 1. Validate GSTIN
const isValid = GST.validateGSTIN('27AAPFU0939F1ZV')
console.log(isValid) // true

// 2. Calculate GST
const taxBreakdown = GST.quickCalculate(
  10000, // amount
  18, // GST rate
  '27', // supplier state (Maharashtra)
  '29', // customer state (Karnataka)
)

console.log(taxBreakdown)
// {
//   taxableAmount: 10000,
//   igst: 1800,
//   cgst: 0,
//   sgst: 0,
//   cess: 0,
//   totalTax: 1800,
//   totalAmount: 11800,
//   isInterState: true
// }

// 3. Generate GSTR-1 Return
const gstr1 = GST.generateGSTR1(
  '27AAPFU0939F1ZV', // your GSTIN
  '032024', // period (MMYYYY)
  invoices // array of GSTInvoice objects
)

// 4. Export as portal-ready JSON
const jsonString = GST.exportGSTR1JSON(gstr1)
// Upload this JSON to GST portal
```

## Core Modules

### 1. GST Calculation

Calculate taxes for individual transactions or invoices:

```typescript
import { GSTCalculator } from '@accounts/gst'

// Simple tax calculation
const result = GSTCalculator.calculateTax({
  amount: 10000,
  gstRate: 18,
  isInclusive: false,
  applyReverseCharge: false,
  isInterState: true,
  cessRate: 0
})

// Invoice-level calculation
const invoice: GSTInvoice = {
  invoiceNumber: 'INV-001',
  invoiceDate: new Date('2024-03-15'),
  invoiceType: GSTInvoiceType.TAX_INVOICE,
  transactionType: GSTTransactionType.B2B,
  placeOfSupply: '29',
  supplierGSTIN: '27AAPFU0939F1ZV',
  supplierName: 'ABC Corp',
  supplierAddress: 'Mumbai, Maharashtra',
  supplierState: '27',
  customerGSTIN: '29BBBBB1234C1Z5',
  customerName: 'XYZ Ltd',
  customerAddress: 'Bangalore, Karnataka',
  customerState: '29',
  lineItems: [
    {
      serialNo: 1,
      description: 'Laptop',
      hsnSac: '84713000',
      quantity: 2,
      unit: 'NOS',
      unitPrice: 50000,
      discount: 0,
      gstRate: 18,
      cessRate: 0,
      isService: false
    }
  ],
  reverseCharge: false
}

const invoiceCalc = GSTCalculator.calculateInvoiceTax(invoice)
```

### 2. GSTIN Validation

Validate and extract information from GSTIN:

```typescript
import { GSTINValidator } from '@accounts/gst'

// Validate GSTIN
const isValid = GSTINValidator.validate('27AAPFU0939F1ZV')

// Extract GSTIN information
const info = GSTINValidator.extract('27AAPFU0939F1ZV')
console.log(info)
// {
//   stateCode: '27',
//   stateName: 'Maharashtra',
//   pan: 'AAPFU0939F',
//   entityNumber: '1',
//   checkDigit: 'V'
// }

// Generate check digit for GSTIN
const checkDigit = GSTINValidator.generateCheckDigit('27AAPFU0939F1Z')
```

### 3. GSTR-1 Generation

Generate GSTR-1 return for outward supplies:

```typescript
import { GSTReturnGenerator } from '@accounts/gst'

const invoices: GSTInvoice[] = [
  // ... your invoices
]

// Generate GSTR-1
const gstr1 = GSTReturnGenerator.generateGSTR1(
  '27AAPFU0939F1ZV', // your GSTIN
  '032024', // period MMYYYY (March 2024)
  invoices
)

// Validate the return
const validation = GSTReturnGenerator.validateGSTR1(gstr1)
if (!validation.isValid) {
  console.error('GSTR-1 Validation Errors:', validation.errors)
}

// Export as JSON for portal upload
const json = GSTReturnGenerator.exportGSTR1JSON(gstr1)

// Save to file
import { writeFileSync } from 'fs'
writeFileSync('GSTR1_032024.json', json)
```

#### GSTR-1 Structure

GSTR-1 includes the following sections:

- **b2b**: Business to Business supplies (with customer GSTIN)
- **b2cl**: Business to Consumer Large (invoice value > ₹2.5 lakh for inter-state)
- **b2cs**: Business to Consumer Small (aggregated supplies)
- **exp**: Export invoices
- **cdnr**: Credit/Debit notes (registered)
- **cdnur**: Credit/Debit notes (unregistered)
- **nil**: Nil rated, exempted, and non-GST supplies
- **hsn**: HSN/SAC-wise summary of outward supplies

### 4. GSTR-3B Generation

Generate GSTR-3B summary return:

```typescript
import { GSTReturnGenerator } from '@accounts/gst'

const gstr3b = GSTReturnGenerator.generateGSTR3B(
  '27AAPFU0939F1ZV', // your GSTIN
  '032024', // period MMYYYY
  {
    // Outward supplies (from GSTR-1)
    taxable: 1000000,
    igst: 90000,
    cgst: 45000,
    sgst: 45000,
    cess: 0
  },
  {
    // Inward supplies liable to reverse charge
    reverseCharge: {
      taxable: 50000,
      igst: 9000,
      cgst: 0,
      sgst: 0,
      cess: 0
    }
  },
  {
    // Input Tax Credit (ITC)
    available: {
      igst: 80000,
      cgst: 40000,
      sgst: 40000,
      cess: 0
    },
    reversed: {
      igst: 5000,
      cgst: 2500,
      sgst: 2500,
      cess: 0
    }
  }
)

// Validate GSTR-3B
const validation = GSTReturnGenerator.validateGSTR3B(gstr3b)

// Export as JSON
const json = GSTReturnGenerator.exportGSTR3BJSON(gstr3b)
writeFileSync('GSTR3B_032024.json', json)
```

## GST Portal Integration

### Uploading JSON Files to GST Portal

1. **Login to GST Portal**: Visit https://www.gst.gov.in/ and login with your credentials

2. **Navigate to Returns**:
   - For GSTR-1: Services > Returns > Returns Dashboard > Select Period > GSTR-1
   - For GSTR-3B: Services > Returns > Returns Dashboard > Select Period > GSTR-3B

3. **Upload JSON File**:
   - Click on "PREPARE OFFLINE"
   - Click "UPLOAD" tab
   - Select "CHOOSE FILE" and select the generated JSON file
   - Click "UPLOAD"

4. **Verify Data**: Review the uploaded data in the online form

5. **Submit Return**: After verification, submit the return with DSC/EVC

### Official GST Portal Resources

- **GST Portal**: https://www.gst.gov.in/
- **GST Developer API Portal**: https://developer.gst.gov.in/apiportal/
- **Offline Tools**: https://www.gst.gov.in/download/returns
- **GSTR-1 Tutorial**: https://tutorial.gst.gov.in/userguide/returns/GSTR_1.htm
- **GSTR-3B Tutorial**: https://tutorial.gst.gov.in/userguide/returns/index.htm

### JSON Format Specifications

The JSON format generated by this package conforms to the official GSTN API specifications:

- **GSTR-1 API Schema**: Available at GST Developer Portal under Taxpayer API > Returns
- **GSTR-3B API Schema**: Available at GST Developer Portal under Taxpayer API > Returns
- **Offline Tool Templates**: Download from https://www.gst.gov.in/download/returns

### Important Notes for Portal Upload

1. **Return Period Format**: Always use `MMYYYY` format (e.g., `032024` for March 2024)
2. **Date Format**: Dates in JSON must be in `DD-MM-YYYY` format
3. **Amount Format**: All amounts are in rupees with up to 2 decimal places
4. **GSTIN Format**: Must be valid 15-character GSTIN
5. **HSN/SAC Codes**: Report in 4, 6, or 8 digits as per GST rules (2024 onwards)
6. **State Codes**: Use 2-digit state codes as per GST state code list

## Advanced Usage

### Custom GST Rates

Set custom GST rates for specific HSN/SAC codes:

```typescript
import { GSTRateManager } from '@accounts/gst'

// Set custom rate for HSN 84713000 (Laptops)
GSTRateManager.setCustomRate('84713000', 18)

// Get rate for HSN code
const rate = GSTRateManager.getRate('84713000')

// Get all standard rates
const standardRates = GSTRateManager.getAllStandardRates()

// Clear custom rates
GSTRateManager.clearCustomRates()
```

### HSN and SAC Validation

```typescript
import { HSNValidator, SACValidator } from '@accounts/gst'

// Validate HSN code (2-8 digits)
const isValidHSN = HSNValidator.validate('84713000')

// Get HSN chapter info
const hsnInfo = HSNValidator.getChapterInfo('84713000')
console.log(hsnInfo)
// { chapter: '84', description: 'Nuclear reactors, boilers, machinery...' }

// Get detailed HSN information including GST rate
const detailedInfo = HSNValidator.getDetailedInfo('84713000')
console.log(detailedInfo)
// {
//   code: '84713000',
//   description: 'Portable automatic data processing machines, weighing not more than 10 kg (Laptops)',
//   chapterDescription: 'Nuclear Reactors, Boilers, Machinery and Mechanical Appliances; Parts Thereof',
//   gstRate: 18,
//   unit: 'NOS'
// }

// Search HSN codes
const results = HSNValidator.search('laptop')
// Returns array of matching HSN codes

// Validate SAC code (6 digits)
const isValidSAC = SACValidator.validate('998314')

// Get SAC category info
const sacInfo = SACValidator.getCategoryInfo('998314')
```

### HSN Registry

The package includes a comprehensive HSN (Harmonized System of Nomenclature) Registry with:
- **All 99 HSN Chapters** with descriptions
- **100+ Common HSN Codes** (4, 6, and 8-digit codes)
- **GST Rate Recommendations** for each code
- **Cess Information** for applicable items
- **Unit of Measurement** (NOS, KGM, etc.)

#### Using the HSN Registry

```typescript
import { HSNRegistry } from '@accounts/gst'

// Get all HSN chapters
const chapters = HSNRegistry.getAllChapters()
console.log(`Total chapters: ${chapters.length}`) // 99

// Get specific chapter
const chapter = HSNRegistry.getChapter('84')
console.log(chapter.description)
// 'Nuclear Reactors, Boilers, Machinery and Mechanical Appliances; Parts Thereof'

// Lookup HSN code with details
const hsnInfo = HSNRegistry.lookup('84713000')
console.log(hsnInfo)
// {
//   isValid: true,
//   code: '84713000',
//   description: 'Portable automatic data processing machines, weighing not more than 10 kg (Laptops)',
//   gstRate: 18,
//   unit: 'NOS',
//   chapterDescription: '...'
// }

// Get recommended GST rate for any HSN code
const rate = HSNRegistry.getRecommendedGSTRate('84713000')
console.log(rate) // 18

// Search HSN codes by description
const laptops = HSNRegistry.searchByDescription('laptop')
console.log(laptops)
// [
//   { code: '84713000', description: 'Portable automatic data processing machines...', gstRate: 18 },
//   ...
// ]

// Get all HSN codes for a chapter
const chapter84Codes = HSNRegistry.getByChapter('84')
console.log(chapter84Codes.length)

// Get all HSN codes by GST rate
const items18Percent = HSNRegistry.getByGSTRate(18)
console.log(items18Percent.length)

// Get chapters by section
const section16 = HSNRegistry.getChaptersBySection('XVI')
// Returns machinery and electrical equipment chapters

// Get detailed information
const details = HSNRegistry.getDetails('870323')
console.log(details)
// {
//   code: '870323',
//   chapter: { code: '87', description: '...', section: 'XVII' },
//   details: {
//     code: '870323',
//     description: 'Vehicles with spark-ignition...',
//     gstRate: 28,
//     cess: 17,
//     unit: 'NOS'
//   },
//   recommendedGSTRate: 28
// }

// Get registry statistics
const stats = HSNRegistry.getCount()
console.log(stats)
// { chapters: 99, codes: 100+ }
```

#### HSN Code Examples

The registry includes common items across all categories:
- **Food Items**: Rice (1006), Wheat (1001), Milk (0401), etc.
- **Textiles**: Cotton fabrics (52), Apparel (61, 62), Footwear (64)
- **Electronics**: Laptops (847130), Mobile phones (851712), Printers (844331)
- **Automobiles**: Cars (8703), Motorcycles (8711), Bicycles (8712)
- **Pharmaceuticals**: Medicines (30), with 12% GST
- **Cosmetics**: Perfumes (3303), Makeup (3304), Soaps (3401)
- **Furniture**: Office furniture (940330), Bedroom furniture (940350)

#### Integration with GST Calculations

```typescript
// HSN Registry automatically provides GST rates for calculations
const hsn = '847130' // Laptop
const rate = HSNRegistry.getRecommendedGSTRate(hsn)

const tax = GST.quickCalculate(
  50000,  // amount
  rate,   // uses HSN-recommended rate (18%)
  '27',   // supplier state
  '29'    // customer state
)

// The calculator automatically uses HSN registry when HSN is provided
const taxWithHSN = GST.getGSTInfo(50000, '847130', '27', '29')
console.log(taxWithHSN)
// {
//   applicableRate: 18,
//   calculation: { taxableAmount: 50000, igst: 9000, ... },
//   hsnInfo: { chapter: '84', description: '...' },
//   isInterState: true
// }
```

#### HSN API Integration (NEW!)

The HSN Registry now supports **external API integration** with automatic fallback to hard-coded data!

**Features:**
- ✅ Works out-of-the-box with hard-coded HSN data (no setup required)
- ✅ Optional API integration for comprehensive HSN coverage
- ✅ Supports multiple API providers with priority ordering
- ✅ Automatic fallback to hard-coded data if APIs fail
- ✅ Built-in caching to reduce API calls and costs
- ✅ Easy to extend with custom providers

**Supported API Providers:**

1. **E-way Bill Government API** (Priority 1)
   - Official Government of India API
   - Requires GST registration and API credentials
   - Free for registered taxpayers
   - Docs: https://docs.ewaybillgst.gov.in/apidocs/

2. **Sandbox.co.in** (Priority 2)
   - Third-party Tax API provider
   - 14-day free trial, then paid subscription
   - Docs: https://developer.sandbox.co.in/

**Quick Setup:**

```typescript
import {
  HSNRegistry,
  createEWayBillProvider,
  createSandboxProvider
} from '@accounts/gst'

// Auto-configure from environment variables
const ewayProvider = createEWayBillProvider()
const sandboxProvider = createSandboxProvider()

if (ewayProvider) HSNRegistry.registerProvider(ewayProvider)
if (sandboxProvider) HSNRegistry.registerProvider(sandboxProvider)

// Now use async lookup to get data from API with fallback
const hsnData = await HSNRegistry.lookupAsync('8471')
console.log(hsnData)
// {
//   isValid: true,
//   code: '8471',
//   description: '...',
//   gstRate: 18,
//   source: 'api',        // or 'cache' or 'fallback'
//   provider: 'ewaybill'  // which provider was used
// }
```

**Environment Variables:**

Create a `.env` file (see `.env.example` for full documentation):

```bash
# E-way Bill API
EWAYBILL_ENABLED=true
EWAYBILL_USERNAME=your_username
EWAYBILL_PASSWORD=your_password
EWAYBILL_APP_KEY=your_app_key
EWAYBILL_GSTIN=your_gstin

# Sandbox.co.in API
SANDBOX_ENABLED=true
SANDBOX_API_KEY=your_api_key
SANDBOX_API_SECRET=your_api_secret
```

**Manual Configuration:**

```typescript
import { EWayBillProvider, SandboxProvider, HSNRegistry } from '@accounts/gst'

// Configure E-way Bill provider
const ewayProvider = new EWayBillProvider({
  enabled: true,
  priority: 1,  // Higher priority (tried first)
  baseURL: 'https://api.ewaybillgst.gov.in',
  username: 'your_username',
  password: 'your_password',
  appKey: 'your_app_key',
  gstin: 'your_gstin',
  cacheEnabled: true,
  cacheTTL: 24 * 60 * 60 * 1000  // 24 hours
})

// Configure Sandbox provider
const sandboxProvider = new SandboxProvider({
  enabled: true,
  priority: 2,  // Lower priority (fallback)
  baseURL: 'https://api.sandbox.co.in/v2',
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret',
  cacheEnabled: true
})

// Register providers
HSNRegistry.registerProvider(ewayProvider)
HSNRegistry.registerProvider(sandboxProvider)
```

**Usage:**

```typescript
// Async lookup (tries API first, then fallback)
const result = await HSNRegistry.lookupAsync('8471')
console.log(result.source)  // 'api', 'cache', or 'fallback'
console.log(result.provider)  // 'ewaybill', 'sandbox', or undefined

// API-only mode (no fallback)
const apiOnly = await HSNRegistry.lookupAsync('8471', true)

// Sync lookup (hard-coded data only, backward compatible)
const syncResult = HSNRegistry.lookup('8471')

// Manage cache
const provider = HSNRegistry.getProviders()[0]
console.log(provider.getCacheSize())
provider.clearCache()
```

**How it Works:**

1. **Try API Providers** (in priority order)
   - E-way Bill API (priority 1)
   - Sandbox API (priority 2)
   - Returns cached result if available

2. **Fallback to Hard-coded Data**
   - If all APIs fail or return null
   - Uses the built-in HSN registry
   - Always works, even without API credentials

3. **Caching Layer**
   - Reduces API calls and costs
   - Configurable TTL (default: 24 hours)
   - Improves performance

**Benefits:**

- **Zero Setup**: Works immediately with hard-coded data
- **Comprehensive Coverage**: API provides all 100,000+ HSN codes
- **Reliable**: Automatic fallback ensures your app always works
- **Cost-Effective**: Caching reduces API calls
- **Extensible**: Easy to add your own API providers

**Example: Custom Provider**

Create your own HSN API provider:

```typescript
import { HSNAPIProvider, HSNLookupResult, HSNProviderConfig } from '@accounts/gst'

class MyCustomProvider extends HSNAPIProvider {
  getName(): string {
    return 'my-custom-provider'
  }

  protected async fetchFromAPI(code: string): Promise<HSNLookupResult | null> {
    const response = await fetch(`https://my-api.com/hsn/${code}`)
    const data = await response.json()

    return {
      code: data.hsn_code,
      description: data.description,
      gstRate: data.gst_rate,
      source: 'api',
      provider: this.getName()
    }
  }
}

// Register your provider
const myProvider = new MyCustomProvider({
  enabled: true,
  priority: 1
})
HSNRegistry.registerProvider(myProvider)
```

See `examples/07-hsn-api-integration.ts` for complete examples.

### Batch Calculations

Calculate GST for multiple items at once:

```typescript
const items = [
  { amount: 10000, gstRate: 18, description: 'Laptop', hsnSac: '84713000' },
  { amount: 5000, gstRate: 12, description: 'Mobile', hsnSac: '85171200' },
  { amount: 2000, gstRate: 5, description: 'Book', hsnSac: '49011000' }
]

const results = GST.batchCalculate(items, '27', '29')
```

### Reverse GST Calculation

Calculate base amount from tax-inclusive amount:

```typescript
const reverseCalc = GSTCalculator.calculateReverseGST(11800, 18, true)
console.log(reverseCalc)
// {
//   taxableAmount: 10000,
//   igst: 1800,
//   totalTax: 1800,
//   totalAmount: 11800
// }
```

### Composite Rate Calculation

For composition scheme taxpayers:

```typescript
const compositeRate = GSTCalculator.calculateCompositeRate(100000, 1) // 1% for traders
console.log(compositeRate)
// {
//   taxableAmount: 100000,
//   tax: 1000,
//   totalAmount: 101000
// }
```

## API Reference

### Main GST Class

The `GST` class provides a unified interface to all functionality:

#### Validation Methods
- `validateGSTIN(gstin: string): boolean`
- `extractGSTINInfo(gstin: string): GSTINInfo`
- `validatePAN(pan: string): boolean`
- `validateHSN(hsn: string): boolean`
- `validateSAC(sac: string): boolean`

#### Calculation Methods
- `calculateTax(input: TaxCalculationInput): TaxBreakdown`
- `calculateLineItemTax(item: GSTInvoiceLineItem, isInterState: boolean): TaxBreakdown`
- `calculateInvoiceTax(invoice: GSTInvoice): InvoiceCalculation`
- `calculateReverseGST(amount: number, gstRate: number, isInterState: boolean): TaxBreakdown`
- `quickCalculate(amount, gstRate, supplierState, customerState, options?): TaxBreakdown`

#### Return Generation Methods
- `generateGSTR1(gstin: string, period: string, invoices: GSTInvoice[]): GSTR1Return`
- `generateGSTR3B(gstin, period, outwardSupplies, inwardSupplies, itcData): GSTR3BReturn`
- `validateGSTR1(gstr1: GSTR1Return): ValidationResult`
- `validateGSTR3B(gstr3b: GSTR3BReturn): ValidationResult`
- `exportGSTR1JSON(gstr1: GSTR1Return): string`
- `exportGSTR3BJSON(gstr3b: GSTR3BReturn): string`

#### Utility Methods
- `isIntraState(state1: string, state2: string): boolean`
- `getStateName(stateCode: string): string`
- `isValidStateCode(code: string): boolean`
- `formatAmount(amount: number): number`
- `formatGSTDate(date: Date): string`
- `formatReturnPeriod(month: number, year: number): string`
- `isValidReturnPeriod(period: string): boolean`

For detailed type definitions, see the [TypeScript types](./src/types.ts).

## GST Compliance Notes

### GSTR-1 Filing Requirements

- **Frequency**: Monthly for taxpayers with turnover > ₹5 crores, Quarterly for others
- **Due Date**: 11th of next month (monthly), 13th of month following quarter (quarterly)
- **Mandatory Sections**: B2B, B2CL (>₹2.5L inter-state), HSN Summary (≥4 digits for turnover >₹5Cr)

### GSTR-3B Filing Requirements

- **Frequency**: Monthly
- **Due Date**: 20th of next month (can vary, check GST portal)
- **Key Sections**: Outward supplies, ITC claimed, Tax payment

### Recent Updates (2024-2025)

1. **HSN Summary Changes** (Effective Jan 2025):
   - Table 12 now split into B2B and B2C tabs
   - Mandatory dropdown selection for HSN codes
   - Validation against invoice data

2. **B2CL Threshold** (Effective Aug 2024):
   - Inter-state B2C invoices > ₹1 lakh (changed from ₹2.5 lakh)

3. **E-Invoicing**:
   - Mandatory for businesses with turnover > ₹5 crores
   - Separate from GSTR-1 but data can be auto-populated

## Error Handling

The package provides specific error classes:

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
    console.error('GSTIN validation failed:', error.message)
    console.error('Error code:', error.code)
    console.error('Details:', error.details)
  }
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  GSTInvoice,
  GSTInvoiceLineItem,
  GSTR1Return,
  GSTR3BReturn,
  TaxBreakdown,
  GSTTransactionType,
  GSTInvoiceType
} from '@accounts/gst'
```

## Testing

```bash
bun test
```

## Examples

See the [examples directory](./examples/) for complete working examples:

- [Basic GST calculation](./examples/01-basic-calculation.ts)
- [Invoice tax calculation](./examples/02-invoice-calculation.ts)
- [GSTR-1 generation](./examples/03-gstr1-generation.ts)
- [GSTR-3B generation](./examples/04-gstr3b-generation.ts)
- [Complete workflow](./examples/05-complete-workflow.ts)

## Contributing

Contributions are welcome! Please ensure:
1. All tests pass
2. Code follows TypeScript best practices
3. GST compliance is maintained as per latest rules

## License

MIT

## Disclaimer

This package is designed to assist with GST compliance but should not be considered as legal or tax advice. Always consult with a qualified tax professional for your specific GST requirements. The maintainers are not responsible for any errors or compliance issues arising from the use of this package.

## Support

For issues and questions:
- GitHub Issues: [Create an issue](../../issues)
- Documentation: This README and inline code documentation
- Official GST Portal Help: https://selfservice.gstsystem.in/

## Changelog

### Version 1.0.0
- ✅ Complete GST calculation engine
- ✅ GSTIN, PAN, HSN, SAC validation
- ✅ GSTR-1 and GSTR-3B generation
- ✅ Portal-ready JSON export
- ✅ Comprehensive TypeScript types
- ✅ Full test coverage
