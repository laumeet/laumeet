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
  metadataBase: new URL("https://laumeet.com"),
  title: {
    default: "Laumeet — School Dating & Social App",
    template: "%s | Laumeet",
  },
  description:
    "Laumeet is the #1 campus dating and social app for college students — match with students near you, make friends, build connections, and vibe safely.",
  keywords: [
    "Laumeet",
    "college dating",
    "university dating app",
    "campus social app",
    "student friendship app",
    "find match in school",
    "safe dating for students",
    "Nigerian students dating",
    "private chatting app",
    "meet people in school",
  ],

  applicationName: "Laumeet",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      maxSnippet: -1,
      maxImagePreview: "large",
      maxVideoPreview: -1,
    },
  },

  authors: [
    { name: "Laumeet Team", url: "https://laumeet.com" },
  ],

  icons: {
    icon: "/favicon.ico", // ✅ used as card image
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },

  openGraph: {
    type: "website",
    siteName: "Laumeet",
    url: "https://laumeet.com",
    title: "Laumeet — Dating & Social App for School Students",
    description:
      "Find your match, vibe, and build campus friendships — safely and privately!",
    images: [
      {
        url: "/favicon.ico",
        width: 512,
        height: 512,
        alt: "Laumeet App — Find your school match",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Laumeet — School Dating Starts Here",
    description:
      "The ultimate campus dating & chat app — real students, real vibes.",
    images: ["/favicon.ico"],
    creator: "@Laumeet",
  },

  themeColor: "#000000",

  // Geo / locale targeting ✅ especially strong for local markets
  alternates: {
    canonical: "https://laumeet.com",
  },
  category: "Dating",

  viewport:
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} font-sans`}data-app="laumeet"
  suppressHydrationWarning>
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