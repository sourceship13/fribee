const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Convert a number to base62 string
 */
export function toBase62(num: number): string {
  let result = '';
  while (num > 0) {
    result = BASE62[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result || '0';
}

/**
 * Convert a base62 string back to a number
 */
export function fromBase62(str: string): number {
  let num = 0;
  for (const char of str) {
    num = num * 62 + BASE62.indexOf(char);
  }
  return num;
}

/**
 * Convert a UUID string to a shorter base62 encoded string
 * UUID: d7777777-7777-7777-7777-777777777777 (36 chars)
 * Base62: ~22 chars
 */
export function uuidToBase62(uuid: string): string {
  try {
    // Remove dashes from UUID
    const hex = uuid.replace(/-/g, '');
    
    // Convert hex string to BigInt
    const bigInt = BigInt('0x' + hex);
    
    // Convert BigInt to base62
    let result = '';
    let remaining = bigInt;
    const base = BigInt(62);
    
    while (remaining > 0n) {
      const remainder = Number(remaining % base);
      result = BASE62[remainder] + result;
      remaining = remaining / base;
    }
    
    return result || '0';
  } catch (error) {
    console.error('Error encoding UUID to base62:', error);
    // Return original UUID if encoding fails
    return uuid;
  }
}

/**
 * Convert a base62 encoded string back to a UUID
 */
export function base62ToUuid(encoded: string): string {
  try {
    // If it already looks like a UUID (contains dashes or is 36 chars), return as-is
    if (encoded.includes('-') || encoded.length === 36) {
      return encoded;
    }
    
    // Convert base62 to BigInt
    let bigInt = BigInt(0);
    const base = BigInt(62);
    
    for (const char of encoded) {
      const index = BASE62.indexOf(char);
      if (index === -1) {
        console.error('Invalid base62 character:', char);
        return encoded;
      }
      bigInt = bigInt * base + BigInt(index);
    }
    
    // Convert BigInt to hex string (32 chars for UUID)
    let hex = bigInt.toString(16);
    
    // Pad with leading zeros if needed (UUID is 32 hex chars)
    hex = hex.padStart(32, '0');
    
    // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuid = [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
    
    return uuid;
  } catch (error) {
    console.error('Error decoding base62 to UUID:', error);
    // Return original string if decoding fails
    return encoded;
  }
}
