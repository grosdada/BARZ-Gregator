(function () {
  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Embedded file URLs can block storage; theme still applies for the current view.
    }
  }

  const params = new URLSearchParams(window.location.search);
  const requestedTheme = params.get("barzyTheme");

  const themes = ["rouge-editorial", "noir-atelier", "mint-blueprint", "la-regie", "atlas-studio", "sand"];
  const version = "40";
  const savedVersion = storageGet("barzy-theme-version");
  const stored = storageGet("barzy-home-theme");
  const pageDefault = document.body?.dataset.barzyDefaultTheme;
  let theme = themes.includes(requestedTheme)
    ? requestedTheme
    : (themes.includes(pageDefault)
      ? pageDefault
      : (savedVersion === version && themes.includes(stored) ? stored : "rouge-editorial"));
  storageSet("barzy-home-theme", theme);
  storageSet("barzy-theme-version", version);
  document.body.dataset.barzyTheme = theme;
  document.body.classList.add("barzy-themed");

  function applySharedPreferences(payload) {
    const nextTheme = payload?.theme === "light" ? "sand" : payload?.theme;
    if (themes.includes(nextTheme)) {
      theme = nextTheme;
      storageSet("barzy-home-theme", theme);
      storageSet("barzy-theme-version", version);
      document.body.dataset.barzyTheme = theme;
      applySandAppOverrides();
    }
    const language = payload?.language === "fr" ? "fr" : "en";
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "barz:preferences") return;
    applySharedPreferences(event.data);
  });

  // Embedded workshops reuse the same translation layer as the Atlas shell.
  // It reads the persisted language immediately and also reacts to parent messages.
  if (!document.querySelector('script[data-barz-preferences]')) {
    const preferencesScript = document.createElement("script");
    preferencesScript.src = "/preferences.js";
    preferencesScript.dataset.barzPreferences = "embedded";
    document.head.appendChild(preferencesScript);
  }

  // La Regie bridge: embedded modules report AI activity and copies to the shell
  // so its tally light and ON AIR badge react to what happens inside iframes.
  if (theme === "la-regie" && window.parent !== window) {
    const postToShell = (payload) => {
      try {
        window.parent.postMessage(payload, "*");
      } catch (error) {
        // Cross-origin shells just miss the tally; the module keeps working.
      }
    };
    const originalFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      const tracked = /\/api\/ai\//.test(url);
      if (tracked) postToShell({ type: "barzy-regie:ai", active: true });
      const result = originalFetch(input, init);
      if (tracked) result.finally(() => postToShell({ type: "barzy-regie:ai", active: false }));
      return result;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = function (text) {
        postToShell({ type: "barzy-regie:onair" });
        return originalWriteText(text);
      };
    }
  }

  const titleReplacements = [
    [/MEAT DEPT/gi, "BZ"],
    [/Meat Dept/gi, "BZ"],
    [/Barzy/gi, "BZ"],
    [/Barz/gi, "BZ"],
    [/\bMD\b/g, "BZ"]
  ];

  const textFixes = [
    ["\u00C3\u0192\u00C2\u00A9", "\u00E9"], ["\u00C3\u0192\u00C2\u00A8", "\u00E8"],
    ["\u00C3\u0192\u00C2\u00AA", "\u00EA"], ["\u00C3\u0192\u00C2\u00AB", "\u00EB"],
    ["\u00C3\u0192\u00C2\u00A0", "\u00E0"], ["\u00C3\u0192\u00C2\u00A2", "\u00E2"],
    ["\u00C3\u0192\u00C2\u00B4", "\u00F4"], ["\u00C3\u0192\u00C2\u00AE", "\u00EE"],
    ["\u00C3\u0192\u00C2\u00AF", "\u00EF"], ["\u00C3\u0192\u00C2\u00B9", "\u00F9"],
    ["\u00C3\u0192\u00C2\u00BB", "\u00FB"], ["\u00C3\u0192\u00C2\u00A7", "\u00E7"],
    ["\u00C3\u0192\u00E2\u20AC\u00B0", "\u00C9"], ["\u00C3\u0192\u00E2\u20AC\u201D", "\u00D7"],
    ["\u00C3\u00A0", "\u00E0"], ["\u00C3\u00A8", "\u00E8"], ["\u00C3\u00A9", "\u00E9"],
    ["\u00C3\u00AA", "\u00EA"], ["\u00C3\u00AB", "\u00EB"], ["\u00C3\u00AD", "\u00ED"],
    ["\u00C3\u00B4", "\u00F4"], ["\u00C3\u00AE", "\u00EE"], ["\u00C3\u00AF", "\u00EF"],
    ["\u00C3\u00B9", "\u00F9"], ["\u00C3\u00BB", "\u00FB"], ["\u00C3\u00BC", "\u00FC"],
    ["\u00C3\u00A7", "\u00E7"], ["\u00C3\u0097", "\u00D7"], ["\u00C3\u2014", "\u00D7"],
    ["\u00C3\u2030", "\u00C9"], ["\u00C3\u02C6", "\u00C8"], ["\u00C3\u0160", "\u00CA"],
    ["\u00C2\u00B0", "\u00B0"], ["\u00C2\u00B7", "\u00B7"],
    ["\u00C2\u00B1", "+/-"], ["\u00C2\u00BE", "3/4"],
    ["\u00E2\u20AC\u201D", "\u2014"], ["\u00E2\u20AC\u201C", "\u2013"],
    ["\u00E2\u20AC\u2122", "\u2019"], ["\u00E2\u20AC\u02DC", "\u2018"],
    ["\u00E2\u20AC\u0153", "\u201C"], ["\u00E2\u20AC\uFFFD", "\u201D"],
    ["\u00E2\u20AC\u00A6", "\u2026"], ["\u00E2\u20AC\u00A2", "\u2022"],
    ["\u00E2\u0161\u00A1", "\u26A1"], ["\u00E2\u0153\u00A8", "\u2728"],
    ["\u00E2\u02DC\u2022", "\u2615"], ["\u00E2\u2B07", "\u2B07"],
    ["\u00E2\u2B1A", "\u25A3"], ["\u00E2\u0153\u008F", "\u270F"],
    ["\u00E2\u2014\u008F", "\u25CF"], ["\u00E2\u2014\u2039", "\u25CB"],
    ["\u00E2\u2022\u0090", "\u2550"], ["\u00E2\u2013\u00BE", "\u25BE"],
    ["\u00E2\u2020\u00B3", "\u21B3"], ["\u00E2\u017D\u0098", "\u2398"],
    ["\u00E2\u0153\u201C", "\u2713"],
    ["Ã¢â€”Å½", ""], ["Ã¢â€”â€°", ""], ["Ã¢â€“Â³", ""],
    ["Ã¢â€”Â»", ""], ["Ã¢â€“Â¦", ""], ["Ã¢Å â€¢", ""],
    ["Ã¢Å“â€¹", ""], ["Ã¢â€“Â¸", ""], ["Ã¢Å“Â¦", ""],
    ["Ã¢Â¬Å“", ""], ["Ã¢Å¡â„¢", ""], ["Ã¢Ëœâ‚¬", ""],
    ["Ã¢ÂÂ¤", ""], ["Ã¢ÂÅ’", ""], ["Ã¢Å“â€¦", ""],
    ["Ã¢Å“â€", ""], ["Ã¢â€žÂ¹", ""], ["Ã¢Ëœâ€¦", "★"],
    ["Ã¢â€ â€˜", ""], ["Ã¢â€ â€œ", ""],
    ["Ã¢â„¢â‚¬", "F"], ["Ã¢â„¢â€š", "M"],
    ["â¬‡", ""], ["\u00C2", ""]
  ];

  function cleanText(value) {
    let next = value;
    if (!next) return next;
    textFixes.forEach(([from, to]) => {
      next = next.split(from).join(to);
    });
    next = next
      .replace(/\u00F0\u0178[^\s]*/g, "")
      .replace(/\u00EF\u00B8[^\s]*/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    titleReplacements.forEach(([pattern, replacement]) => {
      next = next.replace(pattern, replacement);
    });
    return next;
  }

  function fixTextNode(node) {
    // Pages authored in clean UTF-8 can opt out: cleanText() trims every text
    // node, which destroys legitimate inter-element spacing in dynamic HTML.
    if (document.body && document.body.hasAttribute("data-barzy-clean-text-off")) return;
    const next = cleanText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function cleanExistingText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(fixTextNode);
  }

  function paintSandElement(node, styles) {
    Object.entries(styles).forEach(([name, value]) => {
      node.style.setProperty(name, value, "important");
    });
  }

  function applySandAppOverrides(root = document) {
    if (theme !== "rouge-editorial" && theme !== "noir-atelier" && theme !== "mint-blueprint" && theme !== "la-regie") return;

    const isBanana = /banana|BZ helper/i.test(document.title) || document.body.textContent.includes("Banana Helper") || document.body.textContent.includes("BZ helper");
    const isMultishot = /multishot/i.test(document.title) || document.body.textContent.includes("BZ Multishot");
    if (!isBanana && !isMultishot) return;

    if (isBanana) {
      paintSandElement(document.body, {
        "background-color": "#eadcc9",
        "color": "#1e2629"
      });

      root.querySelectorAll(".bg-\\[\\#0f172a\\], .bg-\\[\\#1e293b\\], .bg-gray-700\\/50, .bg-white\\/10, .min-h-screen, .card, .prompt-item, #prompts-container, #tabs-container").forEach((node) => {
        paintSandElement(node, {
          "background-color": "#f1e3d1",
          "color": "#1e2629",
          "border-color": "rgba(36, 27, 22, 0.18)"
        });
      });

      root.querySelectorAll(".prompt-box, .description-input, input, textarea, pre, code").forEach((node) => {
        paintSandElement(node, {
          "background-color": "#efe2cf",
          "color": "#17262b",
          "border-color": "rgba(36, 27, 22, 0.22)",
          "opacity": "1"
        });
      });

      root.querySelectorAll(".text-gray-100, .text-gray-400, .text-gray-900, .text-white, h1, h2, h3, p, label, span, div").forEach((node) => {
        if (!node.classList.contains("text-yellow-500") && !node.classList.contains("text-pink-500") && !node.classList.contains("text-green-500")) {
          node.style.setProperty("color", "#1e2629", "important");
        }
      });

      root.querySelectorAll(".tab-button").forEach((node) => {
        const isActive = node.classList.contains("bg-yellow-500") || node.classList.contains("bg-[#eab308]");
        paintSandElement(node, {
          "background-color": isActive ? "#c58b54" : "#eadcc9",
          "color": "#0e1c22",
          "border-color": "rgba(36, 27, 22, 0.18)"
        });
      });
    }

    if (isMultishot) {
      paintSandElement(document.body, {
        "background-color": "#1f1f22",
        "color": "#f4efe7"
      });

      root.querySelectorAll("header, .tabs, .tab-content, table, thead, tbody, tr, td, th, .table-container, .multishot-item, .multishot-header, .multishot-content, .grid-selector, .toggle-container, .controls, .controls-row, .filter-controls").forEach((node) => {
        paintSandElement(node, {
          "background-color": "#2a2a2d",
          "color": "#f4efe7",
          "border-color": "rgba(255, 255, 255, 0.12)"
        });
      });

      root.querySelectorAll("th, td, label, h1, h2, h3, p, span, .angle-name, .angle-prompt, .multishot-title, .multishot-text, .prompt, td div, td p").forEach((node) => {
        node.style.setProperty("color", "#f4efe7", "important");
      });

      root.querySelectorAll(".subtitle, .grid-indicator").forEach((node) => {
        node.style.setProperty("color", "#a9bdc5", "important");
      });

      root.querySelectorAll("select, input, textarea, pre, code").forEach((node) => {
        paintSandElement(node, {
          "background-color": "#33363b",
          "color": "#f4efe7",
          "border-color": "rgba(255, 255, 255, 0.18)"
        });
      });

      root.querySelectorAll(".tab-btn").forEach((node) => {
        const isActive = node.classList.contains("active");
        paintSandElement(node, {
          "background-color": isActive ? "#d4a574" : "#242428",
          "color": isActive ? "#101316" : "#a9bdc5",
          "border-color": isActive ? "#f2b431" : "rgba(255, 255, 255, 0.12)"
        });
      });

      root.querySelectorAll(".grid-option").forEach((node) => {
        const isActive = node.classList.contains("active");
        paintSandElement(node, {
          "background-color": isActive ? "#d4a574" : "#33363b",
          "color": isActive ? "#101316" : "#f4efe7",
          "border-color": isActive ? "#f2b431" : "rgba(255, 255, 255, 0.14)"
        });
      });

      root.querySelectorAll(".copy-btn, .multishot-copy-btn-header").forEach((node) => {
        paintSandElement(node, {
          "background-color": "#181a1f",
          "color": "#f4efe7",
          "border-color": "rgba(255, 255, 255, 0.18)"
        });
      });
    }
  }

  function installPromptInfoStyles() {
    if (document.getElementById("barzy-prompt-info-styles")) return;
    const style = document.createElement("style");
    style.id = "barzy-prompt-info-styles";
    style.textContent = `
      .barzy-prompt-info-wrap{display:inline-flex;align-items:center;gap:8px}
      .barzy-prompt-info-btn{width:20px;height:20px;display:inline-grid;place-items:center;border-radius:999px;border:1px solid rgba(215,163,111,.55);background:rgba(215,163,111,.08);color:#d7a36f;font:800 11px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer;vertical-align:middle;margin-left:8px;flex:0 0 auto;position:relative;z-index:6}
      .barzy-prompt-info-btn:hover,.barzy-prompt-info-btn[aria-expanded="true"]{background:#d7a36f;color:#101616}
      .barzy-prompt-info-panel{display:none;margin:8px 0 10px;padding:9px 10px;border:1px solid rgba(215,163,111,.26);border-radius:7px;background:rgba(215,163,111,.09);color:inherit;font:500 12px/1.45 ui-sans-serif,system-ui,sans-serif;letter-spacing:0;text-transform:none}
      .barzy-prompt-info-panel.open{display:block}
      body[data-barzy-theme="sand"] .barzy-prompt-info-btn{border-color:rgba(178,113,55,.55);background:rgba(178,113,55,.12);color:#9a5e25}
      body[data-barzy-theme="sand"] .barzy-prompt-info-btn:hover,body[data-barzy-theme="sand"] .barzy-prompt-info-btn[aria-expanded="true"]{background:#c58b54;color:#1e2629}
      body[data-barzy-theme="sand"] .barzy-prompt-info-panel{background:rgba(178,113,55,.12);border-color:rgba(178,113,55,.28);color:#1e2629}
    `;
    document.head.appendChild(style);
  }

  function promptInfoSummary(title, text) {
    const haystack = `${title} ${text}`.toLowerCase();
    if (/negative prompt|avoid|forbid|no text|watermark|constraint|do not/.test(haystack)) {
      return "Info: negative constraints protect the output from unwanted text, artifacts, wrong anatomy, style drift or extra objects.";
    }
    if (/multi[-\s]?image|references|img_1|img_2|img_3|image reference|source image/.test(haystack)) {
      return "Info: defines the role of each reference image so identity, setting, style and secondary details do not get mixed.";
    }
    if (/transfer|transfert|pose|morph|swap|inpaint|outfit|dress|reference/.test(haystack)) {
      return "Info: transfers the requested pose, outfit, subject or style while naming exactly what must remain locked.";
    }
    if (/grid|sheet|contact|storyboard|board|turnaround|3x3|panel|frame/.test(haystack)) {
      return "Info: organizes the idea into a board, grid, sheet or sequence so the model outputs comparable controlled views.";
    }
    if (/video|motion|sequence|kling|seedance|veo|animation|cut to/.test(haystack)) {
      return "Info: converts the idea into video-ready wording with timing, motion, rhythm, camera logic and continuity rules.";
    }
    if (/camera|angle|lens|framing|shot|dolly|pan|tilt|orbit|pov|view|macro|wide|close/.test(haystack)) {
      return "Info: clarifies camera distance, lens, framing, viewpoint or shot language so the visual result is easier to steer.";
    }
    if (/enhance|repair|restore|cleanup|artifact|fix|color|contrast|sharpen|polish|upscale/.test(haystack)) {
      return "Info: improves or repairs the source while protecting the original composition, identity, texture and lighting logic.";
    }
    if (/style|retro|cinematic|film|noir|editorial|fashion|look|aesthetic|beauty/.test(haystack)) {
      return "Info: sets the art direction through palette, material behavior, lighting mood, texture and genre references.";
    }
    if (/body|character|puppet|figurine|identity|portrait|face|skin/.test(haystack)) {
      return "Info: protects identity, face, proportions and character-specific details during generation or transformation.";
    }
    if (/action|acting|expression|gesture|emotion|performance|body language/.test(haystack)) {
      return "Info: focuses the prompt on readable acting, gesture, emotion and physical intention rather than random movement.";
    }
    if (/imperfection|ugc|handheld|amateur|natural|micro|realistic|realism/.test(haystack)) {
      return "Info: adds believable capture flaws, human irregularity and physical texture so the result feels less sterile.";
    }
    return "Info: explains the prompt's role, the main constraint it adds, and how it improves control before copying.";
  }

  function findPromptTitle(card) {
    return card.querySelector(".title,.prompt-title,.transfer-title,.card-title,.angle-name,.multishot-title,h3,h2,summary");
  }

  function isPromptCard(card) {
    if (!card || card.dataset.barzyPromptInfo === "1") return false;
    if (card.closest(".barzy-prompt-info-panel")) return false;
    if (card.matches(".app-card,.utility-card,.map-btn,.tab,.workspace-tab,.mini-pill,.module-card,button")) return false;
    if (card.querySelector(".barzy-prompt-info-btn,.prompt-info,.transfer-info,.info-panel")) return false;
    const title = findPromptTitle(card);
    if (!title) return false;
    const text = (card.textContent || "").replace(/\s+/g, " ").trim();
    if (text.length < 60) return false;
    const classSignal = /\b(prompt|card|item|template|shot|angle|block|stage|preset)\b/i.test(card.className || "");
    const contentSignal = card.querySelector(".prompt-text,.prompt,.prompt-box,.prompt-content,pre,textarea,.output,.copy-btn,.copy,.btn-copy,[data-prompt],button[onclick*='copy'],button[onclick*='Copy']");
    return Boolean(classSignal && contentSignal);
  }

  function installPromptInfos(root = document) {
    const path = window.location.pathname || "";
    if (/SOUL-PROMPTS/i.test(path) || /soul prompt/i.test(document.title || "")) return;
    installPromptInfoStyles();
    const cards = root.querySelectorAll
      ? root.querySelectorAll(".prompt-card,.prompt-item,.transfer-card,.card,article,.multishot-item,.angle-card,.template-card,.prompt-block,.stage,.preset-card,.module-card,.prompt-row")
      : [];
    cards.forEach((card) => {
      if (!isPromptCard(card)) return;
      const title = findPromptTitle(card);
      if (!title) return;
      card.dataset.barzyPromptInfo = "1";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "barzy-prompt-info-btn";
      button.textContent = "i";
      button.setAttribute("aria-label", "Show prompt summary");
      button.setAttribute("aria-expanded", "false");
      const panel = document.createElement("div");
      panel.className = "barzy-prompt-info-panel";
      panel.textContent = promptInfoSummary(title.textContent || "", card.textContent || "");
      const setOpen = (open) => {
        panel.classList.toggle("open", open);
        button.setAttribute("aria-expanded", open ? "true" : "false");
      };
      button.addEventListener("mouseenter", () => setOpen(true));
      card.addEventListener("mouseleave", () => {
        if (!panel.classList.contains("pinned")) setOpen(false);
      });
      button.addEventListener("click", (event) => {
        // The info button must never trigger the card's copy action.
        event.preventDefault();
        event.stopPropagation();
        const pinned = panel.classList.toggle("pinned");
        setOpen(pinned);
      });
      // The open panel can sit over the card: swallow its clicks too,
      // otherwise clicking the info text copies the prompt underneath.
      panel.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      title.appendChild(button);
      title.insertAdjacentElement("afterend", panel);
    });
  }

  if (document.title) {
    titleReplacements.forEach(([pattern, value]) => {
      document.title = document.title.replace(pattern, value);
    });
  }

  document.querySelectorAll("h1, .logo, .brand-title, .header-left h1, .app-title").forEach((node) => {
    let next = node.textContent;
    titleReplacements.forEach(([pattern, value]) => {
      next = next.replace(pattern, value);
    });
    node.textContent = cleanText(next);
  });

  cleanExistingText(document.body);
  applySandAppOverrides();
  installPromptInfos();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          fixTextNode(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          cleanExistingText(node);
          applySandAppOverrides(node);
          installPromptInfos(node);
        }
      });
      if (mutation.type === "characterData") {
        fixTextNode(mutation.target);
      }
    });
    applySandAppOverrides();
    installPromptInfos();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
