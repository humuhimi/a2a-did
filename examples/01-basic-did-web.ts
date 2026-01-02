/**
 * Example 1: Basic DID:web Identity Creation
 *
 * This example shows how to create a did:web identity,
 * which is the simplest DID method (no blockchain required).
 *
 * To run: npx tsx examples/01-basic-did-web.ts
 */
import { createAgentDIDService } from 'a2a-did';

async function main() {
  console.log('=== Creating DID:web Identity ===\n');

  // Step 1: Create service for did:web method
  const service = await createAgentDIDService(['web']);
  console.log('✓ DID service created\n');

  // Step 2: Create identity
  const identity = await service.createIdentity({
    method: 'web',
    agentId: 'my-agent',
    config: {
      type: 'web',
      domain: 'example.com',
      port: 443,
    },
  });

  console.log('✓ Identity created successfully!\n');
  console.log('DID:', identity.did);
  console.log('Key ID:', identity.keyId);
  console.log('Private key length:', identity.privateKey.length, 'bytes');
  console.log('\nDID Document:');
  console.log(JSON.stringify(identity.document, null, 2));

  console.log('\n💡 Note:');
  console.log('This example generates keys in memory (standard for crypto libraries).');
  console.log('See SECURITY.md for production key management options.');
}

main().catch(console.error);
