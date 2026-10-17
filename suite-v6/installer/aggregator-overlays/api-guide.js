const PROVIDERS = [
  {
    id: "fal",
    number: "01",
    priority: true,
    eyebrow: { fr: "Génération principale", en: "Primary generation" },
    title: "fal",
    steps: {
      fr: ["Crée un compte fal ou connecte-toi.", "Dans Billing, ajoute un moyen de paiement et un petit montant de crédits.", "Dans Keys, crée une clé de génération et copie-la immédiatement.", "Reviens ici, colle-la dans la carte fal puis clique sur Vérifier et enregistrer."],
      en: ["Create a fal account or sign in.", "In Billing, add a payment method and a small amount of credits.", "In Keys, create a generation key and copy it immediately.", "Return here, paste it into the fal card, then click Verify and save."]
    },
    note: { fr: "La clé Admin est facultative et sert uniquement à lire le solde. La génération utilise la clé fal normale.", en: "The Admin key is optional and is only used to read the balance. Generation uses the regular fal key." },
    links: [
      ["https://fal.ai/", { fr: "Ouvrir fal", en: "Open fal" }],
      ["https://fal.ai/dashboard/keys", { fr: "Créer la clé", en: "Create key" }],
      ["https://fal.ai/dashboard/billing", { fr: "Ajouter des crédits", en: "Add credits" }],
      ["https://fal.ai/docs", { fr: "Documentation", en: "Documentation" }]
    ]
  },
  {
    id: "heygen", number: "02", eyebrow: { fr: "Vidéo et dialogue", en: "Video and dialogue" }, title: "HeyGen",
    steps: {
      fr: ["Crée un compte HeyGen.", "Achète des crédits API Pay-As-You-Go. Le solde API est séparé des crédits du forfait web.", "Dans Settings → API, génère le token et conserve-le : HeyGen ne le réaffiche pas sans régénération.", "Colle-le dans la carte HeyGen puis vérifie-le."],
      en: ["Create a HeyGen account.", "Buy Pay-As-You-Go API credits. The API balance is separate from web-plan credits.", "In Settings → API, generate the token and keep it safe: HeyGen will not show it again without regenerating it.", "Paste it into the HeyGen card and verify it."]
    },
    links: [
      ["https://app.heygen.com/", { fr: "Ouvrir HeyGen", en: "Open HeyGen" }],
      ["https://app.heygen.com/settings", { fr: "Réglages HeyGen", en: "HeyGen settings" }],
      ["https://www.heygen.com/api-pricing", { fr: "Crédits et tarifs", en: "Credits and pricing" }],
      ["https://developers.heygen.com/", { fr: "Documentation", en: "Documentation" }]
    ]
  },
  {
    id: "openai", number: "03", eyebrow: { fr: "Analyse et prompts", en: "Analysis and prompts" }, title: "OpenAI",
    steps: {
      fr: ["Connecte-toi à la plateforme API OpenAI. L’abonnement ChatGPT ne finance pas automatiquement l’API.", "Dans Billing, ajoute un moyen de paiement ou des crédits et définis une limite de dépense.", "Crée une clé de projet dans API Keys et copie-la une seule fois.", "Colle-la dans la carte OpenAI puis vérifie-la."],
      en: ["Sign in to the OpenAI API platform. A ChatGPT subscription does not automatically fund API usage.", "In Billing, add a payment method or credits and set a spending limit.", "Create a project key in API Keys and copy it while it is visible.", "Paste it into the OpenAI card and verify it."]
    },
    links: [
      ["https://platform.openai.com/", { fr: "Ouvrir OpenAI API", en: "Open OpenAI API" }],
      ["https://platform.openai.com/api-keys", { fr: "Créer une clé", en: "Create key" }],
      ["https://platform.openai.com/settings/organization/billing/overview", { fr: "Facturation", en: "Billing" }],
      ["https://platform.openai.com/docs/quickstart", { fr: "Guide officiel", en: "Official guide" }]
    ]
  },
  {
    id: "anthropic", number: "04", eyebrow: { fr: "Claude dans Prompt Atlas", en: "Claude in Prompt Atlas" }, title: "Anthropic",
    steps: {
      fr: ["Crée une organisation dans Claude Console.", "Dans Plans & Billing, achète des crédits prépayés et règle une limite.", "Dans Settings → API keys, crée une clé personnelle ou de service.", "Colle-la dans la carte Anthropic puis vérifie-la."],
      en: ["Create an organization in Claude Console.", "In Plans & Billing, buy prepaid credits and set a limit.", "In Settings → API keys, create a personal or service key.", "Paste it into the Anthropic card and verify it."]
    },
    note: { fr: "Un abonnement Claude Pro ou Max est distinct du crédit de l’API Anthropic.", en: "A Claude Pro or Max subscription is separate from Anthropic API credits." },
    links: [
      ["https://platform.claude.com/", { fr: "Ouvrir Claude Console", en: "Open Claude Console" }],
      ["https://platform.claude.com/settings/keys", { fr: "Créer une clé", en: "Create key" }],
      ["https://platform.claude.com/settings/billing", { fr: "Acheter des crédits", en: "Buy credits" }],
      ["https://platform.claude.com/docs/en/manage-claude/authentication", { fr: "Guide officiel", en: "Official guide" }]
    ]
  },
  {
    id: "gemini", number: "05", eyebrow: { fr: "Gemini dans Prompt Atlas", en: "Gemini in Prompt Atlas" }, title: "Gemini",
    steps: {
      fr: ["Ouvre Google AI Studio et crée ou sélectionne un projet.", "Crée une clé Gemini associée à ce projet.", "Le niveau gratuit suffit pour tester. Pour le niveau payant, lie un compte de facturation et ajoute des crédits si AI Studio propose le prépaiement.", "Colle la clé dans la carte Gemini puis vérifie-la."],
      en: ["Open Google AI Studio and create or select a project.", "Create a Gemini key linked to that project.", "The free tier is enough for testing. For paid use, link a billing account and add credits if AI Studio offers prepayment.", "Paste the key into the Gemini card and verify it."]
    },
    links: [
      ["https://aistudio.google.com/", { fr: "Ouvrir Google AI Studio", en: "Open Google AI Studio" }],
      ["https://aistudio.google.com/apikey", { fr: "Créer une clé", en: "Create key" }],
      ["https://ai.google.dev/gemini-api/docs/billing", { fr: "Facturation officielle", en: "Official billing guide" }]
    ]
  },
  {
    id: "deepseek", number: "06", eyebrow: { fr: "LLM économique", en: "Cost-efficient LLM" }, title: "DeepSeek",
    steps: {
      fr: ["Crée un compte sur la plateforme DeepSeek.", "Recharge le solde API avant le premier appel.", "Crée une nouvelle clé dans API Keys et copie-la.", "Colle-la dans la carte DeepSeek puis vérifie-la."],
      en: ["Create an account on the DeepSeek platform.", "Top up the API balance before the first call.", "Create a new key in API Keys and copy it.", "Paste it into the DeepSeek card and verify it."]
    },
    links: [
      ["https://platform.deepseek.com/", { fr: "Ouvrir DeepSeek", en: "Open DeepSeek" }],
      ["https://platform.deepseek.com/api_keys", { fr: "Créer une clé", en: "Create key" }],
      ["https://platform.deepseek.com/top_up", { fr: "Recharger le solde", en: "Top up balance" }],
      ["https://api-docs.deepseek.com/", { fr: "Documentation", en: "Documentation" }]
    ]
  }
];

