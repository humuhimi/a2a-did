/**
 * DID service utilities
 * Provides helpers for building and publishing service endpoints
 * @module did/service
 */
import type { DIDDocument, ServiceEndpoint } from './types.js';

const DEFAULT_TTL_SECONDS = 31536000;

export interface BuildServiceEndpointOptions {
  did: string;
  type: string;
  endpoint: ServiceEndpoint['serviceEndpoint'];
  id?: string;
}

export interface ServiceAttribute {
  key: string;
  value: string;
  ttlSeconds: number;
}

/**
 * Build a DID service endpoint entry
 */
export function buildServiceEndpoint(options: BuildServiceEndpointOptions): ServiceEndpoint {
  const { did, type, endpoint, id } = options;
  return {
    id: id ?? `${did}#${type}`,
    type,
    serviceEndpoint: endpoint,
  };
}

/**
 * Attach a service endpoint to a DID Document (did:web or similar)
 */
export function attachServiceToDocument(
  document: DIDDocument,
  service: ServiceEndpoint
): DIDDocument {
  const services = document.service ? [...document.service, service] : [service];
  return {
    ...document,
    service: services,
  };
}

/**
 * Convert a service endpoint to a did:ethr attribute payload
 */
export function toEthrServiceAttribute(
  service: ServiceEndpoint,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): ServiceAttribute {
  const value = typeof service.serviceEndpoint === 'string'
    ? service.serviceEndpoint
    : JSON.stringify(service.serviceEndpoint);

  return {
    key: `did/svc/${service.type}`,
    value,
    ttlSeconds,
  };
}
