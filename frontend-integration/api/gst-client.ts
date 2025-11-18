/**
 * GST API Client
 *
 * Provides type-safe methods to interact with the GST API endpoints
 */

import type {
  GSTCalculationRequest,
  GSTCalculationResponse,
  GSTINValidationRequest,
  GSTINValidationResponse,
  PANValidationRequest,
  PANValidationResponse,
  HSNValidationRequest,
  HSNValidationResponse,
  SACValidationRequest,
  SACValidationResponse,
  HSNChapter,
  HSNCode,
  HSNLookupResult,
  GSTR1ExportRequest,
  GSTR1ExportResponse,
  GSTR3BExportRequest,
  GSTR3BExportResponse,
  PortalInstructionsResponse,
  APIResponse
} from '../types/gst-types'

export class GSTAPIClient {
  private baseURL: string
  private authToken?: string

  constructor(baseURL: string, authToken?: string) {
    this.baseURL = baseURL.replace(/\/$/, '') // Remove trailing slash
    this.authToken = authToken
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()
    return data as APIResponse<T>
  }

  // ==================== GST Calculation ====================

  async calculateGST(request: GSTCalculationRequest): Promise<APIResponse<GSTCalculationResponse>> {
    return this.request<GSTCalculationResponse>('/gst/calculate', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getGSTRates(): Promise<APIResponse<any>> {
    return this.request('/gst/rates')
  }

  async getGSTRate(hsnSac: string, amount?: number): Promise<APIResponse<any>> {
    const query = amount ? `?amount=${amount}` : ''
    return this.request(`/gst/rate/${hsnSac}${query}`)
  }

  // ==================== Validation ====================

  async validateGSTIN(gstin: string): Promise<APIResponse<GSTINValidationResponse>> {
    return this.request<GSTINValidationResponse>('/gst/validate-gstin', {
      method: 'POST',
      body: JSON.stringify({ gstin }),
    })
  }

  async validatePAN(pan: string): Promise<APIResponse<PANValidationResponse>> {
    return this.request<PANValidationResponse>('/gst/validate-pan', {
      method: 'POST',
      body: JSON.stringify({ pan }),
    })
  }

  async validateHSN(hsn: string): Promise<APIResponse<HSNValidationResponse>> {
    return this.request<HSNValidationResponse>('/gst/validate-hsn', {
      method: 'POST',
      body: JSON.stringify({ hsn }),
    })
  }

  async validateSAC(sac: string): Promise<APIResponse<SACValidationResponse>> {
    return this.request<SACValidationResponse>('/gst/validate-sac', {
      method: 'POST',
      body: JSON.stringify({ sac }),
    })
  }

  // ==================== HSN Registry ====================

  async getHSNChapters(): Promise<APIResponse<{ chapters: HSNChapter[]; count: number }>> {
    return this.request('/gst/hsn/chapters')
  }

  async getHSNChapter(code: string): Promise<APIResponse<HSNChapter>> {
    return this.request(`/gst/hsn/chapters/${code}`)
  }

  async getHSNChaptersBySection(section: string): Promise<APIResponse<{ section: string; chapters: HSNChapter[]; count: number }>> {
    return this.request(`/gst/hsn/sections/${section}`)
  }

  async searchHSNCodes(query: string): Promise<APIResponse<{ query: string; results: HSNCode[]; count: number }>> {
    return this.request(`/gst/hsn/search?q=${encodeURIComponent(query)}`)
  }

  async lookupHSN(code: string): Promise<APIResponse<HSNLookupResult>> {
    return this.request(`/gst/hsn/${code}`)
  }

  async getHSNCodesByChapter(chapter: string): Promise<APIResponse<{ chapter: string; codes: HSNCode[]; count: number }>> {
    return this.request(`/gst/hsn/chapter/${chapter}/codes`)
  }

  async getHSNCodesByRate(rate: number): Promise<APIResponse<{ gstRate: number; codes: HSNCode[]; count: number }>> {
    return this.request(`/gst/hsn/rate/${rate}`)
  }

  async getAllHSNCodes(): Promise<APIResponse<{ codes: HSNCode[]; count: number }>> {
    return this.request('/gst/hsn/codes')
  }

  async getHSNStats(): Promise<APIResponse<{ chapters: number; codes: number }>> {
    return this.request('/gst/hsn/stats')
  }

  // ==================== GST Returns ====================

  async generateGSTR1(period: string): Promise<APIResponse<any>> {
    return this.request('/gst/returns/gstr1', {
      method: 'POST',
      body: JSON.stringify({ period }),
    })
  }

  async generateGSTR3B(period: string): Promise<APIResponse<any>> {
    return this.request('/gst/returns/gstr3b', {
      method: 'POST',
      body: JSON.stringify({ period }),
    })
  }

  // ==================== Portal Export ====================

  async exportGSTR1ForPortal(request: GSTR1ExportRequest): Promise<APIResponse<GSTR1ExportResponse>> {
    return this.request<GSTR1ExportResponse>('/gst/returns/gstr1/export', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async exportGSTR3BForPortal(request: GSTR3BExportRequest): Promise<APIResponse<GSTR3BExportResponse>> {
    return this.request<GSTR3BExportResponse>('/gst/returns/gstr3b/export', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getPortalInstructions(returnType: 'GSTR-1' | 'GSTR-3B'): Promise<APIResponse<PortalInstructionsResponse>> {
    return this.request<PortalInstructionsResponse>(`/gst/portal/instructions/${returnType}`)
  }
}

// Export a singleton instance
let gstClient: GSTAPIClient | null = null

export function initGSTClient(baseURL: string, authToken?: string): GSTAPIClient {
  gstClient = new GSTAPIClient(baseURL, authToken)
  return gstClient
}

export function getGSTClient(): GSTAPIClient {
  if (!gstClient) {
    throw new Error('GST API client not initialized. Call initGSTClient() first.')
  }
  return gstClient
}
