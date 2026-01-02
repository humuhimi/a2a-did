/**
 * DID Handler Tests
 * Tests for DID identity creation with did:web and did:ethr
 */
import { describe, it, expect } from 'vitest';
import { createAgentDIDService } from '../did/factory.js';

describe('DID Handlers: did:web', () => {
  it('should create did:web identity', async () => {
    const service = await createAgentDIDService(['web']);

    const identity = await service.createIdentity({
      method: 'web',
      agentId: 'test-agent',
      config: {
        type: 'web',
        domain: 'example.com',
        port: 443,
      },
    });

    expect(identity).toBeDefined();
    expect(identity.did).toMatch(/^did:web:example\.com/);
    expect(identity.privateKey).toBeInstanceOf(Uint8Array);
    expect(identity.privateKey.length).toBe(32);
  });

  it('should create did:web document with correct structure', async () => {
    const service = await createAgentDIDService(['web']);

    const identity = await service.createIdentity({
      method: 'web',
      agentId: 'test-agent',
      config: {
        type: 'web',
        domain: 'example.com',
        port: 443,
      },
    });

    expect(identity.document).toBeDefined();
    expect(identity.document?.id).toBe(identity.did);
    expect(identity.document?.verificationMethod).toBeDefined();
    expect(identity.document?.verificationMethod?.length).toBeGreaterThan(0);
  });

  it('should fail with invalid domain', async () => {
    const service = await createAgentDIDService(['web']);

    await expect(
      service.createIdentity({
        method: 'web',
        agentId: 'test-agent',
        config: {
          type: 'web',
          domain: '', // Invalid empty domain
          port: 443,
        },
      })
    ).rejects.toThrow();
  });
});

describe('DID Handlers: Factory', () => {
  it('should throw error for unsupported DID method', async () => {
    const service = await createAgentDIDService(['web']);

    await expect(
      service.createIdentity({
        method: 'unsupported' as any,
        agentId: 'test-agent',
        config: { type: 'web', domain: 'example.com', port: 443 } as any,
      })
    ).rejects.toThrow(/not registered|unsupported/i);
  });

  it('should register multiple DID methods', async () => {
    const service = await createAgentDIDService(['web', 'ethr']);

    // Should be able to create both types
    const webIdentity = await service.createIdentity({
      method: 'web',
      agentId: 'test-agent-web',
      config: {
        type: 'web',
        domain: 'example.com',
        port: 443,
      },
    });

    expect(webIdentity.did).toMatch(/^did:web:/);
  });
});
