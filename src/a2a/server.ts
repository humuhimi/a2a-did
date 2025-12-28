/**
 * A2A Server with DID-based identity
 * Serves both A2A endpoints and DID Documents
 * @module a2a/server
 */
import express, { type Express, type Request, type Response } from 'express';
import type { AgentCard } from '@a2a-js/sdk';
import { DefaultRequestHandler, JsonRpcTransportHandler } from '@a2a-js/sdk/server';
import { InMemoryTaskStore } from './task-store.js';
import { SimpleAgentExecutor } from './executor.js';
import type { Agent } from '../agent.js';
import type { Human } from '../human.js';
import type { DIDDocument } from '../did/types.js';
import { verifyA2ARequest, type SignedA2ARequest, type A2ARequestAuthResult } from './client.js';

/**
 * Parse compact JWS to JWS JSON Serialization format
 * @param jws - Compact JWS string (header.payload.signature)
 * @returns Object with protected header and signature
 */
function parseJWSToJsonSerialization(jws: string): { protected: string; signature: string } {
  const firstDot = jws.indexOf('.');
  const lastDot = jws.lastIndexOf('.');

  if (firstDot === -1 || lastDot === -1 || firstDot === lastDot) {
    throw new Error('Invalid JWS format');
  }

  return {
    protected: jws.substring(0, firstDot),
    signature: jws.substring(lastDot + 1),
  };
}

export interface A2AAgentConfig {
  agent: Agent;
  name: string;
  description: string;
}

interface AgentCardSignature {
  protected: string;
  signature: string;
}

interface RegisteredAgent {
  agent: Agent;
  agentCard: AgentCard;
  agentCardSignature: AgentCardSignature;
  jsonRpcHandler: JsonRpcTransportHandler;
}

/**
 * A2A Server configuration options
 */
export interface A2AServerOptions {
  /** Require signature verification for incoming requests (default: false) */
  requireAuth?: boolean;
}

/**
 * A2A Server that hosts multiple agents.
 * Supports both did:web and did:ethr identities.
 *
 * - did:web: DID Documents served at /agents/{id}/did.json (HTTP resolution)
 * - did:ethr: DID Documents NOT served (on-chain resolution via ethr-did-resolver)
 *
 * Serves:
 * - DID Documents at /agents/{id}/did.json (did:web only)
 * - AgentCards at /agents/{id}/a2a/.well-known/agent-card.json
 * - A2A endpoints at /agents/{id}/a2a
 */
export class A2AServer {
  private app: Express;
  private agents = new Map<string, RegisteredAgent>();
  private humans = new Map<string, Human>();
  private didDocuments = new Map<string, DIDDocument>();
  private baseUrl: string;
  private port: number;
  private requireAuth: boolean;
  public readonly domain: string;

