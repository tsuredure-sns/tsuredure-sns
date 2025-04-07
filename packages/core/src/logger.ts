import type { Logger } from '@tsuredure-sns/types';

export class ConsoleLogger implements Logger {
  constructor(private readonly id: string) {}
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  public info(...args: any[]): void {
    console.info(`[${this.id}]`, ...args);
  }
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  public warning(...args: any[]): void {
    console.warn(`[${this.id}]`, ...args);
  }
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  public error(...args: any[]): void {
    console.error(`[${this.id}]`, ...args);
  }
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  public debug(...args: any[]): void {
    console.debug(`[${this.id}]`, ...args);
  }
}
