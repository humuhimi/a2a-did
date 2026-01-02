/**
 * Example 3: Error Handling Best Practices
 *
 * This example shows how to handle common errors when working
 * with DID identities and A2A messages.
 *
 * To run: npx tsx examples/03-error-handling.ts
 */
import { createAgentDIDService, signA2AMessage } from 'a2a-did';

async function main() {
  console.log('=== Error Handling Examples ===\n');

  // Example 1: Invalid DID method
  console.log('1. Testing unsupported DID method...');
  try {
    const service = await createAgentDIDService(['web']);
    await service.createIdentity({
      method: 'invalid' as any,
      agentId: 'test',
      config: { type: 'web', domain: 'example.com', port: 443 } as any,
    });
  } catch (error) {
    console.log('✓ Caught expected error:', (error as Error).message, '\n');
  }

  // Example 2: Invalid domain
  console.log('2. Testing invalid domain...');
  try {
    const service = await createAgentDIDService(['web']);
    await service.createIdentity({
      method: 'web',
      agentId: 'test',
      config: {
        type: 'web',
        domain: '', // Empty domain
        port: 443,
      },
    });
  } catch (error) {
    console.log('✓ Caught expected error:', (error as Error).message, '\n');
  }

  // Example 3: Signing with invalid identity
  console.log('3. Testing signing with invalid key...');
  try {
    const invalidIdentity = {
      did: 'did:web:example.com',
      privateKey: new Uint8Array(0), // Empty key
      signer: null,
      keyId: 'did:web:example.com#key-1',
    };
    await signA2AMessage({ test: 'data' }, invalidIdentity as any);
  } catch (error) {
    console.log('✓ Caught expected error:', (error as Error).message, '\n');
  }

  // Example 4: Production-ready error handling
  console.log('4. Production pattern: Try-catch with specific errors\n');

  async function createIdentitySafely() {
    try {
      const service = await createAgentDIDService(['web']);
      const identity = await service.createIdentity({
        method: 'web',
        agentId: 'production-agent',
        config: {
          type: 'web',
          domain: 'myapp.com',
          port: 443,
        },
      });

      console.log('✓ Identity created:', identity.did);
      return { success: true, identity };
    } catch (error) {
      console.error('✗ Failed to create identity:', (error as Error).message);
      return { success: false, error: error as Error };
    }
  }

  const result = await createIdentitySafely();
  if (result.success) {
    console.log('\n✓ All error handling examples completed!');
  }

  console.log('\n💡 Best Practices:');
  console.log('  - Always use try-catch for DID operations');
  console.log('  - Validate configuration before creating identities');
  console.log('  - Handle network errors for DID resolution');
  console.log('  - Log errors for debugging');
  console.log('  - Return structured error responses to users');
}

main().catch(console.error);
