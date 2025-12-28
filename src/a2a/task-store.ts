/**
 * In-memory TaskStore for A2A SDK
 * @module a2a/task-store
 */
import type { TaskStore } from '@a2a-js/sdk/server';
import type { Task } from '@a2a-js/sdk';

/**
 * Simple in-memory task store for A2A SDK
 * Stores tasks in memory using a Map (not persistent)
 * For production, use a database-backed implementation
 */
export class InMemoryTaskStore implements TaskStore {
  private tasks = new Map<string, Task>();

  /**
   * Save a task to the store
   * @param task - The task to save
   */
  async save(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
  }

  /**
   * Load a task from the store by ID
   * @param taskId - The task ID to load
   * @returns The task if found, undefined otherwise
   */
  async load(taskId: string): Promise<Task | undefined> {
    return this.tasks.get(taskId);
  }
}
