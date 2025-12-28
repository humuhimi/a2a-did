/**
 * Cross-DID Method A2A Protocol Demo
 *
 * Demonstrates decentralized Agent-to-Agent communication across different DID methods:
 * - Agent A uses did:web (localhost:3001) - HTTP resolution
 * - Agent B uses did:ethr:sepolia (Ethereum-based) - On-chain resolution
 *
 * Key differences:
 * - did:web: DID Document served via HTTP, service endpoint in document
 * - did:ethr: DID Document resolved on-chain, service endpoint registered via setAttribute()
 */
import 'dotenv/config';
import { Agent } from './agent.js';
import { Human } from './human.js';
import { WebDIDProvider } from './did/web-provider.js';
import { EthrDIDProvider } from './did/ethr-provider.js';
import { A2AServer } from './a2a/server.js';
import { sendMessage, createTextMessage, resolveA2AEndpoint } from './a2a/client.js';
import { configureResolver, resolveDID } from './did/resolver.js';

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Error: ${name} environment variable is required.`);
    console.error('Get an RPC URL from Infura, Alchemy, or other provider.');
    console.error(`Example: export ${name}="https://sepolia.infura.io/v3/YOUR_API_KEY"`);
    process.exit(1);
  }
  return value;
}

const SEPOLIA_RPC_URL = getRequiredEnv('SEPOLIA_RPC_URL');

// Configure resolver with did:web + did:ethr support
configureResolver({
  web: true,
  ethr: {
    networks: [{ name: 'sepolia', rpcUrl: SEPOLIA_RPC_URL }],
  },
});

async function main() {
  console.log('='.repeat(60));
  console.log('Cross-DID Method A2A Protocol Demo');
  console.log('='.repeat(60));
  console.log();
  console.log('DID Methods:');
  console.log('  Agent A: did:web (HTTP resolution)');
  console.log('  Agent B: did:ethr:sepolia (On-chain resolution)');
  console.log();

  // Providers
  const webDIDProvider = new WebDIDProvider();
  const ethrDIDProvider = new EthrDIDProvider({ rpcUrl: SEPOLIA_RPC_URL });

  // ============================================================
  // Server 1: Organization A - did:web (localhost:3001)
  // ============================================================
  console.log('[1] Setting up Organization A (did:web, localhost:3001)...\n');

  const server1 = new A2AServer(3001);
  const domain1 = server1.domain;

  // Human A (controls Agent A)
  const humanAIdentity = await webDIDProvider.create({
    domain: domain1,
    path: ['humans', 'human-a'],
  });
  const humanA = new Human(humanAIdentity, 'human-a');
  server1.registerHuman(humanA);

  // Agent A (did:web) - Service endpoint in DID Document
  const agentAIdentity = await webDIDProvider.create({
    domain: domain1,
    path: ['agents', 'agent-a'],
    controller: humanA.did,
    services: [
      {
        id: `did:web:${domain1.replace(/:/g, '%3A')}:agents:agent-a#a2a`,
        type: 'A2AAgent',
        serviceEndpoint: `http://${domain1}/agents/agent-a/a2a`,
      },
    ],
  });
  const agentA = new Agent(agentAIdentity, 'agent-a', { name: 'Agent A' });
  await server1.registerAgent({
    agent: agentA,
    name: 'Agent A (did:web)',
    description: 'Agent using did:web from Organization A',
  });

  console.log(`  Human A: ${humanA.did}`);
  console.log(`  Agent A: ${agentA.did}`);
  console.log();

  // ============================================================
  // Server 2: Organization B - did:ethr:sepolia (localhost:3002)
  // ============================================================
  console.log('[2] Setting up Organization B (did:ethr:sepolia, localhost:3002)...\n');

  const server2 = new A2AServer(3002);
  const domain2 = server2.domain;

  // Human B (controls Agent B) - still uses did:web for simplicity
  const humanBIdentity = await webDIDProvider.create({
    domain: domain2,
    path: ['humans', 'human-b'],
  });
  const humanB = new Human(humanBIdentity, 'human-b');
  server2.registerHuman(humanB);

  // Agent B (did:ethr:sepolia)
  // Service endpoint is registered ON-CHAIN via setAttribute()
  // This requires Sepolia ETH for gas
  console.log('  Creating did:ethr identity and registering service endpoint on-chain...');
  console.log('  (Requires Sepolia ETH for gas - get from faucet if needed)\n');

  let agentB: Agent;
  try {
    const agentBIdentity = await ethrDIDProvider.create({
      services: [
        {
          id: '#a2a', // Will be expanded to full DID URI by resolver
          type: 'A2AAgent',
          serviceEndpoint: `http://${domain2}/agents/agent-b/a2a`,
        },
      ],
    });
    agentB = new Agent(agentBIdentity, 'agent-b', { name: 'Agent B' });

    await server2.registerAgent({
      agent: agentB,
      name: 'Agent B (did:ethr:sepolia)',
      description: 'Agent using did:ethr on Sepolia testnet',
    });

    console.log(`  Human B: ${humanB.did}`);
    console.log(`  Agent B: ${agentB.did}`);
    console.log();
  } catch (error) {
    if (error instanceof Error && error.message.includes('insufficient funds')) {
      console.error('\n  ❌ Failed to register service endpoint on-chain.');
      console.error('  The newly generated wallet has no Sepolia ETH.');
      console.error('\n  To run this demo with on-chain registration:');
      console.error('  1. Get Sepolia ETH from a faucet (e.g., https://sepoliafaucet.com)');
      console.error('  2. Fund the wallet address shown in the error above');
      console.error('  3. Re-run the demo\n');
      process.exit(1);
    }
    throw error;
  }

  // ============================================================
  // Start both servers
  // ============================================================
  console.log('[3] Starting servers...\n');

  await server1.start();
  await server2.start();
  console.log();

  // ============================================================
  // DID Resolution Demo
  // ============================================================
  console.log('[4] DID Resolution Demo\n');

  // Resolve did:web (Agent A) - via HTTP
  console.log('  Resolving did:web (Agent A) via HTTP...');
  const webDoc = await resolveDID(agentA.did);
  console.log(`    DID: ${webDoc?.id}`);
  console.log(`    Resolution: HTTP to ${domain1}`);
  console.log(`    Service: ${webDoc?.service?.[0]?.serviceEndpoint}`);
  console.log();

  // Resolve did:ethr (Agent B) - via on-chain
  console.log('  Resolving did:ethr:sepolia (Agent B) via on-chain...');
  const ethrDoc = await resolveDID(agentB.did);
  console.log(`    DID: ${ethrDoc?.id}`);
  console.log(`    Resolution: On-chain via Infura RPC`);
  console.log(`    Verification Method: ${ethrDoc?.verificationMethod?.[0]?.type}`);
  // Service endpoint should now appear from on-chain registration
  if (ethrDoc?.service && ethrDoc.service.length > 0) {
    console.log(`    Service (on-chain): ${ethrDoc.service[0].serviceEndpoint}`);
  } else {
    console.log(`    Service: (checking on-chain registration...)`);
  }
  console.log();

  // ============================================================
  // Cross-DID Method A2A Communication
  // ============================================================
  console.log('[5] Cross-DID Method A2A Communication\n');

  console.log('  Agent A (did:web) → Agent B (did:ethr:sepolia)');
  console.log();

  // For did:web, endpoint discovery via DID resolution
  console.log('  Step 1: Discovering Agent A endpoint via did:web (HTTP)...');
  const endpointA = await resolveA2AEndpoint(agentA.did);
  console.log(`    Endpoint: ${endpointA}`);
  console.log();

  // For did:ethr, endpoint discovery via on-chain resolution
  console.log('  Step 2: Discovering Agent B endpoint via did:ethr (on-chain)...');
  const endpointB = await resolveA2AEndpoint(agentB.did);
  console.log(`    Endpoint (from on-chain): ${endpointB}`);
  console.log();

  // Send message from Agent A to Agent B
  console.log('  Step 3: Sending A2A message to Agent B...');
  const message = createTextMessage('Hello from Agent A (did:web)! Cross-DID method communication!');
  console.log(`    Message: "${message.parts[0].text}"`);
  console.log();

  const response = await sendMessage(agentB.did, message);
  console.log('  Step 4: Response from Agent B:');
  console.log(`    ${JSON.stringify(response, null, 2)}`);
  console.log();

  // ============================================================
  // Summary
  // ============================================================
  console.log('[6] Demo Summary\n');
  console.log('  What was demonstrated:');
  console.log('  1. Agent A: did:web identity (HTTP resolution)');
  console.log('     - DID Document served at /agents/agent-a/did.json');
  console.log('     - Service endpoint in DID Document');
  console.log();
  console.log('  2. Agent B: did:ethr:sepolia identity (On-chain resolution)');
  console.log('     - DID Document resolved from EthereumDIDRegistry');
  console.log('     - Service endpoint registered via setAttribute()');
  console.log('     - No HTTP serving of DID Document');
  console.log();
  console.log('  3. A2A communication works across different DID methods');
  console.log();

  // ============================================================
  // Server info for manual testing
  // ============================================================
  console.log('[7] Servers Running\n');
  console.log('  Agent A (did:web):');
  console.log(`    DID: ${agentA.did}`);
  console.log(`    DID Document: http://localhost:3001/agents/agent-a/did.json`);
  console.log(`    A2A Endpoint: http://localhost:3001/agents/agent-a/a2a`);
  console.log();
  console.log('  Agent B (did:ethr:sepolia):');
  console.log(`    DID: ${agentB.did}`);
  console.log(`    DID Document: Resolve via ethr-did-resolver (on-chain)`);
  console.log(`    A2A Endpoint: http://localhost:3002/agents/agent-b/a2a`);
  console.log();

  console.log('='.repeat(60));
  console.log('Press Ctrl+C to stop both servers.');
  console.log('='.repeat(60));

  // Keep running
  setInterval(() => {}, 1000 * 60 * 60);
}

main().catch(console.error);
