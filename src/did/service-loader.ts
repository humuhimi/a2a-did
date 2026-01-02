/**
 * Agent DID Service Loader
 * Dynamically loads and registers DID method handlers
 * @module did/service-loader
 */
import type { AgentDIDService } from './service.js';

/**
 * Register DID method handlers to an AgentDIDService instance
 * Uses dynamic imports for lazy loading
 *
 * @param service - The AgentDIDService instance
 * @param methods - Array of DID methods to register ('web', 'ethr')
 */
export async function registerDIDHandlers(
  service: AgentDIDService,
  methods: Array<'web' | 'ethr'>
): Promise<void> {
  for (const method of methods) {
    if (method === 'web') {
      const { DIDWebMethodHandler } = await import('./handlers/web-handler.js');
      service.registerMethod('web', new DIDWebMethodHandler());
    } else if (method === 'ethr') {
      const { DIDEthrMethodHandler } = await import('./handlers/ethr-handler.js');
      service.registerMethod('ethr', new DIDEthrMethodHandler());
    }
  }
}
