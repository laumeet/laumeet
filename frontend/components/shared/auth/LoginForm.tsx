'use client';
import { useState } from 'react';
import { Eye, EyeOff, Lock, UserRound } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import api from '../../../lib/axios'; // relative path

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/login", formData);

      if (res.status === 200) {
        toast.success("Login Successful");

        if (res.data.access_token) {
          sessionStorage.setItem("access_token", res.data.access_token);
        }

        // Optional redirect, can comment out if not needed
        setTimeout(() => router.replace("/explore"), 500);
      }
    } catch (error) {
      if (api.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Login failed");
      } else {
        toast.error("An unexpected error occurred");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Username */}
      <div className="space-y-2">
        <label htmlFor="username">Username</label>
        <div className="relative">
          <UserRound className="absolute inset-y-0 left-0 pl-3 h-5 w-5 text-gray-400" />
          <input
            id="username"
            name="username"
            type="text"
            required
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="password">Password</label>
        <div className="relative">
          <Lock className="absolute inset-y-0 left-0 pl-3 h-5 w-5 text-gray-400" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="pl-10 pr-10 w-full px-4 py-3 rounded-lg border border-gray-300"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>

      <button type="submit" className="w-full bg-pink-500 text-white py-3 rounded-lg">
        Log In
      </button>

      <div className="text-center text-sm">
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </div>
    </form>
  );
}
