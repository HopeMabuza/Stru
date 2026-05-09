import { useEffect, useState } from "react";
import { api } from "./api";

export const PHANTOM_INSTALL_URL = "https://phantom.app/download";

type WalletStatus = "checking" | "unavailable" | "disconnected" | "connecting" | "connected";

interface SolanaPublicKey {
  toString(): string;
}

interface PhantomProvider {
  isPhantom?: boolean;
  isConnected?: boolean;
  publicKey?: SolanaPublicKey | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: SolanaPublicKey }>;
  disconnect(): Promise<void>;
  on?(event: "connect", handler: (publicKey?: SolanaPublicKey) => void): void;
  on?(event: "disconnect", handler: () => void): void;
  on?(event: "accountChanged", handler: (publicKey: SolanaPublicKey | null) => void): void;
}

interface WalletSnapshot {
  address: string;
  status: WalletStatus;
  error: string | null;
  hasPhantom: boolean;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
    phantom?: { solana?: PhantomProvider };
  }
}

const listeners = new Set<() => void>();
const registeredWallets = new Set<string>();

let snapshot: WalletSnapshot = {
  address: "",
  status: "checking",
  error: null,
  hasPhantom: false,
};
let eventsInitialized = false;
let trustedConnectAttempted = false;

function getProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const phantom = window.phantom?.solana;
  if (phantom?.isPhantom) return phantom;
  const solana = window.solana;
  return solana?.isPhantom ? solana : null;
}

function setSnapshot(next: Partial<WalletSnapshot>) {
  snapshot = { ...snapshot, ...next };
  if (snapshot.status === "connected" && snapshot.address) registerWallet(snapshot.address);
  listeners.forEach((listener) => listener());
}

function registerWallet(address: string) {
  if (registeredWallets.has(address)) return;
  registeredWallets.add(address);
  api.upsertUser(address).catch(() => registeredWallets.delete(address));
}

function addressFrom(publicKey?: SolanaPublicKey | null) {
  return publicKey?.toString() ?? "";
}

function initProviderEvents(provider: PhantomProvider) {
  if (eventsInitialized) return;
  eventsInitialized = true;
  provider.on?.("connect", (publicKey) => {
    const address = addressFrom(publicKey ?? provider.publicKey);
    setSnapshot({
      address,
      status: address ? "connected" : "disconnected",
      error: null,
      hasPhantom: true,
    });
  });
  provider.on?.("disconnect", () => {
    setSnapshot({ address: "", status: "disconnected", error: null, hasPhantom: true });
  });
  provider.on?.("accountChanged", (publicKey) => {
    const address = addressFrom(publicKey);
    setSnapshot({
      address,
      status: address ? "connected" : "disconnected",
      error: null,
      hasPhantom: true,
    });
  });
}

function initWallet() {
  const provider = getProvider();
  if (!provider) {
    setSnapshot({ address: "", status: "unavailable", hasPhantom: false });
    return;
  }

  initProviderEvents(provider);
  const current = addressFrom(provider.publicKey);
  setSnapshot({
    address: current,
    status: current ? "connected" : "disconnected",
    error: null,
    hasPhantom: true,
  });

  if (!trustedConnectAttempted) {
    trustedConnectAttempted = true;
    provider
      .connect({ onlyIfTrusted: true })
      .then(({ publicKey }) => {
        const address = addressFrom(publicKey);
        setSnapshot({ address, status: "connected", error: null, hasPhantom: true });
      })
      .catch(() => {
        if (!snapshot.address)
          setSnapshot({ status: "disconnected", error: null, hasPhantom: true });
      });
  }
}

export async function connectWallet(): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    const message = "Phantom is not installed. Install Phantom to connect your Solana wallet.";
    setSnapshot({ address: "", status: "unavailable", error: message, hasPhantom: false });
    throw new Error(message);
  }

  initProviderEvents(provider);
  setSnapshot({ status: "connecting", error: null, hasPhantom: true });
  try {
    const { publicKey } = await provider.connect();
    const address = addressFrom(publicKey ?? provider.publicKey);
    if (!address) throw new Error("Phantom did not return a wallet address.");
    setSnapshot({ address, status: "connected", error: null, hasPhantom: true });
    return address;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not connect Phantom.";
    setSnapshot({ address: "", status: "disconnected", error: message, hasPhantom: true });
    throw e;
  }
}

export async function disconnectWallet() {
  const provider = getProvider();
  await provider?.disconnect().catch(() => undefined);
  setSnapshot({ address: "", status: "disconnected", error: null, hasPhantom: Boolean(provider) });
}

export function useWalletAccount() {
  const [state, setState] = useState(snapshot);
  useEffect(() => {
    const listener = () => setState(snapshot);
    listeners.add(listener);
    initWallet();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    ...state,
    connect: connectWallet,
    disconnect: disconnectWallet,
  };
}

export function useWallet(): string {
  return useWalletAccount().address;
}
