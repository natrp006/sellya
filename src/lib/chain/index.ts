import { ethers } from "ethers";

/**
 * Real on-chain interaction for the custodial escrow model: one treasury
 * wallet receives every deposit (each buyer sent a unique exact amount so
 * deposits can be matched to a pending transaction), and the same wallet
 * signs payouts to sellers. No smart contract — the trust model is "you
 * trust the platform's private key," which is why this is explicitly a
 * v1/testing setup, not the long-term answer (see README).
 */

const USDC_DECIMALS = 6;

// Verified against Basescan (basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
// on 2026-08-29 — official Circle USDC on Base mainnet. Override via env if this ever changes.
const DEFAULT_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const DEFAULT_RPC_URL = "https://mainnet.base.org";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.BASE_RPC_URL || DEFAULT_RPC_URL;
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getUsdcAddress(): string {
  return process.env.USDC_CONTRACT_ADDRESS || DEFAULT_USDC_ADDRESS;
}

function getUsdcContract(runner: ethers.ContractRunner): ethers.Contract {
  return new ethers.Contract(getUsdcAddress(), ERC20_ABI, runner);
}

/** null if TREASURY_PRIVATE_KEY isn't set — callers must handle this (no payments configured yet). */
export function getTreasuryWallet(): ethers.Wallet | null {
  const key = process.env.TREASURY_PRIVATE_KEY;
  if (!key) return null;
  return new ethers.Wallet(key, getProvider());
}

/** Derives the public address from the configured key without any network call. */
export function getTreasuryAddress(): string | null {
  const key = process.env.TREASURY_PRIVATE_KEY;
  if (!key) return null;
  return new ethers.Wallet(key).address;
}

export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/** cents (hundredths of a dollar) -> USDC base units (6 decimals). $1.00 = 100 cents = 1_000_000 units. */
export function centsToUsdcUnits(cents: number): bigint {
  return BigInt(cents) * 10_000n;
}

export function usdcUnitsToDisplay(units: bigint): string {
  return ethers.formatUnits(units, USDC_DECIMALS);
}

export interface IncomingTransfer {
  txHash: string;
  from: string;
  blockNumber: number;
}

// Base's public RPC (mainnet.base.org) rejects an eth_getLogs call spanning
// more than ~2,000 blocks — a single 10,000-block query throws outright, so
// the lookback window has to be split into chunks small enough to stay
// under that cap.
const MAX_LOG_RANGE_BLOCKS = 1_900;

/**
 * Scans recent Transfer events for one matching `expectedUnits` sent to
 * `toAddress`. Brute-force log scan over a bounded lookback window rather
 * than tracking a "last checked block" cursor — fine for this scaffold's
 * volume, would need real indexing (or a webhook provider) at scale. Scans
 * newest-first in chunks since a fresh deposit is almost always recent.
 */
export async function findIncomingTransfer(
  toAddress: string,
  expectedUnits: bigint,
  lookbackBlocks = 10_000
): Promise<IncomingTransfer | null> {
  const provider = getProvider();
  const contract = getUsdcContract(provider);
  const latest = await provider.getBlockNumber();
  const earliestBlock = Math.max(0, latest - lookbackBlocks);
  const filter = contract.filters.Transfer!(null, toAddress);

  let rangeEnd = latest;
  while (rangeEnd >= earliestBlock) {
    const rangeStart = Math.max(earliestBlock, rangeEnd - MAX_LOG_RANGE_BLOCKS);
    const events = await contract.queryFilter(filter, rangeStart, rangeEnd);

    for (const event of events) {
      if (!("args" in event) || !event.args) continue;
      const value = event.args.value as bigint;
      if (value === expectedUnits) {
        return { txHash: event.transactionHash, from: event.args.from as string, blockNumber: event.blockNumber };
      }
    }

    if (rangeStart === earliestBlock) break;
    rangeEnd = rangeStart - 1;
  }
  return null;
}

/** Signs and broadcasts a USDC transfer from the treasury wallet. Throws if unconfigured or the tx fails. */
export async function sendUsdcPayout(toAddress: string, units: bigint): Promise<string> {
  const wallet = getTreasuryWallet();
  if (!wallet) throw new Error("Treasury wallet not configured (TREASURY_PRIVATE_KEY unset)");
  const contract = getUsdcContract(wallet);
  const tx = await contract.transfer!(toAddress, units);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export interface TreasuryStatus {
  address: string;
  ethBalance: string;
  usdcBalance: string;
}

/** null if unconfigured. Read-only — safe to call for display purposes. */
export async function getTreasuryStatus(): Promise<TreasuryStatus | null> {
  const address = getTreasuryAddress();
  if (!address) return null;
  const provider = getProvider();
  const contract = getUsdcContract(provider);
  const [ethBalance, usdcBalance] = await Promise.all([provider.getBalance(address), contract.balanceOf!(address)]);
  return {
    address,
    ethBalance: ethers.formatEther(ethBalance),
    usdcBalance: usdcUnitsToDisplay(usdcBalance),
  };
}
