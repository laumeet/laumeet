// components/auth/LoginCheck.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const hasToken = document.cookie.includes('access_token_cookie');
      console.log('🔐 LoginCheck - Has token:', hasToken);
      
      if (!hasToken) {
        console.log('🔐 Redirecting to login...');
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return <>{children}</>;
}