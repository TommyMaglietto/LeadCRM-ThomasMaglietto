import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { ScanView } from '@/components/scan/ScanView';

export const metadata: Metadata = { title: 'Scan | Lead Generator' };

export default function ScanPage() {
  return (
    <PageShell title="Scan">
      <ScanView />
    </PageShell>
  );
}
