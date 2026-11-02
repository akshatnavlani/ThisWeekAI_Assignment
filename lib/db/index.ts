export {
  getDb,
  openDb,
  resetDbSingleton,
  resolveDatabasePath,
  type AppDb,
} from "./client";
export { newId, nowIso } from "./ids";
export * from "./schema";
export {
  getOrCreateCurrent,
  loadCurrentProjectPayload,
  loadSuggestionsSummary,
  updateCurrent,
  type CurrentProjectPayload,
  type ProjectDto,
  type ProjectUpdate,
  type SuggestionsSummary,
} from "./repos/projects";
export {
  countUsableSources,
  deleteSource,
  findDuplicateUrl,
  getSourceById,
  insertSource,
  isSourceCited,
  listSourcesByProject,
  updateSourceFields,
  updateSourceFromIngest,
  type SourceDto,
} from "./repos/sources";
export {
  getBriefByProject,
  replaceBriefGraph,
  updateBriefLight,
  type BriefLightUpdate,
} from "./repos/research";
export {
  getDraftByProject,
  replaceDraftGraph,
  updateDraftSection,
  type ReplaceDraftInput,
} from "./repos/drafts";
