import { Button } from "@/components/ui/Button";

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Connect wallet</h1>
      <p className="mt-2 text-sm text-gray-600">
        SellYa is anonymous — no email or real name is ever collected. Sessions and payouts are tied to a wallet
        signature instead of a login.
      </p>
      <p className="mt-2 text-sm text-gray-600">
        Wallet connection is still being built. For now you&apos;re automatically assigned a private anonymous
        session — listing and buying already work, so feel free to try both.
      </p>
      <div className="mt-6">
        <Button type="button" disabled>
          Connect wallet (coming soon)
        </Button>
      </div>
    </div>
  );
}
