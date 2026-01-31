import type { Metadata, Viewport } from "next";
import { Merriweather, Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/ui/sonner"
import { PWAInstallPrompt, IOSInstallPrompt } from "@/components/pwa-install-prompt"
import { PWAProvider } from "@/components/pwa-provider"

const serif = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-serif",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Moltbot - 智慧筆記歸檔",
  description: "結合 OCR 與 AI 的智慧筆記整理系統",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Moltbot",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#fafaf8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#fafaf8" />
        <meta name="description" content="智能手寫筆記數字化系統" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Moltbot" />
      </head>
      <body
        className={`${serif.variable} ${sans.variable} antialiased font-sans bg-stone-50 text-stone-900 selection:bg-stone-200 selection:text-stone-900`}
      >
        <PWAProvider>
          <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 min-h-screen relative flex flex-col transition-all duration-300 ease-in-out">
              <div className="absolute top-4 left-4 z-50 md:hidden">
                <SidebarTrigger />
              </div>
              <div className="flex-1">
                {children}
              </div>
              <Footer />
            </main>
            <Toaster position="bottom-right" theme="light" />
            <PWAInstallPrompt />
            <IOSInstallPrompt />
          </SidebarProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
