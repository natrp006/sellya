import { getSettings } from "@/lib/settings";
import type { ModerationClarification, ModerationInput, ModerationResult, ModerationVerdict } from "@/types/moderation";

/**
 * Contract every moderation backend must satisfy.
 */
export interface ModerationService {
  reviewListing(input: ModerationInput): Promise<ModerationResult>;
}

const BANNED_TERMS = ["guaranteed income", "get rich quick", "no risk"];
const MIN_SUMMARY_LENGTH = 20;
const MIN_CONTENT_LENGTH = 200;
const MAX_CLARIFICATION_ROUNDS = 2;

const CONSENT_QUESTION =
  "You mention a contact/lead/client list — can you confirm you have the right to sell this data and that the individuals in it have consented to being contacted?";
const SUMMARY_QUESTION =
  "Your summary is quite brief — can you expand it so buyers understand what they're getting?";
const CONTENT_QUESTION =
  "Your content seems too short for a meaningful review — can you expand on it?";
const LOCK_QUESTION =
  "Nothing in your content is marked as locked ({{like this}}) — as written, buyers would see everything for free before paying. Is that intentional, or would you like to lock specific key details?";

const CONTACT_DATA_PATTERN = /\b(contact list|lead list|client list|database of|email list)\b/i;

/**
 * Placeholder heuristic — always available as a fallback (no API key
 * required, no network dependency). Used directly when no AI key is
 * configured, and as a safety net if the real AI call fails.
 */
class StubModerationService implements ModerationService {
  async reviewListing(input: ModerationInput): Promise<ModerationResult> {
    const reasons: string[] = [];
    const metadataText = `${input.title} ${input.summary} ${input.content}`.toLowerCase();

    for (const term of BANNED_TERMS) {
      if (metadataText.includes(term)) {
        reasons.push(`Contains disallowed claim: "${term}"`);
      }
    }
    if (input.priceCents <= 0) {
      reasons.push("Price must be greater than zero");
    }
    if (reasons.length > 0) {
      return this.result("rejected", reasons, [], null, null, 0.9);
    }

    const answered = new Set(input.clarifications.map((c) => c.question));
    const questions: string[] = [];

    if (CONTACT_DATA_PATTERN.test(metadataText) && !answered.has(CONSENT_QUESTION)) {
      questions.push(CONSENT_QUESTION);
    }
    if (input.summary.trim().length < MIN_SUMMARY_LENGTH && !answered.has(SUMMARY_QUESTION)) {
      questions.push(SUMMARY_QUESTION);
    }
    if (input.content.trim().length < MIN_CONTENT_LENGTH && !answered.has(CONTENT_QUESTION)) {
      questions.push(CONTENT_QUESTION);
    }
    if (input.lockedChars === 0 && !answered.has(LOCK_QUESTION)) {
      questions.push(LOCK_QUESTION);
    }

    if (questions.length > 0) {
      if (input.clarifications.length >= MAX_CLARIFICATION_ROUNDS) {
        return this.result(
          "rejected",
          ["Could not establish listing quality/legitimacy after clarification"],
          [],
          null,
          null,
          0.6
        );
      }
      return this.result("needs_info", [], questions, null, null, 0.5);
    }

    const depthScore = Math.min(10, Math.max(4, Math.round(input.content.length / 300)));
    return this.result(
      "approved",
      [],
      [],
      depthScore,
      "Reviewed the seller's full submitted content for structure, specificity, and depth.",
      0.9
    );
  }

  private result(
    verdict: ModerationVerdict,
    reasons: string[],
    questions: string[],
    qualityScore: number | null,
    summary: string | null,
    confidence: number
  ): ModerationResult {
    return { verdict, reasons, questions, qualityScore, summary, confidence, reviewedAt: new Date().toISOString() };
  }
}

