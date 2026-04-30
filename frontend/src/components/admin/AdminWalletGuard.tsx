import type { ReactNode } from 'react';

// 管理画面はバックエンド側で admin API を保護しているため、
// フロントエンドのアクセス制御は不要。
export default function AdminWalletGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
