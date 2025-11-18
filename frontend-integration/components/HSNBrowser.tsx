/**
 * HSN Chapter Browser Component
 *
 * Allows users to browse HSN chapters and view codes within chapters
 */

import React, { useState, useEffect } from 'react'
import { useHSNChapters, useHSNCodesByChapter } from '../hooks/useHSNRegistry'
import type { HSNChapter, HSNCode } from '../types/gst-types'

interface HSNBrowserProps {
  onSelectCode?: (code: HSNCode) => void
  className?: string
}

export function HSNBrowser({ onSelectCode, className = '' }: HSNBrowserProps) {
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  const { loading: loadingChapters, chapters, error: chaptersError, fetchChapters } = useHSNChapters()
  const { loading: loadingCodes, codes, error: codesError, fetchCodes } = useHSNCodesByChapter()

  useEffect(() => {
    fetchChapters()
  }, [fetchChapters])

  useEffect(() => {
    if (selectedChapter) {
      fetchCodes(selectedChapter)
    }
  }, [selectedChapter, fetchCodes])

  // Group chapters by section
  const chaptersBySection = chapters.reduce((acc, chapter) => {
    if (!acc[chapter.section]) {
      acc[chapter.section] = []
    }
    acc[chapter.section].push(chapter)
    return acc
  }, {} as Record<string, HSNChapter[]>)

  const sections = Object.keys(chaptersBySection).sort()

  return (
    <div className={`hsn-browser ${className}`}>
      <div className="browser-layout">
        {/* Section List */}
        <div className="section-list">
          <h3>Sections</h3>
          {loadingChapters && <div className="loading">Loading...</div>}
          {chaptersError && <div className="error">{chaptersError}</div>}
          {sections.map((section) => (
            <div
              key={section}
              className={`section-item ${selectedSection === section ? 'active' : ''}`}
              onClick={() => setSelectedSection(section)}
            >
              Section {section} ({chaptersBySection[section].length} chapters)
            </div>
          ))}
        </div>

        {/* Chapter List */}
        <div className="chapter-list">
          <h3>Chapters</h3>
          {selectedSection ? (
            chaptersBySection[selectedSection]?.map((chapter) => (
              <div
                key={chapter.code}
                className={`chapter-item ${selectedChapter === chapter.code ? 'active' : ''}`}
                onClick={() => setSelectedChapter(chapter.code)}
              >
                <div className="chapter-code">{chapter.code}</div>
                <div className="chapter-description">{chapter.description}</div>
              </div>
            ))
          ) : (
            <div className="placeholder">Select a section to view chapters</div>
          )}
        </div>

        {/* Code List */}
        <div className="code-list">
          <h3>HSN Codes</h3>
          {loadingCodes && <div className="loading">Loading codes...</div>}
          {codesError && <div className="error">{codesError}</div>}
          {selectedChapter ? (
            codes.length > 0 ? (
              codes.map((code) => (
                <div
                  key={code.code}
                  className="code-item"
                  onClick={() => onSelectCode?.(code)}
                >
                  <div className="code-header">
                    <span className="code-number">{code.code}</span>
                    <span className="code-rate">GST: {code.gstRate}%</span>
                  </div>
                  <div className="code-description">{code.description}</div>
                  <div className="code-meta">
                    {code.cess && <span>Cess: {code.cess}%</span>}
                    <span>Unit: {code.unit}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="placeholder">No codes registered for this chapter</div>
            )
          ) : (
            <div className="placeholder">Select a chapter to view codes</div>
          )}
        </div>
      </div>
    </div>
  )
}

// Example CSS
export const hsnBrowserStyles = `
.hsn-browser {
  width: 100%;
  height: 600px;
}

.browser-layout {
  display: grid;
  grid-template-columns: 200px 300px 1fr;
  gap: 1rem;
  height: 100%;
}

.section-list,
.chapter-list,
.code-list {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-y: auto;
}

.section-list h3,
.chapter-list h3,
.code-list h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.section-item,
.chapter-item {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.section-item:hover,
.chapter-item:hover {
  background-color: #f3f4f6;
}

.section-item.active,
.chapter-item.active {
  background-color: #dbeafe;
  color: #1e40af;
}

.chapter-code {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.chapter-description {
  font-size: 0.875rem;
  color: #6b7280;
}

.code-item {
  padding: 1rem;
  margin-bottom: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.code-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.code-number {
  font-weight: 600;
  color: #1f2937;
}

.code-rate {
  padding: 0.25rem 0.5rem;
  background-color: #dbeafe;
  color: #1e40af;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.code-description {
  font-size: 0.875rem;
  color: #4b5563;
  margin-bottom: 0.5rem;
}

.code-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.loading,
.error,
.placeholder {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.error {
  color: #991b1b;
  background-color: #fef2f2;
  border-radius: 0.375rem;
}
`
