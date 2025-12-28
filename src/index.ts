/**
 * Core package entry point
 * Exports DID-related types, providers, resolvers, and factory functions
 * for creating and managing decentralized identities
 */

// DID types and providers
export * from './did/types.js';
export * from './did/provider.js';
export * from './did/web-provider.js';
export * from './did/ethr-provider.js';
export * from './did/resolver.js';
export * from './did/factory.js';
