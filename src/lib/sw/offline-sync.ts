/**
 * Offline Sync Manager
 * Handles syncing pending offline data when connection is restored
 */

import { getOfflineStorage, type PendingMessage, type PendingPost } from './offline-storage';

export class OfflineSync {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupOnlineListener();
  }

  private setupOnlineListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[OfflineSync] Connection restored, starting sync...');
      this.syncAll();
    });
  }

  async syncAll(): Promise<void> {
    if (this.isSyncing) {
      console.log('[OfflineSync] Sync already in progress');
      return;
    }

    this.isSyncing = true;

    try {
      const storage = await getOfflineStorage();
      
      // Sync messages
      await this.syncMessages();
      
      // Sync posts
      await this.syncPosts();
      
      console.log('[OfflineSync] Sync completed');
    } catch (error) {
      console.error('[OfflineSync] Error during sync:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncMessages(): Promise<void> {
    try {
      const storage = await getOfflineStorage();
      const pendingMessages = await storage.getPendingMessages();

      console.log(`[OfflineSync] Syncing ${pendingMessages.length} pending messages`);

      for (const message of pendingMessages) {
        try {
          // Update status to syncing
          await storage.updateMessageStatus(message.id, 'syncing');

          // Prepare FormData if there's media
          let body: FormData | string;
          let headers: HeadersInit = { 'Content-Type': 'application/json' };

          if (message.mediaUrl && message.mediaType) {
            // For media messages, we'd need to reconstruct the file
            // This is a simplified version - in production, you'd store the File/Blob
            body = JSON.stringify({
              roomId: message.roomId,
              text: message.text,
              mediaUrl: message.mediaUrl,
              mediaType: message.mediaType,
              replyToId: message.replyToId,
            });
          } else {
            body = JSON.stringify({
              roomId: message.roomId,
              text: message.text,
              replyToId: message.replyToId,
            });
          }

          const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers,
            body: typeof body === 'string' ? body : undefined,
          });

          if (response.ok) {
            // Success - remove from pending
            await storage.deletePendingMessage(message.id);
            console.log(`[OfflineSync] Message ${message.id} synced successfully`);
          } else {
            // Failed - mark as failed
            await storage.updateMessageStatus(message.id, 'failed');
            console.warn(`[OfflineSync] Failed to sync message ${message.id}`);
          }
        } catch (error) {
          console.error(`[OfflineSync] Error syncing message ${message.id}:`, error);
          await storage.updateMessageStatus(message.id, 'failed');
        }
      }
    } catch (error) {
      console.error('[OfflineSync] Error in syncMessages:', error);
    }
  }

  private async syncPosts(): Promise<void> {
    try {
      const storage = await getOfflineStorage();
      const pendingPosts = await storage.getPendingPosts();

      console.log(`[OfflineSync] Syncing ${pendingPosts.length} pending posts`);

      for (const post of pendingPosts) {
        try {
          // Update status to syncing
          // Note: We'd need to add updatePostStatus method to storage

          // Prepare FormData
          const formData = new FormData();
          if (post.description) {
            formData.append('description', post.description);
          }
          if (post.mentionedUserIds && post.mentionedUserIds.length > 0) {
            formData.append('mentionedUserIds', JSON.stringify(post.mentionedUserIds));
          }
          
          // Add files
          // Note: Files need to be stored in IndexedDB or reconstructed
          // This is a simplified version
          post.files.forEach((file) => {
            formData.append('files', file);
          });

          const response = await fetch('/api/feed/create', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            // Success - remove from pending
            await storage.deletePendingPost(post.id);
            console.log(`[OfflineSync] Post ${post.id} synced successfully`);
          } else {
            // Failed
            console.warn(`[OfflineSync] Failed to sync post ${post.id}`);
          }
        } catch (error) {
          console.error(`[OfflineSync] Error syncing post ${post.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[OfflineSync] Error in syncPosts:', error);
    }
  }

  startPeriodicSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      this.stopPeriodicSync();
    }

    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncAll();
      }
    }, intervalMs);
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// Singleton instance
let offlineSyncInstance: OfflineSync | null = null;

export function getOfflineSync(): OfflineSync {
  if (!offlineSyncInstance) {
    offlineSyncInstance = new OfflineSync();
  }
  return offlineSyncInstance;
}

