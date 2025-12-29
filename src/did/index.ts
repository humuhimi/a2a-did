/**
 * DID Module
 * @module did
 */

// Core types and interfaces
export * from './types.js';

// DID Service (requires explicit handler registration)
export * from './service.js';

// Factory helper (lazy loading with tree-shaking)
export * from './factory.js';

// Resolver
export * from './resolver.js';

// Signing utilities
export * from './signing.js';
