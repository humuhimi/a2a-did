/**
 * Simple AgentExecutor for A2A SDK
 * @module a2a/executor
 */
import type { AgentExecutor, RequestContext, ExecutionEventBus } from '@a2a-js/sdk/server';
import type { Message } from '@a2a-js/sdk';
import { v4 as uuidv4 } from 'uuid';

/**
 * Simple executor that echoes messages back to the sender
 * For production, implement custom logic to handle user messages
 */
export class SimpleAgentExecutor implements AgentExecutor {
  /**
   * Creates a new SimpleAgentExecutor instance
   * @param agentDid - The DID of the agent using this executor
   */
  constructor(private agentDid: string) {}

  /**
   * Execute agent logic in response to a user message
   * @param ctx - Request context containing the user message
   * @param eventBus - Event bus for publishing agent responses
   */
  async execute(ctx: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const textPart = ctx.userMessage.parts.find((p) => p.kind === 'text') as
      | { kind: 'text'; text: string }
      | undefined;
    const userMessage = textPart?.text || '';

    const responseMessage: Message = {
      kind: 'message',
      messageId: uuidv4(),
      role: 'agent',
      parts: [
        {
          kind: 'text',
          text: `Echo from ${this.agentDid}: ${userMessage}`,
        },
      ],
    };

    eventBus.publish(responseMessage);
    eventBus.finished();
  }

  /**
   * Cancel a running task
   * @param taskId - The ID of the task to cancel
   * @param eventBus - Event bus for publishing cancellation response
   */
  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    const response: Message = {
      kind: 'message',
      messageId: uuidv4(),
      role: 'agent',
      parts: [{ kind: 'text', text: `Task ${taskId} cancelled.` }],
    };
    eventBus.publish(response);
    eventBus.finished();
  }
}
