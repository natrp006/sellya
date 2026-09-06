export type ModerationVerdict = "approved" | "rejected" | "needs_info";

export interface ModerationResult {
  verdict: ModerationVerdict;
  reasons: string[];
  /** Outstanding clarifying questions the seller must answer before this can be re-reviewed. */
  questions: string[];
  qualityScore: number | null; // 1-10, null until approved
  summary: string | null; // short AI-generated summary of strengths/weaknesses, shown to buyers
  confidence: number; // 0-1
  reviewedAt: string;
}

export interface ModerationClarification {
  question: string;
  answer: string;
}

export interface ModerationInput {
  title: string;
  summary: string;
  tags: string[];
  priceCents: number;
  /** Full plain-text content (public + locked segments combined) — always present. */
  content: string;
  lockedChars: number;
  /** Prior Q&A from earlier clarification rounds on this same listing, oldest first. */
  clarifications: ModerationClarification[];
}
