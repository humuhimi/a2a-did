# Security Considerations

## Overview

**a2a-did** is an experimental v0.1.0 library for DID-based authentication in A2A Protocol implementations. Like other cryptographic libraries (jose, ethers.js, did-jwt, noble-secp256k1), this library provides cryptographic primitives and delegates security implementation decisions to developers based on their specific requirements.

---

## Implementation Responsibilities

### Key Management

This library generates and handles cryptographic keys in memory, which is the standard approach for cryptographic libraries in JavaScript/TypeScript.

**Production Considerations:**
- Choose key storage based on your security requirements:
  - **In-memory**: Suitable for many applications, matches behavior of other crypto libraries
  - **KMS/HSM**: For high-security scenarios (AWS KMS, Azure Key Vault, HashiCorp Vault)
  - **Hardware Security**: For maximum protection (YubiKey, Ledger, TPM)
- Implement key rotation policies appropriate to your use case
- Never commit private keys to version control
- Use environment-specific keys (separate dev/staging/production)

**Example Integration:**
```typescript
// Application-level key management (your responsibility)
import { createAgentDIDService } from 'a2a-did';

// Option 1: Generate new key (development)
const service = await createAgentDIDService(['web']);
const identity = await service.createIdentity({...});

// Option 2: Load from KMS (production - implement externally)
const privateKey = await loadKeyFromKMS('my-key-id');
// Use privateKey with your own signer implementation
```

---

### Network Security (DID Resolution)

The `did:web` resolver fetches DID Documents from HTTPS URLs as specified in the [W3C did:web specification](https://w3c-ccg.github.io/did-method-web/).

**Production Considerations:**
- **SSRF Protection**: If your deployment is sensitive to SSRF, implement domain allowlisting
- **Request Timeouts**: Configure appropriate timeouts for your network environment
- **Rate Limiting**: Implement rate limiting if DID resolution is exposed to untrusted input
- **Private Networks**: Block private IP ranges if your application shouldn't access internal resources

**Note**: These concerns apply to any did:web implementation and should be addressed at the application or infrastructure level based on your specific deployment requirements.

**Example:**
```typescript
// Application-level domain validation (your responsibility)
import { resolveDID } from 'a2a-did';

async function safeDIDResolution(did: string) {
  const domain = extractDomainFromDID(did);

  // Apply your organization's policies
  if (!isAllowedDomain(domain)) {
    throw new Error('Domain not allowed');
  }

  return await resolveDID(did);
}
```

---

### Message Replay Protection

This library verifies cryptographic signatures but does not enforce timestamp or nonce validation, allowing applications to implement replay protection strategies appropriate to their needs.

**Production Considerations:**
- Add `iat` (issued at) and `exp` (expiration) claims to messages if time-based validation is needed
- Include `jti` (nonce) for preventing replay attacks in high-security scenarios
- Implement nonce tracking (Redis, database) if required
- Set expiration times based on your application's requirements (not all applications need replay protection)

**Example:**
```typescript
// Application-level replay protection (your responsibility)
import { verifySignedA2ARequest } from 'a2a-did';

async function verifyWithReplayProtection(request: SignedRequest) {
  // 1. Verify signature
  const result = await verifySignedA2ARequest(request);
  if (!result.valid) {
    throw new Error('Invalid signature');
  }

  // 2. Check timestamp (if your application requires it)
  const now = Math.floor(Date.now() / 1000);
  if (request.payload.exp && request.payload.exp < now) {
    throw new Error('Token expired');
  }

  // 3. Check nonce (if your application requires it)
  if (request.payload.jti && await isNonceUsed(request.payload.jti)) {
    throw new Error('Token already used');
  }

  return result;
}
```

---

### Input Validation

**Recommendations:**
- Validate DID format before processing: `did:<method>:<method-specific-id>`
- Sanitize URLs and endpoints
- Use schema validation (Zod, io-ts) for configuration objects
- Implement allowlists rather than blocklists where possible

---

## Best Practices

### For Development
- Use separate keys for development, staging, and production
- Test DID resolution against your actual deployment environment
- Verify that your application handles signature verification failures gracefully

### For Production
- Review and implement security measures appropriate to your threat model
- Monitor signature verification failures
- Log DID resolution attempts if relevant to your security posture
- Implement rate limiting on publicly exposed endpoints

### For High-Security Applications
- Use KMS/HSM for key management
- Implement strict domain allowlisting
- Add comprehensive replay protection
- Conduct security audits specific to your implementation

---

## Test Coverage

Current test coverage:
- **18 tests** covering DID creation, signing, and verification
- **did:web and did:ethr** method implementations
- **Sign → Verify** round-trip validation
- **Tampering detection** (signature and payload)

See `src/__tests__/` for test implementation details.

---

## Reporting Security Issues

If you discover a security vulnerability in this library:

1. **DO NOT** open a public GitHub issue
2. Use [GitHub Security Advisories](https://github.com/humuhimi/a2a-did/security/advisories) for private reporting
3. Or email: [Add your security contact email]

We will respond within **48 hours** and work to:
- Confirm the vulnerability
- Develop a fix
- Coordinate responsible disclosure
- Credit you in the security advisory (if desired)

---

## Supported Versions

| Version | Status | Notes |
| ------- | ------ | ----- |
| 0.1.x   | Experimental | Initial release, API may change |

Security updates will be provided for the latest version only.

---

## Related Security Documentation

- [W3C DID Core Specification](https://www.w3.org/TR/did-core/)
- [did:web Method Specification](https://w3c-ccg.github.io/did-method-web/)
- [A2A Protocol Security Considerations](https://a2a.foundation/protocol)
- [JWS Specification (RFC 7515)](https://datatracker.ietf.org/doc/html/rfc7515)

---

## License

This security policy is part of the a2a-did project and is licensed under MIT.
