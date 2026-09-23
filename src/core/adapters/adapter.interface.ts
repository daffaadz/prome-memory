export interface Adapter {
  name: string;
  detect(projectRoot: string): boolean;
  installHooks(projectRoot: string): Promise<void>;
  injectMemoryTemplate(): string;
}

