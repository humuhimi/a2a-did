/**
 * Web DID Method Handler
 * Handles DID operations for did:web
 */
import { ES256KSigner } from 'did-jwt';
import { getPublicKey } from '@noble/secp256k1';
import * as u8a from 'uint8arrays';
import type { DIDMethodHandler } from '../service.js';
import type { DIDIdentity, ServiceEndpoint, DIDDocument, JsonWebKey } from '../types.js';
import type { DIDConfig } from '../config-types.js';

/**
 * Generate cryptographically secure random bytes
 */
function randomBytes(size: number): Uint8Array {
  const cryptoProvider = globalThis.crypto;
  if (!cryptoProvider?.getRandomValues) {
    throw new Error('crypto.getRandomValues is required for did:web key generation');
  }
  const bytes = new Uint8Array(size);
  cryptoProvider.getRandomValues(bytes);
  return bytes;
}

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
 * Web DID Method Handler
 * Implements DID operations for did:web method
 * did:web resolves DIDs through HTTPS to .well-known/did.json
 * @implements {DIDMethodHandler}
 */
export class DIDWebMethodHandler implements DIDMethodHandler {
  /**
   * Create a new did:web identity
   * @param options - Configuration options
   * @param options.agentId - Agent unique identifier
   * @param options.config - Web DID configuration (domain, port)
   * @param options.services - Optional service endpoints to include in DID Document
   * @returns Promise resolving to DID identity with document
   * @throws {Error} When config type is not 'web' or domain is missing
   */
  async createIdentity(options: {
    agentId: string;
    config: DIDConfig;
    services?: ServiceEndpoint[];
  }): Promise<DIDIdentity> {
    const config = options.config;
    if (config.type !== 'web') {
      throw new Error('Invalid config for did:web');
    }

    if (!config.domain) {
      throw new Error('Domain is required for did:web');
    }

    // Generate secp256k1 key pair
    const privateKey = new Uint8Array(randomBytes(32));
    const publicKey = getPublicKey(privateKey, false); // uncompressed

    // Build DID string
    // Omit port 443 (HTTPS default) per did:web best practices
    // Encode special characters (: → %3A for non-standard port numbers)
    const port = config.port ?? 443;
    const portSuffix = port === 443 ? '' : `:${port}`;
    const encodedDomain = `${config.domain}${portSuffix}`.replace(/:/g, '%3A');
    const path = `agents/${options.agentId}`;
    const did = `did:web:${encodedDomain}:${path.split('/').join(':')}`;

    const keyId = `${did}#key-1`;
    const signer = ES256KSigner(privateKey);

    // Build DID Document
    const document = this.buildDocumentInternal(
      did,
      keyId,
      publicKey,
      config.controller,
      options.services
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
   * Register a service endpoint for did:web
   * No-op for did:web as service endpoints are declared in the DID Document
   * served at .well-known/did.json (handled during DID creation)
   * @param _options - Registration options (unused)
   * @returns Promise resolving to empty array (no transaction hashes)
   */
  async registerServiceEndpoint(_options: {
    did: string;
    privateKey: string;
    serviceEndpoint: string;
    config: DIDConfig;
  }): Promise<string[]> {
    // did:web does not require on-chain service registration
    // Services are declared in the DID Document served at .well-known/did.json
    // This is already handled during DID creation
    return [];
  }

  /**
   * Extract wallet address from did:web
   * @param _did - DID string (unused for did:web)
   * @returns undefined (did:web has no wallet address concept)
   */
  extractWalletAddress(_did: string): string | undefined {
    // did:web does not have a wallet address
    return undefined;
  }

  /**
   * Get key ID for did:web
   * @param did - DID string
   * @returns Default key identifier with #key-1 fragment
   * @example
   * getKeyId("did:web:example.com") // returns "did:web:example.com#key-1"
   */
  getKeyId(did: string): string {
    return `${did}#key-1`;
  }

  /**
   * Build DID Document for an existing identity
   * @param identity - The DID identity to build document for
   * @param options - Optional creation options (controller, services)
   * @returns The DID Document
   */
  buildDocumentForIdentity(
    identity: DIDIdentity,
    options?: { controller?: string; services?: ServiceEndpoint[] }
  ): DIDDocument {
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
   * Internal: Build DID Document
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
