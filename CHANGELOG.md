# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-01-03

### Added
- Initial experimental release
- DID identity management for `did:web` and `did:ethr` methods
- A2A message signing with ES256K (secp256k1)
- A2A message verification
- Agent Card verification
- DID document resolution
- Factory pattern for extensible DID method handlers
- TypeScript strict mode support
- Comprehensive security documentation (SECURITY.md)
- Basic test suite (14 tests)
- GitHub Actions CI/CD
- Automated npm publishing

### Security
⚠️ **WARNING: NOT PRODUCTION READY**

This is an experimental release with known security vulnerabilities:
- **CRITICAL**: Unencrypted private keys in memory (CVSS 9.1)
- **HIGH**: SSRF in DID resolution (CVSS 8.6)
- **HIGH**: No replay attack protection (CVSS 7.4)

See [SECURITY.md](./SECURITY.md) for complete vulnerability details and mitigation strategies.

**Do not use in production without implementing the security mitigations documented in SECURITY.md.**

### Known Limitations
- Requires Node.js >= 22.0.0 for full functionality
- Limited test coverage (~20% of codebase)
- No caching for DID resolution
- No performance optimization
- Experimental API - subject to breaking changes

### Dependencies
- `@noble/secp256k1` - Cryptographic operations
- `did-jwt` - JSON Web Signature support
- `ethr-did` - Ethereum DID method
- `@helia/verified-fetch` - IPFS content verification

[Unreleased]: https://github.com/humuhimi/a2a-did/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/humuhimi/a2a-did/releases/tag/v0.1.0
