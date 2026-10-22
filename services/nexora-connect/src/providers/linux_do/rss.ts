import Parser from "rss-parser";

export interface LinuxDoFeedMeta {
  title: string | null;
  link: string | null;
  description: string | null;
}

export interface LinuxDoTopicSummary {
  id: number | null;
  title: string | null;
  url: string | null;
  author: string | null;
  category: string | null;
  excerpt: string | null;
  descriptionHtml: string | null;
  pubDate: string | null;
  pinned: boolean | null;
  closed: boolean | null;
  archived: boolean | null;
  raw: Record<string, unknown>;
}

export interface LinuxDoPostSummary {
  id: number | null;
  topicId: number | null;
  postNumber: number | null;
  title: string | null;
  url: string | null;
  author: string | null;
  excerpt: string | null;
  contentHtml: string | null;
  pubDate: string | null;
  raw: Record<string, unknown>;
}

export interface LinuxDoBadgeGrant {
  grantee: string | null;
  username: string | null;
  grantedAt: string | null;
  grantedBy: string | null;
  url: string | null;
  raw: Record<string, unknown>;
}

export interface LinuxDoTopicFeed {
  feed: LinuxDoFeedMeta;
  topics: LinuxDoTopicSummary[];
  count: number;
}

export interface LinuxDoPostFeed {
  feed: LinuxDoFeedMeta;
  posts: LinuxDoPostSummary[];
  count: number;
}

export interface LinuxDoBadgeFeed {
  feed: LinuxDoFeedMeta;
  grants: LinuxDoBadgeGrant[];
  count: number;
}

interface LinuxDoRssFields {
  topicPinned?: string;
  topicClosed?: string;
  topicArchived?: string;
  grantedAt?: string;
  grantedBy?: string;
}

type ParsedLinuxDoRssItem = Parser.Item & LinuxDoRssFields;

const rssParser = new Parser<Record<string, unknown>, LinuxDoRssFields>({
  customFields: {
    item: [
      ["discourse:topicPinned", "topicPinned"],
      ["discourse:topicClosed", "topicClosed"],
      ["discourse:topicArchived", "topicArchived"],
      ["discourse:grantedAt", "grantedAt"],
      ["discourse:grantedBy", "grantedBy"],
    ],
  },
});

export async function parseTopicFeed(xml: string, limit?: number): Promise<LinuxDoTopicFeed> {
  const feed = await rssParser.parseString(xml);
  const topics = applyLimit(feed.items, limit).map(normalizeTopic);
  return { feed: toFeedMeta(feed), topics, count: topics.length };
}

export async function parsePostFeed(xml: string, limit?: number): Promise<LinuxDoPostFeed> {
  const feed = await rssParser.parseString(xml);
  const posts = applyLimit(feed.items, limit).map(normalizePost);
  return { feed: toFeedMeta(feed), posts, count: posts.length };
}

export async function parseBadgeFeed(xml: string, limit?: number): Promise<LinuxDoBadgeFeed> {
  const feed = await rssParser.parseString(xml);
  const grants = applyLimit(feed.items, limit).map(normalizeBadgeGrant);
  return { feed: toFeedMeta(feed), grants, count: grants.length };
}

function toFeedMeta(feed: Parser.Output<LinuxDoRssFields>): LinuxDoFeedMeta {
  return {
    title: nonEmpty(feed.title),
    link: nonEmpty(feed.link),
    description: nonEmpty(feed.description),
  };
}

function normalizeTopic(item: ParsedLinuxDoRssItem): LinuxDoTopicSummary {
  return {
    id: extractTopicId(item.link, item.guid),
    title: nonEmpty(item.title),
    url: nonEmpty(item.link),
    author: nonEmpty(item.creator),
    category: nonEmpty(item.categories?.[0]),
    excerpt: nonEmpty(item.contentSnippet),
    descriptionHtml: nonEmpty(item.content),
    pubDate: nonEmpty(item.isoDate),
    pinned: yesNoToBool(item.topicPinned),
    closed: yesNoToBool(item.topicClosed),
    archived: yesNoToBool(item.topicArchived),
    raw: toRawItem(item),
  };
}

function normalizePost(item: ParsedLinuxDoRssItem): LinuxDoPostSummary {
  const ref = extractPostRef(item.link, item.guid);
  return {
    id: ref.postId,
    topicId: ref.topicId,
    postNumber: ref.postNumber,
    title: nonEmpty(item.title),
    url: nonEmpty(item.link),
    author: nonEmpty(item.creator),
    excerpt: nonEmpty(item.contentSnippet),
    contentHtml: nonEmpty(item.content),
    pubDate: nonEmpty(item.isoDate),
    raw: toRawItem(item),
  };
}

function normalizeBadgeGrant(item: ParsedLinuxDoRssItem): LinuxDoBadgeGrant {
  return {
    grantee: nonEmpty(item.title),
    username: extractUsernameFromGuid(item.guid),
    grantedAt: nonEmpty(item.grantedAt),
    grantedBy: nonEmpty(item.grantedBy),
    url: nonEmpty(item.guid),
    raw: toRawItem(item),
  };
}

export function extractTopicId(link?: string | null, guid?: string | null): number | null {
  const fromGuid = guid?.match(/topic-(\d+)/);
  if (fromGuid) {
    return Number(fromGuid[1]);
  }
  const fromLink = link?.match(/\/t\/[^/]+\/(\d+)/);
  return fromLink ? Number(fromLink[1]) : null;
}

interface LinuxDoPostRef {
  topicId: number | null;
  postNumber: number | null;
  postId: number | null;
}

export function extractPostRef(link?: string | null, guid?: string | null): LinuxDoPostRef {
  const topicMatch = link?.match(/\/t\/[^/]+\/(\d+)/);
  const hashMatch = link?.match(/#post[_-](\d+)/);
  const pathMatch = link?.match(/\/t\/[^/]+\/\d+\/(\d+)/);
  const guidMatch = guid?.match(/post-(\d+)(?:-(\d+))?$/);

  let postNumber: number | null = null;
  if (hashMatch) {
    postNumber = Number(hashMatch[1]);
  } else if (pathMatch) {
    postNumber = Number(pathMatch[1]);
  } else if (guidMatch?.[2] !== undefined) {
    postNumber = Number(guidMatch[2]);
  }

  return {
    topicId: topicMatch ? Number(topicMatch[1]) : null,
    postNumber,
    postId: guidMatch && guidMatch[2] === undefined ? Number(guidMatch[1]) : null,
  };
}

export function extractUsernameFromGuid(guid?: string | null): string | null {
  const match = guid?.match(/[?&]username=([^&]+)/);
  if (!match?.[1]) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function yesNoToBool(value?: string | null): boolean | null {
  if (value == null) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "true") {
    return true;
  }
  if (normalized === "no" || normalized === "false") {
    return false;
  }
  return null;
}

function applyLimit<T>(items: T[], limit?: number): T[] {
  if (limit == null || !Number.isFinite(limit) || limit < 0) {
    return items;
  }
  return items.slice(0, limit);
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRawItem(item: ParsedLinuxDoRssItem): Record<string, unknown> {
  return {
    title: item.title,
    link: item.link,
    guid: item.guid,
    creator: item.creator,
    categories: item.categories,
    content: item.content,
    contentSnippet: item.contentSnippet,
    isoDate: item.isoDate,
    topicPinned: item.topicPinned,
    topicClosed: item.topicClosed,
    topicArchived: item.topicArchived,
    grantedAt: item.grantedAt,
    grantedBy: item.grantedBy,
  };
}
