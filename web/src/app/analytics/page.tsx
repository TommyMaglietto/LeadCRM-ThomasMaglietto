import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { AnalyticsContent } from '@/components/analytics/AnalyticsContent';

export const metadata: Metadata = { title: 'Analytics' };

export default function AnalyticsPage() {
  return (
    <PageShell title="Analytics">
      <AnalyticsContent />
    </PageShell>
  );
}
