import { create } from "zustand";

// État global d'une campagne de republication multi-plateformes.
// Regroupe tout ce qui doit survivre à la navigation entre les différents
// panneaux (upload, découpe temporelle, sélection des plateformes, légende)
// sans que l'utilisateur perde ses réglages en passant de l'un à l'autre.
export const useCampaignStore = create((set, get) => ({
  sourceFile: null,       // objet File choisi par l'utilisateur
  sourceUrl: null,        // URL locale (blob) pour la prévisualisation
  sourceDuration: 0,      // durée totale de la vidéo source (secondes)

  clipStart: 0,           // début de l'extrait (secondes)
  clipEnd: 15,            // fin de l'extrait (secondes)

  captionText: "",
  platforms: ["tiktok", "instagram", "youtube"],

  // Édition par plateforme : filtre couleur + dessin libre au pinceau
  // (canvas aplati en PNG), calques médias déplaçables/redimensionnables
  // (émojis/photos avec apparition-disparition temporisée), vidéo incrustée
  // (picture-in-picture) et stickers animés intégrés (fleur/papillon).
  // Aucun appel IA — uniquement des filtres et compositions ffmpeg
  // classiques côté serveur (voir repost/pipeline.py). Clé = id de
  // plateforme, valeur = { filter, overlayDataUrl, hasDrawing,
  // mediaOverlays, videoOverlayFile, videoOverlayConfig, animatedStickers }.
  platformOptions: {},

  jobId: null,
  job: null,              // dernière réponse du backend (statut + variants)

  setSourceFile: (file, url, duration) =>
    set({
      sourceFile: file,
      sourceUrl: url,
      sourceDuration: duration,
      clipStart: 0,
      clipEnd: Math.min(15, duration || 15),
    }),

  setClipRange: (clipStart, clipEnd) => set({ clipStart, clipEnd }),
  setCaptionText: (captionText) => set({ captionText }),
  togglePlatform: (platform) =>
    set((state) => ({
      platforms: state.platforms.includes(platform)
        ? state.platforms.filter((p) => p !== platform)
        : [...state.platforms, platform],
    })),

  getPlatformOption: (platform) =>
    get().platformOptions[platform] || {
      filter: "none",
      overlayDataUrl: null,
      hasDrawing: false,
      mediaOverlays: [],
      videoOverlayFile: null,
      videoOverlayConfig: null,
      animatedStickers: [],
    },

  setPlatformFilter: (platform, filter) =>
    set((state) => ({
      platformOptions: {
        ...state.platformOptions,
        [platform]: { ...(state.platformOptions[platform] || {}), filter },
      },
    })),

  setPlatformOverlay: (platform, dataUrl) =>
    set((state) => ({
      platformOptions: {
        ...state.platformOptions,
        [platform]: {
          ...(state.platformOptions[platform] || {}),
          overlayDataUrl: dataUrl,
          hasDrawing: !!dataUrl,
        },
      },
    })),

  clearPlatformOverlay: (platform) =>
    set((state) => ({
      platformOptions: {
        ...state.platformOptions,
        [platform]: { ...(state.platformOptions[platform] || {}), overlayDataUrl: null, hasDrawing: false },
      },
    })),

  // Vidéo superposée : incrustation (PiP), écran partagé (côte à côte /
  // haut-bas) ou comparateur avant/après (voir repost/pipeline.py côté
  // serveur pour le détail des dispositions "layout").
  setVideoOverlayFile: (platform, file, url) =>
    set((state) => ({
      platformOptions: {
        ...state.platformOptions,
        [platform]: {
          ...(state.platformOptions[platform] || {}),
          videoOverlayFile: file,
          videoOverlayUrl: url,
          videoOverlayConfig: file
            ? {
                layout: "pip", x: 0.6, y: 0.05, width_ratio: 0.35, start: 0, end: null,
                ...(state.platformOptions[platform]?.videoOverlayConfig || {}),
              }
            : null,
        },
      },
    })),

  setVideoOverlayConfig: (platform, patch) =>
    set((state) => ({
      platformOptions: {
        ...state.platformOptions,
        [platform]: {
          ...(state.platformOptions[platform] || {}),
          videoOverlayConfig: { ...(state.platformOptions[platform]?.videoOverlayConfig || {}), ...patch },
        },
      },
    })),

  clearVideoOverlay: (platform) =>
    set((state) => ({
      platformOptions: {
        ...state.platformOptions,
        [platform]: {
          ...(state.platformOptions[platform] || {}),
          videoOverlayFile: null, videoOverlayUrl: null, videoOverlayConfig: null,
        },
      },
    })),

  // Calques médias (émoji ou photo) déplaçables/redimensionnables librement
  // sur l'aperçu, avec une fenêtre d'apparition-disparition (start/end en
  // secondes, comme la vidéo incrustée). x/y = coin haut-gauche en fraction
  // (0-1) du cadre vidéo, width/height = taille en fraction du cadre —
  // indépendant de la résolution finale, comme le reste des overlays.
  addMediaOverlay: (platform, overlay) =>
    set((state) => {
      const current = state.platformOptions[platform]?.mediaOverlays || [];
      return {
        platformOptions: {
          ...state.platformOptions,
          [platform]: { ...(state.platformOptions[platform] || {}), mediaOverlays: [...current, overlay] },
        },
      };
    }),

  updateMediaOverlay: (platform, id, patch) =>
    set((state) => {
      const current = state.platformOptions[platform]?.mediaOverlays || [];
      const next = current.map((m) => (m.id === id ? { ...m, ...patch } : m));
      return {
        platformOptions: {
          ...state.platformOptions,
          [platform]: { ...(state.platformOptions[platform] || {}), mediaOverlays: next },
        },
      };
    }),

  removeMediaOverlay: (platform, id) =>
    set((state) => {
      const current = state.platformOptions[platform]?.mediaOverlays || [];
      return {
        platformOptions: {
          ...state.platformOptions,
          [platform]: {
            ...(state.platformOptions[platform] || {}),
            mediaOverlays: current.filter((m) => m.id !== id),
          },
        },
      };
    }),

  // Stickers animés (fleur / papillon...)
  addAnimatedSticker: (platform, sticker) =>
    set((state) => {
      const current = state.platformOptions[platform]?.animatedStickers || [];
      if (current.length >= 6) return {};
      return {
        platformOptions: {
          ...state.platformOptions,
          [platform]: { ...(state.platformOptions[platform] || {}), animatedStickers: [...current, sticker] },
        },
      };
    }),

  updateAnimatedSticker: (platform, index, patch) =>
    set((state) => {
      const current = state.platformOptions[platform]?.animatedStickers || [];
      const next = current.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return {
        platformOptions: {
          ...state.platformOptions,
          [platform]: { ...(state.platformOptions[platform] || {}), animatedStickers: next },
        },
      };
    }),

  removeAnimatedSticker: (platform, index) =>
    set((state) => {
      const current = state.platformOptions[platform]?.animatedStickers || [];
      return {
        platformOptions: {
          ...state.platformOptions,
          [platform]: {
            ...(state.platformOptions[platform] || {}),
            animatedStickers: current.filter((_, i) => i !== index),
          },
        },
      };
    }),

  setJobId: (jobId) => set({ jobId, job: null }),
  setJob: (job) => set({ job }),

  reset: () =>
    set({
      sourceFile: null, sourceUrl: null, sourceDuration: 0,
      clipStart: 0, clipEnd: 15, captionText: "",
      platforms: ["tiktok", "instagram", "youtube"],
      platformOptions: {},
      jobId: null, job: null,
    }),
}));
