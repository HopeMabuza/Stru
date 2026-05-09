import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Check,
  Zap,
  Camera,
  Trophy,
  Users,
  Bot,
  Coins,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import skyClouds from "@/assets/sky-clouds.jpg";
import brickWall from "@/assets/brick-wall.jpg";
import bubblegum from "@/assets/bubblegum.jpg";
import { WalletButton } from "@/components/WalletButton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stru 🤞 — Put your money where your mouth is." },
      {
        name: "description",
        content:
          "Stru lets you and your friends pool USDC on a shared goal. An AI referee verifies your proof. Winners split the pot. Put your money where your mouth is.",
      },
      { property: "og:title", content: "Stru 🤞 — Put your money where your mouth is." },
      {
        property: "og:description",
        content: "Stake USDC on a shared goal. AI verifies your proof. Winners split the pot.",
      },
    ],
  }),
  component: Landing,
});

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-ink bg-lime shadow-brutal-sm">
            <span className="text-lg leading-none">🤞</span>
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight">Stru</span>
          <span className="ml-1 hidden rounded-full border border-ink/30 bg-cream px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:inline">
            beta
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <a href="#how" className="hover:underline underline-offset-4">
            How it works
          </a>
          <a href="#referee" className="hover:underline underline-offset-4">
            AI Referee
          </a>
          <a href="#mechanic" className="hover:underline underline-offset-4">
            The pot
          </a>
          <a href="#faq" className="hover:underline underline-offset-4">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <WalletButton variant="cream" className="hidden md:inline-flex" />
          <Link to="/dashboard" className="hidden sm:inline-flex">
            <Button variant="hero" size="default">
              Launch app <ArrowRight />
            </Button>
          </Link>
          <Link to="/create" className="sm:hidden">
            <Button variant="ink" size="default">
              Launch
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Marquee() {
  const items = [
    "12 gym sessions in 30 days",
    "Quit Twitter for 2 weeks",
    "Read 4 books this month",
    "5km run, 3x a week",
    "Ship side-project by Friday",
    "Cold shower streak",
    "No takeout for 21 days",
    "Daily Duolingo, no skips",
  ];
  return (
    <div
      className="relative overflow-hidden border-y-[5px] border-ink py-4 text-cream"
      style={{
        backgroundImage: `linear-gradient(oklch(0.18 0.02 260 / 0.55), oklch(0.18 0.02 260 / 0.55)), url(${brickWall})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="marquee flex w-max gap-10 whitespace-nowrap font-display text-lg font-bold">
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="rounded-md border-[2px] border-ink bg-cream px-3 py-1 text-ink shadow-brutal-sm">
              {t}
            </span>
            <span className="text-sky text-2xl">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundImage: `url(${skyClouds})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* cartoon sun */}
      <div
        className="wobble absolute -top-10 -right-10 hidden h-56 w-56 rounded-full border-[5px] border-ink bg-sky shadow-brutal-lg lg:block"
        aria-hidden
      />
      {/* cartoon ground strip */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 border-t-[5px] border-ink"
        style={{
          backgroundImage: `url(${bubblegum})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* floating stickers */}
      <div
        className="float-slow absolute left-[6%] top-28 hidden rotate-[-8deg] rounded-2xl border-[3px] border-ink bg-coral px-4 py-2 text-sm font-bold text-cream shadow-brutal lg:block"
        style={{ ["--r" as string]: "-8deg" }}
      >
        +0.4 USDC yield 🌱
      </div>
      <div
        className="float-slow absolute right-[8%] top-44 hidden rotate-[6deg] rounded-2xl border-[3px] border-ink bg-sky px-4 py-2 text-sm font-bold shadow-brutal lg:block"
        style={{ ["--r" as string]: "6deg", animationDelay: "1.2s" }}
      >
        AI: ✓ counts as proof
      </div>
      <div
        className="float-slow absolute bottom-32 left-[12%] hidden rotate-[5deg] rounded-2xl border-[3px] border-ink bg-cream px-4 py-2 text-sm font-bold shadow-brutal lg:block"
        style={{ ["--r" as string]: "5deg", animationDelay: "0.6s" }}
      >
        Pot: 240 USDC 💰
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-32 pt-16 sm:pt-24 lg:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border-[3px] border-ink bg-cream px-3 py-1 text-xs font-semibold shadow-brutal-sm">
            <span className="ticker-pulse h-2 w-2 rounded-full bg-coral" />
            Live goal pools · AI proof checks · Solana escrow
          </div>
          <h1
            className="font-display text-5xl font-extrabold tracking-tight text-ink sm:text-7xl lg:text-[7.5rem]"
            style={{ WebkitTextStroke: "2px var(--ink)" }}
          >
            Put your money{" "}
            <span className="relative inline-block">
              <span className="relative z-10">where</span>
              <span className="absolute inset-x-0 bottom-2 -z-0 h-[0.45em] rounded-md border-[3px] border-ink bg-coral" />
            </span>
            <br />
            your{" "}
            <span
              className="font-serif italic text-cream"
              style={{ WebkitTextStroke: "2px var(--ink)" }}
            >
              mouth
            </span>{" "}
            is.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl rounded-2xl border-[3px] border-ink bg-cream/90 px-5 py-4 text-lg text-foreground/85 shadow-brutal-sm sm:text-xl">
            Stru pools USDC with your friends on one shared goal. An AI referee checks your proof.
            Whoever shows up splits the pot — including the slackers' money. 🤞
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/create">
              <Button variant="hero" size="xl">
                Start a stake <Zap />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="cream" size="xl">
                See a live pool <ChevronRight />
              </Button>
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-foreground/60">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" /> Wallet-ready
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" /> Unspent budget pays winners
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" /> Clear payout status
            </span>
          </div>
        </div>

        {/* Pot card preview */}
        <div className="relative mx-auto mt-20 max-w-3xl">
          <div className="rounded-3xl border-2 border-ink bg-card p-6 shadow-brutal-lg sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-foreground/60">
                  Pool · the gym crew
                </div>
                <div className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
                  12 sessions in 30 days
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border-2 border-ink bg-lime px-3 py-1.5 text-sm font-bold">
                <Clock className="size-4" /> 18d 04h left
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Pot", value: "240 USDC", icon: Coins },
                { label: "Yield", value: "+0.42", icon: Sparkles },
                { label: "Players", value: "6", icon: Users },
                { label: "On track", value: "4 / 6", icon: Trophy },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border-2 border-ink bg-secondary p-3">
                  <s.icon className="size-4 opacity-60" />
                  <div className="mt-2 font-display text-xl font-extrabold">{s.value}</div>
                  <div className="text-[11px] uppercase tracking-wider text-foreground/60">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2.5">
              {[
                { name: "maya.sol", pct: 92, color: "bg-lime" },
                { name: "jules", pct: 75, color: "bg-sky" },
                { name: "tomi.eth", pct: 58, color: "bg-coral" },
                { name: "ben", pct: 33, color: "bg-secondary" },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-24 truncate font-mono text-xs">{p.name}</div>
                  <div className="relative h-6 flex-1 overflow-hidden rounded-md border-2 border-ink bg-cream">
                    <div
                      className={`h-full ${p.color} border-r-2 border-ink`}
                      style={{ width: `${p.pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-[11px] font-bold">
                      {p.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: Users,
      title: "Rally the group",
      body: "Invite your friends, agree on one goal. Everyone stakes the same amount of USDC into a shared escrow.",
      color: "bg-lime",
    },
    {
      n: "02",
      icon: Camera,
      title: "Submit proof",
      body: "Photo, screenshot, Strava export — whatever shows you actually did the thing. Drop it in the app.",
      color: "bg-sky",
    },
    {
      n: "03",
      icon: Bot,
      title: "AI calls it",
      body: "An AI referee reviews each submission, decides if it counts, and explains its verdict out loud.",
      color: "bg-coral",
    },
    {
      n: "04",
      icon: Trophy,
      title: "Winners take all",
      body: "Timer hits zero. Everyone who hit the goal splits the pot — stakes, yield, and the slackers' forfeits.",
      color: "bg-cream",
    },
  ];
  return (
    <section id="how" className="border-t-2 border-ink bg-cream py-24">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-coral">
              How it works
            </div>
            <h2 className="font-display text-4xl font-extrabold sm:text-6xl">
              Four steps. <span className="font-serif italic">No honor system.</span>
            </h2>
          </div>
          <p className="max-w-md text-foreground/70">
            Accountability apps fail because nothing's at stake. We fixed that with money your
            friends can watch — and an AI that doesn't accept excuses.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="group relative rounded-2xl border-2 border-ink bg-card p-6 shadow-brutal-sm transition-all hover:-translate-y-1 hover:shadow-brutal"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-mono text-xs text-foreground/50">{s.n}</span>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 border-ink ${s.color}`}
                >
                  <s.icon className="size-5" />
                </div>
              </div>
              <h3 className="font-display text-2xl font-extrabold">{s.title}</h3>
              <p className="mt-2 text-sm text-foreground/70">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Referee() {
  return (
    <section
      id="referee"
      className="relative overflow-hidden border-t-2 border-ink bg-ink py-24 text-cream"
    >
      <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-lime">
            The AI referee
          </div>
          <h2 className="font-display text-4xl font-extrabold sm:text-6xl">
            No humans. <br />
            <span className="text-lime">No drama.</span> <br />
            <span className="font-serif italic text-cream/80">Just verdicts.</span>
          </h2>
          <p className="mt-6 max-w-md text-cream/70">
            Every proof you submit gets reviewed by an AI agent. It looks at the evidence, checks it
            against your goal, and either green-lights it or sends it back with a reason. You see
            the receipts every time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-cream/20 bg-cream/5 px-3 py-1 text-xs">
              📸 Photo proof
            </span>
            <span className="rounded-full border border-cream/20 bg-cream/5 px-3 py-1 text-xs">
              🏃 Strava export
            </span>
            <span className="rounded-full border border-cream/20 bg-cream/5 px-3 py-1 text-xs">
              📱 App screenshot
            </span>
            <span className="rounded-full border border-cream/20 bg-cream/5 px-3 py-1 text-xs">
              📊 Activity export
            </span>
          </div>
        </div>

        {/* mock chat */}
        <div className="rounded-3xl border-2 border-cream/15 bg-cream/[0.04] p-5 shadow-brutal-lg backdrop-blur">
          <div className="mb-4 flex items-center justify-between text-xs text-cream/60">
            <span className="font-mono">verify://session-A8c2</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="ticker-pulse h-2 w-2 rounded-full bg-lime" /> live
            </span>
          </div>
          <div className="space-y-3">
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm border border-cream/15 bg-cream/10 px-4 py-3 text-sm">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-cream/50">
                @maya · evidence
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-md border border-cream/20 bg-cream/10 text-xl">
                  🏋️
                </div>
                <div className="text-cream/85">Gym selfie — sessions tab open, 6:42 PM</div>
              </div>
            </div>

            <div className="max-w-[88%] rounded-2xl rounded-tl-sm border-2 border-lime/40 bg-lime/10 px-4 py-3 text-sm">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-lime">
                <Bot className="size-3" /> referee
              </div>
              <p className="text-cream/90">
                <span className="font-bold text-lime">Counts. ✓</span> Visible gym backdrop,
                timestamp matches today, equipment + posture consistent with a real session. Logged
                as session <span className="font-mono text-xs text-cream">7 / 12</span>.
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-cream/10 pt-3 text-[11px] text-cream/50">
                <span>x402 fee · 0.02 USDC</span>
                <span className="font-mono">conf 0.94</span>
              </div>
            </div>

            <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-coral/40 bg-coral/10 px-4 py-3 text-sm">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-coral">
                <Bot className="size-3" /> referee · @ben
              </div>
              <p className="text-cream/90">
                <span className="font-bold text-coral">Doesn't count.</span> Photo is from your
                camera roll dated last Tuesday. Try a fresh one with today's timestamp visible.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Mechanic() {
  return (
    <section
      id="mechanic"
      className="relative overflow-hidden border-t-[5px] border-ink py-24"
      style={{
        backgroundImage: `linear-gradient(oklch(0.97 0.02 90 / 0.35), oklch(0.91 0.18 95 / 0.35)), url(${bubblegum})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* cartoon clouds drifting in the sky-blue overlay */}
      <div className="wobble pointer-events-none absolute -top-8 left-10 hidden h-24 w-44 rounded-full border-[4px] border-ink bg-cream lg:block" />
      <div
        className="wobble pointer-events-none absolute top-16 right-16 hidden h-20 w-36 rounded-full border-[4px] border-ink bg-cream lg:block"
        style={{ animationDelay: "1.5s" }}
      />
      <div className="relative z-10 mx-auto max-w-6xl px-5">
        <div className="text-center">
          <div className="mb-3 inline-block rounded-full border-[3px] border-ink bg-cream px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-brutal-sm">
            The pot mechanic
          </div>
          <h2 className="font-display text-4xl font-extrabold sm:text-6xl">
            Efficient verification = <span className="font-serif italic">richer winners.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-foreground/75">
            Every AI check costs a tiny USDC fee, drawn from the pool's verification budget. Spam
            bad proof and you're literally burning your friends' money. Whatever the pool doesn't
            spend rolls into the final payout.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border-2 border-ink bg-cream p-6 shadow-brutal">
            <div className="font-display text-5xl font-extrabold">240</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider">USDC staked</div>
            <p className="mt-3 text-sm text-foreground/70">
              Six friends, 40 USDC each. Locked in escrow on Solana while the timer runs.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-ink bg-card p-6 shadow-brutal">
            <div className="font-display text-5xl font-extrabold">+0.42</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider">Bonus pool</div>
            <p className="mt-3 text-sm text-foreground/70">
              Yield and leftover verification budget roll into winner payouts instead of
              disappearing.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-ink bg-coral p-6 text-cream shadow-brutal">
            <div className="font-display text-5xl font-extrabold">−1.1</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider">x402 fees so far</div>
            <p className="mt-3 text-sm text-cream/85">
              48 verifications across the group. The cleaner your proof, the cheaper the pool runs.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border-2 border-ink bg-ink p-6 text-cream shadow-brutal">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-lime">
                Projected payout · per winner
              </div>
              <div className="mt-1 font-display text-4xl font-extrabold">~ 59.83 USDC</div>
            </div>
            <div className="text-xs text-cream/60">
              Assuming 4/6 finish · stakes + bonus pool + forfeits − verification fees
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "What if the AI gets it wrong?",
      a: "Every verdict comes with a reason and a confidence score. If it fails, you can re-submit clearer evidence before the deadline. For v1, the AI referee is final.",
    },
    {
      q: "What happens to people who don't finish?",
      a: "Their stake stays in the pot and gets split among the people who did. That's the whole point — the cost of flaking is real.",
    },
    {
      q: "Do I need to know crypto?",
      a: "Connect a wallet, fund it with USDC, that's it. The contract handles the escrow, yield, and payout. You just need to actually do the thing.",
    },
    {
      q: "What chains does it support?",
      a: "Solana first — fast, cheap, and a strong fit for pooled escrow plus x402-style micropayments. This build targets devnet while the on-chain flow is finalized.",
    },
  ];
  return (
    <section id="faq" className="border-t-2 border-ink bg-cream py-24">
      <div className="mx-auto max-w-4xl px-5">
        <div className="text-center">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-coral">FAQ</div>
          <h2 className="font-display text-4xl font-extrabold sm:text-6xl">
            Questions, <span className="font-serif italic">answered.</span>
          </h2>
        </div>
        <div className="mt-10 divide-y-2 divide-ink rounded-2xl border-2 border-ink bg-card shadow-brutal">
          {items.map((it) => (
            <details key={it.q} className="group p-6 open:bg-secondary">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-extrabold">
                {it.q}
                <span className="flex size-8 items-center justify-center rounded-full border-2 border-ink bg-lime transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-foreground/70">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative overflow-hidden border-t-[5px] border-ink bg-coral py-28 text-cream">
      <div className="absolute inset-0 bg-halftone opacity-40" aria-hidden />
      <div className="relative z-10 mx-auto max-w-4xl px-5 text-center">
        <h2 className="font-display text-5xl font-extrabold sm:text-7xl">
          Peer pressure, <br />
          <span className="font-serif italic">but make it onchain.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-cream/85">
          Get your group together. Pick something hard. Put real money on it. Show up — or watch
          your friends spend yours.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/create">
            <Button variant="cream" size="xl">
              Start your first stake <ArrowRight />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="ink" size="xl">
              View dashboard
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-ink bg-ink py-10 text-cream">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-cream bg-lime text-ink">
            <span className="font-display font-extrabold">S</span>
          </div>
          <span className="font-display text-lg font-extrabold">Stru 🤞</span>
          <span className="ml-2 text-xs text-cream/50">© 2026</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/70">
          <a href="#how" className="hover:text-lime">
            How it works
          </a>
          <a href="#referee" className="hover:text-lime">
            AI referee
          </a>
          <a href="#mechanic" className="hover:text-lime">
            The pot
          </a>
          <a href="#faq" className="hover:text-lime">
            FAQ
          </a>
        </div>
        <div className="font-mono text-xs text-cream/40">built on solana · jhb 🇿🇦</div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <Marquee />
      <HowItWorks />
      <Referee />
      <Mechanic />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
