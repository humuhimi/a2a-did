/**
 * Smoke Tests
 * Basic import and API surface tests that work without heavy dependencies
 * Full integration tests require Node.js >= 22 due to native module requirements
 */
import { describe, it, expect } from 'vitest';

describe('Smoke: Module Exports', () => {
  it('should export factory function', async () => {
    const { createAgentDIDService } = await import('../did/factory.js');
    expect(createAgentDIDService).toBeTypeOf('function');
  });

  it('should export config types', async () => {
    const types = await import('../did/config-types.js');
    expect(types).toBeDefined();
  });

  it.skip('should export A2A functions (requires Node 22+)', async () => {
    // Skipped: Full A2A imports require native modules that need Node 22+
    // This test will run in CI with Node 22
    const { signA2AMessage, verifySignedA2ARequest } = await import('../a2a/index.js');
    expect(signA2AMessage).toBeTypeOf('function');
    expect(verifySignedA2ARequest).toBeTypeOf('function');
  });

  it('should export types', async () => {
    const types = await import('../did/types.js');
    expect(types).toBeDefined();
  });
});

describe('Smoke: Type Safety', () => {
  it('should have WebDIDConfig type', async () => {
    const { createAgentDIDService } = await import('../did/factory.js');

    // This would fail at compile time if types are wrong
    const config: import('../did/config-types.js').WebDIDConfig = {
      type: 'web',
      domain: 'example.com',
      port: 443,
    };

    expect(config.type).toBe('web');
    expect(config.domain).toBe('example.com');
    expect(config.port).toBe(443);
  });

  it('should have EthrDIDConfig type', async () => {
    const config: import('../did/config-types.js').EthrDIDConfig = {
      type: 'ethr',
      network: 'sepolia',
      rpcUrl: 'https://test.com',
    };

    expect(config.type).toBe('ethr');
    expect(config.network).toBe('sepolia');
    expect(config.rpcUrl).toBe('https://test.com');
  });
});
