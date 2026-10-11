import type { AIProvider, AIReply, KnowledgeArticle } from "./index";

const BOOKING_WORDS = ["book", "reserve", "reservation", "room for", "availability"];
const STAFF_WORDS = ["massage", "spa", "complaint", "manager", "refund", "speak to"];

/** Keyword intent matching over the tenant knowledge base. Deterministic by design. */
export const mockAIProvider: AIProvider = {
  async reply(message: string, knowledge: KnowledgeArticle[]): Promise<AIReply> {
    const text = message.toLowerCase();
    let best: { article: KnowledgeArticle; hits: number } | null = null;
    for (const article of knowledge) {
      const hits = article.keywords.filter((k) => text.includes(k.toLowerCase())).length;
      if (hits > 0 && (!best || hits > best.hits)) best = { article, hits };
    }

    const handoff = STAFF_WORDS.some((w) => text.includes(w))
      ? "staff"
      : BOOKING_WORDS.some((w) => text.includes(w))
        ? "booking"
        : "none";

    if (best) {
      return {
        text: best.article.answer,
        confidence: Math.min(0.97, 0.72 + best.hits * 0.08),
        intent: best.article.intent,
        handoff,
      };
    }
    return {
      text:
        handoff === "booking"
          ? "I can help you book. Let me open the booking page with your dates."
          : "Let me connect you with a member of our team who can help with that.",
      confidence: 0.55,
      intent: null,
      handoff: handoff === "none" ? "staff" : handoff,
    };
  },
};
