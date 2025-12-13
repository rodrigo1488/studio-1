/**
 * Clear all application cache from localStorage
 * This should be called on logout to prevent data leakage between users
 */

const CACHE_PREFIXES = [
  'chat_messages_',
  'chat_messages_timestamp_',
  'chat_rooms',
  'chat_rooms_timestamp',
  'chat_conversations',
  'chat_conversations_timestamp',
  'chat_contacts',
  'chat_contacts_timestamp',
  'chat_current_user',
  'chat_notifications',
  'chat_unread_counts',
  'app_closed_time',
];

/**
 * Clear all cached data
 */
export function clearAllCache(): void {
  try {
    // Clear all known cache keys
    CACHE_PREFIXES.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear all user-specific cache (format: user_${userId})
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('user_')) {
        localStorage.removeItem(key);
      }
    });

    // Clear all room-specific cache (format: room_${roomId})
    keys.forEach(key => {
      if (key.startsWith('room_')) {
        localStorage.removeItem(key);
      }
    });

    // Clear all message cache (format: messages_${roomId})
    keys.forEach(key => {
      if (key.startsWith('messages_') || key.startsWith('chat_messages_')) {
        localStorage.removeItem(key);
      }
    });

    console.log('[Cache] All cache cleared');
  } catch (error) {
    console.error('[Cache] Error clearing cache:', error);
  }
}

/**
 * Clear only user-specific cache (keeps messages, rooms, etc.)
 */
export function clearUserCache(): void {
  try {
    localStorage.removeItem('chat_current_user');
    
    // Clear user-specific cache
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('user_')) {
        localStorage.removeItem(key);
      }
    });

    console.log('[Cache] User cache cleared');
  } catch (error) {
    console.error('[Cache] Error clearing user cache:', error);
  }
}

