import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with SellYa — no account needed.",
  robots: { index: false, follow: false },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Contact</h1>
      <p className="mt-2 text-sm text-gray-600">
        Report a problem, ask a question, or flag a listing — this goes straight to the admin.
      </p>
      <div className="mt-6">
        <ContactForm />
      </div>
    </div>
  );
}
