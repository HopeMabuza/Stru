import { ExternalLink, LogOut, Wallet } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { PHANTOM_INSTALL_URL, useWalletAccount } from "@/lib/wallet";

interface Props {
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export function WalletButton({ className, variant = "hero", size = "default" }: Props) {
  const wallet = useWalletAccount();

  if (wallet.status === "unavailable") {
    return (
      <Button
        asChild
        variant="cream"
        size={size}
        className={className}
        title={wallet.error ?? undefined}
      >
        <a href={PHANTOM_INSTALL_URL} target="_blank" rel="noreferrer">
          Install Phantom <ExternalLink className="size-4" />
        </a>
      </Button>
    );
  }

  if (wallet.address) {
    return (
      <Button
        variant="cream"
        size={size}
        className={className}
        onClick={wallet.disconnect}
        title="Disconnect Phantom"
      >
        <Wallet className="size-4" /> {shortWallet(wallet.address)} <LogOut className="size-4" />
      </Button>
    );
  }

  const busy = wallet.status === "checking" || wallet.status === "connecting";
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={busy}
      onClick={() => wallet.connect().catch(() => undefined)}
      title={wallet.error ?? undefined}
    >
      <Wallet className="size-4" /> {busy ? "Connecting..." : "Connect Phantom"}
    </Button>
  );
}
