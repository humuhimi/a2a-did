/**
 * Signed payload in JWS format.
 * @typeParam T - Payload type
 */
export interface SignedPayload<T = Record<string, unknown>> {
  /** JWS compact serialization */
  jws: string;
  /** Original payload */
  payload: T;
}

/**
 * Verification result.
 * @typeParam T - Payload type
 */
export interface VerificationResult<T = Record<string, unknown>> {
  /** Whether the signature is valid */
  verified: boolean;
  /** Issuer DID (empty if failed) */
  issuer: string;
  /** Verified payload (null if failed) */
  payload: T | null;
  /** Error message (if failed) */
  error?: string;
}
