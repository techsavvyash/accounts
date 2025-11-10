/**
 * Client-Side Encryption Utilities
 *
 * For true end-to-end encryption where the server never sees unencrypted data.
 * Use these utilities in your frontend application.
 *
 * Note: This requires the Web Crypto API (available in modern browsers)
 */

/**
 * Encrypted data structure for client-side encryption
 */
export interface ClientEncryptedData {
  ciphertext: string; // base64 encoded
  iv: string; // base64 encoded
  version: number;
}

/**
 * Generate a random encryption key for client-side use
 * Store this securely (e.g., in the user's device keychain)
 */
export async function generateClientKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto API not available');
  }

  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a crypto key to a storable format
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Import a key from stored format
 */
export async function importKey(keyData: string): Promise<CryptoKey> {
  const binary = atob(keyData);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return await window.crypto.subtle.importKey(
    'raw',
    bytes,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data on the client side
 */
export async function encryptClient(
  plaintext: string,
  key: CryptoKey
): Promise<ClientEncryptedData> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto API not available');
  }

  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encode plaintext
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Encrypt
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  // Convert to base64
  const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return {
    ciphertext,
    iv: ivBase64,
    version: 1,
  };
}

/**
 * Decrypt data on the client side
 */
export async function decryptClient(
  encryptedData: ClientEncryptedData,
  key: CryptoKey
): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto API not available');
  }

  // Decode from base64
  const ciphertext = atob(encryptedData.ciphertext);
  const ciphertextBytes = new Uint8Array(ciphertext.length);
  for (let i = 0; i < ciphertext.length; i++) {
    ciphertextBytes[i] = ciphertext.charCodeAt(i);
  }

  const iv = atob(encryptedData.iv);
  const ivBytes = new Uint8Array(iv.length);
  for (let i = 0; i < iv.length; i++) {
    ivBytes[i] = iv.charCodeAt(i);
  }

  // Decrypt
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    ciphertextBytes
  );

  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt data and return as JSON string
 */
export async function encryptToJson(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const encrypted = await encryptClient(plaintext, key);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt data from JSON string
 */
export async function decryptFromJson(
  encryptedJson: string,
  key: CryptoKey
): Promise<string> {
  const encryptedData = JSON.parse(encryptedJson) as ClientEncryptedData;
  return decryptClient(encryptedData, key);
}

/**
 * React hook for managing client-side encryption key
 */
export function useEncryptionKey() {
  if (typeof window === 'undefined') {
    return null;
  }

  const STORAGE_KEY = 'client_encryption_key';

  /**
   * Get or generate encryption key
   */
  async function getOrCreateKey(): Promise<CryptoKey> {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        return await importKey(stored);
      } catch (error) {
        console.warn('Failed to import stored key, generating new one');
      }
    }

    const key = await generateClientKey();
    const exported = await exportKey(key);
    localStorage.setItem(STORAGE_KEY, exported);
    return key;
  }

  /**
   * Clear encryption key (logout)
   */
  function clearKey() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    getOrCreateKey,
    clearKey,
  };
}

/**
 * Example usage in a React component:
 *
 * ```typescript
 * import { useEncryptionKey, encryptClient, decryptClient } from '@accounts/shared/encryption-client';
 *
 * function CustomerForm() {
 *   const { getOrCreateKey } = useEncryptionKey();
 *
 *   async function handleSubmit(formData) {
 *     const key = await getOrCreateKey();
 *
 *     // Encrypt sensitive data before sending
 *     const encryptedName = await encryptClient(formData.name, key);
 *
 *     // Send to API
 *     await api.post('/customers', {
 *       ...formData,
 *       name: JSON.stringify(encryptedName),
 *     });
 *   }
 *
 *   async function loadCustomer(id) {
 *     const customer = await api.get(`/customers/${id}`);
 *     const key = await getOrCreateKey();
 *
 *     // Decrypt sensitive data
 *     const decryptedName = await decryptFromJson(customer.name, key);
 *
 *     return {
 *       ...customer,
 *       name: decryptedName,
 *     };
 *   }
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
