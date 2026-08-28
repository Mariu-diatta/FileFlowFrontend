import client from "./client";

export const commentsApi = {
  list: (slug) => client.get(`/tools/${slug}/comments/`),
  create: (slug, text, rating) => client.post(`/tools/${slug}/comments/`, { text, rating }),
  remove: (commentId) => client.delete(`/tools/comments/${commentId}/`),
};
