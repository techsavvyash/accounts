/**
 * React hooks for GST Returns and Portal operations
 */

import { useState, useCallback } from 'react'
import { getGSTClient } from '../api/gst-client'
import type {
  GSTR1ExportRequest,
  GSTR1ExportResponse,
  GSTR3BExportRequest,
  GSTR3BExportResponse,
  PortalInstructionsResponse,
} from '../types/gst-types'

// ==================== useGSTR1Export ====================

export function useGSTR1Export() {
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<GSTR1ExportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const exportGSTR1 = useCallback(async (request: GSTR1ExportRequest) => {
    setExporting(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.exportGSTR1ForPortal(request)

      if (response.success && response.data) {
        setResult(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Export failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to export GSTR-1'
      setError(errorMessage)
      throw err
    } finally {
      setExporting(false)
    }
  }, [])

  const downloadJSON = useCallback((filename?: string) => {
    if (!result) return

    const blob = new Blob([result.content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || result.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [result])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    exporting,
    result,
    error,
    exportGSTR1,
    downloadJSON,
    reset,
  }
}

// ==================== useGSTR3BExport ====================

export function useGSTR3BExport() {
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<GSTR3BExportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const exportGSTR3B = useCallback(async (request: GSTR3BExportRequest) => {
    setExporting(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.exportGSTR3BForPortal(request)

      if (response.success && response.data) {
        setResult(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Export failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to export GSTR-3B'
      setError(errorMessage)
      throw err
    } finally {
      setExporting(false)
    }
  }, [])

  const downloadJSON = useCallback((filename?: string) => {
    if (!result) return

    const blob = new Blob([result.content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || result.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [result])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    exporting,
    result,
    error,
    exportGSTR3B,
    downloadJSON,
    reset,
  }
}

// ==================== usePortalInstructions ====================

export function usePortalInstructions(returnType?: 'GSTR-1' | 'GSTR-3B') {
  const [loading, setLoading] = useState(false)
  const [instructions, setInstructions] = useState<PortalInstructionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchInstructions = useCallback(async (type: 'GSTR-1' | 'GSTR-3B') => {
    setLoading(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.getPortalInstructions(type)

      if (response.success && response.data) {
        setInstructions(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Failed to fetch instructions')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch portal instructions'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    instructions,
    error,
    fetchInstructions,
  }
}

// ==================== useGSTR1Generation ====================

export function useGSTR1Generation() {
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (period: string) => {
    setGenerating(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.generateGSTR1(period)

      if (response.success && response.data) {
        setResult(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Generation failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate GSTR-1'
      setError(errorMessage)
      throw err
    } finally {
      setGenerating(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    generating,
    result,
    error,
    generate,
    reset,
  }
}

// ==================== useGSTR3BGeneration ====================

export function useGSTR3BGeneration() {
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (period: string) => {
    setGenerating(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.generateGSTR3B(period)

      if (response.success && response.data) {
        setResult(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Generation failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate GSTR-3B'
      setError(errorMessage)
      throw err
    } finally {
      setGenerating(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    generating,
    result,
    error,
    generate,
    reset,
  }
}
