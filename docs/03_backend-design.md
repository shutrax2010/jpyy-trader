# バックエンド設計書

**対象システム**: JPYY TRADER
**バージョン**: 1.2
**作成日**: 2026-04-29
**更新日**: 2026-04-29（ウォレット2本化に対応、WebSocket廃止→ポーリング対応）

---

## 変更履歴

| Ver | 日付 | 変更内容 |
|-----|------|---------|
| 1.0 | 2026-04-29 | 初版 |
| 1.1 | 2026-04-29 | ウォレット4本→2本化（管理者・エージェント）に合わせて全体を更新 |
| 1.2 | 2026-04-29 | WebSocket廃止。GET /api/state ポーリング方式に変更 |

---

## 1. ウォレット構成

```
管理者ウォレット  → ADMIN_PRIVATE_KEY（.env）
                   バックエンドが自動署名・MetaMask不要

エージェントウォレット → MetaMask接続（フロントエンド）
                        秘密鍵は.envに書かない
                        接続アドレスを POST /agent/connect で受け取る
```

| キー | 用途 | 使用箇所 |
|-----|------|---------|
| `ADMIN_PRIVATE_KEY` | コントラクトデプロイ・管理操作 | Hardhat スクリプト・管理APIルート |

| `AGENT_ADDRESS` | エージェントの残高確認・フロント表示 | ContractClient / フロントエンド env |

---

## 2. 全体構成

### 技術スタック

| 要素 | 採用技術 |
|------|---------|
| ランタイム | Node.js 20 + TypeScript |
| HTTPサーバー | Fastify |
| ブロックチェーン | ethers.js v6 |
| AI | @anthropic-ai/sdk |
| 状態管理 | オンメモリ（DBなし・デモ用途） |
| 環境変数 | dotenv |

### ディレクトリ構成

```
backend/
├── src/
│   ├── server.ts
│   ├── config.ts
│   ├── agent/
│   │   ├── AgentLoop.ts
│   │   ├── MarketAnalyzer.ts
│   │   ├── ClaudeClient.ts
│   │   └── TradeExecutor.ts
│   ├── contracts/
│   │   ├── ContractClient.ts
│   │   └── abis/
│   │       ├── JPYY.json
│   │       ├── YTT.json
│   │       └── AMM.json
│   ├── routes/
│   │   ├── state.ts            # GET /api/state（ポーリング用）
│   │   ├── agent.ts            # エージェント制御
│   │   └── admin.ts            # 管理者操作
│   └── store/
│       └── AppState.ts
├── .env
├── package.json
└── tsconfig.json
```

---

## 3. config.ts（環境変数）

```typescript
import 'dotenv/config';

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env: ${key}`);
  return val;
}

export const config = {
  // Anthropic
  ANTHROPIC_API_KEY: required('ANTHROPIC_API_KEY'),

  // Polygon Amoy
  RPC_URL:  required('RPC_URL'),
  CHAIN_ID: parseInt(process.env.CHAIN_ID ?? '80002'),

  // ── ウォレット（2本のみ） ──────────────────────────────
  // 管理者ウォレット（デプロイ・mint・AMM管理用）
  ADMIN_PRIVATE_KEY: required('ADMIN_PRIVATE_KEY'),

  // ── エージェントウォレット（MetaMask接続で取得）──────────
  // 秘密鍵は .env に書かない
  // ──────────────────────────────────────────────────────

  // コントラクト
  JPYY_ADDRESS: required('JPYY_ADDRESS'),
  YTT_ADDRESS:  required('YTT_ADDRESS'),
  AMM_ADDRESS:  required('AMM_ADDRESS'),

  // エージェント設定
  AGENT_AUTO_START: false,  // MetaMask接続後に手動STARTするためfalse固定
  DEFAULT_INTERVAL: parseInt(process.env.DEFAULT_INTERVAL ?? '60'),
  DEFAULT_AMOUNT:   parseInt(process.env.DEFAULT_AMOUNT   ?? '1000'),
  DEFAULT_MODE:     (process.env.DEFAULT_MODE ?? 'aggressive') as AgentMode,

  PORT: parseInt(process.env.PORT ?? '3001'),

  validate() {
    Object.values(this).forEach(v => { if (typeof v === 'function') return; });
  }
} as const;
```

**.env ファイル例**:

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Polygon Amoy Testnet
RPC_URL=https://rpc-amoy.polygon.technology
CHAIN_ID=80002

# 管理者ウォレット（デプロイ・JPYY mint・AMM管理）
ADMIN_PRIVATE_KEY=0x...

# エージェントウォレット秘密鍵はここに書かない
# → フロントエンドのMetaMask接続で取得する

# コントラクト（デプロイ後に記入）
JPYY_ADDRESS=0x...
YTT_ADDRESS=0x...
AMM_ADDRESS=0x...

# エージェント設定
DEFAULT_INTERVAL=60
DEFAULT_AMOUNT=1000
DEFAULT_MODE=aggressive

PORT=3001
```

