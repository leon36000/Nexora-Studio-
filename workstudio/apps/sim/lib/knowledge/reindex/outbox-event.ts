/**
 * Re-embeds a knowledge base with its new model, one processing slice per delivery. Kept free of
 * dependencies so the outbox handler registry can name it without loading the handler.
 */
export const KNOWLEDGE_REINDEX_EVENT = 'knowledge.reindex'
