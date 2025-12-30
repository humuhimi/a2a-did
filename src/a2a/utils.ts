/**
 * A2A Utility Functions
 * @module a2a/utils
 */
import * as u8a from 'uint8arrays';
import { verifiedFetch } from '@helia/verified-fetch';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Base64URL encode a string
 */
export function base64UrlEncode(str: string): string {
  return u8a.toString(textEncoder.encode(str), 'base64url');
}

/**
 * Decode base64url to JSON
 */
export function decodeBase64UrlJson(str: string): Record<string, unknown> {
  const json = textDecoder.decode(u8a.fromString(str, 'base64url'));
  return JSON.parse(json);
}

/**
 * Normalize JSON for comparison
 */
export function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeJson(record[key]);
        return acc;
      }, {});
  }
  return value;
}

/**
 * Compare JSON objects for equality
 */
export function jsonEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizeJson(a)) === JSON.stringify(normalizeJson(b));
}

/**
 * Fetch content from URI with cryptographic verification for IPFS content
 *
 * - For ipfs:// and ipns:// URIs: Uses @helia/verified-fetch for trustless content retrieval
 *   with CID verification, multiple gateway fallbacks, and tamper detection
 * - For http:// and https:// URIs: Uses standard fetch (assumes TLS provides sufficient security)
 *
 * @param uri - URI to fetch (http://, https://, ipfs://, or ipns://)
 * @returns Fetch response
 * @throws Error if URI scheme is unsupported or verification fails
 */
export async function fetchUri(uri: string): Promise<Response> {
  if (uri.startsWith('ipfs://') || uri.startsWith('ipns://')) {
    // Use verified fetch for IPFS/IPNS content (cryptographic verification + multiple gateways)
    return verifiedFetch(uri);
  } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
    // Use standard fetch for HTTP/HTTPS (TLS provides transport security)
    return fetch(uri);
  } else {
    throw new Error(`Unsupported URI scheme: ${uri}`);
  }
}
