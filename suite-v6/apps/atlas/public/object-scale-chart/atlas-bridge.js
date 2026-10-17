(() => {
  const atlasOrigin = window.location.origin;

  function setPreferences({ theme, language }) {
    const desiredTheme = theme === "sand" || theme === "light" ? "light" : "dark";
    const desiredLanguage = language === "fr" ? "fr" : "en";
    const languageButton = document.querySelector(`[data-ui-language="${desiredLanguage}"]`);
    if (languageButton && document.documentElement.lang !== desiredLanguage) languageButton.click();
    const themeButton = document.getElementById("ui-theme-toggle");
    if (themeButton && document.documentElement.dataset.theme !== desiredTheme) themeButton.click();
  }

  window.addEventListener("message", async (event) => {
    if (event.origin !== atlasOrigin || event.source !== window.parent || !event.data) return;
    const message = event.data;
    if (message.type === "barz:preferences") return setPreferences(message);
    if (message.type === "barz-object-scale:get-bundle") {
      try {
        if (typeof window.BarzObjectScale?.exportBundle !== "function") throw new Error("L’export du schéma n’est pas encore prêt.");
        const bundle = await window.BarzObjectScale.exportBundle();
        window.parent.postMessage({
          type: "barz-object-scale:bundle",
          requestId: message.requestId,
          bundle
        }, atlasOrigin);
      } catch (error) {
        window.parent.postMessage({
          type: "barz-object-scale:bundle",
          requestId: message.requestId,
          error: error?.message || "Impossible de préparer le schéma."
        }, atlasOrigin);
      }
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    document.body.dataset.atlasEmbedded = "true";
    window.parent.postMessage({ type: "barz-object-scale:ready" }, atlasOrigin);
  }, { once: true });
})();
