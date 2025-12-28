/**
 * did:web Provider Implementation
 *
 * This provider creates did:web identities and builds DID Documents.
 * Resolution is handled by the web-did-resolver library.
 *
 * @module did/web-provider
 */
import { randomBytes } from 'node:crypto';
import { ES256KSigner } from 'did-jwt';
import { getPublicKey } from '@noble/secp256k1';
import * as u8a from 'uint8arrays';
import type { DIDProvider } from './provider.js';
import type {
  DIDCreateOptions,
  DIDIdentity,
  DIDDocument,
  ServiceEndpoint,
  JsonWebKey,
} from './types.js';

/**
 * Convert public key to JWK format
 * @param publicKey - The secp256k1 public key bytes (33 or 65 bytes)
 * @returns The public key in JWK format
 */
function publicKeyToJwk(publicKey: Uint8Array): JsonWebKey {
  // For secp256k1, we need to handle compressed (33 bytes) or uncompressed (65 bytes) keys
  // The compressed key starts with 0x02 or 0x03, uncompressed with 0x04

  // For compressed key, we store it as-is and use crv: secp256k1
  // JWK for secp256k1 uses x and y coordinates (32 bytes each)
  if (publicKey.length === 33) {
    // Compressed key - store as x coordinate with compressed flag
    return {
      kty: 'EC',
      crv: 'secp256k1',
      x: u8a.toString(publicKey.slice(1), 'base64url'),
    };
  }

  // Uncompressed key (65 bytes: 04 || x || y)
  const x = publicKey.slice(1, 33);
  const y = publicKey.slice(33, 65);

  return {
    kty: 'EC',
    crv: 'secp256k1',
    x: u8a.toString(x, 'base64url'),
    y: u8a.toString(y, 'base64url'),
  };
}

/**
 * did:web Provider
 *
 * Creates did:web identities and builds DID Documents.
 *
 * DID format: did:web:domain or did:web:domain:path:segments
 *
 * @example
 * const provider = new WebDIDProvider();
 * const identity = await provider.create({
 *   domain: 'example.com',
 *   path: ['users', 'alice'],
 * });
 * // identity.did = 'did:web:example.com:users:alice'
 */
export class WebDIDProvider implements DIDProvider {
  readonly method = 'web' as const;

  /**
   * Create a new did:web identity
   * @param options - Creation options including domain and path
   * @returns The created DID identity with keys and document
   * @throws Error if domain is not provided
   */
  async create(options: DIDCreateOptions): Promise<DIDIdentity> {
    const { domain, path = [], controller, services = [] } = options;

    if (!domain) {
      throw new Error('Domain is required for did:web');
    }

    // Generate secp256k1 key pair
    const privateKey = new Uint8Array(randomBytes(32));
    const publicKey = getPublicKey(privateKey, false); // uncompressed

    // Build DID string
    // Encode special characters (: → %3A for port numbers)
    const encodedDomain = domain.replace(/:/g, '%3A');
    const did = path.length > 0
      ? `did:web:${encodedDomain}:${path.join(':')}`
      : `did:web:${encodedDomain}`;

    const keyId = `${did}#key-1`;
    const signer = ES256KSigner(privateKey);

    // Build DID Document
    const document = this.buildDocumentInternal(
      did,
      keyId,
      publicKey,
      controller,
      services
    );

    return {
      did,
      keyId,
      signer,
      document,
      privateKey,
    };
  }

  /**
   * Build DID Document for an existing identity
   * @param identity - The DID identity to build document for
   * @param options - Optional creation options (controller, services)
   * @returns The DID Document
   */
  buildDocument(identity: DIDIdentity, options?: DIDCreateOptions): DIDDocument {
    const publicKey = getPublicKey(identity.privateKey, false);
    return this.buildDocumentInternal(
      identity.did,
      identity.keyId,
      publicKey,
      options?.controller,
      options?.services
    );
  }

  /**
   * Internal method to build DID Document
   * @param did - The DID string
   * @param keyId - The key ID
   * @param publicKey - The public key bytes
   * @param controller - Optional controller DID
   * @param services - Optional service endpoints
   * @returns The DID Document
   */
  private buildDocumentInternal(
    did: string,
    keyId: string,
    publicKey: Uint8Array,
    controller?: string,
    services?: ServiceEndpoint[]
  ): DIDDocument {
    const doc: DIDDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
      ],
      id: did,
      verificationMethod: [
        {
          id: keyId,
          type: 'JsonWebKey2020',
          controller: did,
          publicKeyJwk: publicKeyToJwk(publicKey),
        },
      ],
      authentication: [keyId],
      assertionMethod: [keyId],
    };

    if (controller) {
      doc.controller = controller;
    }

    if (services && services.length > 0) {
      doc.service = services;
    }

    return doc;
  }
}
