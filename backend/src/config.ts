import 'dotenv/config';
import type { AgentMode } from '@jpyy/shared';

export const config = {
  // Gemini（ダミーモードでは未使用）
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',

  // Polygon Amoy Testnet（ダミーモードでは未使用）
  RPC_URL:  process.env.RPC_URL  ?? 'https://rpc-amoy.polygon.technology',
  CHAIN_ID: parseInt(process.env.CHAIN_ID ?? '80002'),

  // 管理者ウォレット（コントラクト管理操作・エージェントスワップ署名を兼務）
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY ?? '',

  // コントラクト（ダミーモードでは未使用）
  JPYY_ADDRESS: process.env.JPYY_ADDRESS ?? '',
  YTT_ADDRESS:  process.env.YTT_ADDRESS  ?? '',
  AMM_ADDRESS:  process.env.AMM_ADDRESS  ?? '',

  // エージェント設定
  DEFAULT_INTERVAL: parseInt(process.env.DEFAULT_INTERVAL ?? '60'),
  DEFAULT_AMOUNT:   parseInt(process.env.DEFAULT_AMOUNT   ?? '1000'),
  DEFAULT_MODE:     (process.env.DEFAULT_MODE ?? 'aggressive') as AgentMode,

  PORT: parseInt(process.env.PORT ?? '3001'),

  // ダミーモード: 管理者キーまたはコントラクトアドレスが未設定
  get isDummy() {
    return !this.ADMIN_PRIVATE_KEY || !this.AMM_ADDRESS;
  },
  // エージェントが実チェーンでスワップできるか（adminキーがあれば可能）
  get agentCanTrade() {
    return !this.isDummy;
  },
};
