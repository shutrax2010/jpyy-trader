export function useAdminWallet() {
  const address = process.env.NEXT_PUBLIC_ADMIN_ADDRESS ?? null;
  const isConfigured = !!address && address !== '0xAdminWalletAddressHere';
  return { address: isConfigured ? address : null, isConfigured };
}
