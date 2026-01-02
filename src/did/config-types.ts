/**
 * DID Method Configuration Types
 * Type-safe configuration for different DID methods
 */

/**
 * Configuration for did:web method
 */
export interface WebDIDConfig {
  /** DID method identifier */
  type: 'web';
  /** Domain name (e.g., "example.com") */
  domain: string;
  /** Port number (e.g., 3000) */
  port: number;
  /** Optional controller DID */
  controller?: string;
}

/**
 * Configuration for did:ethr method
 */
export interface EthrDIDConfig {
  /** DID method identifier */
  type: 'ethr';
  /** Network name (e.g., "sepolia", "mainnet") */
  network: string;
  /** JSON-RPC endpoint URL */
  rpcUrl: string;
  /** Optional chain ID (auto-detected from network if not provided) */
  chainId?: number;
  /** Optional registry contract address (uses default if not provided) */
  registry?: string;
}

/**
 * Union type for all DID method configurations
 */
export type DIDConfig = WebDIDConfig | EthrDIDConfig;
