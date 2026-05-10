import { Request, Response, NextFunction } from 'express';

// x402 stub middleware — auto-approves verification payments for demo
// Real x402-express wiring is post-hackathon

const VERIFY_PRICE_SOL = parseFloat(process.env.VERIFY_PRICE_SOL || '0.0002');

// In-memory budget tracker per pool (pool_id → spent)
const budgetTracker = new Map<string, number>();

export function x402Middleware(req: Request, res: Response, next: NextFunction): void {
  const poolId = req.body?.pool_id as string | undefined;

  if (poolId) {
    const spent = budgetTracker.get(poolId) || 0;
    budgetTracker.set(poolId, spent + VERIFY_PRICE_SOL);
    console.log(`x402: auto-approved ${VERIFY_PRICE_SOL} SOL for pool ${poolId} (demo mode). Total spent: ${spent + VERIFY_PRICE_SOL} SOL`);
  }

  next();
}

export function getBudgetSpent(poolId: string): number {
  return budgetTracker.get(poolId) || 0;
}
