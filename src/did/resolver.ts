/**
 * DID Resolver
 * Combines modular resolvers for different DID methods
 * @module did/resolver
 */
import { Resolver, type DIDResolver } from 'did-resolver';
import { createWebResolver } from './resolvers/web.js';
import { createEthrResolver, type EthrResolverConfig } from './resolvers/ethr.js';
import type { DIDDocument } from './types.js';

/**
 * Resolver configuration
 * Specify which DID methods to enable and their configurations
 */
export interface ResolverConfig {
  /** Enable did:web resolver (default: true) */
  web?: boolean;
  /** did:ethr configuration (omit to disable) */
  ethr?: EthrResolverConfig;
  // Future DID methods can be added here:
  // key?: boolean;
  // ion?: IonResolverConfig;
  // pkh?: PkhResolverConfig;
}

// Singleton resolver instance (lazy initialized)
let defaultResolver: Resolver | null = null;
let defaultConfig: ResolverConfig | null = null;

/**
 * Create a new DID resolver with specified configuration
 * @param config - Resolver configuration
 * @returns Configured Resolver instance
 *
 * @example
 * // did:web only (no external dependencies)
 * const resolver = createResolver({ web: true });
 *
 * @example
 * // did:web + did:ethr
 * const resolver = createResolver({
 *   web: true,
 *   ethr: {
 *     networks: [{
 *       name: 'sepolia',
 *       rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
 *     }]
 *   }
 * });
 */
export function createResolver(config: ResolverConfig = {}): Resolver {
  const resolvers: Record<string, DIDResolver> = {};

  // did:web (enabled by default)
  if (config.web !== false) {
    Object.assign(resolvers, createWebResolver());
  }

  // did:ethr (requires explicit configuration)
  if (config.ethr) {
    Object.assign(resolvers, createEthrResolver(config.ethr));
  }

  // Future DID methods can be added here following the same pattern

  return new Resolver(resolvers);
}

/**
 * Configure the default resolver
 * Call this at application startup to set up DID resolution
 * @param config - Resolver configuration
 *
 * @example
 * // In your app initialization
 * configureResolver({
 *   web: true,
 *   ethr: {
 *     networks: [{ name: 'sepolia', rpcUrl: process.env.SEPOLIA_RPC_URL }]
 *   }
 * });
 */
export function configureResolver(config: ResolverConfig): void {
  defaultConfig = config;
  defaultResolver = createResolver(config);
}

/**
 * Get the default resolver instance
 * If not configured, creates a did:web-only resolver
 * @returns The default Resolver instance
 */
export function getResolver(): Resolver {
  if (!defaultResolver) {
    // Default: did:web only (no external dependencies)
    defaultResolver = createResolver({ web: true });
    defaultConfig = { web: true };
  }
  return defaultResolver;
}

/**
 * Get the current resolver configuration
 * @returns Current configuration or null if using defaults
 */
export function getResolverConfig(): ResolverConfig | null {
  return defaultConfig;
}

/**
 * Check if a specific DID method is enabled
 * @param method - DID method to check (e.g., 'web', 'ethr')
 * @returns true if the method is enabled in the current configuration
 */
export function isMethodEnabled(method: 'web' | 'ethr'): boolean {
  const config = defaultConfig ?? { web: true };
  switch (method) {
    case 'web':
      return config.web !== false;
    case 'ethr':
      return !!config.ethr;
    default:
      return false;
  }
}

/**
 * Resolve a DID to its document
 * @param did - The DID to resolve
 * @returns The DID Document if found, null otherwise
 */
export async function resolveDID(did: string): Promise<DIDDocument | null> {
  const resolver = getResolver();
  const result = await resolver.resolve(did);
  if (result.didResolutionMetadata.error) {
    return null;
  }
  return result.didDocument as unknown as DIDDocument;
}

// Re-export resolver types and utilities
export { createWebResolver } from './resolvers/web.js';
export {
  createEthrResolver,
  createSepoliaResolver,
  KNOWN_NETWORKS,
  type EthrNetworkConfig,
  type EthrResolverConfig,
  type KnownNetwork,
} from './resolvers/ethr.js';