---

## 4. ContractClient.ts（2ウォレット対応）

エージェント用 Signer は MetaMask から受け取った署名済みTXを送信する形に変わる。読み取りは `provider` を使い、スワップTXはフロントエンドで署名させる。

```typescript
import { ethers } from 'ethers';
import { config } from '../config';
import JPYY_ABI from './abis/JPYY.json';
import YTT_ABI  from './abis/YTT.json';
import AMM_ABI  from './abis/AMM.json';

export class ContractClient {
  private static provider:      ethers.JsonRpcProvider;
  private static adminSigner:   ethers.Wallet;   // 管理者ウォレット
  // エージェントアドレス（接続後にAppStateから取得）

  // コントラクトインスタンス（署名者別）
  private static jpyyAsAdmin:   ethers.Contract;  // mint・transfer用
  private static jpyyAsAgent:   ethers.Contract;  // approve用
  private static yttAsAgent:    ethers.Contract;  // approve用
  private static ammAsAgent:    ethers.Contract;  // swap用（エージェント）
  private static ammAsAdmin:    ethers.Contract;  // addLiquidity・setReserves用

  static async init() {
    this.provider    = new ethers.JsonRpcProvider(config.RPC_URL);
    this.adminSigner = new ethers.Wallet(config.ADMIN_PRIVATE_KEY, this.provider);

    // チェーンID確認
    const network = await this.provider.getNetwork();
    if (network.chainId !== BigInt(config.CHAIN_ID)) {
      throw new Error(`Wrong chain: expected ${config.CHAIN_ID}, got ${network.chainId}`);
    }

    // 管理者用コントラクト（mint・distribute・AMM管理）
    this.jpyyAsAdmin = new ethers.Contract(config.JPYY_ADDRESS, JPYY_ABI, this.adminSigner);
    this.ammAsAdmin  = new ethers.Contract(config.AMM_ADDRESS,  AMM_ABI,  this.adminSigner);

    // エージェント用コントラクト（swap・approve）
    this.jpyyAsAgent = new ethers.Contract(config.JPYY_ADDRESS, JPYY_ABI, this.agentSigner);
    this.yttAsAgent  = new ethers.Contract(config.YTT_ADDRESS,  YTT_ABI,  this.agentSigner);
    this.ammAsAgent  = new ethers.Contract(config.AMM_ADDRESS,  AMM_ABI,  this.agentSigner);
  }

  // ── 読み取り（署名不要・provider直接）──────────────────

  static async getPoolReserves(): Promise<{ jpyy: bigint; ytt: bigint }> {
    const [jpyy, ytt] = await this.ammAsAgent.getReserves();
    return { jpyy, ytt };
  }

  // エージェントウォレットの残高を取得（トレード画面のHOLDINGS表示用）
  static async getAgentBalances() {
    const [pol, jpyy, ytt] = await Promise.all([
      this.provider.getBalance(config.AGENT_ADDRESS),
      this.jpyyAsAgent.balanceOf(config.AGENT_ADDRESS),
      this.yttAsAgent.balanceOf(config.AGENT_ADDRESS),
    ]);
    return {
      pol:  parseFloat(ethers.formatEther(pol)),
      jpyy: parseFloat(ethers.formatUnits(jpyy, 18)),
      ytt:  parseFloat(ethers.formatUnits(ytt,  18)),
    };
  }

  static async getAmountOut(amountIn: bigint, tokenIn: 'JPYY' | 'YTT'): Promise<bigint> {
    return this.ammAsAgent.getAmountOut(
      amountIn,
      tokenIn === 'JPYY' ? config.JPYY_ADDRESS : config.YTT_ADDRESS
    );
  }

  // ── エージェントのTX（フロントエンドで署名してもらう）────

  // スワップに必要なTXデータを生成して返す（フロントが署名・送信）
  static async buildSwapTx(
    action: 'BUY' | 'SELL',
    amountJpyy: number,
    currentPrice: number,
    agentAddress: string
  ): Promise<ethers.TransactionRequest> {
    const SLIPPAGE = 0.95;

    if (action === 'BUY') {
      const jpyyIn      = ethers.parseUnits(amountJpyy.toString(), 18);
      const yttExpected = await this.getAmountOut(jpyyIn, 'JPYY');
      const minYtt      = yttExpected * BigInt(Math.floor(SLIPPAGE * 1000)) / 1000n;
      return await this.ammReadOnly.swapJpyyForYtt.populateTransaction(jpyyIn, minYtt);
    } else {
      const yttAmount    = amountJpyy / currentPrice;
      const yttIn        = ethers.parseUnits(yttAmount.toFixed(6), 18);
      const jpyyExpected = await this.getAmountOut(yttIn, 'YTT');
      const minJpyy      = jpyyExpected * BigInt(Math.floor(SLIPPAGE * 1000)) / 1000n;
      return await this.ammReadOnly.swapYttForJpyy.populateTransaction(yttIn, minJpyy);
    }
  }

  // ── 管理者操作（管理画面から呼び出し）──────────────────

  // JPYY 発行（エージェントアドレスまたはカスタムアドレスへ）
  static async mintJpyy(to: string, amount: bigint) {
    return this.jpyyAsAdmin.mint(to, amount);
  }

  // JPYY 配布（管理者残高から転送）
  static async transferJpyy(to: string, amount: bigint) {
    return this.jpyyAsAdmin.transfer(to, amount);
  }

  // AMMへの流動性追加（管理者が JPYY・YTT を投入）
  static async addLiquidity(jpyyAmount: bigint, yttAmount: bigint) {
    await this.jpyyAsAdmin.approve(config.AMM_ADDRESS, jpyyAmount);
    await new ethers.Contract(config.YTT_ADDRESS, YTT_ABI, this.adminSigner)
      .approve(config.AMM_ADDRESS, yttAmount);
    return this.ammAsAdmin.addLiquidity(jpyyAmount, yttAmount);
  }

  // AMM のプール比率を直接変更（価格リバランス）
  static async setReserves(jpyyAmount: bigint, yttAmount: bigint) {
    return this.ammAsAdmin.setReserves(jpyyAmount, yttAmount);
  }

  // コントラクトの owner を確認（管理画面アクセス制御用）
  static async getOwner(): Promise<string> {
    return this.jpyyAsAdmin.owner();
  }
}
```

