import client from "./client";

// Convertit une dataURL (canvas.toDataURL) en Blob, pour l'attacher en
// multipart/form-data (l'overlay de dessin dessiné par plateforme).
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export const repostApi = {
  listPlatforms: () => client.get("/repost/platforms/"),

  createJob: ({ file, clipStart, clipDuration, captionText, platforms, platformOptions = {} }) => {
    const formData = new FormData();
    formData.append("video", file);
    formData.append("clip_start", clipStart);
    formData.append("clip_duration", clipDuration);
    formData.append("caption_text", captionText || "");
    platforms.forEach((p) => formData.append("platforms", p));

    // Filtre couleur + vidéo incrustée (PiP) + stickers animés, par plateforme
    // (tout est composé côté serveur via ffmpeg, voir repost/pipeline.py).
    const options = {};
    platforms.forEach((p) => {
      const opt = platformOptions[p] || {};
      options[p] = {
        filter: opt.filter || "none",
        video_overlay: opt.videoOverlayFile ? opt.videoOverlayConfig || {} : null,
        animated_stickers: opt.animatedStickers || [],
      };
    });
    formData.append("platform_options", JSON.stringify(options));

    // Overlay statique (dessin + émojis + photo, aplatis en un seul PNG).
    platforms.forEach((p) => {
      const dataUrl = platformOptions[p]?.overlayDataUrl;
      if (dataUrl) {
        formData.append(`overlay_${p}`, dataUrlToBlob(dataUrl), `overlay_${p}.png`);
      }
    });

    // Vidéo incrustée (picture-in-picture), un fichier vidéo par plateforme.
    platforms.forEach((p) => {
      const videoFile = platformOptions[p]?.videoOverlayFile;
      if (videoFile) {
        formData.append(`video_overlay_${p}`, videoFile, videoFile.name || `pip_${p}.mp4`);
      }
    });

    return client.post("/repost/jobs/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getJob: (jobId) => client.get(`/repost/jobs/${jobId}/`),
  listJobs: () => client.get("/repost/jobs/list/"),
  publishJob: (jobId) => client.post(`/repost/jobs/${jobId}/publish/`),
};
