// Shared by the browser and server so the button and confirmation quote agree.
const canonicalMappings = [
  { source: "prompt", candidates: ["prompt", "tags", "additional_prompt"] },
  { source: "negativePrompt", candidates: ["negative_prompt"] },
  { source: "aspectRatio", candidates: ["aspect_ratio"] },
  { source: "durationSeconds", candidates: [
    "duration", "duration_seconds", "seconds_total", "total_seconds"
  ] },
  { source: "resolution", candidates: ["resolution"] },
  { source: "width", candidates: ["width"] },
  { source: "height", candidates: ["height"] },
  { source: "seed", candidates: ["seed"] },
  { source: "steps", candidates: ["steps", "num_inference_steps"] },
  { source: "guidanceScale", candidates: ["guidance_scale", "guidance"] },
  { source: "horizontalAngle", candidates: ["horizontal_angle"] },
  { source: "verticalAngle", candidates: ["vertical_angle"] },
  { source: "cameraZoom", candidates: ["zoom"] },
  { source: "angleStrength", candidates: ["lora_scale"] },
  { source: "styles", candidates: ["styles"] },
  { source: "loras", candidates: ["loras"] },
  { source: "numImages", candidates: ["num_images"] },
  { source: "generateAudio", candidates: ["generate_audio"] },
  { source: "renderingSpeed", candidates: ["rendering_speed"] },
  { source: "outputFormat", candidates: ["output_format"] },
  { source: "quality", candidates: ["quality"] },
  { source: "background", candidates: ["background"] },
  { source: "outputCompression", candidates: ["output_compression"] },
  { source: "limitGenerations", candidates: ["limit_generations"] },
  { source: "thinkingLevel", candidates: ["thinking_level"] },
  { source: "systemPrompt", candidates: ["system_prompt"] },
  { source: "strength", candidates: ["strength"] },
  { source: "bitrateMode", candidates: ["bitrate_mode"] },
  { source: "promptExpansionMode", candidates: [
    "prompt_expansion_mode", "prompt_enhancement", "enhance_prompt_mode", "enable_prompt_expansion"
  ] },
  { source: "characterOrientation", candidates: ["character_orientation"] },
  { source: "keepOriginalSound", candidates: ["keep_original_sound"] },
  { source: "adaptMotion", candidates: ["adapt_motion"] },
  { source: "enhanceIdentity", candidates: ["enhance_identity"] },
  { source: "lyrics", candidates: ["lyrics"] },
  { source: "originalLyrics", candidates: ["original_lyrics"] },
  { source: "originalTags", candidates: ["original_tags"] },
  { source: "instrumental", candidates: ["instrumental"] },
  { source: "editMode", candidates: ["edit_mode"] }
];

const imageSizePresets = {
  "1:1": { name: "square_hd", label: "1024 × 1024", width: 1024, height: 1024 },
  "4:3": { name: "landscape_4_3", label: "1024 × 768", width: 1024, height: 768 },
  "3:4": { name: "portrait_4_3", label: "768 × 1024", width: 768, height: 1024 },
  "16:9": { name: "landscape_16_9", label: "1024 × 576", width: 1024, height: 576 },
  "9:16": { name: "portrait_16_9", label: "576 × 1024", width: 576, height: 1024 }
};

const additionalImageSizePresets = {
  square: { name: "square", aspectRatio: "1:1", label: "512 × 512", width: 512, height: 512 }
};

function resolveReference(openapi, schema) {
  if (!schema?.$ref) return schema || null;
  if (!schema.$ref.startsWith("#/")) return null;
  return schema.$ref.slice(2).split("/").reduce((value, segment) => (
    value?.[segment.replaceAll("~1", "/").replaceAll("~0", "~")]
  ), openapi);
}

function requestSchema(openapi) {
  if (!openapi || typeof openapi !== "object") return null;
  for (const pathItem of Object.values(openapi.paths || {})) {
    const operation = pathItem?.post;
    const schema = operation?.requestBody?.content?.["application/json"]?.schema;
    if (schema) return resolveReference(openapi, schema);
  }
  return null;
}

export function inputContract(openapi) {
  const schema = requestSchema(openapi);
  if (!schema) return { properties: {}, required: [] };
  const resolved = resolveReference(openapi, schema) || schema;
  return {
    properties: Object.fromEntries(Object.entries(resolved.properties || {}).map(([key, value]) => (
      [key, resolveReference(openapi, value) || value]
    ))),
    required: Array.isArray(resolved.required) ? resolved.required : []
  };
}

function canonicalValues(draft) {
  return {
    prompt: draft.prompt,
    negativePrompt: draft.negativePrompt,
    aspectRatio: draft.settings?.aspectRatio,
    durationSeconds: draft.settings?.durationSeconds,
    resolution: draft.settings?.resolution,
    width: draft.settings?.width,
    height: draft.settings?.height,
    seed: draft.settings?.seed,
    steps: draft.settings?.steps,
    guidanceScale: draft.settings?.guidanceScale,
    horizontalAngle: draft.settings?.horizontalAngle,
    verticalAngle: draft.settings?.verticalAngle,
    cameraZoom: draft.settings?.cameraZoom,
    angleStrength: draft.settings?.angleStrength,
    styles: draft.settings?.styles,
    loras: draft.settings?.loras,
    numImages: draft.settings?.numImages,
    generateAudio: draft.settings?.generateAudio,
    renderingSpeed: draft.settings?.renderingSpeed,
    outputFormat: draft.settings?.outputFormat,
    quality: draft.settings?.quality,
    background: draft.settings?.background,
    outputCompression: draft.settings?.outputCompression,
    limitGenerations: draft.settings?.limitGenerations,
    thinkingLevel: draft.settings?.thinkingLevel,
    systemPrompt: draft.settings?.systemPrompt,
    strength: draft.settings?.strength,
    bitrateMode: draft.settings?.bitrateMode,
    promptExpansionMode: draft.settings?.promptExpansionMode,
    characterOrientation: draft.settings?.characterOrientation,
    keepOriginalSound: draft.settings?.keepOriginalSound,
    adaptMotion: draft.settings?.adaptMotion,
    enhanceIdentity: draft.settings?.enhanceIdentity,
    lyrics: draft.settings?.lyrics,
    originalLyrics: draft.settings?.originalLyrics,
    originalTags: draft.settings?.originalTags,
    instrumental: draft.settings?.instrumental,
    editMode: draft.settings?.editMode
  };
}

