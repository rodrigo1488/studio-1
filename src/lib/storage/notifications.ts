import type { Message } from '@/lib/data';

const NOTIFICATIONS_KEY = 'chat_notifications';
const UNREAD_COUNTS_KEY = 'chat_unread_counts';

export type NotificationType = 'message' | 'post' | 'story' | 'post_like' | 'mention';

export interface NotificationData {
  type: NotificationType;
  roomId?: string; // Only for message notifications
  message?: Message; // Only for message notifications
  postId?: string; // For post, post_like and mention notifications
  storyId?: string; // Only for story notifications
  userId: string; // User who triggered the notification (author, liker, mentioner)
  userName?: string;
  userAvatar?: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  likeId?: string; // Only for post_like notifications
  mentionId?: string; // Only for mention notifications
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

    // Add new notification (mantemos histórico; leituras são controladas por `read`)
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

    notifications.push(newNotification);

    // Keep only last 100 notifications
    const limited = notifications.slice(-100);

    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(limited));
    
    // Dispatch event for UI updates (sino, listas, badges, etc.)
    window.dispatchEvent(new CustomEvent('notificationAdded', { detail: newNotification }));
    // Notificar listeners de contagem de não lidas
    window.dispatchEvent(
      new CustomEvent('unreadCountUpdated', {
        detail: { roomId, count: getUnreadCount(roomId) },
      })
    );
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
 * Add a post like notification
 */
export function addPostLikeNotification(
  likeId: string,
  postId: string,
  userId: string,
  userName: string,
  userAvatar: string | undefined,
  title: string,
  body: string
): void {
  try {
    const notifications = getNotifications();
    
    // Remove old notifications for this like (idempotência)
    const filtered = notifications.filter(
      (n) => n.likeId !== likeId || n.type !== 'post_like'
    );
    
    const newNotification: NotificationData = {
      type: 'post_like',
      postId,
      likeId,
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
    console.error('Error adding post like notification:', error);
  }
}

/**
 * Add a mention notification
 */
export function addMentionNotification(
  mentionId: string,
  postId: string,
  userId: string,
  userName: string,
  userAvatar: string | undefined,
  title: string,
  body: string
): void {
  try {
    const notifications = getNotifications();
    
    // Remove old notifications for this mention (idempotência)
    const filtered = notifications.filter(
      (n) => n.mentionId !== mentionId || n.type !== 'mention'
    );
    
    const newNotification: NotificationData = {
      type: 'mention',
      postId,
      mentionId,
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
    console.error('Error adding mention notification:', error);
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
    const updated = notifications.map((n) => {
      if (type === 'message' && n.roomId === id) {
        return { ...n, read: true };
      }
      if ((type === 'post' || type === 'post_like' || type === 'mention') && n.postId === id) {
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
    return notifications.filter((n) => !n.read).length;
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
    const notifications = getNotifications();
    return notifications.filter(
      (n) => n.type === 'message' && n.roomId === roomId && !n.read
    ).length;
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
    const notifications = getNotifications();
    const counts: Record<string, number> = {};

    notifications.forEach((n) => {
      if (n.type === 'message' && n.roomId && !n.read) {
        counts[n.roomId] = (counts[n.roomId] || 0) + 1;
      }
    });

    return counts;
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
    // Mantido apenas para compatibilidade; contagem agora é derivada de `chat_notifications`
    const count = getUnreadCount(roomId);
    window.dispatchEvent(
      new CustomEvent('unreadCountUpdated', {
        detail: { roomId, count },
      })
    );
  } catch (error) {
    console.error('Error updating unread count:', error);
  }
}

/**
 * Clear unread count for a room
 */
function clearUnreadCount(roomId: string): void {
  try {
    // Dispatch custom event for UI updates
    window.dispatchEvent(
      new CustomEvent('unreadCountUpdated', {
        detail: { roomId, count: 0 },
      })
    );
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

