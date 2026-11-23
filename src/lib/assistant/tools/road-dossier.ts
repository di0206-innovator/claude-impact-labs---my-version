import { getRoadPassport } from "@/lib/passport/aggregate";
import { hasHighSocialDistress } from "@/lib/passport/social-match";
import type { SocialPostSummary } from "@/lib/passport/types";

export type RoadDossierOutput = {
  roadId: string;
  roadName: string;
  ward: string;
  surface: string;
  underDlp: boolean;
  lastResurfaced: string;
  lengthM: number;
  financials: {
    totalBilledInr: number;
    expectedCostInr: number;
    varianceInr: number;
    totalOrders: number;
    reopenRate: number;
    auditFlagCount: number;
  };
  socialCorroboration: {
    matchedPostsCount: number;
    highDistressCount: number;
    hasSevereDistress: boolean;
    samplePosts: Array<{
      id: string;
      postedAt: string;
      source: string;
      likes: number;
      hasMedia: boolean;
      text: string;
    }>;
  };
  recommendedActionsCount: number;
};

/**
 * Builds an audit-ready road dossier incorporating official municipal records
 * alongside crowdsourced citizen social corroboration and WhatsApp ALM reports.
 */
export function buildRoadDossier(roadId: string): RoadDossierOutput | null {
  const passport = getRoadPassport(roadId);
  if (!passport) return null;

  const social = passport.socialCorroboration ?? [];
  const severe = hasHighSocialDistress(social);
  const samplePosts = social.slice(0, 5).map((p: SocialPostSummary) => ({
    id: p.id,
    postedAt: p.postedAt,
    source: p.source,
    likes: p.likes,
    hasMedia: p.hasMedia,
    text: p.text,
  }));

  const highDistressCount = social.filter(
    (p) => p.likes > 200 || /accident|gaddha|gadha|khadda|dhas|collapse|waterlog|paani/i.test(p.text),
  ).length;

  return {
    roadId: passport.road.id,
    roadName: passport.road.name,
    ward: passport.road.ward,
    surface: passport.road.surface,
    underDlp: passport.road.underDlp,
    lastResurfaced: passport.road.lastResurfaced,
    lengthM: passport.road.lengthM,
    financials: {
      totalBilledInr: passport.summary.totalBilledInr,
      expectedCostInr: passport.summary.expectedCostInr,
      varianceInr: passport.summary.varianceInr,
      totalOrders: passport.summary.totalOrders,
      reopenRate: passport.summary.reopenRate,
      auditFlagCount: passport.summary.auditFlagCount,
    },
    socialCorroboration: {
      matchedPostsCount: social.length,
      highDistressCount,
      hasSevereDistress: severe,
      samplePosts,
    },
    recommendedActionsCount: passport.recommendedActions.length,
  };
}