---

## 5. server.ts（起動順序）

```typescript
async function bootstrap() {
  config.validate();

  // コントラクト接続を初期化
  await ContractClient.init();
  console.log('✓ Admin wallet:', config.ADMIN_PRIVATE_KEY.slice(0, 6) + '...');

  const app = Fastify({ logger: true });

  // CORS（フロントエンドからのポーリングを許可）
  app.register(require('@fastify/cors'), { origin: true });

  app.register(stateRoutes);                          // GET /api/state
  app.register(agentRoutes, { prefix: '/agent' });
  app.register(adminRoutes, { prefix: '/admin' });

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  console.log(`✓ Server listening on port ${config.PORT}`);

  if (config.AGENT_AUTO_START) {
    AgentLoop.getInstance().start();
  }
}
```

---

## 6. AgentLoop.ts（変更なし）

v1.0から変更なし。`ContractClient.getAgentBalances()` が自動的にエージェントウォレットの残高を返すため、ループ内のコードは変更不要。

---

## 7. MarketAnalyzer.ts（変更なし）

v1.0から変更なし。

---

## 8. TradeExecutor.ts

スワップTXをバックエンドで送信せず、フロントエンドに署名を依頼する構成に変わる。

```typescript
export class TradeExecutor {
  static async execute(
    action: 'BUY' | 'SELL',
    amountJpyy: number,
    currentPrice: number
  ) {
    const agentAddress = AppState.agentAddress;
    if (!agentAddress) throw new Error('Agent wallet not connected');

    // 1. TX データを生成
    const txData = await ContractClient.buildSwapTx(
      action, amountJpyy, currentPrice, agentAddress
    );

    // 2. フロントエンドに署名を依頼（WebSocket経由）
    WsServer.broadcast({
      event: 'sign_request',
      data: {
        action,
        txData: {
          to:       txData.to,
          data:     txData.data,
          gasLimit: '200000',
        },
        amountJpyy,
        ts: new Date().toISOString(),
      }
    });

    // 3. フロントエンドが署名・送信したTXハッシュを受け取る
    //    → POST /agent/tx-hash で受け取り、確定を監視
  }
}
```

