import type { Logger } from './types.js';

export class ConsoleLogger implements Logger {
  constructor(private readonly id: string) {}
  public info(...args: unknown[]): void {
    console.info(`[${this.id}]`, ...args);
  }
  public warning(...args: unknown[]): void {
    console.warn(`[${this.id}]`, ...args);
  }
  public error(...args: unknown[]): void {
    console.error(`[${this.id}]`, ...args);
  }
  public debug(...args: unknown[]): void {
    console.debug(`[${this.id}]`, ...args);
  }
}
