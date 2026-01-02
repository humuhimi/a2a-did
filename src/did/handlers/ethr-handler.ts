/**
 * Ethereum DID Method Handler
 * Handles DID operations for did:ethr
 */
import { EthrDID } from 'ethr-did';
import { JsonRpcProvider, Wallet } from 'ethers';
import * as u8a from 'uint8arrays';
import type { DIDMethodHandler } from '../service.js';
import type { DIDIdentity, ServiceEndpoint } from '../types.js';
import type { DIDConfig } from '../config-types.js';
import { KNOWN_NETWORKS, type KnownNetwork } from '../resolvers/ethr.js';
import { A2A_AGENT_CARD_SERVICE_TYPE } from '../../a2a/constants.js';

// Default validity period: 1 year in seconds
const DEFAULT_VALIDITY = 31536000;

/**
 * Ethereum DID Method Handler
 * Implements DID operations for did:ethr method using EIP-1056 registry
 * @implements {DIDMethodHandler}
 */
export class DIDEthrMethodHandler implements DIDMethodHandler {
  /**
   * Create a new did:ethr identity
   * @param options - Configuration options
   * @param options.agentId - Agent unique identifier
   * @param options.config - Ethereum DID configuration (network, rpcUrl)
   * @param options.services - Optional service endpoints to register
   * @returns Promise resolving to DID identity with document
   * @throws {Error} When config type is not 'ethr' or rpcUrl is missing
   */
  async createIdentity(options: {
    agentId: string;
    config: DIDConfig;
    services?: ServiceEndpoint[];
  }): Promise<DIDIdentity> {
    const config = options.config;
    if (config.type !== 'ethr') {
      throw new Error('Invalid config for did:ethr');
    }

    if (!config.rpcUrl) {
      throw new Error(`rpcUrl is required for network: ${config.network}`);
    }

    // Get network configuration
    const known = KNOWN_NETWORKS[config.network as KnownNetwork];
    const chainId = config.chainId ?? known?.chainId;
    const registry = config.registry ?? known?.registry;

    if (!chainId || !registry) {
      throw new Error(`Unknown network "${config.network}". Provide chainId and registry.`);
    }

    // Generate random Ethereum wallet
    const wallet = Wallet.createRandom();
    const privateKeyHex = wallet.privateKey.slice(2); // Remove '0x' prefix
    const privateKey = u8a.fromString(privateKeyHex, 'base16');

    // Create JSON RPC provider
    const jsonRpcProvider = new JsonRpcProvider(config.rpcUrl);

    // Connect wallet to provider for signing transactions
    const connectedWallet = wallet.connect(jsonRpcProvider);

    // Create EthrDID instance
    const ethrDid = new EthrDID({
      identifier: wallet.address,
      privateKey: privateKeyHex,
      provider: jsonRpcProvider,
      txSigner: connectedWallet,
      chainNameOrId: chainId,
      registry: registry,
    });

    // Get network name for DID format
    const networkName = this.getNetworkName(config.network, chainId);

    // DID format: did:ethr:sepolia:0x...
    const did = `did:ethr:${networkName}:${wallet.address}`;
    const keyId = `${did}#controller`;

    // EthrDID always has a signer when created with privateKey
    if (!ethrDid.signer) {
      throw new Error('EthrDID signer not available');
    }

    // Note: On-chain service registration is skipped during creation
    // Call registerServiceEndpoint() separately after funding the wallet
    return {
      did,
      keyId,
      signer: ethrDid.signer,
      privateKey: new Uint8Array(privateKey),
      // document is undefined - did:ethr resolves from on-chain via resolveDID()
    };
  }

