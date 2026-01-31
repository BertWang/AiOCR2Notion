/**
 * 初始化 OCR 提供商配置腳本
 * 運行: npx ts-node scripts/init-ocr-providers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initializeOCRProviders() {
  console.log('🔄 初始化 OCR 提供商配置...');

  const providers = [
    {
      provider: 'gemini',
      displayName: 'Google Gemini',
      description: 'Google 的多模態 AI 模型，支持視覺理解',
      enabled: true,
      priority: 1,
      isDefault: true,
      costPerRequest: 0.001,
      rateLimitPerMin: 60,
      monthlyQuota: 100000,
    },
    {
      provider: 'googleVision',
      displayName: 'Google Cloud Vision',
      description: 'Google Cloud 的高精度 OCR 服務',
      enabled: false,
      priority: 2,
      isDefault: false,
      costPerRequest: 0.0015,
      rateLimitPerMin: 300,
      monthlyQuota: 1000000,
    },
    {
      provider: 'azure',
      displayName: 'Azure Computer Vision',
      description: 'Microsoft Azure 的企業級 OCR 服務',
      enabled: false,
      priority: 3,
      isDefault: false,
      costPerRequest: 0.002,
      rateLimitPerMin: 20,
      monthlyQuota: 10000,
    },
    {
      provider: 'openai',
      displayName: 'OpenAI',
      description: 'OpenAI 的視覺 API',
      enabled: false,
      priority: 4,
      isDefault: false,
      costPerRequest: 0.01,
      rateLimitPerMin: 500,
      monthlyQuota: 1000000,
    },
    {
      provider: 'textract',
      displayName: 'AWS Textract',
      description: 'AWS 的文檔智能服務',
      enabled: false,
      priority: 5,
      isDefault: false,
      costPerRequest: 0.0015,
      rateLimitPerMin: 100,
      monthlyQuota: 500000,
    },
    {
      provider: 'tesseract',
      displayName: 'Tesseract',
      description: '開源 OCR 引擎，本地部署',
      enabled: false,
      priority: 6,
      isDefault: false,
      costPerRequest: 0,
      rateLimitPerMin: 0, // 無限制
      monthlyQuota: 0, // 無限制
    },
  ];

  for (const provider of providers) {
    try {
      const existing = await prisma.oCRProviderSetting.findUnique({
        where: { provider: provider.provider },
      });

      if (!existing) {
        await prisma.oCRProviderSetting.create({
          data: provider,
        });
        console.log(`✅ 創建提供商: ${provider.provider}`);
      } else {
        console.log(`⏭️  提供商已存在: ${provider.provider}`);
      }
    } catch (error) {
      console.error(`❌ 創建提供商失敗: ${provider.provider}`, error);
    }
  }

  // 更新或創建 AdminSettings
  try {
    await prisma.adminSettings.upsert({
      where: { id: 'singleton' },
      update: {
        enabledOCRProviders: 'gemini',
        defaultOCRProvider: 'gemini',
        enableFailover: true,
      },
      create: {
        id: 'singleton',
        enabledOCRProviders: 'gemini',
        defaultOCRProvider: 'gemini',
        enableFailover: true,
      },
    });
    console.log('✅ 更新 AdminSettings');
  } catch (error) {
    console.error('❌ 更新 AdminSettings 失敗', error);
  }

  console.log('✨ OCR 提供商初始化完成');
  await prisma.$disconnect();
  process.exit(0);
}

initializeOCRProviders().catch((error) => {
  console.error('初始化失敗:', error);
  process.exit(1);
});
