// lib/axios.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://localhost:5000",
  withCredentials: true, // important so browser sends/accepts cookies
});

export default api;
