# a2a-did

> DID-based authentication for A2A Protocol - Sign and verify agent messages with did:web and did:ethr

[![npm version](https://img.shields.io/npm/v/a2a-did.svg)](https://www.npmjs.com/package/a2a-did)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**a2a-did** provides decentralized identity (DID) authentication for the A2A Protocol, enabling cryptographically verifiable agent-to-agent communication without centralized registries.

## Features

- ✅ **DID Identity Management** - Create and resolve DIDs (did:web, did:ethr)
- ✅ **Message Signing** - Sign A2A messages with DID private keys (ES256K/JWS)
- ✅ **Signature Verification** - Verify message authenticity with DID public keys
- ✅ **Zero Pre-registration** - No central registry required

## Installation

```bash
npm install a2a-did
```

## Quick Start

### 1. Create a DID Identity

```typescript
import { createAgentDIDService } from 'a2a-did';

// Create did:web identity (HTTPS-based)
const service = await createAgentDIDService(['web']);
const identity = await service.createIdentity({
  method: 'web',
  agentId: 'my-agent',
  config: {
    type: 'web',
    domain: 'example.com',
    port: 443
  }
});

console.log(identity.did);
// → did:web:example.com%3A443:agents:my-agent
```

### 2. Sign A2A Messages

```typescript
import { signA2AMessage } from 'a2a-did';

// A2A Protocol message
const message = {
  jsonrpc: '2.0',
  method: 'message/send',
  params: {
    message: {
      kind: 'message',
      messageId: 'msg-123',
      role: 'user',
      parts: [{ kind: 'text', text: 'Hello' }]
    }
  },
  id: 1
};

// Sign with DID
const signature = await signA2AMessage(message, identity);

// Send signed request
const signedRequest = { ...message, signature };
await fetch('https://agent.example.com/a2a', {
  method: 'POST',
  body: JSON.stringify(signedRequest)
});
```

### 3. Verify Signatures

```typescript
import { verifySignedA2ARequest } from 'a2a-did';

app.post('/a2a', async (req, res) => {
  if (req.body.signature) {
    const result = await verifySignedA2ARequest(req.body);

    if (!result.valid) {
      return res.json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid signature' },
        id: req.body.id
      });
    }

    console.log(`Authenticated: ${result.senderDid}`);
  }

  // Process message...
});
```

## API Reference

### Identity Management

```typescript
// Create DID service
createAgentDIDService(methods: Array<'web' | 'ethr'>): Promise<AgentDIDService>

// Create identity
service.createIdentity(options: {
  method: 'web' | 'ethr',
  agentId: string,
  config: WebConfig | EthrConfig
}): Promise<DIDIdentity>
```

### Message Signing

```typescript
// Sign message
signA2AMessage(payload: object, identity: DIDIdentity): Promise<string>

// Verify signature
verifySignedA2ARequest(request: object): Promise<{
  valid: boolean;
  senderDid?: string;
  error?: string;
}>
```

### Agent Resolution

```typescript
// Resolve DID → A2A endpoint
resolveA2AEndpoint(did: string): Promise<string>
```

## DID Methods

### did:web

- **Trust model**: HTTPS/TLS (same as web PKI)
- **Setup**: Simple (HTTPS server only)
- **Use case**: Corporate agents, fixed endpoints

### did:ethr

- **Trust model**: Ethereum blockchain
- **Setup**: Requires RPC endpoint
- **Use case**: Dynamic agents, cross-domain

## Security Notes

⚠️ **Important**: This library provides authentication (identity verification) only. You must implement:

- **Replay protection**: Add `iat`/`exp`/`jti` to prevent message replay
- **Authorization**: Access control policies for your agents
- **Rate limiting**: Protection against DoS attacks

## License

MIT

## Related Projects

- [A2A Protocol](https://github.com/a2aproject/A2A) - Agent-to-Agent Communication Protocol
- [W3C DID Core](https://www.w3.org/TR/did-core/) - Decentralized Identifiers specification
