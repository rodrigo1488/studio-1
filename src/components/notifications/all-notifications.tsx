'use client';

import { useState, useEffect } from 'react';
import { Bell, MessageSquare, Image as ImageIcon, Video, Heart, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getInitials } from '@/lib/utils';
import { getNotifications, markNotificationAsReadById, getUnreadNotificationsCount } from '@/lib/storage/notifications';
import type { NotificationData } from '@/lib/storage/notifications';
import { useRouter } from 'next/navigation';

export function AllNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    loadNotifications();
    updateUnreadCount();

    // Listen for new notifications
    const handleNotificationAdded = () => {
      loadNotifications();
      updateUnreadCount();
    };

    window.addEventListener('notificationAdded', handleNotificationAdded);

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      loadNotifications();
      updateUnreadCount();
    }, 5000);

    return () => {
      window.removeEventListener('notificationAdded', handleNotificationAdded);
      clearInterval(interval);
    };
  }, []);

  const loadNotifications = () => {
    const allNotifications = getNotifications();
    // Sort by timestamp (newest first)
    const sorted = allNotifications.sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(sorted);
  };

  const updateUnreadCount = () => {
    const count = getUnreadNotificationsCount();
    setUnreadCount(count);
  };

  const handleNotificationClick = (notification: NotificationData) => {
    // Mark as read
    markNotificationAsReadById(
      notification.type === 'message'
        ? notification.roomId || ''
        : notification.type === 'story'
        ? notification.storyId || ''
        : // post, post_like e mention navegam para o mesmo post
          notification.postId || '',
      notification.type
    );

    // Navigate
    if (notification.type === 'message' && notification.roomId) {
      router.push(`/chat/${notification.roomId}`);
    } else if (
      (notification.type === 'post' ||
        notification.type === 'post_like' ||
        notification.type === 'mention') &&
      notification.postId
    ) {
      router.push(`/feed?postId=${notification.postId}`);
    } else if (notification.type === 'story' && notification.storyId) {
      router.push('/feed');
    }

    setIsOpen(false);
    loadNotifications();
    updateUnreadCount();
  };

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'post':
        return <ImageIcon className="h-4 w-4" />;
      case 'post_like':
        return <Heart className="h-4 w-4" />;
      case 'mention':
        return <AtSign className="h-4 w-4" />;
      case 'story':
        return <Video className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const hasUnread = unreadNotifications.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96" align="end">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {notifications.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {notifications.map((notification, index) => {
                const isUnread = !notification.read;
                return (
                  <button
                    key={`${notification.type}-${notification.postId || notification.storyId || notification.roomId || index}`}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border bg-card text-left transition-colors hover:bg-accent ${
                      isUnread ? 'border-primary/50 bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {notification.userAvatar ? (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={notification.userAvatar} />
                          <AvatarFallback>
                            {getInitials(notification.userName || 'U')}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium text-sm ${isUnread ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </p>
                        {isUnread && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.timestamp), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

