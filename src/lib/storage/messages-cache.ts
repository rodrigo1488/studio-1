import type { Message } from '@/lib/data';

const CACHE_PREFIX = 'chat_messages_';
const CACHE_TIMESTAMP_PREFIX = 'chat_timestamp_';
const CACHE_LAST_UPDATE_PREFIX = 'chat_last_update_';
const MAX_CACHED_MESSAGES = 50; // Cache last 50 messages per room
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes - cache mais longo
const CACHE_STALE_MS = 2 * 60 * 1000; // 2 minutes - considerar stale mas ainda usar

export interface CachedMessages {
  messages: Message[];
  timestamp: number;
  roomId: string;
}

/**
 * Get cached messages for a room
 * Returns messages and whether cache is stale (needs refresh in background)
 */
export function getCachedMessages(roomId: string): { messages: Message[]; isStale: boolean } | null {
  try {
    const cacheKey = `${CACHE_PREFIX}${roomId}`;
    const timestampKey = `${CACHE_TIMESTAMP_PREFIX}${roomId}`;
    
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(timestampKey);
    
    if (!cached || !timestamp) {
      return null;
    }
    
    // Check if cache is expired
    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();
    const age = now - cacheTime;
    
    if (age > CACHE_EXPIRY_MS) {
      // Cache expired, remove it
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(timestampKey);
      return null;
    }
    
    const parsed: Message[] = JSON.parse(cached);
    // Convert timestamp strings back to Date objects
    const messages = parsed.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
    
    // Cache is stale if older than CACHE_STALE_MS but still valid
    const isStale = age > CACHE_STALE_MS;
    
    return { messages, isStale };
  } catch (error) {
    console.error('Error reading cached messages:', error);
    return null;
  }
}

/**
 * Save messages to cache (only last N messages)
 */
export function saveMessagesToCache(roomId: string, messages: Message[]): void {
  try {
    const cacheKey = `${CACHE_PREFIX}${roomId}`;
    const timestampKey = `${CACHE_TIMESTAMP_PREFIX}${roomId}`;
    
    // Only cache the last N messages
    const messagesToCache = messages.slice(-MAX_CACHED_MESSAGES);
    
    localStorage.setItem(cacheKey, JSON.stringify(messagesToCache));
    localStorage.setItem(timestampKey, Date.now().toString());
  } catch (error) {
    console.error('Error saving messages to cache:', error);
    // If quota exceeded, try to clear old caches
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldCaches();
    }
  }
}

/**
 * Add a new message to cache
 */
export function addMessageToCache(roomId: string, message: Message): void {
  try {
    const cached = getCachedMessages(roomId);
    if (cached && cached.messages) {
      // Add new message and keep only last N
      const updated = [...cached.messages, message].slice(-MAX_CACHED_MESSAGES);
      saveMessagesToCache(roomId, updated);
    } else {
      // No cache, just save this message
      saveMessagesToCache(roomId, [message]);
    }
  } catch (error) {
    console.error('Error adding message to cache:', error);
  }
}

/**
 * Clear cache for a specific room
 */
export function clearRoomCache(roomId: string): void {
  try {
    const cacheKey = `${CACHE_PREFIX}${roomId}`;
    const timestampKey = `${CACHE_TIMESTAMP_PREFIX}${roomId}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(timestampKey);
  } catch (error) {
    console.error('Error clearing room cache:', error);
  }
}

/**
 * Clear old caches to free up space
 */
function clearOldCaches(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_TIMESTAMP_PREFIX)) {
        const timestamp = parseInt(localStorage.getItem(key) || '0', 10);
        // Clear caches older than 1 hour
        if (now - timestamp > 60 * 60 * 1000) {
          const roomId = key.replace(CACHE_TIMESTAMP_PREFIX, '');
          clearRoomCache(roomId);
        }
      }
    });
  } catch (error) {
    console.error('Error clearing old caches:', error);
  }
}

