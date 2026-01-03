/**
 * A2A Verification Functions
 * Agent Card と A2A メッセージの署名検証
 * @module a2a/verification
 */
import { verifyJWS } from 'did-jwt';
import { resolveDID } from '../did/resolver.js';
import { base64UrlEncode, decodeBase64UrlJson, fetchUri, jsonEquals } from './utils.js';
import { extractAgentCardUrl } from './resolution.js';

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
 * A2A Message Signature Verification Result
 */
export interface MessageSignatureVerificationResult {
  valid: boolean;
  senderDid?: string;
  error?: string;
}

/**
 * Verify AgentCard signature
 * @param agentCardUrl - URL to fetch AgentCard from (supports http://, https://, ipfs://)
 * @returns Verification result with signer DID if successful
 */
export async function verifyAgentCard(
  agentCardUrl: string
): Promise<AgentCardVerificationResult> {
  try {
    // 1. Fetch AgentCard with cryptographic verification (supports http://, https://, ipfs://)
    const response = await fetchUri(agentCardUrl);
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
 * Verify A2A message JWS signature using DID public key
 * Follows A2A Protocol 0.3.0: Verifies Agent Card signature first, then message signature
 *
 * @param jws - The JWS signature string (compact format)
 * @returns Verification result with sender DID if successful
 */
export async function verifyA2AMessageSignature(
  jws: string
): Promise<MessageSignatureVerificationResult> {
  try {
    // 1. Decode the JWS to get the protected header
    const parts = jws.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid JWS format' };
    }

    const header = decodeBase64UrlJson(parts[0]!) as { kid?: string; alg?: string };
    if (!header.kid) {
      return { valid: false, error: 'No kid in signature header' };
    }

    const senderDid = header.kid.split('#')[0]!;

    // 2. Resolve sender's DID to get public key
    const didDocument = await resolveDID(senderDid);
    if (!didDocument) {
      return { valid: false, error: `Failed to resolve sender DID: ${senderDid}` };
    }

    // 3. ⭐ Verify Agent Card (A2A Protocol 0.3.0 requirement)
    const agentCardUrl = extractAgentCardUrl(didDocument);
    if (!agentCardUrl) {
      return { valid: false, error: 'No Agent Card URL in DID Document' };
    }

    const cardVerification = await verifyAgentCard(agentCardUrl);
    if (!cardVerification.verified) {
      return {
        valid: false,
        error: `Agent Card verification failed: ${cardVerification.error}`
      };
    }

    // 4. Verify Agent Card signer matches message sender
    if (cardVerification.signerDid !== senderDid) {
      return {
        valid: false,
        error: 'Agent Card signer does not match message sender'
      };
    }

    // 5. Find verification method matching the kid
    const keyFragment = header.kid.split('#')[1]!;
    const verificationMethod = didDocument.verificationMethod?.find(
      vm => vm.id === header.kid || vm.id === `${senderDid}#${keyFragment}`
    );
    if (!verificationMethod) {
      return { valid: false, error: `No matching verification method for kid: ${header.kid}` };
    }

    // 6. Verify message signature with the DID public key
    verifyJWS(jws, verificationMethod as Parameters<typeof verifyJWS>[1]);

    return { valid: true, senderDid };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    };
  }
}

/**
 * Verify A2A request with signature validation and payload integrity check
 * This is a convenience function for API servers to validate incoming signed requests
 *
 * @param request - The signed A2A request (JSON-RPC with signature field)
 * @returns Verification result with sender DID if successful
 */
export async function verifySignedA2ARequest(
  request: { signature?: string; [key: string]: unknown }
): Promise<MessageSignatureVerificationResult> {
  if (!request.signature) {
    return { valid: false, error: 'No signature in request' };
  }

  try {
    // 1. Validate JWS Compact Format (RFC 7515: header.payload.signature)
    const parts = request.signature.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      return {
        valid: false,
        error: 'Invalid JWS format: expected 3 non-empty parts (header.payload.signature)'
      };
    }

    // 2. Verify the JWS signature
    const signatureResult = await verifyA2AMessageSignature(request.signature);
    if (!signatureResult.valid) {
      return signatureResult;
    }

    // 3. Verify payload integrity (JWS payload matches request body)
    const payload = decodeBase64UrlJson(parts[1]);
    const { signature: _sig, ...requestWithoutSig } = request;

    if (!jsonEquals(payload, requestWithoutSig)) {
      return { valid: false, error: 'JWS payload does not match request body' };
    }

    return { valid: true, senderDid: signatureResult.senderDid };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    };
  }
}
