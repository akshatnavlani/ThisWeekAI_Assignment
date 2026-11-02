export type SourceDto = {
  id: string;
  projectId: string;
  kind: string;
  url: string | null;
  title: string | null;
  content: string;
  modality: string;
  status: string;
  errorMessage: string | null;
  rawMetaJson: string | null;
  createdAt: string;
  updatedAt: string;
};
