import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * 圖片優化和壓縮工具
 */

export interface ImageOptimizationOptions {
  quality?: number; // 0-100，默認 80
  maxWidth?: number; // 默認 2048
  maxHeight?: number; // 默認 2048
  format?: 'webp' | 'jpg' | 'png'; // 默認 'webp'
}

export interface OptimizedImage {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  path: string;
}

/**
 * 優化單個圖片
 */
export async function optimizeImage(
  inputPath: string,
  outputDir: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const {
    quality = 80,
    maxWidth = 2048,
    maxHeight = 2048,
    format = 'webp',
  } = options;

  try {
    // 確保輸出目錄存在
    await mkdir(outputDir, { recursive: true });

    // 獲取原始文件大小
    const fs = await import('fs/promises');
    const originalBuffer = await fs.readFile(inputPath);
    const originalSize = originalBuffer.length;

    // 使用 sharp 進行圖片處理
    let pipeline = sharp(inputPath)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

    // 根據格式轉換
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (format === 'jpg') {
      pipeline = pipeline.jpeg({ quality, progressive: true });
    } else if (format === 'png') {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }

    // 生成輸出文件
    const outputFilename = `${path.parse(inputPath).name}-optimized.${format}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    const optimizedBuffer = await pipeline.toBuffer();
    await writeFile(outputPath, optimizedBuffer);

    const optimizedSize = optimizedBuffer.length;
    const compressionRatio = originalSize > 0 ? 
      ((originalSize - optimizedSize) / originalSize) * 100 : 0;

    return {
      originalSize,
      optimizedSize,
      compressionRatio,
      format,
      path: outputPath,
    };
  } catch (error) {
    console.error('Image optimization error:', error);
    throw error;
  }
}

/**
 * 生成多個尺寸的縮圖（用於響應式顯示）
 */
export async function generateThumbnails(
  inputPath: string,
  outputDir: string
): Promise<
  Array<{
    size: string;
    path: string;
    width: number;
    height: number;
  }>
> {
  const sizes = [
    { size: 'sm', width: 320, height: 240 },
    { size: 'md', width: 640, height: 480 },
    { size: 'lg', width: 1024, height: 768 },
  ];

  const results = [];

  for (const { size, width, height } of sizes) {
    try {
      const filename = `${path.parse(inputPath).name}-${size}.webp`;
      const outputPath = path.join(outputDir, filename);

      await sharp(inputPath)
        .resize(width, height, {
          fit: 'cover',
          withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toFile(outputPath);

      results.push({
        size,
        path: outputPath,
        width,
        height,
      });
    } catch (error) {
      console.warn(`Failed to generate ${size} thumbnail:`, error);
    }
  }

  return results;
}

/**
 * 計算圖片尺寸而不加載整個文件
 */
export async function getImageDimensions(
  imagePath: string
): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return null;
  }
}
