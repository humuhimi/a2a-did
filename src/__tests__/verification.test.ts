/**
 * Message Verification Tests
 * Tests for A2A message verification with mocked DID resolution
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DIDDocument } from '../did/types.js';

// Mock @helia/verified-fetch to avoid node-datachannel dependency
vi.mock('@helia/verified-fetch', () => ({
  verifiedFetch: vi.fn(),
}));

// Mock fetchUri for Agent Card resolution
vi.mock('../a2a/utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../a2a/utils.js')>();
  return {
    ...actual,
    fetchUri: vi.fn(),
  };
});

// Mock resolveDID for DID resolution
vi.mock('../did/resolver.js', () => ({
  resolveDID: vi.fn(),
}));

import { createAgentDIDService } from '../did/factory.js';
import { signA2AMessage } from '../a2a/signing.js';
import { verifySignedA2ARequest } from '../a2a/verification.js';
import { resolveDID } from '../did/resolver.js';
import { fetchUri } from '../a2a/utils.js';

describe('A2A Message Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify a correctly signed message', async () => {
    // Create identity and sign message
    const service = await createAgentDIDService(['web']);
    const identity = await service.createIdentity({
      method: 'web',
      agentId: 'alice',
      config: {
        type: 'web',
        domain: 'alice.example.com',
        port: 443,
      },
    });

    const message = {
      jsonrpc: '2.0',
      method: 'message/send',
      params: { content: 'Hello' },
    };

    const jws = await signA2AMessage(message, identity);

    // Create and sign Agent Card
    const agentCard = {
      protocolVersion: '0.3.0',
      name: 'Alice Agent',
      description: 'Test agent',
      url: 'https://alice.example.com',
    };

    const agentCardJws = await signA2AMessage(agentCard, identity);
    const [protectedB64, , signatureB64] = agentCardJws.split('.');

    const signedAgentCard = {
      ...agentCard,
      signatures: [
        {
          protected: protectedB64,
          signature: signatureB64,
        },
      ],
    };

    // Mock DID resolution
    const didDocWithAgentCard = {
      ...identity.document,
      service: [
        {
          id: `${identity.did}#agent-card`,
          type: 'A2AAgentCard',
          serviceEndpoint: 'https://alice.example.com/agent-card.json',
        },
      ],
    } as DIDDocument;

    vi.mocked(resolveDID).mockResolvedValue(didDocWithAgentCard);

    // Mock Agent Card fetch
    vi.mocked(fetchUri).mockResolvedValue(
      new Response(JSON.stringify(signedAgentCard))
    );

    // Verify the signed message
    const request = { ...message, signature: jws };
    const result = await verifySignedA2ARequest(request);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.senderDid).toBe(identity.did);
  });

  it('should reject message with tampered signature', async () => {
    // Create identity and sign message
    const service = await createAgentDIDService(['web']);
    const identity = await service.createIdentity({
      method: 'web',
      agentId: 'alice',
      config: {
        type: 'web',
        domain: 'alice.example.com',
        port: 443,
      },
    });

    const message = {
      jsonrpc: '2.0',
      method: 'message/send',
      params: { content: 'Hello' },
    };

    const jws = await signA2AMessage(message, identity);

    // Tamper with signature
    const [header, payload, signature] = jws.split('.');
    const tamperedJws = `${header}.${payload}.${signature}X`;

    // Mock DID resolution
    const didDocWithAgentCard = {
      ...identity.document,
      service: [
        {
          id: `${identity.did}#agent-card`,
          type: 'A2AAgentCard',
          serviceEndpoint: 'https://alice.example.com/agent-card.json',
        },
      ],
    } as DIDDocument;

    vi.mocked(resolveDID).mockResolvedValue(didDocWithAgentCard);

    // Verify tampered message
    const request = { ...message, signature: tamperedJws };
    const result = await verifySignedA2ARequest(request);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject message with tampered payload', async () => {
    // Create identity and sign message
    const service = await createAgentDIDService(['web']);
    const identity = await service.createIdentity({
      method: 'web',
      agentId: 'alice',
      config: {
        type: 'web',
        domain: 'alice.example.com',
        port: 443,
      },
    });

    const message = {
      jsonrpc: '2.0',
      method: 'message/send',
      params: { content: 'Hello' },
    };

    const jws = await signA2AMessage(message, identity);

    // Create and sign Agent Card
    const agentCard = {
      protocolVersion: '0.3.0',
      name: 'Alice Agent',
      description: 'Test agent',
      url: 'https://alice.example.com',
    };

    const agentCardJws = await signA2AMessage(agentCard, identity);
    const [protectedB64, , signatureB64] = agentCardJws.split('.');

    const signedAgentCard = {
      ...agentCard,
      signatures: [
        {
          protected: protectedB64,
          signature: signatureB64,
        },
      ],
    };

    // Mock DID resolution
    const didDocWithAgentCard = {
      ...identity.document,
      service: [
        {
          id: `${identity.did}#agent-card`,
          type: 'A2AAgentCard',
          serviceEndpoint: 'https://alice.example.com/agent-card.json',
        },
      ],
    } as DIDDocument;

    vi.mocked(resolveDID).mockResolvedValue(didDocWithAgentCard);

    // Mock Agent Card fetch
    vi.mocked(fetchUri).mockResolvedValue(
      new Response(JSON.stringify(signedAgentCard))
    );

    // Tamper with payload
    const tamperedMessage = {
      ...message,
      params: { content: 'Modified' },
    };

    const request = { ...tamperedMessage, signature: jws };
    const result = await verifySignedA2ARequest(request);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('does not match');
  });

  it('should handle DID resolution failure', async () => {
    const message = {
      jsonrpc: '2.0',
      method: 'test',
      signature: 'eyJhbGciOiJFUzI1NksiLCJraWQiOiJkaWQ6d2ViOmV4YW1wbGUuY29tI2tleS0xIn0.eyJ0ZXN0IjoiZGF0YSJ9.mock',
    };

    // Mock DID resolution failure
    vi.mocked(resolveDID).mockResolvedValue(null);

    const result = await verifySignedA2ARequest(message);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Failed to resolve');
  });
});
