/**
 * Core package entry point
 * Exports DID-related types, providers, resolvers, and helper utilities
 * for creating and managing decentralized identities
 */

// DID module
export * from './did/types.js';
export * from './did/config-types.js';
export * from './did/resolver.js';
export * from './did/factory.js';
export * from './did/service.js';
export * from './did/service-loader.js';
export * from './did/signing.js';
export * from './did/document.js';

// A2A integration (DID-based signing and verification)
export * from './a2a/index.js';
