import { AsyncLocalStorage } from "async_hooks";

const store = new AsyncLocalStorage<string | null>();

export function runWithUserId<T>(userId: string | null, fn: () => Promise<T> | T): Promise<T> | T {
  return store.run(userId, fn);
}

export function getRequestUserId(methodUserId?: string | null): string | null {
  return methodUserId || store.getStore() || null;
}
