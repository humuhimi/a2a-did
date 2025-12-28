/**
 * DID Types and Interfaces
 * Extensible design for multiple DID methods (did:web, did:ethr)
 * @module did/types
 */
import type { Signer } from 'did-jwt';

/**
 * JSON Web Key (minimal definition for Node.js)
 * @see https://datatracker.ietf.org/doc/html/rfc7517
 */
export interface JsonWebKey {
  /** Key type (e.g., "EC", "RSA") */
  kty?: string;
  /** Curve name for EC keys (e.g., "secp256k1") */
  crv?: string;
  /** X coordinate for EC keys (base64url encoded) */
  x?: string;
  /** Y coordinate for EC keys (base64url encoded) */
  y?: string;
  /** Private key for EC keys (base64url encoded) */
  d?: string;
  /** Modulus for RSA keys */
  n?: string;
  /** Exponent for RSA keys */
  e?: string;
  /** Key ID */
  kid?: string;
  /** Public key use (e.g., "sig", "enc") */
  use?: string;
  /** Algorithm (e.g., "ES256K") */
  alg?: string;
}

/**
 * Supported DID methods
 */
export type DIDMethod = 'web' | 'ethr';

/**
 * Verification Method in DID Document
 * @see https://www.w3.org/TR/did-core/#verification-methods
 */
export interface VerificationMethod {
  /** Verification method ID (e.g., "did:web:example.com#key-1") */
  id: string;
  /** Type of verification method (e.g., "JsonWebKey2020") */
  type: string;
  /** DID of the controller */
  controller: string;
  /** Public key in JWK format */
  publicKeyJwk?: JsonWebKey;
  /** Public key in multibase format */
  publicKeyMultibase?: string;
}

/**
 * Service Endpoint in DID Document
 * Used for self-declaration of communication endpoints
 * @see https://www.w3.org/TR/did-core/#services
 */
export interface ServiceEndpoint {
  /** Service ID (e.g., "did:web:example.com#a2a") */
  id: string;
  /** Service type (e.g., "A2AAgent") */
  type: string;
  /** Service endpoint URL or configuration */
  serviceEndpoint: string | string[] | Record<string, unknown>;
}

/**
 * DID Document (W3C DID Core compliant)
 * @see https://www.w3.org/TR/did-core/#core-properties
 */
export interface DIDDocument {
  /** JSON-LD context */
  '@context': string | string[];
  /** The DID subject */
  id: string;
  /** Controller DID(s) */
  controller?: string | string[];
  /** Verification methods */
  verificationMethod?: VerificationMethod[];
  /** Authentication verification methods */
  authentication?: (string | VerificationMethod)[];
  /** Assertion verification methods */
  assertionMethod?: (string | VerificationMethod)[];
  /** Key agreement verification methods */
  keyAgreement?: (string | VerificationMethod)[];
  /** Service endpoints */
  service?: ServiceEndpoint[];
}

/**
 * Options for creating a new DID
 */
export interface DIDCreateOptions {
  /** Domain for did:web (e.g., "example.com" or "localhost:3001") */
  domain?: string;
  /** Path segments for did:web (e.g., ['agents', 'agent-a']) */
  path?: string[];
  /** Controller DID (e.g., a Human's DID that controls this Agent) */
  controller?: string;
  /** Service endpoints to include in the DID Document */
  services?: ServiceEndpoint[];
}

/**
 * Result of creating a new DID identity
 * Contains everything needed to use the DID for signing and verification
 */
export interface DIDIdentity {
  /** The DID string (e.g., "did:web:example.com:agents:bot-1") */
  did: string;
  /** Key ID for signing (e.g., "did:web:example.com:agents:bot-1#key-1") */
  keyId: string;
  /** Signer function for creating JWS/JWT signatures */
  signer: Signer;
  /**
   * The DID Document (optional)
   * - did:web: Available immediately (locally generated for HTTP serving)
   * - did:ethr: Not available at creation time (resolve via resolveDID() when needed)
   */
  document?: DIDDocument;
  /** Private key bytes (for storage/recovery) */
  privateKey: Uint8Array;
}

/**
 * DID Resolution Result
 * @see https://www.w3.org/TR/did-core/#did-resolution
 */
export interface DIDResolutionResult {
  /** The resolved DID Document, or null if resolution failed */
  didDocument: DIDDocument | null;
  /** Metadata about the DID Document */
  didDocumentMetadata: Record<string, unknown>;
  /** Metadata about the resolution process */
  didResolutionMetadata: {
    /** Error code if resolution failed */
    error?: string;
    /** Error message */
    message?: string;
  };
}
