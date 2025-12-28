/**
 * Human
 * A human entity that has a DID identity (injected, not inherited)
 * Humans can control Agents through the controller relationship
 * @module human
 */
import { createJWT, createJWS, verifyJWT } from 'did-jwt';
import type { DIDIdentity } from './did/types.js';
import { getResolver } from './did/resolver.js';
import type { SignedPayload, VerificationResult } from './types.js';

/**
 * Human - a human entity with DID identity
 *
 * DID identity is injected, not inherited.
 * Humans can control Agents by being set as their controller.
 */
export class Human {
  /** Injected DID identity */
  public readonly identity: DIDIdentity;

  /** Human ID (short identifier) */
  public readonly id: string;

  /**
   * Create a Human with injected DID identity
   * @param identity - DID identity from any provider (did:web, did:ethr)
   * @param id - Short identifier for the human
   */
  constructor(identity: DIDIdentity, id: string) {
    this.identity = identity;
    this.id = id;
  }

  /**
   * Human's DID
   * @returns The DID string (e.g., "did:web:example.com:humans:alice")
   */
  get did(): string {
    return this.identity.did;
  }

  /**
   * Key ID for signing
   * @returns The key ID used in JWS/JWT (e.g., "did:web:example.com:humans:alice#key-1")
   */
  get keyId(): string {
    return this.identity.keyId;
  }

  /**
   * DID Document
   * @returns The W3C DID Document for this human
   */
  get document() {
    return this.identity.document;
  }

  /**
   * Sign a payload as JWT
   * @param payload - The payload to sign
   * @returns Signed payload containing the JWT and original payload
   */
  async sign<T extends Record<string, unknown>>(payload: T): Promise<SignedPayload<T>> {
    const jwt = await createJWT(
      payload,
      { issuer: this.did, signer: this.identity.signer },
      { alg: 'ES256K', kid: this.keyId }
    );
    return { jws: jwt, payload };
  }

  /**
   * Sign data directly as JWS (no iss/iat claims)
   * @param data - The data to sign
   * @returns The compact JWS string
   */
  async signJWS(data: Record<string, unknown>): Promise<string> {
    return createJWS(data, this.identity.signer, { alg: 'ES256K', kid: this.keyId });
  }

  /**
   * Verify a signed payload
   * @param signed - The signed payload to verify
   * @returns Verification result with issuer and payload if successful
   */
  async verify<T = Record<string, unknown>>(signed: SignedPayload<T>): Promise<VerificationResult<T>> {
    try {
      const verified = await verifyJWT(signed.jws, {
        resolver: getResolver(),
      });

      return {
        verified: true,
        issuer: verified.issuer,
        payload: verified.payload as unknown as T,
      };
    } catch (error) {
      return {
        verified: false,
        issuer: '',
        payload: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
