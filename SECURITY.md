# Security Policy

## ⚠️ CRITICAL: Production Usage Warning

**DO NOT USE THIS LIBRARY IN PRODUCTION WITHOUT IMPLEMENTING ADDITIONAL SECURITY MEASURES.**

This library is currently in **v0.1.0 (experimental)** and has known critical security limitations. It is suitable for:
- Development and testing
- Proof-of-concept implementations
- Research and educational purposes

For production use, you **MUST** implement the mitigations described below.

---

## Known Security Vulnerabilities

### 🔴 CRITICAL: Unencrypted Private Key Storage (CVSS 9.1)

**Vulnerability**: Private keys are stored as unencrypted hex strings in memory.

**Location**: All DID creation and signing operations

**Attack Vector**:
- Memory dumps can expose all private keys
- Process inspection tools can read cleartext keys
- Debugging sessions may log sensitive key material
- Crash dumps may contain private keys

**Impact**: Complete compromise of DID identity and signing capabilities.

**Mitigation (REQUIRED for production)**:
- Use Hardware Security Modules (HSM) for key storage
- Implement Key Management Systems (KMS) like AWS KMS, Azure Key Vault, or HashiCorp Vault
- Use secure enclaves (e.g., Intel SGX, AWS Nitro Enclaves)
- Never store private keys in application memory

**Example** (not implemented in this library):
```typescript
// ❌ Current (INSECURE)
const identity = await service.createIdentity({ privateKey: "0x..." });

// ✅ Production (SECURE - requires external implementation)
const kms = new AWS.KMS();
const identity = await service.createIdentityWithKMS({ kmsKeyId: "..." });
```

---

### 🔴 HIGH: Server-Side Request Forgery (SSRF) (CVSS 8.6)

**Vulnerability**: `did:web` resolution fetches arbitrary HTTPS URLs without domain validation.

**Location**: `src/did/resolvers/web.ts`

**Attack Vector**:
```typescript
// Attacker-controlled DID
const maliciousDID = "did:web:169.254.169.254:80"; // AWS metadata service
const maliciousDID2 = "did:web:internal.corp.local:8080"; // Internal service
```

**Impact**:
- Access to internal network resources
- Cloud metadata service exploitation (AWS, GCP, Azure)
- Port scanning of internal infrastructure
- Data exfiltration from internal services

**Mitigation (REQUIRED for production)**:
- Implement domain allowlisting
- Block private IP ranges (RFC 1918, RFC 4193)
- Use DNS rebinding protection
- Add request timeout and rate limiting
- Validate DID format before resolution

**Example** (not implemented in this library):
```typescript
const ALLOWED_DOMAINS = ['trusted-domain.com', 'verified-org.net'];

function validateDIDWebDomain(did: string): boolean {
  const domain = extractDomain(did);

  // Block private IPs
  if (isPrivateIP(domain)) {
    throw new Error('Private IP addresses not allowed');
  }

  // Allowlist check
  if (!ALLOWED_DOMAINS.some(allowed => domain.endsWith(allowed))) {
    throw new Error('Domain not in allowlist');
  }

  return true;
}
```

---

### 🔴 HIGH: No Replay Attack Protection (CVSS 7.4)

**Vulnerability**: Message signatures lack timestamp (`iat`, `exp`) and nonce (`jti`) validation by default.

**Location**: `src/a2a/verification.ts`

**Attack Vector**:
- Capture a valid signed message
- Replay it hours/days/months later
- No expiration checking prevents indefinite reuse

**Impact**:
- Unauthorized actions using old valid signatures
- Impersonation attacks with captured credentials
- Bypass of revocation mechanisms

