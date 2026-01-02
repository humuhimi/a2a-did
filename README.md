# a2a-did

> DID-based authentication and verification for AI Agent-to-Agent communication

[![npm version](https://img.shields.io/npm/v/a2a-did.svg)](https://www.npmjs.com/package/a2a-did)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**a2a-did** provides decentralized identity (DID) primitives and DID-based extensions for the A2A Protocol, enabling cryptographically verifiable agent authentication and endpoint resolution without centralized registries.

> **Note:** This library provides the DID authentication layer that **extends** the A2A Protocol. It does **not** include `@a2a-js/sdk`. Use them together to build authenticated A2A agents.

## Features

- ✅ **DID Identity Management** - Create and resolve DIDs (did:web, did:ethr)
- ✅ **A2A Message Signing** - Sign messages with DID private keys (ES256K/JWS)
- ✅ **Signature Verification** - Verify signatures with DID public keys
- ✅ **Agent Resolution** - Resolve DID → Agent Card → A2A endpoint
- ✅ **IPFS Support** - CID-verified content retrieval (tamper-evident)
- ✅ **Zero Pre-registration** - No central registry required

## Installation

```bash
npm install a2a-did
```

**For complete A2A implementation**, also install:
```bash
npm install @a2a-js/sdk
```

## Quick Start

### 1. Create a DID Identity

```typescript
import { createAgentDIDService } from 'a2a-did';

// Option A: did:web (HTTPS-based, simple setup)
const webService = await createAgentDIDService(['web']);
const webIdentity = await webService.createIdentity({
  method: 'web',
  agentId: 'my-agent',
  config: {
    type: 'web',
    domain: 'example.com',
    port: 443  // HTTPS port (required)
  }
});
// → did:web:example.com%3A443:agents:my-agent

// Option B: did:ethr (Ethereum-based, blockchain-anchored)
const ethrService = await createAgentDIDService(['ethr']);
const ethrIdentity = await ethrService.createIdentity({
  method: 'ethr',
  agentId: 'my-agent',
  config: {
    type: 'ethr',
    network: 'sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY'
  }
});
// → did:ethr:sepolia:0x1234...
```

### 2. Sign A2A Messages

```typescript
import { signA2AMessage } from 'a2a-did';

// Create A2A message (JSON-RPC format)
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

// Sign with DID (use identity from step 1)
const signature = await signA2AMessage(message, webIdentity);

// Send signed request
await fetch('https://agent.example.com/a2a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...message, signature })
});
```

### 3. Verify Signatures (Server Side)

```typescript
import { verifySignedA2ARequest } from 'a2a-did';

app.post('/a2a', async (req, res) => {
  // Verify signature if present
  if (req.body.signature) {
    const result = await verifySignedA2ARequest(req.body);
    if (!result.valid) {
      return res.json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid signature' },
        id: req.body.id
      });
    }
    console.log(`Authenticated request from: ${result.senderDid}`);
  }

  // Process A2A message...
});
```

### 4. Resolve Agent Endpoints

```typescript
import { resolveA2AEndpoint } from 'a2a-did';

// Resolve DID → DID Document → Agent Card → A2A Endpoint
const endpoint = await resolveA2AEndpoint('did:ethr:sepolia:0x123...');
// → 'https://agent.example.com/a2a'

// Now communicate with the agent
await fetch(endpoint, {
  method: 'POST',
  body: JSON.stringify({ /* signed A2A message */ })
});
```

## Security Considerations

### What This Library Provides

- ✅ **Cryptographic authentication** - Verifies message authenticity and sender identity
- ✅ **Tamper detection** - Detects payload modifications via signature verification
- ✅ **Agent Card verification** - Validates A2A Protocol 0.3.0 Agent Card signatures

### What You Must Implement

- ⚠️ **Replay protection** - This library does NOT prevent message replay. Add `iat`/`exp`/`jti` to payloads and implement server-side replay cache. See [docs/SECURITY.md](./docs/SECURITY.md)
- ⚠️ **Signature policy** - Decide whether signatures are required or optional. See [docs/PRODUCTION.md](./docs/PRODUCTION.md)
- ⚠️ **Authorization** - This library only handles authentication (identity verification), not access control

### Trust Models

- **did:web** - Relies on HTTPS/TLS and DNS (same trust model as web PKI)
- **did:ethr** - Relies on Ethereum blockchain and RPC endpoint (tamper-resistant on-chain)
- **IPFS content** - CID-verified (tamper-evident, content-addressed) but relies on gateway availability for retrieval

**For detailed security considerations, see [docs/SECURITY.md](./docs/SECURITY.md)**

## Core API

### Identity Management

```typescript
// Create Agent DID service (factory function)
createAgentDIDService(methods: Array<'web' | 'ethr'>): Promise<AgentDIDService>

// AgentDIDService methods
service.createIdentity(options: {
  method: 'web' | 'ethr',
  agentId: string,
  config: WebConfig | EthrConfig
}): Promise<DIDIdentity>

// DID resolution (standalone function)
resolveDID(did: string): Promise<DIDDocument | null>
```

### Message Signing & Verification

```typescript
signA2AMessage(payload, identity): Promise<string>
verifyA2AMessageSignature(jws: string): Promise<VerificationResult>
verifySignedA2ARequest(request): Promise<VerificationResult>
```

### Agent Resolution

```typescript
resolveA2AEndpoint(did: string): Promise<string>
verifyAgentCard(agentCardUrl: string): Promise<VerificationResult>
extractAgentCardUrl(didDocument): string | undefined
```

## Documentation

- **[Signature Format Specification](./docs/SIGNATURE_FORMAT.md)** - JWS structure, sender DID extraction, payload format
- **[Security Guide](./docs/SECURITY.md)** - Replay protection, DoS mitigation, trust models, caching
- **[Production Deployment](./docs/PRODUCTION.md)** - Signature policies, performance optimization, monitoring

## Architecture

```
┌─────────────────────────────────────┐
│ Your Application                    │
│  - Agent discovery                  │
│  - Business logic                   │
│  - Replay protection (iat/exp/jti)  │
└───┬─────────────────────────────┬───┘
    │                             │
    │ uses                        │ uses
    ↓                             ↓
┌─────────────────────┐  ┌──────────────────────────┐
│ A2A Protocol        │  │ a2a-did (this library)   │
│ (@a2a-js/sdk)       │  │  - DID auth primitives   │
│  - JSON-RPC         │←─┤  - Signature signing     │
│  - Task management  │  │  - Signature verification│
└─────────────────────┘  │  - Agent resolution      │
                         └──────────────────────────┘
```

**Layer responsibilities:**
- **Application**: Discovery, authorization, replay protection, business logic
- **a2a-did**: DID authentication, signature verification, endpoint resolution
- **@a2a-js/sdk**: A2A Protocol implementation (JSON-RPC, task lifecycle)

## What This Library Does NOT Provide

- ❌ A2A Protocol implementation (use `@a2a-js/sdk`)
- ❌ Agent discovery/search (application-specific)
- ❌ Authorization/access control (application policy)
- ❌ Replay attack protection (see [docs/SECURITY.md](./docs/SECURITY.md))

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a Pull Request

## License

MIT

## Related Projects

- [A2A Protocol](https://github.com/a2aproject/A2A) - Agent-to-Agent Communication Protocol
- [W3C DID Core](https://www.w3.org/TR/did-core/) - Decentralized Identifiers specification
- [did-jwt](https://github.com/decentralized-identity/did-jwt) - JWT library for DIDs
