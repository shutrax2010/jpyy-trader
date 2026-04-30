import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminWalletGuard from '@/components/admin/AdminWalletGuard';
import AdminLog from '@/components/admin/AdminLog';

export default function AdminLogPage() {
  return (
    <>
      <Head><title>JPYY ADMIN — 操作ログ</title></Head>
      <AdminLayout>
        <AdminWalletGuard>
          <AdminLog />
        </AdminWalletGuard>
      </AdminLayout>
    </>
  );
}
