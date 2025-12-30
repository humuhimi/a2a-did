/**
 * DID Document builder functions with dynamic handler loading
 * @module did/document
 */
import type { DIDIdentity, DIDDocument, ServiceEndpoint } from './types.js';

/**
 * Build DID Document for a given identity
 * Dynamically loads the appropriate DID method handler
 *
 * Note: Only supports did:web. For did:ethr, documents are resolved from on-chain.
 *
 * @param identity - The DID identity
 * @param options - Optional services to include in the document
 * @returns The DID Document
 * @throws {Error} When DID method is not 'web'
 */
export async function buildDocumentForIdentity(
  identity: DIDIdentity,
  options?: { services?: ServiceEndpoint[] }
): Promise<DIDDocument> {
  const method = identity.did.split(':')[1]; // 'did:web:...' → 'web'

  if (method === 'web') {
    const { DIDWebMethodHandler } = await import('./handlers/web-handler.js');
    const handler = new DIDWebMethodHandler();
    return handler.buildDocumentForIdentity(identity, options);
  }

  throw new Error(`buildDocumentForIdentity only supports did:web. For did:ethr, use DID resolver instead.`);
}
