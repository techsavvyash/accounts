/**
 * React hooks for GST operations
 */

import { useState, useCallback } from 'react'
import { getGSTClient } from '../api/gst-client'
import type {
  GSTCalculationRequest,
  GSTCalculationResponse,
  GSTINValidationResponse,
  PANValidationResponse,
  HSNValidationResponse,
  SACValidationResponse,
} from '../types/gst-types'

// ==================== useGSTCalculation ====================

export function useGSTCalculation() {
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState<GSTCalculationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const calculate = useCallback(async (request: GSTCalculationRequest) => {
    setCalculating(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.calculateGST(request)

      if (response.success && response.data) {
        setResult(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Calculation failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to calculate GST'
      setError(errorMessage)
      throw err
    } finally {
      setCalculating(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    calculating,
    result,
    error,
    calculate,
    reset,
  }
}

// ==================== useGSTINValidation ====================

export function useGSTINValidation() {
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<GSTINValidationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback(async (gstin: string) => {
    setValidating(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.validateGSTIN(gstin)

      if (response.success && response.data) {
        setResult(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Validation failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to validate GSTIN'
      setError(errorMessage)
      throw err
    } finally {
      setValidating(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    validating,
    result,
    error,
    validate,
    reset,
  }
}

// ==================== usePANValidation ====================

export function usePANValidation() {
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<PANValidationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback(async (pan: string) => {
    setValidating(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.validatePAN(pan)

      if (response.success && response.data) {
        setResult(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Validation failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to validate PAN'
      setError(errorMessage)
      throw err
    } finally {
      setValidating(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    validating,
    result,
    error,
    validate,
    reset,
  }
}

// ==================== useHSNValidation ====================

export function useHSNValidation() {
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<HSNValidationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback(async (hsn: string) => {
    setValidating(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.validateHSN(hsn)

      if (response.success && response.data) {
        setResult(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Validation failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to validate HSN'
      setError(errorMessage)
      throw err
    } finally {
      setValidating(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    validating,
    result,
    error,
    validate,
    reset,
  }
}

// ==================== useSACValidation ====================

export function useSACValidation() {
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<SACValidationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback(async (sac: string) => {
    setValidating(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.validateSAC(sac)

      if (response.success && response.data) {
        setResult(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Validation failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to validate SAC'
      setError(errorMessage)
      throw err
    } finally {
      setValidating(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    validating,
    result,
    error,
    validate,
    reset,
  }
}
