/**
 * Offline Storage Manager using IndexedDB
 * Handles storing and syncing data when offline
 */

const DB_NAME = 'FamilyChatOffline';
const DB_VERSION = 1;

// Store names
const STORES = {
  MESSAGES: 'pendingMessages',
  POSTS: 'pendingPosts',
  STORIES: 'pendingStories',
  SYNC_QUEUE: 'syncQueue',
} as const;

interface PendingMessage {
  id: string;
  roomId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'gif';
  replyToId?: string;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

interface PendingPost {
  id: string;
  description?: string;
  files: File[];
  mentionedUserIds?: string[];
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

interface SyncQueueItem {
  id: string;
  type: 'message' | 'post' | 'story';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineStorage] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineStorage] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const messageStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
          messageStore.createIndex('roomId', 'roomId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
          messageStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.POSTS)) {
          const postStore = db.createObjectStore(STORES.POSTS, { keyPath: 'id' });
          postStore.createIndex('timestamp', 'timestamp', { unique: false });
          postStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // Messages
  async savePendingMessage(message: Omit<PendingMessage, 'status' | 'retryCount'>): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORES.MESSAGES);

    const pendingMessage: PendingMessage = {
      ...message,
      status: 'pending',
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(pendingMessage);
      request.onsuccess = () => {
        console.log('[OfflineStorage] Message saved for offline sync:', message.id);
        resolve();
      };
      request.onerror = () => {
        console.error('[OfflineStorage] Error saving message:', request.error);
        reject(request.error);
      };
    });
  }

  async getPendingMessages(roomId?: string): Promise<PendingMessage[]> {
    const db = this.ensureDB();
    const transaction = db.transaction([STORES.MESSAGES], 'readonly');
    const store = transaction.objectStore(STORES.MESSAGES);

    return new Promise((resolve, reject) => {
      let request: IDBRequest;

      if (roomId) {
        const index = store.index('roomId');
        request = index.getAll(roomId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const messages = request.result as PendingMessage[];
        resolve(messages.filter((m) => m.status === 'pending'));
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Error getting messages:', request.error);
        reject(request.error);
      };
    });
  }

  async updateMessageStatus(id: string, status: PendingMessage['status']): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORES.MESSAGES);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const message = getRequest.result as PendingMessage;
        if (message) {
          message.status = status;
          if (status === 'failed') {
            message.retryCount += 1;
          }
          const putRequest = store.put(message);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deletePendingMessage(id: string): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORES.MESSAGES);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Posts
  async savePendingPost(post: Omit<PendingPost, 'status' | 'retryCount'>): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction([STORES.POSTS], 'readwrite');
    const store = transaction.objectStore(STORES.POSTS);

    const pendingPost: PendingPost = {
      ...post,
      status: 'pending',
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(pendingPost);
      request.onsuccess = () => {
        console.log('[OfflineStorage] Post saved for offline sync:', post.id);
        resolve();
      };
      request.onerror = () => {
        console.error('[OfflineStorage] Error saving post:', request.error);
        reject(request.error);
      };
    });
  }

  async getPendingPosts(): Promise<PendingPost[]> {
    const db = this.ensureDB();
    const transaction = db.transaction([STORES.POSTS], 'readonly');
    const store = transaction.objectStore(STORES.POSTS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const posts = request.result as PendingPost[];
        resolve(posts.filter((p) => p.status === 'pending'));
      };
      request.onerror = () => {
        console.error('[OfflineStorage] Error getting posts:', request.error);
        reject(request.error);
      };
    });
  }

  async deletePendingPost(id: string): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction([STORES.POSTS], 'readwrite');
    const store = transaction.objectStore(STORES.POSTS);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Queue
  async addToSyncQueue(item: Omit<SyncQueueItem, 'retryCount'>): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    const queueItem: SyncQueueItem = {
      ...item,
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(queueItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = this.ensureDB();
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readonly');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result as SyncQueueItem[]);
      };
      request.onerror = () => {
        console.error('[OfflineStorage] Error getting sync queue:', request.error);
        reject(request.error);
      };
    });
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Utility: Check if online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Utility: Register online/offline listeners
  onOnline(callback: () => void): void {
    window.addEventListener('online', callback);
  }

  onOffline(callback: () => void): void {
    window.addEventListener('offline', callback);
  }

  // Utility: Clear all offline data
  async clearAll(): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction(
      [STORES.MESSAGES, STORES.POSTS, STORES.SYNC_QUEUE],
      'readwrite'
    );

    return Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORES.MESSAGES).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORES.POSTS).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORES.SYNC_QUEUE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
    ]).then(() => {
      console.log('[OfflineStorage] All offline data cleared');
    });
  }
}

// Singleton instance
let offlineStorageInstance: OfflineStorage | null = null;

export async function getOfflineStorage(): Promise<OfflineStorage> {
  if (!offlineStorageInstance) {
    offlineStorageInstance = new OfflineStorage();
    await offlineStorageInstance.init();
  }
  return offlineStorageInstance;
}

// Export types
export type { PendingMessage, PendingPost, SyncQueueItem };

