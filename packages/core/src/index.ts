export { normalize, tokenize } from "./normalize.js";
export { align, type AlignOp, type AlignEntry } from "./align.js";
export { computeWer, type WerResult } from "./wer.js";
export {
  classifyMismatch,
  DOCUMENTED_CONFUSIONS,
  KNOWN_VOCABULARY_GAPS,
  type EvidenceClass,
  type MismatchClassification,
  type DocumentedConfusion,
  type KnownVocabularyGap,
} from "./evidence-classes.js";
export {
  deriveExecutionProvider,
  hasFallbackWarning,
  type RequestedDevice,
  type ActualProvider,
  type ProviderSignals,
  type ProviderVerdict,
} from "./provider-readback.js";
