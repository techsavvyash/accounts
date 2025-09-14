// Shared utility functions

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN')
}

export function generateInvoiceNumber(prefix = 'INV', suffix?: string): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `${prefix}-${timestamp}-${random}${suffix ? `-${suffix}` : ''}`
}

export function calculateGST(amount: number, rate: number, isInterstate: boolean) {
  const gstAmount = (amount * rate) / 100
  
  if (isInterstate) {
    return {
      igst: gstAmount,
      cgst: 0,
      sgst: 0,
      total: gstAmount
    }
  } else {
    return {
      igst: 0,
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      total: gstAmount
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function truncateText(text: string, length: number): string {
  return text.length > length ? text.slice(0, length) + '...' : text
}