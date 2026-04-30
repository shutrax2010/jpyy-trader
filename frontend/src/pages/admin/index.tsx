import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminWalletGuard from '@/components/admin/AdminWalletGuard';
import AdminOverview from '@/components/admin/AdminOverview';
import { usePolling } from '@/hooks/usePolling';

export default function AdminIndexPage() {
  usePolling();
  return (
    <>
      <Head><title>JPYY ADMIN — 概要</title></Head>
      <AdminLayout>
        <AdminWalletGuard>
          <AdminOverview />
        </AdminWalletGuard>
      </AdminLayout>
    </>
  );
}
