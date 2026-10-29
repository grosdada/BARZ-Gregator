import {
  createGenerationPreview,
  findModelForImportTarget,
  inputContract,
  modelFamily,
  modelLabel,
  modelModeLabel,
  nearestSupportedAspectRatio
} from "./generation-plan.js";
import { isDisplayMedia } from "./media-result.js";
import { generationTimeLabel, jobForMonitor, progressForJob } from "./job-progress.js";
import { needsGenerationConfirmation } from "./spending-confirmation.js";
import {
  calendarMonth,
  completedSpendJobs,
  groupSpendingJobs,
  jobsForSpendingPeriod,
  localDayKey,
  spendingDate,
  spendingTotals
} from "./spending.js";
import { openH3MaxDirector } from "./director-runtime.js";
import { normalizeDirectorCues } from "./director-cues.js";
import {
  compileDirectorScript,
  normalizeDirectorStoryboard,
  validateDirectorStoryboard
} from "./director-script.js";

const generationPreferencesKey = "barz.generation-preferences.v1";
function readGenerationPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(generationPreferencesKey) || "null");
    return saved?.version === 1 ? saved : {};
  } catch { return {}; }
}
const initialGenerationPreferences = readGenerationPreferences();
const modelSettingsByEndpoint = new Map(Object.entries(initialGenerationPreferences.models || {}));
const modelOptionValues = new Map(modelSettingsByEndpoint);
const selectedModelsByMedia = new Map(Object.entries(initialGenerationPreferences.selected || {}));
let renderedModelEndpoint = null;
let loadedUrlDraftId = null;
let lastImageReferenceSignature = "";
let imageRatioAutoActive = false;
const imageDimensionsByUrl = new Map();
const resolvedImageDimensions = new Map();

function measureImageReference(url) {
  if (!url) return Promise.resolve(null);
  if (imageDimensionsByUrl.has(url)) return imageDimensionsByUrl.get(url);
  const pending = new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => resolve(null), 5000);
    image.onload = () => {
      clearTimeout(timer);
      const dimensions = image.naturalWidth && image.naturalHeight
        ? { width: image.naturalWidth, height: image.naturalHeight } : null;
      if (dimensions) resolvedImageDimensions.set(url, dimensions);
      resolve(dimensions);
    };
    image.onerror = () => { clearTimeout(timer); resolve(null); };
    image.src = url;
  });
  imageDimensionsByUrl.set(url, pending);
  return pending;
}

function nearestSourceAspectRatio(model) {
  const reference = currentReferences().find((item) => item.kind === "image" && !item.missing);
  const dimensions = reference && resolvedImageDimensions.get(reference.url);
  const allowed = model?.controls?.aspectRatios?.length
    ? model.controls.aspectRatios : ["16:9", "9:16", "1:1", "4:3", "3:2"];
  return nearestSupportedAspectRatio(dimensions?.width, dimensions?.height, allowed);
}

// Persist explicit interactions, not background refreshes. No reference media or prompts.
function rememberGenerationSettings() {
  const model = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
  if (!model || model.mediaType !== state.mediaType) return;
  const settings = formSettings();
  modelSettingsByEndpoint.set(model.endpointId, settings);
  modelOptionValues.set(model.endpointId, readModelOptions());
  selectedModelsByMedia.set(state.mediaType, model.endpointId);
  try {
    const saved = readGenerationPreferences();
    localStorage.setItem(generationPreferencesKey, JSON.stringify({
      version: 1,
      selected: { ...saved.selected, [state.mediaType]: model.endpointId },
      models: { ...saved.models, [model.endpointId]: settings }
    }));
  } catch { /* Unavailable storage must not block generation. */ }
}

function applyGenerationSettings(settings = {}) {
  if (settings.aspectRatio) imageRatioAutoActive = settings.aspectRatio === "auto";
  selectOptionIfPresent(elements.aspectRatioInput, settings.aspectRatio);
  renderModelControls();
  selectOptionIfPresent(elements.resolutionInput, settings.resolution || settings.imageSize);
  if (settings.durationSeconds !== undefined) {
    elements.durationInput.value = String(Math.min(Number(elements.durationInput.max),
      Math.max(Number(elements.durationInput.min), Number(settings.durationSeconds))));
    elements.durationOutput.value = `${elements.durationInput.value} s`;
  }
  restoreModelOptions(Object.fromEntries(Object.entries(settings)
    .filter(([, value]) => value !== "" && value !== null && value !== undefined)));
  updateGenerateButton();
}

const mediaCopy = {
  video: {
    context: "Génération vidéo",
    placeholder: "Décris le plan, le mouvement, la lumière et ce qui doit évoluer…"
  },
  image: {
    context: "Génération d’image",
    placeholder: "Décris le sujet, le cadre, la lumière, la matière et le style…"
  },
  music: {
    context: "Génération musicale",
    placeholder: "Décris la composition, le tempo, les instruments, la structure et l’atmosphère…"
  }
};

const exampleImport = {
  schemaVersion: "1.0",
  source: {
    app: "prompt-atlas",
    version: "5.2.3",
    module: "Video Multi Framing"
  },
  mediaType: "video",
  prompt: "A controlled cinematic move through a rain-soaked workshop.",
  negativePrompt: "flicker, unstable anatomy, background drift",
  target: { modelFamily: "Kling", modelHint: "latest verified video model" },
  settings: { aspectRatio: "16:9", durationSeconds: 8 },
  references: []
};

const elements = {
  draftForm: document.querySelector("#draftForm"),
  draftList: document.querySelector("#draftList"),
  draftCount: document.querySelector("#draftCount"),
  imageImportQueueCount: document.querySelector("#imageImportQueueCount"),
  imageImportQueue: document.querySelector("#imageImportQueue"),
  imageImportQueueList: document.querySelector("#imageImportQueueList"),
  addToImageQueueButton: document.querySelector("#addToImageQueueButton"),
  imageBatchBanner: document.querySelector("#imageBatchBanner"),
  imageBatchItems: document.querySelector("#imageBatchItems"),
  imageBatchItemsList: document.querySelector("#imageBatchItemsList"),
  imageBatchTitle: document.querySelector("#imageBatchTitle"),
  imageBatchProgress: document.querySelector("#imageBatchProgress"),
  imageBatchDescription: document.querySelector("#imageBatchDescription"),
  imageBatchUnitCost: document.querySelector("#imageBatchUnitCost"),
  imageBatchTotalCost: document.querySelector("#imageBatchTotalCost"),
  imageBatchLaunchButton: document.querySelector("#imageBatchLaunchButton"),
  jobCount: document.querySelector("#jobCount"),
  jobList: document.querySelector("#jobList"),
  activityFilters: document.querySelector("#activityFilters"),
  historyDates: document.querySelector("#historyDates"),
  historyFrom: document.querySelector("#historyFrom"),
  historyTo: document.querySelector("#historyTo"),
  draftOrigin: document.querySelector("#draftOrigin"),
  mediaContext: document.querySelector("#mediaContext"),
  promptInput: document.querySelector("#promptInput"),
  promptHighlights: document.querySelector("#promptHighlights"),
  negativePromptInput: document.querySelector("#negativePromptInput"),
  aspectRatioInput: document.querySelector("#aspectRatioInput"),
  resolutionInput: document.querySelector("#resolutionInput"),
  modelOptions: document.querySelector("#modelOptions"),
  kreaLoraMixer: document.querySelector("#kreaLoraMixer"),
  kreaLoraCount: document.querySelector("#kreaLoraCount"),
  kreaLoraMessage: document.querySelector("#kreaLoraMessage"),
  kreaLoraSelected: document.querySelector("#kreaLoraSelected"),
  kreaLoraSearch: document.querySelector("#kreaLoraSearch"),
  kreaLoraLibrary: document.querySelector("#kreaLoraLibrary"),
  importKreaLorasButton: document.querySelector("#importKreaLorasButton"),
  kreaLoraSourceFilter: document.querySelector("#kreaLoraSourceFilter"),
  kreaLoraCompatibilityFilter: document.querySelector("#kreaLoraCompatibilityFilter"),
  kreaLoraFavoritesFilter: document.querySelector("#kreaLoraFavoritesFilter"),
  kreaLoraPresetName: document.querySelector("#kreaLoraPresetName"),
  kreaLoraPresetSelect: document.querySelector("#kreaLoraPresetSelect"),
  saveKreaLoraPresetButton: document.querySelector("#saveKreaLoraPresetButton"),
  loadKreaLoraPresetButton: document.querySelector("#loadKreaLoraPresetButton"),
  deleteKreaLoraPresetButton: document.querySelector("#deleteKreaLoraPresetButton"),
  modelReferenceHint: document.querySelector("#modelReferenceHint"),
  modelValidation: document.querySelector("#modelValidation"),
  modelValidationText: document.querySelector("#modelValidationText"),
  fixHeygen2kButton: document.querySelector("#fixHeygen2kButton"),
  modelFamilyInput: document.querySelector("#modelFamilyInput"),
  modelInput: document.querySelector("#modelInput"),
  generateButton: document.querySelector("#generateButton"),
  generateCost: document.querySelector("#generateCost"),
  generateHelpButton: document.querySelector("#generateHelpButton"),
  generationBlockersDialog: document.querySelector("#generationBlockersDialog"),
  generationBlockerList: document.querySelector("#generationBlockerList"),
  generationBlockerFixButton: document.querySelector("#generationBlockerFixButton"),
  durationField: document.querySelector("#durationField"),
  durationInput: document.querySelector("#durationInput"),
  durationOutput: document.querySelector("#durationOutput"),
  videoModeSwitch: document.querySelector("#videoModeSwitch"),
  referenceCount: document.querySelector("#referenceCount"),
  referenceEmpty: document.querySelector("#referenceEmpty"),
  referenceList: document.querySelector("#referenceList"),
  referenceSlot: document.querySelector("#referenceSlot"),
  referenceAddButton: document.querySelector("#referenceAddButton"),
  referenceAddMenu: document.querySelector("#referenceAddMenu"),
  referenceUploadInput: document.querySelector("#referenceUploadInput"),
  referenceContextMenu: document.querySelector("#referenceContextMenu"),
  referenceLibraryButton: document.querySelector("#referenceLibraryButton"),
  revealReferenceButton: document.querySelector("#revealReferenceButton"),
  referenceReplaceUploadInput: document.querySelector("#referenceReplaceUploadInput"),
  referenceSetsButton: document.querySelector("#referenceSetsButton"),
  referenceSetDialog: document.querySelector("#referenceSetDialog"),
  referenceSetNameInput: document.querySelector("#referenceSetNameInput"),
  saveReferenceSetButton: document.querySelector("#saveReferenceSetButton"),
  referenceSetMessage: document.querySelector("#referenceSetMessage"),
  referenceSetList: document.querySelector("#referenceSetList"),
  deleteResourcesDialog: document.querySelector("#deleteResourcesDialog"),
  deleteResourcesTitle: document.querySelector("#deleteResourcesTitle"),
  deleteResourcesCopy: document.querySelector("#deleteResourcesCopy"),
  deleteResourcesList: document.querySelector("#deleteResourcesList"),
  deleteResourcesMessage: document.querySelector("#deleteResourcesMessage"),
  confirmDeleteResourcesButton: document.querySelector("#confirmDeleteResourcesButton"),
  formMessage: document.querySelector("#formMessage"),
  activeJobMonitor: document.querySelector("#activeJobMonitor"),
  activeJobStatus: document.querySelector("#activeJobStatus"),
  activeJobTitle: document.querySelector("#activeJobTitle"),
  activeJobButton: document.querySelector("#activeJobButton"),
  activeJobTrack: document.querySelector("#activeJobTrack"),
  activeJobBar: document.querySelector("#activeJobBar"),
  activeJobPercent: document.querySelector("#activeJobPercent"),
  importDialog: document.querySelector("#importDialog"),
  importPayload: document.querySelector("#importPayload"),
  importMessage: document.querySelector("#importMessage"),
  settingsDialog: document.querySelector("#settingsDialog"),
  falApiKey: document.querySelector("#falApiKey"),
  falAdminApiKey: document.querySelector("#falAdminApiKey"),
  falAccount: document.querySelector("#falAccount"),
  falStatus: document.querySelector("#falStatus"),
  falMessage: document.querySelector("#falMessage"),
  falAdminMessage: document.querySelector("#falAdminMessage"),
  heygenApiKey: document.querySelector("#heygenApiKey"),
  heygenAccount: document.querySelector("#heygenAccount"),
  heygenStatus: document.querySelector("#heygenStatus"),
  heygenMessage: document.querySelector("#heygenMessage"),
  falEndpointId: document.querySelector("#falEndpointId"),
  modelMessage: document.querySelector("#modelMessage"),
  verifiedModels: document.querySelector("#verifiedModels"),
  confirmationDialog: document.querySelector("#confirmationDialog"),
  confirmationSummary: document.querySelector("#confirmationSummary"),
  confirmationPayload: document.querySelector("#confirmationPayload"),
  confirmationMessage: document.querySelector("#confirmationMessage"),
  submitJobButton: document.querySelector("#submitJobButton"),
  imagePreviewDialog: document.querySelector("#imagePreviewDialog"),
  imagePreviewShell: document.querySelector("#imagePreviewShell"),
  imagePreview: document.querySelector("#imagePreview"),
  jobDetailDialog: document.querySelector("#jobDetailDialog"),
  jobDetailTitle: document.querySelector("#jobDetailTitle"),
  jobDetailMedia: document.querySelector("#jobDetailMedia"),
  jobDetailMeta: document.querySelector("#jobDetailMeta"),
  jobDetailPrompt: document.querySelector("#jobDetailPrompt"),
  jobDetailMessage: document.querySelector("#jobDetailMessage"),
  copyJobPromptButton: document.querySelector("#copyJobPromptButton"),
  openJobResultLink: document.querySelector("#openJobResultLink"),
  downloadJobResultLink: document.querySelector("#downloadJobResultLink"),
  recreateJobButton: document.querySelector("#recreateJobButton"),
  composer: document.querySelector("#composer"),
  activityPanel: document.querySelector("#activityPanel"),
  assetsButton: document.querySelector("#assetsButton"),
  spendingButton: document.querySelector("#spendingButton"),
  spendingView: document.querySelector("#spendingView"),
  apiButton: document.querySelector("#apiButton"),
  apiView: document.querySelector("#apiView"),
  loraLabButton: document.querySelector("#loraLabButton"),
  loraLabView: document.querySelector("#loraLabView"),
  kreaLabLibrary: document.querySelector("#kreaLabLibrary"),
  kreaLabLibraryCount: document.querySelector("#kreaLabLibraryCount"),
  kreaLabLibraryMessage: document.querySelector("#kreaLabLibraryMessage"),
  kreaLabLibrarySearch: document.querySelector("#kreaLabLibrarySearch"),
  kreaLabLibraryGrid: document.querySelector("#kreaLabLibraryGrid"),
  importKreaLorasLabButton: document.querySelector("#importKreaLorasLabButton"),
  openKreaGeneratorButton: document.querySelector("#openKreaGeneratorButton"),
  loraLabForm: document.querySelector("#loraLabForm"),
  loraName: document.querySelector("#loraName"),
  loraTrainer: document.querySelector("#loraTrainer"),
  loraTrigger: document.querySelector("#loraTrigger"),
  loraMode: document.querySelector("#loraMode"),
  loraSteps: document.querySelector("#loraSteps"),
  loraLearningRate: document.querySelector("#loraLearningRate"),
  loraCaption: document.querySelector("#loraCaption"),
  loraDatasetDrop: document.querySelector("#loraDatasetDrop"),
  loraDatasetInput: document.querySelector("#loraDatasetInput"),
  loraDatasetButton: document.querySelector("#loraDatasetButton"),
  loraDatasetCount: document.querySelector("#loraDatasetCount"),
  loraDatasetGrid: document.querySelector("#loraDatasetGrid"),
  loraEstimatedCost: document.querySelector("#loraEstimatedCost"),
  loraPricingNote: document.querySelector("#loraPricingNote"),
  loraQuoteButton: document.querySelector("#loraQuoteButton"),
  loraConfirm: document.querySelector("#loraConfirm"),
  loraMessage: document.querySelector("#loraMessage"),
  loraTrainButton: document.querySelector("#loraTrainButton"),
  loraJobList: document.querySelector("#loraJobList"),
  loraImportBaseModel: document.querySelector("#loraImportBaseModel"),
  localLoraInput: document.querySelector("#localLoraInput"),
  importLocalLoraButton: document.querySelector("#importLocalLoraButton"),
  refreshLoraJobsButton: document.querySelector("#refreshLoraJobsButton"),
  apiProviderGrid: document.querySelector("#apiProviderGrid"),
  apiMessage: document.querySelector("#apiMessage"),
  spendingCalendar: document.querySelector("#spendingCalendar"),
  spendingPeriodLabel: document.querySelector("#spendingPeriodLabel"),
  spendingScopeLabel: document.querySelector("#spendingScopeLabel"),
  spendingTotal: document.querySelector("#spendingTotal"),
  spendingCount: document.querySelector("#spendingCount"),
  spendingList: document.querySelector("#spendingList"),
  providerCreditList: document.querySelector("#providerCreditList"),
  providerCreditsMessage: document.querySelector("#providerCreditsMessage"),
  refreshProviderCreditsButton: document.querySelector("#refreshProviderCreditsButton"),
  spendingPrevious: document.querySelector("#spendingPrevious"),
  spendingNext: document.querySelector("#spendingNext"),
  directorButton: document.querySelector("#directorButton"),
  directorView: document.querySelector("#directorView"),
  directorForm: document.querySelector("#directorForm"),
  directorPrompt: document.querySelector("#directorPrompt"),
  directorAspectRatio: document.querySelector("#directorAspectRatio"),
  directorResolution: document.querySelector("#directorResolution"),
  directorChunkDuration: document.querySelector("#directorChunkDuration"),
  directorMemory: document.querySelector("#directorMemory"),
  directorSeed: document.querySelector("#directorSeed"),
  directorLimit: document.querySelector("#directorLimit"),
  directorVideo: document.querySelector("#directorVideo"),
  directorScreenEmpty: document.querySelector("#directorScreenEmpty"),
  directorState: document.querySelector("#directorState"),
  directorElapsed: document.querySelector("#directorElapsed"),
  directorRunningCost: document.querySelector("#directorRunningCost"),
  directorMaximumCost: document.querySelector("#directorMaximumCost"),
  directorPriceNote: document.querySelector("#directorPriceNote"),
  directorReferenceDrop: document.querySelector("#directorReferenceDrop"),
  directorReferenceList: document.querySelector("#directorReferenceList"),
  directorUploadReferenceButton: document.querySelector("#directorUploadReferenceButton"),
  directorAssetReferenceButton: document.querySelector("#directorAssetReferenceButton"),
  directorReferenceUploadInput: document.querySelector("#directorReferenceUploadInput"),
  directorMessage: document.querySelector("#directorMessage"),
  directorLog: document.querySelector("#directorLog"),
  directorStartButton: document.querySelector("#directorStartButton"),
  directorStopButton: document.querySelector("#directorStopButton"),
  directorLiveControls: document.querySelector("#directorLiveControls"),
  directorLivePrompt: document.querySelector("#directorLivePrompt"),
  directorSendPromptButton: document.querySelector("#directorSendPromptButton"),
  directorCueAuto: document.querySelector("#directorCueAuto"),
  directorCueList: document.querySelector("#directorCueList"),
  directorAddCueButton: document.querySelector("#directorAddCueButton"),
  directorClearCuesButton: document.querySelector("#directorClearCuesButton"),
  directorCueStatus: document.querySelector("#directorCueStatus"),
  directorStoryboardEnabled: document.querySelector("#directorStoryboardEnabled"),
  directorStoryboardUploadButton: document.querySelector("#directorStoryboardUploadButton"),
  directorStoryboardAssetButton: document.querySelector("#directorStoryboardAssetButton"),
  directorStoryboardClearButton: document.querySelector("#directorStoryboardClearButton"),
  directorStoryboardUploadInput: document.querySelector("#directorStoryboardUploadInput"),
  directorStoryboardStatus: document.querySelector("#directorStoryboardStatus"),
  directorStoryboardList: document.querySelector("#directorStoryboardList"),
  directorConfirmationDialog: document.querySelector("#directorConfirmationDialog"),
  directorConfirmationSummary: document.querySelector("#directorConfirmationSummary"),
  directorConfirmationMessage: document.querySelector("#directorConfirmationMessage"),
  directorConfirmStartButton: document.querySelector("#directorConfirmStartButton"),
  assetLibrary: document.querySelector("#assetLibrary"),
  assetGallery: document.querySelector("#assetGallery"),
  addCollectionButton: document.querySelector("#addCollectionButton"),
  collectionList: document.querySelector("#collectionList"),
  collectionContextMenu: document.querySelector("#collectionContextMenu"),
  resourceContextMenu: document.querySelector("#resourceContextMenu"),
  deleteResourceContextButton: document.querySelector("#deleteResourceContextButton"),
  deleteCollectionDialog: document.querySelector("#deleteCollectionDialog"),
  deleteCollectionName: document.querySelector("#deleteCollectionName"),
  deleteCollectionMessage: document.querySelector("#deleteCollectionMessage"),
  confirmDeleteCollectionButton: document.querySelector("#confirmDeleteCollectionButton"),
  uploadResourcesButton: document.querySelector("#uploadResourcesButton"),
  resourceUploadInput: document.querySelector("#resourceUploadInput"),
  resourceImportMessage: document.querySelector("#resourceImportMessage"),
  selectionTray: document.querySelector("#selectionTray"),
  selectionCount: document.querySelector("#selectionCount"),
  selectionMessage: document.querySelector("#selectionMessage"),
  archiveFormat: document.querySelector("#archiveFormat"),
  moveCollectionInput: document.querySelector("#moveCollectionInput"),
  downloadSelectionButton: document.querySelector("#downloadSelectionButton"),
  moveSelectionButton: document.querySelector("#moveSelectionButton"),
  sendSelectionToReferencesButton: document.querySelector("#sendSelectionToReferencesButton"),
  deleteSelectedResourcesButton: document.querySelector("#deleteSelectedResourcesButton"),
  trashSelectionButton: document.querySelector("#trashSelectionButton"),
  restoreSelectionButton: document.querySelector("#restoreSelectionButton"),
  renameAssetsInput: document.querySelector("#renameAssetsInput"),
  renameAssetsButton: document.querySelector("#renameAssetsButton"),
  collectionDialog: document.querySelector("#collectionDialog"),
  collectionDialogContext: document.querySelector("#collectionDialogContext"),
  collectionDialogTitle: document.querySelector("#collectionDialogTitle"),
  collectionNameInput: document.querySelector("#collectionNameInput"),
  collectionDialogMessage: document.querySelector("#collectionDialogMessage"),
  saveCollectionButton: document.querySelector("#saveCollectionButton")
};

const loraFavoritesStorageKey = "barz-lora-favorites-v1";
const loraPresetsStorageKey = "barz-lora-mix-presets-v1";
const referenceLibraryOrigin = "https://barz-ai-lib.placenta.tv";
const referenceLibraryUrl = `${referenceLibraryOrigin}/AI-Asset-Lib-online/`;
let referenceLibraryPopup = null;
let referenceLibraryHandshakeTimer = null;
const importingLibraryRequests = new Set();

function storedJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

const state = {
  mediaType: "image",
  videoMode: "generation",
  pendingReferenceKind: null,
  composerTextByMedia: {
    video: { prompt: "", negativePrompt: "" },
    motionTransfer: { prompt: "", negativePrompt: "" },
    image: { prompt: "", negativePrompt: "" },
    music: { prompt: "", negativePrompt: "" }
  },
  referencesByMedia: { video: [], motionTransfer: [], image: [], music: [] },
  drafts: [],
  catalog: [],
  providers: [],
  jobs: [],
  collections: [],
  resources: [],
  referenceSets: [],
  kreaStyles: [],
  loraTrainingJobs: [],
  loraTrainers: [],
  loraDatasetIds: [],
  loraQuote: null,
  selectedKreaLoras: [],
  loraFavorites: new Set(storedJson(loraFavoritesStorageKey, [])),
  loraMixPresets: storedJson(loraPresetsStorageKey, []),
  selectedAssets: new Set(),
  trashedAssetKeys: new Set(),
  selectionFormatTouched: false,
  assetFilter: "all",
  assetCategory: "generated",
  collectionFilter: "all",
  moveCollectionId: "",
  collectionDialogMode: "create",
  editingCollectionId: null,
  contextCollectionId: null,
  contextResourceId: null,
  contextReferenceId: null,
  referenceReplacementTarget: null,
  deletingCollectionId: null,
  deletingResourceIds: [],
  referencePickerActive: false,
  referencePickerReturnView: null,
  view: "create",
  spendingMode: "month",
  spendingAnchor: new Date(),
  spendingSelectedDay: localDayKey(new Date()),
  falCreditStatus: null,
  heygenCreditStatus: null,
  apiProviders: [],
  refreshingProviderCredits: false,
  directorInfo: null,
  directorInfoLoading: false,
  preparedRequest: null,
  preparedPreview: null,
  activeJobId: null,
  monitoredJobId: null,
  generationBlockers: [],
  activeDetailJobId: null,
  previewQueueContext: null,
  refreshingJobs: new Set(),
  activeDraftId: null
};

let directorSession = null;
let imageBatchPrepared = null;
let imageBatchSending = false;
let directorCombinedStream = null;
let directorRecorder = null;
let directorRecordedChunks = [];
let directorStartedAt = 0;
let directorPromptVersion = 0;
let directorClockTimer = null;
let directorAutoStopTimer = null;
let directorRecorderTimer = null;
let directorStopFallback = null;
let directorStopping = false;
let directorFinalizing = false;
let directorCueQueue = [];
let directorCueIndex = 0;
let directorCueWaitingVersion = null;
let directorCueDispatchTimer = null;
let directorStoryboard = [];
let directorStoryboardPlan = [];
let directorConfigured = false;
let directorPreparationTimer = null;

const directorCueStorageKey = "barz-director-cues-v1";

const referenceDrag = {
  timer: null,
  pointerId: null,
  chip: null,
  image: null,
  startX: 0,
  startY: 0,
  startOffsetLeft: 0,
  startOffsetTop: 0,
  lastX: 0,
  lastY: 0,
  active: false,
  suppressClick: false
};

const referenceShiftAnimations = new WeakMap();

function priceLabel(pricing) {
  if (!pricing) return "Tarif indisponible";
  return `${Number(pricing.unitPrice).toLocaleString("fr-FR", {
    style: "currency",
    currency: pricing.currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  })} / ${pricing.unit}`;
}

function modelModeRank(model) {
  const label = modelModeLabel(model);
  if (label.startsWith("Texte")) return 0;
  if (label.startsWith("Image") || label.startsWith("Première")) return 1;
  if (label.startsWith("Édition")) return 2;
  return 3;
}

function renderCatalog() {
  const selectedEndpoint = elements.modelInput.value;
  const selectedFamilyId = elements.modelFamilyInput.value;
  const models = state.catalog.filter((model) => (
    model.mediaType === state.mediaType &&
    (state.videoMode !== "motion-transfer" || modelSupportsMotionTransfer(model))
  ))
    .sort((a, b) => modelLabel(a).localeCompare(modelLabel(b)));
  const families = [...new Map(models.map((model) => {
    const family = modelFamily(model);
    return [family.id, family];
  })).values()].sort((a, b) => a.label.localeCompare(b.label));
  const rememberedEndpoint = selectedModelsByMedia.get(state.mediaType);
  const defaultEndpoint = state.mediaType === "video"
    ? "blackforestlabs/flux-3/text-to-video/draft"
    : "fal-ai/flux-2/turbo";
  const preferredModel = models.find((model) => model.endpointId === selectedEndpoint)
    || models.find((model) => model.endpointId === rememberedEndpoint)
    || models.find((model) => model.endpointId === defaultEndpoint)
    || models[0];
  const preferredFamilyId = preferredModel ? modelFamily(preferredModel).id : "";
  const familyId = families.some((family) => family.id === selectedFamilyId)
    ? selectedFamilyId
    : preferredFamilyId;

  elements.modelFamilyInput.disabled = families.length === 0;
  elements.modelFamilyInput.innerHTML = families.length
    ? families.map((family) => (
      `<option value="${escapeHtml(family.id)}">${escapeHtml(family.label)}</option>`
    )).join("")
    : "<option>Aucun modèle vérifié</option>";
  if (familyId) elements.modelFamilyInput.value = familyId;

  const modes = models.filter((model) => modelFamily(model).id === familyId)
    .sort((a, b) => modelModeRank(a) - modelModeRank(b)
      || modelModeLabel(a).localeCompare(modelModeLabel(b)));
  elements.modelInput.disabled = modes.length === 0;
  elements.modelInput.innerHTML = modes.length
    ? modes.map((model) => (
      `<option value="${escapeHtml(model.endpointId)}">` +
        `${escapeHtml(modelModeLabel(model))}</option>`
    )).join("")
    : "<option>Aucun mode disponible</option>";
  const endpointId = modes.some((model) => model.endpointId === selectedEndpoint)
    ? selectedEndpoint
    : modes.some((model) => model.endpointId === rememberedEndpoint)
      ? rememberedEndpoint
      : modes[0]?.endpointId;
  if (endpointId) {
    elements.modelInput.value = endpointId;
    selectedModelsByMedia.set(state.mediaType, endpointId);
  }
  renderModelControls();
  renderReferences();
  updateGenerateButton();

  elements.verifiedModels.innerHTML = state.catalog.length
    ? state.catalog.map((model) => `
      <div class="verified-model">
        <strong>${escapeHtml(modelLabel(model))}</strong>
        <span>${escapeHtml(priceLabel(model.pricing))}</span>
        <small>${escapeHtml(model.endpointId)}</small>
      </div>
    `).join("")
    : "";
}

function modelSupportsMotionTransfer(model) {
  if (model?.mediaType !== "video") return false;
  const properties = inputContract(model.inputSchema).properties;
  const hasImage = ["image_url", "reference_image_url", "input_image_url"]
    .some((field) => field in properties);
  const hasVideo = ["video_url", "reference_video_url", "input_video_url"]
    .some((field) => field in properties);
  return hasImage && hasVideo;
}

function renderModelControls(preferredAspectRatio = null) {
  if (renderedModelEndpoint) modelOptionValues.set(renderedModelEndpoint, readModelOptions());
  const model = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
  const remembered = renderedModelEndpoint !== model?.endpointId
    ? modelSettingsByEndpoint.get(model?.endpointId) : null;
  if (remembered) modelOptionValues.set(model.endpointId, remembered);
  const controls = model?.controls || {};
  const hasImageReference = state.mediaType === "image" && currentReferences().some((item) => item.kind === "image");
  const previousAspectRatio = preferredAspectRatio || (imageRatioAutoActive && hasImageReference ? "auto" :
    remembered?.aspectRatio || elements.aspectRatioInput.value);
  const supportedRatios = controls.aspectRatios?.length
    ? controls.aspectRatios
    : ["16:9", "9:16", "1:1", "4:3", "3:2"];
  const aspectRatios = hasImageReference ? ["auto", ...supportedRatios] : supportedRatios;
  elements.aspectRatioInput.innerHTML = aspectRatios.map((value) => (
    `<option value="${escapeHtml(value)}">${escapeHtml(value === "auto"
      ? `Auto · ${nearestSourceAspectRatio(model)}` : value)}</option>`
  )).join("");
  elements.aspectRatioInput.value = aspectRatios.includes(previousAspectRatio)
    ? previousAspectRatio
    : aspectRatios[0];

  const previousResolution = remembered?.resolution || remembered?.imageSize || elements.resolutionInput.value;
  const imageSizes = (controls.imageSizes || []).filter((item) => (
    item.aspectRatio === elements.aspectRatioInput.value
  ));
  const options = controls.resolutions?.length
    ? controls.resolutions.map((value) => {
      const tierPrice = model?.pricing?.tiersByResolution?.[value];
      const price = tierPrice === undefined ? "" : ` · ${Number(tierPrice).toLocaleString(
        "fr-FR",
        { style: "currency", currency: model.pricing.currency || "USD",
          minimumFractionDigits: 2, maximumFractionDigits: 4 }
      )} / s`;
      return { value, label: `${value.toUpperCase()}${price}` };
    })
    : imageSizes.map((item) => ({
      value: item.value,
      label: item.label
    }));
  elements.resolutionInput.disabled = options.length === 0;
  elements.resolutionInput.innerHTML = options.length
    ? options.map((item) => (
      `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`
    )).join("")
    : "<option>Automatique</option>";
  if (options.some((item) => item.value === previousResolution)) {
    elements.resolutionInput.value = previousResolution;
  } else if (options.some((item) => item.value === controls.defaultResolution)) {
    elements.resolutionInput.value = controls.defaultResolution;
  }
  if (controls.fixedResolution) {
    elements.resolutionInput.innerHTML = `<option>${escapeHtml(controls.fixedResolution)}</option>`;
  }
  elements.durationInput.min = controls.durationMin || 2;
  elements.durationInput.max = controls.durationMax || 20;
  if (remembered?.durationSeconds !== undefined) {
    elements.durationInput.value = String(remembered.durationSeconds);
  }
  elements.durationInput.value = String(Math.min(Number(elements.durationInput.max),
    Math.max(Number(elements.durationInput.min), Number(elements.durationInput.value))));
  elements.durationOutput.value = `${elements.durationInput.value} s`;
  document.querySelector(".negative-block").classList.toggle("hidden", !controls.negativePrompt);
  renderExtraControls(model);
  if (remembered && (remembered.styles || remembered.loras)) restoreModelOptions(remembered);
  const referenceKinds = controls.referenceKinds || [];
  const referenceKindCopy = referenceKinds.map((kind) => ({
    image: "images", audio: "sons", video: "vidéos"
  }[kind])).filter(Boolean).join(" + ");
  elements.modelReferenceHint.textContent = !model ? "Ajoute un modèle dans Connexions."
    : state.videoMode === "motion-transfer"
      ? "@video1 : mouvement source · @image1 : personnage à animer. Les deux sont requis."
    : controls.referenceRole === "none" ? "Texte seul · Pour utiliser le deck, choisis un mode avec image ou références."
    : referenceKinds.length > 1
      ? `Accepte ${referenceKindCopy}. Utilise @image1, @audio1 ou @video1 selon le média.`
    : referenceKinds[0] === "audio"
      ? "@audio1 : son source · Ce mode accepte une seule référence audio."
    : referenceKinds[0] === "video"
      ? "@video1 : vidéo source · Ce mode accepte une seule référence vidéo."
    : controls.referenceRole === "first-last" ? "@image1 : première image · @image2 : dernière image (facultative)."
    : controls.referenceRole === "first" ? "@image1 : image de départ · Ce mode accepte une seule image."
    : `De ${controls.minReferences || 1} à ${controls.maxReferences} images · L’ordre du deck définit @image1, @image2…`;
  updateGenerateButton();
}

