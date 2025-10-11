// app/layout.tsx
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Toaster } from 'sonner';
import ModelPreloader from '@/components/providers/ModelPreloader';
import { SocketProvider } from '@/lib/socket-context';


const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Laumeet - School Dating & Social App',
  description: 'Find your match, vibe, or friend — safely and privately.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          
            
          <SocketProvider>  
            
          <ModelPreloader />
          <Toaster position='top-center' />
          <div className="max-w-md mx-auto min-h-screen bg-white dark:bg-gray-900 overflow-hidden">
            {children}
          </div>
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}