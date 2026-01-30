// src/lib/mcp/services/webcrawler-client.ts
// Web Crawler 服務客戶端

import { BaseMCPServiceClient } from './base-client';
import { MCPActionType } from '../types';
import * as cheerio from 'cheerio';

/**
 * Web Crawler 客戶端
 */
export class WebCrawlerClient extends BaseMCPServiceClient {
  private userAgent: string = 'TestMoltbot-Crawler/1.0';
  private maxRedirects: number = 5;

  constructor() {
    super('Web Crawler', 'web_crawler');
  }

  /**
   * 驗證配置
   */
  protected async validateConfig(): Promise<void> {
    const config = this.config.config as any;
    if (config?.userAgent) {
      this.userAgent = config.userAgent;
    }
    if (config?.maxRedirects) {
      this.maxRedirects = config.maxRedirects;
    }
  }

  /**
   * 建立連接
   */
  protected async establishConnection(): Promise<void> {
    // Web Crawler 無需建立持久連接
  }

  /**
   * 關閉連接
   */
  protected async closeConnection(): Promise<void> {
    // Web Crawler 無需關閉連接
  }

  /**
   * 執行健康檢查
   */
  protected async performHealthCheck(): Promise<void> {
    // 測試爬取一個簡單的頁面
    try {
      const response = await fetch('https://httpbin.org/html', {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Web Crawler health check failed: ${error}`);
    }
  }

  /**
   * 執行操作
   */
  protected async executeAction(action: MCPActionType, input: any): Promise<any> {
    switch (action) {
      case 'process':
        return this.crawlPage(input.url, input.options);

      case 'extract':
        return this.extractData(input.url, input.selectors, input.options);

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  /**
   * 爬取頁面
   */
  private async crawlPage(url: string, options?: any): Promise<any> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(options?.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`Crawl failed: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 提取基本信息
    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    const keywords = $('meta[name="keywords"]').attr('content') || '';

    // 提取所有鏈接
    const links: string[] = [];
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, url).href;
          links.push(absoluteUrl);
        } catch {
          // 忽略無效 URL
        }
      }
    });

    // 提取所有圖片
    const images: string[] = [];
    $('img[src]').each((_, element) => {
      const src = $(element).attr('src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, url).href;
          images.push(absoluteUrl);
        } catch {
          // 忽略無效 URL
        }
      }
    });

    // 提取文本內容
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    return {
      url,
      title,
      description,
      keywords,
      links: [...new Set(links)],
      images: [...new Set(images)],
      textContent: bodyText.substring(0, 10000), // 限制長度
      statusCode: response.status,
      contentType: response.headers.get('content-type') || '',
    };
  }

  /**
   * 提取數據
   */
  private async extractData(url: string, selectors: Record<string, string>, options?: any): Promise<any> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
      },
      signal: AbortSignal.timeout(options?.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`Extract failed: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const extracted: Record<string, any> = {};

    for (const [key, selector] of Object.entries(selectors)) {
      const elements = $(selector);

      if (elements.length === 0) {
        extracted[key] = null;
      } else if (elements.length === 1) {
        extracted[key] = elements.text().trim();
      } else {
        extracted[key] = elements
          .map((_, el) => $(el).text().trim())
          .get();
      }
    }

    return {
      url,
      extracted,
      timestamp: new Date().toISOString(),
    };
  }
}
