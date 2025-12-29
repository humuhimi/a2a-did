/**
 * Core package entry point
 * Exports DID-related types, providers, resolvers, and helper utilities
 * for creating and managing decentralized identities
 */

// DID types and providers
export * from './did/types.js';
export * from './did/provider.js';
export * from './did/web-provider.js';
export * from './did/ethr-provider.js';
export * from './did/resolver.js';
export * from './did/factory.js';
export * from './did/service.js';

// A2A client utilities
export * from './a2a/client.js';
