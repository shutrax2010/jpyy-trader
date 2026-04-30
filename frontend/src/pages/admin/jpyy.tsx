import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminWalletGuard from '@/components/admin/AdminWalletGuard';
import AdminJpyy from '@/components/admin/AdminJpyy';

export default function AdminJpyyPage() {
  return (
    <>
      <Head><title>JPYY ADMIN — JPYY管理</title></Head>
      <AdminLayout>
        <AdminWalletGuard>
          <AdminJpyy />
        </AdminWalletGuard>
      </AdminLayout>
    </>
  );
}