  constructor(port: number = 3000, domain?: string, options?: A2AServerOptions) {
    this.port = port;
    this.requireAuth = options?.requireAuth ?? false;
    // If domain is provided, use it (production). Otherwise, use localhost (development).
    this.domain = domain || `localhost:${port}`;
    // Use HTTPS for production domains, HTTP for localhost
    const protocol = domain ? 'https' : 'http';
    this.baseUrl = `${protocol}://${this.domain}`;
    this.app = express();

    // express.json() throws SyntaxError on invalid JSON
    this.app.use(express.json());

    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    // Handle JSON parse errors with JSON-RPC -32700
    this.app.use((err: Error, _req: Request, res: Response, next: (err?: Error) => void) => {
      if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Parse error', data: 'Invalid JSON' },
          id: null,
        });
      }
      next(err);
    });
  }

  private setupRoutes(): void {
    // DID Document routes: /{type}/{id}/did.json
    this.app.get('/:type/:id/did.json', (req: Request, res: Response) => {
      const { type, id } = req.params;
      const key = `${type}/${id}`;
      const doc = this.didDocuments.get(key);

      if (!doc) {
        return res.status(404).json({ error: 'DID Document not found' });
      }

      res.setHeader('Content-Type', 'application/did+json');
      return res.json(doc);
    });

    // A2A routes: /agents/{id}/a2a/...
    this.app.use((req: Request, res: Response, next) => {
      const match = req.path.match(/^\/agents\/([^\/]+)\/a2a(\/.*)?$/);
      if (!match) return next();

      const agentId = match[1];
      const subpath = match[2] || '/';
      const registered = this.agents.get(agentId);

      if (!registered) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // GET /.well-known/agent-card.json
      if (req.method === 'GET' && subpath === '/.well-known/agent-card.json') {
        // Return AgentCard with signatures array (A2A spec compliant)
        return res.json({
          ...registered.agentCard,
          signatures: [registered.agentCardSignature],
        });
      }

      // POST / (A2A message) - streaming: false, so no SSE support
      if (req.method === 'POST' && subpath === '/') {
        const handleRequest = async () => {
          // Verify signature if authentication is required
          if (this.requireAuth) {
            const authResult = await verifyA2ARequest(req.body as SignedA2ARequest);
            if (!authResult.authenticated) {
              res.status(200).json({
                jsonrpc: '2.0',
                error: { code: -32001, message: 'Authentication failed', data: authResult.error },
                id: req.body?.id || null,
              });
              return;
            }
          }

          // Handle the request
          const result = await registered.jsonRpcHandler.handle(req.body);
          res.json(result);
        };

        handleRequest().catch((error: Error) => {
          res.status(200).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal error', data: error.message },
            id: req.body?.id || null,
          });
        });
        return;
      }

      return res.status(404).json({ error: 'Not found' });
    });

    // List all agents
    this.app.get('/agents', (_req: Request, res: Response) => {
      const agents = Array.from(this.agents.entries()).map(([id, reg]) => {
        const info: Record<string, string> = {
          id,
          did: reg.agent.did,
          a2aEndpoint: `${this.baseUrl}/agents/${id}/a2a`,
          agentCardUrl: `${this.baseUrl}/agents/${id}/a2a/.well-known/agent-card.json`,
        };
        // Only include didDocumentUrl for did:web (has local document)
        if (reg.agent.hasLocalDocument()) {
          info.didDocumentUrl = `${this.baseUrl}/agents/${id}/did.json`;
        }
        return info;
      });
      res.json(agents);
    });

    // List all humans
    this.app.get('/humans', (_req: Request, res: Response) => {
      const humans = Array.from(this.humans.entries()).map(([id, human]) => ({
        id,
        did: human.did,
        didDocumentUrl: `${this.baseUrl}/humans/${id}/did.json`,
      }));
      res.json(humans);
    });
  }

  /**
   * Register a DID Document for an entity (did:web only)
   */
  private registerDIDDocument(entity: { document?: DIDDocument }, type: 'agents' | 'humans', id: string): void {
    if (!entity.document) {
      console.warn(`Cannot register DID Document for ${type}/${id}: no local document available`);
      return;
    }
    const key = `${type}/${id}`;
    this.didDocuments.set(key, entity.document);
  }

  /**
   * Create AgentCard with DID-based identity.
   * The Agent's DID is discoverable via signatures[].kid
   * Service endpoints are in the DID Document
   */
  private createAgentCard(agent: Agent, config: A2AAgentConfig): AgentCard {
    return {
      protocolVersion: '0.3.0',
      name: config.name,
      description: config.description,
      url: `${this.baseUrl}/agents/${agent.id}/a2a`,
      version: '1.0.0',

      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false,
        // Agent DID is available via signatures[].kid
        // Full identity info available at DID Document
      },

      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain'],

      skills: [
        {
          id: 'echo',
          name: 'Echo',
          description: 'Echo messages',
          tags: ['echo'],
          examples: ['Hello agent'],
          inputModes: ['text/plain'],
          outputModes: ['text/plain'],
        },
      ],

      provider: {
        organization: 'VaaS Demo',
        url: this.baseUrl,
      },
    } as AgentCard;
  }

  /**
   * Register a human (for DID Document serving)
   */
  registerHuman(human: Human): void {
    this.humans.set(human.id, human);
    this.registerDIDDocument(human, 'humans', human.id);
  }

  /**
   * Register an agent to the A2A server.
   * For did:web agents, also registers DID Document for HTTP serving.
   * For did:ethr agents, DID Document is resolved on-chain (not served via HTTP).
   */
  async registerAgent(config: A2AAgentConfig): Promise<void> {
    const { agent } = config;
    const agentCard = this.createAgentCard(agent, config);

    // Sign AgentCard with agent's private key, then convert to JWS JSON Serialization format
    const jws = await agent.signJWS(agentCard as unknown as Record<string, unknown>);
    const agentCardSignature = parseJWSToJsonSerialization(jws);

    const taskStore = new InMemoryTaskStore();
    const executor = new SimpleAgentExecutor(agent.did);
    const requestHandler = new DefaultRequestHandler(agentCard, taskStore, executor);
    const jsonRpcHandler = new JsonRpcTransportHandler(requestHandler);

    // Use agent ID (not full DID) for routing
    this.agents.set(agent.id, { agent, agentCard, agentCardSignature, jsonRpcHandler });

    // Only register DID Document if available locally (did:web)
    // did:ethr uses on-chain resolution, no HTTP serving needed
    if (agent.hasLocalDocument()) {
      this.registerDIDDocument(agent, 'agents', agent.id);
    }
  }

  /**
   * Start the A2A server.
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`A2A Server running at ${this.baseUrl}`);
        console.log(`Registered agents: ${this.agents.size}`);
        console.log(`Registered humans: ${this.humans.size}`);
        resolve();
      });
    });
  }

  /**
   * Get agent endpoint info.
   * didDocumentUrl is only available for did:web agents (HTTP served)
   * did:ethr agents resolve on-chain via resolveDID()
   */
  getAgentEndpoint(agentId: string): {
    a2aEndpoint: string;
    agentCardUrl: string;
    didDocumentUrl?: string;
  } | undefined {
    const registered = this.agents.get(agentId);
    if (!registered) return undefined;

    const result: {
      a2aEndpoint: string;
      agentCardUrl: string;
      didDocumentUrl?: string;
    } = {
      a2aEndpoint: `${this.baseUrl}/agents/${agentId}/a2a`,
      agentCardUrl: `${this.baseUrl}/agents/${agentId}/a2a/.well-known/agent-card.json`,
    };

    // Only include didDocumentUrl for did:web (has local document)
    if (registered.agent.hasLocalDocument()) {
      result.didDocumentUrl = `${this.baseUrl}/agents/${agentId}/did.json`;
    }

    return result;
  }

  /**
   * Get human endpoint info.
   */
  getHumanEndpoint(humanId: string): { didDocumentUrl: string } | undefined {
    if (!this.humans.has(humanId)) return undefined;
    return {
      didDocumentUrl: `${this.baseUrl}/humans/${humanId}/did.json`,
    };
  }
}
