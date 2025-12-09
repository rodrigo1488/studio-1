import type { Room } from '@/lib/data';

const ROOMS_CACHE_KEY = 'chat_rooms_list';
const ROOMS_CACHE_TIMESTAMP_KEY = 'chat_rooms_timestamp';
const CONVERSATIONS_CACHE_KEY = 'chat_conversations_list';
const CONVERSATIONS_CACHE_TIMESTAMP_KEY = 'chat_conversations_timestamp';
const CONTACTS_CACHE_KEY = 'chat_contacts_list';
const CONTACTS_CACHE_TIMESTAMP_KEY = 'chat_contacts_timestamp';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached rooms list
 */
export function getCachedRooms(): Room[] | null {
  try {
    const cached = localStorage.getItem(ROOMS_CACHE_KEY);
    const timestamp = localStorage.getItem(ROOMS_CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) {
      return null;
    }
    
    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();
    
    if (now - cacheTime > CACHE_EXPIRY_MS) {
      localStorage.removeItem(ROOMS_CACHE_KEY);
      localStorage.removeItem(ROOMS_CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cached rooms:', error);
    return null;
  }
}

/**
 * Save rooms list to cache
 */
export function saveRoomsToCache(rooms: Room[]): void {
  try {
    localStorage.setItem(ROOMS_CACHE_KEY, JSON.stringify(rooms));
    localStorage.setItem(ROOMS_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving rooms to cache:', error);
  }
}

/**
 * Get cached conversations list
 */
export function getCachedConversations(): any[] | null {
  try {
    const cached = localStorage.getItem(CONVERSATIONS_CACHE_KEY);
    const timestamp = localStorage.getItem(CONVERSATIONS_CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) {
      return null;
    }
    
    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();
    
    if (now - cacheTime > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CONVERSATIONS_CACHE_KEY);
      localStorage.removeItem(CONVERSATIONS_CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cached conversations:', error);
    return null;
  }
}

/**
 * Save conversations list to cache
 */
export function saveConversationsToCache(conversations: any[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_CACHE_KEY, JSON.stringify(conversations));
    localStorage.setItem(CONVERSATIONS_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving conversations to cache:', error);
  }
}

/**
 * Get cached contacts list
 */
export function getCachedContacts(): any[] | null {
  try {
    const cached = localStorage.getItem(CONTACTS_CACHE_KEY);
    const timestamp = localStorage.getItem(CONTACTS_CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) {
      return null;
    }
    
    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();
    
    if (now - cacheTime > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CONTACTS_CACHE_KEY);
      localStorage.removeItem(CONTACTS_CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cached contacts:', error);
    return null;
  }
}

/**
 * Save contacts list to cache
 */
export function saveContactsToCache(contacts: any[]): void {
  try {
    localStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(contacts));
    localStorage.setItem(CONTACTS_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving contacts to cache:', error);
  }
}

/**
 * Clear all list caches
 */
export function clearAllListCaches(): void {
  try {
    localStorage.removeItem(ROOMS_CACHE_KEY);
    localStorage.removeItem(ROOMS_CACHE_TIMESTAMP_KEY);
    localStorage.removeItem(CONVERSATIONS_CACHE_KEY);
    localStorage.removeItem(CONVERSATIONS_CACHE_TIMESTAMP_KEY);
    localStorage.removeItem(CONTACTS_CACHE_KEY);
    localStorage.removeItem(CONTACTS_CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Error clearing list caches:', error);
  }
}

