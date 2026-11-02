export type BriefFact = {
  text: string;
  sourceIds: string[];
};

export type BriefAnalysisItem = {
  text: string;
  kind: "analysis" | "speculation";
  sourceIds: string[];
};

export type BriefConnection = {
  text: string;
  sourceIds: string[];
};

export type BriefAngleDto = {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
};

export type BriefDto = {
  id: string;
  projectId: string;
  whatHappened: string;
  whyItMatters: string;
  facts: BriefFact[];
  analysis: BriefAnalysisItem[];
  connections: BriefConnection[];
  angles: BriefAngleDto[];
  updatedAt: string;
};
