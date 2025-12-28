/**
 * DID Provider Interface
 * Abstract interface for different DID methods
 * @module did/provider
 */
import type {
  DIDCreateOptions,
  DIDIdentity,
  DIDDocument,
} from './types.js';

/**
 * DID Provider Interface
 * Implement this for each DID method (did:web, did:ethr, etc.)
 *
 * Resolution methods differ by DID method:
 * - did:web: HTTP resolution (DID Document served at URL)
 * - did:ethr: On-chain resolution (DID Document built from contract events)
 */
export interface DIDProvider {
  /** DID method name (e.g., 'web', 'ethr') */
  readonly method: string;

  /**
   * Create a new DID identity
   * @param options - Creation options (domain, path, controller, services)
   * @returns DID identity with keys and optionally document
   */
  create(options: DIDCreateOptions): Promise<DIDIdentity>;

  /**
   * Build DID Document for a given identity
   * Optional: Only required for DID methods that serve documents via HTTP (e.g., did:web)
   * Not needed for on-chain resolution methods (e.g., did:ethr)
   *
   * @param identity - The DID identity
   * @param options - Additional options (services, controller, etc.)
   * @returns DID Document
   */
  buildDocument?(identity: DIDIdentity, options?: DIDCreateOptions): DIDDocument;
}
