# a2a-did

> DID-based authentication for A2A Protocol - Sign and verify agent messages with did:web and did:ethr

[![npm version](https://img.shields.io/npm/v/a2a-did.svg)](https://www.npmjs.com/package/a2a-did)
[![CI](https://github.com/humuhimi/a2a-did/actions/workflows/ci.yml/badge.svg)](https://github.com/humuhimi/a2a-did/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**a2a-did** provides decentralized identity (DID) authentication for the A2A Protocol, enabling cryptographically verifiable agent-to-agent communication without centralized registries.

> ⚠️ **Experimental Release**: This is v0.1.x with a focus on core functionality. See [SECURITY.md](./SECURITY.md) for production deployment considerations.

## Features

- ✅ **DID Identity Management** - Create and resolve DIDs (did:web, did:ethr)
- ✅ **Message Signing** - Sign A2A messages with DID private keys (ES256K/JWS)
- ✅ **Signature Verification** - Verify message authenticity with DID public keys
- ✅ **Cross-Domain Communication** - Authenticate messages between agents on different domains
- ✅ **Extensible DID Methods** - Factory pattern supports custom DID method handlers
- ✅ **Zero Pre-registration** - No central registry required
- ✅ **A2A SDK Compatible** - Works with `@a2a-js/sdk` official middleware (`express.json()`)

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

### 2. Send Messages (Client)

```typescript
import { ClientFactory } from '@a2a-js/sdk/client';

// Use A2A SDK official client
const factory = new ClientFactory();
const client = await factory.createFromUrl('https://agent.example.com');

const result = await client.sendMessage({
  message: {
    kind: 'message',
    messageId: 'msg-123',
    role: 'user',
    parts: [{ kind: 'text', text: 'Hello' }]
  }
});
```

### 3. Verify Signatures (Server)

```typescript
import { jsonRpcHandler } from '@a2a-js/sdk/server/express';
import { verifySignedA2ARequest } from 'a2a-did';

// Use A2A SDK official server middleware
app.use('/a2a', jsonRpcHandler({
  requestHandler,
  userBuilder
}));

// Optional: For signature verification, add middleware before jsonRpcHandler
// that uses verifySignedA2ARequest() - see API Reference below
```

## Examples

See the [`examples/`](./examples) directory for runnable code demonstrations:

```bash
npx tsx examples/01-basic-did-web.ts
npx tsx examples/02-sign-and-verify.ts
npx tsx examples/03-cross-did-communication.ts
npx tsx examples/04-error-handling.ts
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

### Extensibility

This library uses a **factory pattern** for DID method handlers, making it easy to add support for additional DID methods that can provide service endpoints (e.g., `did:peer`, `did:ion`, `did:sov`).

**Adding Custom DID Methods:**

```typescript
import { AgentDIDService } from 'a2a-did';

// Implement custom handler
class MyCustomDIDHandler implements DIDMethodHandler {
  async createIdentity(agentId: string, config: MyConfig): Promise<DIDIdentity> {
    // Your implementation
  }
  // ... other methods
}

// Register with service
const service = new AgentDIDService();
service.registerHandler('mymethod', new MyCustomDIDHandler());
```

See [`examples/`](./examples) for runnable code or `src/did/handlers/` for implementation details.

### Cross-Domain Communication

Agents using different DID methods can authenticate each other:

- **Agent A** (`did:web:company-a.com:agents:alice`) can verify messages from **Agent B** (`did:ethr:0x123...`)
- **Agent C** (`did:web:company-b.com:agents:charlie`) can verify messages from **Agent A**
- No pre-registration or shared infrastructure required

Each agent resolves the sender's DID Document independently to verify signatures.

## Security Considerations

⚠️ **Important**: This library provides authentication (identity verification) only. You must implement:

- **Replay protection**: Add `iat`/`exp`/`jti` to prevent message replay
- **Authorization**: Access control policies for your agents
- **Rate limiting**: Protection against DoS attacks
- **Key Management**: Keys are generated in memory. Consider KMS/HSM for production
- **DID Resolution**: Implement domain allowlisting if SSRF protection is required

See [SECURITY.md](./SECURITY.md) for detailed security considerations.

## Usage Notes

**Message Signatures**: The A2A Protocol specification does not yet include standardized message signatures. This library provides optional signature verification for server implementations. Client-side signing is not currently demonstrated in examples, as the `@a2a-js/sdk` client does not include signature extension fields in its standard API. Server implementations can add signature verification middleware as needed (see Quick Start section 3).

## Support

- 🐛 **Bug Reports**: [Open an issue](https://github.com/humuhimi/a2a-did/issues/new?template=bug_report.md)
- 💡 **Feature Requests**: [Open an issue](https://github.com/humuhimi/a2a-did/issues/new?template=feature_request.md)
- 💬 **Questions**: [GitHub Discussions](https://github.com/humuhimi/a2a-did/discussions) or open an issue
- 🔒 **Security**: See [SECURITY.md](./SECURITY.md)

## Contributing

Contributions are welcome! This project uses:

- **Factory pattern** for extensible DID method support
- **TypeScript strict mode** for type safety
- **Vitest** for testing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Adding new DID methods
- Pull request process

## License

[MIT License](./LICENSE) - Free to use commercially and privately

This is permissive open source: you can use, modify, and distribute this software with minimal restrictions. See LICENSE file for full terms.

## Related Projects

- [A2A Protocol](https://github.com/a2aproject/A2A) - Agent-to-Agent Communication Protocol
- [W3C DID Core](https://www.w3.org/TR/did-core/) - Decentralized Identifiers specification
