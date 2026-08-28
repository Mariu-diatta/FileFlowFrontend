import { create } from "zustand";

// État global d'une campagne de republication multi-plateformes.
// Regroupe tout ce qui doit survivre à la navigation entre les différents
// panneaux (upload, découpe temporelle, sélection des plateformes, légende)
// sans que l'utilisateur perde ses réglages en passant de l'un à l'autre.
export const useCampaignStore = create((set) => ({
  sourceFile: null,       // objet File choisi par l'utilisateur
  sourceUrl: null,        // URL locale (blob) pour la prévisualisation
  sourceDuration: 0,      // durée totale de la vidéo source (secondes)

  clipStart: 0,           // début de l'extrait (secondes)
  clipEnd: 15,            // fin de l'extrait (secondes)

  captionText: "",
  platforms: ["tiktok", "instagram", "youtube"],

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

  setJobId: (jobId) => set({ jobId, job: null }),
  setJob: (job) => set({ job }),

  reset: () =>
    set({
      sourceFile: null, sourceUrl: null, sourceDuration: 0,
      clipStart: 0, clipEnd: 15, captionText: "",
      platforms: ["tiktok", "instagram", "youtube"],
      jobId: null, job: null,
    }),
}));