function buildProviderInput(draft, contract, model) {
  const values = canonicalValues(draft);
  const input = {};
  const mapped = {};

  for (const mapping of canonicalMappings) {
    const providerName = mapping.candidates.find((name) => name in contract.properties);
    const value = values[mapping.source];
    if (!providerName || value === undefined || value === "") continue;
    const property = contract.properties[providerName];
    const allowed = enumValues(property);
    const enumMatch = allowed.find((item) => String(item) === String(value));
    const types = [property.type, ...(property.anyOf || []).map((item) => item.type)];
    input[providerName] = enumMatch ?? (types.includes("integer") || types.includes("number")
      ? Number(value) : types.includes("string") ? String(value) : value);
    mapped[mapping.source] = providerName;
  }

  const imageSizeProperty = contract.properties.image_size;
  const imageSize = imageSizePresets[draft.settings?.aspectRatio];
  if (imageSizeProperty && imageSize) {
    const enumValues = (imageSizeProperty.anyOf || [])
      .flatMap((variant) => variant.enum || []);
    const selectedSize = draft.settings?.imageSize;
    if (selectedSize && enumValues.includes(selectedSize)) {
      input.image_size = selectedSize;
      mapped.imageSize = "image_size";
    } else if (imageSize.name && enumValues.includes(imageSize.name)) {
      input.image_size = imageSize.name;
      mapped.aspectRatio = "image_size";
    } else if ((imageSizeProperty.anyOf || []).some((variant) => variant.$ref)) {
      input.image_size = { width: imageSize.width, height: imageSize.height };
      mapped.aspectRatio = "image_size";
    }
  }
  if (imageSize && "width" in contract.properties && "height" in contract.properties &&
      draft.settings?.width === undefined && draft.settings?.height === undefined) {
    const modelSize = model?.controls?.imageSizePresets?.[draft.settings?.aspectRatio] || imageSize;
    input.width = modelSize.width;
    input.height = modelSize.height;
    mapped.aspectRatio = "width/height";
  }

  // Seedream scales its small named presets. Explicit supported dimensions
  // keep the size shown in the launcher consistent with the requested output.
  const selectedSize = deriveModelControls(model.inputSchema, model.endpointId).imageSizes
    .find((item) => item.value === draft.settings?.imageSize);
  if (selectedSize?.custom) {
    input.image_size = { width: selectedSize.width, height: selectedSize.height };
    mapped.imageSize = "image_size";
  }
  if (model.endpointId.startsWith("ideogram/v4/")) input.expansion_model = "None";

  const imageReferences = (draft.references || []).filter((reference) => (
    reference.kind === "image" && isReferenceUrl(reference.url)
  ));
  const audioReferences = (draft.references || []).filter((reference) => (
    reference.kind === "audio" && isReferenceUrl(reference.url)
  ));
  const videoReferences = (draft.references || []).filter((reference) => (
    reference.kind === "video" && isReferenceUrl(reference.url)
  ));
  const multiReferenceField = ["image_urls", "reference_image_urls", "reference_images"]
    .find((name) => name in contract.properties);
  const singleReferenceField = [
    "image_url", "reference_image_url", "input_image_url", "first_frame_url", "start_image_url", "image"
  ].find((name) => name in contract.properties);
  if (imageReferences.length && multiReferenceField) {
    input[multiReferenceField] = model.provider === "heygen"
      ? imageReferences.map((reference) => ({ type: "url", url: reference.url }))
      : imageReferences.map((reference) => reference.url);
    mapped.references = multiReferenceField;
  } else if (imageReferences.length && singleReferenceField) {
    input[singleReferenceField] = model.provider === "heygen"
      ? { type: "url", url: imageReferences[0].url }
      : imageReferences[0].url;
    mapped.references = singleReferenceField;
    if (imageReferences[1] && "end_image_url" in contract.properties) {
      input.end_image_url = imageReferences[1].url;
    }
  }
  const mapMediaReferences = (references, multipleCandidates, singleCandidates, mappedName) => {
    const multipleField = multipleCandidates.find((name) => name in contract.properties);
    const singleField = singleCandidates.find((name) => name in contract.properties);
    if (references.length && multipleField) {
      input[multipleField] = model.provider === "heygen"
        ? references.map((reference) => ({ type: "url", url: reference.url }))
        : references.map((reference) => reference.url);
      mapped[mappedName] = multipleField;
      mapped.references ||= multipleField;
    } else if (references.length && singleField) {
      input[singleField] = references[0].url;
      mapped[mappedName] = singleField;
      mapped.references ||= singleField;
    }
  };
  mapMediaReferences(
    audioReferences,
    ["reference_audio_urls", "reference_audio", "audio_urls"],
    ["audio_url", "reference_audio_url", "input_audio_url", "music_url"],
    "audioReferences"
  );
  mapMediaReferences(
    videoReferences,
    ["reference_video_urls", "reference_videos", "video_urls"],
    ["video_url", "reference_video_url", "input_video_url"],
    "videoReferences"
  );
  if (model.endpointId.includes("seedance-2.0/") && input.prompt) {
    input.prompt = input.prompt
      .replace(/@image(\d+)\b/gi, "@Image$1")
      .replace(/@video(\d+)\b/gi, "@Video$1")
      .replace(/@audio(\d+)\b/gi, "@Audio$1");
  }
  if (/^minimax\/h3(?:-max)?\//.test(model.endpointId) && input.prompt) {
    input.prompt = input.prompt
      .replace(/@image(\d+)\b/gi, "Image $1")
      .replace(/@video(\d+)\b/gi, "Video $1")
      .replace(/@audio(\d+)\b/gi, "Audio $1");
    if ("enable_safety_checker" in contract.properties) input.enable_safety_checker = true;
  }
  if (model.provider === "heygen") {
    input.model = "heygen-video-1";
    input.mode = model.mode;
    if (model.mode === "image_to_video") delete input.aspect_ratio;
    if (model.mode === "reference_to_video" && input.prompt) {
      input.prompt = input.prompt
        .replace(/@image(\d+)\b/gi, "<Picture $1>")
        .replace(/@video(\d+)\b/gi, "<Video $1>")
        .replace(/@audio(\d+)\b/gi, "<Audio $1>");
    }
  }
  return { input, mapped };
}

function enumValues(property) {
  if (!property || typeof property !== "object") return [];
  return [
    ...(Array.isArray(property.enum) ? property.enum : []),
    ...(property.anyOf || []).flatMap(enumValues),
    ...(property.oneOf || []).flatMap(enumValues)
  ];
}

