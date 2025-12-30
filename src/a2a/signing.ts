/**
 * A2A Signing Functions
 * DID Identity を使った A2A メッセージへの署名
 * @module a2a/signing
 */
import { createJWS } from 'did-jwt';
import type { DIDIdentity } from '../did/types.js';

/**
 * Sign an A2A message or request with the sender's DID identity
 * Creates a JWS signature using the DID private key
 *
 * @param payload - The message or request to sign (any A2A JSON-RPC message)
 * @param signer - The sender's DID identity (contains private key)
 * @returns The JWS signature (compact format)
 *
 * @example
 * ```typescript
 * const identity = await createIdentity(...);
 * const message = {
 *   jsonrpc: '2.0',
 *   method: 'message/send',
 *   params: { ... },
 *   id: 1
 * };
 * const signature = await signA2AMessage(message, identity);
 * const signedRequest = { ...message, signature };
 * ```
 */
export async function signA2AMessage(
  payload: Record<string, unknown>,
  signer: DIDIdentity
): Promise<string> {
  return createJWS(
    payload,
    signer.signer,
    { alg: 'ES256K', kid: signer.keyId }
  );
}
