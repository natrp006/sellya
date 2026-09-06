import { getCurrentUser } from "@/lib/auth";
import { ListingForm } from "@/components/listings/ListingForm";

// Depends on the current (anonymous) session — must render per-request
// once getCurrentUser() is backed by real per-request auth.
export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const user = await getCurrentUser();

  if (!user) {
    // Shouldn't happen — middleware assigns a session cookie on every request.
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <p className="text-sm text-gray-600">Could not establish a session. Please refresh and try again.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">List something for sale</h1>
      <p className="mt-2 text-sm text-gray-600">
        Submissions are screened automatically before they go live. You&apos;ll see the AI review result right away.
      </p>
      <div className="mt-6">
        <ListingForm sellerId={user.id} />
      </div>
    </div>
  );
}
