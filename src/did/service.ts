/**
 * DID Service
 * Orchestrates DID operations through pluggable method handlers
 */
import type { DIDIdentity, ServiceEndpoint } from './types.js';

/**
 * DID Method Handler Interface
 * Each DID method (ethr, web, etc.) implements this interface
 */
export interface DIDMethodHandler {
  /**
   * Create a new DID identity
   */
  createIdentity(options: {
    agentId: string;
    config: any;
    services?: ServiceEndpoint[];
  }): Promise<DIDIdentity>;

  /**
   * Register a service endpoint for the DID
   * @param serviceEndpoint - Already uploaded URI (e.g., ipfs://...)
   */
  registerServiceEndpoint(options: {
    did: string;
    privateKey: string;
    serviceEndpoint: string;
    config: any;
  }): Promise<string[]>;

  /**
   * Extract wallet address from DID
   * @param did - DID string (e.g., "did:ethr:sepolia:0x...")
   * @returns Wallet address or undefined if not applicable
   */
  extractWalletAddress(did: string): string | undefined;

  /**
   * Get default key ID for DID
   * @param did - DID string
   * @returns Key identifier (e.g., "did:ethr:...#controller")
   */
  getKeyId(did: string): string;
}

/**
 * DID Service
 * Provides a unified interface for DID operations across different methods
 * Handlers must be explicitly registered using registerMethod()
 */
export class DIDService {
  private methods: Map<string, DIDMethodHandler>;

  constructor() {
    // Empty initialization - handlers must be registered explicitly
    this.methods = new Map();
  }

  /**
   * Register a custom DID method handler
   * Can be used to add new methods or override built-in ones
   * @param name - DID method name (e.g., 'ethr', 'web', 'ion')
   * @param handler - Method-specific implementation
   */
  registerMethod(name: string, handler: DIDMethodHandler): void {
    this.methods.set(name.toLowerCase(), handler);
  }

  /**
   * Create a DID identity
   * @throws {Error} If DID method is not supported
   */
  async createIdentity(options: {
    method: string;
    agentId: string;
    config: any;
    services?: ServiceEndpoint[];
  }): Promise<DIDIdentity> {
    const handler = this.methods.get(options.method.toLowerCase());
    if (!handler) {
      throw new Error(`Unsupported DID method: ${options.method}`);
    }
    return handler.createIdentity(options);
  }

  /**
   * Register a service endpoint for a DID
   * @param serviceEndpoint - Already uploaded URI (e.g., ipfs://...)
   * @throws {Error} If DID method is not supported
   */
  async registerServiceEndpoint(options: {
    method: string;
    did: string;
    privateKey: string;
    serviceEndpoint: string;
    config: any;
  }): Promise<string[]> {
    const handler = this.methods.get(options.method.toLowerCase());
    if (!handler) {
      throw new Error(`Unsupported DID method: ${options.method}`);
    }
    return handler.registerServiceEndpoint(options);
  }

  /**
   * Extract wallet address from DID
   * Delegates to the appropriate handler based on DID method
   * @param did - DID string
   * @param method - DID method name
   * @returns Wallet address or undefined
   * @throws {Error} If DID method is not supported
   */
  extractWalletAddress(did: string, method: string): string | undefined {
    const handler = this.methods.get(method.toLowerCase());
    if (!handler) {
      throw new Error(`Unsupported DID method: ${method}`);
    }
    return handler.extractWalletAddress(did);
  }

  /**
   * Get default key ID for a DID
   * Delegates to the appropriate handler based on DID method
   * @param did - DID string
   * @param method - DID method name
   * @returns Key identifier
   * @throws {Error} If DID method is not supported
   */
  getKeyId(did: string, method: string): string {
    const handler = this.methods.get(method.toLowerCase());
    if (!handler) {
      throw new Error(`Unsupported DID method: ${method}`);
    }
    return handler.getKeyId(did);
  }
}
