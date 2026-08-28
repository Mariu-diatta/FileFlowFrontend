import client from "./client";

export const repostApi = {
  listPlatforms: () => client.get("/repost/platforms/"),

  createJob: ({ file, clipStart, clipDuration, captionText, platforms }) => {
    const formData = new FormData();
    formData.append("video", file);
    formData.append("clip_start", clipStart);
    formData.append("clip_duration", clipDuration);
    formData.append("caption_text", captionText || "");
    platforms.forEach((p) => formData.append("platforms", p));
    return client.post("/repost/jobs/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getJob: (jobId) => client.get(`/repost/jobs/${jobId}/`),
  listJobs: () => client.get("/repost/jobs/list/"),
  publishJob: (jobId) => client.post(`/repost/jobs/${jobId}/publish/`),
};
