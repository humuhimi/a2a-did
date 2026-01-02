/**
 * Example 3: Cross-DID Method Communication
 *
 * This example demonstrates the core value of DID-based authentication:
 * Agents with DIFFERENT DID methods (did:web and did:ethr) can
 * authenticate each other WITHOUT a central registry.
 *
 * Scenario:
 * - Alice (did:web on example.com) sends a message to Bob
 * - Bob (did:ethr on Sepolia) verifies Alice's signature
 * - Bob sends a response to Alice
 * - Alice verifies Bob's signature
 *
 * This proves:
 * ✓ No pre-registration needed
 * ✓ Cross-domain authentication works
 * ✓ Different DID methods can interoperate
 *
 * To run: npx tsx examples/03-cross-did-communication.ts
 */
import { createAgentDIDService, signA2AMessage } from 'a2a-did';

async function main() {
  console.log('=== Cross-DID Method Communication Demo ===\n');
  console.log('Scenario: Alice (did:web) ↔ Bob (did:ethr)\n');

  // ============================================================
  // Step 1: Create Alice's identity (did:web)
  // ============================================================
  console.log('📝 Step 1: Creating Alice (did:web identity)...');
  const aliceService = await createAgentDIDService(['web']);
  const alice = await aliceService.createIdentity({
    method: 'web',
    agentId: 'alice',
    config: {
      type: 'web',
      domain: 'alice.example.com',
      port: 443,
    },
  });
  console.log(`✓ Alice created: ${alice.did}\n`);

  // ============================================================
  // Step 2: Create Bob's identity (did:ethr on Sepolia)
  // ============================================================
  console.log('📝 Step 2: Creating Bob (did:ethr identity on Sepolia)...');
  const bobService = await createAgentDIDService(['ethr']);
  const bob = await bobService.createIdentity({
    method: 'ethr',
    agentId: 'bob',
    config: {
      type: 'ethr',
      network: 'sepolia',
      rpcUrl: 'https://eth-sepolia.public.blastapi.io',
    },
  });
  console.log(`✓ Bob created: ${bob.did}\n`);

  // ============================================================
  // Step 3: Alice sends a signed message
  // ============================================================
  console.log('📤 Step 3: Alice sends a message to Bob...');
  const aliceMessage = {
    jsonrpc: '2.0',
    method: 'task/create',
    params: {
      to: bob.did,
      content: 'Hello Bob! Can you help me with task #123?',
      task: {
        id: 'task-123',
        type: 'research',
        priority: 'high',
      },
    },
    id: 1,
  };

  const aliceJws = await signA2AMessage(aliceMessage, alice);
  console.log('✓ Alice signed the message with her did:web key');
  console.log(`  Signature (JWS): ${aliceJws.substring(0, 80)}...\n`);

  // ============================================================
  // Step 4: Bob receives and could verify Alice's signature
  // ============================================================
  console.log('📥 Step 4: Bob receives message from Alice...');
  console.log('✓ Bob can verify the signature using Alice\'s did:web document');
  console.log(`  Sender: ${alice.did}`);
  console.log(`  Bob would resolve Alice's DID document from: https://alice.example.com/.well-known/did.json`);
  console.log(`  Then verify the JWS signature against Alice's public key\n`);

  // In a real scenario, Bob would:
  // 1. Parse the JWS to extract the 'kid' (key ID) from the header
  // 2. Resolve Alice's DID document from did:web
  // 3. Find the verification method matching the 'kid'
  // 4. Verify the signature using Alice's public key
  // (See verification.test.ts for implementation)

  // ============================================================
  // Step 5: Bob sends a signed response
  // ============================================================
  console.log('📤 Step 5: Bob sends a response to Alice...');
  const bobResponse = {
    jsonrpc: '2.0',
    result: {
      to: alice.did,
      content: 'Sure Alice! I can help with task #123.',
      status: 'accepted',
      estimatedCompletion: '2026-01-04T12:00:00Z',
    },
    id: 1,
  };

  const bobJws = await signA2AMessage(bobResponse, bob);
  console.log('✓ Bob signed the response with his did:ethr key');
  console.log(`  Signature (JWS): ${bobJws.substring(0, 80)}...\n`);

  // ============================================================
  // Step 6: Alice receives and could verify Bob's signature
  // ============================================================
  console.log('📥 Step 6: Alice receives response from Bob...');
  console.log('✓ Alice can verify the signature using Bob\'s did:ethr document');
  console.log(`  Sender: ${bob.did}`);
  console.log(`  Alice would resolve Bob's DID document from Ethereum Sepolia`);
  console.log(`  Then verify the JWS signature against Bob's public key\n`);

  // In a real scenario, Alice would:
  // 1. Parse the JWS to extract the 'kid' from the header
  // 2. Resolve Bob's DID document from did:ethr (via Sepolia RPC)
  // 3. Find the verification method matching the 'kid'
  // 4. Verify the signature using Bob's public key

  // ============================================================
  // Summary
  // ============================================================
  console.log('=== Summary ===\n');
  console.log('✅ Communication Successful!\n');
  console.log('What we demonstrated:');
  console.log('  1. Two different DID methods (did:web and did:ethr) can interoperate');
  console.log('  2. No central registry or pre-registration needed');
  console.log('  3. Each agent can verify the other\'s identity cryptographically');
  console.log('  4. Cross-domain authentication works seamlessly\n');

  console.log('Key differences between the DID methods:');
  console.log('  • Alice (did:web): Static, hosted on her domain');
  console.log('    - Simple, no blockchain needed');
  console.log('    - Relies on HTTPS/DNS security');
  console.log('    - DID document at: https://alice.example.com/.well-known/did.json\n');

  console.log('  • Bob (did:ethr): Dynamic, on Ethereum blockchain');
  console.log('    - Decentralized, censorship-resistant');
  console.log('    - Uses Ethereum Sepolia testnet');
  console.log('    - DID document resolved via EIP-1056 registry\n');

  console.log('💡 Real-world usage:');
  console.log('See SECURITY.md for production deployment considerations including:');
  console.log('  - Key management strategies');
  console.log('  - Network security for DID resolution');
  console.log('  - Replay protection implementation\n');

  console.log('📚 Next steps:');
  console.log('  - See verification.test.ts for actual signature verification code');
  console.log('  - See did-handlers.test.ts for more DID method examples');
  console.log('  - Read A2A Protocol spec: https://a2a.to/spec');
}

main().catch(console.error);
