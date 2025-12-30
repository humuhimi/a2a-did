/**
 * A2A Resolution Functions
 * DID Document から Agent Card URL や A2A エンドポイントを解決
 * @module a2a/resolution
 */
import { resolveDID } from '../did/resolver.js';
import type { DIDDocument, ServiceEndpoint } from '../did/types.js';
import { A2A_AGENT_CARD_SERVICE_TYPE } from './constants.js';
import { fetchUri } from './utils.js';

/**
 * AgentCard with signatures (A2A spec)
 */
interface SignedAgentCard {
  protocolVersion: string;
  name: string;
  description: string;
  url: string;
  signatures?: Array<{
    protected: string;
    signature: string;
  }>;
  [key: string]: unknown;
}

/**
 * Extract Agent Card URL from DID Document
 * @param document - The DID Document
 * @returns The Agent Card URL, or undefined if not found
 */
export function extractAgentCardUrl(document: DIDDocument): string | undefined {
  const service = document.service?.find(
    (s: ServiceEndpoint) => s.type === A2A_AGENT_CARD_SERVICE_TYPE
  );
  if (!service) return undefined;
  return typeof service.serviceEndpoint === 'string'
    ? service.serviceEndpoint
    : undefined;
}

/**
 * Resolve a DID and get its A2A endpoint
 * Follows A2A Protocol 0.3.0: DID → Agent Card URL → Agent Card → A2A endpoint
 *
 * IMPORTANT: For did:ethr, you must call configureResolver() before using this function.
 * See packages/core/src/did/resolver.ts for configuration details.
 *
 * @param did - The DID to resolve
 * @param ipfsGateway - IPFS gateway URL with trailing slash for ipfs:// URIs (e.g., https://gateway.pinata.cloud/ipfs/)
 * @returns The A2A endpoint URL from Agent Card
 * @throws Error if DID cannot be resolved, has no Agent Card, or Agent Card has no url
 */
export async function resolveA2AEndpoint(
  did: string,
  ipfsGateway?: string
): Promise<string> {
  // Step 1: Resolve DID to get Agent Card URL
  const document = await resolveDID(did);
  if (!document) {
    throw new Error(`Failed to resolve DID: ${did}`);
  }

  const agentCardUrl = extractAgentCardUrl(document);
  if (!agentCardUrl) {
    throw new Error(`No Agent Card URL found in DID Document: ${did}`);
  }

  // Step 2: Fetch Agent Card (supports http://, https://, ipfs://)
  const response = await fetchUri(agentCardUrl, ipfsGateway);
  if (!response.ok) {
    throw new Error(`Failed to fetch Agent Card from ${agentCardUrl}: ${response.status}`);
  }

  const agentCard = (await response.json()) as SignedAgentCard;

  // Step 3: Extract A2A endpoint from Agent Card
  if (!agentCard.url || typeof agentCard.url !== 'string') {
    throw new Error(`Agent Card has no valid url field: ${agentCardUrl}`);
  }

  return agentCard.url;
}
