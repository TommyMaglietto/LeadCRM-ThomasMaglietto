import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <PageShell title="Dashboard">
      <DashboardContent />
    </PageShell>
  );
}