**Mitigation (REQUIRED for production)**:
```typescript
// Application-level replay protection (must be implemented by users)
import { verifySignedA2ARequest } from 'a2a-did';

async function verifyWithReplayProtection(request: SignedRequest) {
  // 1. Verify signature
  const result = await verifySignedA2ARequest(request);
  if (!result.valid) {
    throw new Error('Invalid signature');
  }

  // 2. Check timestamp (iat = issued at, exp = expiration)
  const now = Math.floor(Date.now() / 1000);
  if (!request.payload.iat || !request.payload.exp) {
    throw new Error('Missing timestamp claims');
  }

  if (request.payload.iat > now + 60) {
    throw new Error('Token from the future');
  }

  if (request.payload.exp < now) {
    throw new Error('Token expired');
  }

  // 3. Check nonce to prevent replay
  const jti = request.payload.jti;
  if (!jti) {
    throw new Error('Missing nonce (jti)');
  }

  if (await isNonceUsed(jti)) {
    throw new Error('Token already used (replay attack)');
  }

  await markNonceAsUsed(jti, request.payload.exp);

  return result;
}
```

---

### 🟡 MEDIUM: Missing DID Format Validation (CVSS 8.2)

**Vulnerability**: No validation of DID format before resolution.

**Location**: `src/did/resolver.ts`

**Impact**:
- Malformed DIDs may cause crashes
- Injection attacks through DID strings
- Unexpected behavior with invalid input

**Mitigation**:
```typescript
const DID_REGEX = /^did:[a-z0-9]+:[a-zA-Z0-9._%-]+$/;

function validateDIDFormat(did: string): boolean {
  if (!DID_REGEX.test(did)) {
    throw new Error(`Invalid DID format: ${did}`);
  }
  return true;
}
```

---

### 🟡 MEDIUM: Insufficient Input Validation (CVSS 6.5)

**Vulnerability**: Missing validation for user inputs (DID strings, endpoints, configuration).

**Location**: Multiple files

**Mitigation**: Use runtime validation (e.g., Zod, io-ts) for all external inputs.

---

## Security Best Practices

### Required for Production

1. **Key Management**
   - Never store private keys in code or environment variables
   - Use KMS/HSM for all cryptographic operations
   - Implement key rotation policies
   - Use separate keys for development/production

2. **Network Security**
   - Implement domain allowlisting for DID resolution
   - Block private IP ranges
   - Use request timeouts (5-10 seconds)
   - Rate limit DID resolution requests

3. **Replay Protection**
   - Always include `iat`, `exp`, `jti` in signatures
   - Implement nonce tracking (Redis, database)
   - Set reasonable expiration times (5-15 minutes)
   - Clean up expired nonces regularly

4. **Input Validation**
   - Validate all DID strings before processing
   - Sanitize endpoint URLs
   - Use schema validation (Zod) for configurations
   - Implement allowlists over blocklists

5. **Monitoring & Logging**
   - Log all signature verification attempts
   - Monitor for replay attack patterns
   - Alert on SSRF attempts
   - Track DID resolution failures

---

## Reporting a Vulnerability

If you discover a security vulnerability in this library:

1. **DO NOT** open a public GitHub issue
2. Email: [Your security email] (if available)
3. Or: Use GitHub Security Advisories (private reporting)

We will respond within **48 hours** and work with you to:
- Confirm the vulnerability
- Develop a fix
- Coordinate responsible disclosure
- Credit you in the security advisory (if desired)

---

## Security Roadmap

Future versions may address:
- [ ] Built-in KMS integration
- [ ] Optional timestamp validation
- [ ] Domain allowlist configuration
- [ ] Input validation with Zod schemas
- [ ] Rate limiting helpers
- [ ] Security audit by third party

---

## Test Coverage

⚠️ **Current test coverage: 0%**

This library has minimal test coverage. Critical security functions are **not comprehensively tested**. Use with extreme caution and implement your own test suite for production use.

---

## Supported Versions

| Version | Supported | Status |
| ------- | --------- | ------ |
| 0.1.x   | ⚠️ Experimental | Known vulnerabilities, not production-ready |

---

## License

This security policy is part of the a2a-did project and is licensed under MIT.
