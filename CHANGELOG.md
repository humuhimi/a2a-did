# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-01-03

### Added
- JWS format validation in `verifySignedA2ARequest()` to prevent malformed signatures
- Documentation emphasizing A2A SDK compatibility (`express.json()` middleware)

### Improved
- Input validation for signature verification (validates 3-part JWS format)
- README clarity on implementation approach and A2A SDK compatibility

### Notes
This is a patch release with security improvements. No breaking changes. Maintains full compatibility with `@a2a-js/sdk` official middleware using JSON-RPC extension field approach.

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

### Implementation Notes
This is an experimental v0.1.0 release. Like other cryptographic libraries (jose, ethers.js, did-jwt), this library provides cryptographic primitives and delegates security implementation decisions to developers.

See [SECURITY.md](./SECURITY.md) for production deployment considerations including:
- Key management strategies (in-memory, KMS, HSM)
- Network security for DID resolution
- Optional replay protection implementation

### Known Limitations
- Requires Node.js >= 22.0.0 for full functionality
- Test suite: 22 tests covering core functionality
- No caching for DID resolution
- Experimental API - subject to breaking changes in 0.x versions

### Dependencies
- `@noble/secp256k1` - Cryptographic operations
- `did-jwt` - JSON Web Signature support
- `ethr-did` - Ethereum DID method
- `@helia/verified-fetch` - IPFS content verification

[Unreleased]: https://github.com/humuhimi/a2a-did/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/humuhimi/a2a-did/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/humuhimi/a2a-did/releases/tag/v0.1.0
