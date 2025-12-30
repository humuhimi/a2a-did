/**
 * A2A Client
 * Enables cross-server Agent-to-Agent communication
 * @module a2a/client
 */
import { verifyJWS, createJWS } from 'did-jwt';
import * as u8a from 'uint8arrays';
import { resolveDID } from '../did/resolver.js';
import type { DIDDocument, DIDIdentity, ServiceEndpoint } from '../did/types.js';

/**
 * Service type for Agent Card URL in DID Document
 * Use this constant to ensure consistency across the codebase
 */
export const A2A_AGENT_CARD_SERVICE_TYPE = 'A2AAgentCard' as const;

/**
 * A2A Message Part
 */
export interface MessagePart {
  kind: 'text';
  text: string;
}

/**
 * A2A Message
 */
export interface A2AMessage {
  kind: 'message';
  messageId: string;
  role: 'user' | 'agent';
  parts: MessagePart[];
}

/**
 * A2A JSON-RPC Request
 */
interface A2ARequest {
  jsonrpc: '2.0';
  method: string;
  params: Record<string, unknown>;
  id: string | number;
}

/**
 * A2A JSON-RPC Response
 */
export interface A2AResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number | null;
}

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
 * AgentCard verification result
 */
export interface AgentCardVerificationResult {
  verified: boolean;
  signerDid?: string;
  error?: string;
}

/**
 * Base64URL encode a string
 */
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function base64UrlEncode(str: string): string {
  return u8a.toString(textEncoder.encode(str), 'base64url');
}

/**
 * Decode base64url to JSON
 */
function decodeBase64UrlJson(str: string): Record<string, unknown> {
  const json = textDecoder.decode(u8a.fromString(str, 'base64url'));
  return JSON.parse(json);
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeJson(record[key]);
        return acc;
      }, {});
  }
  return value;
}

function jsonEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizeJson(a)) === JSON.stringify(normalizeJson(b));
}

/**
 * Verify AgentCard signature
 * @param agentCardUrl - URL to fetch AgentCard from (supports http://, https://, ipfs://)
 * @param ipfsGateway - IPFS gateway URL with trailing slash for ipfs:// URIs (e.g., https://gateway.pinata.cloud/ipfs/)
 * @returns Verification result with signer DID if successful
 */
export async function verifyAgentCard(
  agentCardUrl: string,
  ipfsGateway?: string
): Promise<AgentCardVerificationResult> {
  try {
    // 1. Fetch AgentCard (supports http://, https://, ipfs://)
    const response = await fetchUri(agentCardUrl, ipfsGateway);
    if (!response.ok) {
      return { verified: false, error: `Failed to fetch AgentCard: ${response.status}` };
    }
    const signedCard = await response.json() as SignedAgentCard;

    // 2. Check for signatures
    if (!signedCard.signatures || signedCard.signatures.length === 0) {
      return { verified: false, error: 'AgentCard has no signatures' };
    }

    const sig = signedCard.signatures[0]!;

    // 3. Extract signer DID from protected header (kid field)
    const header = decodeBase64UrlJson(sig.protected) as { kid?: string; alg?: string };
    if (!header.kid) {
      return { verified: false, error: 'No kid in signature header' };
    }

    // Extract DID from kid (format: did:...:...#key-1)
    const kid = header.kid;
    const signerDid = kid.split('#')[0]!;

    // 4. Resolve signer's DID to get public key
    const didDocument = await resolveDID(signerDid);
    if (!didDocument) {
      return { verified: false, error: `Failed to resolve signer DID: ${signerDid}` };
    }

    // 5. Find verification method matching the kid
    const keyFragment = kid.split('#')[1]!;
    const verificationMethod = didDocument.verificationMethod?.find(
      vm => vm.id === kid || vm.id === `${signerDid}#${keyFragment}`
    );
    if (!verificationMethod) {
      return { verified: false, error: `No matching verification method for kid: ${kid}` };
    }

    // 6. Reconstruct compact JWS and verify
    // Remove signatures from card to get original payload
    const { signatures: _sigs, ...cardWithoutSig } = signedCard;
    const payloadBase64 = base64UrlEncode(JSON.stringify(cardWithoutSig));
    const compactJws = `${sig.protected}.${payloadBase64}.${sig.signature}`;

    // 7. Verify signature
    verifyJWS(compactJws, verificationMethod as Parameters<typeof verifyJWS>[1]);

    return { verified: true, signerDid };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    };
  }
}

/**
 * Extract Agent Card URL from DID Document
 * @param document - The DID Document
 * @returns The Agent Card URL, or undefined if not found
 */
function extractAgentCardUrl(document: DIDDocument): string | undefined {
  const service = document.service?.find(
    (s: ServiceEndpoint) => s.type === A2A_AGENT_CARD_SERVICE_TYPE
  );
  if (!service) return undefined;
  return typeof service.serviceEndpoint === 'string'
    ? service.serviceEndpoint
    : undefined;
}

/**
 * Fetch content from URI (supports http://, https://, ipfs://)
 * @param uri - URI to fetch (http://, https://, or ipfs://)
 * @param ipfsGateway - IPFS gateway URL with trailing slash (default: https://ipfs.io/ipfs/)
 * @returns Fetch response
 * @throws Error if URI scheme is unsupported
 */