const GUIDANCE = {
  fal: {
    status: { fr: "Essentiel", en: "Essential" },
    text: { fr: "C’est le moteur de génération principal de BARZ. Sans clé fal créditée, la majorité des créations image et vidéo ne peuvent pas partir.", en: "This is BARZ's primary generation service. Without a funded fal key, most image and video generations cannot run." }
  },
  heygen: {
    status: { fr: "Facultatif", en: "Optional" },
    text: { fr: "À configurer seulement si tu utilises HeyGen Video, les avatars, le dialogue ou l’audio-to-video. Le reste de BARZ fonctionne sans HeyGen.", en: "Configure this only for HeyGen Video, avatars, dialogue, or audio-to-video. The rest of BARZ works without HeyGen." }
  },
  openai: {
    status: { fr: "LLM facultatif", en: "Optional LLM" },
    text: { fr: "Très polyvalent pour analyser, conseiller et écrire les prompts. Une seule clé LLM suffit : inutile de connecter tous les fournisseurs.", en: "A versatile choice for analysis, advice, and prompt writing. One LLM key is enough; you do not need every provider." }
  },
  anthropic: {
    status: { fr: "LLM facultatif", en: "Optional LLM" },
    text: { fr: "Particulièrement solide sur les briefs longs, la direction créative et les consignes complexes. Choisis-le selon ton usage et ton budget.", en: "Particularly strong for long briefs, creative direction, and complex instructions. Choose it based on your workflow and budget." }
  },
  gemini: {
    status: { fr: "LLM facultatif", en: "Optional LLM" },
    text: { fr: "Bon choix multimodal avec un niveau gratuit pour tester selon les quotas disponibles. Une clé Gemini peut être ton unique LLM.", en: "A strong multimodal option with a free tier for testing, subject to available quotas. Gemini can be your only LLM." }
  },
  deepseek: {
    status: { fr: "LLM facultatif · économique", en: "Optional · cost-efficient LLM" },
    text: { fr: "Option généralement économique pour les tâches de texte et de raisonnement. Les tarifs changent : vérifie toujours la page officielle avant de créditer le compte.", en: "A generally cost-efficient option for text and reasoning tasks. Pricing changes, so always check the official page before funding the account." }
  }
};

