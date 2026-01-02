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

# Example 3: Error handling best practices
npx tsx examples/03-error-handling.ts
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

### 03-error-handling.ts
**Difficulty: Intermediate**

Shows how to:
- Handle invalid configurations
- Catch common errors
- Implement production-ready error handling

**Use case:** Building robust applications

---

## ⚠️ Security Warning

These examples are for **development and testing only**.

**Do NOT use in production without:**
1. Implementing proper key management (KMS/HSM)
2. Adding replay attack protection
3. Validating DID resolution against SSRF
4. Following all mitigations in [SECURITY.md](../SECURITY.md)

## Next Steps

- Read the [API Documentation](../README.md)
- Review [SECURITY.md](../SECURITY.md) for production deployment
- Check out the [test suite](../src/__tests__/) for more usage patterns

## Need Help?

- Open an issue: https://github.com/humuhimi/a2a-did/issues
- Read the docs: https://github.com/humuhimi/a2a-did#readme
