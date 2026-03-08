import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

import NotificationProvider from "./components/notifications/NotificationProvider";
import FloatingToasts from "./components/notifications/FloatingToasts";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Thorspace",
  description: "Thorspace – batalhas espaciais por turnos",
  // iOS Safari: quando adicionado à homescreen roda sem chrome do navegador
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Thorspace",
  },
  formatDetection: { telephone: false },
};

// Next.js App Router generates exactly ONE <meta name="viewport"> from this export.
// viewportFit:"cover" extends layout behind notch + home bar on iOS Safari.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <NotificationProvider>
            {children}
            <FloatingToasts />
          </NotificationProvider>
        </Providers>
      </body>
    </html>
  );
}