const optionLabels = {
  horizontalAngle: "Azimuth (0–360°)", verticalAngle: "Elevation (−30–90°)",
  cameraZoom: "Camera zoom (0 wide · 10 close)", angleStrength: "Angle LoRA strength",
  numImages: "Images", generateAudio: "Audio", reasoningLevel: "Raisonnement", renderingSpeed: "Qualité", outputFormat: "Fichier",
  quality: "Qualité", background: "Fond", outputCompression: "Compression",
  limitGenerations: "Limiter les générations", thinkingLevel: "Raisonnement",
  systemPrompt: "Instruction système",
  strength: "Transformation", bitrateMode: "Encodage", seed: "Seed",
  promptExpansionMode: "Expansion", characterOrientation: "Orientation",
  keepOriginalSound: "Son source", adaptMotion: "Adapter le mouvement",
  enhanceIdentity: "Renforcer l’identité", lyrics: "Paroles",
  originalLyrics: "Paroles source", originalTags: "Style source",
  instrumental: "Instrumental", editMode: "Type de remix",
  steps: "Étapes", guidanceScale: "Guidance"
};
const optionValueLabels = { TURBO: "Rapide", BALANCED: "Équilibrée", QUALITY: "Qualité",
  standard: "Standard", high: "Haute qualité", fast: "Rapide", balanced: "Équilibrée",
  quality: "Qualité", low: "Basse", medium: "Moyenne", xhigh: "Très haute", max: "Maximum",
  minimal: "Minimal", transparent: "Transparent", opaque: "Opaque", auto: "Automatique",
  jpeg: "JPG", png: "PNG", webp: "WebP" };

function readModelOptions() {
  return Object.fromEntries([...elements.modelOptions.querySelectorAll("[data-model-option]")]
    .filter((element) => element.value !== "")
    .map((element) => [element.dataset.modelOption, element.dataset.valueType === "boolean"
      ? element.value === "true" : element.dataset.valueType === "number" ? Number(element.value) : element.value]));
}

function restoreModelOptions(settings) {
  for (const input of elements.modelOptions.querySelectorAll("[data-model-option]")) {
    const value = settings?.[input.dataset.modelOption];
    if (value !== undefined) input.value = String(value);
  }
  if (Array.isArray(settings?.styles)) {
    state.selectedKreaLoras = settings.styles.map((style) => ({
      key: `krea:${String(style.id || style.style_id || "")}`,
      id: String(style.id || style.style_id || ""),
      source: "krea",
      endpointId: "image/bfl/flux-1-dev",
      strength: Number.isFinite(Number(style.strength)) ? Number(style.strength) : 1,
      enabled: style.enabled !== false
    })).filter((style) => style.id);
  } else if (Array.isArray(settings?.loras)) {
    const items = loraLibraryItems();
    state.selectedKreaLoras = settings.loras.map((lora) => {
      const path = String(lora.path || lora.url || "");
      const item = items.find((candidate) => candidate.source === "local" && candidate.path === path);
      return item ? {
        ...item,
        strength: Number.isFinite(Number(lora.scale)) ? Number(lora.scale) : 1,
        enabled: lora.enabled !== false
      } : null;
    }).filter(Boolean);
  }
  renderKreaLoraMixer();
  if (renderedModelEndpoint) modelOptionValues.set(renderedModelEndpoint, readModelOptions());
}

function renderExtraControls(model) {
  const controls = model?.controls || {};
  const options = [...(controls.extras || [])];
  const saved = modelOptionValues.get(model?.endpointId) || {};
  const optionControls = options.map((option) => {
    const value = saved[option.key] ?? option.default ?? "";
    const type = option.type === "boolean" ? "boolean" : ["number", "integer"].includes(option.type) ? "number" : "string";
    let values = option.type === "boolean" ? [true, false] : option.values || [];
    if (option.key === "numImages") values = Array.from({ length: option.maximum || 4 }, (_, index) => index + 1);
    const attrs = `data-model-option="${option.key}" data-value-type="${type}"`;
    const control = values.length ? `<select ${attrs}>${values.map((item) => (
      `<option value="${escapeHtml(item)}" ${String(item) === String(value) ? "selected" : ""}>` +
      `${typeof item === "boolean"
        ? option.key === "generateAudio"
          ? item ? "Avec audio" : "Sans audio"
          : item ? "Activé" : "Désactivé"
        : escapeHtml(optionValueLabels[item] || item)}</option>`
    )).join("")}</select>` : type === "string"
      ? option.key.toLowerCase().includes("lyrics")
        ? `<textarea ${attrs} rows="3" placeholder="[verse]…">${escapeHtml(value)}</textarea>`
        : `<input ${attrs} type="text" value="${escapeHtml(value)}" placeholder="À renseigner">`
      : `<input ${attrs} type="number" value="${escapeHtml(value)}"
        ${option.minimum !== undefined ? `min="${option.minimum}"` : ""}
        ${option.maximum !== undefined ? `max="${option.maximum}"` : ""}
        step="${option.type === "integer" ? "1" : ["horizontalAngle", "verticalAngle", "cameraZoom"].includes(option.key) ? "any" : "0.05"}" placeholder="Aléatoire">`;
    const longClass = type === "string" ? " model-option-long" : "";
    return `<label class="compact-field${longClass}"><span>${optionLabels[option.key] || option.key}</span>${control}</label>`;
  }).join("");
  const seedValue = saved.seed ?? "";
  const seedControl = controls.seed ? `
    <details class="seed-control" ${seedValue !== "" ? "open" : ""}>
      <summary aria-label="Afficher ou saisir le seed" title="Seed">
        ${seedIcon()}
      </summary>
      <label class="compact-field seed-field">
        <span>Seed</span>
        <input data-model-option="seed" data-value-type="number" type="number"
          step="1" value="${escapeHtml(seedValue)}" placeholder="Aléatoire">
      </label>
    </details>
  ` : "";
  elements.modelOptions.innerHTML = optionControls + seedControl;
  renderedModelEndpoint = model?.endpointId || null;
  renderKreaLoraMixer();
}

function isKrea2Lora(style) {
  return [style?.name, style?.model, ...(style?.models || [])].filter(Boolean).join(" ")
    .replaceAll("_", " ").replaceAll("-", " ").toLowerCase().match(/\bkrea\s*2\b/);
}

function isFluxLora(style) {
  return !isKrea2Lora(style) && [style?.model, ...(style?.models || [])]
    .filter(Boolean).join(" ").toLowerCase().includes("flux");
}

function falLoraEndpointForBase(baseModel) {
  const base = String(baseModel || "").toLowerCase().replaceAll("_", " ").replaceAll("-", " ");
  if (base.includes("flux.1 krea") || base.includes("flux 1 krea")) return "fal-ai/flux-krea-lora";
  if (base.includes("flux.1 dev") || base.includes("flux 1 dev") || base.includes("flux dev")) return "fal-ai/flux-lora";
  return null;
}

function loraLibraryItems() {
  const krea = state.kreaStyles.filter((style) => !isKrea2Lora(style)).flatMap((style) => {
    const item = {
      key: `krea:${style.id}`,
      id: style.id,
      name: style.name,
      model: style.model,
      source: "krea",
      endpointId: isFluxLora(style) ? "image/bfl/flux-1-dev" : null,
      thumbnailUrl: style.thumbnailUrl || null
    };
    const weightEndpoint = style.weightsUrl && isFluxLora(style)
      ? falLoraEndpointForBase(style.model || "FLUX.1 Dev")
      : null;
    return weightEndpoint ? [item, {
      ...item,
      key: `weight:${style.id}`,
      name: `${style.name} · poids`,
      source: "local",
      endpointId: weightEndpoint,
      path: style.weightsUrl
    }] : [item];
  });
  const local = state.loraTrainingJobs.filter((job) => (
    job.status === "completed" && job.artifacts?.weights?.url
  )).map((job) => ({
    key: `local:${job.id}`,
    id: job.id,
    name: job.name,
    model: job.baseModel,
    source: "local",
    endpointId: falLoraEndpointForBase(job.baseModel),
    path: job.artifacts.weights.url,
    thumbnailUrl: job.resourceIds?.[0]
      ? `/api/resources/${encodeURIComponent(job.resourceIds[0])}/content`
      : null
  }));
  return [...krea, ...local];
}

function currentLoraEndpoint() {
  const model = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
  return model?.provider === "krea" || model?.loraBaseModel ? model.endpointId : null;
}

function loraIsCompatible(item, endpointId = currentLoraEndpoint()) {
  return Boolean(item?.endpointId && endpointId && item.endpointId === endpointId);
}

function selectedKreaStyles() {
  return state.selectedKreaLoras.filter((selected) => (
    selected.enabled !== false && selected.source === "krea"
  )).map((selected) => ({
    id: selected.id,
    strength: Math.max(0, Math.min(2, Number(selected.strength) || 0))
  }));
}

function selectedFalLoras() {
  return state.selectedKreaLoras.filter((selected) => (
    selected.enabled !== false && selected.source === "local" && selected.path
  )).map((selected) => ({
    path: selected.path,
    scale: Math.max(0, Math.min(2, Number(selected.strength) || 0))
  }));
}

function persistLoraPreferences() {
  localStorage.setItem(loraFavoritesStorageKey, JSON.stringify([...state.loraFavorites].slice(0, 500)));
  localStorage.setItem(loraPresetsStorageKey, JSON.stringify(state.loraMixPresets.slice(0, 100)));
}

function renderLoraPresetOptions() {
  const selected = elements.kreaLoraPresetSelect.value;
  elements.kreaLoraPresetSelect.innerHTML = `<option value="">Presets…</option>${state.loraMixPresets.map((preset) => (
    `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</option>`
  )).join("")}`;
  if (state.loraMixPresets.some((preset) => preset.id === selected)) {
    elements.kreaLoraPresetSelect.value = selected;
  }
}

function renderKreaLoraMixer() {
  const model = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
  const visible = state.mediaType === "image" && (model?.provider === "krea" || Boolean(model?.loraBaseModel));
  elements.kreaLoraMixer.classList.toggle("hidden", !visible);
  if (!visible) return;
  const endpointId = model.endpointId;
  state.selectedKreaLoras = state.selectedKreaLoras.filter((item) => loraIsCompatible(item, endpointId));
  const items = loraLibraryItems();
  const selectedKeys = new Set(state.selectedKreaLoras.map((item) => item.key));
  const activeCount = state.selectedKreaLoras.filter((item) => item.enabled !== false).length;
  elements.kreaLoraCount.textContent = `${activeCount} sélectionné(s)`;
  elements.importKreaLorasButton.classList.toggle("hidden", model.provider !== "krea");
  elements.kreaLoraMessage.textContent = model.provider === "krea"
    ? "Les style_id Krea restent exécutés chez Krea. Recharge le portefeuille API Krea si le service signale un solde insuffisant."
    : `Mix local via fal · ${model.loraBaseModel}. Les poids incompatibles restent visibles si tu désactives le filtre.`;
  elements.kreaLoraSelected.innerHTML = state.selectedKreaLoras.length
    ? state.selectedKreaLoras.map((selected) => {
      const item = items.find((candidate) => candidate.key === selected.key) || selected;
      return `<article class="krea-lora-chip" data-krea-selected="${escapeHtml(selected.key)}">
        <label class="krea-lora-toggle"><input type="checkbox" data-krea-enable
          ${selected.enabled !== false ? "checked" : ""}> <strong>${escapeHtml(item.name)}</strong></label>
        <span>${escapeHtml(item.model)} · ${item.source === "krea" ? "Krea" : "fal"}</span>
        <label>Poids <input type="range" min="0" max="2" step="0.05" value="${escapeHtml(selected.strength)}"
          data-krea-strength><input type="number" min="0" max="2" step="0.05" value="${escapeHtml(selected.strength)}"
          data-krea-strength-number></label>
        <button type="button" data-krea-remove aria-label="Retirer ${escapeHtml(item.name)}">×</button>
      </article>`;
    }).join("")
    : `<p class="empty-state">Ajoute plusieurs LoRA compatibles : ils seront envoyés ensemble au moteur affiché.</p>`;
  const query = elements.kreaLoraSearch.value.trim().toLowerCase();
  const source = elements.kreaLoraSourceFilter.value;
  const compatibleOnly = elements.kreaLoraCompatibilityFilter.checked;
  const favoritesOnly = elements.kreaLoraFavoritesFilter.checked;
  const filtered = items.filter((item) => (
    (!query || `${item.name} ${item.model}`.toLowerCase().includes(query)) &&
    (source === "all" || item.source === source) &&
    (!compatibleOnly || loraIsCompatible(item, endpointId)) &&
    (!favoritesOnly || state.loraFavorites.has(item.key))
  ));
  elements.kreaLoraLibrary.innerHTML = filtered.length ? filtered.map((item) => {
    const compatible = loraIsCompatible(item, endpointId);
    const selected = selectedKeys.has(item.key);
    return `<article class="krea-lora-card">
      <button type="button" class="krea-lora-add" data-krea-add="${escapeHtml(item.key)}"
        ${selected ? "disabled" : ""} title="${compatible ? "Ajouter au mix" : "Basculer sur le moteur compatible"}">
        ${item.thumbnailUrl ? `<img src="${escapeHtml(item.thumbnailUrl)}" alt="" loading="lazy">` : ""}
        <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.model)} · ${item.source === "krea" ? "Krea" : "LoRA Lab / poids"}</small></span>
        <b>${selected ? "Ajouté" : compatible ? "+" : "Changer moteur"}</b>
      </button>
      <button class="krea-lora-favorite ${state.loraFavorites.has(item.key) ? "is-favorite" : ""}"
        type="button" data-krea-favorite="${escapeHtml(item.key)}" aria-label="Favori">★</button>
    </article>`;
  }).join("") : `<p class="empty-state">Aucun LoRA compatible trouvé.</p>`;
  renderLoraPresetOptions();
}

function renderKreaLabLibrary() {
  const styles = state.kreaStyles.filter((style) => !isKrea2Lora(style));
  const query = elements.kreaLabLibrarySearch.value.trim().toLowerCase();
  const filtered = styles.filter((style) => !query ||
    `${style.name} ${style.model}`.toLowerCase().includes(query));
  elements.kreaLabLibraryCount.textContent =
    `${styles.length} LoRA récupéré${styles.length > 1 ? "s" : ""}`;
  elements.kreaLabLibraryGrid.innerHTML = filtered.length ? filtered.map((style) => `
    <article class="krea-lab-library-card" data-compatible="${isFluxLora(style)}">
      ${style.thumbnailUrl ? `<img src="${escapeHtml(style.thumbnailUrl)}" alt="" loading="lazy">` : ""}
      <span><strong>${escapeHtml(style.name)}</strong><small>${escapeHtml(style.model)}</small></span>
      <b>${isFluxLora(style) ? "Flux compatible" : "Conservé"}</b>
    </article>`).join("") : `<p class="lora-empty">${styles.length
      ? "Aucun LoRA ne correspond à cette recherche."
      : "Aucun LoRA Krea récupéré. Connecte Krea dans API, puis lance l’import."}</p>`;
}

