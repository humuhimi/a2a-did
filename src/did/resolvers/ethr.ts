/**
 * did:ethr Resolver
 * Resolves did:ethr DIDs from Ethereum chains via RPC
 * @module did/resolvers/ethr
 */
import { type DIDResolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';

/**
 * Known Ethereum networks with their default configurations
 */
export const KNOWN_NETWORKS = {
  mainnet: {
    chainId: 1,
    registry: '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b',
  },
  sepolia: {
    chainId: 11155111,
    registry: '0x03d5003bf0e79c5f5223588f347eba39afbc3818',
  },
  goerli: {
    chainId: 5,
    registry: '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b',
  },
} as const;

export type KnownNetwork = keyof typeof KNOWN_NETWORKS;

/**
 * Configuration for a single Ethereum network
 */
export interface EthrNetworkConfig {
  /** Network name (e.g., 'mainnet', 'sepolia') */
  name: string;
  /** RPC URL for the network */
  rpcUrl: string;
  /** Chain ID (optional if using known network) */
  chainId?: number;
  /** EthereumDIDRegistry contract address (optional if using known network) */
  registry?: string;
}

/**
 * Configuration for did:ethr resolver
 */
export interface EthrResolverConfig {
  /** Network configurations */
  networks: EthrNetworkConfig[];
}

/**
 * Create did:ethr resolver with explicit configuration
 * @param config - Network configuration(s)
 * @returns DID resolver methods for did:ethr
 *
 * @example
 * // Single network
 * createEthrResolver({
 *   networks: [{
 *     name: 'sepolia',
 *     rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
 *   }]
 * });
 *
 * @example
 * // Multiple networks
 * createEthrResolver({
 *   networks: [
 *     { name: 'mainnet', rpcUrl: 'https://mainnet.infura.io/v3/KEY' },
 *     { name: 'sepolia', rpcUrl: 'https://sepolia.infura.io/v3/KEY' },
 *   ]
 * });
 */
export function createEthrResolver(config: EthrResolverConfig): Record<string, DIDResolver> {
  const networks = config.networks.map((network) => {
    // Use known network defaults if available
    const known = KNOWN_NETWORKS[network.name as KnownNetwork];

    return {
      name: network.name,
      rpcUrl: network.rpcUrl,
      chainId: network.chainId ?? known?.chainId,
      registry: network.registry ?? known?.registry,
    };
  });

  return getEthrResolver({ networks });
}

/**
 * Convenience function to create resolver for Sepolia testnet
 * @param rpcUrl - Sepolia RPC URL
 */
export function createSepoliaResolver(rpcUrl: string): Record<string, DIDResolver> {
  return createEthrResolver({
    networks: [{
      name: 'sepolia',
      rpcUrl,
    }],
  });
}
