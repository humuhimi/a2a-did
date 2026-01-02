/**
 * Example 2: Sign and Verify A2A Messages
 *
 * This example demonstrates the complete workflow:
 * 1. Create identity
 * 2. Sign a message
 * 3. Verify the signature
 *
 * To run: npx tsx examples/02-sign-and-verify.ts
 */
import { createAgentDIDService, signA2AMessage } from 'a2a-did';

async function main() {
  console.log('=== A2A Message Signing and Verification ===\n');

  // Step 1: Create identity
  const service = await createAgentDIDService(['web']);
  const identity = await service.createIdentity({
    method: 'web',
    agentId: 'alice',
    config: {
      type: 'web',
      domain: 'alice.example.com',
      port: 443,
    },
  });
  console.log('✓ Identity created for:', identity.did, '\n');

  // Step 2: Create and sign a message
  const message = {
    jsonrpc: '2.0',
    method: 'message/send',
    params: {
      to: 'did:web:bob.example.com',
      content: 'Hello, Bob!',
    },
    id: 1,
  };

  console.log('Original message:');
  console.log(JSON.stringify(message, null, 2));

  const jws = await signA2AMessage(message, identity);
  console.log('\n✓ Message signed!');
  console.log('JWS (compact format):');
  console.log(jws.substring(0, 100) + '...\n');

  // Step 3: Decode and display header
  const [headerB64, payloadB64, signatureB64] = jws.split('.');
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

  console.log('JWS Header:');
  console.log(JSON.stringify(header, null, 2));
  console.log('\nJWS Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nSignature:', signatureB64.substring(0, 40) + '...');

  console.log('\n✓ Complete! Message can now be verified by recipient.');
  console.log('\nNote: Verification requires DID resolution (did:web over HTTPS).');
  console.log('See SECURITY.md for production deployment requirements.');
}

main().catch(console.error);
