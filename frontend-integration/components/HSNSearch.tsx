/**
 * HSN Code Search Component
 *
 * Allows users to search for HSN codes by description
 */

import React, { useState, useCallback } from 'react'
import { useHSNSearch } from '../hooks/useHSNRegistry'
import type { HSNCode } from '../types/gst-types'

interface HSNSearchProps {
  onSelect?: (code: HSNCode) => void
  placeholder?: string
  className?: string
}

export function HSNSearch({ onSelect, placeholder = 'Search HSN codes...', className = '' }: HSNSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const { searching, results, error, search } = useHSNSearch()

  const handleSearch = useCallback(
    async (term: string) => {
      setSearchTerm(term)
      if (term.length >= 2) {
        await search(term)
      }
    },
    [search]
  )

  const handleSelect = useCallback(
    (code: HSNCode) => {
      onSelect?.(code)
      setSearchTerm('')
    },
    [onSelect]
  )

  return (
    <div className={`hsn-search ${className}`}>
      <div className="search-input-wrapper">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="search-input"
        />
        {searching && <span className="search-loading">Searching...</span>}
      </div>

      {error && <div className="search-error">{error}</div>}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((code) => (
            <div
              key={code.code}
              className="search-result-item"
              onClick={() => handleSelect(code)}
            >
              <div className="result-code">{code.code}</div>
              <div className="result-description">{code.description}</div>
              <div className="result-details">
                <span className="result-rate">GST: {code.gstRate}%</span>
                {code.cess && <span className="result-cess">Cess: {code.cess}%</span>}
                <span className="result-unit">{code.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {searchTerm.length >= 2 && !searching && results.length === 0 && (
        <div className="no-results">No HSN codes found</div>
      )}
    </div>
  )
}

// Example CSS (you can customize this)
export const hsnSearchStyles = `
.hsn-search {
  position: relative;
  width: 100%;
}

.search-input-wrapper {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-loading {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 0.875rem;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  overflow-y: auto;
  z-index: 10;
}

.search-result-item {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-result-item:hover {
  background-color: #f9fafb;
}

.search-result-item:last-child {
  border-bottom: none;
}

.result-code {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.result-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.result-details {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
}

.result-rate,
.result-cess,
.result-unit {
  padding: 0.25rem 0.5rem;
  background-color: #f3f4f6;
  border-radius: 0.25rem;
  color: #4b5563;
}

.search-error {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #991b1b;
  font-size: 0.875rem;
}

.no-results {
  margin-top: 0.5rem;
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}
`
