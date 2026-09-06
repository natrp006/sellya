-- AlterTable
ALTER TABLE "User" ADD COLUMN     "walletNonce" TEXT,
ADD COLUMN     "walletNonceExpiresAt" TIMESTAMP(3),
ADD COLUMN     "walletVerifiedAt" TIMESTAMP(3);
