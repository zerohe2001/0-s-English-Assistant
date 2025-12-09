/**
 * Audio Cache Service using IndexedDB
 * Stores TTS audio blobs with automatic cleanup for old articles
 */

const DB_NAME = 'ReadingAudioCache';
const STORE_NAME = 'audioBlobs';
const DB_VERSION = 1;
const MAX_STORAGE_MB = 50; // Maximum storage limit in MB

interface AudioCacheEntry {
  key: string;
  blob: Blob;
  size: number;        // Size in bytes
  createdAt: number;   // Timestamp
  lastAccessedAt: number;
}

class AudioCacheService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ AudioCache IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
          console.log('✅ AudioCache object store created');
        }
      };
    });
  }

  /**
   * Ensure DB is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  /**
   * Save audio blob to IndexedDB
   */
  async saveAudio(articleId: string, blob: Blob): Promise<void> {
    const db = await this.ensureDB();

    const entry: AudioCacheEntry = {
      key: articleId,
      blob,
      size: blob.size,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    // Check if storage is full before saving
    await this.cleanupIfNeeded(blob.size);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => {
        console.log(`✅ Audio cached for article: ${articleId} (${(blob.size / 1024).toFixed(2)} KB)`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get audio blob from IndexedDB
   */
  async getAudio(articleId: string): Promise<Blob | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(articleId);

      request.onsuccess = () => {
        const entry: AudioCacheEntry | undefined = request.result;

        if (entry) {
          // Update last accessed time
          entry.lastAccessedAt = Date.now();
          store.put(entry);

          console.log(`✅ Audio retrieved from cache: ${articleId}`);
          resolve(entry.blob);
        } else {
          console.log(`⚠️ Audio not found in cache: ${articleId}`);
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete audio from IndexedDB
   */
  async deleteAudio(articleId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(articleId);

      request.onsuccess = () => {
        console.log(`✅ Audio deleted from cache: ${articleId}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get total storage size used
   */
  async getTotalSize(): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries: AudioCacheEntry[] = request.result;
        const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
        resolve(totalSize);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cleanup old audio if storage is full
   * Strategy: Delete oldest created articles first (LRU based on createdAt)
   */
  async cleanupIfNeeded(newBlobSize: number): Promise<void> {
    const db = await this.ensureDB();
    const currentSize = await this.getTotalSize();
    const maxSizeBytes = MAX_STORAGE_MB * 1024 * 1024;

    // If new blob + current size exceeds limit, cleanup
    if (currentSize + newBlobSize > maxSizeBytes) {
      console.log(`⚠️ Storage limit reached (${(currentSize / 1024 / 1024).toFixed(2)} MB). Cleaning up...`);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('createdAt');
        const request = index.openCursor(); // Opens cursor in ascending order (oldest first)

        let freedSpace = 0;
        const spaceNeeded = (currentSize + newBlobSize) - maxSizeBytes;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;

          if (cursor && freedSpace < spaceNeeded) {
            const entry: AudioCacheEntry = cursor.value;

            // Delete this entry
            store.delete(entry.key);
            freedSpace += entry.size;
            console.log(`🗑️ Deleted old audio: ${entry.key} (${(entry.size / 1024).toFixed(2)} KB)`);

            cursor.continue();
          } else {
            console.log(`✅ Cleanup complete. Freed ${(freedSpace / 1024).toFixed(2)} KB`);
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Clear all cached audio
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('✅ All audio cache cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const audioCache = new AudioCacheService();
