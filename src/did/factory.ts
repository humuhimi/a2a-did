/**
 * Agent DID Service Factory
 * Provides convenience functions for creating pre-configured AgentDIDService instances
 */
import { AgentDIDService } from './service.js';

/**
 * Supported DID methods for factory creation
 */
export type DIDMethod = 'web' | 'ethr';

/**
 * Create an AgentDIDService with specified methods
 * Uses dynamic imports for tree-shaking - only requested methods are bundled
 *
 * @param methods - Array of DID methods to enable (default: ['web'])
 * @returns Configured AgentDIDService instance
 *
 * @example
 * // did:web only (no ethers dependency)
 * const service = await createAgentDIDService(['web']);
 *
 * @example
 * // did:web + did:ethr (includes ethers)
 * const service = await createAgentDIDService(['web', 'ethr']);
 */
export async function createAgentDIDService(methods: DIDMethod[] = ['web']): Promise<AgentDIDService> {
  const service = new AgentDIDService();

  for (const method of methods) {
    if (method === 'web') {
      const { DIDWebMethodHandler } = await import('./handlers/web-handler.js');
      service.registerMethod('web', new DIDWebMethodHandler());
    } else if (method === 'ethr') {
      const { DIDEthrMethodHandler } = await import('./handlers/ethr-handler.js');
      service.registerMethod('ethr', new DIDEthrMethodHandler());
    } else {
      // Type guard ensures this never happens with proper typing
      throw new Error(`Unsupported DID method: ${method}`);
    }
  }

  return service;
}

/**
 * Get all supported DID method names
 * @returns Array of supported method names
 */
export function getSupportedDIDMethods(): DIDMethod[] {
  return ['web', 'ethr'];
}
