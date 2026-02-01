/**
 * AES-256-GCM encryption for email addresses
 * Uses Web Crypto API for browser compatibility
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // 128-bit auth tag

/**
 * Get encryption key from environment
 */
function getKeyFromEnv(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  if (key.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
  }
  return key;
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Import the encryption key for use with Web Crypto API
 */
async function importKey(): Promise<CryptoKey> {
  const keyBytes = hexToBytes(getKeyFromEnv());
  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded ciphertext with IV prepended
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    data
  );

  // Prepend IV to ciphertext
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv);
  result.set(new Uint8Array(ciphertext), iv.length);

  // Return as hex string for easy storage
  return bytesToHex(result);
}

/**
 * Decrypt a string using AES-256-GCM
 * @param encrypted - Hex-encoded ciphertext with IV prepended
 * @returns Decrypted plaintext
 */
export async function decrypt(encrypted: string): Promise<string> {
  const key = await importKey();
  const data = hexToBytes(encrypted);

  // Extract IV and ciphertext
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Hash an email address for lookup using HMAC-SHA256 with a secret pepper.
 * This prevents rainbow-table attacks if the database is compromised.
 */
export async function hashEmail(email: string): Promise<string> {
  const pepper = process.env.EMAIL_HASH_PEPPER;
  if (!pepper || pepper.length !== 64) {
    throw new Error(
      "EMAIL_HASH_PEPPER environment variable must be set (64 hex characters)"
    );
  }

  const normalized = email.toLowerCase().trim();
  const encoder = new TextEncoder();

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    hexToBytes(pepper).buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(normalized)
  );

  return bytesToHex(new Uint8Array(signature));
}

/**
 * Generate a secure unsubscribe token
 */
export function generateUnsubscribeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}
