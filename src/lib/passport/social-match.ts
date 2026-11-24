import type { SocialPost } from "../rupee/load";
import type { SocialPostSummary } from "./types";

const DISTRESS_KEYWORDS = /accident|gaddha|gadha|khadda|dhas|collapse|sinkhole|waterlog|paani\s+bhar/i;

/**
 * Matches civic social media posts and WhatsApp ALM reports against a road corridor.
 * Corroborates public distress signals against official municipal road records.
 */
export function matchSocialPostsForRoad(
  road: { name: string },
  posts: SocialPost[],
): SocialPostSummary[] {
  if (!road.name || road.name.length < 4) return [];

  const targetName = road.name.toLowerCase().trim();
  const matched: SocialPostSummary[] = [];

  for (const p of posts) {
    const textLower = p.text.toLowerCase();
    if (textLower.includes(targetName)) {
      matched.push({
        id: p.id,
        postedAt: p.postedAt,
        source: p.source,
        text: p.text,
        hasMedia: p.hasMedia,
        likes: p.likes,
      });
    }
  }

  // Sort by virality / impact (likes descending, then newest first)
  return matched.sort((a, b) => b.likes - a.likes || b.postedAt.localeCompare(a.postedAt));
}

/**
 * Detects severe public distress on a road corridor:
 * Virality > 200 likes/forwards OR distress indicators (accident, gaddha, waterlogging, collapse).
 */
export function hasHighSocialDistress(posts: SocialPostSummary[]): boolean {
  return posts.some((p) => p.likes > 200 || DISTRESS_KEYWORDS.test(p.text));
}
