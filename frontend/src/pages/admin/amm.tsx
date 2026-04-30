import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminWalletGuard from '@/components/admin/AdminWalletGuard';
import AdminAmm from '@/components/admin/AdminAmm';
import { usePolling } from '@/hooks/usePolling';

export default function AdminAmmPage() {
  usePolling();
  return (
    <>
      <Head><title>JPYY ADMIN — AMM管理</title></Head>
      <AdminLayout>
        <AdminWalletGuard>
          <AdminAmm />
        </AdminWalletGuard>
      </AdminLayout>
    </>
  );
}
