/**
 * did:web Resolver
 * Supports HTTP for localhost, HTTPS for production domains
 * @module did/resolvers/web
 */
import { Resolver, type DIDResolver, type ParsedDID, type DIDResolutionResult } from 'did-resolver';
import { getResolver as getWebResolver } from 'web-did-resolver';
import type { DIDDocument } from '../types.js';

/**
 * Create did:web resolver
 * - localhost: Uses HTTP
 * - Production domains: Uses HTTPS via web-did-resolver
 */
export function createWebResolver(): Record<string, DIDResolver> {
  const webResolver = getWebResolver();

  async function resolve(did: string, parsed: ParsedDID): Promise<DIDResolutionResult> {
    // Decode domain from DID (e.g., localhost%3A3001 → localhost:3001)
    const domainPart = parsed.id.split(':')[0];
    if (!domainPart) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: 'invalidDid',
          message: 'Invalid DID format',
        },
      };
    }

    const domain = decodeURIComponent(domainPart);

    // For localhost, use HTTP and custom resolution
    if (domain.startsWith('localhost')) {
      return resolveLocalhost(did, parsed);
    }

    // For production domains, delegate to web-did-resolver (uses HTTPS)
    const webResolverFn = webResolver.web;
    if (!webResolverFn) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: 'internalError',
          message: 'Web resolver not available',
        },
      };
    }

    return webResolverFn(did, parsed, {} as Resolver, {});
  }

  return { web: resolve };
}

/**
 * Resolve localhost did:web DIDs using HTTP
 */
async function resolveLocalhost(did: string, parsed: ParsedDID): Promise<DIDResolutionResult> {
  // Build path: did:web:localhost%3A3001:agents:agent-a → localhost:3001/agents/agent-a/did.json
  const pathSegments = parsed.id.split(':').map(decodeURIComponent);
  const domain = pathSegments[0];
  const path = pathSegments.length > 1
    ? `${pathSegments.slice(1).join('/')}/did.json`
    : '.well-known/did.json';

  const url = `http://${domain}/${path}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        didDocument: null,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: 'notFound',
          message: `HTTP ${response.status}: ${response.statusText}`,
        },
      };
    }

    const didDocument = await response.json() as DIDDocument;

    // Verify document ID matches requested DID
    if (didDocument.id !== did) {
      return {
        didDocument: didDocument as unknown as import('did-resolver').DIDDocument,
        didDocumentMetadata: {},
        didResolutionMetadata: {
          error: 'notFound',
          message: 'DID document id does not match requested did',
        },
      };
    }

    return {
      didDocument: didDocument as unknown as import('did-resolver').DIDDocument,
      didDocumentMetadata: {},
      didResolutionMetadata: {
        contentType: didDocument['@context'] ? 'application/did+ld+json' : 'application/did+json',
      },
    };
  } catch (error) {
    return {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: {
        error: 'notFound',
        message: `Failed to fetch DID document: ${error}`,
      },
    };
  }
}
