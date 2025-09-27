// lib/axios.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NODE_ENV === "production"
    ? "https://laumeet.onrender.com"  // your backend on Render
    : "http://localhost:5000",        // local backend for development
  withCredentials: true,              // send/receive cookies (JWT tokens)
});

export default api;
