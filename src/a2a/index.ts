/**
 * A2A Integration Module
 *
 * DID-based authentication and verification for A2A Protocol
 *
 * This module provides:
 * - DID signature creation for A2A messages (signing.ts)
 * - DID signature verification for A2A messages (verification.ts)
 * - Agent Card verification (verification.ts)
 * - DID-to-A2A endpoint resolution (resolution.ts)
 *
 * What this module does NOT provide:
 * - A2A communication (use @a2a-js/sdk)
 * - A2A server implementation (see packages/api)
 * - Message type definitions (use @a2a-js/sdk types)
 *
 * @module a2a
 */

// Constants
export * from './constants.js';

// Resolution functions
export * from './resolution.js';

// Verification functions
export * from './verification.js';

// Signing functions
export * from './signing.js';
