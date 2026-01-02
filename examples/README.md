# Examples

This directory contains runnable examples demonstrating how to use the a2a-did library.

## Prerequisites

- Node.js >= 22.0.0
- Install dependencies: `pnpm install` (or `npm install`)

## Running Examples

All examples can be run with `npx tsx`:

```bash
# Example 1: Basic DID:web identity creation
npx tsx examples/01-basic-did-web.ts

# Example 2: Sign and verify A2A messages
npx tsx examples/02-sign-and-verify.ts

# Example 3: Cross-DID method communication
npx tsx examples/03-cross-did-communication.ts

# Example 4: Error handling best practices
npx tsx examples/04-error-handling.ts
```

## Examples Overview

### 01-basic-did-web.ts
**Difficulty: Beginner**

Shows how to:
- Create a DID service
- Generate a did:web identity
- Inspect the DID document

**Use case:** Getting started with DID identities

---

### 02-sign-and-verify.ts
**Difficulty: Intermediate**

Shows how to:
- Create an identity
- Sign an A2A message
- Inspect JWS signatures

**Use case:** Implementing message authentication

---

### 03-cross-did-communication.ts
**Difficulty: Intermediate**

Shows how to:
- Create agents with different DID methods (did:web and did:ethr)
- Exchange signed messages between different identity types
- Demonstrate cross-domain authentication without a central registry

**Use case:** Understanding how different DID methods interoperate

**Key demonstration:**
- Alice (did:web) and Bob (did:ethr) can authenticate each other
- No pre-registration or central authority needed
- Cryptographically verifiable identity across different networks

---

### 04-error-handling.ts
**Difficulty: Intermediate**

Shows how to:
- Handle invalid configurations
- Catch common errors
- Implement production-ready error handling

**Use case:** Building robust applications

---

## Production Deployment

These examples demonstrate basic usage. For production deployments, review [SECURITY.md](../SECURITY.md) to understand implementation responsibilities including:
- Key management strategies appropriate to your use case
- Network security considerations for DID resolution
- Optional replay protection if needed for your application

## Next Steps

- Read the [API Documentation](../README.md)
- Review [SECURITY.md](../SECURITY.md) for deployment considerations
- Check out the [test suite](../src/__tests__/) for more usage patterns

## Need Help?

- Open an issue: https://github.com/humuhimi/a2a-did/issues
- Read the docs: https://github.com/humuhimi/a2a-did#readme
