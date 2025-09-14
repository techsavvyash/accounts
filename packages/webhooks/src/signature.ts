import { createHmac } from 'crypto'
import { SignatureVerification, WebhookSignatureError } from './types'

export class WebhookSignatureVerifier implements SignatureVerification {
  private readonly algorithm = 'sha256'

  generateSignature(payload: string, secret: string, timestamp?: number): string {
    const ts = timestamp || Math.floor(Date.now() / 1000)
    const signedPayload = `${ts}.${payload}`
    
    const hmac = createHmac(this.algorithm, secret)
    hmac.update(signedPayload)
    const signature = hmac.digest('hex')
    
    return `t=${ts},v1=${signature}`
  }

  verifySignature(payload: string, signature: string, secret: string, timestamp?: number): boolean {
    try {
      const elements = signature.split(',')
      const timestampElement = elements.find(e => e.startsWith('t='))
      const signatureElement = elements.find(e => e.startsWith('v1='))
      
      if (!timestampElement || !signatureElement) {
        throw new WebhookSignatureError('Invalid signature format')
      }
      
      const extractedTimestamp = parseInt(timestampElement.split('=')[1])
      const expectedSignature = signatureElement.split('=')[1]
      
      // Verify timestamp if provided
      if (timestamp !== undefined) {
        if (!this.isTimestampValid(extractedTimestamp, timestamp)) {
          throw new WebhookSignatureError('Timestamp is outside tolerance window')
        }
      }
      
      const signedPayload = `${extractedTimestamp}.${payload}`
      const hmac = createHmac(this.algorithm, secret)
      hmac.update(signedPayload)
      const computedSignature = hmac.digest('hex')
      
      return this.secureCompare(computedSignature, expectedSignature)
    } catch (error) {
      if (error instanceof WebhookSignatureError) {
        throw error
      }
      throw new WebhookSignatureError('Signature verification failed', { error })
    }
  }

  isTimestampValid(timestamp: number, tolerance: number): boolean {
    const now = Math.floor(Date.now() / 1000)
    return Math.abs(now - timestamp) <= tolerance
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    
    return result === 0
  }
}

export const webhookSignature = new WebhookSignatureVerifier()