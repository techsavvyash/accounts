/**
 * React hooks for HSN Registry operations
 */

import { useState, useCallback, useEffect } from 'react'
import { getGSTClient } from '../api/gst-client'
import type { HSNChapter, HSNCode, HSNLookupResult } from '../types/gst-types'

// ==================== useHSNChapters ====================

export function useHSNChapters() {
  const [loading, setLoading] = useState(false)
  const [chapters, setChapters] = useState<HSNChapter[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchChapters = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.getHSNChapters()

      if (response.success && response.data) {
        setChapters(response.data.chapters)
        return response.data.chapters
      } else {
        throw new Error(response.message || 'Failed to fetch chapters')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch HSN chapters'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    chapters,
    error,
    fetchChapters,
  }
}

// ==================== useHSNChapter ====================

export function useHSNChapter(code?: string) {
  const [loading, setLoading] = useState(false)
  const [chapter, setChapter] = useState<HSNChapter | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchChapter = useCallback(async (chapterCode: string) => {
    setLoading(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.getHSNChapter(chapterCode)

      if (response.success && response.data) {
        setChapter(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Failed to fetch chapter')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch HSN chapter'
      setError(errorMessage)
      setChapter(null)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (code) {
      fetchChapter(code)
    }
  }, [code, fetchChapter])

  return {
    loading,
    chapter,
    error,
    fetchChapter,
  }
}

// ==================== useHSNSearch ====================

export function useHSNSearch() {
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<HSNCode[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([])
      return []
    }

    setSearching(true)
    setError(null)
    setQuery(searchQuery)

    try {
      const client = getGSTClient()
      const response = await client.searchHSNCodes(searchQuery)

      if (response.success && response.data) {
        setResults(response.data.results)
        return response.data.results
      } else {
        throw new Error(response.message || 'Search failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to search HSN codes'
      setError(errorMessage)
      throw err
    } finally {
      setSearching(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResults([])
    setQuery('')
    setError(null)
  }, [])

  return {
    searching,
    results,
    query,
    error,
    search,
    reset,
  }
}

// ==================== useHSNLookup ====================

export function useHSNLookup(code?: string) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HSNLookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lookup = useCallback(async (hsnCode: string) => {
    setLoading(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.lookupHSN(hsnCode)

      if (response.success && response.data) {
        setResult(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Lookup failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to lookup HSN code'
      setError(errorMessage)
      setResult(null)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (code) {
      lookup(code)
    }
  }, [code, lookup])

  return {
    loading,
    result,
    error,
    lookup,
  }
}

// ==================== useHSNCodesByChapter ====================

export function useHSNCodesByChapter(chapter?: string) {
  const [loading, setLoading] = useState(false)
  const [codes, setCodes] = useState<HSNCode[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchCodes = useCallback(async (chapterCode: string) => {
    setLoading(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.getHSNCodesByChapter(chapterCode)

      if (response.success && response.data) {
        setCodes(response.data.codes)
        return response.data.codes
      } else {
        throw new Error(response.message || 'Failed to fetch codes')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch HSN codes'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (chapter) {
      fetchCodes(chapter)
    }
  }, [chapter, fetchCodes])

  return {
    loading,
    codes,
    error,
    fetchCodes,
  }
}

// ==================== useHSNCodesByRate ====================

export function useHSNCodesByRate(rate?: number) {
  const [loading, setLoading] = useState(false)
  const [codes, setCodes] = useState<HSNCode[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchCodes = useCallback(async (gstRate: number) => {
    setLoading(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.getHSNCodesByRate(gstRate)

      if (response.success && response.data) {
        setCodes(response.data.codes)
        return response.data.codes
      } else {
        throw new Error(response.message || 'Failed to fetch codes')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch HSN codes by rate'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (rate !== undefined) {
      fetchCodes(rate)
    }
  }, [rate, fetchCodes])

  return {
    loading,
    codes,
    error,
    fetchCodes,
  }
}

// ==================== useAllHSNCodes ====================

export function useAllHSNCodes() {
  const [loading, setLoading] = useState(false)
  const [codes, setCodes] = useState<HSNCode[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const client = getGSTClient()
      const response = await client.getAllHSNCodes()

      if (response.success && response.data) {
        setCodes(response.data.codes)
        return response.data.codes
      } else {
        throw new Error(response.message || 'Failed to fetch codes')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch all HSN codes'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    codes,
    error,
    fetchAll,
  }
}
