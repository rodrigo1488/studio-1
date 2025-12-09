import type { Message } from '@/lib/data';

const NOTIFICATIONS_KEY = 'chat_notifications';
const UNREAD_COUNTS_KEY = 'chat_unread_counts';

export interface NotificationData {
  roomId: string;
  message: Message;
  timestamp: number;
  read: boolean;
}

export interface UnreadCount {
  roomId: string;
  count: number;
  lastMessageTime: number;
}

/**
 * Get all notifications
 */
export function getNotifications(): NotificationData[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading notifications:', error);
    return [];
  }
}

/**
 * Add a notification
 */
export function addNotification(roomId: string, message: Message): void {
  try {
    const notifications = getNotifications();
    
    // Remove old notifications for this room
    const filtered = notifications.filter(n => n.roomId !== roomId);
    
    // Add new notification
    const newNotification: NotificationData = {
      roomId,
      message,
      timestamp: Date.now(),
      read: false,
    };
    
    filtered.push(newNotification);
    
    // Keep only last 100 notifications
    const limited = filtered.slice(-100);
    
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(limited));
    updateUnreadCount(roomId);
  } catch (error) {
    console.error('Error adding notification:', error);
  }
}

/**
 * Mark notifications as read for a room
 */
export function markNotificationsAsRead(roomId: string): void {
  try {
    const notifications = getNotifications();
    const updated = notifications.map(n => 
      n.roomId === roomId ? { ...n, read: true } : n
    );
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    clearUnreadCount(roomId);
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}

/**
 * Get unread count for a room
 */
export function getUnreadCount(roomId: string): number {
  try {
    const stored = localStorage.getItem(UNREAD_COUNTS_KEY);
    if (!stored) return 0;
    
    const counts: UnreadCount[] = JSON.parse(stored);
    const roomCount = counts.find(c => c.roomId === roomId);
    return roomCount?.count || 0;
  } catch (error) {
    console.error('Error reading unread count:', error);
    return 0;
  }
}

/**
 * Get all unread counts
 */
export function getAllUnreadCounts(): Record<string, number> {
  try {
    const stored = localStorage.getItem(UNREAD_COUNTS_KEY);
    if (!stored) return {};
    
    const counts: UnreadCount[] = JSON.parse(stored);
    return counts.reduce((acc, count) => {
      acc[count.roomId] = count.count;
      return acc;
    }, {} as Record<string, number>);
  } catch (error) {
    console.error('Error reading unread counts:', error);
    return {};
  }
}

/**
 * Update unread count for a room
 */
function updateUnreadCount(roomId: string): void {
  try {
    const stored = localStorage.getItem(UNREAD_COUNTS_KEY);
    const counts: UnreadCount[] = stored ? JSON.parse(stored) : [];
    
    const existingIndex = counts.findIndex(c => c.roomId === roomId);
    const newCount: UnreadCount = {
      roomId,
      count: (counts[existingIndex]?.count || 0) + 1,
      lastMessageTime: Date.now(),
    };
    
    if (existingIndex >= 0) {
      counts[existingIndex] = newCount;
    } else {
      counts.push(newCount);
    }
    
    localStorage.setItem(UNREAD_COUNTS_KEY, JSON.stringify(counts));
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('unreadCountUpdated', { 
      detail: { roomId, count: newCount.count } 
    }));
  } catch (error) {
    console.error('Error updating unread count:', error);
  }
}

/**
 * Clear unread count for a room
 */
function clearUnreadCount(roomId: string): void {
  try {
    const stored = localStorage.getItem(UNREAD_COUNTS_KEY);
    if (!stored) return;
    
    const counts: UnreadCount[] = JSON.parse(stored);
    const filtered = counts.filter(c => c.roomId !== roomId);
    localStorage.setItem(UNREAD_COUNTS_KEY, JSON.stringify(filtered));
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('unreadCountUpdated', { 
      detail: { roomId, count: 0 } 
    }));
  } catch (error) {
    console.error('Error clearing unread count:', error);
  }
}

/**
 * Increment unread count (for when user is not in the room)
 */
export function incrementUnreadCount(roomId: string): void {
  updateUnreadCount(roomId);
}