async function importKreaLoras() {
  const buttons = [elements.importKreaLorasButton, elements.importKreaLorasLabButton];
  buttons.forEach((button) => { button.disabled = true; });
  elements.kreaLoraMessage.textContent = "Import depuis Krea…";
  elements.kreaLabLibraryMessage.textContent = "Import depuis Krea…";
  try {
    const body = await request("/api/providers/krea/styles/import", { method: "POST", body: "{}" });
    state.kreaStyles = body.styles || [];
    elements.kreaLoraMessage.textContent = body.message;
    elements.kreaLabLibraryMessage.textContent = body.message;
    renderKreaLoraMixer();
    renderKreaLabLibrary();
  } catch (error) {
    elements.kreaLoraMessage.textContent = error.message;
    elements.kreaLabLibraryMessage.textContent = error.message;
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

function openKreaGenerator() {
  const model = state.catalog.find((item) => item.mediaType === "image" && item.provider === "krea");
  if (!model) {
    elements.kreaLabLibraryMessage.textContent = "Le générateur Krea Flux.1 n’est pas disponible.";
    return;
  }
  selectedModelsByMedia.set("image", model.endpointId);
  selectMedia("image");
  elements.kreaLoraMixer.scrollIntoView({ block: "center" });
}

function currentGenerationPreview() {
  const model = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
  if (!model?.pricing) return null;
  try {
    return createGenerationPreview({ mediaType: state.mediaType, prompt: generationPrompt() || "Prévisualisation",
      negativePrompt: elements.negativePromptInput.value, settings: formSettings(), references: currentReferences() }, model);
  } catch { return null; }
}

function generationPrompt() {
  const prompt = elements.promptInput.value;
  // Viewpoint editing must not silently inherit a saved lighting / film look.
  if (elements.modelInput.value === "fal-ai/qwen-image-edit-2511-multiple-angles") return prompt;
  if (typeof window.barzCaptureDnaPrompt !== "function") return prompt;
  try {
    return window.barzCaptureDnaPrompt(prompt, state.mediaType);
  } catch {
    return prompt;
  }
}

function generationBlockerAdvice(message) {
  if (message.includes("HeyGen 2K")) return "Choisis 16:9 ou 9:16. Le bouton de correction passe directement en 16:9.";
  if (message.includes("au moins un média de référence")) return "Ajoute une référence du type accepté dans le deck.";
  if (message.includes("au maximum") && message.includes("référence")) return "Retire les références en trop ou choisis un mode qui en accepte davantage.";
  if (message.includes("manquant ou incompatible")) return "Remplace le média manquant, ou retire-le du deck.";
  if (message.includes("ne correspond à aucun média")) return "Ajoute le média demandé ou retire le token @image, @video ou @audio du prompt.";
  if (message.includes("accompagnée d’au moins une image ou une vidéo")) return "Ajoute une image ou une vidéo avec la référence audio.";
  if (message.includes("Valeur non disponible")) return "Choisis une valeur proposée par le modèle sélectionné.";
  if (message.includes("Valeur hors limites")) return "Ramène la valeur dans la plage autorisée affichée par le contrôle.";
  if (message.includes("Longueur du texte")) return "Raccourcis ou complète ce texte pour respecter les limites du modèle.";
  if (message.includes("Paramètres obligatoires")) return "Renseigne les champs obligatoires indiqués dans le message.";
  return "Corrige ce point dans les réglages du modèle avant de demander le tarif.";
}

function collectGenerationBlockers(preview, selectedModel, providerConfigured, hasPrompt) {
  const blockers = [];
  if (!selectedModel) blockers.push({
    reason: "Aucun modèle de génération n’est sélectionné.",
    advice: "Choisis un modèle disponible dans le menu Modèle."
  });
  if (!hasPrompt) blockers.push({
    reason: "Le prompt est vide.",
    advice: "Écris au moins une instruction dans le champ Prompt."
  });
  if (selectedModel && !providerConfigured) blockers.push({
    reason: `Le fournisseur ${{ heygen: "HeyGen", krea: "Krea", fal: "fal" }[selectedModel.provider] || selectedModel.provider} n’est pas connecté.`,
    advice: "Ouvre Fournisseurs, puis vérifie et enregistre la clé API correspondante."
  });
  for (const message of preview?.validationErrors || []) {
    blockers.push({ reason: message, advice: generationBlockerAdvice(message) });
  }
  if (selectedModel && !preview) blockers.push({
    reason: "Les paramètres actuels ne peuvent pas être évalués.",
    advice: "Réinitialise les options du modèle ou sélectionne à nouveau le modèle."
  });
  if (preview && preview.estimatedCost === null && !(preview.validationErrors || []).length) blockers.push({
    reason: "Le tarif de cette génération est indisponible.",
    advice: "Actualise le modèle ou vérifie son endpoint dans Fournisseurs. Aucune dépense ne sera lancée sans tarif."
  });
  return blockers.filter((blocker, index, items) => (
    items.findIndex((candidate) => candidate.reason === blocker.reason) === index
  ));
}

function openGenerationBlockers() {
  if (!state.generationBlockers.length) return;
  elements.generationBlockerList.innerHTML = state.generationBlockers.map((blocker, index) => `
    <article class="generation-blocker-item">
      <span>${index + 1}</span>
      <div><strong>${escapeHtml(blocker.reason)}</strong><small>${escapeHtml(blocker.advice)}</small></div>
    </article>
  `).join("");
  const canFixHeygen2k = state.generationBlockers.some((blocker) => blocker.reason.includes("HeyGen 2K"));
  elements.generationBlockerFixButton.classList.toggle("hidden", !canFixHeygen2k);
  elements.generationBlockersDialog.showModal();
}

function updateGenerateButton() {
  const preview = currentGenerationPreview();
  const selectedModel = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
  const providerConfigured = Boolean(selectedModel && state.providers.some((provider) => (
    provider.id === selectedModel.provider && provider.configured
  )));
  const cost = preview?.estimatedCost ?? null;
  const hasPrompt = Boolean(elements.promptInput.value.trim());
  state.generationBlockers = collectGenerationBlockers(
    preview, selectedModel, providerConfigured, hasPrompt
  );
  elements.generateButton.disabled = state.generationBlockers.length > 0;
  elements.generateCost.textContent = cost === null
    ? "—"
    : `≈ ${formatPreviewCost({ estimatedCost: cost, currency: "USD" })}`;
  const problems = [
    ...(preview?.validationErrors || []),
    ...(!providerConfigured && selectedModel
      ? [`Connecte ta clé ${{ heygen: "HeyGen", krea: "Krea", fal: "fal" }[selectedModel.provider] || selectedModel.provider} dans Fournisseurs.`]
      : [])
  ];
  const heygen2kRatioBlocked = Boolean(preview?.validationErrors?.some((message) => (
    message.includes("HeyGen 2K") && message.includes("16:9")
  )));
  elements.modelValidationText.textContent = problems.join(" ");
  elements.modelValidation.classList.toggle("hidden", problems.length === 0);
  elements.fixHeygen2kButton.classList.toggle("hidden", !heygen2kRatioBlocked);
  const blockerSummary = state.generationBlockers.map((blocker) => blocker.reason).join(" · ");
  elements.generateButton.title = blockerSummary;
  elements.generateHelpButton.classList.toggle("hidden", state.generationBlockers.length === 0);
  elements.generateHelpButton.dataset.tooltip = blockerSummary;
  renderImageBatchBanner();
}

function activeImageBatch() {
  if (state.mediaType !== "image") return null;
  const active = state.drafts.find((draft) => draft.id === state.activeDraftId && draft.queueBatchId);
  if (!active) return null;
  const drafts = state.drafts.filter((draft) => draft.mediaType === "image" && draft.queueBatchId === active.queueBatchId)
    .sort((left, right) => left.queuePosition - right.queuePosition);
  return { active, drafts, pending: drafts.filter((draft) => draft.queueStatus === "pending") };
}

function imageBatchRequest(draft, model, settings) {
  const source = (draft.references || []).find((reference) => reference.kind === "image" && !reference.missing);
  const dimensions = source && resolvedImageDimensions.get(source.url);
  const ratios = model?.controls?.aspectRatios?.length
    ? model.controls.aspectRatios : ["16:9", "9:16", "1:1", "4:3", "3:2"];
  return {
    mediaType: "image",
    prompt: draft.prompt,
    negativePrompt: draft.negativePrompt || "",
    endpointId: model.endpointId,
    queueDraftId: draft.id,
    target: { provider: model.provider, endpointId: model.endpointId },
    settings: elements.aspectRatioInput.value === "auto" && source
      ? { ...settings, aspectRatio: nearestSupportedAspectRatio(dimensions?.width, dimensions?.height, ratios) }
      : settings,
    references: structuredClone(draft.references || [])
  };
}

function imageBatchEstimate(batch, model) {
  if (!model?.pricing) return null;
  const settings = formSettings();
  const items = batch.pending.map((draft) => {
    const generationRequest = imageBatchRequest(draft, model, settings);
    const preview = createGenerationPreview(generationRequest, model);
    return { draft, generationRequest, preview };
  });
  if (items.some(({ preview, generationRequest }) => !preview.canSubmit || generationRequest.references.some((ref) => ref.missing))) return null;
  return { items, total: Number(items.reduce((sum, item) => sum + item.preview.estimatedCost, 0).toFixed(6)) };
}

function renderImageBatchBanner() {
  const batch = activeImageBatch();
  elements.imageBatchBanner.classList.toggle("hidden", !batch);
  elements.generateButton.querySelector("span").textContent = batch ? "Générer cette image" : "Générer";
  if (!batch) return;
  const model = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
  let estimate = null;
  try { estimate = imageBatchEstimate(batch, model); } catch { /* Invalid settings are shown on the normal generate control. */ }
  const displayed = estimate?.items.find((item) => item.draft.id === batch.active.id) || estimate?.items[0];
  elements.imageBatchTitle.textContent = `Série d’images · ${batch.active.queueTotal} images`;
  elements.imageBatchProgress.textContent = `${batch.pending.length} en attente · image ${batch.active.queuePosition}/${batch.active.queueTotal}`;
  elements.imageBatchDescription.textContent = batch.pending.length
    ? `Le modèle et les réglages affichés s’appliquent aux ${batch.pending.length} images restantes. Chaque image conserve son prompt et ses références.`
    : "Toutes les images de cette série ont été envoyées ou retirées.";
  elements.imageBatchItems.querySelector("summary").textContent = `Voir les ${batch.drafts.length} prompts de la série`;
  elements.imageBatchItemsList.innerHTML = batch.drafts.map((draft) => `
    <div class="image-batch-item ${draft.id === batch.active.id ? "active" : ""}">
      <button class="image-batch-item-open" type="button" data-batch-draft-id="${escapeHtml(draft.id)}"
        aria-label="Ouvrir l’image ${escapeHtml(String(draft.queuePosition))}">
        <strong>Image ${escapeHtml(String(draft.queuePosition))} · ${draft.queueStatus === "pending" ? "en attente" : "envoyée"}</strong>
        <span>${escapeHtml(draft.prompt)}</span>
      </button>
      ${draft.queueStatus === "pending" ? `<button class="image-batch-item-remove" type="button"
        data-remove-queue-draft-id="${escapeHtml(draft.id)}"
        aria-label="Retirer l’image ${escapeHtml(String(draft.queuePosition))} de la série"
        title="Retirer cette image">×</button>` : ""}
    </div>`).join("");
  elements.imageBatchUnitCost.textContent = displayed
    ? `≈ ${formatPreviewCost(displayed.preview)}`
    : "—";
  elements.imageBatchTotalCost.textContent = estimate
    ? `≈ ${formatPreviewCost({ estimatedCost: estimate.total, currency: "USD" })}`
    : "Estimation indisponible";
  elements.imageBatchLaunchButton.textContent = imageBatchSending
    ? "Envoi de la file…"
    : `Lancer ${batch.pending.length} image${batch.pending.length > 1 ? "s" : ""} · devis total`;
  elements.imageBatchLaunchButton.disabled = imageBatchSending || !batch.pending.length || !estimate
    || !state.providers.some((provider) => provider.id === model?.provider && provider.configured);
}

function renderPromptHighlights() {
  const highlighted = escapeHtml(elements.promptInput.value).replace(
    /(@(?:image|audio|video)\d+)/gi,
    "<mark>$1</mark>"
  );
  elements.promptHighlights.innerHTML = highlighted || "";
  elements.promptHighlights.scrollTop = elements.promptInput.scrollTop;
  elements.promptHighlights.scrollLeft = elements.promptInput.scrollLeft;
}

function formSettings() {
  const model = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
  const resolution = elements.resolutionInput.disabled
    ? null
    : elements.resolutionInput.value;
  const isImageSize = model?.controls?.imageSizes?.some((item) => item.value === resolution);
  return {
    ...readModelOptions(),
    ...(model?.provider === "krea" ? { styles: selectedKreaStyles() } : {}),
    ...(model?.loraBaseModel ? { loras: selectedFalLoras() } : {}),
    aspectRatio: elements.aspectRatioInput.value === "auto"
      ? nearestSourceAspectRatio(model) : elements.aspectRatioInput.value,
    ...(isImageSize ? { imageSize: resolution } : {}),
    ...(!isImageSize && resolution ? { resolution } : {}),
    ...(["video", "music"].includes(state.mediaType)
      ? { durationSeconds: Number(elements.durationInput.value) }
      : {})
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function localDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

let historyRange = "recent";

function historyTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function historyDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function visibleHistory(items, dateField) {
  const sorted = [...items].sort((a, b) => historyTimestamp(b[dateField]) - historyTimestamp(a[dateField]));
  if (historyRange === "recent") return sorted.slice(0, 30);
  if (historyRange === "all") return sorted;
  const from = elements.historyFrom.value;
  const to = elements.historyTo.value;
  return sorted.filter((item) => {
    const day = historyDay(item[dateField]);
    return day && (!from || day >= from) && (!to || day <= to);
  });
}

function renderDrafts() {
  const drafts = visibleHistory(state.drafts, "importedAt");
  elements.draftCount.textContent = String(drafts.length);
  elements.draftCount.title = `${state.drafts.length} au total`;

  if (!state.drafts.length) {
    elements.draftList.innerHTML = `
      <p class="empty-state">Les prompts enregistrés et reçus de Prompt Atlas apparaîtront ici.</p>
    `;
    return;
  }

  elements.draftList.innerHTML = drafts.length ? drafts.map((draft) => `
    <button class="draft-card ${draft.id === state.activeDraftId ? "active" : ""}"
      type="button" data-draft-id="${escapeHtml(draft.id)}">
      <header>
        <strong>${escapeHtml(mediaCopy[draft.mediaType]?.context || draft.mediaType)}</strong>
        <time>${escapeHtml(localDate(draft.importedAt))}</time>
      </header>
      <p>${escapeHtml(draft.prompt)}</p>
    </button>
  `).join("") : '<p class="empty-state compact-empty">Aucune génération sur cette période.</p>';
}

function renderImageImportQueue() {
  const queued = state.drafts.filter((draft) => draft.mediaType === "image" && draft.queueBatchId)
    .sort((left, right) => (left.queueStatus === "pending" ? 0 : 1) - (right.queueStatus === "pending" ? 0 : 1)
      || historyTimestamp(right.importedAt) - historyTimestamp(left.importedAt)
      || left.queuePosition - right.queuePosition);
  const pending = queued.filter((draft) => draft.queueStatus === "pending").length;
  elements.imageImportQueueCount.textContent = String(pending);
  elements.imageImportQueueCount.title = `${pending} image(s) prêtes à générer`;
  elements.imageImportQueueList.innerHTML = queued.length ? queued.map((draft) => `
    <div class="image-queue-row"><button class="image-queue-item ${draft.id === state.activeDraftId ? "active" : ""}" type="button"
      data-queue-draft-id="${escapeHtml(draft.id)}">
      <span class="image-queue-index">${escapeHtml(String(draft.queuePosition))}/${escapeHtml(String(draft.queueTotal))}</span>
      <span class="image-queue-copy"><strong>${escapeHtml(draft.source?.module || "Image fixe")}</strong>
      <small>${draft.queueStatus === "submitted" ? "Génération envoyée" : "Prête à générer · cliquer pour ouvrir"}</small></span>
    </button>${draft.queueStatus === "pending" ? `<button class="image-queue-remove" type="button"
      data-remove-queue-draft-id="${escapeHtml(draft.id)}" aria-label="Retirer l’image ${escapeHtml(String(draft.queuePosition))} de la file"
      title="Retirer cette image de la file">×</button>` : ""}</div>
  `).join("") : '<p class="empty-state compact-empty">Les séries d’images envoyées depuis Prompt Atlas apparaîtront ici.</p>';
  renderImageBatchBanner();
}

function formatJobCost(job) {
  return Number(job.estimatedCost).toLocaleString("fr-FR", {
    style: "currency",
    currency: job.currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
}

function downloadIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11 3h2v10l3.5-3.5 1.4 1.4-5.9 5.9-5.9-5.9 1.4-1.4L11 13V3zM5 19h14v2H5z"></path>
  </svg>`;
}

function seedIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="4"></rect>
    <circle cx="9" cy="9" r="1"></circle>
    <circle cx="15" cy="9" r="1"></circle>
    <circle cx="9" cy="15" r="1"></circle>
    <circle cx="15" cy="15" r="1"></circle>
  </svg>`;
}

function assetKey(jobId, index) {
  return `generated:${jobId}:${index}`;
}

function resourceKey(resourceId) {
  return `resource:${resourceId}`;
}

function renderJobs() {
  const allQueueJobs = state.jobs.filter((job) => job.jobType !== "director-session");
  const queueJobs = visibleHistory(allQueueJobs, "createdAt");
  elements.jobCount.textContent = String(queueJobs.length);
  elements.jobCount.title = `${allQueueJobs.length} au total`;
  elements.jobList.innerHTML = queueJobs.length
    ? queueJobs.map((job) => `
      <article class="job-card" data-job-id="${escapeHtml(job.id)}">
        <header>
          <strong>${escapeHtml(modelLabel(job))}</strong>
          <time>${escapeHtml(localDate(job.createdAt))}</time>
        </header>
        <p><span class="job-status">${escapeHtml(jobStatusLabel(job))}</span> · ${escapeHtml(
          job.estimatedCost === null ? "coût inconnu" : formatJobCost(job)
        )}</p>
        ${renderJobProgress(job)}
        ${job.error ? `<p class="job-error">${escapeHtml(job.error)}</p>` : ""}
        ${renderResultMedia(job.result, modelLabel(job), job)}
        ${mediaResults(job.result).length ? `
          <button class="job-detail-button" type="button"
            data-open-job="${escapeHtml(job.id)}">Voir le détail</button>
        ` : ""}
        ${job.status === "awaiting_confirmation" ? `
          <button class="job-action" type="button"
            ${job.estimatedCost === null
              ? `data-reprepare-job="${escapeHtml(job.id)}"`
              : `data-confirm-job="${escapeHtml(job.id)}"`}
            ${job.missingRequired?.length ? "disabled" : ""}>
            ${job.estimatedCost === null ? "Reprendre" : "Générer"}
          </button>
        ` : ""}
      </article>
    `).join("")
    : `<p class="empty-state compact-empty">${allQueueJobs.length ? "Aucune génération sur cette période." : "Aucune requête préparée."}</p>`;
  renderActiveJobMonitor();
}

function renderActiveJobMonitor() {
  const job = jobForMonitor(state.jobs, state.monitoredJobId);
  elements.activeJobMonitor.classList.toggle("hidden", !job);
  if (!job) return;
  state.monitoredJobId = job.id;

  const progress = progressForJob(job, state.jobs);
  const value = progress?.value ?? (job.status === "failed" || job.status === "cancelled" ? 100 : 0);
  const prefix = progress?.estimated ? "≈ " : "";
  elements.activeJobStatus.textContent = jobStatusLabel(job);
  elements.activeJobTitle.textContent = modelLabel(job);
  elements.activeJobBar.style.width = `${value}%`;
  elements.activeJobPercent.textContent = `${prefix}${value} %`;
  elements.activeJobTrack.setAttribute("aria-valuenow", String(value));
  elements.activeJobTrack.setAttribute("aria-label", `${jobStatusLabel(job)} : ${prefix}${value} %`);
  elements.activeJobMonitor.classList.toggle("is-completed", job.status === "completed");
  elements.activeJobMonitor.classList.toggle("is-failed", ["failed", "cancelled"].includes(job.status));
  const hasResult = mediaResults(job.result).length > 0;
  elements.activeJobButton.textContent = hasResult ? "Voir le résultat" : "Voir dans la file";
  elements.activeJobButton.dataset.jobId = job.id;
}

function renderJobProgress(job) {
  const progress = progressForJob(job, state.jobs);
  if (!progress) return "";
  const prefix = progress.estimated ? "≈ " : "";
  const provider = job.provider === "heygen" ? "HeyGen" : "fal";
  const title = progress.estimated
    ? `Progression estimée à partir de l’état ${provider} et des durées précédentes`
    : `Progression communiquée par ${provider}`;
  return `
    <div class="job-progress" title="${escapeHtml(title)}">
      <div class="job-progress-track" role="progressbar" aria-valuemin="0"
        aria-valuemax="100" aria-valuenow="${progress.value}"
        aria-label="${escapeHtml(title)}">
        <span style="width: ${progress.value}%"></span>
      </div>
      <strong class="job-progress-value">${prefix}${progress.value} %</strong>
    </div>
  `;
}

function jobStatusLabel(job) {
  if (job.status === "awaiting_confirmation" && job.estimatedCost === null) {
    return "À reprendre";
  }
  const provider = job.provider === "heygen" ? "HeyGen" : "fal";
  return ({
    awaiting_confirmation: "Confirmation requise",
    submitting: "Envoi sécurisé…",
    submitted: `Envoyé à ${provider}`,
    queued: `Dans la file ${provider}`,
    running: "Génération en cours",
    completed: "Terminé",
    failed: "Échec",
    cancelled: "Annulé"
  })[job.status] || job.status;
}

function selectOptionIfPresent(select, value) {
  if (value === undefined || value === null) return false;
  const normalized = String(value);
  if (![...select.options].some((option) => option.value === normalized)) return false;
  select.value = normalized;
  return true;
}

function selectModelEndpoint(endpointId) {
  const model = state.catalog.find((item) => (
    item.endpointId === endpointId && item.mediaType === state.mediaType
  ));
  if (!model) return false;
  elements.modelFamilyInput.value = modelFamily(model).id;
  renderCatalog();
  return selectOptionIfPresent(elements.modelInput, endpointId);
}

function restoreJobInComposer(id, origin = "Recreate") {
  const job = state.jobs.find((item) => item.id === id);
  if (!job) return;
  const input = job.providerInput || {};
  state.preparedRequest = null;
  state.preparedPreview = null;
  state.activeJobId = null;
  selectMedia(job.mediaType);
  state.referencesByMedia[job.mediaType] = structuredClone(job.references || []);
  renderReferences();
  const modelAvailable = selectModelEndpoint(job.endpointId);
  renderModelControls();
  const model = state.catalog.find((item) => item.endpointId === job.endpointId);
  const imageSize = input.image_size;
  const matchedImageSize = model?.controls?.imageSizes?.find((item) => (
    typeof imageSize === "string"
      ? item.value === imageSize
      : Number(imageSize?.width) === item.width && Number(imageSize?.height) === item.height
  ));
  const aspectRatio = input.aspect_ratio || matchedImageSize?.aspectRatio;
  if (selectOptionIfPresent(elements.aspectRatioInput, aspectRatio)) renderModelControls();
  selectOptionIfPresent(
    elements.resolutionInput,
    input.resolution || (typeof imageSize === "string" ? imageSize : matchedImageSize?.value)
  );
  const duration = Number(input.duration ?? input.duration_seconds ?? input.num_seconds);
  if (job.mediaType === "video" && Number.isFinite(duration)) {
    const min = Number(elements.durationInput.min);
    const max = Number(elements.durationInput.max);
    elements.durationInput.value = String(Math.min(max, Math.max(min, duration)));
    elements.durationOutput.value = `${elements.durationInput.value} s`;
  }
  const restoredSettings = job.generationDraft?.settings || {
    seed: input.seed, numImages: input.num_images, generateAudio: input.generate_audio,
    reasoningLevel: input.reasoning_level,
    renderingSpeed: input.rendering_speed, outputFormat: input.output_format,
    strength: input.strength, bitrateMode: input.bitrate_mode
  };
  restoreModelOptions(restoredSettings);
  elements.promptInput.value = job.generationDraft?.prompt || input.prompt || input.instruction || input.additional_prompt || "";
  renderPromptHighlights();
  elements.negativePromptInput.value = job.generationDraft?.negativePrompt || input.negative_prompt || "";
  elements.draftOrigin.textContent = `${origin} · ${modelLabel(job)}`;
  updateGenerateButton();
  rememberGenerationSettings();
  elements.formMessage.textContent = modelAvailable
    ? "Toutes les spécifications ont été restaurées. Modifie-les ou clique sur Générer quand tu es prêt."
    : "Prompt restauré, mais ce modèle n’est plus dans le catalogue vérifié.";
  elements.promptInput.focus();
}

function reprepareJob(id) {
  restoreJobInComposer(id, "Reprise");
}

function recreateActiveJob() {
  const id = state.activeDetailJobId;
  if (!id) return;
  elements.jobDetailDialog.close("recreate");
  restoreJobInComposer(id);
}

function resultUrls(value, urls = [], depth = 0) {
  if (depth > 5 || value === null || value === undefined) return urls;
  if (typeof value === "string") {
    if (/^\/api\/resources\/[0-9a-f-]+\/content$/i.test(value)) {
      urls.push(value);
      return urls;
    }
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:") urls.push(parsed.href);
    } catch {
      // Non-URL output values are ignored here but remain stored in the job result.
    }
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => resultUrls(item, urls, depth + 1));
  } else if (typeof value === "object") {
    Object.values(value).forEach((item) => resultUrls(item, urls, depth + 1));
  }
  return [...new Set(urls)];
}

function mediaResults(result, items = [], depth = 0) {
  if (depth > 5 || result === null || result === undefined) return items;
  if (Array.isArray(result)) {
    result.forEach((item) => mediaResults(item, items, depth + 1));
  } else if (typeof result === "object") {
    if (typeof result.url === "string") {
      const url = resultUrls(result.url)[0];
      if (url && isDisplayMedia(result)) {
        items.push({
          url,
          contentType: result.content_type || "",
          width: result.width,
          height: result.height
        });
      }
    } else {
      Object.values(result).forEach((item) => mediaResults(item, items, depth + 1));
    }
  }
  return items;
}

function renderAssetOverlays(job, index) {
  if (!job) return "";
  if (job.jobType === "director-session" && job.resourceId) {
    return `<a class="asset-overlay-button asset-download"
      href="/api/resources/${encodeURIComponent(job.resourceId)}/download" download
      aria-label="Télécharger ce média" title="Télécharger">${downloadIcon()}</a>`;
  }
  const key = assetKey(job.id, index);
  const checked = state.selectedAssets.has(key) ? "checked" : "";
  return `
    <label class="asset-overlay-button asset-select" title="Sélectionner">
      <input type="checkbox" data-select-asset="${escapeHtml(key)}" ${checked}
        aria-label="Sélectionner ce média">
      <span aria-hidden="true">✓</span>
    </label>
    <a class="asset-overlay-button asset-download"
      href="/api/jobs/${encodeURIComponent(job.id)}/download/${index}" download
      aria-label="Télécharger ce média" title="Télécharger">${downloadIcon()}</a>
  `;
}

function renderResultMedia(result, label, job = null) {
  const items = mediaResults(result);
  if (!items.length) return "";
  return `<div class="result-media">${items.slice(0, 4).map((item, index) => {
    const safeUrl = escapeHtml(item.url);
    const alt = escapeHtml(`${label} — résultat ${index + 1}`);
    const isVideo = item.contentType.startsWith("video/") || /\.(mp4|webm)(\?|$)/i.test(item.url);
    const media = isVideo
      ? `<video controls preload="metadata" src="${safeUrl}" aria-label="${alt}"></video>`
      : `<button class="image-preview-trigger" type="button"
          data-preview-image-url="${safeUrl}" data-preview-image-alt="${alt}"
          aria-label="Afficher ${alt} en plein écran"><img src="${safeUrl}"
          alt="${alt}" loading="lazy"></button>`;
    return `<div class="result-frame">${media}${renderAssetOverlays(job, index)}</div>`;
  }).join("")}</div>`;
}

function completedAssets() {
  return state.jobs
    .filter((job) => job.status === "completed" && job.jobType !== "director-session")
    .flatMap((job) => mediaResults(job.result).map((media, index) => ({
      kind: "generated",
      job,
      media,
      index,
      key: assetKey(job.id, index),
      mediaType: job.mediaType,
      collectionId: job.collectionId || null,
      createdAt: job.createdAt
    })));
}

function uploadedAssets() {
  return state.resources.map((resource) => ({
    kind: "resource",
    resource,
    media: {
      url: `/api/resources/${encodeURIComponent(resource.id)}/content`,
      contentType: resource.contentType || ""
    },
    index: 0,
    key: resourceKey(resource.id),
    mediaType: resource.mediaType,
    collectionId: resource.collectionId || null,
    createdAt: resource.createdAt
  }));
}

function categoryAssets() {
  const assets = state.assetCategory === "resources" ? uploadedAssets()
    : state.assetCategory === "trash" ? [...completedAssets(), ...uploadedAssets()]
      : completedAssets();
  return assets.filter((asset) => state.trashedAssetKeys.has(asset.key) === (state.assetCategory === "trash"));
}

function selectedAssetRecords() {
  return [...completedAssets(), ...uploadedAssets()].filter((asset) => (
    state.selectedAssets.has(asset.key)
  ));
}

function selectionPayload(asset) {
  return asset.kind === "resource"
    ? { kind: "resource", resourceId: asset.resource.id }
    : { kind: "generated", jobId: asset.job.id, index: asset.index };
}

function currentReferences() {
  return state.referencesByMedia[referenceStorageKey()] || [];
}

function referenceStorageKey() {
  return state.mediaType === "video" && state.videoMode === "motion-transfer"
    ? "motionTransfer" : state.mediaType;
}

function referenceLimit() {
  if (state.videoMode === "motion-transfer") return 2;
  const configuredLimit = Number(state.catalog.find((item) => (
    item.endpointId === elements.modelInput.value
  ))?.controls?.maxReferences);
  return Number.isFinite(configuredLimit) && configuredLimit >= 0 ? configuredLimit : 12;
}

function referenceKindFromAsset(asset) {
  if (asset?.mediaType === "music") return "audio";
  return ["image", "video"].includes(asset?.mediaType) ? asset.mediaType : null;
}

function referenceTokenAt(references, index) {
  const kind = references[index]?.kind || "image";
  const ordinal = references.slice(0, index + 1)
    .filter((reference) => (reference.kind || "image") === kind).length;
  return `@${kind}${ordinal}`;
}

function referencePreview(reference) {
  if (reference.kind === "audio") {
    return `<div class="reference-audio-preview" aria-label="Audio ${escapeHtml(reference.label || "Référence")}">
      <span aria-hidden="true">♪</span><small>${escapeHtml(reference.label || "Audio")}</small>
    </div>`;
  }
  if (reference.kind === "video") {
    return `<div class="reference-audio-preview" aria-label="Vidéo ${escapeHtml(reference.label || "Référence")}">
      <span aria-hidden="true">▶</span><small>${escapeHtml(reference.label || "Vidéo")}</small>
    </div>`;
  }
  return `<img src="${escapeHtml(reference.previewUrl || reference.url)}"
    alt="${escapeHtml(reference.label || "Référence")}" tabindex="0"
    role="button" aria-expanded="false"
    aria-label="Agrandir ${escapeHtml(reference.label || "la référence")}">`;
}

function renderReferences() {
  const references = currentReferences();
  const imageReference = state.mediaType === "image"
    ? references.find((reference) => reference.kind === "image" && !reference.missing) : null;
  const imageReferenceSignature = imageReference?.id || "";
  if (imageReferenceSignature !== lastImageReferenceSignature) {
    lastImageReferenceSignature = imageReferenceSignature;
    imageRatioAutoActive = Boolean(imageReference);
    if (imageReference) {
      measureImageReference(imageReference.url).then((dimensions) => {
        if (dimensions && currentReferences().some((item) => item.id === imageReference.id) && imageRatioAutoActive) {
          renderModelControls("auto");
          updateGenerateButton();
        }
      });
    }
    renderModelControls(imageReference ? "auto" : null);
  }
  const limit = referenceLimit();
  elements.referenceCount.textContent = `${references.length} / ${limit}`;
  elements.referenceAddButton.disabled = references.length >= limit;
  if (references.length >= limit) closeReferenceAddMenu();
  elements.referenceEmpty.classList.toggle("hidden", references.length > 0);
  const referenceChip = (reference, index) => {
    const token = referenceTokenAt(references, index);
    return `
    <div class="reference-chip ${reference.missing ? "is-missing" : ""}"
      data-reference-id="${escapeHtml(reference.id)}"
      title="${escapeHtml(reference.label || "Référence")}${reference.missing ? " · Missing" : ""}">
      <div class="reference-image-shell">
        ${referencePreview(reference)}
        ${reference.missing ? '<span class="reference-missing">Missing</span>' : ""}
        <button type="button" data-remove-reference="${escapeHtml(reference.id)}"
          aria-label="Retirer ${escapeHtml(reference.label || "la référence")}">×</button>
      </div>
      <button class="reference-token-button" type="button"
        data-insert-reference="${token}"
        aria-label="Insérer ${token} dans le prompt">${token}</button>
    </div>
  `; };
  if (state.videoMode === "motion-transfer") {
    elements.referenceEmpty.classList.add("hidden");
    elements.referenceList.innerHTML = [
      ["video", "Vidéo mouvement", "Ajoute la vidéo dont le mouvement doit être reproduit"],
      ["image", "Image personnage", "Ajoute le personnage à animer"]
    ].map(([kind, title, copy]) => {
      const index = references.findIndex((reference) => reference.kind === kind);
      return index >= 0 ? referenceChip(references[index], index) : `
        <button class="motion-reference-slot" type="button" data-motion-reference-kind="${kind}">
          <span aria-hidden="true">${kind === "video" ? "▶" : "▧"}</span>
          <strong>${title}</strong><small>${copy}</small>
        </button>`;
    }).join("");
  } else {
    elements.referenceList.innerHTML = references.map(referenceChip).join("");
  }
  elements.referenceSetsButton.classList.toggle("hidden", state.videoMode === "motion-transfer");
  updateGenerateButton();
}

function insertReferenceToken(token) {
  const input = elements.promptInput;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  const prefix = before && !/\s$/.test(before) ? " " : "";
  const suffix = after && !/^\s/.test(after) ? " " : "";
  input.setRangeText(`${prefix}${token}${suffix}`, start, end, "end");
  input.focus();
  input.dispatchEvent(new Event("input", { bubbles: true }));
  elements.formMessage.textContent = `${token} inséré dans le prompt.`;
}

function closeReferenceAddMenu() {
  elements.referenceAddMenu.classList.add("hidden");
  elements.referenceAddButton.setAttribute("aria-expanded", "false");
}

function toggleReferenceAddMenu() {
  if (elements.referenceAddButton.disabled) return;
  const willOpen = elements.referenceAddMenu.classList.contains("hidden");
  if (willOpen) state.referenceReplacementTarget = null;
  elements.referenceAddMenu.classList.toggle("hidden", !willOpen);
  elements.referenceAddButton.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) elements.referenceAddMenu.querySelector("button")?.focus();
}

function stopReferenceLibraryHandshake() {
  if (referenceLibraryHandshakeTimer) clearInterval(referenceLibraryHandshakeTimer);
  referenceLibraryHandshakeTimer = null;
}

function postReferenceLibraryHandshake() {
  if (!referenceLibraryPopup || referenceLibraryPopup.closed) {
    stopReferenceLibraryHandshake();
    return;
  }
  referenceLibraryPopup.postMessage({
    type: "barz:library-handshake",
    schemaVersion: "1.0"
  }, referenceLibraryOrigin);
}

function openReferenceLibrary() {
  closeReferenceAddMenu();
  const url = new URL(referenceLibraryUrl);
  url.searchParams.set("aggregatorOrigin", location.origin);
  referenceLibraryPopup = window.open(
    url.href,
    "barzReferenceLibrary",
    "popup=yes,width=1440,height=920,resizable=yes,scrollbars=yes"
  );
  if (!referenceLibraryPopup) {
    elements.formMessage.textContent =
      "La bibliothèque a été bloquée par le navigateur. Autorise les popups pour cet Aggregator.";
    return;
  }
  stopReferenceLibraryHandshake();
  postReferenceLibraryHandshake();
  referenceLibraryHandshakeTimer = setInterval(postReferenceLibraryHandshake, 500);
  elements.formMessage.textContent =
    "Bibliothèque ouverte. Choisis une image puis clique sur « Import ref ».";
}

function libraryReferenceResult(event, requestId, details) {
  event.source?.postMessage({
    type: "barz:import-reference-result",
    schemaVersion: "1.0",
    requestId,
    ...details
  }, referenceLibraryOrigin);
}

async function importReferenceFromLibrary(event) {
  if (event.origin !== referenceLibraryOrigin || event.source !== referenceLibraryPopup) return;
  const message = event.data;
  if (message?.type === "barz:library-ready" && message?.schemaVersion === "1.0" &&
      message?.source === "barz-ai-lib") {
    stopReferenceLibraryHandshake();
    elements.formMessage.textContent = "Bibliothèque connectée à l’Aggregator.";
    return;
  }
  if (message?.type !== "barz:import-reference" || message?.schemaVersion !== "1.0" ||
      message?.source !== "barz-ai-lib" || !message?.requestId || !message?.asset) return;
  const requestId = String(message.requestId);
  if (importingLibraryRequests.has(requestId)) return;
  importingLibraryRequests.add(requestId);
  try {
    const body = await request("/api/reference-imports/from-library", {
      method: "POST",
      body: JSON.stringify(message)
    });
    if (!state.resources.some((resource) => resource.id === body.resource.id)) {
      state.resources.unshift(body.resource);
    }
    const asset = uploadedAssets().find((item) => item.resource.id === body.resource.id);
    const references = currentReferences();
    const alreadyInDeck = references.some((reference) => reference.id === asset?.key);
    let referenceTag = alreadyInDeck
      ? referenceTokenAt(references, references.findIndex((reference) => reference.id === asset.key))
      : "";
    let added = false;
    const imageSlotUnavailable = state.videoMode === "motion-transfer" &&
      references.some((reference) => reference.kind === "image");
    if (asset && !alreadyInDeck && !imageSlotUnavailable && references.length < referenceLimit()) {
      state.referencesByMedia[referenceStorageKey()] = [...references, assetToReference(asset)];
      const nextReferences = currentReferences();
      referenceTag = referenceTokenAt(nextReferences, nextReferences.length - 1);
      added = true;
    }
    renderAssets();
    renderReferences();
    const messageText = added
      ? `Référence importée comme ${referenceTag} et enregistrée dans Assets.`
      : alreadyInDeck
        ? `Cette image est déjà présente comme ${referenceTag}.`
        : "Image enregistrée dans Assets. Ce mode ne peut pas accepter une autre référence.";
    elements.formMessage.textContent = messageText;
    libraryReferenceResult(event, requestId, {
      ok: true,
      duplicate: Boolean(body.duplicate || alreadyInDeck),
      status: body.duplicate || alreadyInDeck ? "duplicate" : "imported",
      referenceTag,
      savedToAssets: true,
      message: messageText
    });
  } catch (error) {
    elements.formMessage.textContent = `Import depuis la bibliothèque impossible : ${error.message}`;
    libraryReferenceResult(event, requestId, {
      ok: false,
      savedToAssets: false,
      message: error.message
    });
  } finally {
    importingLibraryRequests.delete(requestId);
  }
}

function referenceTargetIndex(target = state.referenceReplacementTarget) {
  if (!target) return -1;
  return (state.referencesByMedia[target.mediaType] || [])
    .findIndex((reference) => reference.id === target.referenceId);
}

function openReferenceAssetPicker(replacementTarget = null, returnView = null) {
  const pickerReturnView = returnView || (state.view === "director" ? "director" : "create");
  closeReferenceAddMenu();
  state.referenceReplacementTarget = replacementTarget;
  state.referencePickerActive = true;
  state.referencePickerReturnView = pickerReturnView;
  state.assetFilter = pickerReturnView.startsWith("director") ? "image" : "all";
  state.collectionFilter = "all";
  state.selectedAssets.clear();
  state.selectionFormatTouched = false;
  showAssets();
  const targetIndex = referenceTargetIndex(replacementTarget);
  elements.resourceImportMessage.textContent = replacementTarget && targetIndex !== -1
    ? `Choisis un média du même type pour remplacer ${referenceTokenAt(state.referencesByMedia[replacementTarget.mediaType] || [], targetIndex)}.`
    : pickerReturnView === "director-storyboard"
      ? "Sélectionne jusqu’à 16 images, puis envoie-les vers le script Director."
    : pickerReturnView === "director"
      ? "Choisis une ou deux images, puis utilise l’icône d’envoi vers les références Director."
    : "Choisis une image, une vidéo ou un son, puis utilise l’icône d’envoi vers les références.";
}

function updateVisibleReferenceTokens() {
  const references = [...elements.referenceList.children]
    .map((chip) => currentReferences().find((reference) => reference.id === chip.dataset.referenceId))
    .filter(Boolean);
  [...elements.referenceList.children].forEach((chip, index) => {
    const token = referenceTokenAt(references, index);
    const button = chip.querySelector("[data-insert-reference]");
    if (!button) return;
    button.dataset.insertReference = token;
    button.textContent = token;
    button.setAttribute("aria-label", `Insérer ${token} dans le prompt`);
  });
}

function positionDraggedReference(clientX, clientY) {
  const chip = referenceDrag.chip;
  if (!chip) return;
  const x = clientX - referenceDrag.startX
    + referenceDrag.startOffsetLeft - chip.offsetLeft;
  const y = clientY - referenceDrag.startY
    + referenceDrag.startOffsetTop - chip.offsetTop;
  chip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function animateReferenceShift(previousPositions) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  [...elements.referenceList.children].forEach((chip) => {
    if (chip === referenceDrag.chip) return;
    const previous = previousPositions.get(chip);
    if (!previous) return;
    const current = chip.getBoundingClientRect();
    const x = previous.left - current.left;
    const y = previous.top - current.top;
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return;
    referenceShiftAnimations.get(chip)?.cancel();
    const animation = chip.animate([
      { transform: `translate3d(${x}px, ${y}px, 0)` },
      { transform: "translate3d(0, 0, 0)" }
    ], {
      duration: 190,
      easing: "cubic-bezier(.2, .78, .24, 1)",
      fill: "none"
    });
    referenceShiftAnimations.set(chip, animation);
    animation.finished.catch(() => {}).finally(() => {
      if (referenceShiftAnimations.get(chip) === animation) {
        referenceShiftAnimations.delete(chip);
      }
    });
  });
}

function clearReferenceDragTimer() {
  if (referenceDrag.timer) clearTimeout(referenceDrag.timer);
  referenceDrag.timer = null;
}

function resetReferenceDrag() {
  clearReferenceDragTimer();
  if (referenceDrag.chip) {
    referenceDrag.chip.classList.remove("is-dragging");
    referenceDrag.chip.style.removeProperty("transform");
  }
  elements.referenceList.classList.remove("is-reordering");
  referenceDrag.pointerId = null;
  referenceDrag.chip = null;
  referenceDrag.image = null;
  referenceDrag.active = false;
}

function startReferenceHold(event) {
  const image = event.target.closest(".reference-chip img");
  if (!image || (event.button !== undefined && event.button !== 0)) return;
  resetReferenceDrag();
  referenceDrag.pointerId = event.pointerId;
  referenceDrag.chip = image.closest(".reference-chip");
  referenceDrag.image = image;
  referenceDrag.startX = event.clientX;
  referenceDrag.startY = event.clientY;
  referenceDrag.lastX = event.clientX;
  referenceDrag.lastY = event.clientY;
  image.setPointerCapture?.(event.pointerId);
  referenceDrag.timer = setTimeout(() => {
    referenceDrag.active = true;
    referenceDrag.suppressClick = true;
    closeReferencePreviews();
    referenceDrag.startX = referenceDrag.lastX;
    referenceDrag.startY = referenceDrag.lastY;
    referenceDrag.startOffsetLeft = referenceDrag.chip?.offsetLeft || 0;
    referenceDrag.startOffsetTop = referenceDrag.chip?.offsetTop || 0;
    referenceDrag.chip?.classList.add("is-dragging");
    elements.referenceList.classList.add("is-reordering");
  }, 450);
}

function moveHeldReference(event) {
  if (event.pointerId !== referenceDrag.pointerId) return;
  referenceDrag.lastX = event.clientX;
  referenceDrag.lastY = event.clientY;
  if (!referenceDrag.active) return;
  event.preventDefault();
  positionDraggedReference(event.clientX, event.clientY);
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".reference-chip");
  const chip = referenceDrag.chip;
  if (!target || !chip || target === chip || target.parentElement !== elements.referenceList) return;
  const bounds = target.getBoundingClientRect();
  const sameRow = event.clientY >= bounds.top && event.clientY <= bounds.bottom;
  const insertBefore = sameRow
    ? event.clientX < bounds.left + bounds.width / 2
    : event.clientY < bounds.top + bounds.height / 2;
  if ((insertBefore && chip.nextElementSibling === target)
    || (!insertBefore && target.nextElementSibling === chip)) return;
  const previousPositions = new Map([...elements.referenceList.children]
    .filter((item) => item !== chip)
    .map((item) => [item, item.getBoundingClientRect()]));
  elements.referenceList.insertBefore(chip, insertBefore ? target : target.nextSibling);
  positionDraggedReference(event.clientX, event.clientY);
  updateVisibleReferenceTokens();
  animateReferenceShift(previousPositions);
}

function finishReferenceHold(event) {
  if (event.pointerId !== referenceDrag.pointerId) return;
  clearReferenceDragTimer();
  if (referenceDrag.active) {
    const referenceById = new Map(currentReferences().map((reference) => [reference.id, reference]));
    const reordered = [...elements.referenceList.children]
      .map((chip) => referenceById.get(chip.dataset.referenceId))
      .filter(Boolean);
    state.referencesByMedia[referenceStorageKey()] = reordered;
    elements.formMessage.textContent = "Ordre des références mis à jour.";
    renderReferences();
    setTimeout(() => { referenceDrag.suppressClick = false; }, 0);
  }
  resetReferenceDrag();
}

function toggleReferencePreview(image) {
  const chip = image.closest(".reference-chip");
  const willExpand = !chip.classList.contains("is-expanded");
  closeReferencePreviews();
  chip.classList.toggle("is-expanded", willExpand);
  image.setAttribute("aria-expanded", String(willExpand));
}

function closeReferencePreviews() {
  elements.referenceList.querySelectorAll(".reference-chip.is-expanded").forEach((item) => {
    item.classList.remove("is-expanded");
    item.querySelector("img")?.setAttribute("aria-expanded", "false");
  });
}

function renderReferenceSets() {
  elements.saveReferenceSetButton.disabled = currentReferences().length === 0;
  elements.referenceSetList.innerHTML = state.referenceSets.length
    ? state.referenceSets.map((referenceSet) => {
      const visibleReferences = referenceSet.references.slice(0, 5);
      const remaining = referenceSet.references.length - visibleReferences.length;
      return `
        <article class="reference-set-card ${referenceSet.references.some((reference) => reference.missing) ? "has-missing" : ""}">
          <div>
            <strong>${escapeHtml(referenceSet.name)}</strong>
            <div class="reference-set-preview">
              ${visibleReferences.map((reference) => `
                <span class="reference-set-thumb ${reference.missing ? "is-missing" : ""}">
                  ${reference.kind === "image" || !reference.kind
                    ? `<img src="${escapeHtml(reference.previewUrl || reference.url)}" alt="">`
                    : `<b aria-label="${reference.kind === "audio" ? "Audio" : "Vidéo"}">${reference.kind === "audio" ? "♪" : "▶"}</b>`}
                  ${reference.missing ? "<i>!</i>" : ""}
                </span>
              `).join("")}
              ${remaining > 0 ? `<span>+${remaining}</span>` : ""}
            </div>
            ${referenceSet.references.some((reference) => reference.missing)
              ? '<span class="reference-set-missing-label">Missing</span>'
              : ""}
          </div>
          <div class="reference-set-actions">
            <button class="reference-set-load" type="button"
              data-load-reference-set="${escapeHtml(referenceSet.id)}">Charger</button>
            <button class="reference-set-delete" type="button"
              data-delete-reference-set="${escapeHtml(referenceSet.id)}"
              aria-label="Supprimer ${escapeHtml(referenceSet.name)}">×</button>
          </div>
        </article>
      `;
    }).join("")
    : '<p class="empty-state compact-empty">Aucun set sauvegardé.</p>';
}

function openReferenceSetDialog() {
  elements.referenceSetNameInput.value = "";
  elements.referenceSetMessage.textContent = currentReferences().length
    ? `${currentReferences().length} référence${currentReferences().length > 1 ? "s" : ""} prête${currentReferences().length > 1 ? "s" : ""} à sauvegarder.`
    : "Ajoute au moins une référence pour créer un set.";
  renderReferenceSets();
  elements.referenceSetDialog.showModal();
  if (currentReferences().length) elements.referenceSetNameInput.focus();
}

async function saveReferenceSet() {
  const name = elements.referenceSetNameInput.value.trim();
  if (!name) {
    elements.referenceSetMessage.textContent = "Donne un nom au set.";
    elements.referenceSetNameInput.focus();
    return;
  }
  elements.saveReferenceSetButton.disabled = true;
  elements.referenceSetMessage.textContent = "Sauvegarde…";
  try {
    const body = await request("/api/reference-sets", {
      method: "POST",
      body: JSON.stringify({ name, references: currentReferences() })
    });
    state.referenceSets.push(body.referenceSet);
    elements.referenceSetNameInput.value = "";
    elements.referenceSetMessage.textContent = `Set « ${body.referenceSet.name} » sauvegardé.`;
    renderReferenceSets();
  } catch (error) {
    elements.referenceSetMessage.textContent = error.message;
    elements.saveReferenceSetButton.disabled = currentReferences().length === 0;
  }
}

function loadReferenceSet(id) {
  const referenceSet = state.referenceSets.find((item) => item.id === id);
  if (!referenceSet) return;
  state.referencesByMedia[state.mediaType] = structuredClone(referenceSet.references).slice(0, referenceLimit());
  renderReferences();
  elements.referenceSetDialog.close("load");
  elements.formMessage.textContent = `Set « ${referenceSet.name} » chargé dans le lanceur ${mediaCopy[state.mediaType].context.replace("Génération ", "").toLowerCase()}.`;
}

async function deleteReferenceSet(id) {
  const referenceSet = state.referenceSets.find((item) => item.id === id);
  if (!referenceSet || !window.confirm(`Supprimer le set « ${referenceSet.name} » ?`)) return;
  elements.referenceSetMessage.textContent = "Suppression…";
  try {
    await request(`/api/reference-sets/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.referenceSets = state.referenceSets.filter((item) => item.id !== id);
    elements.referenceSetMessage.textContent = `Set « ${referenceSet.name} » supprimé.`;
    renderReferenceSets();
  } catch (error) {
    elements.referenceSetMessage.textContent = error.message;
  }
}

function assetToReference(asset) {
  return {
    kind: referenceKindFromAsset(asset),
    id: asset.key,
    label: assetRecordName(asset),
    url: asset.media.url
  };
}

function replaceReferenceWithAsset(asset) {
  const target = state.referenceReplacementTarget;
  if (!target) return false;
  const references = state.referencesByMedia[target.mediaType] || [];
  const index = referenceTargetIndex(target);
  const expectedKind = references[index]?.kind || "image";
  if (!asset || referenceKindFromAsset(asset) !== expectedKind) {
    const message = `Choisis un média ${expectedKind} pour ce remplacement.`;
    elements.selectionMessage.textContent = message;
    elements.resourceImportMessage.textContent = message;
    return true;
  }
  if (index === -1) {
    state.referenceReplacementTarget = null;
    const message = "La référence à remplacer n’est plus dans le lanceur.";
    elements.selectionMessage.textContent = message;
    elements.resourceImportMessage.textContent = message;
    return true;
  }
  const replacement = assetToReference(asset);
  if (references.some((reference, referenceIndex) => (
    referenceIndex !== index && reference.id === replacement.id
  ))) {
    const message = "Ce média est déjà utilisé dans ce lanceur.";
    elements.selectionMessage.textContent = message;
    elements.resourceImportMessage.textContent = message;
    return true;
  }
  state.referencesByMedia[target.mediaType] = references.map((reference, referenceIndex) => (
    referenceIndex === index ? replacement : reference
  ));
  state.referenceReplacementTarget = null;
  state.referencePickerActive = false;
  state.referencePickerReturnView = null;
  state.selectedAssets.clear();
  state.selectionFormatTouched = false;
  renderJobs();
  renderSelectionTray();
  if (target.mediaType === "motionTransfer") selectVideoMode("motion-transfer");
  else selectMedia(target.mediaType);
  renderReferences();
  elements.formMessage.textContent =
    `${referenceTokenAt(state.referencesByMedia[target.mediaType], index)} remplacé par ${assetRecordName(asset)}. L’ordre du set est conservé.`;
  return true;
}

function sendAssetsToReferences(assets) {
  const media = assets.filter((asset) => referenceKindFromAsset(asset));
  if (!media.length) {
    elements.selectionMessage.textContent = "Choisis une image, une vidéo ou un son compatible.";
    return;
  }
  if (state.referenceReplacementTarget) {
    replaceReferenceWithAsset(media[0]);
    return;
  }
  const pickerReturnView = state.referencePickerReturnView;
  if (pickerReturnView === "director-storyboard") {
    const images = media.filter((asset) => asset.mediaType === "image");
    const added = addDirectorStoryboardReferences(images.map(assetToReference));
    state.selectedAssets.clear();
    state.selectionFormatTouched = false;
    state.referencePickerActive = false;
    state.referencePickerReturnView = null;
    renderJobs();
    renderSelectionTray();
    showDirector();
    elements.directorMessage.textContent = added
      ? `${added} image${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""} au script natif.`
      : "Ces images sont déjà dans le script, ou la limite de 16 est atteinte.";
    return;
  }
  const targetMediaType = pickerReturnView === "director" ? "video" : referenceStorageKey();
  const limit = pickerReturnView === "director" ? 2 : referenceLimit();
  const existing = state.referencesByMedia[targetMediaType] || [];
  const merged = [...existing];
  let added = 0;
  let eligible = pickerReturnView === "director"
    ? media.filter((asset) => asset.mediaType === "image")
    : media;
  if (state.videoMode === "motion-transfer" && pickerReturnView !== "director") {
    const existingKinds = new Set(existing.map((reference) => reference.kind));
    eligible = eligible.filter((asset) => {
      const kind = referenceKindFromAsset(asset);
      return ["image", "video"].includes(kind) && !existingKinds.has(kind);
    });
  }
  eligible.forEach((asset) => {
    const reference = assetToReference(asset);
    if (!merged.some((item) => item.id === reference.id) && merged.length < limit) {
      merged.push(reference);
      added += 1;
    }
  });
  state.referencesByMedia[targetMediaType] = merged;
  state.selectedAssets.clear();
  state.selectionFormatTouched = false;
  state.referencePickerActive = false;
  state.referencePickerReturnView = null;
  renderJobs();
  renderSelectionTray();
  if (pickerReturnView === "director") {
    showDirector();
    renderReferences();
    elements.directorMessage.textContent = added === 0
      ? "Ces images sont déjà utilisées, ou les deux emplacements sont occupés."
      : added === 1
        ? "Image ajoutée à Director et au deck Vidéo."
        : `${added} images ajoutées à Director et au deck Vidéo.`;
  } else {
    if (targetMediaType === "motionTransfer") selectVideoMode("motion-transfer");
    else selectMedia(state.mediaType);
    renderReferences();
    elements.formMessage.textContent = added === 0
      ? "Ces images sont déjà dans les références de ce lanceur."
      : added === 1
        ? "Média ajouté aux références. Le lanceur est prêt, aucune génération n’a été lancée."
        : `${added} médias ajoutés aux références. Aucune génération n’a été lancée.`;
  }
}

function renderCollections() {
  const assets = categoryAssets();
  const buttons = [
    { id: "all", name: "Tous les assets", count: assets.length, custom: false },
    {
      id: "unfiled",
      name: "Sans collection",
      count: assets.filter((asset) => !asset.collectionId).length,
      custom: false
    },
    ...state.collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      count: assets.filter((asset) => asset.collectionId === collection.id).length,
      custom: true
    }))
  ];
  elements.collectionList.innerHTML = buttons.map((collection) => `
    <button class="collection-button ${
      collection.id === state.collectionFilter ? "active" : ""
    }" type="button" data-collection-filter="${escapeHtml(collection.id)}"
      ${collection.custom ? `data-collection-id="${escapeHtml(collection.id)}"
        title="Clic droit pour gérer"` : ""}>
      <span>${escapeHtml(collection.name)}</span><span>${collection.count}</span>
    </button>
  `).join("");
  elements.moveCollectionInput.innerHTML = `
    <option value="">Sans collection</option>
    <option value="__create__">＋ Créer une collection…</option>
    ${state.collections.map((collection) => `
      <option value="${escapeHtml(collection.id)}">${escapeHtml(collection.name)}</option>
    `).join("")}
  `;
  const moveTargetExists = !state.moveCollectionId || state.collections.some((item) => (
    item.id === state.moveCollectionId
  ));
  if (!moveTargetExists) state.moveCollectionId = "";
  elements.moveCollectionInput.value = state.moveCollectionId;
  elements.moveCollectionInput.disabled = false;
  elements.moveSelectionButton.disabled = false;
}

function assetMatchesFilters(asset) {
  const mediaMatches = state.assetFilter === "all" || asset.mediaType === state.assetFilter;
  const collectionMatches = state.collectionFilter === "all" || (
    state.collectionFilter === "unfiled"
      ? !asset.collectionId
      : asset.collectionId === state.collectionFilter
  );
  return mediaMatches && collectionMatches;
}

function assetDisplayName(job, index) {
  return job.assetNames?.[String(index)] || modelLabel(job);
}

function assetRecordName(asset) {
  return asset.kind === "resource"
    ? asset.resource.name
    : assetDisplayName(asset.job, asset.index);
}

function renderRecordOverlays(asset) {
  const checked = state.selectedAssets.has(asset.key) ? "checked" : "";
  const downloadUrl = asset.kind === "resource"
    ? `/api/resources/${encodeURIComponent(asset.resource.id)}/download`
    : `/api/jobs/${encodeURIComponent(asset.job.id)}/download/${asset.index}`;
  return `
    <label class="asset-overlay-button asset-select" title="Sélectionner">
      <input type="checkbox" data-select-asset="${escapeHtml(asset.key)}" ${checked}
        aria-label="Sélectionner ce média">
      <span aria-hidden="true">✓</span>
    </label>
    <a class="asset-overlay-button asset-download" href="${downloadUrl}" download
      aria-label="Télécharger ce média" title="Télécharger">${downloadIcon()}</a>
  `;
}

function renderAssetTile(asset) {
  const { job, resource, media, index } = asset;
  const key = asset.key;
  const selected = state.selectedAssets.has(key);
  const safeUrl = escapeHtml(media.url);
  const name = assetRecordName(asset);
  const label = escapeHtml(name);
  const isVideo = asset.mediaType === "video" || media.contentType.startsWith("video/");
  const isAudio = asset.mediaType === "music" || media.contentType.startsWith("audio/");
  const mediaMarkup = isVideo
    ? `<video controls playsinline preload="metadata" src="${safeUrl}" aria-label="${label}"></video>`
    : isAudio
      ? `<div class="asset-audio-preview"><span aria-hidden="true">♪</span>
          <audio controls preload="metadata" src="${safeUrl}" aria-label="${label}"></audio></div>`
      : `<img src="${safeUrl}" alt="${label}" loading="lazy">`;
  const collection = state.collections.find((item) => item.id === asset.collectionId);
  const sourceCaption = asset.kind === "resource"
    ? "Ressource locale"
    : job.assetNames?.[String(index)] ? modelLabel(job) : "Generated";
  const previewMarkup = !isVideo && !isAudio
    ? `<button class="asset-preview" type="button" data-preview-image-url="${safeUrl}"
        data-preview-image-alt="${label}" aria-label="Afficher ${label} en plein écran">${mediaMarkup}</button>`
    : asset.kind === "resource"
      ? `<div class="asset-preview asset-preview-video">${mediaMarkup}</div>`
      : `<button class="asset-preview" type="button" data-open-job="${escapeHtml(job.id)}"
          aria-label="Voir le détail">${mediaMarkup}</button>`;
  const replacementIndex = referenceTargetIndex();
  const referenceActionLabel = replacementIndex === -1
    ? `Envoyer ${name} vers les références`
    : `Remplacer @image${replacementIndex + 1} par ${name}`;
  const referenceActionTitle = replacementIndex === -1
    ? "Envoyer vers les références"
    : `Remplacer @image${replacementIndex + 1}`;
  return `
    <figure class="asset-tile ${selected ? "selected" : ""}"
      ${resource ? `data-resource-id="${escapeHtml(resource.id)}"` : ""}>
      <div class="result-frame">
        ${previewMarkup}
        ${renderRecordOverlays(asset)}
      </div>
      <figcaption>
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(sourceCaption)} · ${escapeHtml(collection?.name || "Sans collection")}
          · ${escapeHtml(formatDetailDate(asset.createdAt))}</span>
        ${asset.mediaType === "image" && state.assetCategory !== "trash" ? `
          <button class="asset-reference-button" type="button"
            data-send-reference="${escapeHtml(asset.key)}"
            aria-label="${escapeHtml(referenceActionLabel)}"
            title="${escapeHtml(referenceActionTitle)}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h11"></path><path d="m11 8 4 4-4 4"></path>
              <path d="M16 5h4v14h-4"></path>
            </svg>
          </button>
        ` : ""}
      </figcaption>
    </figure>
  `;
}

function renderAssets() {
  renderCollections();
  document.querySelectorAll("[data-asset-category]").forEach((button) => {
    button.classList.toggle("active", button.dataset.assetCategory === state.assetCategory);
  });
  document.querySelectorAll("[data-asset-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.assetFilter === state.assetFilter);
  });
  const assets = categoryAssets().filter(assetMatchesFilters);
  elements.assetGallery.innerHTML = assets.length
    ? assets.map(renderAssetTile).join("")
    : state.assetCategory === "trash"
      ? '<p class="asset-empty">La corbeille est vide.</p>'
    : state.assetCategory === "resources" && state.resources.length === 0
      ? '<p class="asset-empty">Aucune ressource importée. Utilise « Import ressource » dans la barre de gauche.</p>'
      : '<p class="asset-empty">Aucun média ne correspond à ces filtres.</p>';
  renderSelectionTray();
}

function renderSelectionTray() {
  const selected = selectedAssetRecords();
  elements.selectionTray.classList.toggle("hidden", selected.length === 0);
  elements.selectionTray.classList.toggle("is-trash", state.assetCategory === "trash");
  elements.trashSelectionButton.classList.toggle("hidden", state.assetCategory === "trash");
  elements.restoreSelectionButton.classList.toggle("hidden", state.assetCategory !== "trash");
  elements.selectionCount.textContent = String(selected.length);
  elements.renameAssetsInput.placeholder = selected.length > 1
    ? "ex. monsieur → monsieur_001"
    : "Nom du fichier";
  const mediaTypes = new Set(selected.map((asset) => asset.mediaType));
  const imageOnly = mediaTypes.size === 1 && mediaTypes.has("image");
  const replacingReference = Boolean(state.referenceReplacementTarget);
  const validReferenceSelection = imageOnly && (!replacingReference || selected.length === 1);
  const noImages = selected.length > 0 && !mediaTypes.has("image");
  elements.archiveFormat.querySelector('[value="jpg"]').disabled = !imageOnly;
  elements.archiveFormat.querySelector('[value="png"]').disabled = !imageOnly;
  elements.archiveFormat.querySelector('[value="webm"]').disabled = !noImages;
  elements.sendSelectionToReferencesButton.disabled = !validReferenceSelection;
  elements.sendSelectionToReferencesButton.title = validReferenceSelection
    ? replacingReference ? "Remplacer la référence" : "Envoyer vers les références"
    : replacingReference
      ? "Sélectionne une seule image"
      : "Sélectionne uniquement des images";
  const resourcesOnly = selected.length > 0 && selected.every((asset) => asset.kind === "resource");
  elements.deleteSelectedResourcesButton.classList.toggle("hidden", !resourcesOnly || state.assetCategory === "trash");
  const selectedOption = elements.archiveFormat.selectedOptions[0];
  if (!state.selectionFormatTouched && selected.length) {
    elements.archiveFormat.value = imageOnly ? "jpg" : noImages ? "webm" : "original";
  } else if (selectedOption?.disabled) {
    elements.archiveFormat.value = imageOnly ? "jpg" : noImages ? "webm" : "original";
  }
}

function toggleAssetSelection(input) {
  if (state.selectedAssets.size === 0 && input.checked) state.selectionFormatTouched = false;
  if (input.checked) state.selectedAssets.add(input.dataset.selectAsset);
  else state.selectedAssets.delete(input.dataset.selectAsset);
  elements.selectionMessage.textContent = "";
  renderJobs();
  renderAssets();
}

function formatCurrencyAmount(amount, currency = "USD") {
  return Number(amount).toLocaleString("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
}

function formatSpendingTotals(totals) {
  if (!totals.size) return formatCurrencyAmount(0);
  return [...totals.entries()].map(([currency, amount]) => (
    formatCurrencyAmount(amount, currency)
  )).join(" + ");
}

function renderProviderCredits() {
  const fal = state.falCreditStatus;
  const heygen = state.heygenCreditStatus;
  let falBalance = "Actualisation…";
  let falDetail = "Connexion sécurisée au compte fal";
  if (fal?.error) {
    falBalance = "Indisponible";
    falDetail = fal.error;
  } else if (fal && !fal.configured) {
    falBalance = "Non connecté";
    falDetail = "Ajoute la clé fal dans Connexions.";
  } else if (fal?.billingAvailable === false) {
    falBalance = "Solde non accessible";
    falDetail = "Cette clé est reconnue, mais sa portée ne permet pas de lire le solde.";
  } else if (Number.isFinite(Number(fal?.credits?.current_balance))) {
    falBalance = formatCurrencyAmount(fal.credits.current_balance, fal.credits.currency || "USD");
    falDetail = fal.username || "Compte fal";
  }
  let heygenBalance = "Actualisation…";
  let heygenDetail = "Connexion sécurisée au compte HeyGen";
  if (heygen?.error) {
    heygenBalance = "Indisponible";
    heygenDetail = heygen.error;
  } else if (heygen && !heygen.configured) {
    heygenBalance = "Non connecté";
    heygenDetail = "Ajoute la clé HeyGen dans Connexions.";
  } else if (Number.isFinite(Number(heygen?.wallet?.remainingBalance))) {
    heygenBalance = formatCurrencyAmount(
      heygen.wallet.remainingBalance,
      String(heygen.wallet.currency || "USD").toUpperCase()
    );
    heygenDetail = heygen.username || "Compte HeyGen";
  } else if (heygen?.configured) {
    heygenBalance = "Usage facturé";
    heygenDetail = heygen.username || heygen.billingType || "Compte HeyGen";
  }
  elements.providerCreditList.innerHTML = `
    <article class="provider-credit">
      <div class="provider-credit-name">
        <span class="provider-mark">fal</span>
        <span><strong>fal</strong><small>${escapeHtml(falDetail)}</small></span>
      </div>
      <strong class="provider-balance">${escapeHtml(falBalance)}</strong>
      <a href="https://fal.ai/dashboard/usage-billing/billing" target="_blank"
        rel="noopener noreferrer">Recharger</a>
    </article>
    <article class="provider-credit">
      <div class="provider-credit-name">
        <span class="provider-mark">HG</span>
        <span><strong>HeyGen</strong><small>${escapeHtml(heygenDetail)}</small></span>
      </div>
      <strong class="provider-balance">${escapeHtml(heygenBalance)}</strong>
      <a href="https://app.heygen.com/settings/billing" target="_blank"
        rel="noopener noreferrer">Gérer</a>
    </article>
  `;
}

async function refreshProviderCredits() {
  if (state.refreshingProviderCredits) return;
  state.refreshingProviderCredits = true;
  elements.refreshProviderCreditsButton.disabled = true;
  elements.providerCreditsMessage.textContent = "Actualisation…";
  renderProviderCredits();
  try {
    const [falStatus, heygenStatus] = await Promise.allSettled([
      request("/api/providers/fal/status"),
      request("/api/providers/heygen/status")
    ]);
    state.falCreditStatus = falStatus.status === "fulfilled"
      ? falStatus.value : { error: falStatus.reason.message };
    state.heygenCreditStatus = heygenStatus.status === "fulfilled"
      ? heygenStatus.value : { error: heygenStatus.reason.message };
    elements.providerCreditsMessage.textContent = `Actualisé à ${new Intl.DateTimeFormat(
      "fr-FR",
      { hour: "2-digit", minute: "2-digit", second: "2-digit" }
    ).format(new Date())}`;
  } catch (error) {
    state.falCreditStatus = { error: error.message };
    state.heygenCreditStatus = { error: error.message };
    elements.providerCreditsMessage.textContent = "Actualisation impossible";
  } finally {
    state.refreshingProviderCredits = false;
    elements.refreshProviderCreditsButton.disabled = false;
    renderProviderCredits();
  }
}

function spendingScopeLabel() {
  const anchor = state.spendingAnchor;
  if (state.spendingMode === "day") {
    const date = new Date(`${state.spendingSelectedDay}T12:00:00`);
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }
  if (state.spendingMode === "year") return String(anchor.getFullYear());
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric"
  }).format(anchor);
}

function spendingJobHref(id) {
  const url = new URL(location.href);
  url.searchParams.set("generation", id);
  return `${url.pathname}${url.search}`;
}

function renderSpendingCalendar() {
  const jobs = completedSpendJobs(state.jobs);
  const totalsByDay = new Map();
  for (const job of jobs) {
    const key = localDayKey(spendingDate(job));
    if (!totalsByDay.has(key)) totalsByDay.set(key, []);
    totalsByDay.get(key).push(job);
  }
  elements.spendingPeriodLabel.textContent = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric"
  }).format(state.spendingAnchor);
  const today = localDayKey(new Date());
  elements.spendingCalendar.innerHTML = calendarMonth(state.spendingAnchor).map((day) => {
    const dayJobs = totalsByDay.get(day.key) || [];
    const amount = formatSpendingTotals(spendingTotals(dayJobs));
    const classes = [
      !day.inMonth ? "outside" : "",
      day.key === today ? "today" : "",
      day.key === state.spendingSelectedDay ? "selected" : "",
      dayJobs.length ? "has-spending" : ""
    ].filter(Boolean).join(" ");
    const description = dayJobs.length
      ? `${dayJobs.length} génération${dayJobs.length > 1 ? "s" : ""}, ${amount}`
      : "Aucune dépense";
    return `<button class="calendar-day ${classes}" type="button"
      data-spending-date="${day.key}" aria-label="${escapeHtml(`${day.day}, ${description}`)}">
      <span>${day.day}</span>
      ${dayJobs.length ? `<strong>${escapeHtml(amount)}</strong>` : ""}
    </button>`;
  }).join("");
}

function renderSpending() {
  document.querySelectorAll("[data-spending-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.spendingMode === state.spendingMode);
  });
  renderSpendingCalendar();
  const jobs = jobsForSpendingPeriod(
    state.jobs,
    state.spendingMode,
    state.spendingAnchor,
    state.spendingSelectedDay
  );
  elements.spendingScopeLabel.textContent = spendingScopeLabel();
  elements.spendingTotal.textContent = formatSpendingTotals(spendingTotals(jobs));
  elements.spendingCount.textContent = `${jobs.length} génération${jobs.length > 1 ? "s" : ""}`;
  const groups = groupSpendingJobs(jobs, state.spendingMode);
  elements.spendingList.innerHTML = groups.length
    ? renderSpendingGroups(groups)
    : '<p class="spending-empty">Aucune génération terminée sur cette période.</p>';
}

function renderSpendingGroups(groups) {
  return groups.map((group) => `
    <section class="spending-group">
      <header>
        <h2>${escapeHtml(group.label)}</h2>
        <strong>${escapeHtml(formatSpendingTotals(spendingTotals(group.jobs)))}</strong>
      </header>
      <div>
        ${group.jobs.map((job) => {
          const generatedAt = spendingDate(job);
          const time = new Intl.DateTimeFormat("fr-FR", {
            hour: "2-digit",
            minute: "2-digit"
          }).format(generatedAt);
          return `<a class="spending-entry" href="${escapeHtml(spendingJobHref(job.id))}"
            data-open-spending-job="${escapeHtml(job.id)}">
            <time datetime="${escapeHtml(generatedAt.toISOString())}">${escapeHtml(time)}</time>
            <span>
              <strong>${escapeHtml(modelLabel(job))}</strong>
              <small>${escapeHtml(job.mediaType === "video" ? "Vidéo" :
                job.mediaType === "image" ? "Image" : "Son")}</small>
            </span>
            <b>${escapeHtml(formatJobCost(job))}</b>
            <i aria-hidden="true">↗</i>
          </a>`;
        }).join("")}
      </div>
    </section>
  `).join("");
}

function directorIsActive() {
  return Boolean(directorSession);
}

function directorCueValues({ keepEmpty = false } = {}) {
  const values = [...elements.directorCueList.querySelectorAll("textarea")]
    .map((input) => input.value);
  return keepEmpty ? values.slice(0, 20) : normalizeDirectorCues(values);
}

function persistDirectorCues() {
  try {
    localStorage.setItem(directorCueStorageKey, JSON.stringify({
      cues: directorCueValues({ keepEmpty: true }),
      auto: elements.directorCueAuto.checked,
      prompt: elements.directorPrompt.value,
      aspectRatio: elements.directorAspectRatio.value,
      resolution: elements.directorResolution.value,
      chunkDuration: elements.directorChunkDuration.value,
      memory: elements.directorMemory.value,
      seed: elements.directorSeed.value,
      limit: elements.directorLimit.value,
      storyboardEnabled: elements.directorStoryboardEnabled.checked,
      storyboard: directorStoryboard,
      storyboardPlan: directorStoryboardPlan
    }));
  } catch { /* Le brouillon reste utilisable même si le stockage est bloqué. */ }
}

function storedDirectorCues() {
  try {
    const saved = JSON.parse(localStorage.getItem(directorCueStorageKey) || "null");
    if (saved && Array.isArray(saved.cues)) {
      elements.directorCueAuto.checked = saved.auto !== false;
      elements.directorPrompt.value = typeof saved.prompt === "string" ? saved.prompt : "";
      const selectSaved = (select, value) => {
        if ([...select.options].some((option) => option.value === String(value))) {
          select.value = String(value);
        }
      };
      selectSaved(elements.directorAspectRatio, saved.aspectRatio);
      selectSaved(elements.directorResolution, saved.resolution);
      selectSaved(elements.directorChunkDuration, saved.chunkDuration);
      selectSaved(elements.directorLimit, saved.limit);
      if (saved.memory !== undefined) elements.directorMemory.value = String(saved.memory);
      if (saved.seed !== undefined) elements.directorSeed.value = String(saved.seed);
      directorStoryboard = normalizeDirectorStoryboard(saved.storyboard);
      directorStoryboardPlan = Array.isArray(saved.storyboardPlan)
        ? saved.storyboardPlan.slice(0, 16).map((item, index) => ({
          originalName: String(item?.originalName || "").slice(0, 180),
          offset: index === 0 ? 0 : Math.max(0, Math.round(Number(item?.offset) || index * 5)),
          prompt: String(item?.prompt || "").slice(0, 50_000)
        })).filter((item) => item.originalName)
        : [];
      elements.directorStoryboardEnabled.checked = saved.storyboardEnabled === true &&
        directorStoryboard.length > 1;
      return saved.cues.slice(0, 20).map((item) => String(item ?? "").slice(0, 50_000));
    }
  } catch { /* Repartir avec un bloc vide. */ }
  return [""];
}

function renderDirectorCueStatus() {
  const total = directorIsActive() ? directorCueQueue.length : directorCueValues().length;
  if (directorIsActive() && total) {
    const applied = Math.min(directorCueIndex, total);
    elements.directorCueStatus.textContent = directorCueWaitingVersion === null
      ? `${applied}/${total} appliqué${applied > 1 ? "s" : ""}`
      : `${applied}/${total} · envoi en cours`;
  } else {
    elements.directorCueStatus.textContent =
      `${total} bloc${total > 1 ? "s" : ""} prêt${total > 1 ? "s" : ""}`;
  }
  [...elements.directorCueList.children].forEach((row, index) => {
    row.classList.toggle("is-applied", directorIsActive() && index < directorCueIndex);
    row.classList.toggle("is-pending", directorIsActive() && index === directorCueIndex &&
      directorCueWaitingVersion !== null);
  });
}

function renderDirectorCues(cues = directorCueValues({ keepEmpty: true })) {
  const rows = cues.length ? cues.slice(0, 20) : [""];
  const locked = directorIsActive();
  elements.directorCueList.innerHTML = rows.map((cue, index) => `
    <label class="director-cue-row">
      <span>${index + 1}</span>
      <textarea rows="2" maxlength="50000" data-director-cue="${index}"
        aria-label="Bloc préparé ${index + 1}" ${locked ? "disabled" : ""}
        placeholder="Action précise pour ce bloc…">${escapeHtml(cue)}</textarea>
      <button type="button" data-remove-director-cue="${index}"
        aria-label="Supprimer le bloc ${index + 1}"
        ${locked || rows.length === 1 ? "disabled" : ""}>×</button>
    </label>`).join("");
  elements.directorCueAuto.disabled = locked;
  elements.directorAddCueButton.disabled = locked || rows.length >= 20;
  elements.directorClearCuesButton.disabled = locked;
  renderDirectorCueStatus();
}

function addDirectorCue() {
  if (directorIsActive()) return;
  const cues = directorCueValues({ keepEmpty: true });
  if (cues.length >= 20) return;
  cues.push("");
  renderDirectorCues(cues);
  elements.directorCueList.lastElementChild?.querySelector("textarea")?.focus();
  persistDirectorCues();
}

function clearDirectorCues() {
  if (directorIsActive()) return;
  renderDirectorCues([""]);
  persistDirectorCues();
}

function directorStoryboardValues() {
  if (!elements.directorStoryboardList) return directorStoryboard;
  return normalizeDirectorStoryboard(directorStoryboard.map((item, index) => {
    const row = elements.directorStoryboardList.querySelector(`[data-director-storyboard-row="${index}"]`);
    return {
      ...item,
      offset: index === 0 ? 0 : row?.querySelector("[data-storyboard-offset]")?.value,
      prompt: row?.querySelector("[data-storyboard-prompt]")?.value ?? item.prompt
    };
  }));
}

function renderDirectorStoryboard() {
  directorStoryboard = directorStoryboardValues();
  const locked = directorIsActive();
  const enabled = elements.directorStoryboardEnabled.checked;
  elements.directorStoryboardUploadButton.disabled = locked || directorStoryboard.length >= 16;
  elements.directorStoryboardAssetButton.disabled = locked || directorStoryboard.length >= 16;
  elements.directorStoryboardClearButton.disabled = locked ||
    (directorStoryboard.length === 0 && directorStoryboardPlan.length === 0);
  elements.directorStoryboardEnabled.disabled = locked || directorStoryboard.length < 2;
  elements.directorStoryboardList.closest(".director-storyboard")
    ?.setAttribute("aria-disabled", String(locked));
  elements.directorStoryboardStatus.textContent = directorStoryboard.length
    ? `${directorStoryboard.length}${directorStoryboardPlan.length ? ` / ${directorStoryboardPlan.length}` : ""} image${directorStoryboard.length > 1 ? "s" : ""} · ${directorStoryboard.at(-1).offset}s`
    : directorStoryboardPlan.length
      ? `0 / ${directorStoryboardPlan.length} images · plan prêt`
      : "Aucune image";
  elements.directorStoryboardList.innerHTML = directorStoryboard.length
    ? directorStoryboard.map((item, index) => `
      <div class="director-storyboard-row ${index === 0 ? "is-opening" : ""}"
        data-director-storyboard-row="${index}">
        <img src="${escapeHtml(item.reference.previewUrl || item.reference.url)}"
          alt="Image-clé ${index + 1}">
        <label class="director-storyboard-time">
          <span>${index === 0 ? "DÉBUT" : "ARRIVÉE"}</span>
          <input type="number" min="${index === 0 ? 0 : 3}" step="1"
            value="${index === 0 ? 0 : item.offset}" data-storyboard-offset
            aria-label="Heure de l’image-clé ${index + 1}" ${locked || index === 0 ? "disabled" : ""}>
        </label>
        <textarea rows="2" maxlength="50000" data-storyboard-prompt
          aria-label="Direction à partir de l’image-clé ${index + 1}" ${locked ? "disabled" : ""}
          placeholder="${index === 0 ? "Décris le mouvement qui part de cette image…" : "Décris ce qui arrive ensuite…"}">${escapeHtml(item.prompt)}</textarea>
        <div class="director-storyboard-controls">
          <button type="button" data-storyboard-move="up" data-storyboard-index="${index}"
            aria-label="Monter l’image ${index + 1}" ${locked || index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-storyboard-move="down" data-storyboard-index="${index}"
            aria-label="Descendre l’image ${index + 1}" ${locked || index === directorStoryboard.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" data-storyboard-remove data-storyboard-index="${index}"
            aria-label="Retirer l’image ${index + 1}" ${locked ? "disabled" : ""}>×</button>
        </div>
      </div>`).join("")
    : '<div class="director-storyboard-empty">Importe une suite d’images ou choisis-les dans Assets.</div>';
  if (enabled && directorStoryboard.length < 2) elements.directorStoryboardEnabled.checked = false;
}

function addDirectorStoryboardReferences(references) {
  const existingIds = new Set(directorStoryboard.map((item) => item.reference.id));
  const available = 16 - directorStoryboard.length;
  const additions = references.filter((reference) => !existingIds.has(reference.id)).slice(0, available);
  const spacing = Math.max(3, Number(elements.directorChunkDuration.value) || 5);
  additions.forEach((reference) => {
    directorStoryboard.push({
      reference,
      offset: directorStoryboard.length ? directorStoryboard.at(-1).offset + spacing : 0,
      prompt: ""
    });
  });
  if (directorStoryboard.length > 1) elements.directorStoryboardEnabled.checked = true;
  renderDirectorStoryboard();
  persistDirectorCues();
  return additions.length;
}

async function uploadDirectorStoryboardImages(files) {
  if (directorIsActive()) return;
  const accepted = [...files].filter((item) => item.type.startsWith("image/"));
  const queued = accepted.slice(0, Math.max(0, 16 - directorStoryboard.length));
  const imported = [];
  for (const [index, file] of queued.entries()) {
    elements.directorMessage.textContent = `Import script ${index + 1}/${queued.length} · ${file.name}…`;
    try {
      const resource = await uploadResourceFile(file);
      const asset = uploadedAssets().find((item) => item.resource.id === resource.id);
      if (asset) imported.push({ reference: assetToReference(asset), originalName: file.name });
    } catch (error) {
      elements.directorMessage.textContent = `${file.name} : ${error.message}`;
      break;
    }
  }
  const ordered = directorStoryboardPlan.length
    ? imported.sort((a, b) => {
      const aIndex = directorStoryboardPlan.findIndex((item) => item.originalName === a.originalName);
      const bIndex = directorStoryboardPlan.findIndex((item) => item.originalName === b.originalName);
      return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex);
    })
    : imported;
  const additions = ordered.map((item) => {
    const plan = directorStoryboardPlan.find((entry) => entry.originalName === item.originalName);
    return {
      reference: item.reference,
      offset: plan?.offset,
      prompt: plan?.prompt || ""
    };
  });
  const existingIds = new Set(directorStoryboard.map((item) => item.reference.id));
  additions.filter((item) => !existingIds.has(item.reference.id)).forEach((item) => {
    const spacing = Math.max(3, Number(elements.directorChunkDuration.value) || 5);
    directorStoryboard.push({
      ...item,
      offset: directorStoryboard.length === 0 ? 0
        : Number.isFinite(Number(item.offset)) ? Number(item.offset)
          : directorStoryboard.at(-1).offset + spacing
    });
  });
  directorStoryboard = normalizeDirectorStoryboard(directorStoryboard);
  if (directorStoryboard.length > 1) elements.directorStoryboardEnabled.checked = true;
  const added = additions.length;
  renderDirectorStoryboard();
  persistDirectorCues();
  elements.directorStoryboardUploadInput.value = "";
  renderAssets();
  elements.directorMessage.textContent = added
    ? `${added} image${added > 1 ? "s" : ""} importée${added > 1 ? "s" : ""} dans le script et Assets.`
    : "Aucune nouvelle image ajoutée au script.";
}

function clearDirectorStoryboard() {
  if (directorIsActive() || (!directorStoryboard.length && !directorStoryboardPlan.length)) return;
  directorStoryboard = [];
  directorStoryboardPlan = [];
  elements.directorStoryboardEnabled.checked = false;
  renderDirectorStoryboard();
  persistDirectorCues();
  elements.directorMessage.textContent = "Script natif effacé. Les images restent dans Assets.";
}

function transmitDirectorPrompt(prompt, label = "Direction") {
  if (!directorSession || !prompt) return null;
  directorPromptVersion += 1;
  directorSession.send({
    type: "prompt",
    prompt_version: directorPromptVersion,
    prompt,
    replan: true
  });
  appendDirectorLog(`${label} · direction ${directorPromptVersion} envoyée.`);
  return directorPromptVersion;
}

function sendNextDirectorCue() {
  clearTimeout(directorCueDispatchTimer);
  if (!directorSession || directorStopping || directorCueWaitingVersion !== null ||
      directorCueIndex >= directorCueQueue.length) return;
  const cueNumber = directorCueIndex + 1;
  directorCueWaitingVersion = transmitDirectorPrompt(
    directorCueQueue[directorCueIndex], `Séquence ${cueNumber}/${directorCueQueue.length}`
  );
  renderDirectorCueStatus();
}

function advanceDirectorCue(message, applied) {
  const version = Number(message.prompt_version);
  if (version !== directorCueWaitingVersion) return;
  const cueNumber = directorCueIndex + 1;
  directorCueIndex += 1;
  directorCueWaitingVersion = null;
  appendDirectorLog(applied
    ? `Séquence ${cueNumber}/${directorCueQueue.length} appliquée.`
    : `Séquence ${cueNumber}/${directorCueQueue.length} ignorée après refus.`);
  renderDirectorCueStatus();
  if (directorCueIndex < directorCueQueue.length) {
    directorCueDispatchTimer = setTimeout(sendNextDirectorCue, 200);
  } else {
    appendDirectorLog("Séquence automatique terminée.");
  }
}

function appendDirectorLog(message) {
  const line = document.createElement("p");
  line.textContent = `${new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).format(new Date())} · ${message}`;
  elements.directorLog.append(line);
  while (elements.directorLog.children.length > 40) elements.directorLog.firstElementChild.remove();
  elements.directorLog.scrollTop = elements.directorLog.scrollHeight;
}

function directorRate() {
  const base = Number(state.directorInfo?.pricing?.unitPrice);
  if (!Number.isFinite(base)) return null;
  return base * (elements.directorResolution.value === "1080p" ? 2 : 1);
}

function directorEstimatedCost(seconds = Number(elements.directorLimit.value)) {
  const rate = directorRate();
  return rate === null ? null : Math.max(1.2, Math.max(0, Number(seconds) || 0) * rate);
}

function renderDirectorQuote() {
  const cost = directorEstimatedCost();
  const price = Number(state.directorInfo?.pricing?.unitPrice);
  if (!Number.isFinite(price)) {
    elements.directorMaximumCost.textContent = state.directorInfoLoading
      ? "Chargement du tarif…" : "Tarif indisponible";
    elements.directorStartButton.disabled = true;
    return;
  }
  elements.directorMaximumCost.textContent = formatCurrencyAmount(cost);
  elements.directorPriceNote.textContent =
    `${formatCurrencyAmount(price)} / s${elements.directorResolution.value === "1080p" ? " × 2 en 1080P" : ""} · minimum fal 1,20 $.`;
  elements.directorStartButton.disabled = directorIsActive();
}

function renderDirectorReferences() {
  const references = (state.referencesByMedia.video || []).slice(0, 2);
  const locked = directorIsActive();
  elements.directorUploadReferenceButton.disabled = locked || references.length >= 2;
  elements.directorAssetReferenceButton.disabled = locked || references.length >= 2;
  elements.directorReferenceDrop.classList.toggle("is-locked", locked);
  elements.directorReferenceDrop.setAttribute("aria-disabled", String(locked));
  elements.directorReferenceList.innerHTML = references.length
    ? references.map((reference, index) => `<figure>
        <div class="director-reference-image">
          <img src="${escapeHtml(reference.previewUrl || reference.url)}"
            alt="${index === 0 ? "Première" : "Dernière"} image">
          <button type="button" data-remove-director-reference="${escapeHtml(reference.id)}"
            aria-label="Retirer l’image ${index === 0 ? "de début" : "de fin"}"
            ${locked ? "disabled" : ""}>×</button>
        </div>
        <figcaption>${index === 0 ? "Début" : "Fin"}</figcaption>
      </figure>`).join("")
    : `<span class="director-reference-empty">Dépose tes images ici</span>`;
}

async function loadDirectorInfo() {
  if (state.directorInfoLoading || state.directorInfo?.pricing) return;
  state.directorInfoLoading = true;
  renderDirectorQuote();
  try {
    const info = await request("/api/director/info");
    state.directorInfo = info;
    if (!info.configured) {
      elements.directorMessage.textContent = "Ajoute d’abord ta clé fal dans Connexions.";
    }
  } catch (error) {
    state.directorInfo = { error: error.message };
    elements.directorMessage.textContent = `Director : ${error.message}`;
  } finally {
    state.directorInfoLoading = false;
    renderDirectorQuote();
  }
}

function showDirector() {
  state.view = "director";
  elements.composer.classList.add("hidden");
  elements.activityPanel.classList.add("hidden");
  elements.assetLibrary.classList.add("hidden");
  elements.spendingView.classList.add("hidden");
  elements.apiView.classList.add("hidden");
  elements.loraLabView.classList.add("hidden");
  elements.directorView.classList.remove("hidden");
  elements.assetsButton.classList.remove("active");
  elements.spendingButton.classList.remove("active");
  elements.apiButton.classList.remove("active");
  elements.loraLabButton.classList.remove("active");
  elements.directorButton.classList.add("active");
  document.querySelectorAll("[data-media]").forEach((button) => button.classList.remove("active"));
  renderDirectorReferences();
  renderDirectorStoryboard();
  renderDirectorQuote();
  loadDirectorInfo();
}

function blockNavigationDuringDirector() {
  if (!directorIsActive()) return false;
  elements.directorMessage.textContent =
    "Arrête et sauvegarde la session avant de quitter la régie.";
  showDirector();
  return true;
}

function directorConfirmation() {
  const prompt = elements.directorPrompt.value.trim();
  if (!prompt) {
    elements.directorMessage.textContent = "Décris d’abord l’univers continu de la session.";
    elements.directorPrompt.focus();
    return;
  }
  const seed = elements.directorSeed.value.trim();
  if (seed && !Number.isSafeInteger(Number(seed))) {
    elements.directorMessage.textContent = "Le seed doit être un nombre entier valide.";
    return;
  }
  const cost = directorEstimatedCost();
  if (cost === null) {
    elements.directorMessage.textContent = "Le tarif fal doit être disponible avant de démarrer.";
    return;
  }
  directorStoryboard = directorStoryboardValues();
  const scripted = elements.directorStoryboardEnabled.checked;
  if (scripted) {
    try {
      validateDirectorStoryboard(directorStoryboard);
    } catch (error) {
      elements.directorMessage.textContent = error.message;
      return;
    }
    if (directorStoryboard.at(-1).offset > Number(elements.directorLimit.value)) {
      elements.directorMessage.textContent = "La dernière image-clé dépasse la limite d’arrêt automatique.";
      return;
    }
  }
  persistDirectorCues();
  const referenceCount = scripted
    ? directorStoryboard.length
    : (state.referencesByMedia.video || []).slice(0, 2).length;
  const cueCount = scripted ? 0 : (elements.directorCueAuto.checked ? directorCueValues().length : 0);
  elements.directorConfirmationSummary.innerHTML = `
    <dl>
      <div><dt>Résolution</dt><dd>${escapeHtml(elements.directorResolution.value.toUpperCase())}</dd></div>
      <div><dt>Arrêt automatique</dt><dd>${escapeHtml(elements.directorLimit.selectedOptions[0].textContent)}</dd></div>
      <div><dt>${scripted ? "Images-clés" : "Images d’ouverture"}</dt><dd>${referenceCount}</dd></div>
      <div><dt>Séquence</dt><dd>${scripted ? `Script natif · ${directorStoryboard.at(-1).offset}s` : cueCount ? `${cueCount} blocs live` : "Désactivée"}</dd></div>
      <div><dt>Coût estimé à cette limite</dt><dd>${escapeHtml(formatCurrencyAmount(cost))}</dd></div>
    </dl>`;
  elements.directorConfirmationMessage.textContent = "";
  elements.directorConfirmationDialog.showModal();
}

function setDirectorState(next, label) {
  elements.directorState.dataset.state = next;
  elements.directorState.textContent = label;
}

function startDirectorRecorder() {
  clearTimeout(directorRecorderTimer);
  if (directorRecorder || !directorCombinedStream?.getVideoTracks().length) return;
  if (!("MediaRecorder" in window)) {
    appendDirectorLog("Ce navigateur ne permet pas l’enregistrement local du flux.");
    return;
  }
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  const mimeType = candidates.find((item) => MediaRecorder.isTypeSupported(item)) || "";
  directorRecordedChunks = [];
  directorRecorder = new MediaRecorder(directorCombinedStream, mimeType ? { mimeType } : undefined);
  directorRecorder.addEventListener("dataavailable", (event) => {
    if (event.data?.size) directorRecordedChunks.push(event.data);
  });
  directorRecorder.addEventListener("error", () => appendDirectorLog("Erreur pendant l’enregistrement WebM."));
  directorRecorder.start(1000);
  appendDirectorLog("Enregistrement local démarré.");
}

function receiveDirectorMedia(stream) {
  if (!directorCombinedStream) directorCombinedStream = new MediaStream();
  stream.getTracks().forEach((track) => {
    if (!directorCombinedStream.getTracks().some((item) => item.id === track.id)) {
      directorCombinedStream.addTrack(track);
    }
  });
  elements.directorVideo.srcObject = directorCombinedStream;
  elements.directorScreenEmpty.classList.add("hidden");
  if (directorConfigured) directorRecorderTimer = setTimeout(startDirectorRecorder, 600);
}

function startDirectorPlayback() {
  if (directorStartedAt) return;
  directorStartedAt = Date.now();
  clearTimeout(directorPreparationTimer);
  directorPreparationTimer = null;
  directorClockTimer = setInterval(updateDirectorClock, 250);
  directorAutoStopTimer = setTimeout(() => requestDirectorStop("Limite vidéo atteinte."),
    Number(elements.directorLimit.value) * 1000);
  updateDirectorClock();
  if (directorCombinedStream?.getVideoTracks().length) {
    directorRecorderTimer = setTimeout(startDirectorRecorder, 600);
  }
  appendDirectorLog("Lecture utile démarrée · chronomètre et enregistrement synchronisés.");
}

function updateDirectorClock() {
  if (!directorStartedAt) return;
  const elapsed = Math.max(0, (Date.now() - directorStartedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);
  elements.directorElapsed.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const cost = directorEstimatedCost(elapsed);
  if (cost !== null) elements.directorRunningCost.textContent = `≈ ${formatCurrencyAmount(cost)}`;
}

async function saveDirectorRecording(sessionDetails) {
  if (!directorRecordedChunks.length) return null;
  const type = directorRecorder?.mimeType || "video/webm";
  const blob = new Blob(directorRecordedChunks, { type });
  if (!blob.size) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = new File([blob], `h3-max-director-${stamp}.webm`, { type });
  const resource = await uploadResourceFile(file);
  const body = await request("/api/director/sessions", {
    method: "POST",
    body: JSON.stringify({ resourceId: resource.id, ...sessionDetails })
  });
  const existingIndex = state.jobs.findIndex((job) => job.id === body.job.id);
  if (existingIndex === -1) state.jobs.unshift(body.job);
  else state.jobs[existingIndex] = body.job;
  renderSpending();
  appendDirectorLog(`Enregistrement ajouté à Assets : ${resource.name}.`);
  return resource;
}

async function finalizeDirectorSession(message = "Session terminée.") {
  if (directorFinalizing) return;
  directorFinalizing = true;
  clearInterval(directorClockTimer);
  clearTimeout(directorAutoStopTimer);
  clearTimeout(directorRecorderTimer);
  clearTimeout(directorStopFallback);
  clearTimeout(directorCueDispatchTimer);
  clearTimeout(directorPreparationTimer);
  directorPreparationTimer = null;
  updateDirectorClock();
  const completedAt = new Date().toISOString();
  const durationSeconds = directorStartedAt
    ? Math.max(0, (Date.now() - directorStartedAt) / 1000)
    : 0;
  const sessionDetails = {
    startedAt: directorStartedAt
      ? new Date(directorStartedAt).toISOString()
      : completedAt,
    completedAt,
    durationSeconds,
    resolution: elements.directorResolution.value,
    aspectRatio: elements.directorAspectRatio.value,
    unitPrice: Number(state.directorInfo?.pricing?.unitPrice),
    prompt: elements.directorPrompt.value,
    cues: directorCueValues()
  };
  const session = directorSession;
  directorSession = null;
  try { await session?.close(); } catch { /* La session est peut-être déjà fermée. */ }
  if (directorRecorder?.state === "recording") {
    await new Promise((resolve) => {
      directorRecorder.addEventListener("stop", resolve, { once: true });
      directorRecorder.stop();
    });
  }
  try {
    const resource = await saveDirectorRecording(sessionDetails);
    elements.directorMessage.textContent = resource
      ? `${message} Enregistrement sauvegardé dans Assets › Ressources.` : message;
  } catch (error) {
    elements.directorMessage.textContent = `${message} Sauvegarde locale impossible : ${error.message}`;
  }
  directorCombinedStream?.getTracks().forEach((track) => track.stop());
  directorCombinedStream = null;
  directorRecorder = null;
  directorRecordedChunks = [];
  elements.directorVideo.srcObject = null;
  elements.directorScreenEmpty.classList.remove("hidden");
  elements.directorStartButton.disabled = false;
  elements.directorStopButton.disabled = true;
  elements.directorLiveControls.disabled = true;
  setDirectorState("closed", "Terminée");
  directorStopping = false;
  directorFinalizing = false;
  directorConfigured = false;
  renderDirectorReferences();
  renderDirectorCues();
  renderDirectorStoryboard();
  renderDirectorQuote();
}

function requestDirectorStop(reason = "Arrêt demandé.") {
  if (!directorSession || directorStopping) return;
  directorStopping = true;
  elements.directorStopButton.disabled = true;
  elements.directorLiveControls.disabled = true;
  setDirectorState("opening", "Arrêt…");
  appendDirectorLog(reason);
  try { directorSession.send({ type: "stop" }); } catch { /* Fermeture forcée ci-dessous. */ }
  directorStopFallback = setTimeout(() => finalizeDirectorSession(reason), 4000);
}

function handleDirectorData(raw) {
  let message;
  try { message = JSON.parse(typeof raw === "string" ? raw : raw?.data || "{}"); }
  catch { return; }
  if (message.type === "configured") {
    directorConfigured = true;
    setDirectorState("live", "En direct");
    elements.directorLiveControls.disabled = false;
    appendDirectorLog("Configuration acceptée par H3 Max Director.");
    startDirectorPlayback();
    if (directorCueQueue.length) {
      appendDirectorLog(`Séquence automatique armée · ${directorCueQueue.length} blocs.`);
      directorCueDispatchTimer = setTimeout(sendNextDirectorCue, 200);
    }
  } else if (message.type === "chunk") {
    appendDirectorLog(`Bloc ${Number(message.chunk_index) + 1} · ${message.requested_duration_seconds || "?"} s.`);
  } else if (message.type === "prompt_pending") {
    appendDirectorLog(`Direction ${message.prompt_version} en attente.`);
  } else if (message.type === "prompt_applied") {
    appendDirectorLog(`Direction ${message.prompt_version} appliquée.`);
    advanceDirectorCue(message, true);
  } else if (message.type === "prompt_rejected") {
    appendDirectorLog(`Direction refusée : ${message.error || message.reason}.`);
    advanceDirectorCue(message, false);
  } else if (message.type === "deadline_missed") {
    appendDirectorLog("Un bloc est en retard ; l’image sera momentanément figée.");
  } else if (message.type === "stream_exhausted") {
    finalizeDirectorSession(`Session arrêtée : ${message.reason || "fin du flux"}.`);
  } else if (message.type === "error") {
    elements.directorMessage.textContent = message.error || "Erreur Director.";
    appendDirectorLog(`${message.code || "error"} · ${message.error || "Erreur Director"}`);
    finalizeDirectorSession("Session interrompue.");
  }
}

function handleDirectorTransportState(next) {
  if (next === "opening") setDirectorState("opening", "Connexion…");
  if (next === "live") {
    setDirectorState(directorConfigured ? "live" : "opening",
      directorConfigured ? "En direct" : "Préparation du script…");
    if (!directorConfigured && !directorPreparationTimer) {
      directorPreparationTimer = setTimeout(() => {
        if (!directorConfigured) requestDirectorStop("Préparation Director bloquée pendant 2 minutes.");
      }, 120_000);
    }
  }
  if (next === "failed") setDirectorState("failed", "Échec");
  if (next === "closed" && directorSession && !directorStopping) {
    finalizeDirectorSession("Connexion Director fermée.");
  }
}

async function startDirectorSession() {
  elements.directorConfirmStartButton.disabled = true;
  elements.directorConfirmationMessage.textContent = "Préparation des références…";
  try {
    const scripted = elements.directorStoryboardEnabled.checked;
    directorStoryboard = directorStoryboardValues();
    const references = scripted
      ? validateDirectorStoryboard(directorStoryboard).map((item) => item.reference)
      : (state.referencesByMedia.video || []).slice(0, 2);
    const staged = await request("/api/director/references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ references })
    });
    directorStartedAt = 0;
    directorPromptVersion = 1;
    directorCueQueue = !scripted && elements.directorCueAuto.checked ? directorCueValues() : [];
    directorCueIndex = 0;
    directorCueWaitingVersion = null;
    clearTimeout(directorCueDispatchTimer);
    directorStopping = false;
    directorFinalizing = false;
    directorConfigured = false;
    clearTimeout(directorPreparationTimer);
    directorPreparationTimer = null;
    directorCombinedStream = new MediaStream();
    directorRecordedChunks = [];
    elements.directorElapsed.textContent = "00:00";
    elements.directorRunningCost.textContent = formatCurrencyAmount(0);
    elements.directorLog.replaceChildren();
    const seedText = elements.directorSeed.value.trim();
    directorSession = openH3MaxDirector({
      onMedia: receiveDirectorMedia,
      onData: handleDirectorData,
      onState: handleDirectorTransportState,
      onError: (error) => {
        const message = error?.message || String(error);
        elements.directorMessage.textContent = `Director : ${message}`;
        appendDirectorLog(`Erreur · ${message}`);
        finalizeDirectorSession("Session interrompue.");
      }
    });
    renderDirectorReferences();
    renderDirectorCues();
    renderDirectorStoryboard();
    const configure = {
      type: "configure",
      prompt_version: directorPromptVersion,
      protocol_version: 1,
      prompt: elements.directorPrompt.value.trim(),
      acceleration: "regular",
      enable_safety_checker: true,
      resolution: elements.directorResolution.value,
      aspect_ratio: elements.directorAspectRatio.value,
      chunk_duration: Number(elements.directorChunkDuration.value),
      memory: Math.max(1, Math.min(50, Number(elements.directorMemory.value) || 12))
    };
    if (seedText) configure.seed = Number(seedText);
    if (scripted) {
      const compiled = compileDirectorScript(directorStoryboard, staged.urls || []);
      configure.image_url = compiled.imageUrl;
      configure.script = compiled.script;
    } else {
      if (staged.urls?.[0]) configure.image_url = staged.urls[0];
      if (staged.urls?.[1]) configure.end_image_url = staged.urls[1];
    }
    directorSession.send(configure);
    directorSession.ready.catch(() => undefined);
    elements.directorConfirmationDialog.close();
    elements.directorStartButton.disabled = true;
    elements.directorStopButton.disabled = false;
    elements.directorMessage.textContent = "Connexion à H3 Max Director…";
    setDirectorState("opening", "Connexion…");
    appendDirectorLog(scripted
      ? `Négociation WebRTC démarrée avec ${directorStoryboard.length} images-clés.`
      : "Négociation WebRTC démarrée.");
  } catch (error) {
    elements.directorConfirmationMessage.textContent = error.message;
  } finally {
    elements.directorConfirmStartButton.disabled = false;
  }
}

function sendDirectorPrompt() {
  const prompt = elements.directorLivePrompt.value.trim();
  if (!transmitDirectorPrompt(prompt, "Manuel")) return;
  elements.directorLivePrompt.value = "";
}

function renderApiProviders() {
  elements.apiProviderGrid.innerHTML = state.apiProviders.map((provider) => `
    <article class="api-card" data-api-provider="${escapeHtml(provider.id)}">
      <div class="api-card-head">
        <div>
          <h2>${escapeHtml(provider.label)}${provider.optional ? " · optionnel" : ""}</h2>
          <p>${escapeHtml(provider.description)}</p>
        </div>
        <span class="api-state ${provider.configured ? "configured" : ""}">
          ${provider.configured ? "Configurée" : "À configurer"}
        </span>
      </div>
      <div class="api-key-row">
        <input type="password" autocomplete="new-password" spellcheck="false"
          aria-label="Nouvelle clé ${escapeHtml(provider.label)}"
          placeholder="${provider.configured ? "Entrer une nouvelle clé pour la remplacer" : "Coller la clé API"}">
        <button type="button" data-api-save="${escapeHtml(provider.id)}">${provider.configured ? "Remplacer" : "Vérifier et enregistrer"}</button>
        <button type="button" data-api-delete="${escapeHtml(provider.id)}" ${provider.configured ? "" : "disabled"}>Retirer</button>
      </div>
    </article>
  `).join("");
}

async function loadApiProviders() {
  elements.apiMessage.textContent = "Lecture du coffre partagé…";
  elements.apiMessage.classList.remove("error");
  try {
    const result = await request("/api/providers/keys");
    state.apiProviders = result.providers || [];
    renderApiProviders();
    elements.apiMessage.textContent = result.storage || "Coffre local prêt.";
  } catch (error) {
    elements.apiMessage.textContent = error.message;
    elements.apiMessage.classList.add("error");
  }
}

async function saveApiProvider(id) {
  const card = elements.apiProviderGrid.querySelector(`[data-api-provider="${CSS.escape(id)}"]`);
  const input = card?.querySelector("input");
  const apiKey = input?.value.trim() || "";
  if (!apiKey) {
    elements.apiMessage.textContent = "Colle d’abord la clé à enregistrer.";
    elements.apiMessage.classList.add("error");
    input?.focus();
    return;
  }
  elements.apiMessage.textContent = `Vérification de ${id}…`;
  elements.apiMessage.classList.remove("error");
  try {
    await request(`/api/providers/keys/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ apiKey })
    });
    input.value = "";
    await loadApiProviders();
    elements.apiMessage.textContent = "Clé vérifiée, chiffrée et partagée avec Prompt Atlas.";
    await refreshState();
  } catch (error) {
    elements.apiMessage.textContent = error.message;
    elements.apiMessage.classList.add("error");
  }
}

