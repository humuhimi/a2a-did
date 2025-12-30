/**
 * Agent
 * An autonomous entity that has a DID identity (injected, not inherited)
 * @module agent
 */
import { createJWT, createJWS, verifyJWT } from 'did-jwt';
import type { DIDIdentity, ServiceEndpoint } from './did/types.js';
import { getResolver } from './did/resolver.js';
import type { SignedPayload, VerificationResult } from './types.js';
import { A2A_AGENT_CARD_SERVICE_TYPE } from './a2a/client.js';

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent name */
  name: string;
  /** Agent description */
  description?: string;
}

/**
 * Agent - an autonomous entity with DID identity
 *
 * DID identity is injected, not inherited.
 * Agent can use any DID method (did:web, did:ethr)
 */
export class Agent {
  /** Injected DID identity */
  public readonly identity: DIDIdentity;

  /** Agent ID (short identifier) */
  public readonly id: string;

  /** Agent name */
  public readonly name: string;

  /** Agent description */
  public readonly description: string;

  /**
   * Create an Agent with injected DID identity
   * @param identity - DID identity from any provider (did:web, did:ethr)
   * @param id - Short identifier for the agent
   * @param config - Agent configuration (name, description)
   */
  constructor(identity: DIDIdentity, id: string, config: AgentConfig) {
    this.identity = identity;
    this.id = id;
    this.name = config.name;
    this.description = config.description ?? '';
  }

  /**
   * Agent's DID
   * @returns The DID string (e.g., "did:web:example.com:agents:bot-1")
   */
  get did(): string {
    return this.identity.did;
  }

  /**
   * Key ID for signing
   * @returns The key ID used in JWS/JWT (e.g., "did:web:example.com:agents:bot-1#key-1")
   */
  get keyId(): string {
    return this.identity.keyId;
  }

  /**
   * DID Document (if available locally)
   * - did:web: Available (locally generated)
   * - did:ethr: undefined (use resolveDID() to get from chain)
   * @returns The W3C DID Document or undefined
   */
  get document() {
    return this.identity.document;
  }

  /**
   * Check if local DID Document is available
   * @returns true if document is available locally
   */
  hasLocalDocument(): boolean {
    return this.identity.document !== undefined;
  }

  /**
   * Controller DID (if set in local document)
   * @returns The DID of the controller (typically a Human), or undefined
   */
  get controller(): string | undefined {
    const ctrl = this.identity.document?.controller;
    if (!ctrl) return undefined;
    return Array.isArray(ctrl) ? ctrl[0] : ctrl;
  }

  /**
   * Get all service endpoints from local DID Document
   * For did:ethr, use resolveDID() instead to get on-chain services
   * @returns Array of service endpoints (empty if no local document)
   */
  getServices(): ServiceEndpoint[] {
    return this.identity.document?.service ?? [];
  }

  /**
   * Get a specific service by type from local DID Document
   * For did:ethr, use resolveDID() instead to get on-chain services
   * @param type - The service type to find (e.g., "A2AAgent")
   * @returns The service endpoint if found, undefined otherwise
   */
  getService(type: string): ServiceEndpoint | undefined {
    return this.identity.document?.service?.find(s => s.type === type);
  }

  /**
   * Get A2A Agent Card URL from local DID Document
   * For did:ethr, use resolveDID() instead to get on-chain Agent Card URL
   * @returns The Agent Card URL if configured, undefined otherwise
   */
  getA2AEndpoint(): string | undefined {
    const service = this.getService(A2A_AGENT_CARD_SERVICE_TYPE);
    if (!service) return undefined;
    return typeof service.serviceEndpoint === 'string'
      ? service.serviceEndpoint
      : undefined;
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
