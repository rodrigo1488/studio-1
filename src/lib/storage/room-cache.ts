import type { Room, User } from '@/lib/data';

const ROOM_CACHE_PREFIX = 'chat_room_';
const USER_CACHE_PREFIX = 'chat_user_';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get cached room data
 */
export function getCachedRoom(roomId: string): Room | null {
  try {
    const cacheKey = `${ROOM_CACHE_PREFIX}${roomId}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const age = Date.now() - data.timestamp;
    
    if (age > CACHE_EXPIRY_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return data.room;
  } catch (error) {
    console.error('Error reading cached room:', error);
    return null;
  }
}

/**
 * Save room to cache
 */
export function saveRoomToCache(room: Room): void {
  try {
    const cacheKey = `${ROOM_CACHE_PREFIX}${room.id}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      room,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Error saving room to cache:', error);
  }
}

/**
 * Get cached user data
 */
export function getCachedUser(userId: string): User | null {
  try {
    const cacheKey = `${USER_CACHE_PREFIX}${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const age = Date.now() - data.timestamp;
    
    if (age > CACHE_EXPIRY_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return data.user;
  } catch (error) {
    console.error('Error reading cached user:', error);
    return null;
  }
}

/**
 * Save user to cache
 */
export function saveUserToCache(user: User): void {
  try {
    const cacheKey = `${USER_CACHE_PREFIX}${user.id}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      user,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Error saving user to cache:', error);
  }
}

/**
 * Save multiple users to cache
 */
export function saveUsersToCache(users: User[]): void {
  users.forEach(user => saveUserToCache(user));
}

/**
 * Get cached current user
 */
export function getCachedCurrentUser(): User | null {
  try {
    const cached = localStorage.getItem('chat_current_user');
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const age = Date.now() - data.timestamp;
    
    if (age > CACHE_EXPIRY_MS) {
      localStorage.removeItem('chat_current_user');
      return null;
    }
    
    return data.user;
  } catch (error) {
    console.error('Error reading cached current user:', error);
    return null;
  }
}

/**
 * Save current user to cache
 */
export function saveCurrentUserToCache(user: User): void {
  try {
    localStorage.setItem('chat_current_user', JSON.stringify({
      user,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Error saving current user to cache:', error);
  }
}

