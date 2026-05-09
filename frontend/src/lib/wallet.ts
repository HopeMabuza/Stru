// Wallet stub — keeps a deterministic per-browser "wallet address" in
// localStorage so the rest of the flow (create pool, join, verify, claim)
// has something to attach activity to.
//
// Replace this entire module with Privy embedded-wallet wiring per CLAUDE.md
// section 5.A once Privy is integrated. The exported surface (getWallet,
// useWallet) is what the rest of the app consumes — keep those signatures stable.

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
    // Best-effort upsert; ignore failures so the UI still loads offline.
    api.upsertUser(w).catch(() => {});
  }, []);
  return wallet;
}