export function deriveModelControls(inputSchema, endpointId = "") {
  const contract = inputContract(inputSchema);
  const aspectRatios = enumValues(contract.properties.aspect_ratio)
    .filter((value) => value !== "auto");
  const resolutions = enumValues(contract.properties.resolution);
  const imageSizeNames = enumValues(contract.properties.image_size);
  let imageSizes = imageSizeNames.filter((name) => !name.startsWith("auto")).map((name) => {
    const standard = Object.entries(imageSizePresets)
      .find(([, preset]) => preset.name === name);
    if (standard) {
      const [aspectRatio, preset] = standard;
      return {
        value: name,
        aspectRatio,
        label: preset.label,
        width: preset.width,
        height: preset.height
      };
    }
    const additional = additionalImageSizePresets[name];
    return additional
      ? {
        value: name,
        aspectRatio: additional.aspectRatio,
        label: additional.label,
        width: additional.width,
        height: additional.height
      }
      : { value: name, aspectRatio: null, label: name };
  });
  if (endpointId.includes("seedream/v5/lite/")) {
    imageSizes = Object.keys(imageSizePresets).flatMap((aspectRatio) => {
      const [a, b] = aspectRatio.split(":").map(Number);
      return [2048, 3072, 4096].map((edge) => {
        const scale = Math.max(edge / Math.max(a, b), Math.sqrt(3_686_400 / (a * b)));
        const width = Math.ceil(a * scale / 16) * 16;
        const height = Math.ceil(b * scale / 16) * 16;
        return { value: `custom_${width}x${height}`, label: `${width} × ${height}`,
          aspectRatio, width, height, custom: true };
      });
    });
  }
  if (
    endpointId === "fal-ai/flux-2/turbo" ||
    endpointId.startsWith("fal-ai/flux-2-pro") ||
    endpointId.startsWith("alibaba/qwen-image-3/") ||
    endpointId.startsWith("fal-ai/z-image/turbo") ||
    endpointId.startsWith("ideogram/v4/")
  ) {
    const baseSizes = imageSizes.filter((item) => item.width && item.value !== "square");
    const multipliers = endpointId === "ideogram/v4/image-to-image" ? [2, 4] : [2];
    imageSizes.push(...baseSizes.flatMap((size) => multipliers.map((factor) => ({
      ...size, value: `custom_${size.width * factor}x${size.height * factor}`,
      label: `${size.width * factor} × ${size.height * factor}`,
      width: size.width * factor, height: size.height * factor, custom: true
    }))));
  }
  if (endpointId.startsWith("openai/gpt-image-2")) {
    const gptSizes = {
      "1:1": [[1024, 1024], [2048, 2048], [2880, 2880]],
      "4:3": [[1024, 768], [2048, 1536], [3328, 2496]],
      "3:4": [[768, 1024], [1536, 2048], [2496, 3328]],
      "16:9": [[1024, 576], [1920, 1080], [2560, 1440], [3840, 2160]],
      "9:16": [[576, 1024], [1080, 1920], [1440, 2560], [2160, 3840]]
    };
    imageSizes = Object.entries(gptSizes).flatMap(([aspectRatio, sizes]) => (
      sizes.map(([width, height]) => ({
        value: `custom_${width}x${height}`,
        label: `${width} × ${height}`,
        aspectRatio,
        width,
        height,
        custom: true
      }))
    ));
  }
  const duration = contract.properties.duration || contract.properties.duration_seconds ||
    contract.properties.seconds_total || contract.properties.total_seconds;
  const durations = enumValues(duration).filter((item) => Number(item) > 0).map(Number);
  const durationVariants = [duration, ...(duration?.anyOf || []), ...(duration?.oneOf || [])]
    .filter(Boolean);
  const durationMinimum = durationVariants
    .map((item) => item.minimum).find((value) => value !== undefined);
  const durationMaximum = durationVariants
    .map((item) => item.maximum).find((value) => value !== undefined);
  const extras = canonicalMappings.slice(8).flatMap(({ source, candidates }) => {
    const field = candidates.find((name) => name in contract.properties);
    if (!field) return [];
    const property = contract.properties[field];
    const values = enumValues(property);
    const availableValues = source === "promptExpansionMode" && !values.length
      ? property.examples || []
      : values;
    return [{ key: source, field, type: property.type, values: availableValues,
      default: property.default, minimum: property.minimum, maximum: property.maximum }];
  });
  const referenceGroups = [
    { kind: "image", multi: ["image_urls", "reference_image_urls", "reference_images"], single: ["image_url", "reference_image_url", "input_image_url", "first_frame_url", "start_image_url", "image"] },
    { kind: "audio", multi: ["reference_audio_urls", "reference_audio", "audio_urls"], single: ["audio_url", "reference_audio_url", "input_audio_url", "music_url"] },
    { kind: "video", multi: ["reference_video_urls", "reference_videos", "video_urls"], single: ["video_url", "reference_video_url", "input_video_url"] }
  ].map((group) => ({
    ...group,
    multiField: group.multi.find((name) => name in contract.properties),
    singleField: group.single.find((name) => name in contract.properties)
  }));
  const imageGroup = referenceGroups[0];
  const multiField = imageGroup.multiField;
  const singleField = imageGroup.singleField;
  const referenceKinds = referenceGroups.filter((group) => group.multiField || group.singleField).map((group) => group.kind);
  const maxReferences = Math.min(referenceGroups.reduce((total, group) => {
    if (group.multiField) return total + (contract.properties[group.multiField].maxItems || (endpointId.includes("seedance-2.0") ? 9 : 12));
    if (group.singleField) return total + (group.kind === "image" && contract.properties.end_image_url ? 2 : 1);
    return total;
  }, 0), 12);
  const referenceLimit = endpointId === "fal-ai/flux-2-pro/edit" ? 9
    : /^bytedance\/seedream\/v5\/(?:lite|pro)\/edit$/.test(endpointId) ? 10
      : endpointId === "alibaba/qwen-image-3/edit" ? 3
        : endpointId === "xai/grok-imagine-image/v2.0/edit" ? 5
          : endpointId.startsWith("openai/gpt-image-2.5/") && endpointId.endsWith("/edit") ? 16
            : maxReferences;
  const hasRequiredReference = referenceGroups.some((group) => (
    contract.required.includes(group.multiField) || contract.required.includes(group.singleField)
  ));
  const minReferences = hasRequiredReference ||
    endpointId.endsWith("/edit") || endpointId.endsWith("/image-to-video") ||
    endpointId.endsWith("/reference-to-video") ? 1 : 0;
  return {
    aspectRatios: aspectRatios.length
      ? aspectRatios
      : [...new Set(imageSizes.map((item) => item.aspectRatio).filter(Boolean))],
    resolutions,
    imageSizes,
    defaultResolution: contract.properties.resolution?.default,
    fixedResolution: endpointId.startsWith("blackforestlabs/flux-3/") && endpointId.endsWith("/draft") ? "720p" : null,
    durations,
    durationMin: durations.length ? Math.min(...durations) : durationMinimum ||
      (endpointId === "fal-ai/ace-step/audio-to-audio" ? 5 : 2),
    durationMax: durations.length ? Math.max(...durations) : durationMaximum ||
      (endpointId === "fal-ai/ace-step/audio-to-audio" ? 240 : 20),
    extras,
    seed: Boolean(contract.properties.seed),
    negativePrompt: Boolean(contract.properties.negative_prompt),
    maxReferences: referenceLimit,
    minReferences,
    referenceKinds,
    referenceRole: referenceGroups.some((group) => group.multiField)
      ? "references"
      : maxReferences === 2
        ? "first-last"
        : referenceGroups.some((group) => group.singleField) ? "first" : "none"
  };
}

