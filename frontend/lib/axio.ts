// lib/axios.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true, // important so browser sends/accepts cookies
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers["x-access-token"] = token;
    }
  }
  return config;
});

export default api;
