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
  startNewProject,
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
  addDraftSection,
  applyWorkingPlainAndSyncSections,
  changeAngleClearDraft,
  createBlankDraft,
  deleteDraftSection,
  getDraftByProject,
  parseWorkingPlainToSections,
  reorderDraftSections,
  replaceDraftGraph,
  setOriginalSnapshotIfEmpty,
  updateDraftSection,
  type ReplaceDraftInput,
} from "./repos/drafts";
export {
  clearPendingForDraft,
  clearPendingFromOffset,
  deleteAllForDraft,
  getSuggestionById,
  insertPendingSuggestions,
  listSuggestionsByDraft,
  markSuggestionStatus,
  replacePendingSuggestions,
  type NewPendingSuggestion,
} from "./repos/suggestions";