### フロントエンド側の署名フロー

```typescript
// useWebSocket.ts
ws.onmessage = async (event) => {
  const { event: name, data } = JSON.parse(event.data);

  if (name === 'sign_request') {
    try {
      // MetaMaskで署名・送信
      const signer   = await provider.getSigner();
      const tx       = await signer.sendTransaction(data.txData);

      // TXハッシュをバックエンドに通知
      await fetch('/agent/tx-hash', {
        method: 'POST',
        body: JSON.stringify({ hash: tx.hash, action: data.action })
      });

      // 確定を待つ
      await tx.wait();
    } catch (err) {
      // 署名拒否・失敗時もバックエンドに通知
      await fetch('/agent/tx-failed', {
        method: 'POST',
        body: JSON.stringify({ reason: err.message })
      });
    }
  }
};
```
---
## 9. HTTP APIルート

### routes/agent.ts（変更なし）

| メソッド | パス | 処理 |
|---------|------|------|
| GET | `/agent/status` | 状態取得 |
| POST | `/agent/start` | 起動 |
| POST | `/agent/stop` | 停止 |
| PATCH | `/agent/config` | 設定変更 |

### routes/admin.ts（管理者ウォレット検証を追加）

全エンドポイントで `X-Admin-Address` ヘッダーを受け取り、`ContractClient.getOwner()` と照合してアクセス制御を行う。

```typescript
// 管理者検証ミドルウェア
async function verifyAdmin(request: FastifyRequest, reply: FastifyReply) {
  const callerAddress = request.headers['x-admin-address'] as string;
  const ownerAddress  = await ContractClient.getOwner();
  if (callerAddress?.toLowerCase() !== ownerAddress.toLowerCase()) {
    return reply.code(403).send({ error: '管理者ウォレットで接続してください' });
  }
}
```

| メソッド | パス | 処理 | 使用Signer |
|---------|------|------|-----------|
| POST | `/admin/mint` | JPYY発行 | adminSigner |
| POST | `/admin/distribute` | JPYY配布 | adminSigner |
| POST | `/admin/liquidity` | 流動性追加 | adminSigner |
| POST | `/admin/price` | 価格変更 | adminSigner |
| GET  | `/admin/logs` | 操作ログ | — |

**リクエスト例**:

```typescript
// POST /admin/mint
// 発行先はエージェントアドレスまたはカスタム
{ "amount": 50000, "to": "0x..." }  // toが省略時はAGENT_ADDRESSを使用

// POST /admin/distribute
{ "addresses": ["0xAAA..."], "amountEach": 10000 }

// POST /admin/liquidity
{ "jpyyAmount": 5000, "yttAmount": 50 }

// POST /admin/price
{ "targetPrice": 150, "yttReserve": 100 }
```

---

## 10. AppState.ts（変更なし）

v1.0から変更なし。`agentJpyy`・`agentYtt`・`agentPol` は引き続きエージェントウォレットの残高を指す。

---

## 11. routes/state.ts — GET /api/state

フロントエンドが 5 秒ごとにポーリングするエンドポイント。`AppState` の現在値をそのままシリアライズして返す。

