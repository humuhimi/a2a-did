# Contributing to a2a-did

Thank you for your interest in contributing to a2a-did! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful and constructive in all interactions. We're building tools for decentralized agent communication together.

## Ways to Contribute

### Reporting Issues

- **Bug Reports**: Include reproduction steps, expected vs actual behavior, and environment details (Node.js version, OS)
- **Feature Requests**: Describe the use case and proposed solution
- **Security Issues**: Email security concerns privately (see [SECURITY.md](./SECURITY.md))

### Contributing Code

#### Before Starting

1. **Check existing issues/PRs** to avoid duplicate work
2. **Open an issue first** for significant changes to discuss approach
3. **Small fixes** (typos, docs) can go directly to PR

#### Development Setup

```bash
# Clone and install
git clone https://github.com/humuhimi/a2a-did.git
cd a2a-did
npm install

# Run tests
npm test

# Build
npm run build

# Watch mode for development
npm run dev
```

#### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Use existing code as reference
- **Naming**: Descriptive names, follow existing patterns
- **Comments**: Explain *why*, not *what* (code should be self-explanatory)

#### Testing

- Add tests for new features
- Ensure all tests pass: `npm test`
- Aim for meaningful test coverage, not just numbers

```bash
# Run tests with coverage
npm run test:coverage
```

#### Commit Messages

Follow conventional commits format:

```
feat: add did:key support
fix: resolve CORS issue in DID resolution
docs: update API reference for signA2AMessage
test: add cross-domain verification tests
```

### Adding New DID Methods

To add support for a new DID method:

1. Create a handler in `src/did/handlers/your-method-handler.ts`
2. Implement the `DIDMethodHandler` interface
3. Add resolver in `src/did/resolvers/your-method.ts`
4. Add tests in `src/__tests__/`
5. Update README.md with usage examples

See `src/did/handlers/web-handler.ts` and `src/did/handlers/ethr-handler.ts` for reference implementations.

## Pull Request Process

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/my-feature`
3. **Make changes** with tests
4. **Ensure tests pass**: `npm test`
5. **Ensure build succeeds**: `npm run build`
6. **Commit** with clear messages
7. **Push** to your fork
8. **Open a PR** with:
   - Clear description of changes
   - Reference to related issue (if any)
   - Screenshots/examples (if applicable)

### PR Review Process

- Maintainers will review PRs within 1-2 weeks
- Address feedback constructively
- Keep PRs focused (one feature/fix per PR)
- Squash commits before merge if requested

## Questions?

- **General questions**: Open a GitHub Discussion
- **Bug reports**: Open a GitHub Issue
- **Security concerns**: See [SECURITY.md](./SECURITY.md)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
