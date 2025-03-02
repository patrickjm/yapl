
interface ImportMeta {
  hot?: {
    data: Record<string, any>;
    accept(): void;
    dispose(cb: (data: Record<string, any>) => void): void;
  };
}