// Décrit, pour chaque outil, les champs de paramètres à afficher côté
// frontend. Les outils absents de cette liste s'affichent avec un simple
// bouton d'upload + exécution (aucun paramètre requis).
const toolConfig = {
  "pdf-merge": { multiple: true, fields: [] },
  "pdf-split": {
    fields: [{ name: "every_n_pages", label: "Nombre de pages par fichier", type: "number", default: 1 }],
  },
  "pdf-extract-pages": {
    fields: [{ name: "pages", label: "Pages à extraire (ex: 1-3,5)", type: "text", placeholder: "1-3,5" }],
  },
  "pdf-delete-pages": {
    fields: [{ name: "pages", label: "Pages à supprimer (ex: 2,4-5)", type: "text", placeholder: "2,4-5" }],
  },
  "pdf-reorder": {
    fields: [{ name: "order", label: "Nouvel ordre (ex: 3,1,2)", type: "text", placeholder: "3,1,2" }],
  },
  "pdf-rotate": {
    fields: [
      { name: "angle", label: "Angle de rotation", type: "select", options: [90, 180, 270], default: 90 },
      { name: "pages", label: "Pages concernées (vide = toutes)", type: "text", placeholder: "1-3" },
    ],
  },
  "pdf-compress": {
    fields: [{ name: "target_mb", label: "Taille cible en Mo (optionnel)", type: "number" }],
  },
  "pdf-watermark": {
    fields: [{ name: "text", label: "Texte du filigrane", type: "text", default: "CONFIDENTIEL" }],
  },
  "pdf-compare": {
    multiple: true,
    fields: [],
  },
  "pdf-protect": {
    fields: [{ name: "password", label: "Mot de passe à définir", type: "password" }],
  },
  "pdf-unlock": {
    fields: [{ name: "password", label: "Mot de passe actuel du PDF", type: "password" }],
  },
  "images-to-pdf": { multiple: true, fields: [] },
  "audio-convert": {
    fields: [{ name: "target_format", label: "Format cible", type: "select", options: ["mp3", "wav", "ogg", "flac"], default: "mp3" }],
  },
  "audio-cut": {
    fields: [
      { name: "start", label: "Début (HH:MM:SS)", type: "text", default: "00:00:00" },
      { name: "duration", label: "Durée (secondes)", type: "number" },
    ],
  },
  "audio-merge": { multiple: true, fields: [] },
  "audio-volume": {
    fields: [{ name: "factor", label: "Facteur de volume (1 = inchangé)", type: "number", default: 1.5, step: "0.1" }],
  },
  "audio-speed": {
    fields: [{ name: "factor", label: "Vitesse (0.5 à 2.0)", type: "number", default: 1.25, step: "0.05" }],
  },
  "audio-compress": {
    fields: [{ name: "bitrate", label: "Débit cible", type: "select", options: ["64k", "96k", "128k", "192k"], default: "96k" }],
  },
  "video-compress": {
    fields: [{ name: "crf", label: "Qualité (18=max, 32=léger)", type: "number", default: 28 }],
  },
  "video-convert": {
    fields: [{ name: "target_format", label: "Format cible", type: "select", options: ["mp4", "mov", "webm", "avi"], default: "mp4" }],
  },
  "video-cut": {
    fields: [
      { name: "start", label: "Début (HH:MM:SS)", type: "text", default: "00:00:00" },
      { name: "duration", label: "Durée (secondes)", type: "number" },
    ],
  },
  "video-merge": { multiple: true, fields: [] },
  "video-extract-frame": {
    fields: [{ name: "timestamp", label: "Instant (HH:MM:SS)", type: "text", default: "00:00:01" }],
  },
  "video-resolution": {
    fields: [{ name: "height", label: "Hauteur cible (px)", type: "select", options: [1080, 720, 480], default: 720 }],
  },
  "video-speed": {
    fields: [{ name: "factor", label: "Vitesse (ex: 1.5 = x1.5)", type: "number", default: 1.5, step: "0.1" }],
  },
  "audio-remove-silence": {
    fields: [
      { name: "threshold_db", label: "Seuil de silence (dB, ex: -35)", type: "number", default: -35 },
      { name: "min_silence", label: "Durée minimale d'un silence (s)", type: "number", default: 0.6, step: "0.1" },
      { name: "padding", label: "Coussin de silence conservé (s)", type: "number", default: 0.15, step: "0.05" },
    ],
  },
  "video-remove-silence": {
    fields: [
      { name: "threshold_db", label: "Seuil de silence (dB, ex: -35)", type: "number", default: -35 },
      { name: "min_silence", label: "Durée minimale d'un silence (s)", type: "number", default: 0.6, step: "0.1" },
      { name: "padding", label: "Coussin de silence conservé (s)", type: "number", default: 0.15, step: "0.05" },
    ],
  },
  "image-compress": {
    fields: [{ name: "quality", label: "Qualité (1-100)", type: "number", default: 70 }],
  },
  "image-resize": {
    fields: [
      { name: "width", label: "Largeur (px)", type: "number" },
      { name: "height", label: "Hauteur (px)", type: "number" },
    ],
  },
  "image-crop": {
    fields: [
      { name: "left", label: "Gauche (px)", type: "number", default: 0 },
      { name: "top", label: "Haut (px)", type: "number", default: 0 },
      { name: "right", label: "Droite (px)", type: "number" },
      { name: "bottom", label: "Bas (px)", type: "number" },
    ],
  },
  "image-convert": {
    fields: [{ name: "target_format", label: "Format cible", type: "select", options: ["png", "jpg", "webp"], default: "png" }],
  },
  "ocr-image": {
    fields: [{ name: "lang", label: "Langue", type: "select", options: [["fra", "Français"], ["eng", "Anglais"]], default: "fra" }],
  },
  "batch-rename": {
    multiple: true,
    fields: [{ name: "prefix", label: "Préfixe des fichiers renommés", type: "text", default: "fichier" }],
  },
  "zip-files": { multiple: true, fields: [] },
  "duplicate-finder": { multiple: true, fields: [] },
  "file-size-info": { multiple: true, fields: [] },
  "summarize-text": {
    fields: [{ name: "n_sentences", label: "Nombre de phrases dans le résumé", type: "number", default: 5 }],
  },
};

export default toolConfig;
