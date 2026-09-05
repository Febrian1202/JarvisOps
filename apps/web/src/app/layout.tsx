import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'JARVIS OPS — IT Service Management',
  description: 'Platform manajemen tiket, aset, dan layanan IT perusahaan.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
