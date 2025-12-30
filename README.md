# a2a-did

> DID-based authentication and verification for AI Agent-to-Agent communication

[![npm version](https://img.shields.io/npm/v/a2a-did.svg)](https://www.npmjs.com/package/a2a-did)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**a2a-did** provides decentralized identity (DID) primitives and DID-based extensions for the A2A Protocol, enabling secure, trustless AI agent communication without centralized registries.

> **Note:** This library provides the DID authentication layer that **extends** the A2A Protocol. It does **not** depend on `@a2a-js/sdk`. Use this library together with `@a2a-js/sdk` to add DID-based authentication to your A2A agents.

## Features

- ✅ **DID Identity Management** - Create and resolve DIDs (did:web, did:ethr)
- ✅ **A2A Message Signing** - Sign messages with DID private keys
- ✅ **A2A Message Verification** - Verify signatures with DID public keys
- ✅ **Agent Resolution** - Resolve DID → Agent Card → A2A endpoint
- ✅ **W3C Standards Compliant** - Full W3C DID Core and EIP-1056 support
- ✅ **Zero Pre-registration** - No central registry required

## Installation

```bash
npm install a2a-did
```

**For complete A2A agent implementation**, also install:
```bash
npm install @a2a-js/sdk
```

This library provides DID authentication; `@a2a-js/sdk` provides the A2A communication protocol.

## Quick Start

### 1. Create a DID Identity

```typescript
import { createIdentity } from 'a2a-did';

// Option A: did:web (HTTPS-based, simple)
const webIdentity = await createIdentity('web', {
  agentId: 'my-agent',
  domain: 'example.com',
  port: 3000
});
// → did:web:example.com%3A3000:agents:my-agent

// Option B: did:ethr (Ethereum-based, tamper-resistant)
const ethrIdentity = await createIdentity('ethr', {
  agentId: 'my-agent',
  network: 'sepolia',
  rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY'
});
// → did:ethr:sepolia:0x1234...
```

### 2. Sign A2A Messages

```typescript
import { signA2AMessage } from 'a2a-did';

// Create A2A message
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
const signature = await signA2AMessage(message, webIdentity);

// Send signed request
const response = await fetch('https://agent.example.com/a2a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...message, signature })
});
```

### 3. Verify A2A Messages (Server Side)

```typescript
import { verifySignedA2ARequest } from 'a2a-did';

// In your A2A server
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

    console.log(`Authenticated message from: ${result.senderDid}`);
  }

  // Process A2A message...
});
```

### 4. Discover Agents

```typescript
import { resolveA2AEndpoint } from 'a2a-did';

// Resolve DID → DID Document → Agent Card → A2A Endpoint
const endpoint = await resolveA2AEndpoint('did:ethr:sepolia:0x123...');
// → 'https://agent.example.com/a2a'

// Now communicate with the agent
const response = await fetch(endpoint, {
  method: 'POST',
  body: JSON.stringify({ /* A2A message */ })
});
```

## Usage Examples

### Example 1: Dynamic Agent Discovery (No Pre-registration)

```typescript
import { resolveA2AEndpoint, signA2AMessage } from 'a2a-did';

// 1. Discover agent by DID (obtained from any discovery method)
const translatorDid = 'did:web:translator.example.com:agent-1';
const endpoint = await resolveA2AEndpoint(translatorDid);

// 2. Create and sign message
const message = {
  jsonrpc: '2.0',
  method: 'message/send',
  params: { /* task request */ },
  id: 1
};
const signature = await signA2AMessage(message, myIdentity);

// 3. Send authenticated request
await fetch(endpoint, {
  method: 'POST',
  body: JSON.stringify({ ...message, signature })
});
```

### Example 2: Cross-Domain Agent Authentication

```typescript
import { verifyA2AMessageSignature, resolveDID } from 'a2a-did';

// Agent from different domain sends message
const incomingMessage = {
  /* A2A message */,
  signature: 'eyJhbGc...' // JWS compact format
};

// Verify signature (automatically resolves sender's DID Document)
const verification = await verifyA2AMessageSignature(
  incomingMessage.signature
);

if (verification.valid) {
  console.log(`Trusted message from: ${verification.senderDid}`);

  // Optional: Get sender's Agent Card for additional info
  const didDoc = await resolveDID(verification.senderDid);
  const agentCardUrl = extractAgentCardUrl(didDoc);
  // ... fetch and verify Agent Card
}
```

### Example 3: Multi-DID Method Support

```typescript
import { createIdentity, registerDIDHandlers, DIDService } from 'a2a-did';

// Enterprise: Use did:web with existing infrastructure
const enterpriseAgent = await createIdentity('web', {
  agentId: 'sales-bot',
  domain: 'company.com'
});

// High-security: Use did:ethr with blockchain
const secureAgent = await createIdentity('ethr', {
  agentId: 'financial-advisor',
  network: 'mainnet',
  rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY'
});

// Custom DID resolution with multiple methods
const didService = new DIDService();
await registerDIDHandlers(didService, ['web', 'ethr']);

// Resolve any DID method
const doc1 = await didService.resolveDID('did:web:example.com');
const doc2 = await didService.resolveDID('did:ethr:0x123...');
```

### Example 4: Agent Card Verification (A2A Protocol 0.3.0)

```typescript
import { verifyAgentCard, extractAgentCardUrl, resolveDID } from 'a2a-did';

// 1. Get Agent Card URL from DID Document
const didDocument = await resolveDID('did:ethr:sepolia:0x123...');
const agentCardUrl = extractAgentCardUrl(didDocument);

// 2. Verify Agent Card signature
const cardVerification = await verifyAgentCard(agentCardUrl);

if (cardVerification.verified) {
  console.log(`Agent Card signed by: ${cardVerification.signerDid}`);
  // Agent Card is cryptographically verified
  // Safe to use the A2A endpoint
} else {
  console.error(`Verification failed: ${cardVerification.error}`);
}
```

### Example 5: IPFS-hosted Agent Cards

```typescript
import { resolveA2AEndpoint, verifyAgentCard } from 'a2a-did';

// Agent Card hosted on IPFS
const did = 'did:ethr:sepolia:0x123...';

// Resolve using custom IPFS gateway
const endpoint = await resolveA2AEndpoint(
  did,
  'https://gateway.pinata.cloud/ipfs/' // IPFS gateway
);

// Verify IPFS-hosted Agent Card
const agentCardUrl = 'ipfs://bafybei.../agent-card.json';
const verification = await verifyAgentCard(
  agentCardUrl,
  'https://gateway.pinata.cloud/ipfs/'
);
```

## API Reference

### DID Module

#### `createIdentity(method, config)`

Create a new DID identity.

```typescript
async function createIdentity(
  method: 'web' | 'ethr',
  config: DIDCreateOptions
): Promise<DIDIdentity>
```

**Parameters:**
- `method`: DID method ('web' or 'ethr')
- `config`: Configuration object
  - For did:web: `{ agentId, domain, port? }`
  - For did:ethr: `{ agentId, network, rpcUrl }`

**Returns:** `DIDIdentity` object containing:
- `did`: DID string
- `keyId`: Key identifier for signing
- `signer`: Signer function
- `privateKey`: Private key bytes
- `document?`: DID Document (did:web only)

#### `resolveDID(did)`

Resolve a DID to its DID Document.

```typescript
async function resolveDID(did: string): Promise<DIDDocument | null>
```

**Parameters:**
- `did`: DID string to resolve

**Returns:** DID Document or null if resolution fails

#### `registerDIDHandlers(service, methods)`

Register DID method handlers (for custom DID resolution).

```typescript
async function registerDIDHandlers(
  service: DIDService,
  methods: Array<'web' | 'ethr'>
): Promise<void>
```

### A2A Module

#### `signA2AMessage(payload, signer)`

Sign an A2A message with DID private key.

```typescript
async function signA2AMessage(
  payload: Record<string, unknown>,
  signer: DIDIdentity
): Promise<string>
```

**Parameters:**
- `payload`: A2A message object
- `signer`: DID identity (from `createIdentity`)

**Returns:** JWS signature (compact format)

#### `verifyA2AMessageSignature(jws, ipfsGateway?)`

Verify A2A message signature with Agent Card verification.

```typescript
async function verifyA2AMessageSignature(
  jws: string,
  ipfsGateway?: string
): Promise<MessageSignatureVerificationResult>
```

**Parameters:**
- `jws`: JWS signature string
- `ipfsGateway`: Optional IPFS gateway URL

**Returns:** Verification result:
- `valid`: boolean
- `senderDid?`: Sender's DID
- `error?`: Error message

#### `verifySignedA2ARequest(request, ipfsGateway?)`

Verify signed A2A request (convenience function for servers).

```typescript
async function verifySignedA2ARequest(
  request: { signature?: string; [key: string]: unknown },
  ipfsGateway?: string
): Promise<MessageSignatureVerificationResult>
```

#### `resolveA2AEndpoint(did, ipfsGateway?)`

Resolve DID to A2A endpoint URL.

```typescript
async function resolveA2AEndpoint(
  did: string,
  ipfsGateway?: string
): Promise<string>
```

**Flow:** DID → DID Document → Agent Card URL → Agent Card → A2A endpoint

#### `verifyAgentCard(agentCardUrl, ipfsGateway?)`

Verify Agent Card signature.

```typescript
async function verifyAgentCard(
  agentCardUrl: string,
  ipfsGateway?: string
): Promise<AgentCardVerificationResult>
```

**Parameters:**
- `agentCardUrl`: Agent Card URL (http://, https://, or ipfs://)
- `ipfsGateway`: Optional IPFS gateway URL

**Returns:** Verification result:
- `verified`: boolean
- `signerDid?`: Signer's DID
- `error?`: Error message

#### `extractAgentCardUrl(didDocument)`

Extract Agent Card URL from DID Document.

```typescript
function extractAgentCardUrl(
  didDocument: DIDDocument
): string | undefined
```

## Architecture

```
┌─────────────────────────────────────┐
│ Application Layer (Your Code)      │
│  - Agent Discovery                  │
│  - Business Logic                   │
│  - Policy Enforcement               │
└───┬─────────────────────────────┬───┘
    │                             │
    │ uses                        │ uses
    ↓                             ↓
┌─────────────────────┐  ┌──────────────────────────┐
│ A2A Protocol        │  │ a2a-did    │
│ (@a2a-js/sdk)       │  │                          │
│  - JSON-RPC         │  │  ┌──────────────────┐   │
│  - Task Management  │  │  │ A2A Module       │   │
│  - Message Routing  │←─┼──│  - Resolution    │   │
└─────────────────────┘  │  │  - Verification  │   │
                         │  │  - Signing       │   │
                         │  └────────┬─────────┘   │
                         │           │ uses         │
                         │  ┌────────┴─────────┐   │
                         │  │ DID Module       │   │
                         │  │  - Identity Mgmt │   │
                         │  │  - DID Resolution│   │
                         │  │  - Crypto        │   │
                         │  └──────────────────┘   │
                         └──────────────────────────┘
```

### Layer Responsibilities

**Application Layer** (your code)
- Agent discovery (search, filtering, matching) - Application-specific
- Business logic and workflows
- Policy enforcement
- Uses both A2A Protocol and a2a-did

**A2A Protocol** (`@a2a-js/sdk`)
- JSON-RPC message format
- Task lifecycle management
- Agent-to-Agent communication protocol
- Message routing

**a2a-did - A2A Module** (`a2a/`)
- **Purpose:** DID-based extensions for A2A Protocol (does NOT include A2A Protocol itself)
- DID → Endpoint resolution (resolves agent location)
- A2A message signing (adds DID signatures to A2A messages)
- Signature verification (verifies sender DID identity)
- Agent Card verification (A2A Protocol 0.3.0)
- **Note:** Use with `@a2a-js/sdk` for complete A2A communication

**a2a-did - DID Module** (`did/`)
- DID creation and management
- DID Document generation and resolution
- Public/private key management
- Cryptographic signing primitives

### Integration Pattern

```typescript
// Your Application
const myApp = {
  // 1. Discover agent (app-specific)
  agent: await myDiscoveryService.findAgent({ skill: 'translation' }),

  // 2. Resolve DID to endpoint (a2a-did)
  endpoint: await resolveA2AEndpoint(agent.did),

  // 3. Create A2A message (@a2a-js/sdk)
  message: createA2AMessage({ /* ... */ }),

  // 4. Sign with DID (a2a-did)
  signature: await signA2AMessage(message, myIdentity),

  // 5. Send via A2A Protocol
  response: await fetch(endpoint, {
    body: JSON.stringify({ ...message, signature })
  })
};
```

## Configuration

### did:ethr Configuration

For did:ethr, you need to configure RPC endpoint:

```typescript
import { createIdentity } from 'a2a-did';

const identity = await createIdentity('ethr', {
  agentId: 'my-agent',
  network: 'sepolia',
  rpcUrl: process.env.ETHEREUM_RPC_URL // Required
});
```

**Supported networks:**
- `mainnet` (Ethereum mainnet)
- `sepolia` (Sepolia testnet)
- `goerli` (Goerli testnet - deprecated)

### DID Document Service Endpoint

To integrate with A2A Protocol, add `A2AAgentCard` service to your DID Document:

```json
{
  "id": "did:web:example.com:agents:agent-1",
  "service": [{
    "id": "#agent-card",
    "type": "A2AAgentCard",
    "serviceEndpoint": "https://example.com/.well-known/agent-card.json"
  }]
}
```

## Security Notes

### 1. Agent Card Verification

`verifyA2AMessageSignature` automatically verifies Agent Card signatures before message verification (A2A Protocol 0.3.0 compliance).

### 2. Payload Integrity

`verifySignedA2ARequest` checks that the JWS payload matches the request body to prevent tampering.

### 3. DID Resolution

Public keys are fetched from DID Documents, which are resolved via:
- **did:web**: HTTPS + DNS
- **did:ethr**: Ethereum blockchain (EIP-1056)

### 4. Replay Attack Protection

Currently not implemented. Consider adding:
- `iat` (issued at) timestamp
- `exp` (expiration) timestamp
- `nonce` for one-time use

## What This Library Does NOT Provide

This library provides **DID authentication primitives** that extend the A2A Protocol. It intentionally does **not** include:

### **A2A Protocol Implementation**
This library does **not** depend on or include `@a2a-js/sdk`. It provides a bridge between DID and A2A:
- ❌ JSON-RPC message creation
- ❌ Task lifecycle management
- ❌ Message routing
- ✅ Use `@a2a-js/sdk` for protocol implementation
- ✅ Use this library to add DID signatures to A2A messages

### **Agent Discovery (Search/Matching)**
This is application-specific business logic:
- ❌ Agent directories/registries
- ❌ Search and filtering (finding agents by skill, reputation, etc.)
- ❌ Skill matching
- ❌ Reputation management
- ℹ️  **Note:** This library provides **resolution** (DID → endpoint), not **discovery** (searching for agents)

### **Authorization**
Only handles authentication (identity verification):
- ❌ Fine-grained access control
- ❌ Policy enforcement
- ❌ Resource permissions

## Roadmap

- [ ] Replay attack protection (nonce, timestamp)
- [ ] Key rotation support
- [ ] Verifiable Credentials integration
- [ ] Delegation chains
- [ ] Cross-chain DID resolution
- [ ] Performance optimizations (caching, batch verification)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Related Projects

- [A2A Protocol](https://github.com/a2aproject/A2A) - Agent-to-Agent Communication Protocol
- [W3C DID Core](https://www.w3.org/TR/did-core/) - Decentralized Identifiers specification
- [Universal Resolver](https://github.com/decentralized-identity/universal-resolver) - DID resolution service

## Citation

If you use this library in your research, please cite:

```bibtex
@software{universal_agent_core,
  title = {a2a-did: DID-based Authentication for A2A Protocol},
  author = {[Your Name]},
  year = {2025},
  url = {https://github.com/[username]/universal-agent-demo}
}
```
