import { ethers } from "ethers";
import { db } from "@/lib/db";
import type { User } from "@/types/user";

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes — short enough that a stale challenge can't be replayed later

/**
 * Real wallet-signature verification: a seller proves they control an
 * address by signing a server-issued, single-use, time-boxed nonce with
 * it. No smart contract, no third-party auth service — just EIP-191
 * personal_sign (ethers.verifyMessage recovers the signer, which is the
 * actual proof; nothing about "who the client claims to be" is trusted).
 */

function buildMessage(nonce: string): string {
  return `sellya.info wants you to verify wallet ownership.\n\nNonce: ${nonce}\n\nThis request will not trigger a blockchain transaction or cost any gas.`;
}

export async function createWalletChallenge(userId: string): Promise<{ message: string }> {
  const nonce = ethers.hexlify(ethers.randomBytes(16));
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  await db.users.setWalletNonce(userId, nonce, expiresAt);
  return { message: buildMessage(nonce) };
}

export type WalletVerifyResult = { ok: true; user: User } | { ok: false; error: string };

export async function verifyWalletSignature(
  userId: string,
  signature: string,
  claimedAddress: string
): Promise<WalletVerifyResult> {
  const challenge = await db.users.getWalletNonce(userId);
  if (!challenge) {
    return { ok: false, error: "No pending verification request — request a new challenge and try again." };
  }
  if (challenge.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Verification request expired — request a new one." };
  }

  let recovered: string;
  try {
    recovered = ethers.verifyMessage(buildMessage(challenge.nonce), signature);
  } catch {
    return { ok: false, error: "Could not verify signature." };
  }

  if (!claimedAddress || recovered.toLowerCase() !== claimedAddress.toLowerCase()) {
    return { ok: false, error: "Signature does not match the provided wallet address." };
  }

  const user = await db.users.verifyWallet(userId, recovered);
  if (!user) return { ok: false, error: "User not found." };
  return { ok: true, user };
}
