export interface JobOrchestrator {
  start(): Promise<void>;
  stop(): Promise<void>;
}