async function deleteApiProvider(id) {
  const provider = state.apiProviders.find((item) => item.id === id);
  if (!provider || !confirm(`Retirer la clé ${provider.label} du coffre partagé ?`)) return;
  try {
    await request(`/api/providers/keys/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadApiProviders();
    elements.apiMessage.textContent = `Clé ${provider.label} retirée.`;
    await refreshState();
  } catch (error) {
    elements.apiMessage.textContent = error.message;
    elements.apiMessage.classList.add("error");
  }
}

function showApi() {
  state.view = "api";
  state.selectedAssets.clear();
  elements.selectionTray.classList.add("hidden");
  elements.composer.classList.add("hidden");
  elements.activityPanel.classList.add("hidden");
  elements.assetLibrary.classList.add("hidden");
  elements.directorView.classList.add("hidden");
  elements.spendingView.classList.add("hidden");
  elements.apiView.classList.remove("hidden");
  elements.loraLabView.classList.add("hidden");
  elements.assetsButton.classList.remove("active");
  elements.spendingButton.classList.remove("active");
  elements.directorButton.classList.remove("active");
  elements.apiButton.classList.add("active");
  elements.loraLabButton.classList.remove("active");
  document.querySelectorAll("[data-media]").forEach((button) => button.classList.remove("active"));
  loadApiProviders();
}

function loraTrainerSelection() {
  return state.loraTrainers.find((item) => item.id === elements.loraTrainer.value) || null;
}

function invalidateLoraQuote() {
  state.loraQuote = null;
  elements.loraConfirm.checked = false;
  elements.loraEstimatedCost.textContent = "À recalculer";
  elements.loraPricingNote.textContent = "Aucune dépense sans confirmation.";
  updateLoraTrainButton();
}

function updateLoraTrainButton() {
  const enoughImages = state.loraDatasetIds.length >= 10;
  elements.loraTrainButton.disabled = !enoughImages || !state.loraQuote || !elements.loraConfirm.checked;
  elements.loraDatasetCount.textContent = `${state.loraDatasetIds.length} image${state.loraDatasetIds.length > 1 ? "s" : ""} · 10 minimum · 500 maximum`;
}

function applyLoraTrainerDefaults() {
  const trainer = loraTrainerSelection();
  if (!trainer) return;
  elements.loraSteps.value = String(trainer.defaults.steps);
  elements.loraLearningRate.value = String(trainer.defaults.learningRate);
  elements.loraMode.value = trainer.defaults.mode;
  elements.loraTrigger.value = trainer.defaults.triggerPhrase;
  invalidateLoraQuote();
}

function renderLoraDataset() {
  const resources = state.loraDatasetIds.map((id) => state.resources.find((item) => item.id === id)).filter(Boolean);
  elements.loraDatasetGrid.innerHTML = resources.map((resource) => `
    <figure data-lora-resource="${escapeHtml(resource.id)}">
      <img src="/api/resources/${encodeURIComponent(resource.id)}/content" alt="${escapeHtml(resource.name)}">
      <button type="button" data-remove-lora-resource="${escapeHtml(resource.id)}" aria-label="Retirer">×</button>
      <figcaption>${escapeHtml(resource.name)}</figcaption>
    </figure>`).join("");
  updateLoraTrainButton();
}

function loraStatusLabel(status) {
  return ({ submitted: "Envoyé", queued: "En attente", running: "Entraînement", completed: "Terminé", failed: "Échec", cancelled: "Annulé" })[status] || status;
}

function loraJobOrigin(job) {
  return job.source === "local-import"
    ? "Poids local importé"
    : `${job.datasetCount} images`;
}

function loraJobDescription(job) {
  if (job.error) return job.error;
  if (job.source === "local-import") {
    return job.settings?.triggerPhrase
      ? `Mot déclencheur : ${job.settings.triggerPhrase}`
      : "Import local prêt à utiliser dans le mixeur.";
  }
  return `${job.settings?.steps || "—"} étapes${
    job.estimatedCost === null ? "" : ` · ${formatCurrencyAmount(job.estimatedCost)}`
  }`;
}

function renderLoraJobs() {
  elements.loraJobList.innerHTML = state.loraTrainingJobs.length
    ? state.loraTrainingJobs.map((job) => `
      <article class="lora-job" data-lora-job="${escapeHtml(job.id)}">
        <header>
          <div>
            <strong>${escapeHtml(job.name)}</strong>
            <small>${escapeHtml(job.baseModel)} · ${escapeHtml(loraJobOrigin(job))}</small>
          </div>
          <span data-state="${escapeHtml(job.status)}">${escapeHtml(loraStatusLabel(job.status))}</span>
        </header>
        <p>${escapeHtml(loraJobDescription(job))}</p>
        <footer>
          ${["submitted", "queued", "running"].includes(job.status) ? `<button class="secondary-button" type="button" data-refresh-lora="${escapeHtml(job.id)}">Actualiser</button>` : ""}
          ${job.artifacts?.weights ? `<a class="secondary-button" href="/api/lora-lab/jobs/${encodeURIComponent(job.id)}/download/weights">Télécharger le poids</a>` : ""}
          ${job.artifacts?.config ? `<a class="plain-button" href="/api/lora-lab/jobs/${encodeURIComponent(job.id)}/download/config">Configuration</a>` : ""}
        </footer>
      </article>`).join("")
    : `<p class="lora-empty">Aucun entraînement ni poids importé.</p>`;
}

function loraBaseModels(models) {
  return [...new Set(models.map((item) => item.baseModel).filter(Boolean))];
}

async function loadLoraLab() {
  try {
    const [{ models, configured }, { jobs }] = await Promise.all([
      request("/api/lora-lab/models"), request("/api/lora-lab/jobs")
    ]);
    state.loraTrainers = models;
    state.loraTrainingJobs = jobs;
    const selected = elements.loraTrainer.value;
    elements.loraTrainer.innerHTML = models.map((item) => (
      `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`
    )).join("");
    if (models.some((item) => item.id === selected)) elements.loraTrainer.value = selected;
    else applyLoraTrainerDefaults();
    const previousBase = elements.loraImportBaseModel.value;
    const baseModels = loraBaseModels(models);
    elements.loraImportBaseModel.innerHTML = baseModels.map((baseModel) => (
      `<option value="${escapeHtml(baseModel)}">${escapeHtml(baseModel)}</option>`
    )).join("");
    elements.loraImportBaseModel.value = baseModels.includes(previousBase)
      ? previousBase
      : baseModels.includes("FLUX.1 Dev") ? "FLUX.1 Dev" : baseModels[0] || "";
    elements.importLocalLoraButton.disabled = !configured;
    if (!configured) elements.loraMessage.textContent = "Configure d’abord ta clé fal dans API.";
    renderLoraDataset();
    renderLoraJobs();
    renderKreaLabLibrary();
  } catch (error) {
    elements.loraMessage.textContent = error.message;
  }
}

async function localLoraConfigs(files) {
  const configs = new Map();
  const jsonFiles = files.filter((file) => file.name.toLowerCase().endsWith(".json"));
  for (const file of jsonFiles) {
    try {
      const parsed = JSON.parse(await file.text());
      configs.set(file.name.replace(/\.json$/i, "").toLowerCase(), parsed);
    } catch {
      // A malformed optional sidecar does not prevent importing the weight.
    }
  }
  return configs;
}

async function importLocalLoras(fileList) {
  const files = [...fileList];
  const weights = files.filter((file) => file.name.toLowerCase().endsWith(".safetensors"));
  if (!weights.length) {
    elements.loraMessage.textContent = "Sélectionne au moins un fichier .safetensors.";
    return;
  }
  const configs = await localLoraConfigs(files);
  elements.importLocalLoraButton.disabled = true;
  let imported = 0;
  try {
    for (const [index, file] of weights.entries()) {
      const stem = file.name.replace(/\.safetensors$/i, "");
      const config = configs.get(stem.toLowerCase()) || {};
      const trigger = String(
        config.trigger_phrase || config.triggerPhrase || config.instance_prompt || ""
      ).trim().slice(0, 80);
      elements.loraMessage.textContent = (
        `Import ${index + 1}/${weights.length} · validation et publication de ${file.name}…`
      );
      const { job } = await request("/api/lora-lab/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Barz-Filename": encodeURIComponent(file.name),
          "X-Barz-Lora-Name": encodeURIComponent(stem),
          "X-Barz-Lora-Base-Model": encodeURIComponent(elements.loraImportBaseModel.value),
          "X-Barz-Lora-Trigger": encodeURIComponent(trigger)
        },
        body: file
      });
      state.loraTrainingJobs.unshift(job);
      imported += 1;
      renderLoraJobs();
      renderKreaLoraMixer();
    }
    elements.loraMessage.textContent = `${imported} LoRA importé${imported > 1 ? "s" : ""} et prêt${imported > 1 ? "s" : ""} dans le mixeur.`;
  } catch (error) {
    elements.loraMessage.textContent = `${imported}/${weights.length} importé(s) · ${error.message}`;
  } finally {
    elements.localLoraInput.value = "";
    elements.importLocalLoraButton.disabled = false;
  }
}
function showLoraLab() {
  state.view = "lora-lab";
  state.selectedAssets.clear();
  elements.selectionTray.classList.add("hidden");
  elements.composer.classList.add("hidden");
  elements.activityPanel.classList.add("hidden");
  elements.assetLibrary.classList.add("hidden");
  elements.directorView.classList.add("hidden");
  elements.spendingView.classList.add("hidden");
  elements.apiView.classList.add("hidden");
  elements.loraLabView.classList.remove("hidden");
  elements.assetsButton.classList.remove("active");
  elements.spendingButton.classList.remove("active");
  elements.directorButton.classList.remove("active");
  elements.apiButton.classList.remove("active");
  elements.loraLabButton.classList.add("active");
  document.querySelectorAll("[data-media]").forEach((button) => button.classList.remove("active"));
  loadLoraLab();
}

async function addLoraDatasetFiles(files) {
  const accepted = [...files].filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type)).slice(0, 500 - state.loraDatasetIds.length);
  for (const [index, file] of accepted.entries()) {
    elements.loraMessage.textContent = `Import ${index + 1}/${accepted.length} · ${file.name}…`;
    const resource = await uploadResourceFile(file);
    state.loraDatasetIds.push(resource.id);
    renderLoraDataset();
  }
  elements.loraDatasetInput.value = "";
  elements.loraMessage.textContent = `${accepted.length} image${accepted.length > 1 ? "s" : ""} ajoutée${accepted.length > 1 ? "s" : ""}.`;
  invalidateLoraQuote();
}

async function quoteLoraTraining() {
  elements.loraMessage.textContent = "Lecture du tarif fal…";
  elements.loraQuoteButton.disabled = true;
  try {
    const quote = await request("/api/lora-lab/quote", { method: "POST", body: JSON.stringify({ trainerId: elements.loraTrainer.value, steps: Number(elements.loraSteps.value) }) });
    state.loraQuote = quote;
    elements.loraEstimatedCost.textContent = quote.estimatedCost === null ? "Tarif à l’usage fal" : formatCurrencyAmount(quote.estimatedCost);
    elements.loraPricingNote.textContent = quote.pricing ? `${quote.pricing.unitPrice} ${quote.pricing.currency || "USD"} / ${quote.pricing.unit}` : "fal ne publie pas d’estimation calculable.";
    elements.loraMessage.textContent = "Tarif vérifié. Coche la confirmation pour lancer.";
    updateLoraTrainButton();
  } catch (error) {
    elements.loraMessage.textContent = error.message;
  } finally { elements.loraQuoteButton.disabled = false; }
}

async function submitLoraTraining(event) {
  event.preventDefault();
  if (!state.loraQuote || !elements.loraConfirm.checked || state.loraDatasetIds.length < 10) return;
  elements.loraTrainButton.disabled = true;
  elements.loraMessage.textContent = "Création du dataset ZIP et envoi à fal…";
  try {
    const { job } = await request("/api/lora-lab/train", { method: "POST", body: JSON.stringify({
      confirm: true, estimatedCost: state.loraQuote.estimatedCost, name: elements.loraName.value,
      trainerId: elements.loraTrainer.value, resourceIds: state.loraDatasetIds,
      triggerPhrase: elements.loraTrigger.value, caption: elements.loraCaption.value,
      mode: elements.loraMode.value, steps: Number(elements.loraSteps.value),
      learningRate: Number(elements.loraLearningRate.value), outputFormat: "fal", faceCrop: true
    }) });
    state.loraTrainingJobs.unshift(job);
    renderLoraJobs();
    elements.loraMessage.textContent = "Entraînement lancé. Actualise pour suivre puis télécharge le poids.";
    invalidateLoraQuote();
  } catch (error) {
    elements.loraMessage.textContent = error.message;
    updateLoraTrainButton();
  }
}

async function refreshLoraJob(id) {
  const { job } = await request(`/api/lora-lab/jobs/${encodeURIComponent(id)}/refresh`, { method: "POST" });
  const index = state.loraTrainingJobs.findIndex((item) => item.id === id);
  if (index !== -1) state.loraTrainingJobs[index] = job;
  renderLoraJobs();
  return job;
}

function showSpending() {
  state.view = "spending";
  state.selectedAssets.clear();
  elements.selectionTray.classList.add("hidden");
  elements.composer.classList.add("hidden");
  elements.activityPanel.classList.add("hidden");
  elements.assetLibrary.classList.add("hidden");
  elements.directorView.classList.add("hidden");
  elements.apiView.classList.add("hidden");
  elements.loraLabView.classList.add("hidden");
  elements.loraLabButton.classList.remove("active");
  elements.spendingView.classList.remove("hidden");
  elements.assetsButton.classList.remove("active");
  elements.spendingButton.classList.add("active");
  elements.directorButton.classList.remove("active");
  elements.apiButton.classList.remove("active");
  document.querySelectorAll("[data-media]").forEach((button) => {
    button.classList.remove("active");
  });
  renderSpending();
  refreshProviderCredits();
}

function shiftSpendingPeriod(direction) {
  if (state.spendingMode === "day") {
    const next = new Date(`${state.spendingSelectedDay}T12:00:00`);
    next.setDate(next.getDate() + direction);
    state.spendingAnchor = next;
    state.spendingSelectedDay = localDayKey(next);
  } else if (state.spendingMode === "year") {
    state.spendingAnchor = new Date(
      state.spendingAnchor.getFullYear() + direction,
      state.spendingAnchor.getMonth(),
      1,
      12
    );
  } else {
    state.spendingAnchor = new Date(
      state.spendingAnchor.getFullYear(),
      state.spendingAnchor.getMonth() + direction,
      1,
      12
    );
  }
  renderSpending();
}

function showAssets() {
  state.view = "assets";
  elements.composer.classList.add("hidden");
  elements.activityPanel.classList.add("hidden");
  elements.spendingView.classList.add("hidden");
  elements.directorView.classList.add("hidden");
  elements.apiView.classList.add("hidden");
  elements.loraLabView.classList.add("hidden");
  elements.loraLabButton.classList.remove("active");
  elements.assetLibrary.classList.remove("hidden");
  elements.assetsButton.classList.add("active");
  elements.spendingButton.classList.remove("active");
  elements.directorButton.classList.remove("active");
  elements.apiButton.classList.remove("active");
  document.querySelectorAll("[data-media]").forEach((button) => {
    button.classList.remove("active");
  });
  renderAssets();
}

function showCreate() {
  state.view = "create";
  elements.composer.classList.remove("hidden");
  elements.activityPanel.classList.remove("hidden");
  elements.assetLibrary.classList.add("hidden");
  elements.spendingView.classList.add("hidden");
  elements.directorView.classList.add("hidden");
  elements.apiView.classList.add("hidden");
  elements.loraLabView.classList.add("hidden");
  elements.loraLabButton.classList.remove("active");
  elements.assetsButton.classList.remove("active");
  elements.spendingButton.classList.remove("active");
  elements.directorButton.classList.remove("active");
  elements.apiButton.classList.remove("active");
}

async function downloadSelection() {
  const selected = selectedAssetRecords();
  elements.downloadSelectionButton.disabled = true;
  elements.downloadSelectionButton.textContent = "Préparation…";
  elements.selectionMessage.textContent = "Conversion et création du ZIP…";
  try {
    const response = await fetch("/api/assets/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: elements.archiveFormat.value,
        selection: selected.map(selectionPayload)
      })
    });
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || "L’archive n’a pas pu être créée.");
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "barz-assets.zip";
    link.click();
    URL.revokeObjectURL(url);
    elements.selectionMessage.textContent = "Archive téléchargée.";
  } catch (error) {
    elements.selectionMessage.textContent = error.message;
  } finally {
    elements.downloadSelectionButton.disabled = false;
    elements.downloadSelectionButton.textContent = "Télécharger .zip";
  }
}

async function renameSelectedAssets() {
  const selected = selectedAssetRecords();
  const baseName = elements.renameAssetsInput.value.trim();
  if (!baseName) {
    elements.selectionMessage.textContent = "Entre un nom pour la sélection.";
    elements.renameAssetsInput.focus();
    return;
  }
  elements.renameAssetsButton.disabled = true;
  try {
    const body = await request("/api/assets/rename", {
      method: "POST",
      body: JSON.stringify({
        baseName,
        selection: selected.map(selectionPayload)
      })
    });
    (body.jobs || []).forEach((job) => {
      const index = state.jobs.findIndex((item) => item.id === job.id);
      if (index !== -1) state.jobs[index] = job;
    });
    (body.resources || []).forEach((resource) => {
      const index = state.resources.findIndex((item) => item.id === resource.id);
      if (index !== -1) state.resources[index] = resource;
    });
    elements.renameAssetsInput.value = "";
    renderJobs();
    renderAssets();
    elements.selectionMessage.textContent = selected.length === 1
      ? `Asset renommé « ${body.names[0].name} ».`
      : `${selected.length} assets renommés de ${body.names[0].name} à ${
        body.names.at(-1).name
      }.`;
  } catch (error) {
    elements.selectionMessage.textContent = error.message;
  } finally {
    elements.renameAssetsButton.disabled = false;
  }
}

function openCollectionDialog(mode, collectionId = null) {
  const collection = state.collections.find((item) => item.id === collectionId);
  state.collectionDialogMode = mode;
  state.editingCollectionId = collection?.id || null;
  elements.collectionDialogContext.textContent = mode === "rename"
    ? "Collection existante"
    : "Bibliothèque";
  elements.collectionDialogTitle.textContent = mode === "rename"
    ? "Renommer la collection"
    : "Créer une collection";
  elements.saveCollectionButton.textContent = mode === "rename" ? "Renommer" : "Créer";
  elements.collectionNameInput.value = collection?.name || "";
  elements.collectionDialogMessage.textContent = "";
  elements.collectionDialog.showModal();
  elements.collectionNameInput.focus();
  elements.collectionNameInput.select();
}

async function saveCollection() {
  const name = elements.collectionNameInput.value.trim();
  if (!name) {
    elements.collectionDialogMessage.textContent = "Entre un nom de collection.";
    return;
  }
  elements.saveCollectionButton.disabled = true;
  try {
    const isRename = state.collectionDialogMode === "rename";
    const endpoint = isRename
      ? `/api/collections/${encodeURIComponent(state.editingCollectionId)}/rename`
      : "/api/collections";
    const body = await request(endpoint, {
      method: "POST",
      body: JSON.stringify({ name })
    });
    const index = state.collections.findIndex((item) => item.id === body.collection.id);
    if (index === -1) {
      state.collections.push(body.collection);
    } else {
      state.collections[index] = body.collection;
    }
    if (!isRename) state.moveCollectionId = body.collection.id;
    renderAssets();
    elements.collectionDialog.close("saved");
    elements.selectionMessage.textContent = isRename
      ? `Collection renommée « ${body.collection.name} ».`
      : body.created
        ? `Collection « ${body.collection.name} » créée.`
        : `La collection « ${body.collection.name} » existe déjà.`;
  } catch (error) {
    elements.collectionDialogMessage.textContent = error.message;
  } finally {
    elements.saveCollectionButton.disabled = false;
  }
}

function hideCollectionContextMenu() {
  elements.collectionContextMenu.classList.add("hidden");
  state.contextCollectionId = null;
}

function showCollectionContextMenu(collectionId, x, y) {
  const collection = state.collections.find((item) => item.id === collectionId);
  if (!collection) return;
  state.contextCollectionId = collectionId;
  elements.collectionContextMenu.classList.remove("hidden");
  const width = 150;
  const height = 82;
  elements.collectionContextMenu.style.left = `${Math.min(x, innerWidth - width - 8)}px`;
  elements.collectionContextMenu.style.top = `${Math.min(y, innerHeight - height - 8)}px`;
}

function openDeleteCollectionDialog(collectionId) {
  const collection = state.collections.find((item) => item.id === collectionId);
  if (!collection) return;
  state.deletingCollectionId = collection.id;
  elements.deleteCollectionName.textContent = `« ${collection.name} »`;
  elements.deleteCollectionMessage.textContent = "";
  elements.deleteCollectionDialog.showModal();
}

async function deleteCollection() {
  const id = state.deletingCollectionId;
  const collection = state.collections.find((item) => item.id === id);
  if (!collection) return;
  elements.confirmDeleteCollectionButton.disabled = true;
  elements.deleteCollectionMessage.textContent = "Suppression…";
  try {
    const body = await request(`/api/collections/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    state.collections = state.collections.filter((item) => item.id !== id);
    state.jobs = state.jobs.map((job) => (
      job.collectionId === id ? { ...job, collectionId: null } : job
    ));
    state.resources = state.resources.map((resource) => (
      resource.collectionId === id ? { ...resource, collectionId: null } : resource
    ));
    if (state.collectionFilter === id) state.collectionFilter = "all";
    if (state.moveCollectionId === id) state.moveCollectionId = "";
    state.deletingCollectionId = null;
    elements.deleteCollectionDialog.close("deleted");
    renderJobs();
    renderAssets();
    const message = body.movedMediaCount
      ? `Collection « ${collection.name} » supprimée · ${body.movedMediaCount} média(s) remis dans Sans collection.`
      : `Collection « ${collection.name} » supprimée.`;
    elements.resourceImportMessage.textContent = message;
    elements.formMessage.textContent = message;
  } catch (error) {
    elements.deleteCollectionMessage.textContent = error.message;
  } finally {
    elements.confirmDeleteCollectionButton.disabled = false;
  }
}

function hideResourceContextMenu() {
  elements.resourceContextMenu.classList.add("hidden");
  state.contextResourceId = null;
}

function showResourceContextMenu(resourceId, x, y) {
  if (!state.resources.some((resource) => resource.id === resourceId)) return;
  state.contextResourceId = resourceId;
  elements.resourceContextMenu.classList.remove("hidden");
  const width = 142;
  const height = 46;
  elements.resourceContextMenu.style.left = `${Math.min(x, innerWidth - width - 8)}px`;
  elements.resourceContextMenu.style.top = `${Math.min(y, innerHeight - height - 8)}px`;
}

function hideReferenceContextMenu() {
  elements.referenceContextMenu.classList.add("hidden");
  state.contextReferenceId = null;
}

function showReferenceContextMenu(referenceId, x, y) {
  const reference = currentReferences().find((item) => item.id === referenceId);
  if (!reference) return;
  hideCollectionContextMenu();
  hideResourceContextMenu();
  closeReferenceAddMenu();
  state.contextReferenceId = referenceId;
  const hasLocalResource = /^resource:[0-9a-f-]+$/i.test(reference.id || "");
  elements.revealReferenceButton.disabled = !hasLocalResource;
  elements.revealReferenceButton.title = hasLocalResource
    ? "Afficher la copie locale de ce média dans l’Explorateur"
    : "Cette référence n’a pas de fichier local";
  elements.referenceContextMenu.classList.remove("hidden");
  const width = 216;
  const height = 124;
  elements.referenceContextMenu.style.left = `${Math.min(x, innerWidth - width - 8)}px`;
  elements.referenceContextMenu.style.top = `${Math.min(y, innerHeight - height - 8)}px`;
}

function beginReferenceReplacement(source) {
  const referenceId = state.contextReferenceId;
  if (!referenceId) return;
  const target = { referenceId, mediaType: referenceStorageKey() };
  state.referenceReplacementTarget = target;
  hideReferenceContextMenu();
  if (source === "disk") elements.referenceReplaceUploadInput.click();
  if (source === "assets") openReferenceAssetPicker(target);
}

async function revealReferenceOnDisk() {
  const reference = currentReferences().find((item) => item.id === state.contextReferenceId);
  const resourceId = reference?.id?.match(/^resource:([0-9a-f-]+)$/i)?.[1];
  hideReferenceContextMenu();
  if (!resourceId) {
    elements.formMessage.textContent = "Cette référence n’a pas de fichier local à afficher.";
    return;
  }
  try {
    await request(`/api/resources/${encodeURIComponent(resourceId)}/reveal`, { method: "POST" });
    elements.formMessage.textContent = "Fichier affiché dans l’Explorateur Windows.";
  } catch (error) {
    elements.formMessage.textContent = error.message;
  }
}

function openDeleteResourcesDialog(resourceIds) {
  const resources = [...new Set(resourceIds)].map((id) => (
    state.resources.find((resource) => resource.id === id)
  )).filter(Boolean);
  if (!resources.length) return;
  state.deletingResourceIds = resources.map((resource) => resource.id);
  const multiple = resources.length > 1;
  elements.deleteResourcesTitle.textContent = multiple
    ? `Supprimer ${resources.length} ressources ?`
    : "Supprimer la ressource ?";
  elements.deleteResourcesCopy.textContent = multiple
    ? "Ces fichiers seront supprimés définitivement de la bibliothèque. Les reference sets les conserveront comme Missing avec leur miniature."
    : "Ce fichier sera supprimé définitivement de la bibliothèque. Les reference sets le conserveront comme Missing avec sa miniature.";
  elements.deleteResourcesList.innerHTML = resources.slice(0, 6).map((resource) => (
    `<li>${escapeHtml(resource.name)}</li>`
  )).join("") + (resources.length > 6 ? `<li>+ ${resources.length - 6} autres</li>` : "");
  elements.deleteResourcesMessage.textContent = "";
  elements.confirmDeleteResourcesButton.textContent = multiple
    ? `Supprimer ${resources.length} ressources`
    : "Supprimer la ressource";
  elements.deleteResourcesDialog.showModal();
}

async function deleteResources() {
  const ids = [...state.deletingResourceIds];
  const resources = ids.map((id) => state.resources.find((resource) => resource.id === id))
    .filter(Boolean);
  if (!resources.length) return;
  elements.confirmDeleteResourcesButton.disabled = true;
  elements.deleteResourcesMessage.textContent = "Suppression…";
  try {
    await request("/api/resources/delete", {
      method: "POST",
      body: JSON.stringify({ resourceIds: ids })
    });
    const deletedReferenceIds = new Set(ids.map((id) => resourceKey(id)));
    const cachedReferenceById = new Map(state.referenceSets.flatMap((referenceSet) => (
      referenceSet.references.map((reference) => [reference.id, reference])
    )));
    state.resources = state.resources.filter((resource) => !ids.includes(resource.id));
    ids.forEach((id) => state.selectedAssets.delete(resourceKey(id)));
    Object.keys(state.referencesByMedia).forEach((mediaType) => {
      state.referencesByMedia[mediaType] = state.referencesByMedia[mediaType].map((reference) => {
        if (!deletedReferenceIds.has(reference.id)) return reference;
        const cachedReference = cachedReferenceById.get(reference.id);
        return {
          ...reference,
          missing: true,
          previewUrl: cachedReference?.previewUrl || reference.previewUrl
        };
      });
    });
    const localState = await request("/api/state");
    state.referenceSets = localState.referenceSets || [];
    state.deletingResourceIds = [];
    elements.deleteResourcesDialog.close("deleted");
    renderReferences();
    renderJobs();
    renderAssets();
    const message = resources.length === 1
      ? `Ressource « ${resources[0].name} » supprimée.`
      : `${resources.length} ressources supprimées.`;
    elements.resourceImportMessage.textContent = message;
  } catch (error) {
    elements.deleteResourcesMessage.textContent = error.message;
  } finally {
    elements.confirmDeleteResourcesButton.disabled = false;
  }
}

async function moveSelection() {
  const selected = selectedAssetRecords();
  if (!selected.length) return;
  try {
    const body = await request("/api/assets/move", {
      method: "POST",
      body: JSON.stringify({
        selection: selected.map(selectionPayload),
        collectionId: state.moveCollectionId
      })
    });
    (body.jobs || []).forEach(replaceJob);
    (body.resources || []).forEach((resource) => {
      const index = state.resources.findIndex((item) => item.id === resource.id);
      if (index !== -1) state.resources[index] = resource;
    });
    const collection = state.collections.find((item) => (
      item.id === state.moveCollectionId
    ));
    state.selectedAssets.clear();
    state.selectionFormatTouched = false;
    renderJobs();
    renderAssets();
    const message = `${selected.length} média(s) déplacé(s) vers ${
      collection?.name || "Sans collection"
    }.`;
    elements.formMessage.textContent = message;
    elements.resourceImportMessage.textContent = message;
  } catch (error) {
    elements.selectionMessage.textContent = error.message;
  }
}

async function trashSelectedAssets() {
  const selected = selectedAssetRecords().filter((asset) => !state.trashedAssetKeys.has(asset.key));
  if (!selected.length) return;
  const label = selected.length === 1 ? assetRecordName(selected[0]) : `${selected.length} assets`;
  if (!confirm(`Mettre ${label} à la corbeille ? Tu pourras les restaurer depuis Assets > Corbeille.`)) return;
  elements.trashSelectionButton.disabled = true;
  try {
    const body = await request("/api/assets/trash", {
      method: "POST",
      body: JSON.stringify({ selection: selected.map(selectionPayload) })
    });
    body.keys.forEach((key) => state.trashedAssetKeys.add(key));
    state.selectedAssets.clear();
    renderJobs();
    renderAssets();
    elements.resourceImportMessage.textContent = `${selected.length} asset(s) mis à la corbeille.`;
  } catch (error) {
    elements.selectionMessage.textContent = error.message;
  } finally {
    elements.trashSelectionButton.disabled = false;
  }
}

async function restoreSelectedAssets() {
  const keys = selectedAssetRecords().map((asset) => asset.key)
    .filter((key) => state.trashedAssetKeys.has(key));
  if (!keys.length) return;
  elements.restoreSelectionButton.disabled = true;
  try {
    await request("/api/assets/restore", {
      method: "POST",
      body: JSON.stringify({ keys })
    });
    keys.forEach((key) => state.trashedAssetKeys.delete(key));
    state.selectedAssets.clear();
    renderJobs();
    renderAssets();
    elements.resourceImportMessage.textContent = `${keys.length} asset(s) restauré(s).`;
  } catch (error) {
    elements.selectionMessage.textContent = error.message;
  } finally {
    elements.restoreSelectionButton.disabled = false;
  }
}

async function uploadResources(files) {
  const accepted = [...files].filter((file) => /^(image|video|audio)\//.test(file.type));
  if (!accepted.length) {
    elements.resourceImportMessage.textContent = "Choisis une image, une vidéo ou un fichier audio.";
    return;
  }
  state.referencePickerActive = false;
  elements.uploadResourcesButton.disabled = true;
  state.assetCategory = "resources";
  state.assetFilter = "all";
  state.collectionFilter = "all";
  showAssets();
  let imported = 0;
  for (const [index, file] of accepted.entries()) {
    elements.resourceImportMessage.textContent =
      `Import ${index + 1}/${accepted.length} · ${file.name}…`;
    try {
      await uploadResourceFile(file);
      imported += 1;
      renderAssets();
    } catch (error) {
      elements.resourceImportMessage.textContent = `${file.name} : ${error.message}`;
      break;
    }
  }
  if (imported === accepted.length) {
    elements.resourceImportMessage.textContent = imported === 1
      ? "Ressource importée dans Sans collection."
      : `${imported} ressources importées dans Sans collection.`;
  }
  elements.resourceUploadInput.value = "";
  elements.uploadResourcesButton.disabled = false;
}

async function uploadResourceFile(file) {
  const response = await fetch("/api/resources", {
    method: "POST",
    headers: {
      "Content-Type": file.type,
      "X-Barz-Filename": encodeURIComponent(file.name)
    },
    body: file
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "L’import a échoué.");
  state.resources.unshift(body.resource);
  return body.resource;
}

function localResourceForReference(reference) {
  const resourceId = reference?.id?.match(/^resource:([0-9a-f-]+)$/i)?.[1];
  return resourceId
    ? state.resources.find((resource) => resource.id === resourceId) || null
    : null;
}

async function convertWebpReferenceForHeyGen(reference) {
  const resource = localResourceForReference(reference);
  if (reference?.kind !== "image" || resource?.contentType !== "image/webp") return reference;

  const response = await fetch(reference.url);
  if (!response.ok) throw new Error("La référence WebP locale n’a pas pu être lue.");
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("La conversion WebP vers JPG n’est pas disponible dans ce navigateur.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
    if (!jpegBlob) throw new Error("La conversion WebP vers JPG a échoué.");
    const sourceName = resource.originalName || resource.name || "reference.webp";
    const baseName = sourceName.replace(/\.[^.]+$/, "") || "reference";
    const converted = new File([jpegBlob], `${baseName}-heygen.jpg`, { type: "image/jpeg" });
    const convertedResource = await uploadResourceFile(converted);
    const convertedAsset = uploadedAssets().find((asset) => asset.resource.id === convertedResource.id);
    if (!convertedAsset) throw new Error("La référence JPG convertie n’a pas pu être ajoutée aux assets.");
    return assetToReference(convertedAsset);
  } finally {
    bitmap.close();
  }
}

async function prepareReferencesForProvider(provider) {
  const references = currentReferences();
  if (provider !== "heygen") return references;
  const convertibleCount = references.filter((reference) => (
    reference?.kind === "image" && localResourceForReference(reference)?.contentType === "image/webp"
  )).length;
  if (!convertibleCount) return references;

  elements.formMessage.textContent = `Conversion locale de ${convertibleCount} référence(s) WebP en JPG pour HeyGen…`;
  const prepared = [];
  for (const reference of references) prepared.push(await convertWebpReferenceForHeyGen(reference));
  state.referencesByMedia[referenceStorageKey()] = prepared;
  renderAssets();
  renderReferences();
  return prepared;
}

async function uploadDirectorReferenceImages(files) {
  if (directorIsActive()) {
    elements.directorMessage.textContent = "Les références sont verrouillées pendant la session.";
    return;
  }
  const accepted = [...files].filter((item) => item.type.startsWith("image/"));
  if (!accepted.length) {
    elements.directorMessage.textContent = "Dépose un ou deux fichiers image.";
    elements.directorReferenceUploadInput.value = "";
    return;
  }
  const existing = [...(state.referencesByMedia.video || []).slice(0, 2)];
  const availableSlots = 2 - existing.length;
  if (availableSlots <= 0) {
    elements.directorMessage.textContent = "Retire une image avant d’en ajouter une autre.";
    elements.directorReferenceUploadInput.value = "";
    return;
  }
  const queued = accepted.slice(0, availableSlots);
  const ignoredCount = accepted.length - queued.length;
  const imported = [];
  elements.directorUploadReferenceButton.disabled = true;
  elements.directorAssetReferenceButton.disabled = true;
  for (const [index, file] of queued.entries()) {
    elements.directorMessage.textContent = `Import ${index + 1}/${queued.length} · ${file.name}…`;
    try {
      const resource = await uploadResourceFile(file);
      const asset = uploadedAssets().find((item) => item.resource.id === resource.id);
      if (asset) imported.push(assetToReference(asset));
    } catch (error) {
      elements.directorMessage.textContent = `${file.name} : ${error.message}`;
      break;
    }
  }
  state.referencesByMedia.video = [...existing, ...imported].slice(0, 2);
  elements.directorReferenceUploadInput.value = "";
  renderAssets();
  renderReferences();
  renderDirectorReferences();
  if (imported.length) {
    elements.directorMessage.textContent = `${imported.length} image${imported.length > 1 ? "s" : ""} ajoutée${imported.length > 1 ? "s" : ""} à Director et à Assets${
      ignoredCount ? ` · ${ignoredCount} ignorée${ignoredCount > 1 ? "s" : ""}, limite de deux` : ""
    }.`;
  }
}

function removeDirectorReference(referenceId) {
  if (directorIsActive()) return;
  state.referencesByMedia.video = (state.referencesByMedia.video || [])
    .filter((reference) => reference.id !== referenceId);
  renderReferences();
  renderDirectorReferences();
  elements.directorMessage.textContent = "Image retirée de Director. Elle reste disponible dans Assets.";
}

async function uploadReferenceImage(files) {
  let accepted = [...files].filter((item) => /^(image|audio|video)\//.test(item.type));
  if (state.videoMode === "motion-transfer") {
    const existingKinds = new Set(currentReferences().map((reference) => reference.kind));
    accepted = accepted.filter((item) => {
      const kind = item.type.startsWith("image/") ? "image" : item.type.startsWith("video/") ? "video" : "audio";
      return ["image", "video"].includes(kind) && !existingKinds.has(kind) &&
        (!state.pendingReferenceKind || state.pendingReferenceKind === kind);
    });
  }
  if (!accepted.length) {
    elements.formMessage.textContent = "Choisis une image, une vidéo ou un fichier audio compatible.";
    elements.referenceUploadInput.value = "";
    resetReferenceUploadPicker();
    return;
  }
  const availableSlots = referenceLimit() - currentReferences().length;
  if (availableSlots <= 0) {
    elements.formMessage.textContent = "Le lanceur contient déjà 12 références.";
    elements.referenceUploadInput.value = "";
    resetReferenceUploadPicker();
    return;
  }
  const queued = accepted.slice(0, availableSlots);
  const ignoredCount = accepted.length - queued.length;
  const initialReferences = [...currentReferences()];
  const importedAssets = [];
  let failedMessage = "";
  elements.referenceAddButton.disabled = true;
  for (const [index, file] of queued.entries()) {
    elements.formMessage.textContent =
      `Import ${index + 1}/${queued.length} dans les références · ${file.name}…`;
    try {
      const resource = await uploadResourceFile(file);
      const asset = uploadedAssets().find((item) => item.resource.id === resource.id);
      importedAssets.push(asset);
    } catch (error) {
      failedMessage = `${file.name} : ${error.message}`;
      break;
    }
  }
  state.referencesByMedia[referenceStorageKey()] = [
    ...initialReferences,
    ...importedAssets.map(assetToReference)
  ].slice(0, referenceLimit());
  renderAssets();
  renderReferences();
  if (failedMessage) {
    elements.formMessage.textContent = importedAssets.length
      ? `${importedAssets.length} média(s) ajouté(s), puis échec · ${failedMessage}`
      : failedMessage;
  } else {
    const capacityMessage = ignoredCount
      ? ` · ${ignoredCount} ignorée(s), limite de 12 atteinte`
      : "";
    elements.formMessage.textContent =
      `${importedAssets.length} média(s) ajouté(s) aux références et à Assets > Ressources > Sans collection${capacityMessage}.`;
  }
  elements.referenceUploadInput.value = "";
  elements.referenceAddButton.disabled = currentReferences().length >= referenceLimit();
  resetReferenceUploadPicker();
}

function resetReferenceUploadPicker() {
  state.pendingReferenceKind = null;
  elements.referenceUploadInput.accept =
    "image/*,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/webm,video/mp4,video/webm,video/quicktime";
}

async function uploadReplacementReferenceImage(files) {
  const target = state.referenceReplacementTarget;
  const expectedKind = (state.referencesByMedia[target?.mediaType] || [])
    .find((reference) => reference.id === target?.referenceId)?.kind || "image";
  const file = [...files].find((item) => (
    expectedKind === "audio" ? item.type.startsWith("audio/")
      : expectedKind === "video" ? item.type.startsWith("video/")
        : item.type.startsWith("image/")
  ));
  if (!target || !file) {
    if (!file) elements.formMessage.textContent = `Choisis un fichier ${expectedKind}.`;
    state.referenceReplacementTarget = null;
    elements.referenceReplaceUploadInput.value = "";
    return;
  }
  const index = referenceTargetIndex(target);
  elements.formMessage.textContent = index === -1
    ? "La référence à remplacer n’est plus dans le lanceur."
    : `Import de ${file.name} pour remplacer ${referenceTokenAt(state.referencesByMedia[target.mediaType], index)}…`;
  if (index === -1) {
    state.referenceReplacementTarget = null;
    elements.referenceReplaceUploadInput.value = "";
    return;
  }
  try {
    const resource = await uploadResourceFile(file);
    const asset = uploadedAssets().find((item) => item.resource.id === resource.id);
    replaceReferenceWithAsset(asset);
    renderAssets();
    elements.formMessage.textContent =
      `${referenceTokenAt(state.referencesByMedia[target.mediaType], index)} remplacé par ${file.name}. Le média est aussi dans Assets > Ressources > Sans collection.`;
  } catch (error) {
    state.referenceReplacementTarget = null;
    elements.formMessage.textContent = `${file.name} : ${error.message}`;
  } finally {
    elements.referenceReplaceUploadInput.value = "";
  }
}

function formatDetailDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function humanizeSetting(value) {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function detailMetadata(job) {
  const input = job.providerInput || {};
  const firstMedia = mediaResults(job.result)[0];
  const settings = [
    ["Modèle", modelLabel(job)],
    ["Coût", job.estimatedCost === null ? "Inconnu" : formatJobCost(job)],
    ["Créée", formatDetailDate(job.createdAt)]
  ];
  const generationTime = generationTimeLabel(job);
  if (generationTime) settings.splice(2, 0, ["Generation time", generationTime]);
  if (firstMedia?.width && firstMedia?.height) {
    settings.push(["Dimensions", `${firstMedia.width} × ${firstMedia.height}`]);
  }
  const format = input.aspect_ratio || input.image_size;
  if (format) settings.push(["Format", humanizeSetting(format)]);
  if (input.resolution) settings.push(["Résolution", humanizeSetting(input.resolution)]);
  const duration = input.duration || input.duration_seconds || input.num_seconds;
  if (duration) settings.push(["Durée", `${duration} s`]);
  return settings;
}

function openJobDetail(id) {
  const job = state.jobs.find((item) => item.id === id);
  const items = mediaResults(job?.result);
  if (!job || !items.length) return false;
  state.activeDetailJobId = id;
  elements.jobDetailTitle.textContent = assetDisplayName(job, 0);
  elements.jobDetailMedia.innerHTML = renderResultMedia(
    job.result,
    modelLabel(job)
  );
  elements.jobDetailMeta.innerHTML = detailMetadata(job).map(([label, value]) => `
    <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join("");
  elements.jobDetailPrompt.textContent = job.providerInput?.prompt || "Prompt indisponible.";
  elements.jobDetailMessage.textContent = "";
  const firstResult = items[0];
  const firstResultIsImage = String(firstResult.contentType || "").startsWith("image/")
    || /\.(avif|gif|jpe?g|png|webp)(\?|$)/i.test(firstResult.url);
  elements.openJobResultLink.hidden = !firstResultIsImage;
  elements.openJobResultLink.dataset.previewImageUrl = firstResultIsImage ? firstResult.url : "";
  elements.openJobResultLink.dataset.previewImageAlt = elements.jobDetailTitle.textContent;
  elements.downloadJobResultLink.href = job.resourceId
    ? `/api/resources/${encodeURIComponent(job.resourceId)}/download`
    : `/api/jobs/${encodeURIComponent(job.id)}/download/0`;
  if (!elements.jobDetailDialog.open) elements.jobDetailDialog.showModal();
  return true;
}

function openImagePreview(url, alt = "Image", queueContext = null) {
  if (!url) return;
  state.previewQueueContext = queueContext;
  elements.imagePreview.src = url;
  elements.imagePreview.alt = alt || "Image";
  if (!elements.imagePreviewDialog.open) elements.imagePreviewDialog.showModal();
}

function queueDetailJobs() {
  return visibleHistory(state.jobs.filter((job) => job.jobType !== "director-session" &&
    mediaResults(job.result).length > 0), "createdAt");
}

function queueImageEntries() {
  return queueDetailJobs().flatMap((job) => mediaResults(job.result)
    .filter((media) => String(media.contentType || "").startsWith("image/") ||
      /\.(?:avif|gif|jpe?g|png|webp)(?:\?|$)/i.test(media.url))
    .map((media) => ({ jobId: job.id, url: media.url, alt: modelLabel(job) })));
}

function navigateQueue(direction) {
  if (elements.imagePreviewDialog.open && !state.previewQueueContext) return false;
  if (elements.imagePreviewDialog.open && state.previewQueueContext) {
    const entries = queueImageEntries();
    const current = entries.findIndex((item) => item.jobId === state.previewQueueContext.jobId &&
      item.url === state.previewQueueContext.url);
    const next = entries[current + direction];
    if (!next || current < 0) return false;
    openImagePreview(next.url, next.alt, { jobId: next.jobId, url: next.url });
    return true;
  }
  if (elements.jobDetailDialog.open) {
    const jobs = queueDetailJobs();
    const current = jobs.findIndex((job) => job.id === state.activeDetailJobId);
    const next = jobs[current + direction];
    return current >= 0 && Boolean(next) && openJobDetail(next.id);
  }
  return false;
}

function openSpendingJob(id) {
  if (!openJobDetail(id)) return;
  const url = new URL(location.href);
  url.searchParams.set("generation", id);
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

async function copyActiveJobPrompt() {
  const job = state.jobs.find((item) => item.id === state.activeDetailJobId);
  const prompt = job?.providerInput?.prompt;
  if (!prompt) return;
  try {
    await navigator.clipboard.writeText(prompt);
    elements.jobDetailMessage.textContent = "Prompt copié dans le presse-papiers.";
  } catch {
    elements.jobDetailMessage.textContent = "La copie automatique est bloquée par le navigateur.";
  }
}

function openJobConfirmation(id) {
  const job = state.jobs.find((item) => item.id === id);
  if (!job || job.status !== "awaiting_confirmation") return;
  imageBatchPrepared = null;
  state.activeJobId = id;
  state.preparedRequest = null;
  state.preparedPreview = null;
  elements.confirmationMessage.textContent = "";
  elements.confirmationMessage.classList.remove("warning");
  elements.submitJobButton.disabled = false;
  elements.submitJobButton.textContent = "Confirmer et générer";
  elements.confirmationSummary.innerHTML = `
    <div class="preview-line">
        <span>Modèle</span><strong>${escapeHtml(modelLabel(job))}</strong>
    </div>
    <div class="preview-line">
      <span>Coût estimé</span><strong>${escapeHtml(formatJobCost(job))}</strong>
    </div>
    <div class="preview-line">
      <span>Action</span><strong>Envoi payant à ${escapeHtml(
        job.provider === "heygen" ? "HeyGen" : job.provider === "krea" ? "Krea" : "fal"
      )}</strong>
    </div>
  `;
  elements.confirmationPayload.textContent = JSON.stringify(job.providerInput, null, 2);
  elements.confirmationDialog.showModal();
}

async function submitActiveJob() {
  if (imageBatchPrepared) return submitImageBatch();
  elements.submitJobButton.disabled = true;
  elements.submitJobButton.textContent = "Vérification du tarif…";
  elements.confirmationMessage.textContent = "";
  try {
    let job = state.jobs.find((item) => item.id === state.activeJobId);
    if (!job && state.preparedRequest) {
      const prepared = await request("/api/jobs/prepare", {
        method: "POST",
        body: JSON.stringify(state.preparedRequest)
      });
      job = prepared.job;
      state.activeJobId = job.id;
      replaceJob(job);
    }
    if (!job) throw new Error("Aucune génération n’est prête à être confirmée.");
    const body = await request(`/api/jobs/${encodeURIComponent(job.id)}/submit`, {
      method: "POST",
      body: JSON.stringify({ confirm: true, estimatedCost: job.estimatedCost })
    });
    state.monitoredJobId = body.job.id;
    replaceJob(body.job);
    const queueDraft = state.drafts.find((draft) => draft.id === body.job.queueDraftId && draft.queueBatchId);
    if (queueDraft && body.job.mediaType === "image") {
      queueDraft.queueStatus = "submitted";
      queueDraft.queueJobId = body.job.id;
      renderImageImportQueue();
    }
    if (elements.confirmationDialog.open) elements.confirmationDialog.close();
    state.activeJobId = null;
    state.preparedRequest = null;
    state.preparedPreview = null;
    elements.formMessage.textContent = `Génération envoyée à ${
      body.job.provider === "heygen" ? "HeyGen" : body.job.provider === "krea" ? "Krea" : "fal"
    }. Le suivi est automatique.`;
    refreshJob(body.job.id);
  } catch (error) {
    elements.confirmationMessage.textContent = error.message;
    await refreshState();
    if (elements.confirmationDialog.open) elements.confirmationDialog.close();
    state.activeJobId = null;
    elements.formMessage.textContent = error.message;
  } finally {
    elements.submitJobButton.disabled = false;
    elements.submitJobButton.textContent = "Confirmer et générer";
  }
}

async function submitImageBatch() {
  if (!imageBatchPrepared || imageBatchSending) return;
  const preparedBatch = imageBatchPrepared;
  imageBatchPrepared = null;
  imageBatchSending = true;
  elements.confirmationDialog.close();
  renderImageBatchBanner();
  let sent = 0;
  try {
    for (const item of preparedBatch.items) {
      const draft = state.drafts.find((entry) => entry.id === item.draftId);
      if (!draft || draft.queueStatus !== "pending") continue;
      elements.formMessage.textContent = `Envoi de la série : ${sent + 1}/${preparedBatch.items.length}…`;
      const { job } = await request("/api/jobs/prepare", {
        method: "POST", body: JSON.stringify(item.generationRequest)
      });
      replaceJob(job);
      if (job.estimatedCost !== item.estimatedCost) {
        throw new Error(`Le tarif de l’image ${draft.queuePosition} a changé. La file est arrêtée avant cet envoi.`);
      }
      const result = await request(`/api/jobs/${encodeURIComponent(job.id)}/submit`, {
        method: "POST", body: JSON.stringify({ confirm: true, estimatedCost: item.estimatedCost })
      });
      replaceJob(result.job);
      state.monitoredJobId = result.job.id;
      draft.queueStatus = "submitted";
      draft.queueJobId = result.job.id;
      sent++;
      renderImageImportQueue();
    }
    elements.formMessage.textContent = `${sent} image${sent > 1 ? "s" : ""} envoyée${sent > 1 ? "s" : ""} à la file de génération.`;
  } catch (error) {
    elements.formMessage.textContent = `Série arrêtée après ${sent} envoi${sent > 1 ? "s" : ""} : ${error.message}`;
    await refreshState();
  } finally {
    imageBatchSending = false;
    renderImageImportQueue();
  }
}

function replaceJob(job) {
  const index = state.jobs.findIndex((item) => item.id === job.id);
  if (index === -1) state.jobs.unshift(job);
  else state.jobs[index] = job;
  renderJobs();
  renderSpending();
}

async function refreshJob(id) {
  if (state.refreshingJobs.has(id)) return;
  state.refreshingJobs.add(id);
  try {
    const body = await request(`/api/jobs/${encodeURIComponent(id)}/refresh`, {
      method: "POST",
      body: "{}"
    });
    replaceJob(body.job);
  } catch (error) {
    const provider = state.jobs.find((item) => item.id === id)?.provider;
    elements.formMessage.textContent = `Suivi ${provider === "heygen" ? "HeyGen" : "fal"} : ${error.message}`;
  } finally {
    state.refreshingJobs.delete(id);
  }
}

function refreshRunningJobs() {
  state.jobs
    .filter((job) => ["submitted", "queued", "running"].includes(job.status))
    .forEach((job) => refreshJob(job.id));
}

function saveComposerText(mediaType = state.mediaType) {
  if (!state.composerTextByMedia[mediaType]) return;
  state.composerTextByMedia[mediaType] = {
    prompt: elements.promptInput.value,
    negativePrompt: elements.negativePromptInput.value
  };
}

function currentComposerKey() {
  return state.mediaType === "video" && state.videoMode === "motion-transfer"
    ? "motionTransfer" : state.mediaType;
}

function selectVideoMode(mode) {
  if (!['generation', 'motion-transfer'].includes(mode)) return;
  saveComposerText(currentComposerKey());
  state.mediaType = "video";
  state.videoMode = mode;
  showCreate();
  loadComposerText(currentComposerKey());
  elements.mediaContext.textContent = mode === "motion-transfer"
    ? "Vidéo · transfert de mouvement" : mediaCopy.video.context;
  elements.promptInput.placeholder = mode === "motion-transfer"
    ? "Décris le personnage, l’intention et ce qui doit rester fidèle pendant le transfert…"
    : mediaCopy.video.placeholder;
  elements.videoModeSwitch.querySelectorAll("[data-video-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.videoMode === mode);
  });
  document.querySelectorAll("[data-media]").forEach((button) => {
    button.classList.toggle("active", button.dataset.media === "video");
  });
  elements.composer?.classList?.toggle("motion-transfer-mode", mode === "motion-transfer");
  elements.addToImageQueueButton.classList.add("hidden");
  elements.referenceEmpty.textContent = mode === "motion-transfer"
    ? "Ajoute une vidéo de mouvement et une image de personnage."
    : "Glisse ici des images ou des sons, ou choisis-les dans Assets.";
  renderReferences();
  renderCatalog();
}

function loadComposerText(mediaType) {
  const text = state.composerTextByMedia[mediaType] || { prompt: "", negativePrompt: "" };
  elements.promptInput.value = text.prompt;
  renderPromptHighlights();
  elements.negativePromptInput.value = text.negativePrompt;
}

function selectMedia(mediaType) {
  if (!mediaCopy[mediaType]) return;
  rememberGenerationSettings();
  saveComposerText(currentComposerKey());
  showCreate();
  state.mediaType = mediaType;
  state.videoMode = "generation";
  elements.formMessage.textContent = "Le brouillon reste sur cette machine.";
  loadComposerText(mediaType);
  elements.mediaContext.textContent = mediaCopy[mediaType].context;
  elements.promptInput.placeholder = mediaCopy[mediaType].placeholder;
  elements.durationField.classList.toggle("hidden", !["video", "music"].includes(mediaType));
  elements.videoModeSwitch.classList.toggle("hidden", mediaType !== "video");
  elements.addToImageQueueButton.classList.toggle("hidden", mediaType !== "image");
  elements.videoModeSwitch.querySelectorAll("[data-video-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.videoMode === "generation");
  });
  elements.composer?.classList?.remove("motion-transfer-mode");
  document.querySelectorAll("[data-media]").forEach((button) => {
    button.classList.toggle("active", button.dataset.media === mediaType);
  });
  renderReferences();
  renderCatalog();
}

function selectDraft(id) {
  const draft = state.drafts.find((item) => item.id === id);
  if (!draft) return;

  state.activeDraftId = id;
  selectMedia(draft.mediaType);
  state.referencesByMedia[draft.mediaType] = structuredClone(draft.references || []);
  renderReferences();
  elements.promptInput.value = draft.prompt;
  renderPromptHighlights();
  elements.negativePromptInput.value = draft.negativePrompt || "";
  const targetModel = findModelForImportTarget(state.catalog, draft.mediaType, draft.target);
  if (targetModel) selectModelEndpoint(targetModel.endpointId);
  renderModelControls();
  // Empty fields in an Atlas handoff are not requests to reset preferences.
  applyGenerationSettings(draft.settings);
  elements.draftOrigin.textContent = draft.source?.module || "Saisie locale";
  const requestedModel = draft.target?.modelHint || draft.target?.modelFamily || draft.target?.endpointId;
  elements.formMessage.textContent = requestedModel && !targetModel
    ? `Brouillon chargé · ${localDate(draft.importedAt)} · modèle demandé « ${requestedModel} » indisponible : choisis un modèle compatible avant de générer.`
    : `Brouillon chargé · ${localDate(draft.importedAt)}`;
  renderDrafts();
  renderImageImportQueue();
  renderCatalog();
  rememberGenerationSettings();
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "La requête locale a échoué.");
  return body;
}

function applyServerDirectorDraft(draft) {
  if (!draft || directorStoryboard.length || directorStoryboardPlan.length) return;
  directorStoryboardPlan = Array.isArray(draft.storyboardPlan)
    ? draft.storyboardPlan.slice(0, 16).map((item, index) => ({
      originalName: String(item.originalName || ""),
      offset: index === 0 ? 0 : Math.max(3, Math.round(Number(item.offset) || index * 5)),
      prompt: String(item.prompt || "")
    })).filter((item) => item.originalName)
    : [];
  if (!directorStoryboardPlan.length) return;
  elements.directorPrompt.value = String(draft.prompt || "");
  elements.directorAspectRatio.value = String(draft.aspectRatio || "16:9");
  elements.directorResolution.value = String(draft.resolution || "768p");
  elements.directorChunkDuration.value = String(draft.chunkDuration || 5);
  elements.directorMemory.value = String(draft.memory || 12);
  elements.directorLimit.value = String(draft.limit || 60);
  elements.directorCueAuto.checked = false;
  renderDirectorCues([""]);
  renderDirectorStoryboard();
  renderDirectorQuote();
  persistDirectorCues();
}

async function refreshState() {
  const localState = await request("/api/state");
  state.drafts = localState.drafts;
  state.catalog = localState.catalog;
  state.providers = localState.providers;
  state.jobs = localState.jobs;
  state.collections = localState.collections || [];
  state.resources = localState.resources || [];
  state.trashedAssetKeys = new Set(localState.trashedAssetKeys || []);
  state.referenceSets = localState.referenceSets || [];
  state.kreaStyles = (localState.kreaStyles || []).filter((style) => !isKrea2Lora(style));
  state.loraTrainingJobs = localState.loraTrainingJobs || [];
  applyServerDirectorDraft(localState.directorDraft);
  renderReferences();
  renderDrafts();
  renderImageImportQueue();
  renderJobs();
  renderCatalog();
  renderKreaLabLibrary();
  renderAssets();
  renderSpending();

  if (state.providers.some((provider) => provider.id === "fal" && provider.configured)) {
    refreshFalStatus();
  }
  if (state.providers.some((provider) => provider.id === "heygen" && provider.configured)) {
    refreshHeygenStatus();
  }

  const requestedDraftId = new URLSearchParams(location.search).get("draft");
  if (requestedDraftId && requestedDraftId !== loadedUrlDraftId
    && state.drafts.some((draft) => draft.id === requestedDraftId)) {
    selectDraft(requestedDraftId);
    loadedUrlDraftId = requestedDraftId;
  }
  const requestedJobId = new URLSearchParams(location.search).get("generation");
  if (requestedJobId) openJobDetail(requestedJobId);
  const requestedView = new URLSearchParams(location.search).get("view");
  if (requestedView === "api" && state.view !== "api") showApi();
}

function showProviderMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function applyFalStatus(status) {
  elements.falStatus.textContent = status.configured ? "Connecté" : "Non configuré";
  elements.falStatus.classList.toggle("connected", Boolean(status.configured));
  if (!status.configured) return;

  if (status.billingAvailable === false) {
    elements.falAccount.textContent = status.billingConfigured
      ? "Clé Admin enregistrée · solde momentanément inaccessible"
      : "Clé génération reconnue · ajoute une clé Admin pour le solde";
    return;
  }

  const balance = status.credits?.current_balance;
  const currency = status.credits?.currency || "USD";
  const balanceLabel = Number.isFinite(Number(balance))
    ? Number(balance).toLocaleString("fr-FR", { style: "currency", currency })
    : "solde indisponible";
  elements.falAccount.textContent = `${status.username || "Compte fal"} · ${balanceLabel}`;
}

async function refreshFalStatus() {
  try {
    applyFalStatus(await request("/api/providers/fal/status"));
  } catch (error) {
    showProviderMessage(elements.falMessage, error.message, true);
  }
}

function applyHeygenStatus(status) {
  elements.heygenStatus.textContent = status.configured ? "Connecté" : "Non configuré";
  elements.heygenStatus.classList.toggle("connected", Boolean(status.configured));
  if (!status.configured) {
    elements.heygenAccount.textContent = "HeyGen Video 1";
    return;
  }
  const balance = status.wallet?.remainingBalance;
  const currency = String(status.wallet?.currency || "USD").toUpperCase();
  const balanceLabel = Number.isFinite(Number(balance))
    ? Number(balance).toLocaleString("fr-FR", { style: "currency", currency })
    : status.billingType === "usage_based" ? "facturation à l’usage" : "solde indisponible";
  elements.heygenAccount.textContent = `${status.username || "Compte HeyGen"} · ${balanceLabel}`;
}

async function refreshHeygenStatus() {
  try {
    const status = await request("/api/providers/heygen/status");
    state.heygenCreditStatus = status;
    applyHeygenStatus(status);
  } catch (error) {
    showProviderMessage(elements.heygenMessage, error.message, true);
  }
}

async function connectHeygen() {
  const apiKey = elements.heygenApiKey.value.trim();
  if (!apiKey) {
    showProviderMessage(elements.heygenMessage, "Colle d’abord ta clé HeyGen.", true);
    return;
  }
  showProviderMessage(elements.heygenMessage, "Vérification auprès de HeyGen…");
  try {
    const status = await request("/api/providers/heygen/connect", {
      method: "POST",
      body: JSON.stringify({ apiKey })
    });
    elements.heygenApiKey.value = "";
    state.heygenCreditStatus = status;
    const provider = state.providers.find((item) => item.id === "heygen");
    if (provider) provider.configured = true;
    else state.providers.push({ id: "heygen", name: "HeyGen", configured: true });
    applyHeygenStatus(status);
    renderProviderCredits();
    showProviderMessage(elements.heygenMessage, "Clé vérifiée et enregistrée localement.");
    await refreshState();
  } catch (error) {
    showProviderMessage(elements.heygenMessage, error.message, true);
  }
}

async function connectFal() {
  const apiKey = elements.falApiKey.value.trim();
  if (!apiKey) {
    showProviderMessage(elements.falMessage, "Colle d’abord ta clé fal.", true);
    return;
  }

  showProviderMessage(elements.falMessage, "Vérification auprès de fal…");
  try {
    const status = await request("/api/providers/fal/connect", {
      method: "POST",
      body: JSON.stringify({ apiKey })
    });
    elements.falApiKey.value = "";
    const provider = state.providers.find((item) => item.id === "fal");
    if (provider) provider.configured = true;
    else state.providers.push({ id: "fal", name: "fal", configured: true });
    applyFalStatus(status);
    updateGenerateButton();
    const message = status.billingAvailable === false
      ? "Clé enregistrée. fal limite seulement l’accès au solde pour cette portée."
      : "Clé vérifiée et enregistrée localement.";
    showProviderMessage(elements.falMessage, message);
  } catch (error) {
    showProviderMessage(elements.falMessage, error.message, true);
  }
}

async function connectFalAdmin() {
  const apiKey = elements.falAdminApiKey.value.trim();
  if (!apiKey) {
    showProviderMessage(elements.falAdminMessage, "Colle d’abord ta clé Admin fal.", true);
    return;
  }

  showProviderMessage(elements.falAdminMessage, "Vérification du solde auprès de fal…");
  try {
    const status = await request("/api/providers/fal/admin/connect", {
      method: "POST",
      body: JSON.stringify({ apiKey })
    });
    elements.falAdminApiKey.value = "";
    state.falCreditStatus = status;
    applyFalStatus(status);
    renderProviderCredits();
    showProviderMessage(
      elements.falAdminMessage,
      "Clé Admin vérifiée et enregistrée pour la consultation du solde."
    );
  } catch (error) {
    showProviderMessage(elements.falAdminMessage, error.message, true);
  }
}

async function verifyFalModel() {
  const endpointId = elements.falEndpointId.value.trim();
  if (!endpointId) {
    showProviderMessage(elements.modelMessage, "Entre un identifiant fal exact.", true);
    return;
  }

  showProviderMessage(elements.modelMessage, "Vérification du modèle et du tarif…");
  try {
    const { model } = await request("/api/providers/fal/models/verify", {
      method: "POST",
      body: JSON.stringify({ endpointId })
    });
    state.catalog = state.catalog.filter((item) => item.endpointId !== model.endpointId);
    state.catalog.unshift(model);
    elements.falEndpointId.value = "";
    renderCatalog();
    showProviderMessage(
      elements.modelMessage,
      `${model.displayName} vérifié · ${priceLabel(model.pricing)}`
    );
  } catch (error) {
    showProviderMessage(elements.modelMessage, error.message, true);
  }
}

async function saveDraft(event) {
  event.preventDefault();
  const prompt = elements.promptInput.value.trim();
  if (!prompt) return;

  elements.formMessage.textContent = "Enregistrement…";
  try {
    const selectedModel = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
    const body = await request("/api/drafts", {
      method: "POST",
      body: JSON.stringify({
        mediaType: state.mediaType,
        prompt,
        negativePrompt: elements.negativePromptInput.value,
        target: {
          provider: elements.modelInput.disabled ? "" : selectedModel?.provider || "fal",
          endpointId: elements.modelInput.disabled ? "" : elements.modelInput.value
        },
        settings: formSettings(),
        references: currentReferences()
      })
    });
    state.drafts.unshift(body.draft);
    state.activeDraftId = body.draft.id;
    elements.draftOrigin.textContent = "Saisie locale";
    elements.formMessage.textContent = "Brouillon enregistré sur cette machine.";
    renderDrafts();
  } catch (error) {
    elements.formMessage.textContent = error.message;
  }
}

async function addCurrentImageToQueue() {
  if (state.mediaType !== "image") return;
  const prompt = elements.promptInput.value.trim();
  if (!prompt) {
    elements.formMessage.textContent = "Écris un prompt avant de l’ajouter à la file.";
    elements.promptInput.focus();
    return;
  }
  const active = state.drafts.find((draft) => draft.id === state.activeDraftId &&
    draft.queueBatchId && draft.queueStatus === "pending");
  const manual = state.drafts.find((draft) => draft.source?.app === "barz-aggregator" &&
    draft.queueBatchId && draft.queueStatus === "pending" &&
    state.drafts.filter((item) => item.queueBatchId === draft.queueBatchId)
      .every((item) => item.queueStatus === "pending"));
  const requestId = active?.queueBatchId || manual?.queueBatchId || crypto.randomUUID();
  const model = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
  elements.addToImageQueueButton.disabled = true;
  try {
    const body = await request("/api/import-queues/image/append", {
      method: "POST",
      body: JSON.stringify({ requestId, item: {
        mediaType: "image", prompt,
        negativePrompt: elements.negativePromptInput.value,
        target: { provider: model?.provider || "", endpointId: model?.endpointId || "" },
        settings: { ...formSettings(), aspectRatio: elements.aspectRatioInput.value },
        references: currentReferences()
      } })
    });
    const revisions = new Map(body.drafts.map((draft) => [draft.id, draft]));
    state.drafts = [body.draft, ...state.drafts.filter((draft) => draft.id !== body.draft.id)
      .map((draft) => revisions.get(draft.id) || draft)];
    imageBatchPrepared = null;
    selectDraft(body.draft.id);
    renderImageImportQueue();
    elements.imageImportQueue.open = true;
    elements.imageImportQueue.scrollIntoView({ behavior: "smooth", block: "nearest" });
    elements.formMessage.textContent = `Image ${body.draft.queuePosition}/${body.draft.queueTotal} ajoutée à la file. Aucun rendu lancé.`;
  } catch (error) {
    elements.formMessage.textContent = `Ajout à la file impossible : ${error.message}`;
  } finally {
    elements.addToImageQueueButton.disabled = false;
  }
}

function formatPreviewCost(preview) {
  if (preview.estimatedCost === null) return "Estimation indisponible";
  return Number(preview.estimatedCost).toLocaleString("fr-FR", {
    style: "currency",
    currency: preview.currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
}

async function quoteGeneration() {
  imageBatchPrepared = null;
  elements.formMessage.textContent = "Calcul du coût…";
  try {
    if (state.mediaType === "image" && elements.aspectRatioInput.value === "auto") {
      const source = currentReferences().find((item) => item.kind === "image" && !item.missing);
      if (source) await measureImageReference(source.url);
    }
    const selectedModel = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
    const references = await prepareReferencesForProvider(selectedModel?.provider || "fal");
    const generationRequest = {
      mediaType: state.mediaType,
      prompt: generationPrompt(),
      negativePrompt: elements.negativePromptInput.value,
      endpointId: elements.modelInput.value,
      ...(state.mediaType === "image" && state.drafts.some((draft) => draft.id === state.activeDraftId && draft.queueBatchId && draft.queueStatus === "pending")
        ? { queueDraftId: state.activeDraftId } : {}),
      target: { provider: selectedModel?.provider || "fal", endpointId: elements.modelInput.value },
      settings: formSettings(),
      references
    };
    const { preview } = await request("/api/generations/preview", {
      method: "POST",
      body: JSON.stringify(generationRequest)
    });
    state.preparedRequest = generationRequest;
    state.preparedPreview = preview;
    state.activeJobId = null;
    const hasMissingReferences = currentReferences().some((reference) => reference.missing);
    const referencesBlocked = hasMissingReferences || !preview.canSubmit;
    elements.confirmationSummary.innerHTML = `
      <div class="preview-line">
        <span>Modèle</span><strong>${escapeHtml(modelLabel(preview))}</strong>
      </div>
      <div class="preview-line">
        <span>Estimation</span><strong>${escapeHtml(formatPreviewCost(preview))}</strong>
      </div>
      <div class="preview-line">
        <span>Action</span><strong>Envoi payant à ${escapeHtml(
          preview.provider === "heygen" ? "HeyGen" : preview.provider === "krea" ? "Krea" : "fal"
        )}</strong>
      </div>
    `;
    elements.confirmationPayload.textContent = JSON.stringify(preview.providerInput, null, 2);
    elements.confirmationMessage.textContent = [
      ...(preview.warnings || []),
      ...(hasMissingReferences
        ? ["Un set contient une référence Missing. Retrouve-la ou retire-la avant de générer."]
        : [])
    ].join(" ");
    elements.confirmationMessage.classList.toggle("warning", referencesBlocked);
    elements.submitJobButton.disabled = referencesBlocked;
    elements.submitJobButton.textContent = referencesBlocked
      ? "Vérifie les paramètres"
      : "Confirmer et générer";
    if (referencesBlocked) {
      elements.formMessage.textContent = elements.confirmationMessage.textContent
        || "Cette génération ne peut pas être envoyée avec les paramètres actuels.";
      return;
    }
    if (!needsGenerationConfirmation(preview)) {
      elements.formMessage.textContent = `Coût vérifié (${formatPreviewCost(preview)}). Envoi direct…`;
      await submitActiveJob();
      return;
    }
    elements.formMessage.textContent = "Coût supérieur à 1,50 $US. Confirme pour lancer la génération.";
    elements.confirmationDialog.showModal();
  } catch (error) {
    elements.formMessage.textContent = error.message;
  }
}

async function quoteImageBatch() {
  const batch = activeImageBatch();
  const model = state.catalog.find((item) => item.endpointId === elements.modelInput.value);
  if (!batch?.pending.length || !model) return;
  if (elements.aspectRatioInput.value === "auto") {
    await Promise.all(batch.pending.map((draft) => {
      const source = (draft.references || []).find((reference) => reference.kind === "image" && !reference.missing);
      return source ? measureImageReference(source.url) : Promise.resolve(null);
    }));
  }
  let estimate;
  try { estimate = imageBatchEstimate(batch, model); } catch { /* The form reports invalid settings below. */ }
  if (!estimate) {
    elements.formMessage.textContent = "Le devis de la file est indisponible. Vérifie le modèle, les réglages et les références.";
    return;
  }
  elements.imageBatchLaunchButton.disabled = true;
  elements.imageBatchLaunchButton.textContent = "Vérification du prix total…";
  elements.formMessage.textContent = `Vérification des ${estimate.items.length} images, sans lancer de génération…`;
  try {
    const quoted = await Promise.all(estimate.items.map(async ({ draft, generationRequest }) => {
      const { preview } = await request("/api/generations/preview", {
        method: "POST", body: JSON.stringify(generationRequest)
      });
      if (!preview.canSubmit || generationRequest.references.some((ref) => ref.missing)) {
        throw new Error(`Image ${draft.queuePosition} : ${preview.validationErrors?.join(" ") || "référence manquante ou tarif indisponible"}`);
      }
      return { draftId: draft.id, generationRequest, estimatedCost: preview.estimatedCost, preview };
    }));
    if (quoted.some((item) => !state.drafts.some((draft) => draft.id === item.draftId && draft.queueStatus === "pending"))) {
      throw new Error("La file a changé pendant le calcul du devis. Relance le devis avec les images restantes.");
    }
    const total = Number(quoted.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(6));
    imageBatchPrepared = { queueBatchId: batch.active.queueBatchId, items: quoted, total };
    state.preparedRequest = null;
    state.preparedPreview = null;
    state.activeJobId = null;
    elements.confirmationSummary.innerHTML = `
      <div class="preview-line"><span>Série</span><strong>${quoted.length} images à lancer</strong></div>
      <div class="preview-line"><span>Modèle</span><strong>${escapeHtml(modelLabel(model))}</strong></div>
      <div class="preview-line"><span>Prix de l’image affichée</span><strong>${escapeHtml(formatPreviewCost(quoted.find((item) => item.draftId === batch.active.id)?.preview || quoted[0].preview))}</strong></div>
      <div class="preview-line"><span>Coût total estimé</span><strong>${escapeHtml(formatPreviewCost({ estimatedCost: total, currency: "USD" }))}</strong></div>
      <div class="preview-line"><span>Action</span><strong>Envoi payant de ${quoted.length} images à ${escapeHtml(model.provider)}</strong></div>`;
    elements.confirmationPayload.textContent = JSON.stringify(quoted.map((item, index) => ({
      image: index + 1, estimatedCost: item.estimatedCost, providerInput: item.preview.providerInput
    })), null, 2);
    elements.confirmationMessage.textContent = "Chaque image sera envoyée séparément. La série s’arrête si un tarif change ou si une image échoue.";
    elements.confirmationMessage.classList.remove("warning");
    elements.submitJobButton.disabled = false;
    elements.submitJobButton.textContent = `Confirmer les ${quoted.length} images`;
    elements.formMessage.textContent = `Série de ${quoted.length} images · total estimé ${formatPreviewCost({ estimatedCost: total, currency: "USD" })}. Confirmation requise.`;
    elements.confirmationDialog.showModal();
  } catch (error) {
    imageBatchPrepared = null;
    elements.formMessage.textContent = `File non lancée : ${error.message}`;
  } finally {
    renderImageBatchBanner();
  }
}

async function importPayload() {
  elements.importMessage.textContent = "";
  try {
    const payload = JSON.parse(elements.importPayload.value);
    const body = await request("/api/imports", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    state.drafts.unshift(body.draft);
    elements.importDialog.close();
    selectDraft(body.draft.id);
  } catch (error) {
    elements.importMessage.textContent = error instanceof SyntaxError
      ? "Le texte collé n’est pas un JSON valide."
      : error.message;
  }
}

document.querySelectorAll("[data-media]").forEach((button) => {
  button.addEventListener("click", () => {
    if (blockNavigationDuringDirector()) return;
    state.referenceReplacementTarget = null;
    state.referencePickerReturnView = null;
    selectMedia(button.dataset.media);
  });
});
elements.assetsButton.addEventListener("click", () => {
  if (blockNavigationDuringDirector()) return;
  state.referencePickerActive = false;
  state.referencePickerReturnView = null;
  state.referenceReplacementTarget = null;
  elements.resourceImportMessage.textContent = "";
  showAssets();
});
elements.spendingButton.addEventListener("click", () => {
  if (!blockNavigationDuringDirector()) showSpending();
});
elements.apiButton.addEventListener("click", () => {
  if (!blockNavigationDuringDirector()) showApi();
});
elements.loraLabButton.addEventListener("click", () => {
  if (!blockNavigationDuringDirector()) showLoraLab();
});
elements.loraTrainer.addEventListener("change", applyLoraTrainerDefaults);
[elements.loraSteps, elements.loraLearningRate, elements.loraTrigger, elements.loraCaption, elements.loraMode]
  .forEach((input) => input.addEventListener("input", invalidateLoraQuote));
elements.loraConfirm.addEventListener("change", updateLoraTrainButton);
elements.loraDatasetButton.addEventListener("click", () => elements.loraDatasetInput.click());
elements.loraDatasetInput.addEventListener("change", () => addLoraDatasetFiles(elements.loraDatasetInput.files).catch((error) => {
  elements.loraMessage.textContent = error.message;
}));
["dragenter", "dragover"].forEach((name) => elements.loraDatasetDrop.addEventListener(name, (event) => {
  event.preventDefault();
  elements.loraDatasetDrop.classList.add("is-dragover");
}));
elements.loraDatasetDrop.addEventListener("dragleave", (event) => {
  if (!elements.loraDatasetDrop.contains(event.relatedTarget)) elements.loraDatasetDrop.classList.remove("is-dragover");
});
elements.loraDatasetDrop.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.loraDatasetDrop.classList.remove("is-dragover");
  addLoraDatasetFiles(event.dataTransfer.files).catch((error) => { elements.loraMessage.textContent = error.message; });
});
elements.loraDatasetGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-lora-resource]");
  if (!button) return;
  state.loraDatasetIds = state.loraDatasetIds.filter((id) => id !== button.dataset.removeLoraResource);
  renderLoraDataset();
  invalidateLoraQuote();
});
elements.loraQuoteButton.addEventListener("click", quoteLoraTraining);
elements.loraLabForm.addEventListener("submit", submitLoraTraining);
elements.loraJobList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-refresh-lora]");
  if (!button) return;
  button.disabled = true;
  refreshLoraJob(button.dataset.refreshLora).catch((error) => { elements.loraMessage.textContent = error.message; });
});
elements.importLocalLoraButton.addEventListener("click", () => {
  elements.localLoraInput.click();
});
elements.localLoraInput.addEventListener("change", () => {
  importLocalLoras(elements.localLoraInput.files).catch((error) => {
    elements.loraMessage.textContent = error.message;
  });
});elements.refreshLoraJobsButton.addEventListener("click", async () => {
  elements.refreshLoraJobsButton.disabled = true;
  try {
    const active = state.loraTrainingJobs.filter((job) => ["submitted", "queued", "running"].includes(job.status));
    await Promise.all(active.map((job) => refreshLoraJob(job.id)));
    if (!active.length) await loadLoraLab();
  } catch (error) { elements.loraMessage.textContent = error.message; }
  finally { elements.refreshLoraJobsButton.disabled = false; }
});
elements.apiProviderGrid.addEventListener("click", (event) => {
  const saveButton = event.target.closest("[data-api-save]");
  if (saveButton) return saveApiProvider(saveButton.dataset.apiSave);
  const deleteButton = event.target.closest("[data-api-delete]");
  if (deleteButton) deleteApiProvider(deleteButton.dataset.apiDelete);
});
elements.directorButton.addEventListener("click", showDirector);
elements.directorUploadReferenceButton.addEventListener("click", () => {
  if (!directorIsActive()) elements.directorReferenceUploadInput.click();
});
elements.directorAssetReferenceButton.addEventListener("click", () => {
  if (!directorIsActive()) openReferenceAssetPicker(null, "director");
});
elements.directorReferenceUploadInput.addEventListener("change", () => {
  uploadDirectorReferenceImages(elements.directorReferenceUploadInput.files);
});
elements.directorReferenceList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-director-reference]");
  if (button) removeDirectorReference(button.dataset.removeDirectorReference);
});
["dragenter", "dragover"].forEach((eventName) => {
  elements.directorReferenceDrop.addEventListener(eventName, (event) => {
    event.preventDefault();
    if (!directorIsActive()) elements.directorReferenceDrop.classList.add("is-dragover");
  });
});
elements.directorReferenceDrop.addEventListener("dragleave", (event) => {
  if (!elements.directorReferenceDrop.contains(event.relatedTarget)) {
    elements.directorReferenceDrop.classList.remove("is-dragover");
  }
});
elements.directorReferenceDrop.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.directorReferenceDrop.classList.remove("is-dragover");
  if (!directorIsActive()) uploadDirectorReferenceImages(event.dataTransfer?.files || []);
});
elements.directorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  directorConfirmation();
});
elements.directorConfirmStartButton.addEventListener("click", startDirectorSession);
elements.directorStopButton.addEventListener("click", () => requestDirectorStop("Arrêt manuel demandé."));
elements.directorSendPromptButton.addEventListener("click", sendDirectorPrompt);
elements.directorLivePrompt.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") sendDirectorPrompt();
});
elements.directorAddCueButton.addEventListener("click", addDirectorCue);
elements.directorClearCuesButton.addEventListener("click", clearDirectorCues);
elements.directorCueAuto.addEventListener("change", persistDirectorCues);
elements.directorPrompt.addEventListener("input", persistDirectorCues);
elements.directorStoryboardUploadButton.addEventListener("click", () => {
  if (!directorIsActive()) elements.directorStoryboardUploadInput.click();
});
elements.directorStoryboardAssetButton.addEventListener("click", () => {
  if (!directorIsActive()) openReferenceAssetPicker(null, "director-storyboard");
});
elements.directorStoryboardClearButton.addEventListener("click", clearDirectorStoryboard);
elements.directorStoryboardUploadInput.addEventListener("change", () => {
  uploadDirectorStoryboardImages(elements.directorStoryboardUploadInput.files);
});
elements.directorStoryboardEnabled.addEventListener("change", () => {
  renderDirectorStoryboard();
  persistDirectorCues();
});
elements.directorStoryboardList.addEventListener("input", () => {
  directorStoryboard = directorStoryboardValues();
  elements.directorStoryboardStatus.textContent = directorStoryboard.length
    ? `${directorStoryboard.length} images · ${directorStoryboard.at(-1).offset}s`
    : "Aucune image";
  persistDirectorCues();
});
elements.directorStoryboardList.addEventListener("change", () => {
  directorStoryboard = directorStoryboardValues();
  renderDirectorStoryboard();
  persistDirectorCues();
});
elements.directorStoryboardList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-storyboard-index]");
  if (!button || directorIsActive()) return;
  directorStoryboard = directorStoryboardValues();
  const index = Number(button.dataset.storyboardIndex);
  if (button.hasAttribute("data-storyboard-remove")) {
    directorStoryboard.splice(index, 1);
  } else {
    const direction = button.dataset.storyboardMove;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target >= 0 && target < directorStoryboard.length) {
      [directorStoryboard[index], directorStoryboard[target]] =
        [directorStoryboard[target], directorStoryboard[index]];
    }
  }
  directorStoryboard.forEach((item, itemIndex) => {
    item.offset = itemIndex === 0 ? 0 : itemIndex * Math.max(3, Number(elements.directorChunkDuration.value) || 5);
  });
  renderDirectorStoryboard();
  persistDirectorCues();
});
[elements.directorAspectRatio, elements.directorResolution, elements.directorChunkDuration,
  elements.directorMemory, elements.directorSeed, elements.directorLimit].forEach((input) => {
  input.addEventListener("change", persistDirectorCues);
});
elements.directorCueList.addEventListener("input", () => {
  persistDirectorCues();
  renderDirectorCueStatus();
});
elements.directorCueList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-director-cue]");
  if (!button || directorIsActive()) return;
  const cues = directorCueValues({ keepEmpty: true });
  if (cues.length <= 1) return;
  cues.splice(Number(button.dataset.removeDirectorCue), 1);
  renderDirectorCues(cues);
  persistDirectorCues();
});
[elements.directorResolution, elements.directorLimit].forEach((input) => {
  input.addEventListener("change", renderDirectorQuote);
});
elements.refreshProviderCreditsButton.addEventListener("click", refreshProviderCredits);
document.querySelectorAll("[data-spending-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.spendingMode = button.dataset.spendingMode;
    renderSpending();
  });
});
elements.spendingPrevious.addEventListener("click", () => shiftSpendingPeriod(-1));
elements.spendingNext.addEventListener("click", () => shiftSpendingPeriod(1));
elements.spendingCalendar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-spending-date]");
  if (!button) return;
  const date = new Date(`${button.dataset.spendingDate}T12:00:00`);
  state.spendingAnchor = date;
  state.spendingSelectedDay = button.dataset.spendingDate;
  state.spendingMode = "day";
  renderSpending();
});
elements.spendingList.addEventListener("click", (event) => {
  const link = event.target.closest("[data-open-spending-job]");
  if (!link) return;
  event.preventDefault();
  openSpendingJob(link.dataset.openSpendingJob);
});
elements.uploadResourcesButton.addEventListener("click", () => {
  if (blockNavigationDuringDirector()) return;
  state.referenceReplacementTarget = null;
  elements.resourceUploadInput.click();
});
elements.resourceUploadInput.addEventListener("change", () => {
  uploadResources(elements.resourceUploadInput.files);
});
elements.referenceAddButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleReferenceAddMenu();
});
elements.referenceLibraryButton.addEventListener("click", openReferenceLibrary);
elements.referenceAddMenu.addEventListener("click", (event) => {
  const source = event.target.closest("[data-reference-source]")?.dataset.referenceSource;
  if (!source) return;
  if (source === "disk") {
    closeReferenceAddMenu();
    elements.referenceUploadInput.click();
  }
  if (source === "assets") openReferenceAssetPicker();
  if (source === "library") openReferenceLibrary();
});
window.addEventListener("message", importReferenceFromLibrary);
elements.referenceUploadInput.addEventListener("change", () => {
  uploadReferenceImage(elements.referenceUploadInput.files);
});
elements.videoModeSwitch.addEventListener("click", (event) => {
  const button = event.target.closest("[data-video-mode]");
  if (button) selectVideoMode(button.dataset.videoMode);
});
["dragenter", "dragover"].forEach((eventName) => {
  elements.referenceSlot.addEventListener(eventName, (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    if (currentReferences().length < 12) elements.referenceSlot.classList.add("is-dragover");
  });
});
elements.referenceSlot.addEventListener("dragleave", (event) => {
  if (!elements.referenceSlot.contains(event.relatedTarget)) {
    elements.referenceSlot.classList.remove("is-dragover");
  }
});
elements.referenceSlot.addEventListener("drop", (event) => {
  if (!event.dataTransfer?.files?.length) return;
  event.preventDefault();
  elements.referenceSlot.classList.remove("is-dragover");
  uploadReferenceImage(event.dataTransfer.files);
});
window.addEventListener("beforeunload", () => {
  stopReferenceLibraryHandshake();
  if (!directorSession) return;
  try { directorSession.send({ type: "stop" }); } catch { /* Fermeture best effort. */ }
  try { directorSession.close(); } catch { /* Fermeture best effort. */ }
});
elements.referenceReplaceUploadInput.addEventListener("change", () => {
  uploadReplacementReferenceImage(elements.referenceReplaceUploadInput.files);
});
elements.referenceReplaceUploadInput.addEventListener("cancel", () => {
  state.referenceReplacementTarget = null;
});
document.querySelectorAll("[data-asset-category]").forEach((button) => {
  button.addEventListener("click", () => {
    state.assetCategory = button.dataset.assetCategory;
    state.collectionFilter = "all";
    state.selectedAssets.clear();
    state.selectionFormatTouched = false;
    elements.selectionMessage.textContent = "";
    renderJobs();
    renderAssets();
  });
});
document.querySelectorAll("[data-asset-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.assetFilter = button.dataset.assetFilter;
    renderAssets();
  });
});

elements.durationInput.addEventListener("input", () => {
  elements.durationOutput.value = `${elements.durationInput.value} s`;
  rememberGenerationSettings();
  updateGenerateButton();
});
elements.modelOptions.addEventListener("input", () => {
  rememberGenerationSettings();
  updateGenerateButton();
});
elements.modelOptions.addEventListener("change", () => {
  rememberGenerationSettings();
  updateGenerateButton();
});
elements.importKreaLorasButton.addEventListener("click", importKreaLoras);
elements.importKreaLorasLabButton.addEventListener("click", importKreaLoras);
elements.kreaLabLibrarySearch.addEventListener("input", renderKreaLabLibrary);
elements.openKreaGeneratorButton.addEventListener("click", openKreaGenerator);
elements.kreaLoraSearch.addEventListener("input", renderKreaLoraMixer);
elements.kreaLoraSourceFilter.addEventListener("change", renderKreaLoraMixer);
elements.kreaLoraCompatibilityFilter.addEventListener("change", renderKreaLoraMixer);
elements.kreaLoraFavoritesFilter.addEventListener("change", renderKreaLoraMixer);
elements.kreaLoraLibrary.addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-krea-favorite]");
  if (favoriteButton) {
    const key = favoriteButton.dataset.kreaFavorite;
    if (state.loraFavorites.has(key)) state.loraFavorites.delete(key);
    else state.loraFavorites.add(key);
    persistLoraPreferences();
    renderKreaLoraMixer();
    return;
  }
  const button = event.target.closest("[data-krea-add]");
  if (!button) return;
  const item = loraLibraryItems().find((candidate) => candidate.key === button.dataset.kreaAdd);
  if (!item || !item.endpointId || state.selectedKreaLoras.some((selected) => selected.key === item.key)) return;
  if (currentLoraEndpoint() !== item.endpointId) {
    selectedModelsByMedia.set("image", item.endpointId);
    renderCatalog();
    selectOptionIfPresent(elements.modelInput, item.endpointId);
    renderModelControls();
    state.selectedKreaLoras = [];
    elements.formMessage.textContent = `Moteur changé pour ${item.model} : seuls les LoRA compatibles peuvent être mélangés.`;
  }
  state.selectedKreaLoras.push({ ...item, strength: 1, enabled: true });
  renderKreaLoraMixer();
  updateGenerateButton();
});
elements.kreaLoraSelected.addEventListener("click", (event) => {
  const card = event.target.closest("[data-krea-selected]");
  if (!card || !event.target.closest("[data-krea-remove]")) return;
  state.selectedKreaLoras = state.selectedKreaLoras.filter((item) => item.key !== card.dataset.kreaSelected);
  renderKreaLoraMixer();
  updateGenerateButton();
});
elements.kreaLoraSelected.addEventListener("input", (event) => {
  const card = event.target.closest("[data-krea-selected]");
  const selected = state.selectedKreaLoras.find((item) => item.key === card?.dataset.kreaSelected);
  if (!selected) return;
  if (event.target.matches("[data-krea-enable]")) selected.enabled = event.target.checked;
  if (event.target.matches("[data-krea-strength], [data-krea-strength-number]")) {
    selected.strength = Math.max(0, Math.min(2, Number(event.target.value) || 0));
    const counterpart = card.querySelector(event.target.matches("[data-krea-strength]")
      ? "[data-krea-strength-number]" : "[data-krea-strength]");
    if (counterpart) counterpart.value = String(selected.strength);
  }
  elements.kreaLoraCount.textContent = `${state.selectedKreaLoras.filter((item) => item.enabled !== false).length} sélectionné(s)`;
  updateGenerateButton();
});
elements.saveKreaLoraPresetButton.addEventListener("click", () => {
  const name = elements.kreaLoraPresetName.value.trim();
  if (!name || !state.selectedKreaLoras.length) {
    elements.kreaLoraMessage.textContent = "Donne un nom au preset et sélectionne au moins un LoRA.";
    return;
  }
  const preset = {
    id: crypto.randomUUID(),
    name,
    endpointId: currentLoraEndpoint(),
    loras: structuredClone(state.selectedKreaLoras),
    createdAt: new Date().toISOString()
  };
  state.loraMixPresets = [preset, ...state.loraMixPresets.filter((item) => item.name !== name)].slice(0, 100);
  persistLoraPreferences();
  elements.kreaLoraPresetName.value = "";
  renderKreaLoraMixer();
  elements.kreaLoraPresetSelect.value = preset.id;
});
elements.loadKreaLoraPresetButton.addEventListener("click", () => {
  const preset = state.loraMixPresets.find((item) => item.id === elements.kreaLoraPresetSelect.value);
  if (!preset) return;
  if (preset.endpointId && currentLoraEndpoint() !== preset.endpointId) {
    selectedModelsByMedia.set("image", preset.endpointId);
    renderCatalog();
    selectOptionIfPresent(elements.modelInput, preset.endpointId);
    renderModelControls();
  }
  const available = new Set(loraLibraryItems().map((item) => item.key));
  state.selectedKreaLoras = preset.loras.filter((item) => available.has(item.key));
  renderKreaLoraMixer();
  updateGenerateButton();
});
elements.deleteKreaLoraPresetButton.addEventListener("click", () => {
  const id = elements.kreaLoraPresetSelect.value;
  if (!id) return;
  state.loraMixPresets = state.loraMixPresets.filter((item) => item.id !== id);
  persistLoraPreferences();
  renderKreaLoraMixer();
});
elements.promptInput.addEventListener("input", () => {
  updateGenerateButton();
  renderPromptHighlights();
});
elements.promptInput.addEventListener("scroll", renderPromptHighlights);
elements.aspectRatioInput.addEventListener("change", () => {
  imageRatioAutoActive = elements.aspectRatioInput.value === "auto";
  renderModelControls();
  rememberGenerationSettings();
});
elements.resolutionInput.addEventListener("change", () => {
  rememberGenerationSettings();
  updateGenerateButton();
});
function fixHeygen2kAspect() {
  elements.aspectRatioInput.value = "16:9";
  renderModelControls();
  elements.formMessage.textContent = "Format passé en 16:9 : la génération HeyGen 2K est maintenant disponible.";
}
elements.fixHeygen2kButton.addEventListener("click", fixHeygen2kAspect);
elements.generateHelpButton.addEventListener("click", openGenerationBlockers);
elements.generationBlockerFixButton.addEventListener("click", () => {
  elements.generationBlockersDialog.close();
  fixHeygen2kAspect();
});
elements.activeJobButton.addEventListener("click", () => {
  const jobId = elements.activeJobButton.dataset.jobId;
  if (!jobId || openJobDetail(jobId)) return;
  const card = [...elements.jobList.querySelectorAll("[data-job-id]")].find((item) => (
    item.dataset.jobId === jobId
  ));
  card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
});
elements.modelFamilyInput.addEventListener("change", () => {
  renderCatalog();
  rememberGenerationSettings();
});
elements.modelInput.addEventListener("change", () => {
  selectedModelsByMedia.set(state.mediaType, elements.modelInput.value);
  renderModelControls();
  renderReferences();
  rememberGenerationSettings();
});

elements.draftForm.addEventListener("submit", saveDraft);
elements.addToImageQueueButton.addEventListener("click", addCurrentImageToQueue);
elements.imageBatchItemsList.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove-queue-draft-id]");
  if (remove) { removeImageQueueDraft(remove.dataset.removeQueueDraftId); return; }
  const item = event.target.closest("[data-batch-draft-id]");
  if (item) selectDraft(item.dataset.batchDraftId);
});
// The mixer is also part of the active engine's settings.
for (const element of [elements.kreaLoraSelected, elements.kreaLoraLibrary,
  elements.loadKreaLoraPresetButton]) {
  element.addEventListener("input", rememberGenerationSettings);
  element.addEventListener("click", rememberGenerationSettings);
}
elements.draftList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-draft-id]");
  if (button) selectDraft(button.dataset.draftId);
});
elements.imageImportQueueList.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove-queue-draft-id]");
  if (remove) {
    removeImageQueueDraft(remove.dataset.removeQueueDraftId);
    return;
  }
  const item = event.target.closest("[data-queue-draft-id]");
  if (item) { selectDraft(item.dataset.queueDraftId); renderImageImportQueue(); }
});

async function removeImageQueueDraft(id) {
  if (imageBatchSending) return;
  const draft = state.drafts.find((item) => item.id === id);
  if (!draft || draft.queueStatus !== "pending") return;
  try {
    const body = await request(`/api/import-queues/image/${encodeURIComponent(id)}`, { method: "DELETE" });
    const revisions = new Map(body.drafts.map((item) => [item.id, item]));
    state.drafts = state.drafts.filter((item) => item.id !== id)
      .map((item) => revisions.get(item.id) || item);
    imageBatchPrepared = null;
    if (state.activeDraftId === id) {
      const next = state.drafts.find((item) => item.queueBatchId === draft.queueBatchId && item.queueStatus === "pending");
      if (next) selectDraft(next.id);
      else {
        state.activeDraftId = null;
        elements.draftOrigin.textContent = "Saisie locale";
        elements.promptInput.value = "";
        state.referencesByMedia.image = [];
        renderPromptHighlights();
        renderReferences();
        updateGenerateButton();
      }
    }
    renderDrafts();
    renderImageImportQueue();
    elements.formMessage.textContent = `Image ${draft.queuePosition}/${draft.queueTotal} retirée de la file.`;
  } catch (error) {
    elements.formMessage.textContent = `Impossible de retirer cette image : ${error.message}`;
  }
}
elements.activityFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-history-range]");
  if (!button) return;
  historyRange = button.dataset.historyRange;
  elements.activityFilters.querySelectorAll("[data-history-range]").forEach((option) => {
    option.setAttribute("aria-pressed", String(option === button));
  });
  elements.historyDates.hidden = historyRange !== "dates";
  renderDrafts();
  renderImageImportQueue();
  renderJobs();
});
for (const field of [elements.historyFrom, elements.historyTo]) {
  field.addEventListener("change", () => {
    if (historyRange === "dates") {
      renderDrafts();
      renderImageImportQueue();
      renderJobs();
    }
  });
}

document.querySelector("#openImportButton").addEventListener("click", () => {
  elements.importPayload.value = JSON.stringify(exampleImport, null, 2);
  elements.importMessage.textContent = "";
  elements.importDialog.showModal();
});

document.querySelector("#importButton").addEventListener("click", importPayload);
document.querySelector("#connectFalButton").addEventListener("click", connectFal);
document.querySelector("#connectFalAdminButton").addEventListener("click", connectFalAdmin);
document.querySelector("#connectHeygenButton").addEventListener("click", connectHeygen);
document.querySelector("#verifyFalModelButton").addEventListener("click", verifyFalModel);
elements.generateButton.addEventListener("click", quoteGeneration);
elements.imageBatchLaunchButton.addEventListener("click", quoteImageBatch);
elements.confirmationDialog.addEventListener("close", () => {
  imageBatchPrepared = null;
  elements.submitJobButton.textContent = "Confirmer et générer";
});
elements.submitJobButton.addEventListener("click", submitActiveJob);
elements.copyJobPromptButton.addEventListener("click", copyActiveJobPrompt);
elements.recreateJobButton.addEventListener("click", recreateActiveJob);
elements.downloadSelectionButton.addEventListener("click", downloadSelection);
elements.renameAssetsButton.addEventListener("click", renameSelectedAssets);
elements.renameAssetsInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    renameSelectedAssets();
  }
});
elements.archiveFormat.addEventListener("change", () => {
  state.selectionFormatTouched = true;
});
elements.moveCollectionInput.addEventListener("change", () => {
  if (elements.moveCollectionInput.value === "__create__") {
    openCollectionDialog("create");
    return;
  }
  state.moveCollectionId = elements.moveCollectionInput.value;
});
elements.moveSelectionButton.addEventListener("click", moveSelection);
elements.sendSelectionToReferencesButton.addEventListener("click", () => {
  sendAssetsToReferences(selectedAssetRecords());
});
elements.deleteSelectedResourcesButton.addEventListener("click", () => {
  openDeleteResourcesDialog(selectedAssetRecords()
    .filter((asset) => asset.kind === "resource")
    .map((asset) => asset.resource.id));
});
elements.trashSelectionButton.addEventListener("click", trashSelectedAssets);
elements.restoreSelectionButton.addEventListener("click", restoreSelectedAssets);
elements.confirmDeleteResourcesButton.addEventListener("click", deleteResources);
elements.referenceSetsButton.addEventListener("click", openReferenceSetDialog);
elements.saveReferenceSetButton.addEventListener("click", saveReferenceSet);
elements.referenceSetNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveReferenceSet();
  }
});
elements.referenceSetList.addEventListener("click", (event) => {
  const loadButton = event.target.closest("[data-load-reference-set]");
  if (loadButton) {
    loadReferenceSet(loadButton.dataset.loadReferenceSet);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-reference-set]");
  if (deleteButton) deleteReferenceSet(deleteButton.dataset.deleteReferenceSet);
});
elements.referenceContextMenu.addEventListener("click", (event) => {
  const source = event.target.closest("[data-reference-replace]")?.dataset.referenceReplace;
  if (source) beginReferenceReplacement(source);
  if (event.target.closest("#revealReferenceButton")) revealReferenceOnDisk();
});
elements.addCollectionButton.addEventListener("click", () => openCollectionDialog("create"));
elements.saveCollectionButton.addEventListener("click", saveCollection);
elements.confirmDeleteCollectionButton.addEventListener("click", deleteCollection);
elements.collectionContextMenu.addEventListener("click", (event) => {
  const action = event.target.closest("[data-collection-action]")?.dataset.collectionAction;
  const collectionId = state.contextCollectionId;
  if (!action || !collectionId) return;
  hideCollectionContextMenu();
  if (action === "rename") openCollectionDialog("rename", collectionId);
  if (action === "delete") openDeleteCollectionDialog(collectionId);
});
elements.collectionNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveCollection();
  }
});
elements.collectionDialog.addEventListener("close", () => {
  state.editingCollectionId = null;
  renderCollections();
});
elements.deleteCollectionDialog.addEventListener("close", () => {
  state.deletingCollectionId = null;
});
elements.deleteResourcesDialog.addEventListener("close", () => {
  state.deletingResourceIds = [];
});
document.querySelector("#clearSelectionButton").addEventListener("click", () => {
  state.selectedAssets.clear();
  state.selectionFormatTouched = false;
  elements.renameAssetsInput.value = "";
  renderJobs();
  renderAssets();
});
elements.jobDetailDialog.addEventListener("close", () => {
  state.activeDetailJobId = null;
  const url = new URL(location.href);
  if (url.searchParams.has("generation")) {
    url.searchParams.delete("generation");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
});
elements.jobList.addEventListener("change", (event) => {
  const input = event.target.closest("[data-select-asset]");
  if (input) toggleAssetSelection(input);
});
elements.jobList.addEventListener("click", (event) => {
  const detailButton = event.target.closest("[data-open-job]");
  if (detailButton) openJobDetail(detailButton.dataset.openJob);
  const button = event.target.closest("[data-confirm-job]");
  if (button) openJobConfirmation(button.dataset.confirmJob);
  const reprepareButton = event.target.closest("[data-reprepare-job]");
  if (reprepareButton) reprepareJob(reprepareButton.dataset.reprepareJob);
});
elements.assetGallery.addEventListener("change", (event) => {
  const input = event.target.closest("[data-select-asset]");
  if (input) toggleAssetSelection(input);
});
elements.assetGallery.addEventListener("click", (event) => {
  const referenceButton = event.target.closest("[data-send-reference]");
  if (referenceButton) {
    const asset = [...completedAssets(), ...uploadedAssets()].find((item) => (
      item.key === referenceButton.dataset.sendReference
    ));
    if (asset) sendAssetsToReferences([asset]);
    return;
  }
  const button = event.target.closest("[data-open-job]");
  if (button) openJobDetail(button.dataset.openJob);
});
elements.assetGallery.addEventListener("contextmenu", (event) => {
  const resourcePreview = event.target.closest("[data-preview-image-url]");
  const tile = resourcePreview?.closest("[data-resource-id]");
  if (!tile) return;
  event.preventDefault();
  showResourceContextMenu(tile.dataset.resourceId, event.clientX, event.clientY);
});
document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-preview-image-url]");
  if (!trigger) return;
  event.preventDefault();
  const card = trigger.closest("#jobList .job-card");
  const jobId = card?.dataset.jobId || (trigger.closest("#jobDetailDialog") ? state.activeDetailJobId : null);
  openImagePreview(trigger.dataset.previewImageUrl, trigger.dataset.previewImageAlt,
    jobId ? { jobId, url: trigger.dataset.previewImageUrl } : null);
});
elements.imagePreviewDialog.addEventListener("click", (event) => {
  if (event.target === elements.imagePreviewDialog || event.target === elements.imagePreviewShell) {
    elements.imagePreviewDialog.close();
  }
});
elements.imagePreviewDialog.addEventListener("close", () => {
  elements.imagePreview.removeAttribute("src");
  state.previewQueueContext = null;
});
elements.referenceList.addEventListener("click", (event) => {
  const motionSlot = event.target.closest("[data-motion-reference-kind]");
  if (motionSlot) {
    state.pendingReferenceKind = motionSlot.dataset.motionReferenceKind;
    elements.referenceUploadInput.accept = state.pendingReferenceKind === "video"
      ? "video/mp4,video/webm,video/quicktime" : "image/*";
    elements.referenceUploadInput.click();
    return;
  }
  const button = event.target.closest("[data-remove-reference]");
  if (button) {
    state.referencesByMedia[referenceStorageKey()] = currentReferences().filter((reference) => (
      reference.id !== button.dataset.removeReference
    ));
    renderReferences();
    elements.formMessage.textContent = "Référence retirée.";
    return;
  }
  const tokenButton = event.target.closest("[data-insert-reference]");
  if (tokenButton) {
    insertReferenceToken(tokenButton.dataset.insertReference);
    return;
  }
  const image = event.target.closest(".reference-chip img");
  if (image && !referenceDrag.suppressClick) toggleReferencePreview(image);
});
elements.referenceList.addEventListener("pointerdown", startReferenceHold);
elements.referenceList.addEventListener("pointermove", moveHeldReference);
elements.referenceList.addEventListener("pointerup", finishReferenceHold);
elements.referenceList.addEventListener("pointercancel", finishReferenceHold);
elements.referenceList.addEventListener("contextmenu", (event) => {
  const chip = event.target.closest(".reference-chip");
  if (!chip || !event.target.closest(".reference-chip img")) return;
  event.preventDefault();
  showReferenceContextMenu(chip.dataset.referenceId, event.clientX, event.clientY);
});
elements.referenceList.addEventListener("keydown", (event) => {
  const image = event.target.closest(".reference-chip img");
  if (!image || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  toggleReferencePreview(image);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".reference-chip")) closeReferencePreviews();
  if (!event.target.closest(".reference-add")) closeReferenceAddMenu();
});
document.addEventListener("keydown", (event) => {
  if ((event.key === "ArrowUp" || event.key === "ArrowDown") && !event.altKey && !event.ctrlKey && !event.metaKey) {
    if (navigateQueue(event.key === "ArrowDown" ? 1 : -1)) event.preventDefault();
  }
  if (event.key === "Escape") {
    closeReferencePreviews();
    closeReferenceAddMenu();
    hideReferenceContextMenu();
  }
});
elements.collectionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-collection-filter]");
  if (!button) return;
  state.collectionFilter = button.dataset.collectionFilter;
  renderAssets();
});
elements.collectionList.addEventListener("contextmenu", (event) => {
  const button = event.target.closest("[data-collection-id]");
  if (!button) return;
  event.preventDefault();
  showCollectionContextMenu(button.dataset.collectionId, event.clientX, event.clientY);
});
elements.deleteResourceContextButton.addEventListener("click", () => {
  const resourceId = state.contextResourceId;
  hideResourceContextMenu();
  if (resourceId) openDeleteResourcesDialog([resourceId]);
});
document.addEventListener("click", (event) => {
  if (!elements.collectionContextMenu.contains(event.target)) hideCollectionContextMenu();
  if (!elements.resourceContextMenu.contains(event.target)) hideResourceContextMenu();
  if (!elements.referenceContextMenu.contains(event.target)) hideReferenceContextMenu();
});
window.addEventListener("blur", () => {
  hideCollectionContextMenu();
  hideResourceContextMenu();
  hideReferenceContextMenu();
});
window.addEventListener("resize", () => {
  hideCollectionContextMenu();
  hideResourceContextMenu();
  hideReferenceContextMenu();
});

renderDirectorCues(storedDirectorCues());
renderDirectorStoryboard();
selectMedia("image");
refreshState().catch((error) => {
  elements.formMessage.textContent = `Serveur local indisponible : ${error.message}`;
});
setInterval(refreshRunningJobs, 2_500);
