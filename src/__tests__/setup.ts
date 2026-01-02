/**
 * Test setup - polyfills for Node.js test environment
 */
import { webcrypto } from 'node:crypto';

// Polyfill File API for Node < 20
if (typeof File === 'undefined') {
  // @ts-ignore - Polyfill for Node 18
  global.File = class File {
    constructor(public bits: any[], public name: string, public options?: any) {}
  };
}

// Polyfill Web Crypto API for tests
if (typeof globalThis.crypto === 'undefined') {
  // @ts-ignore - Polyfill crypto for Node.js
  globalThis.crypto = webcrypto as any;
}
