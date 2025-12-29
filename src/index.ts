/**
 * Core package entry point
 * Exports DID-related types, providers, resolvers, and helper utilities
 * for creating and managing decentralized identities
 */

// DID module
export * from './did/types.js';
export * from './did/resolver.js';
export * from './did/factory.js';
export * from './did/service.js';
export * from './did/signing.js';

// A2A client utilities
export * from './a2a/client.js';
