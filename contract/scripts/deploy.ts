import { ethers } from 'hardhat';

async function main() {
  const [admin] = await ethers.getSigners();
  console.log('Deploying with admin:', admin.address);

  // 1. JPYY デプロイ
  const JPYYFactory = await ethers.getContractFactory('JPYY');
  const jpyy = await JPYYFactory.deploy(admin.address);
  await jpyy.waitForDeployment();
  const jpyyAddr = await jpyy.getAddress();
  console.log('JPYY deployed:', jpyyAddr);

  // 2. YTT デプロイ
  const YTTFactory = await ethers.getContractFactory('YTT');
  const ytt = await YTTFactory.deploy(admin.address);
  await ytt.waitForDeployment();
  const yttAddr = await ytt.getAddress();
  console.log('YTT deployed:', yttAddr);

  // 3. AMM デプロイ
  const AMMFactory = await ethers.getContractFactory('AMM');
  const amm = await AMMFactory.deploy(jpyyAddr, yttAddr, admin.address);
  await amm.waitForDeployment();
  const ammAddr = await amm.getAddress();
  console.log('AMM deployed:', ammAddr);

  // 4. 初期流動性（JPYY=10,000 / YTT=100 → 初期価格 ¥100/YTT）
  const jpyyInit = ethers.parseUnits('10000', 18);
  const yttInit  = ethers.parseUnits('100',   18);

  await (await jpyy.mint(admin.address, jpyyInit)).wait();
  await (await ytt.mint(admin.address,  yttInit)).wait();
  // setReserves でも使うため MaxUint256 で approve
  await (await jpyy.approve(ammAddr, ethers.MaxUint256)).wait();
  await (await ytt.approve(ammAddr,  ethers.MaxUint256)).wait();
  await (await amm.addLiquidity(jpyyInit, yttInit)).wait();
  console.log('✓ Initial liquidity: JPYY=10,000 / YTT=100 → ¥100/YTT');

  // 5. エージェントへの JPYY 配布はデプロイ後に管理ダッシュボードから実施
  console.log('\n--- .env に以下を追記 ---');
  console.log(`JPYY_ADDRESS=${jpyyAddr}`);
  console.log(`YTT_ADDRESS=${yttAddr}`);
  console.log(`AMM_ADDRESS=${ammAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