export function isReferenceUrl(url) {
  if (/^\/api\/resources\/[0-9a-f-]+\/content$/i.test(url || "")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch { return false; }
}

const packLabels = {
  "fal-ai/qwen-image-edit-2511-multiple-angles": "Qwen Multiple Angles · Angle 3D",
  "heygen-video-1/text-to-video": "HeyGen Video 1 · Texte → vidéo",
  "heygen-video-1/image-to-video": "HeyGen Video 1 · Image → vidéo",
  "heygen-video-1/reference-to-video": "HeyGen Video 1 · Multi-références",
  "fal-ai/flux-2/turbo": "FLUX.2 Turbo · Texte → image",
  "fal-ai/flux-2-pro": "FLUX.2 Pro · Texte → image",
  "fal-ai/flux-2-pro/edit": "FLUX.2 Pro · Image → image",
  "bytedance/seedream/v5/lite/text-to-image": "Seedream 5 Lite · Texte → image",
  "bytedance/seedream/v5/lite/edit": "Seedream 5 Lite · Image → image",
  "bytedance/seedream/v5/pro/text-to-image": "Seedream 5 Pro · Texte → image",
  "bytedance/seedream/v5/pro/edit": "Seedream 5 Pro · Image → image",
  "alibaba/qwen-image-3/text-to-image": "Qwen Image 3 · Texte → image",
  "alibaba/qwen-image-3/edit": "Qwen Image 3 · Image → image",
  "fal-ai/wan/v2.7/text-to-image": "Wan 2.7 Image · Texte → image",
  "fal-ai/wan/v2.7/pro/text-to-image": "Wan 2.7 Image Pro · Texte → image",
  "google/nano-banana-2-lite": "Nano Banana 2 Lite · Texte → image",
  "xai/grok-imagine-image/v2.0/text-to-image": "Grok Imagine 2.0 · Texte → image",
  "xai/grok-imagine-image/v2.0/edit": "Grok Imagine 2.0 · Image → image",
  "openai/gpt-image-2": "GPT Image 2.0 · Texte → image",
  "openai/gpt-image-2/edit": "GPT Image 2.0 · Image → image",
  "openai/gpt-image-2.5/flare/text-to-image": "GPT Image 2.5 Flare · Texte → image",
  "openai/gpt-image-2.5/flare/edit": "GPT Image 2.5 Flare · Image → image",
  "openai/gpt-image-2.5/sunburst/text-to-image": "GPT Image 2.5 Sunburst · Texte → image",
  "openai/gpt-image-2.5/sunburst/edit": "GPT Image 2.5 Sunburst · Image → image",
  "fal-ai/nano-banana-2": "Nano Banana 2 · Texte → image",
  "fal-ai/nano-banana-2/edit": "Nano Banana 2 · Édition / références",
  "fal-ai/nano-banana": "Nano Banana Original · Texte → image",
  "fal-ai/nano-banana/edit": "Nano Banana Original · Édition / références",
  "fal-ai/nano-banana-pro": "Nano Banana Pro · Texte → image",
  "fal-ai/nano-banana-pro/edit": "Nano Banana Pro · Édition / références",
  "fal-ai/z-image/turbo": "Z-Image Turbo · Texte → image",
  "fal-ai/z-image/turbo/image-to-image": "Z-Image Turbo · Image → image",
  "ideogram/v4/fast": "Ideogram 4 Fast · Texte → image",
  "ideogram/v4/image-to-image": "Ideogram 4 · Image → image",
  "blackforestlabs/flux-3/text-to-video": "FLUX 3 · Texte → vidéo",
  "blackforestlabs/flux-3/text-to-video/draft": "FLUX 3 Draft · Texte → vidéo",
  "blackforestlabs/flux-3/image-to-video": "FLUX 3 · Image → vidéo",
  "blackforestlabs/flux-3/image-to-video/draft": "FLUX 3 Draft · Image → vidéo",
  "minimax/h3/text-to-video": "MiniMax H3 · Texte → vidéo",
  "minimax/h3/image-to-video": "MiniMax H3 · Première / dernière image",
  "minimax/h3/reference-to-video": "MiniMax H3 · Multi-références",
  "minimax/h3-max/text-to-video": "MiniMax H3 Max · Texte → vidéo",
  "minimax/h3-max/image-to-video": "MiniMax H3 Max · Première / dernière image",
  "minimax/h3-max/reference-to-video": "MiniMax H3 Max · Multi-références",
  "alibaba/wan-3.0/text-to-video": "Wan 3 · Texte → vidéo",
  "alibaba/wan-3.0/image-to-video": "Wan 3 · Première / dernière image",
  "alibaba/wan-3.0/reference-to-video": "Wan 3 · Multi-références",
  "fal-ai/ace-step/prompt-to-audio": "ACE-Step · Composition guidée",
  "fal-ai/ace-step": "ACE-Step · Paroles / chanson",
  "fal-ai/ace-step/audio-to-audio": "ACE-Step · Remix audio",
  "fal-ai/stable-audio-25/text-to-audio": "Stable Audio 2.5 · Texte → audio",
  "fal-ai/stable-audio-25/audio-to-audio": "Stable Audio 2.5 · Audio → audio",
  "cassetteai/music-generator": "CassetteAI · Morceau long"
};

export function modelLabel(model) { return packLabels[model?.endpointId] || model?.displayName || "Modèle"; }

const groupedModelFamilies = [
  { prefix: "openai/gpt-image-2.5/", id: "openai/gpt-image-2.5", label: "GPT Image 2.5" },
  { prefix: "openai/gpt-image-2", id: "openai/gpt-image-2", label: "GPT Image 2.0" },
  { prefix: "xai/grok-imagine-image/v2.0/", id: "xai/grok-imagine-image/v2.0", label: "Grok Imagine 2.0" },
  { prefix: "alibaba/qwen-image-3/", id: "alibaba/qwen-image-3", label: "Qwen Image 3" },
  { prefix: "alibaba/wan-3.0/", id: "alibaba/wan-3.0", label: "Wan 3" },
  { prefix: "bytedance/seedream/v5/", id: "bytedance/seedream/v5", label: "Seedream 5" },
  { prefix: "fal-ai/wan/v2.7/", id: "fal-ai/wan/v2.7", label: "Wan 2.7 Image" },
  { prefix: "fal-ai/flux-2-pro", id: "fal-ai/flux-2-pro", label: "FLUX.2 Pro" },
  { prefix: "google/nano-banana-2-lite", id: "google/nano-banana-2-lite", label: "Nano Banana 2 Lite" },
  {
    prefix: "heygen-video-1/",
    id: "heygen-video-1",
    label: "HeyGen Video 1"
  },
  { prefix: "fal-ai/kling-video/o3/", id: "fal-ai/kling-video/o3", label: "Kling O3" },
  { prefix: "fal-ai/kling-video/v3/", id: "fal-ai/kling-video/v3", label: "Kling 3.0" },
  { prefix: "fal-ai/kling-video/v2.6/", id: "fal-ai/kling-video/v2.6", label: "Kling 2.6" },
  { prefix: "bytedance/seedance-2.5/", id: "bytedance/seedance-2.5", label: "Seedance 2.5" },
  { prefix: "bytedance/seedance-2.0/", id: "bytedance/seedance-2.0", label: "Seedance 2.0" },
  { prefix: "fal-ai/bytedance/seedance/v1.5/", id: "fal-ai/bytedance/seedance/v1.5", label: "Seedance 1.5" },
  { prefix: "fal-ai/bytedance/seedance/v1/", id: "fal-ai/bytedance/seedance/v1", label: "Seedance 1.0" },
  {
    prefix: "fal-ai/z-image/turbo",
    id: "fal-ai/z-image/turbo",
    label: "Z-Image Turbo"
  },
  {
    prefix: "fal-ai/nano-banana-pro",
    id: "fal-ai/nano-banana-pro",
    label: "Nano Banana Pro"
  },
  {
    prefix: "fal-ai/nano-banana-2",
    id: "fal-ai/nano-banana-2",
    label: "Nano Banana 2"
  },
  {
    prefix: "fal-ai/nano-banana",
    id: "fal-ai/nano-banana",
    label: "Nano Banana Original"
  },
  {
    prefix: "blackforestlabs/flux-3/",
    id: "blackforestlabs/flux-3",
    label: "FLUX 3"
  },
  { prefix: "minimax/h3-max/", id: "minimax/h3-max", label: "MiniMax H3 Max" },
  { prefix: "minimax/h3/", id: "minimax/h3", label: "MiniMax H3" },
  { prefix: "fal-ai/ace-step", id: "fal-ai/ace-step", label: "ACE-Step" },
  {
    prefix: "fal-ai/stable-audio-25/",
    id: "fal-ai/stable-audio-25",
    label: "Stable Audio 2.5"
  },
  {
    prefix: "cassetteai/music-generator",
    id: "cassetteai/music-generator",
    label: "CassetteAI"
  },
  { prefix: "ideogram/v4/", id: "ideogram/v4", label: "Ideogram 4" }
];

export function modelFamily(model) {
  const endpointId = String(model?.endpointId || "");
  const grouped = groupedModelFamilies.find((family) => endpointId.startsWith(family.prefix));
  if (grouped) return { id: grouped.id, label: grouped.label };
  return {
    id: endpointId,
    label: modelLabel(model).split(" · ")[0]
  };
}

function normalizedModelTarget(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findModelForImportTarget(models, mediaType, target = {}) {
  const candidates = models.filter((model) => model.mediaType === mediaType);
  const endpointId = String(target.endpointId || "").trim();
  if (endpointId) {
    const exactEndpoint = candidates.find((model) => model.endpointId === endpointId);
    if (exactEndpoint) return exactEndpoint;
  }

  const terms = [target.modelFamily, target.modelHint]
    .map(normalizedModelTarget)
    .filter((term) => term.length >= 3);
  for (const term of terms) {
    const exact = candidates.find((model) => {
      const family = modelFamily(model);
      return [family.id, family.label, modelLabel(model), model.endpointId]
        .map(normalizedModelTarget)
        .includes(term);
    });
    if (exact) return exact;
  }

  for (const term of terms) {
    const partial = candidates.find((model) => {
      const family = modelFamily(model);
      return [family.id, family.label, modelLabel(model), model.endpointId]
        .map(normalizedModelTarget)
        .some((value) => value.includes(term));
    });
    if (partial) return partial;
  }
  return null;
}

export function modelModeLabel(model) {
  const endpointId = String(model?.endpointId || "");
  const description = modelLabel(model).split(" · ").slice(1).join(" · ") || "Standard";
  if (description === "Édition / références") return "Image → image";
  if (/^bytedance\/seedream\/v5\/lite\//.test(endpointId)) return `${description} · Lite`;
  if (/^bytedance\/seedream\/v5\/pro\//.test(endpointId)) return `${description} · Pro`;
  if (/^openai\/gpt-image-2\.5\/flare\//.test(endpointId)) return `${description} · Flare`;
  if (/^openai\/gpt-image-2\.5\/sunburst\//.test(endpointId)) return `${description} · Sunburst`;
  if (endpointId === "fal-ai/wan/v2.7/pro/text-to-image") return `${description} · Pro`;
  if (endpointId === "fal-ai/wan/v2.7/text-to-image") return `${description} · Standard`;
  if (endpointId.startsWith("blackforestlabs/flux-3/") && endpointId.endsWith("/draft")) {
    return `${description} · Draft`;
  }
  if (endpointId === "ideogram/v4/fast") return `${description} · Fast`;
  if (description !== "Standard") return description;

  const operation = [
    ["motion-control", "Motion Transfer"],
    ["reference-to-video", "Multi-références"],
    ["image-to-video", "Image → vidéo"],
    ["text-to-video", "Texte → vidéo"],
    ["video-to-video", "Vidéo → vidéo"],
    ["audio-to-video", "Audio → vidéo"],
    ["image-to-image", "Image → image"],
    ["text-to-image", "Texte → image"]
  ].find(([slug]) => endpointId.endsWith(`/${slug}`))?.[1];
  if (!operation) return description;

  const tier = /\/pro\/fast\//.test(endpointId) ? "Pro Fast"
    : /\/fast\//.test(endpointId) ? "Fast"
      : /\/pro\//.test(endpointId) ? "Pro"
        : /\/standard\//.test(endpointId) ? "Standard"
          : /\/lite\//.test(endpointId) ? "Lite"
            : /\/us\//.test(endpointId) ? "US"
              : "";
  return tier ? `${operation} · ${tier}` : operation;
}

function estimateUnits(model, draft, providerInput) {
  const unit = String(model.pricing?.unit || "").toLowerCase();
  if (!unit) return null;
  if (unit.includes("second")) {
    return Number(
      providerInput.duration ?? providerInput.duration_seconds ?? providerInput.seconds_total ??
      providerInput.total_seconds ?? draft.settings?.durationSeconds
    ) || null;
  }
  if (unit.includes("minute")) {
    const seconds = Number(providerInput.duration ?? draft.settings?.durationSeconds);
    return seconds > 0 ? seconds / 60 : null;
  }
  if (/bytedance\/seedance-2\.(?:0\/fast|5\/)/.test(model.endpointId) &&
      unit === "1000 tokens") {
    const shortEdge = { "480p": 480, "720p": 720, "1080p": 1080 }[
      String(providerInput.resolution).toLowerCase()
    ];
    const [a, b] = String(providerInput.aspect_ratio).split(":").map(Number);
    const duration = Number(providerInput.duration);
    if (!shortEdge || !(a > 0 && b > 0 && duration > 0)) return null;
    // fal bills actual output pixels. Dimensions are estimated on a 16px grid.
    const longEdge = Math.round(shortEdge * Math.max(a, b) / Math.min(a, b) / 16) * 16;
    return shortEdge * longEdge * duration * 24 / 1024 / 1000;
  }
  if (unit.includes("megapixel") || model.endpointId.startsWith("ideogram/v4/")) {
    const customSize = providerInput.image_size;
    const preset = typeof customSize === "string"
      ? [
        ...Object.values(imageSizePresets),
        ...Object.values(additionalImageSizePresets)
      ].find((item) => item.name === customSize)
      : null;
    const width = Number(customSize?.width || draft.settings?.width || preset?.width);
    const height = Number(customSize?.height || draft.settings?.height || preset?.height);
    const imageCount = Number(providerInput.num_images || 1);
    if (!(width > 0 && height > 0 && imageCount > 0)) return null;
    if (model.endpointId.startsWith("ideogram/v4/")) {
      const speed = { TURBO: 0.75, BALANCED: 1.5, QUALITY: 2.5 }[providerInput.rendering_speed];
      return speed ? width * height * imageCount / 1_048_576 * speed : null;
    }
    return (width * height * imageCount) / 1_000_000;
  }
  if (
    unit.includes("image") || unit.includes("video") || unit.includes("audio") ||
    unit.includes("output") || unit.includes("request") ||
    unit.includes("generation")
  ) return Number(providerInput.num_images || 1);
  return null;
}

function outputImageDimensions(draft, input) {
  const custom = input.image_size;
  if (custom && typeof custom === "object") {
    return { width: Number(custom.width), height: Number(custom.height) };
  }
  const preset = typeof custom === "string"
    ? [...Object.values(imageSizePresets), ...Object.values(additionalImageSizePresets)]
      .find((item) => item.name === custom)
    : null;
  if (preset) return { width: preset.width, height: preset.height };
  return {
    width: Number(draft.settings?.width) || 1024,
    height: Number(draft.settings?.height) || 1024
  };
}

function nearestImagePrice(rows, draft, input, quality, edit) {
  const { width, height } = outputImageDimensions(draft, input);
  const targetArea = width * height;
  const row = rows.reduce((nearest, candidate) => (
    Math.abs(candidate.area - targetArea) < Math.abs(nearest.area - targetArea)
      ? candidate : nearest
  ));
  const normalizedQuality = quality === "auto" ? "high" : quality;
  const value = row[edit ? `edit_${normalizedQuality}` : normalizedQuality];
  return Number.isFinite(value) ? value : null;
}

function effectivePricing(model, draft, input) {
  const resolution = input.resolution || draft.settings?.resolution ||
    (model.endpointId.endsWith("/draft") ? "720p" : undefined);
  const imageCountPricing = (unitPrice) => ({
    ...model.pricing, unit: "images", unitPrice, selectedResolution: resolution
  });
  if (model.endpointId.startsWith("fal-ai/flux-2-pro")) {
    const { width, height } = outputImageDimensions(draft, input);
    const outputMegapixels = Math.max(1, Math.ceil(width * height / 1_048_576));
    const inputMegapixels = model.endpointId.endsWith("/edit")
      ? (draft.references || []).filter((reference) => reference.kind === "image").length
      : 0;
    return imageCountPricing(0.03 + 0.015 * Math.max(0, outputMegapixels - 1 + inputMegapixels));
  }
  if (model.endpointId.startsWith("bytedance/seedream/v5/pro/")) {
    const size = input.image_size;
    const { width, height } = outputImageDimensions(draft, input);
    const is2K = size === "auto_2K" || width * height > 1536 * 1536;
    return imageCountPricing(is2K ? 0.135 : 0.0675);
  }
  if (model.endpointId.startsWith("alibaba/qwen-image-3/")) {
    return imageCountPricing(0.075);
  }
  if (model.endpointId === "google/nano-banana-2-lite") {
    return imageCountPricing(0.05);
  }
  if (model.endpointId.startsWith("xai/grok-imagine-image/v2.0/")) {
    const quality = input.quality || "medium";
    const key = `${String(resolution || "1k").toLowerCase()}_${quality}`;
    return imageCountPricing({ "1k_low": 0.04, "1k_medium": 0.06,
      "2k_low": 0.06, "2k_medium": 0.08 }[key] ?? null);
  }
  if (model.endpointId.startsWith("openai/gpt-image-2")) {
    const is25 = model.endpointId.startsWith("openai/gpt-image-2.5/");
    const edit = model.endpointId.endsWith("/edit");
    const rows = is25 ? [
      { area: 1024 * 768, low: 0.0041, medium: 0.0091, high: 0.0362,
        edit_low: 0.0124, edit_medium: 0.0174, edit_high: 0.0445 },
      { area: 1024 * 1024, low: 0.006, medium: 0.0133, high: 0.0528,
        edit_low: 0.0142, edit_medium: 0.0215, edit_high: 0.061 },
      { area: 1024 * 1536, low: 0.0048, medium: 0.0104, high: 0.0413,
        edit_low: 0.0131, edit_medium: 0.0186, edit_high: 0.0495 },
      { area: 1920 * 1080, low: 0.0045, medium: 0.0096, high: 0.0395,
        edit_low: 0.0128, edit_medium: 0.0179, edit_high: 0.0478 },
      { area: 2560 * 1440, low: 0.0062, medium: 0.0144, high: 0.0554,
        edit_low: 0.0145, edit_medium: 0.0227, edit_high: 0.0636 },
      { area: 3840 * 2160, low: 0.0112, medium: 0.026, high: 0.1002,
        edit_low: 0.0195, edit_medium: 0.0343, edit_high: 0.1084 }
    ] : [
      { area: 1024 * 768, low: 0.005, medium: 0.037, high: 0.145,
        edit_low: 0.011, edit_medium: 0.043, edit_high: 0.151 },
      { area: 1024 * 1024, low: 0.006, medium: 0.053, high: 0.211,
        edit_low: 0.015, edit_medium: 0.061, edit_high: 0.219 },
      { area: 1024 * 1536, low: 0.005, medium: 0.042, high: 0.165,
        edit_low: 0.018, edit_medium: 0.054, edit_high: 0.178 },
      { area: 1920 * 1080, low: 0.005, medium: 0.04, high: 0.158,
        edit_low: 0.017, edit_medium: 0.053, edit_high: 0.158 },
      { area: 2560 * 1440, low: 0.007, medium: 0.056, high: 0.222,
        edit_low: 0.019, edit_medium: 0.068, edit_high: 0.234 },
      { area: 3840 * 2160, low: 0.012, medium: 0.101, high: 0.401,
        edit_low: 0.024, edit_medium: 0.113, edit_high: 0.413 }
    ];
    const quality = input.quality || "high";
    const tableQuality = ["xhigh", "max"].includes(quality) ? "high" : quality;
    let price = nearestImagePrice(rows, draft, input, tableQuality, edit);
    if (quality === "xhigh") price *= 2;
    if (quality === "max") price *= 3;
    if (edit && (draft.references || []).length > 1) {
      price += 0.008 * ((draft.references || []).length - 1);
    }
    return imageCountPricing(price);
  }
  if (model.endpointId.startsWith("fal-ai/nano-banana-2")) {
    const multiplier = { "0.5K": 0.75, "1K": 1, "2K": 1.5, "4K": 2 }[resolution];
    return { ...model.pricing, unitPrice: multiplier === undefined ? null : model.pricing?.unitPrice * multiplier,
      selectedResolution: resolution };
  }
  if (model.endpointId.startsWith("fal-ai/nano-banana-pro")) {
    const multiplier = resolution === "4K" ? 2 : 1;
    return {
      ...model.pricing,
      unitPrice: model.pricing?.unitPrice * multiplier,
      selectedResolution: resolution
    };
  }
  const tierPrice = model.pricing?.tiersByResolution?.[resolution];
  return tierPrice === undefined
    ? model.pricing
    : { ...model.pricing, unitPrice: tierPrice, selectedResolution: resolution };
}

export function createGenerationPreview(draft, model) {
  if (!draft?.prompt?.trim()) {
    const error = new TypeError("Le prompt est requis pour préparer une génération.");
    error.statusCode = 400;
    throw error;
  }
  if (!model || !["fal", "heygen", "krea"].includes(model.provider) || !model.verifiedAt) {
    const error = new TypeError("Le modèle doit être disponible dans le catalogue d’un fournisseur connecté.");
    error.statusCode = 400;
    throw error;
  }
  if (model.mediaType !== draft.mediaType) {
    const error = new TypeError("Le modèle vérifié ne correspond pas au type de création.");
    error.statusCode = 400;
    throw error;
  }

  const contract = inputContract(model.inputSchema);
  const { input, mapped } = buildProviderInput(draft, contract, model);
  const controls = deriveModelControls(model.inputSchema, model.endpointId);
  const defaults = Object.fromEntries(Object.entries(contract.properties)
    .filter(([, property]) => property.default !== undefined)
    .map(([key, property]) => [key, property.default]));
  const effectiveInput = { ...defaults, ...input };
  const missingRequired = contract.required.filter((name) => (
    input[name] === undefined && contract.properties[name]?.default === undefined
  ));
  const pricing = effectivePricing(model, draft, effectiveInput);
  const units = estimateUnits({ ...model, pricing }, draft, effectiveInput);
  const unitPrice = Number(pricing?.unitPrice);
  const estimatedCost = units !== null && pricing?.unitPrice != null && Number.isFinite(unitPrice)
    ? Number((units * unitPrice).toFixed(6))
    : null;
  const warnings = [];
  const validationErrors = [];
  for (const [field, value] of Object.entries(input)) {
    const property = contract.properties[field];
    const allowed = enumValues(property);
    if (allowed.length && typeof value !== "object" && !allowed.includes(value)) {
      validationErrors.push(`Valeur non disponible pour ${property.title || field} : ${value}.`);
    }
    const numeric = property?.type === "integer" || property?.type === "number" ||
      (property?.anyOf || []).some((item) => item.type === "integer" || item.type === "number");
    if (numeric && (!Number.isFinite(value) ||
        ((property.type === "integer" || field === "seed") && !Number.isSafeInteger(value)) ||
        (property.minimum !== undefined && value < property.minimum) ||
        (property.maximum !== undefined && value > property.maximum))) {
      validationErrors.push(`Valeur hors limites pour ${property.title || field}.`);
    }
    if (typeof value === "string" && ((property?.minLength && value.length < property.minLength) ||
        (property?.maxLength && value.length > property.maxLength))) {
      validationErrors.push(`Longueur du texte incorrecte pour ${property.title || field}.`);
    }
    if (Array.isArray(value) && (
      (property?.minItems !== undefined && value.length < property.minItems) ||
      (property?.maxItems !== undefined && value.length > property.maxItems)
    )) {
      validationErrors.push(`Nombre d’éléments incorrect pour ${property.title || field}.`);
    }
  }
  const references = draft.references || [];
  const referenceKindLabels = { image: "image", audio: "audio", video: "vidéo" };
  const acceptedReferenceKinds = new Set(controls.referenceKinds || []);
  const acceptedReferenceLabel = [...acceptedReferenceKinds].map((kind) => referenceKindLabels[kind]).join(", ");
  if (references.length < controls.minReferences) validationErrors.push("Ajoute au moins un média de référence pour ce mode.");
  if (references.length > controls.maxReferences) validationErrors.push(controls.maxReferences
    ? `Ce mode accepte au maximum ${controls.maxReferences} média(s) de référence. Retire les médias en trop ou choisis un mode multi-références.`
    : "Ce mode utilise le texte seul. Choisis un mode avec références ou vide le deck.");
  if (references.some((reference) => !acceptedReferenceKinds.has(reference.kind) || !isReferenceUrl(reference.url) || reference.missing)) {
    validationErrors.push(`Un média de référence est manquant ou incompatible${acceptedReferenceLabel ? ` (accepté : ${acceptedReferenceLabel})` : ""}. Remplace-le ou retire-le du deck.`);
  }
  for (const kind of ["image", "audio", "video"]) {
    const count = references.filter((reference) => reference.kind === kind).length;
    if ([...draft.prompt.matchAll(new RegExp(`@${kind}(\\d+)\\b`, "gi"))]
      .some((match) => Number(match[1]) < 1 || Number(match[1]) > count)) {
      validationErrors.push(`Un @${kind} du prompt ne correspond à aucun média de ce type dans le deck.`);
    }
    const multipleCandidates = {
      image: ["image_urls", "reference_image_urls", "reference_images"],
      audio: ["reference_audio_urls", "reference_audio", "audio_urls"],
      video: ["reference_video_urls", "reference_videos", "video_urls"]
    }[kind];
    const multipleField = multipleCandidates.find((name) => name in contract.properties);
    const maximum = contract.properties[multipleField]?.maxItems;
    if (maximum && count > maximum) {
      validationErrors.push(`Ce mode accepte au maximum ${maximum} référence(s) ${kind}.`);
    }
  }
  const audioCount = references.filter((reference) => reference.kind === "audio").length;
  const visualReferenceCount = references.filter((reference) => (
    reference.kind === "image" || reference.kind === "video"
  )).length;
  if (audioCount && /^(?:minimax\/h3(?:-max)?|bytedance\/seedance-2\.0)\//.test(model.endpointId) && !visualReferenceCount) {
    validationErrors.push("Une référence audio doit être accompagnée d’au moins une image ou une vidéo.");
  }
  if (model.provider === "heygen" && input.resolution === "2k" &&
      input.aspect_ratio && !["16:9", "9:16"].includes(input.aspect_ratio)) {
    validationErrors.push("HeyGen 2K est disponible uniquement en 16:9 ou 9:16.");
  }

  if (!Object.keys(contract.properties).length) {
    warnings.push(`Le schéma d’entrée ${model.provider} n’est pas disponible dans le catalogue local.`);
  }
  if (missingRequired.length) {
    if (!(controls.minReferences > 0 && references.length < controls.minReferences)) {
      validationErrors.push(`Paramètres obligatoires non renseignés : ${missingRequired.map((name) => contract.properties[name]?.title || name).join(", ")}.`);
    }
  }
  if (estimatedCost === null) {
    warnings.push("Le tarif existe mais son unité ne permet pas encore un calcul fiable.");
  }
  if (model.endpointId === "google/nano-banana-2-lite") {
    warnings.push("Estimation indicative : Nano Banana 2 Lite est facturé aux tokens d’image et de texte.");
  }
  if (model.endpointId.startsWith("openai/gpt-image-2")) {
    warnings.push("Estimation selon les tailles canoniques fal ; un prompt long ou plusieurs références peuvent augmenter le coût.");
  }
  if (draft.references?.length && !mapped.references) {
    warnings.push(
      "Ce modèle n’expose pas de champ compatible avec ces références. Choisis un autre modèle ou retire les références."
    );
  }
  if (model.endpointId === "minimax/h3-max/reference-to-video") {
    warnings.push(
      "L’estimation couvre la vidéo. fal peut ajouter 0,02 USD par tranche de 1 000 tokens de références au-delà des 4 096 tokens inclus."
    );
  }
  if (/bytedance\/seedance-2\.(?:0|5)\//.test(model.endpointId)) {
    warnings.push("Estimation selon les dimensions prévues ; fal facture les dimensions réelles de la vidéo.");
  }
  if (model.provider === "heygen") warnings.push(
    "Estimation prudente au tarif public HeyGen. Une promotion éventuelle peut réduire le montant réellement facturé."
  );

  return {
    provider: model.provider,
    endpointId: model.endpointId,
    displayName: modelLabel(model),
    mediaType: model.mediaType,
    generationDraft: structuredClone(draft),
    references: structuredClone(draft.references || []),
    providerInput: input,
    mappedParameters: mapped,
    missingRequired,
    pricing,
    estimatedUnits: units,
    estimatedCost,
    currency: pricing?.currency || null,
    warnings: [...validationErrors, ...warnings],
    validationErrors,
    canSubmit: !validationErrors.length && estimatedCost !== null,
    submissionLocked: true,
    preparedAt: new Date().toISOString()
  };
}

export function deriveFalFamily(endpointId, category) {
  const markers = [
    "/text-to-image", "/image-to-image", "/text-to-video", "/image-to-video",
    "/first-last-frame-to-video", "/keyframes-to-video", "/extend-video",
    "/text-to-audio", "/text-to-music", "/prompt-to-audio", "/audio-to-audio",
    "/video-to-video"
  ];
  const marker = markers.find((item) => endpointId.includes(item));
  const familyId = marker ? endpointId.slice(0, endpointId.indexOf(marker)) : endpointId;
  return {
    familyId,
    mode: category || "unknown",
    variant: endpointId.endsWith("/draft") ? "draft" : "standard"
  };
}

export function deriveFalResolutionPrices(endpointId, baseUnitPrice) {
  if (endpointId.startsWith("alibaba/wan-3.0/")) {
    const base = Number(baseUnitPrice);
    if (!Number.isFinite(base)) return null;
    return { "480p": Number(base.toFixed(8)), "720p": Number((base * 2).toFixed(8)),
      "1080p": Number((base * 4).toFixed(8)) };
  }
  if (endpointId.startsWith("bytedance/seedance-2.5/")) {
    const base = Number(baseUnitPrice);
    if (!Number.isFinite(base)) return null;
    return {
      "480p": Number(base.toFixed(8)),
      "720p": Number(base.toFixed(8)),
      "1080p": Number((base * (0.02808 / 0.02568)).toFixed(8))
    };
  }
  if (endpointId.startsWith("minimax/h3-max/")) {
    const base = Number(baseUnitPrice);
    if (!Number.isFinite(base)) return null;
    return {
      "480P": Number(base.toFixed(8)),
      "768P": Number((base * 1.6).toFixed(8)),
      "1080P": Number((base * 3.2).toFixed(8))
    };
  }
  if (!endpointId.startsWith("blackforestlabs/flux-3/")) return null;
  if (endpointId.includes("draft-enhance")) return { "1080p": 0.29 };
  const isExtend = endpointId.includes("extend-video");
  const isDraft = endpointId.endsWith("/draft");
  // Platform prices are base billing units, not the displayed per-second rate.
  // Apply the documented ratio to fresh base prices so a tariff change is caught.
  if (!isExtend && baseUnitPrice != null && Number.isFinite(Number(baseUnitPrice))) {
    const factor = Number(baseUnitPrice) / (isDraft ? 0.03 : 0.085);
    return Object.fromEntries(Object.entries(isDraft ? { "720p": 0.06 } : { "720p": 0.17, "1080p": 0.29 })
      .map(([resolution, price]) => [resolution, Number((price * factor).toFixed(8))]));
  }
  if (isDraft) return { "720p": isExtend ? 0.12 : 0.06 };
  return isExtend
    ? { "720p": 0.41, "1080p": 0.53 }
    : { "720p": 0.17, "1080p": 0.29 };
}
