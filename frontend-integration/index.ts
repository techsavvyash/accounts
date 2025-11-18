/**
 * GST Frontend Integration Package
 *
 * Complete TypeScript/React integration for GST features
 */

// API Client
export { GSTAPIClient, initGSTClient, getGSTClient } from './api/gst-client'

// Types
export type * from './types/gst-types'
export { INDIAN_STATES, GST_RATES } from './types/gst-types'

// Hooks - GST Operations
export {
  useGSTCalculation,
  useGSTINValidation,
  usePANValidation,
  useHSNValidation,
  useSACValidation,
} from './hooks/useGST'

// Hooks - HSN Registry
export {
  useHSNChapters,
  useHSNChapter,
  useHSNSearch,
  useHSNLookup,
  useHSNCodesByChapter,
  useHSNCodesByRate,
  useAllHSNCodes,
} from './hooks/useHSNRegistry'

// Hooks - GST Returns
export {
  useGSTR1Export,
  useGSTR3BExport,
  usePortalInstructions,
  useGSTR1Generation,
  useGSTR3BGeneration,
} from './hooks/useGSTReturns'

// Components
export { HSNSearch, hsnSearchStyles } from './components/HSNSearch'
export { HSNBrowser, hsnBrowserStyles } from './components/HSNBrowser'
export { GSTINValidator, gstinValidatorStyles } from './components/GSTINValidator'
export { GSTRExporter, gstrExporterStyles } from './components/GSTRExporter'
