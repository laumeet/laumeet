// app/test-cookies/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function TestCookies() {
  const [cookies, setCookies] = useState<string>('');

  useEffect(() => {
    // This will show all cookies available to the frontend
    setCookies(document.cookie);
  }, []);

  return (
    <div >
      <h1>Cookie Test Page</h1>
      <div>
        <strong>Current Cookies:</strong>
        <pre>{cookies || 'No cookies found'}</pre>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => window.location.href = '/explore'}
          style={{ padding: '10px 20px', marginRight: '10px' }}
        >
          Test Explore Page
        </button>
        
        <button 
          onClick={() => window.location.href = '/login'}
          style={{ padding: '10px 20px' }}
        >
          Test Login Page
        </button>
      </div>
    </div>
  );
}