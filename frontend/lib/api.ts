// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
export async function apiFetch(path: string, options: RequestInit = {}) {
   const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include", // 👈 sends cookies
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    // try refresh
    const refreshRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/token/refresh`,
      { method: "POST", credentials: "include" }
    );
    if (refreshRes.ok) {
      // retry original request
      return apiFetch(path, options);
    }
  }

  return res;
}
