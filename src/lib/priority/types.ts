export type NeedDimensionBreakdown = {
  complaintsScore: number;
  reopenScore: number;
  accidentsScore: number;
  floodingScore: number;
  trafficScore: number;
  facilityScore: number;
};

export type DisparityStatus = "critical_deficit" | "moderate_deficit" | "equitable" | "surplus";

export type RoadSpendVsNeed = {
  roadId: string;
  roadName: string;
  ward: string;
  needScore: number;
  needRank: number;
  dimensions: NeedDimensionBreakdown;
  lengthM: number;
  surface: string;
  workOrderCount: number;
  spentInr: number;
  expectedSpendInr: number;
  disparityInr: number;
  status: DisparityStatus;
  underDlp: boolean;
  flagsCount: number;
  openComplaintsCount: number;
};

export type WardSpendVsNeed = {
  wardCode: string;
  wardName: string;
  zone: string;
  needScore: number;
  needRank: number;
  spendRank: number;
  disparityRank: number;
  budgetInr: number;
  spentInr: number;
  needSharePct: number;
  spendSharePct: number;
  budgetSharePct: number;
  disparityIndex: number;
  spendToNeedRatio: number;
  status: DisparityStatus;
  roadsCount: number;
  openComplaints: number;
  floodHotspots: number;
  accidents: number;
  slaRate: number;
  reopenRate: number;
  expectedSpendInr: number;
  unfundedNeedInr: number;
};

export type CityDisparityMetrics = {
  totalNeedScore: number;
  totalBudgetInr: number;
  totalSpentInr: number;
  giniCoefficient: number;
  disparitySpread: number;
  criticalDeficitWardsCount: number;
  moderateDeficitWardsCount: number;
  equitableWardsCount: number;
  surplusWardsCount: number;
  totalUnderfundedQuantumInr: number;
  maxDeficitWard: {
    wardCode: string;
    wardName: string;
    deficitPct: number;
    shortfallInr: number;
  };
  maxSurplusWard: {
    wardCode: string;
    wardName: string;
    surplusPct: number;
    excessInr: number;
  };
};

export type SpendVsNeedReport = {
  wards: WardSpendVsNeed[];
  roads: RoadSpendVsNeed[];
  metrics: CityDisparityMetrics;
};
