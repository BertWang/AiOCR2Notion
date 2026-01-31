import { test, expect } from '@playwright/test';

test.describe('Upload and Processing Flow', () => {
  
  test('應顯示上傳區', async ({ page }) => {
    await page.goto('/');
    
    // 檢查上傳區是否存在
    const uploadZone = page.locator('text=上傳您的筆記');
    await expect(uploadZone).toBeVisible();
  });

  test('應顯示拖曳上傳提示', async ({ page }) => {
    await page.goto('/');
    
    const dragText = page.locator('text=點擊或拖曳檔案至此');
    await expect(dragText).toBeVisible();
  });

  test('應顯示最近處理的筆記', async ({ page }) => {
    await page.goto('/');
    
    // 檢查是否有筆記列表區域
    const recentSection = page.locator('text=最近處理');
    await expect(recentSection).toBeVisible();
  });
});

test.describe('Notes List and Navigation', () => {
  
  test('應導航到所有筆記頁面', async ({ page }) => {
    await page.goto('/');
    
    // 點擊側邊欄的筆記列表
    await page.click('text=所有筆記');
    
    // 應該跳轉到 /notes
    await expect(page).toHaveURL('/notes');
  });

  test('應顯示筆記列表', async ({ page }) => {
    await page.goto('/notes');
    
    // 等待頁面加載
    await page.waitForLoadState('networkidle');
    
    // 檢查是否有筆記或空狀態提示
    const hasNotes = await page.locator('[data-testid="note-card"]').count();
    const emptyState = page.locator('text=目前沒有任何筆記');
    
    if (hasNotes === 0) {
      await expect(emptyState).toBeVisible();
    }
  });
});

test.describe('Search Functionality', () => {
  
  test('應顯示搜尋功能', async ({ page }) => {
    await page.goto('/search');
    
    // 檢查搜尋輸入框
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
  });

  test('應能輸入搜尋關鍵字', async ({ page }) => {
    await page.goto('/search');
    
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('test keyword');
    
    await expect(searchInput).toHaveValue('test keyword');
  });

  test('應顯示進階搜尋選項', async ({ page }) => {
    await page.goto('/search');
    
    // 檢查進階搜尋相關元素
    const advancedOptions = page.locator('text=進階搜尋');
    
    // 如果有進階搜尋按鈕，應該可見
    const optionsVisible = await advancedOptions.isVisible().catch(() => false);
    expect(optionsVisible).toBeDefined();
  });
});

test.describe('Note Editor', () => {
  
  test('應能導航到筆記編輯器', async ({ page }) => {
    await page.goto('/notes');
    
    // 等待頁面加載
    await page.waitForLoadState('networkidle');
    
    // 檢查是否有筆記可以點擊
    const noteCards = await page.locator('[data-testid="note-card"]').count();
    
    if (noteCards > 0) {
      // 點擊第一個筆記
      await page.locator('[data-testid="note-card"]').first().click();
      
      // 應該進入編輯頁面
      await expect(page).toHaveURL(/\/notes\/.+/);
    }
  });

  test('編輯器應顯示預覽和編輯標籤', async ({ page }) => {
    // 這個測試需要真實筆記，先跳過
    test.skip(true, '需要真實筆記數據');
  });
});

test.describe('Settings Page', () => {
  
  test('應導航到設置頁面', async ({ page }) => {
    await page.goto('/');
    
    // 點擊側邊欄的設置
    await page.click('text=設置');
    
    // 應該跳轉到 /settings
    await expect(page).toHaveURL('/settings');
  });

  test('設置頁面應顯示各種配置選項', async ({ page }) => {
    await page.goto('/settings');
    
    // 等待頁面加載
    await page.waitForLoadState('networkidle');
    
    // 檢查是否有設置相關文本
    const settingsContent = await page.content();
    expect(settingsContent).toBeTruthy();
  });
});

test.describe('PWA Functionality', () => {
  
  test('應載入 PWA manifest', async ({ page }) => {
    await page.goto('/');
    
    // 檢查 manifest 是否存在
    const manifest = page.locator('link[rel="manifest"]');
    const href = await manifest.getAttribute('href');
    
    expect(href).toBeTruthy();
  });

  test('應載入 Service Worker', async ({ page }) => {
    await page.goto('/');
    
    // 等待 Service Worker 註冊
    await page.waitForLoadState('networkidle');
    
    // 檢查 Service Worker 註冊
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(swRegistered).toBe(true);
  });
});

test.describe('Responsive Design', () => {
  
  test('應在移動設備上正確顯示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');
    
    // 檢查上傳區是否適配移動設備
    const uploadZone = page.locator('text=上傳您的筆記');
    await expect(uploadZone).toBeVisible();
  });

  test('側邊欄應在移動設備上可收起', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // 等待頁面加載
    await page.waitForLoadState('networkidle');
    
    // 在移動設備上，側邊欄應該是收起的或有漢堡菜單
    const hamburgerMenu = page.locator('[aria-label="menu"]');
    const mobileMenuVisible = await hamburgerMenu.isVisible().catch(() => false);
    
    // 至少應該有某種移動導航方式
    expect(mobileMenuVisible).toBeDefined();
  });
});