async function fetchUri(uri: string, ipfsGateway: string = 'https://ipfs.io/ipfs/'): Promise<Response> {
  if (uri.startsWith('ipfs://')) {
    // IPFS URI: use gateway for now (future: native ipfs.fetch() when available)
    const cid = uri.replace('ipfs://', '');
    const gatewayUrl = `${ipfsGateway}${cid}`;
    return fetch(gatewayUrl);
  } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
    // HTTP(S) URI: use standard fetch
    return fetch(uri);
  } else {
    throw new Error(`Unsupported URI scheme: ${uri}`);
  }
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

/**
 * Send an A2A message to an agent identified by DID
 * @param did - The target agent's DID
 * @param message - The message to send
 * @param ipfsGateway - IPFS gateway URL with trailing slash (e.g., https://gateway.pinata.cloud/ipfs/)
 * @returns The A2A response
 * @throws Error if DID resolution fails or no A2A endpoint found
 */
export async function sendMessage(
  did: string,
  message: A2AMessage,
  ipfsGateway?: string
): Promise<A2AResponse> {
  // 1. Resolve DID to get endpoint
  const endpoint = await resolveA2AEndpoint(did, ipfsGateway);

  // 2. Build JSON-RPC request
  const request: A2ARequest = {
    jsonrpc: '2.0',
    method: 'message/send',
    params: { message },
    id: Date.now(),
  };

  // 3. Send HTTP POST
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`A2A request failed: ${response.status} ${response.statusText}`);
  }

  // 4. Return response
  return response.json() as Promise<A2AResponse>;
}

/**
 * Create an A2A text message
 * @param text - The message text
 * @param role - The sender role (default: 'user')
 * @returns An A2A message object
 */
export function createTextMessage(text: string, role: 'user' | 'agent' = 'user'): A2AMessage {
  return {
    kind: 'message',
    messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    parts: [{ kind: 'text', text }],
  };
}

/**
 * Signed A2A Request (JSON-RPC with signature)
 */
export interface SignedA2ARequest {
  jsonrpc: '2.0';
  method: string;
  params: Record<string, unknown>;
  id: string | number;
  /** JWS signature of the request (compact format) */
  signature?: string;
}

/**
 * A2A Request Authentication Result
 */
export interface A2ARequestAuthResult {
  authenticated: boolean;
  senderDid?: string;
  error?: string;
}

/**
 * Sign an A2A request with the sender's DID identity
 * @param request - The A2A request to sign
 * @param signer - The sender's DID identity
 * @returns The request with signature attached
 */
export async function signA2ARequest(
  request: Omit<SignedA2ARequest, 'signature'>,
  signer: DIDIdentity
): Promise<SignedA2ARequest> {
  // Create JWS of the request payload (without signature field)
  const jws = await createJWS(
    request as unknown as Record<string, unknown>,
    signer.signer,
    { alg: 'ES256K', kid: signer.keyId }
  );

  return {
    ...request,
    signature: jws,
  };
}

/**
 * Verify an A2A request signature
 * @param request - The signed A2A request
 * @returns Authentication result with sender DID if successful
 */
export async function verifyA2ARequest(request: SignedA2ARequest): Promise<A2ARequestAuthResult> {
  if (!request.signature) {
    return { authenticated: false, error: 'No signature in request' };
  }

  try {
    // Decode the JWS to get the protected header
    const parts = request.signature.split('.');
    if (parts.length !== 3) {
      return { authenticated: false, error: 'Invalid JWS format' };
    }

    const header = decodeBase64UrlJson(parts[0]!) as { kid?: string; alg?: string };
    if (!header.kid) {
      return { authenticated: false, error: 'No kid in signature header' };
    }

    const senderDid = header.kid.split('#')[0]!;

    // Resolve sender's DID to get public key
    const didDocument = await resolveDID(senderDid);
    if (!didDocument) {
      return { authenticated: false, error: `Failed to resolve sender DID: ${senderDid}` };
    }

    // Find verification method
    const keyFragment = header.kid.split('#')[1]!;
    const verificationMethod = didDocument.verificationMethod?.find(
      vm => vm.id === header.kid || vm.id === `${senderDid}#${keyFragment}`
    );
    if (!verificationMethod) {
      return { authenticated: false, error: `No matching verification method for kid: ${header.kid}` };
    }

    const payload = decodeBase64UrlJson(parts[1]!);
    const { signature: _sig, ...requestWithoutSig } = request;
    if (!jsonEquals(payload, requestWithoutSig)) {
      return { authenticated: false, error: 'JWS payload does not match request body' };
    }

    // Verify signature with the original JWS payload
    verifyJWS(request.signature, verificationMethod as Parameters<typeof verifyJWS>[1]);

    return { authenticated: true, senderDid };
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    };
  }
}

/**
 * Send an authenticated A2A message (with signature)
 * @param did - The target agent's DID
 * @param message - The message to send
 * @param signer - The sender's DID identity for signing
 * @param ipfsGateway - IPFS gateway URL with trailing slash (e.g., https://gateway.pinata.cloud/ipfs/)
 * @returns The A2A response
 */
export async function sendAuthenticatedMessage(
  did: string,
  message: A2AMessage,
  signer: DIDIdentity,
  ipfsGateway?: string
): Promise<A2AResponse> {
  // 1. Resolve DID to get endpoint
  const endpoint = await resolveA2AEndpoint(did, ipfsGateway);

  // 2. Build and sign JSON-RPC request
  const request = await signA2ARequest(
    {
      jsonrpc: '2.0',
      method: 'message/send',
      params: { message },
      id: Date.now(),
    },
    signer
  );

  // 3. Send HTTP POST
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`A2A request failed: ${response.status} ${response.statusText}`);
  }

  // 4. Return response
  return response.json() as Promise<A2AResponse>;
}