const SYSTEM_PROMPT = `You are the automated moderation and quality-assurance reviewer for SellYa, an anonymous marketplace where people sell packaged information (playbooks, processes, contact lists, know-how). Sellers upload their full content and mark specific key details as locked/paywalled using {{double curly braces}}; everything else is shown publicly for free. Your job is to decide whether a submitted listing can go live.

Respond with ONLY a single JSON object, no other text, no markdown fences, matching exactly this shape:
{"verdict":"approved"|"rejected"|"needs_info","reasons":string[],"questions":string[],"qualityScore":number|null,"summary":string|null}

Decision rules:
- Reject ("rejected") for hard violations: illegal content, sharing personal data without consent, doxxing, stolen credentials/accounts, insider trading info, guaranteed-income/no-risk/get-rich-quick claims, spam, or a price of zero or less. List concrete reasons.
- Ask for clarification ("needs_info") when something is fixable rather than a hard violation, e.g.: the listing mentions a contact/lead/client list without confirming the seller has the right to sell it and that individuals consented; the summary or content is too thin to assess; nothing is marked as locked despite this being a paid listing (confirm that's intentional). List specific, direct questions — each will be shown to the seller to answer, verbatim.
- Otherwise approve ("approved") and provide a 1-10 qualityScore plus a one-sentence summary of the content's strengths/weaknesses, based on structure, specificity, and depth.
- Only fill "reasons" for rejected, "questions" for needs_info, and qualityScore/summary for approved — leave the others as an empty array or null.
- Take previously answered clarifications into account. Don't re-ask something already answered unless the answer clearly fails to resolve it.`;

function buildPrompt(input: ModerationInput): string {
  const clarifications = input.clarifications.length
    ? input.clarifications.map((c: ModerationClarification) => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n")
    : "None yet.";

  return `Listing under review:
Title: ${input.title}
Summary: ${input.summary}
Tags: ${input.tags.join(", ") || "none"}
Price: ${(input.priceCents / 100).toFixed(2)} USDC
Characters locked (paywalled): ${input.lockedChars}

Full content (public + locked combined):
"""
${input.content}
"""

Previously answered clarifications:
${clarifications}`;
}

function parseModerationJson(text: string): Omit<ModerationResult, "reviewedAt"> | null {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    const verdict = parsed.verdict;
    if (verdict !== "approved" && verdict !== "rejected" && verdict !== "needs_info") return null;

    const qualityScore =
      typeof parsed.qualityScore === "number" ? Math.max(1, Math.min(10, Math.round(parsed.qualityScore))) : null;

    return {
      verdict,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.filter((r: unknown) => typeof r === "string") : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions.filter((q: unknown) => typeof q === "string") : [],
      qualityScore,
      summary: typeof parsed.summary === "string" ? parsed.summary : null,
      confidence: 0.85,
    };
  } catch {
    return null;
  }
}

/**
 * Calls a real Claude model to review the listing. Requires an API key set
 * via the admin panel (src/lib/settings). Any failure (network, non-2xx,
 * unparseable response) throws — the caller falls back to the heuristic.
 */
class AnthropicModerationService implements ModerationService {
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async reviewListing(input: ModerationInput): Promise<ModerationResult> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPrompt(input) }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Anthropic API error ${response.status}: ${body.slice(0, 300)}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    const parsed = parseModerationJson(text);
    if (!parsed) {
      throw new Error(`Could not parse AI moderation response: ${text.slice(0, 300)}`);
    }

    return { ...parsed, reviewedAt: new Date().toISOString() };
  }
}

const stubModerationService = new StubModerationService();

export const moderationService: ModerationService = {
  async reviewListing(input) {
    const settings = getSettings();
    if (settings.aiApiKey) {
      try {
        const ai = new AnthropicModerationService(settings.aiApiKey, settings.aiModel);
        return await ai.reviewListing(input);
      } catch (err) {
        console.error("[moderation] AI review failed, falling back to heuristic:", err);
      }
    }
    return stubModerationService.reviewListing(input);
  },
};
