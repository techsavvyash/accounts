# GST Package Examples

This directory contains comprehensive examples demonstrating all features of the @accounts/gst package.

## Running Examples

All examples are written in TypeScript and can be run using Bun:

```bash
# From the packages/gst directory
bun run examples/01-basic-calculation.ts
bun run examples/02-invoice-calculation.ts
bun run examples/03-gstr1-generation.ts
bun run examples/04-gstr3b-generation.ts
bun run examples/05-complete-workflow.ts
```

## Examples Overview

### 1. Basic Calculation (`01-basic-calculation.ts`)

Learn the fundamentals of GST calculations:
- Intra-state vs inter-state transactions
- Tax-inclusive calculations
- Cess calculations
- Reverse charge mechanism
- Different GST rate examples (0%, 5%, 12%, 18%, 28%)
- Batch calculations
- Reverse GST calculation

**Use this when:** You need to understand basic GST tax calculations.

### 2. Invoice Calculation (`02-invoice-calculation.ts`)

Complete invoice-level calculations with multiple line items:
- B2B invoices (business to business)
- B2C invoices (business to consumer)
- Export invoices (zero-rated)
- Invoices with mixed tax rates
- Discount handling
- HSN/SAC code usage

**Use this when:** You need to generate and calculate complete invoices.

### 3. GSTR-1 Generation (`03-gstr1-generation.ts`)

Generate GSTR-1 return for outward supplies:
- B2B transactions
- B2CL transactions (large inter-state B2C)
- B2CS transactions (small B2C, aggregated)
- Export transactions
- HSN summary generation
- Validation
- Portal-ready JSON export

**Use this when:** You need to file GSTR-1 monthly/quarterly returns.

### 4. GSTR-3B Generation (`04-gstr3b-generation.ts`)

Generate GSTR-3B summary return:
- Outward supplies summary
- Inward supplies (reverse charge)
- Input Tax Credit (ITC) claiming
- Tax liability calculation
- Validation
- Portal-ready JSON export

**Use this when:** You need to file GSTR-3B monthly returns.

### 5. Complete Workflow (`05-complete-workflow.ts`)

End-to-end GST compliance workflow:
- Business detail validation
- Invoice creation and calculation
- GSTR-1 generation
- GSTR-3B generation
- Portal file export
- Compliance summary

**Use this when:** You want to understand the complete GST filing process.

## Example Data

All examples use realistic test data:
- **GSTIN**: `27AAPFU0939F1ZV` (Maharashtra)
- **Customer GSTIN**: `29BBBBB1234C1Z5` (Karnataka)
- **Period**: March 2024 (`032024`)
- **Various HSN/SAC codes** for different product types

## Common Patterns

### Calculate Tax for a Transaction

```typescript
import { GST } from '@accounts/gst'

const result = GST.quickCalculate(
  10000,  // amount
  18,     // GST rate
  '27',   // supplier state
  '29'    // customer state
)

console.log(`Total: ₹${result.totalAmount}`)
console.log(`Tax: ₹${result.totalTax}`)
```

### Generate and Export GSTR-1

```typescript
import { GST, GSTPortalHelper } from '@accounts/gst'
import { writeFileSync } from 'fs'

// Generate
const gstr1 = GST.generateGSTR1(gstin, period, invoices)

// Export
const result = GSTPortalHelper.exportGSTR1ForPortal(gstr1)
writeFileSync(result.filename, result.json)

console.log(`Saved: ${result.filename}`)
```

### Validate GSTIN

```typescript
import { GST } from '@accounts/gst'

const isValid = GST.validateGSTIN('27AAPFU0939F1ZV')
const info = GST.extractGSTINInfo('27AAPFU0939F1ZV')

console.log(`State: ${info.stateName}`)
console.log(`PAN: ${info.pan}`)
```

## Output Files

Examples that generate JSON files will create them in the current directory:
- `GSTR1_032024_27AAPFU0939F1ZV.json`
- `GSTR3B_032024_27AAPFU0939F1ZV.json`

These files are ready to be uploaded to the GST portal.

## Tips

1. **Modify Examples**: Feel free to modify the examples with your own data
2. **Combine Code**: Mix and match code from different examples
3. **Check Validation**: Always validate returns before exporting
4. **Test Data**: Use test GSTINs for experimentation
5. **Portal Upload**: Follow the instructions printed by the examples for portal upload

## Troubleshooting

### Import Errors

If you get import errors, ensure you're in the correct directory:
```bash
cd packages/gst
bun run examples/01-basic-calculation.ts
```

### Type Errors

Make sure TypeScript can find the package types:
```bash
bun run build  # Build the package first
```

### File Not Found

Examples may generate output files. They will be created in your current working directory.

## Next Steps

After running the examples:
1. Review the generated JSON files
2. Check the [API Reference](../API.md) for detailed documentation
3. Read the [main README](../README.md) for comprehensive guides
4. Implement GST processing in your application

## Questions?

- Check the main [README.md](../README.md)
- Review [API.md](../API.md) for API reference
- Visit official GST resources at https://www.gst.gov.in/

## License

MIT - See main package LICENSE file
