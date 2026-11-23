import type {
  EvidenceEdge,
  PassportComplaint,
  PassportWorkOrder,
  RoadPassportData,
} from "./types";

/**
 * Builds the bipartite graph edges connecting roads, work orders, complaints, and emergency facilities.
 */
export function buildEvidenceEdges(
  road: RoadPassportData["road"],
  workOrders: PassportWorkOrder[],
  complaints: PassportComplaint[],
  facilities: RoadPassportData["facilities"],
): EvidenceEdge[] {
  const edges: EvidenceEdge[] = [];

  for (const wo of workOrders) {
    edges.push({
      id: `edge_road_wo_${wo.id}`,
      sourceType: "road",
      sourceId: road.id,
      targetType: "work_order",
      targetId: wo.id,
      relationship: "explicit_source_link",
      confidence: 1.0,
      explanation: `Work order explicitly assigned to road ${road.id} in municipal records.`,
    });

    for (const cid of wo.complaintIds) {
      edges.push({
        id: `edge_wo_cmp_${wo.id}_${cid}`,
        sourceType: "work_order",
        sourceId: wo.id,
        targetType: "complaint",
        targetId: cid,
        relationship: "explicit_source_link",
        confidence: 1.0,
        explanation: `Work order explicitly created in response to complaint ${cid}.`,
      });
    }
  }

  for (const fac of facilities) {
    if (fac.ambulanceEntryRoad === road.id) {
      edges.push({
        id: `edge_road_fac_${fac.id}`,
        sourceType: "road",
        sourceId: road.id,
        targetType: "facility",
        targetId: fac.id,
        relationship: "explicit_source_link",
        confidence: 1.0,
        explanation: `Designated critical emergency ambulance route for ${fac.name}.`,
      });
    }
  }

  return edges;
}
