import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Digi Hisab SuperAdmin | Zero-Trust Financial Sentinel',
  description: 'Mission Control for Digi Hisab - Dukandar POS & Ghar Ka Hisab Enterprise Supervision',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans bg-[#0a0f1d] text-slate-100 antialiased selection:bg-[#00d49f]/30 selection:text-[#00d49f]`}
      >
        {children}
      </body>
    </html>
  );
}
