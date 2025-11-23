/**
 * GSTR Exporter Component
 *
 * Export GSTR-1 and GSTR-3B returns for portal upload
 */

import React, { useState } from 'react'
import { useGSTR1Export, useGSTR3BExport, usePortalInstructions } from '../hooks/useGSTReturns'

interface GSTRExporterProps {
  returnType: 'GSTR-1' | 'GSTR-3B'
  className?: string
}

export function GSTRExporter({ returnType, className = '' }: GSTRExporterProps) {
  const [period, setPeriod] = useState('')
  const [showInstructions, setShowInstructions] = useState(false)

  const gstr1Export = useGSTR1Export()
  const gstr3bExport = useGSTR3BExport()
  const { loading: loadingInstructions, instructions, fetchInstructions } = usePortalInstructions()

  const exportHook = returnType === 'GSTR-1' ? gstr1Export : gstr3bExport
  const { exporting, result, error, exportGSTR1, exportGSTR3B, downloadJSON } = exportHook

  const handleExport = async () => {
    if (!period) return

    try {
      if (returnType === 'GSTR-1') {
        await exportGSTR1({ period, pretty: true, validate: true })
      } else {
        await exportGSTR3B({ period, pretty: true, validate: true })
      }
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const handleShowInstructions = async () => {
    if (!instructions) {
      await fetchInstructions(returnType)
    }
    setShowInstructions(true)
  }

  // Format period input (MM-YYYY)
  const formatPeriod = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 2) {
      return digits
    }
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}`
  }

  return (
    <div className={`gstr-exporter ${className}`}>
      <div className="exporter-header">
        <h2>{returnType} Export</h2>
        <button onClick={handleShowInstructions} className="instructions-button">
          Upload Instructions
        </button>
      </div>

      <div className="exporter-form">
        <div className="form-group">
          <label htmlFor="period">Tax Period</label>
          <input
            id="period"
            type="text"
            value={period}
            onChange={(e) => setPeriod(formatPeriod(e.target.value))}
            placeholder="MM-YYYY (e.g., 03-2024)"
            maxLength={7}
            className="period-input"
          />
          <span className="input-hint">Format: MM-YYYY</span>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting || !period || period.length !== 7}
          className="export-button"
        >
          {exporting ? 'Generating...' : `Export ${returnType}`}
        </button>
      </div>

      {error && (
        <div className="export-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {result && (
        <div className="export-result">
          <div className="result-header">
            <span className="success-icon">✓</span>
            <span>Export Successful</span>
          </div>

          <div className="result-details">
            <div className="detail-row">
              <span>Filename:</span>
              <span className="filename">{result.filename}</span>
            </div>
            <div className="detail-row">
              <span>File Size:</span>
              <span>{(result.size / 1024).toFixed(2)} KB</span>
            </div>
            {result.validation && (
              <div className="detail-row">
                <span>Validation:</span>
                <span className={result.validation.isValid ? 'valid' : 'invalid'}>
                  {result.validation.isValid ? 'Valid' : `Invalid (${result.validation.errors.length} errors)`}
                </span>
              </div>
            )}
          </div>

          {result.validation && !result.validation.isValid && (
            <div className="validation-errors">
              <h4>Validation Errors:</h4>
              <ul>
                {result.validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="result-actions">
            <button onClick={() => downloadJSON()} className="download-button">
              Download JSON
            </button>
            <button onClick={handleShowInstructions} className="instructions-button">
              Upload Instructions
            </button>
          </div>
        </div>
      )}

      {showInstructions && instructions && (
        <div className="instructions-modal">
          <div className="modal-overlay" onClick={() => setShowInstructions(false)} />
          <div className="modal-content">
            <div className="modal-header">
              <h3>Portal Upload Instructions - {returnType}</h3>
              <button onClick={() => setShowInstructions(false)} className="close-button">
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="instructions-section">
                <h4>Steps:</h4>
                <ol>
                  {instructions.instructions.instructions.map((step) => (
                    <li key={step.step}>
                      {step.action}
                      {step.url && (
                        <a href={step.url} target="_blank" rel="noopener noreferrer" className="step-link">
                          Open
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="instructions-section">
                <h4>Resources:</h4>
                <ul className="resource-list">
                  <li>
                    <a href={instructions.instructions.resources.portal} target="_blank" rel="noopener noreferrer">
                      GST Portal
                    </a>
                  </li>
                  <li>
                    <a href={instructions.instructions.resources.tutorial} target="_blank" rel="noopener noreferrer">
                      Tutorial Guide
                    </a>
                  </li>
                  <li>
                    <a href={instructions.instructions.resources.helpdesk} target="_blank" rel="noopener noreferrer">
                      Help Desk
                    </a>
                  </li>
                </ul>
              </div>

              <div className="instructions-section">
                <h4>Important Notes:</h4>
                <ul className="notes-list">
                  {instructions.instructions.notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Example CSS
export const gstrExporterStyles = `
.gstr-exporter {
  width: 100%;
  max-width: 600px;
}

.exporter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.exporter-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #1f2937;
}

.exporter-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #374151;
}

.period-input {
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-family: monospace;
}

.period-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-hint {
  font-size: 0.875rem;
  color: #6b7280;
}

.export-button,
.download-button,
.instructions-button {
  padding: 0.75rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.export-button:hover:not(:disabled),
.download-button:hover,
.instructions-button:hover {
  background-color: #2563eb;
}

.export-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.instructions-button {
  background-color: transparent;
  color: #3b82f6;
  border: 1px solid #3b82f6;
}

.instructions-button:hover {
  background-color: #eff6ff;
}

.export-error {
  padding: 1rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.export-result {
  padding: 1.5rem;
  background-color: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 0.5rem;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-weight: 600;
  color: #1f2937;
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
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background-color: white;
  border-radius: 0.375rem;
}

.filename {
  font-family: monospace;
  font-weight: 600;
}

.valid {
  color: #16a34a;
  font-weight: 500;
}

.invalid {
  color: #dc2626;
  font-weight: 500;
}

.validation-errors {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #fef2f2;
  border-radius: 0.375rem;
}

.validation-errors h4 {
  margin: 0 0 0.5rem 0;
  color: #991b1b;
}

.validation-errors ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #991b1b;
}

.result-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.instructions-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 0.5rem;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

.close-button:hover {
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
}

.instructions-section {
  margin-bottom: 1.5rem;
}

.instructions-section h4 {
  margin: 0 0 0.75rem 0;
  color: #1f2937;
}

.instructions-section ol,
.instructions-section ul {
  margin: 0;
  padding-left: 1.5rem;
}

.instructions-section li {
  margin-bottom: 0.5rem;
  color: #4b5563;
}

.step-link {
  margin-left: 0.5rem;
  color: #3b82f6;
  text-decoration: none;
}

.step-link:hover {
  text-decoration: underline;
}

.resource-list li,
.notes-list li {
  margin-bottom: 0.5rem;
}

.resource-list a {
  color: #3b82f6;
  text-decoration: none;
}

.resource-list a:hover {
  text-decoration: underline;
}
`
