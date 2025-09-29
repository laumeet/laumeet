// lib/axios.ts
import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_API_URL
      : "http://127.0.0.1:5000",
  withCredentials: true, // send/receive cookies
});

export default api;
