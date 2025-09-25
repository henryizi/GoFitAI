import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

type OptimizeOptions = {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0-1
  enableCache?: boolean;
};

const cacheDirectory = `${FileSystem.cacheDirectory}image-optimizer/`;

async function ensureCacheDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(cacheDirectory);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(cacheDirectory, { intermediates: true });
    }
  } catch {
    // ignore
  }
}

function buildCacheKey(uri: string, opts: OptimizeOptions): string {
  const safe = uri.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(-120);
  const q = Math.round(opts.quality * 100);
  return `${safe}_${opts.maxWidth}x${opts.maxHeight}_q${q}.jpg`;
}

export const ImageOptimizer = {
  async optimizeImage(sourceUri: string, options: OptimizeOptions): Promise<string> {
    await ensureCacheDir();

    const cacheKey = buildCacheKey(sourceUri, options);
    const targetPath = `${cacheDirectory}${cacheKey}`;

    if (options.enableCache) {
      try {
        const existing = await FileSystem.getInfoAsync(targetPath);
        if (existing.exists) return targetPath;
      } catch {
        // ignore
      }
    }

    const srcInfo = await FileSystem.getInfoAsync(sourceUri);
    if (!srcInfo.exists) {
      throw new Error(`ImageOptimizer: source file does not exist: ${sourceUri}`);
    }

    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: options.maxWidth, height: options.maxHeight } }],
      { compress: options.quality, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Move result to our cache path for stability across platforms
    try {
      // On some platforms manipulateAsync already writes to a file; copy ensures location
      await FileSystem.copyAsync({ from: result.uri, to: targetPath });
      return targetPath;
    } catch {
      // Fallback to returned uri
      return result.uri;
    }
  },

  async preloadImages(uris: string[], options: OptimizeOptions): Promise<void> {
    // Preprocess sequentially to avoid memory spikes on low-end devices
    for (const uri of uris) {
      try {
        await ImageOptimizer.optimizeImage(uri, options);
      } catch {
        // best-effort; continue
      }
    }
  },

  async clearCache(): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(cacheDirectory);
      if (info.exists) {
        await FileSystem.deleteAsync(cacheDirectory, { idempotent: true });
      }
    } catch {
      // ignore
    } finally {
      await ensureCacheDir();
    }
  },
};

export type { OptimizeOptions };








































