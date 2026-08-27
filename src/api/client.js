import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://fileflowbackend.onrender.com/api";

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("ff_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Rafraîchit automatiquement le token d'accès expiré une seule fois
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("ff_refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/login/refresh/`, { refresh });
          localStorage.setItem("ff_access_token", data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return client(original);
        } catch (e) {
          localStorage.removeItem("ff_access_token");
          localStorage.removeItem("ff_refresh_token");
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;

export const auth = {
  register: (email, username, password) =>
    client.post("/auth/register/", { email, username, password }),
  login: (email, password) => client.post("/auth/login/", { email, password }),
  me: () => client.get("/auth/me/"),
};

export const tools = {
  list: () => client.get("/tools/"),
  run: (slug, files, params = {}) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    Object.entries(params).forEach(([k, v]) => {
      formData.append(k, typeof v === "object" ? JSON.stringify(v) : v);
    });
    return client.post(`/tools/${slug}/run/`, formData, {
      responseType: "blob",
      headers: { "Content-Type": "multipart/form-data" },
      validateStatus: (status) => status < 500,
    });
  },
};

export const billing = {
  pricing: () => client.get("/billing/pricing/"),
  checkout: () => client.post("/billing/checkout/"),
  cancel: () => client.post("/auth/cancel/"),
};
