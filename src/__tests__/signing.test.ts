/**
 * Message Signing Tests
 * Tests for A2A message signing functionality
 */
import { describe, it, expect } from 'vitest';
import { createAgentDIDService } from '../did/factory.js';
import { signA2AMessage } from '../a2a/signing.js';

describe('A2A Message Signing', () => {
  it('should sign a message with did:web identity', async () => {
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

    const message = {
      jsonrpc: '2.0',
      method: 'test/message',
      params: { hello: 'world' },
    };

    const jws = await signA2AMessage(message, identity);

    expect(jws).toBeDefined();
    expect(typeof jws).toBe('string');
    expect(jws.split('.')).toHaveLength(3); // JWS compact format: header.payload.signature
  });

  it('should include correct header in JWS', async () => {
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

    const message = { jsonrpc: '2.0', method: 'test' };
    const jws = await signA2AMessage(message, identity);

    // Decode protected header from JWS compact format
    const [protectedB64] = jws.split('.');
    const protectedHeader = JSON.parse(
      Buffer.from(protectedB64, 'base64url').toString()
    );

    expect(protectedHeader.alg).toBe('ES256K');
    expect(protectedHeader.kid).toMatch(new RegExp(`^${identity.did}#`));
  });

  it('should fail when signing with identity without private key', async () => {
    const identityWithoutKey = {
      did: 'did:web:example.com',
      privateKey: new Uint8Array(0), // Empty key
    };

    const message = { jsonrpc: '2.0', method: 'test' };

    await expect(signA2AMessage(message, identityWithoutKey as any)).rejects.toThrow();
  });

  it('should handle empty message payload', async () => {
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

    const emptyMessage = {};
    const jws = await signA2AMessage(emptyMessage, identity);

    expect(jws).toBeDefined();
    expect(typeof jws).toBe('string');
    expect(jws.split('.')).toHaveLength(3);
  });
});