  /**
   * Register a service endpoint on-chain for did:ethr
   * Updates the EIP-1056 registry with the new service endpoint
   * @param options - Registration options
   * @param options.did - DID string (e.g., "did:ethr:sepolia:0x...")
   * @param options.privateKey - Private key for signing transactions (hex string)
   * @param options.serviceEndpoint - Service endpoint URI (e.g., "ipfs://...")
   * @param options.config - Ethereum DID configuration (network, rpcUrl)
   * @returns Promise resolving to array of transaction hashes
   * @throws {Error} When config type is not 'ethr' or rpcUrl is missing
   */
  async registerServiceEndpoint(options: {
    did: string;
    privateKey: string;
    serviceEndpoint: string;
    config: DIDConfig;
  }): Promise<string[]> {
    const config = options.config;
    if (config.type !== 'ethr') {
      throw new Error('Invalid config for did:ethr');
    }

    // Resolve RPC URL
    if (!config.rpcUrl) {
      throw new Error(`rpcUrl is required for network: ${config.network}`);
    }

    // Get network configuration
    const known = KNOWN_NETWORKS[config.network as KnownNetwork];
    const chainId = config.chainId ?? known?.chainId;
    const registry = config.registry ?? known?.registry;

    if (!chainId || !registry) {
      throw new Error(`Unknown network "${config.network}". Provide chainId and registry.`);
    }

    // Reconstruct wallet from private key
    const privateKeyHex = options.privateKey.startsWith('0x')
      ? options.privateKey
      : `0x${options.privateKey}`;
    const wallet = new Wallet(privateKeyHex);

    // Create JSON RPC provider
    const jsonRpcProvider = new JsonRpcProvider(config.rpcUrl);
    const connectedWallet = wallet.connect(jsonRpcProvider);

    // Create EthrDID instance
    const ethrDid = new EthrDID({
      identifier: wallet.address,
      privateKey: privateKeyHex.slice(2),
      provider: jsonRpcProvider,
      txSigner: connectedWallet,
      chainNameOrId: chainId,
      registry: registry,
    });

    // Register service endpoint on-chain
    // Note: Service id is auto-generated by resolver as ${did}#service-${eventIndex}
    // Only type and serviceEndpoint are stored on-chain via EIP-1056
    const serviceType = A2A_AGENT_CARD_SERVICE_TYPE;
    const attributeKey = `did/svc/${serviceType}`;
    const endpoint =
      typeof options.serviceEndpoint === 'string'
        ? options.serviceEndpoint
        : JSON.stringify(options.serviceEndpoint);

    try {
      // setAttribute() sends a transaction to the EthereumDIDRegistry
      const tx = await ethrDid.setAttribute(attributeKey, endpoint, DEFAULT_VALIDITY);
      return [tx];
    } catch (error) {
      // If no ETH for gas, provide helpful message
      if (error instanceof Error && error.message.includes('insufficient funds')) {
        throw new Error(
          `Insufficient funds for on-chain registration. ` +
            `Get Sepolia ETH from faucet for address: ${ethrDid.address}`
        );
      }
      throw error;
    }
  }

  /**
   * Extract wallet address from did:ethr
   * @param did - DID string (e.g., "did:ethr:sepolia:0x1234...")
   * @returns Ethereum wallet address (e.g., "0x1234...")
   * @example
   * extractWalletAddress("did:ethr:sepolia:0x1234...") // returns "0x1234..."
   */
  extractWalletAddress(did: string): string | undefined {
    const parts = did.split(':');
    return parts[parts.length - 1];
  }

  /**
   * Get key ID for did:ethr
   * @param did - DID string
   * @returns Key identifier with #controller fragment
   * @example
   * getKeyId("did:ethr:sepolia:0x1234...") // returns "did:ethr:sepolia:0x1234...#controller"
   */
  getKeyId(did: string): string {
    return `${did}#controller`;
  }

  /**
   * Get network name for DID format
   */
  private getNetworkName(network: string, chainId: number): string {
    if (network) {
      return network;
    }
    switch (chainId) {
      case 1:
        return 'mainnet';
      case 11155111:
        return 'sepolia';
      case 5:
        return 'goerli';
      default:
        return `0x${chainId.toString(16)}`;
    }
  }
}
