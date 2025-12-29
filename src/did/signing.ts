/**
 * DID Signing Utilities
 * Provides cryptographic signing operations for DIDs
 */
import { createJWS, ES256KSigner } from 'did-jwt';
import * as u8a from 'uint8arrays';

export interface JWSSignature {
  protected: string;
  signature: string;
}

export interface SignedPayload<T> {
  payload: T;
  signatures: JWSSignature[];
}

/**
 * Sign a payload with a DID using ES256K (secp256k1)
 * @param payload - Data to sign
 * @param did - DID string (e.g., "did:ethr:sepolia:0x...")
 * @param privateKey - Private key (hex string)
 * @returns Signed payload with JWS signatures
 */
export async function signWithDID<T extends object>(
  payload: T,
  did: string,
  privateKey: string,
  keyId?: string
): Promise<T & { signatures: JWSSignature[] }> {
  // Convert hex string to Uint8Array
  const privateKeyBytes = u8a.fromString(privateKey, 'base16');

  // Create ES256K signer
  const signer = ES256KSigner(privateKeyBytes);
  const keyIdValue = keyId ?? `${did}#controller`;

  // Create JWS
  const jws = await createJWS(payload, signer, { alg: 'ES256K', kid: keyIdValue });

  // Parse JWS (format: "header.payload.signature")
  const [protectedHeader, _payload, signature] = jws.split('.');

  if (!protectedHeader || !signature) {
    throw new Error('Invalid JWS format');
  }

  return {
    ...payload,
    signatures: [
      {
        protected: protectedHeader,
        signature,
      },
    ],
  };
}
