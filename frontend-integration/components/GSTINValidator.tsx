/**
 * GSTIN Validation Component
 *
 * Validates GSTIN and displays information
 */

import React, { useState } from 'react'
import { useGSTINValidation } from '../hooks/useGST'

interface GSTINValidatorProps {
  onValidation?: (isValid: boolean, info?: any) => void
  className?: string
}

export function GSTINValidator({ onValidation, className = '' }: GSTINValidatorProps) {
  const [gstin, setGstin] = useState('')
  const { validating, result, error, validate } = useGSTINValidation()

  const handleValidate = async () => {
    if (!gstin || gstin.length !== 15) {
      return
    }

    try {
      const validationResult = await validate(gstin)
      onValidation?.(validationResult.isValid, validationResult.info)
    } catch (err) {
      onValidation?.(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidate()
    }
  }

  return (
    <div className={`gstin-validator ${className}`}>
      <div className="validator-input-group">
        <input
          type="text"
          value={gstin}
          onChange={(e) => setGstin(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          placeholder="Enter GSTIN (15 characters)"
          maxLength={15}
          className="validator-input"
        />
        <button
          onClick={handleValidate}
          disabled={validating || gstin.length !== 15}
          className="validator-button"
        >
          {validating ? 'Validating...' : 'Validate'}
        </button>
      </div>

      {error && (
        <div className="validator-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {result && (
        <div className={`validator-result ${result.isValid ? 'valid' : 'invalid'}`}>
          {result.isValid ? (
            <>
              <div className="result-header">
                <span className="success-icon">✓</span>
                <span className="result-title">Valid GSTIN</span>
              </div>
              {result.info && (
                <div className="result-details">
                  <div className="detail-row">
                    <span className="detail-label">State Code:</span>
                    <span className="detail-value">{result.info.stateCode}</span>
                  </div>
                  {result.info.stateName && (
                    <div className="detail-row">
                      <span className="detail-label">State:</span>
                      <span className="detail-value">{result.info.stateName}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">PAN Number:</span>
                    <span className="detail-value">{result.info.panNumber}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Entity Number:</span>
                    <span className="detail-value">{result.info.entityNumber}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="result-header">
              <span className="error-icon">✗</span>
              <span className="result-title">Invalid GSTIN</span>
              {result.error && <p className="result-message">{result.error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Example CSS
export const gstinValidatorStyles = `
.gstin-validator {
  width: 100%;
  max-width: 500px;
}

.validator-input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.validator-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-family: monospace;
}

.validator-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.validator-button {
  padding: 0.75rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.validator-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.validator-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.validator-error {
  padding: 1rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.validator-result {
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid;
}

.validator-result.valid {
  background-color: #f0fdf4;
  border-color: #86efac;
}

.validator-result.invalid {
  background-color: #fef2f2;
  border-color: #fecaca;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.success-icon {
  width: 1.5rem;
  height: 1.5rem;
  background-color: #22c55e;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.error-icon {
  font-size: 1.25rem;
}

.result-title {
  font-weight: 600;
  font-size: 1.125rem;
  color: #1f2937;
}

.result-message {
  margin-top: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background-color: white;
  border-radius: 0.375rem;
}

.detail-label {
  font-weight: 500;
  color: #6b7280;
}

.detail-value {
  font-weight: 600;
  color: #1f2937;
  font-family: monospace;
}
`
