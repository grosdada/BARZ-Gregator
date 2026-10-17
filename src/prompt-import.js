const supportedSchemaVersions = new Set(["1.0"]);
const supportedMediaTypes = new Set(["image", "video", "music"]);
const supportedReferenceKinds = new Set(["image", "video", "audio"]);

function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function promptText(value, maxLength) {
  return text(value, maxLength)
    .replace(/\[\s*(?:IMG|Image)[_\s-]*(\d+)\s*\]/gi, "@image$1")
    .replace(/@(?:IMG|Image)[_\s-]*(\d+)/gi, "@image$1");
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeKreaStyles(styles) {
  if (!Array.isArray(styles)) return [];
  return styles.slice(0, 16).flatMap((style) => {
    if (!style || typeof style !== "object") return [];
    const id = text(style.id, 240);
    if (!id) return [];
    const strength = finiteNumber(style.strength);
    return [{ id, strength: Math.max(0, Math.min(2, strength ?? 1)) }];
  });
}

function normalizeFalLoras(loras) {
  if (!Array.isArray(loras)) return [];
  return loras.slice(0, 16).flatMap((lora) => {
    if (!lora || typeof lora !== "object") return [];
    const path = text(lora.path, 2_048);
    if (!path) return [];
    const scale = finiteNumber(lora.scale);
    return [{ path, scale: Math.max(0, Math.min(2, scale ?? 1)) }];
  });
}

function normalizeReferences(references) {
  if (!Array.isArray(references)) return [];

  return references.slice(0, 12).flatMap((reference) => {
    if (!reference || typeof reference !== "object") return [];

    const kind = text(reference.kind, 12).toLowerCase();
    if (!supportedReferenceKinds.has(kind)) return [];

    return [{
      kind,
      id: text(reference.id, 120),
      label: text(reference.label, 160),
      url: text(reference.url, 2_048)
    }];
  });
}

export function normalizePromptAtlasImport(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("Le paquet Prompt Atlas doit être un objet JSON.");
  }

  const schemaVersion = text(payload.schemaVersion, 16);
  if (!supportedSchemaVersions.has(schemaVersion)) {
    throw new TypeError(`Version de contrat non prise en charge : ${schemaVersion || "absente"}.`);
  }

  const sourceApp = text(payload.source?.app, 80).toLowerCase();
  if (sourceApp !== "prompt-atlas") {
    throw new TypeError("La source doit être prompt-atlas.");
  }

  const mediaType = text(payload.mediaType, 16).toLowerCase();
  if (!supportedMediaTypes.has(mediaType)) {
    throw new TypeError("Le type doit être image, video ou music.");
  }

  const prompt = promptText(payload.prompt, 40_000);
  if (!prompt) throw new TypeError("Le prompt ne peut pas être vide.");

  const durationSeconds = positiveNumber(payload.settings?.durationSeconds);
  const width = positiveInteger(payload.settings?.width);
  const height = positiveInteger(payload.settings?.height);

  return {
    schemaVersion,
    source: {
      app: "prompt-atlas",
      version: text(payload.source?.version, 40),
      module: text(payload.source?.module, 120)
    },
    mediaType,
    prompt,
    negativePrompt: promptText(payload.negativePrompt, 20_000),
    target: {
      provider: text(payload.target?.provider, 40).toLowerCase(),
      endpointId: text(payload.target?.endpointId, 240),
      modelFamily: text(payload.target?.modelFamily, 120),
      modelHint: text(payload.target?.modelHint, 240)
    },
    settings: {
      aspectRatio: text(payload.settings?.aspectRatio, 24),
      resolution: text(payload.settings?.resolution, 40),
      imageSize: text(payload.settings?.imageSize, 80),
      ...(payload.settings?.numImages !== undefined ? { numImages: Number(payload.settings.numImages) } : {}),
      ...(typeof payload.settings?.generateAudio === "boolean" ? { generateAudio: payload.settings.generateAudio } : {}),
      ...(payload.settings?.steps !== undefined ? { steps: Number(payload.settings.steps) } : {}),
      ...Object.fromEntries(["horizontalAngle", "verticalAngle", "cameraZoom", "angleStrength"]
        .filter((key) => payload.settings?.[key] !== undefined)
        .map((key) => [key, Number(payload.settings[key])])),
      ...(payload.settings?.guidanceScale !== undefined
        ? { guidanceScale: Number(payload.settings.guidanceScale) }
        : {}),
      ...(Array.isArray(payload.settings?.styles)
        ? { styles: normalizeKreaStyles(payload.settings.styles) }
        : {}),
      ...(Array.isArray(payload.settings?.loras)
        ? { loras: normalizeFalLoras(payload.settings.loras) }
        : {}),
      renderingSpeed: text(payload.settings?.renderingSpeed, 24),
      outputFormat: text(payload.settings?.outputFormat, 24),
      quality: text(payload.settings?.quality, 24),
      background: text(payload.settings?.background, 24),
      ...(finiteNumber(payload.settings?.outputCompression) !== undefined
        ? { outputCompression: finiteNumber(payload.settings.outputCompression) }
        : {}),
      ...(typeof payload.settings?.limitGenerations === "boolean"
        ? { limitGenerations: payload.settings.limitGenerations }
        : {}),
      thinkingLevel: text(payload.settings?.thinkingLevel, 24),
      systemPrompt: text(payload.settings?.systemPrompt, 4_000),
      bitrateMode: text(payload.settings?.bitrateMode, 24),
      ...(typeof payload.settings?.promptExpansionMode === "boolean"
        ? { promptExpansionMode: payload.settings.promptExpansionMode }
        : { promptExpansionMode: text(payload.settings?.promptExpansionMode, 24) }),
      ...(payload.settings?.strength !== undefined ? { strength: Number(payload.settings.strength) } : {}),
      characterOrientation: text(payload.settings?.characterOrientation, 24),
      ...(typeof payload.settings?.keepOriginalSound === "boolean"
        ? { keepOriginalSound: payload.settings.keepOriginalSound }
        : {}),
      ...(typeof payload.settings?.adaptMotion === "boolean"
        ? { adaptMotion: payload.settings.adaptMotion }
        : {}),
      ...(typeof payload.settings?.enhanceIdentity === "boolean"
        ? { enhanceIdentity: payload.settings.enhanceIdentity }
        : {}),
      lyrics: text(payload.settings?.lyrics, 20_000),
      originalLyrics: text(payload.settings?.originalLyrics, 20_000),
      originalTags: text(payload.settings?.originalTags, 4_000),
      ...(typeof payload.settings?.instrumental === "boolean"
        ? { instrumental: payload.settings.instrumental }
        : {}),
      editMode: text(payload.settings?.editMode, 40),
      ...(durationSeconds ? { durationSeconds } : {}),
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      ...(payload.settings?.seed !== undefined
        ? { seed: text(String(payload.settings.seed), 120) }
        : {})
    },
    references: normalizeReferences(payload.references),
    createdAt: text(payload.createdAt, 40)
  };
}

export function createLocalDraft(imported, id, now = new Date()) {
  return {
    id,
    status: "draft",
    importedAt: now.toISOString(),
    ...imported
  };
}
