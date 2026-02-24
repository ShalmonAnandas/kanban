import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const ENCODING = 'base64' as const

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  // Derive a 32-byte key from the provided key using SHA-256
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string containing IV + ciphertext + auth tag.
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  // Combine: IV (12) + tag (16) + ciphertext
  const combined = Buffer.concat([iv, tag, encrypted])
  return combined.toString(ENCODING)
}

/**
 * Decrypt a base64 string produced by encrypt().
 */
export function decrypt(encoded: string): string {
  const key = getKey()
  const combined = Buffer.from(encoded, ENCODING)
  const iv = combined.subarray(0, IV_LENGTH)
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

/**
 * Encrypt a value, returning null if input is null/undefined.
 */
export function encryptNullable(value: string | null | undefined): string | null {
  if (value == null) return null
  return encrypt(value)
}

/**
 * Decrypt a value, returning null if input is null/undefined.
 */
export function decryptNullable(value: string | null | undefined): string | null {
  if (value == null) return null
  return decrypt(value)
}
