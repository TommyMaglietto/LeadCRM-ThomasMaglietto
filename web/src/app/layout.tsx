import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
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
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-cream font-sans text-ink antialiased">
        <ToastProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
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
