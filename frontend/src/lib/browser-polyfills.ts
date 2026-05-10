import { Buffer } from "vite-plugin-node-polyfills/shims/buffer";
import process from "vite-plugin-node-polyfills/shims/process";

declare global {
  interface Window {
    Buffer?: typeof Buffer;
    process?: typeof process;
    global?: typeof globalThis;
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.Buffer ??= Buffer;
  (globalThis as typeof globalThis & { process?: typeof process }).process ??= process;
  (globalThis as typeof globalThis & { global?: typeof globalThis }).global ??= globalThis;
}