const copy = {
  fr: {
    button: "Guide de démarrage", kicker: "Première mise en route", title: "Connecter les services sans se perdre",
    lead: "Commence par fal.", leadText: "fal est essentiel pour générer. HeyGen est facultatif. Pour l’IA, une seule clé LLM suffit : OpenAI, Anthropic, Gemini ou DeepSeek. Tu peux en connecter plusieurs pour comparer qualité et coût, mais ce n’est pas obligatoire.",
    priority: "prioritaire", first: "À faire en premier", security: "Ne partage jamais une clé et ne l’envoie jamais par message. BARZ la chiffre localement après vérification.", close: "J’ai compris", closeLabel: "Fermer"
  },
  en: {
    button: "Setup guide", kicker: "First-time setup", title: "Connect services without the guesswork",
    lead: "Start with fal.", leadText: "fal is essential for generation. HeyGen is optional. For AI features, one LLM key is enough: OpenAI, Anthropic, Gemini, or DeepSeek. You may connect several to compare quality and cost, but it is not required.",
    priority: "priority", first: "Start here", security: "Never share a key or send it in a message. BARZ encrypts it locally after verification.", close: "Got it", closeLabel: "Close"
  }
};

function language() {
  return document.documentElement.dataset.language === "fr" ? "fr" : "en";
}

function page(provider, lang) {
  const guidance = GUIDANCE[provider.id];
  return `<section class="api-guide-page${provider.id === "fal" ? " active" : ""}" data-api-guide-page="${provider.id}">
    <div class="api-guide-page-head"><div><span>${provider.eyebrow[lang]}</span><h3>${provider.title}</h3></div><b class="${provider.priority ? "essential" : "optional"}">${guidance.status[lang]}</b></div>
    <aside class="api-guide-choice ${provider.priority ? "essential" : "optional"}"><strong>${guidance.status[lang]}</strong><span>${guidance.text[lang]}</span></aside>
    <ol>${provider.steps[lang].map((step) => `<li>${step}</li>`).join("")}</ol>
    ${provider.note ? `<p class="api-guide-note">${provider.note[lang]}</p>` : ""}
    <div class="api-guide-links">${provider.links.map(([href, label]) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${label[lang]}</a>`).join("")}</div>
  </section>`;
}

function render(dialog) {
  const lang = language();
  const t = copy[lang];
  dialog.innerHTML = `<form method="dialog" class="dialog-shell api-guide-shell">
    <div class="dialog-heading"><div><p>${t.kicker}</p><h2 id="apiGuideTitle">${t.title}</h2></div><button class="icon-button" value="cancel" aria-label="${t.closeLabel}">×</button></div>
    <div class="api-guide-lead"><strong>${t.lead}</strong><span>${t.leadText}</span></div>
    <div class="api-guide-layout"><nav class="api-guide-nav" aria-label="API providers">${PROVIDERS.map((provider) => `<button type="button" class="${provider.id === "fal" ? "active recommended" : ""}" data-api-guide-provider="${provider.id}"><span>${provider.number}</span>${provider.title}${provider.priority ? `<em>${t.priority}</em>` : ""}</button>`).join("")}</nav><div class="api-guide-pages">${PROVIDERS.map((provider) => page(provider, lang)).join("")}</div></div>
    <footer class="api-guide-footer"><span>${t.security}</span><button class="secondary-button" value="cancel">${t.close}</button></footer>
  </form>`;
}

function mount() {
  const heading = document.querySelector(".api-heading");
  if (!heading || document.querySelector("#openApiGuideButton")) return;
  const actions = document.createElement("div");
  actions.className = "api-heading-actions";
  const badge = heading.querySelector(".api-vault-badge");
  const button = document.createElement("button");
  button.id = "openApiGuideButton";
  button.className = "api-guide-button";
  button.type = "button";
  button.textContent = copy[language()].button;
  if (badge) actions.append(button, badge); else actions.append(button);
  heading.append(actions);

  const dialog = document.createElement("dialog");
  dialog.id = "apiGuideDialog";
  dialog.className = "dialog api-guide-dialog";
  dialog.setAttribute("aria-labelledby", "apiGuideTitle");
  render(dialog);
  document.body.append(dialog);
  button.addEventListener("click", () => { render(dialog); dialog.showModal(); });
  dialog.addEventListener("click", (event) => {
    const providerButton = event.target.closest("[data-api-guide-provider]");
    if (!providerButton) return;
    const id = providerButton.dataset.apiGuideProvider;
    dialog.querySelectorAll("[data-api-guide-provider]").forEach((item) => item.classList.toggle("active", item.dataset.apiGuideProvider === id));
    dialog.querySelectorAll("[data-api-guide-page]").forEach((item) => item.classList.toggle("active", item.dataset.apiGuidePage === id));
  });
  new MutationObserver(() => { button.textContent = copy[language()].button; }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-language"] });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
else mount();

