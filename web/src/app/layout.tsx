import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'LeadGen CRM',
    template: '%s | LeadGen CRM',
  },
  description: 'Local business lead generation and outreach CRM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-surface font-sans text-text-primary antialiased">
        <ToastProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            {/* Main content area shifted right by sidebar width */}
            <div
              className="flex flex-col flex-1 min-w-0 overflow-hidden"
              style={{ marginLeft: 240 }}
            >
              {children}
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
