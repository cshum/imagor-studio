export interface ConfigStorage {
  get(): Promise<string | null>;

  set(value: string): Promise<void>;
}
