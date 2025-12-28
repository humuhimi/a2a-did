/**
 * DID Resolvers
 * Modular resolvers for different DID methods
 * @module did/resolvers
 */
export { createWebResolver } from './web.js';
export {
  createEthrResolver,
  createSepoliaResolver,
  KNOWN_NETWORKS,
  type EthrNetworkConfig,
  type EthrResolverConfig,
  type KnownNetwork,
} from './ethr.js';
