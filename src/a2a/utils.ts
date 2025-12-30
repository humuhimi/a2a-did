/**
 * A2A Utility Functions
 * @module a2a/utils
 */
import * as u8a from 'uint8arrays';

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
 * Fetch content from URI (supports http://, https://, ipfs://)
 * @param uri - URI to fetch (http://, https://, or ipfs://)
 * @param ipfsGateway - IPFS gateway URL with trailing slash (default: https://ipfs.io/ipfs/)
 * @returns Fetch response
 * @throws Error if URI scheme is unsupported
 */
export async function fetchUri(uri: string, ipfsGateway: string = 'https://ipfs.io/ipfs/'): Promise<Response> {
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '');
    const gatewayUrl = `${ipfsGateway}${cid}`;
    return fetch(gatewayUrl);
  } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return fetch(uri);
  } else {
    throw new Error(`Unsupported URI scheme: ${uri}`);
  }
}
