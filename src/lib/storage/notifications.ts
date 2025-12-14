import type { Message } from '@/lib/data';

const NOTIFICATIONS_KEY = 'chat_notifications';
const UNREAD_COUNTS_KEY = 'chat_unread_counts';

export type NotificationType = 'message' | 'post' | 'story';

export interface NotificationData {
  type: NotificationType;
  roomId?: string; // Only for messages
  message?: Message; // Only for messages
  postId?: string; // Only for posts
  storyId?: string; // Only for stories
  userId: string; // User who created the post/story
  userName?: string;
  userAvatar?: string;
  title: string;
  body: string;
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
 * Add a notification (message)
 */
export function addNotification(roomId: string, message: Message): void {
  try {
    const notifications = getNotifications();
    
    // Remove old notifications for this room
    const filtered = notifications.filter(n => n.roomId !== roomId || n.type !== 'message');
    
    // Add new notification
    const newNotification: NotificationData = {
      type: 'message',
      roomId,
      message,
      userId: message.senderId,
      title: 'Nova mensagem',
      body: message.text || (message.mediaType ? '📷 Mídia' : 'Nova mensagem'),
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
 * Add a post notification
 */
export function addPostNotification(
  postId: string,
  userId: string,
  userName: string,
  userAvatar: string | undefined,
  title: string,
  body: string
): void {
  try {
    const notifications = getNotifications();
    
    // Remove old notifications for this post
    const filtered = notifications.filter(n => n.postId !== postId || n.type !== 'post');
    
    // Add new notification
    const newNotification: NotificationData = {
      type: 'post',
      postId,
      userId,
      userName,
      userAvatar,
      title,
      body,
      timestamp: Date.now(),
      read: false,
    };
    
    filtered.push(newNotification);
    
    // Keep only last 100 notifications
    const limited = filtered.slice(-100);
    
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(limited));
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('notificationAdded', { detail: newNotification }));
  } catch (error) {
    console.error('Error adding post notification:', error);
  }
}

/**
 * Add a story notification
 */
export function addStoryNotification(
  storyId: string,
  userId: string,
  userName: string,
  userAvatar: string | undefined,
  title: string,
  body: string
): void {
  try {
    const notifications = getNotifications();
    
    // Remove old notifications for this story
    const filtered = notifications.filter(n => n.storyId !== storyId || n.type !== 'story');
    
    // Add new notification
    const newNotification: NotificationData = {
      type: 'story',
      storyId,
      userId,
      userName,
      userAvatar,
      title,
      body,
      timestamp: Date.now(),
      read: false,
    };
    
    filtered.push(newNotification);
    
    // Keep only last 100 notifications
    const limited = filtered.slice(-100);
    
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(limited));
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('notificationAdded', { detail: newNotification }));
  } catch (error) {
    console.error('Error adding story notification:', error);
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
 * Mark a notification as read by ID
 */
export function markNotificationAsReadById(id: string, type: NotificationType): void {
  try {
    const notifications = getNotifications();
    const updated = notifications.map(n => {
      if (type === 'message' && n.roomId === id) {
        return { ...n, read: true };
      }
      if (type === 'post' && n.postId === id) {
        return { ...n, read: true };
      }
      if (type === 'story' && n.storyId === id) {
        return { ...n, read: true };
      }
      return n;
    });
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

/**
 * Get unread notifications count
 */
export function getUnreadNotificationsCount(): number {
  try {
    const notifications = getNotifications();
    return notifications.filter(n => !n.read).length;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
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

