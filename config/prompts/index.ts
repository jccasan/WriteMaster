export { editorialAssessment } from "./editorialAssessment";
export { developmentalEditor } from "./developmentalEditor";
export { copyEditor } from "./copyEditor";
export { proofreader } from "./proofreader";
export { factChecker } from "./factChecker";
export { betaReaderGenreEnthusiast } from "./betaReaderGenreEnthusiast";
export { betaReaderCasualCommercial } from "./betaReaderCasualCommercial";
export { betaReaderEmotionFirst } from "./betaReaderEmotionFirst";
export { betaReaderPacingSensitive } from "./betaReaderPacingSensitive";
export { betaReaderCriticalCraft } from "./betaReaderCriticalCraft";
export { structureAnalyzer } from "./structureAnalyzer";
export { characterTracker } from "./characterTracker";
export { scenePurposeScanner } from "./scenePurposeScanner";
export { outlineExtractor } from "./outlineExtractor";
export { synthesisEngine } from "./synthesisEngine";

import { editorialAssessment } from "./editorialAssessment";
import { developmentalEditor } from "./developmentalEditor";
import { copyEditor } from "./copyEditor";
import { proofreader } from "./proofreader";
import { factChecker } from "./factChecker";
import { betaReaderGenreEnthusiast } from "./betaReaderGenreEnthusiast";
import { betaReaderCasualCommercial } from "./betaReaderCasualCommercial";
import { betaReaderEmotionFirst } from "./betaReaderEmotionFirst";
import { betaReaderPacingSensitive } from "./betaReaderPacingSensitive";
import { betaReaderCriticalCraft } from "./betaReaderCriticalCraft";
import { structureAnalyzer } from "./structureAnalyzer";
import { characterTracker } from "./characterTracker";
import { scenePurposeScanner } from "./scenePurposeScanner";
import { outlineExtractor } from "./outlineExtractor";
import { synthesisEngine } from "./synthesisEngine";

export const allPrompts = [
  editorialAssessment,
  developmentalEditor,
  copyEditor,
  proofreader,
  factChecker,
  betaReaderGenreEnthusiast,
  betaReaderCasualCommercial,
  betaReaderEmotionFirst,
  betaReaderPacingSensitive,
  betaReaderCriticalCraft,
  structureAnalyzer,
  characterTracker,
  scenePurposeScanner,
  outlineExtractor,
  synthesisEngine,
];

export const promptsById = Object.fromEntries(
  allPrompts.map((p) => [p.id, p])
);
