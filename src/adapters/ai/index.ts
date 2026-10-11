import { mockAIProvider } from "./mock";

export type KnowledgeArticle = { intent: string; keywords: string[]; answer: string };

export type AIReply = {
  text: string;
  /** 0..1; shown on screen as the concierge confidence chip. */
  confidence: number;
  intent: string | null;
  handoff: "none" | "booking" | "staff";
};

export interface AIProvider {
  reply(message: string, knowledge: KnowledgeArticle[]): Promise<AIReply>;
}

/** Scripted and repeatable on stage; a real LLM provider would be selected here by environment. */
export function getAIProvider(): AIProvider {
  return mockAIProvider;
}
