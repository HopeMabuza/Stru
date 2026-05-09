// Browser wallet fallback used until the embedded-wallet provider is available.
// The exported surface stays intentionally small so Privy can replace this module
// without touching page/component code.

import { useEffect, useState } from "react";
import { api } from "./api";

const KEY = "stru.wallet_address";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function randomBase58(length: number): string {
  let out = "";
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < length; i++) out += BASE58[bytes[i] % BASE58.length];
  return out;
}

export function getWallet(): string {
  if (typeof window === "undefined") return "";
  let w = window.localStorage.getItem(KEY);
  if (!w) {
    w = randomBase58(44);
    window.localStorage.setItem(KEY, w);
  }
  return w;
}

export function setWallet(value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, value);
}

export function clearWallet() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function useWallet(): string {
  const [wallet, setW] = useState<string>("");
  useEffect(() => {
    const w = getWallet();
    setW(w);
    // Best-effort user registration; API failures should not block read-only UI.
    api.upsertUser(w).catch(() => {});
  }, []);
  return wallet;
}
