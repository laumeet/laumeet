// lib/axios.ts
import axios from "axios";

const api = axios.create({
  baseURL: "/api", // ✅ Always go through Next.js API routes
  withCredentials: true, // send/receive cookies
});

export default api;