```typescript
import { FastifyInstance } from 'fastify';
import { AppState } from '../store/AppState';
import { AgentLoop } from '../agent/AgentLoop';
import { config } from '../config';

export async function stateRoutes(app: FastifyInstance) {
  app.get('/api/state', async (_req, reply) => {
    const loop = AgentLoop.getInstance();
    return reply.send({
      agent: {
        address:     config.AGENT_ADDRESS,
        running:     AppState.running,
        mode:        AppState.mode,
        interval:    AppState.intervalSec,
        tradeAmount: AppState.tradeAmount,
        nextRunIn:   loop.getNextRunIn(),
      },
      balances:     AppState.balances,
      pool:         AppState.pool,
      priceHistory: AppState.priceHistory.slice(-20),
      lastDecision: AppState.lastDecision,
      txHistory:    AppState.txHistory.slice(0, 20),
      lastError:    AppState.lastError,
    });
  });
}

---

## 12. セットアップスクリプト

### scripts/deploy.ts（管理者ウォレットでデプロイ）

```typescript
// ADMIN_PRIVATE_KEY でデプロイ・初期設定を一括実行
async function main() {
  const [admin] = await ethers.getSigners();  // ADMIN_PRIVATE_KEY を使用

  const JPYY = await ethers.deployContract('JPYY', [admin.address]);
  const YTT  = await ethers.deployContract('YTT',  [admin.address]);
  const AMM  = await ethers.deployContract('AMM',  [JPYY.target, YTT.target]);

  // minter権限をadminに付与（自分自身）
  await JPYY.grantRole(MINTER_ROLE, admin.address);

  console.log('JPYY_ADDRESS=', JPYY.target);
  console.log('YTT_ADDRESS=',  YTT.target);
  console.log('AMM_ADDRESS=',  AMM.target);
}
```

### scripts/setup-agent.ts は不要になった

旧: エージェントの秘密鍵で Approve を実行
新: Approve はフロントエンドで MetaMask 接続後にユーザーが承認する

```typescript
// フロントエンド接続後の初回セットアップ（useEffect で1回だけ実行）
const checkAndApprove = async (signer: ethers.Signer) => {
  const jpyy = new ethers.Contract(JPYY_ADDRESS, JPYY_ABI, signer);
  const ytt  = new ethers.Contract(YTT_ADDRESS,  YTT_ABI,  signer);
  const allowanceJpyy = await jpyy.allowance(address, AMM_ADDRESS);
  const allowanceYtt  = await ytt.allowance(address,  AMM_ADDRESS);

  if (allowanceJpyy === 0n) await jpyy.approve(AMM_ADDRESS, MaxUint256);
  if (allowanceYtt  === 0n) await ytt.approve(AMM_ADDRESS,  MaxUint256);
};
```

---

## 13. エラーハンドリング一覧（変更なし）

| 発生箇所 | エラー種別 | 対応 |
|---------|-----------|------|
| ContractClient.init | チェーンID不一致 | プロセス終了 |
| MarketAnalyzer.fetch | RPCタイムアウト | 3回リトライ→スキップ |
| ClaudeClient.decide | APIタイムアウト | 3回リトライ→HOLD |
| ClaudeClient.decide | JSONパース失敗 | HOLDフォールバック |
| TradeExecutor | 残高不足 | スキップ |
| TradeExecutor | TXリバート | Failed記録 |
| TradeExecutor | POL不足 | エージェント停止 |
| admin routes | owner不一致 | 403レスポンス |

---

## 14. package.json

```json
{
  "scripts": {
    "dev":         "ts-node-dev --respawn src/server.ts",
    "build":       "tsc",
    "start":       "node dist/server.js",
    "deploy":      "hardhat run scripts/deploy.ts --network amoy",
    "distribute":  "ts-node scripts/distribute.ts"
  },
  "dependencies": {
    "fastify":        "^4.x",
    "@fastify/cors":  "^9.x",
    "ethers":         "^6.x",
    "@anthropic-ai/sdk": "^0.x",
    "dotenv":         "^16.x"
  },
  "devDependencies": {
    "typescript":   "^5.x",
    "ts-node-dev":  "^2.x",
    "@types/node":  "^20.x",
    "hardhat":      "^2.x",
    "@nomicfoundation/hardhat-ethers": "^3.x"
  }
}
```

---

*最終更新: 2026-04-29（v1.2 WebSocket廃止）*
