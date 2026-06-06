import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import { Toaster } from "sonner";

// Load Inter as a CSS variable only — `display: 'optional'` prevents the
// preload from generating a "preloaded but not used" warning when the
// ThemeProvider immediately swaps in a restaurant-specific Google Font.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "optional",   // no aggressive preload; avoids the woff2 warning
  preload: false,         // disable auto-preload link entirely
  fallback: ["-apple-system", "BlinkMacSystemFont", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Order Online",
  description: "Order freshly prepared food online.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} style={{ colorScheme: "dark" }}>
      <head>
        <meta name="color-scheme" content="dark" />
        {/* DNS prefetch for Google Fonts — loaded lazily by ThemeProvider */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="parchment-bg antialiased">
        <QueryProvider>
          {children}
          <Toaster richColors closeButton theme="dark" position="bottom-center" />
        </QueryProvider>
      </body>
    </html>
  );
}
