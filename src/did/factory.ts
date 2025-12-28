/**
 * DID Identity Factory
 * Provides a simple interface for creating DID identities
 */
import { WebDIDProvider } from './web-provider.js';
import { EthrDIDProvider } from './ethr-provider.js';
import type { DIDIdentity } from './types.js';

export interface CreateWebDIDOptions {
  domain: string;
  path?: string;
  controller?: string;
}

export interface CreateEthrDIDOptions {
  network: string;
  rpcUrl?: string;
}

export type CreateDIDOptions =
  | ({ method: 'web' } & CreateWebDIDOptions)
  | ({ method: 'ethr' } & CreateEthrDIDOptions);

/**
 * Create a DID identity
 * @param method - DID method ('web' or 'ethr')
 * @param options - Method-specific options
 * @returns The created DID identity
 */
export async function createDIDIdentity(
  method: 'web',
  options: CreateWebDIDOptions
): Promise<DIDIdentity>;
export async function createDIDIdentity(
  method: 'ethr',
  options: CreateEthrDIDOptions
): Promise<DIDIdentity>;
export async function createDIDIdentity(
  method: string,
  options: any
): Promise<DIDIdentity> {
  if (method === 'web') {
    const provider = new WebDIDProvider();
    const { path, ...rest } = options as CreateWebDIDOptions;
    return provider.create({
      ...rest,
      path: path ? path.split('/').filter(Boolean) : [],
    });
  } else if (method === 'ethr') {
    const { network, rpcUrl, ...rest } = options as CreateEthrDIDOptions;

    if (!rpcUrl) {
      if (!process.env.SEPOLIA_RPC_URL) {
        throw new Error('SEPOLIA_RPC_URL environment variable is required when rpcUrl is not provided');
      }
      const provider = new EthrDIDProvider({
        rpcUrl: process.env.SEPOLIA_RPC_URL,
      });
      return provider.create(rest);
    }

    const provider = new EthrDIDProvider({
      rpcUrl,
    });
    return provider.create(rest);
  }

  throw new Error(`Unsupported DID method: ${method}`);
}
