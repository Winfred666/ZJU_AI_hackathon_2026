import { Store } from "./types";

let _store: Store | null = null;

export function getStore(): Store {
  if (_store) return _store;

  let s: Store;
  // Vercel serverless: filesystem is ephemeral — use MemoryStore
  // Local dev: use FileStore for persistence across restarts
  if (process.env.VERCEL) {
    const { MemoryStore } = require("./memory-store");
    s = new MemoryStore();
  } else {
    const { FileStore } = require("./file-store");
    s = new FileStore();
  }
  _store = s;
  return s;
}

export function setStore(store: Store): void {
  _store = store;
}
