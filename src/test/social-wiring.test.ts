import { describe, expect, it } from "vitest";
import { executeAssistantTool } from "@/lib/assistant/tools/executor";
import { buildRoadDossier } from "@/lib/assistant/tools/road-dossier";
import { createComplaintIntelligenceEngine } from "@/lib/matching/engine";
import { getRoadPassport } from "@/lib/passport/aggregate";
import { exportEvidencePackJson } from "@/lib/passport/evidence-pack";
import { listActionQueueItems } from "@/lib/passport/queue";
import { matchSocialPostsForRoad } from "@/lib/passport/social-match";
import { loadDataset } from "@/lib/rupee/load";

describe("Citizen Social Signal Wiring & Corridor Corroboration", () => {
  const ds = loadDataset();

  it("accurately matches 289 social posts across valid road corridors", () => {
    let matchedCount = 0;
    const roadsWithSocial = new Set<string>();

    for (const p of ds.socialPosts) {
      const pLower = p.text.toLowerCase();
      for (const r of ds.roads) {
        if (r.name.length >= 4 && pLower.includes(r.name.toLowerCase())) {
          matchedCount++;
          roadsWithSocial.add(r.id);
          break;
        }
      }
    }

    expect(matchedCount).toBe(289);
    expect(roadsWithSocial.size).toBeGreaterThanOrEqual(50);
  });

  it("getRoadPassport populates socialCorroboration with ranked civic posts", () => {
    // Find a road known to have matched social posts
    const roadWithSocial = ds.roads.find((r) => {
      const matches = matchSocialPostsForRoad(r, ds.socialPosts);
      return matches.length > 0;
    });

    expect(roadWithSocial).toBeDefined();
    const passport = getRoadPassport(roadWithSocial!.id);
    expect(passport).not.toBeNull();
    expect(passport!.socialCorroboration).toBeDefined();
    expect(passport!.socialCorroboration.length).toBeGreaterThan(0);

    // Verify ordering by likes descending
    const posts = passport!.socialCorroboration;
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i - 1].likes).toBeGreaterThanOrEqual(posts[i].likes);
    }

    // Verify post structure
    const sample = posts[0];
    expect(sample.id).toMatch(/^SOC\d+/);
    expect(typeof sample.likes).toBe("number");
    expect(typeof sample.hasMedia).toBe("boolean");
    expect(sample.text.length).toBeGreaterThan(0);
  });

  it("escalates Action Queue items on roads with high viral distress or hazard keywords", () => {
    const queue = listActionQueueItems();
    const escalatedItems = queue.filter(
      (item) => item.headline.includes("[Social Signal Escalation]") || item.reason.includes("Escalated"),
    );

    expect(escalatedItems.length).toBeGreaterThan(0);
    // Escalated items must be critical or high priority
    for (const item of escalatedItems) {
      expect(["critical", "high"]).toContain(item.priority);
    }
  });

  it("includes social posts in downloadable evidence JSON package", () => {
    const roadWithSocial = ds.roads.find((r) => {
      const matches = matchSocialPostsForRoad(r, ds.socialPosts);
      return matches.length > 0;
    });

    const jsonStr = exportEvidencePackJson(roadWithSocial!.id);
    expect(jsonStr).not.toBeNull();

    const parsed = JSON.parse(jsonStr!);
    expect(parsed.socialPosts).toBeDefined();
    expect(Array.isArray(parsed.socialPosts)).toBe(true);
    expect(parsed.socialPosts.length).toBeGreaterThan(0);
  });

  it("buildRoadDossier and get_road_details assistant tool expose social signals", () => {
    const roadWithSocial = ds.roads.find((r) => {
      const matches = matchSocialPostsForRoad(r, ds.socialPosts);
      return matches.length > 0;
    });

    const dossier = buildRoadDossier(roadWithSocial!.id);
    expect(dossier).not.toBeNull();
    expect(dossier!.socialCorroboration.matchedPostsCount).toBeGreaterThan(0);
    expect(dossier!.socialCorroboration.samplePosts.length).toBeGreaterThan(0);

    const engine = createComplaintIntelligenceEngine(ds);
    const toolRes = executeAssistantTool(
      "get_road_details",
      { road_id: roadWithSocial!.id },
      { engine, dataset: ds },
    );

    expect(toolRes.success).toBe(true);
    const data = toolRes.data as Record<string, unknown>;
    expect(data.socialCorroboration).toBeDefined();
  });
});
