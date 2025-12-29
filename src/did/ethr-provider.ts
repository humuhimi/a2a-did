/**
 * did:ethr Provider Implementation
 *
 * Creates did:ethr identities using Ethereum addresses.
 * Service endpoints are registered on-chain via setAttribute().
 * Resolution is handled by ethr-did-resolver (on-chain).
 *
 * DID format: did:ethr:<network>:<address>
 * Example: did:ethr:sepolia:0x1234...
 *
 * @module did/ethr-provider
 */
import { EthrDID } from 'ethr-did';
import { JsonRpcProvider, Wallet } from 'ethers';
import type { DIDProvider } from './provider.js';
import type { DIDCreateOptions, DIDIdentity, ServiceEndpoint } from './types.js';
import { KNOWN_NETWORKS, type KnownNetwork } from './resolvers/ethr.js';

// Default validity period: 1 year in seconds
const DEFAULT_VALIDITY = 31536000;

export interface EthrDIDConfig {
  rpcUrl: string;
  network: string;
  chainId?: number;
  registry?: string;
}

export interface EthrDIDIdentity extends DIDIdentity {
  ethrDid: EthrDID;
}

/**
 * did:ethr Provider
 *
 * Creates did:ethr identities backed by Ethereum addresses.
 * Service endpoints are registered on-chain via ERC1056 setAttribute().
 *
 * Note: On-chain registration requires gas. Use Sepolia faucet for test ETH.
 *
 * @example
 * const provider = new EthrDIDProvider({
 *   rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY'
 * });
 * const identity = await provider.create({
 *   services: [{ type: 'A2AAgent', serviceEndpoint: 'https://example.com/a2a' }]
 * });
 */
export class EthrDIDProvider implements DIDProvider {
  readonly method = 'ethr' as const;
  private readonly rpcUrl: string;
  private readonly chainId: number;
  private readonly registry: string;
  private readonly network: string;
  private readonly jsonRpcProvider: JsonRpcProvider;

  constructor(config: EthrDIDConfig) {
    const known = KNOWN_NETWORKS[config.network as KnownNetwork];
    this.rpcUrl = config.rpcUrl;
    this.network = config.network;
    this.chainId = config.chainId ?? known?.chainId;
    this.registry = config.registry ?? known?.registry;
    if (!this.chainId || !this.registry) {
      throw new Error(`Unknown network "${config.network}". Provide chainId and registry.`);
    }
    this.jsonRpcProvider = new JsonRpcProvider(this.rpcUrl);
  }

  /**
   * Create a new did:ethr identity
   * Service endpoints are registered on-chain via setAttribute()
   *
   * @param options - Creation options including services
   * @returns The created DID identity with EthrDID instance
   */
  async create(options: DIDCreateOptions = {}): Promise<EthrDIDIdentity> {
    const { services = [] } = options;

    // Generate random Ethereum wallet
    const wallet = Wallet.createRandom();
    const privateKeyHex = wallet.privateKey.slice(2); // Remove '0x' prefix
    const privateKey = Buffer.from(privateKeyHex, 'hex');

    // Connect wallet to provider for signing transactions
    const connectedWallet = wallet.connect(this.jsonRpcProvider);

    // Create EthrDID instance
    const ethrDid = new EthrDID({
      identifier: wallet.address,
      privateKey: privateKeyHex,
      provider: this.jsonRpcProvider,
      txSigner: connectedWallet,
      chainNameOrId: this.chainId,
      registry: this.registry,
    });

    // DID format: did:ethr:sepolia:0x...
    const did = `did:ethr:${this.getNetworkName()}:${wallet.address}`;
    const keyId = `${did}#controller`;

    // Register service endpoints on-chain
    // Note: This requires gas (use Sepolia faucet for test ETH)
    for (const service of services) {
      await this.registerServiceEndpoint(ethrDid, service);
    }

    // EthrDID always has a signer when created with privateKey
    if (!ethrDid.signer) {
      throw new Error('EthrDID signer not available');
    }

    return {
      did,
      keyId,
      signer: ethrDid.signer,
      privateKey: new Uint8Array(privateKey),
      ethrDid,
      // document is undefined - did:ethr resolves from on-chain via resolveDID()
    };
  }

  /**
   * Register a service endpoint on-chain via setAttribute()
   *
   * @param ethrDid - The EthrDID instance
   * @param service - Service endpoint to register
   */
  private async registerServiceEndpoint(
    ethrDid: EthrDID,
    service: ServiceEndpoint
  ): Promise<void> {
    // Extract service type name for attribute key
    // did/svc/A2AAgent -> registers as type "A2AAgent" in DID Document
    const serviceType = service.type;
    const attributeKey = `did/svc/${serviceType}`;
    const endpoint = typeof service.serviceEndpoint === 'string'
      ? service.serviceEndpoint
      : service.serviceEndpoint.toString();

    console.log(`  Registering service endpoint on-chain: ${attributeKey} -> ${endpoint}`);

    try {
      // setAttribute() sends a transaction to the EthereumDIDRegistry
      const tx = await ethrDid.setAttribute(
        attributeKey,
        endpoint,
        DEFAULT_VALIDITY
      );
      console.log(`  Transaction sent: ${tx}`);
    } catch (error) {
      // If no ETH for gas, provide helpful message
      if (error instanceof Error && error.message.includes('insufficient funds')) {
        console.error(`  Error: Insufficient funds for gas. Get test ETH from Sepolia faucet.`);
        console.error(`  Wallet address: ${ethrDid.address}`);
        throw new Error(
          `Insufficient funds for on-chain registration. ` +
          `Get Sepolia ETH from faucet for address: ${ethrDid.address}`
        );
      }
      throw error;
    }
  }

  /**
   * Get network name for DID format
   */
  private getNetworkName(): string {
    if (this.network) {
      return this.network;
    }
    switch (this.chainId) {
      case 1:
        return 'mainnet';
      case 11155111:
        return 'sepolia';
      case 5:
        return 'goerli';
      default:
        return `0x${this.chainId.toString(16)}`;
    }
  }

  /**
   * Get resolver configuration for ethr-did-resolver
   */
  getResolverConfig() {
    return {
      networks: [
        {
          name: this.getNetworkName(),
          provider: this.jsonRpcProvider,
          chainId: this.chainId,
          registry: this.registry,
        },
      ],
    };
  }
}
