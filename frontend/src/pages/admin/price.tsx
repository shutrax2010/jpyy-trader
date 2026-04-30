import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminWalletGuard from '@/components/admin/AdminWalletGuard';
import AdminYttPrice from '@/components/admin/AdminYttPrice';
import { usePolling } from '@/hooks/usePolling';

export default function AdminPricePage() {
  usePolling();
  return (
    <>
      <Head><title>JPYY ADMIN — YTT価格設定</title></Head>
      <AdminLayout>
        <AdminWalletGuard>
          <AdminYttPrice />
        </AdminWalletGuard>
      </AdminLayout>
    </>
  );
}
