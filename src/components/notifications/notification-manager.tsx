'use client';

import { useEffect, useState, useCallback } from 'react';
import { NotificationPopup } from './notification-popup';
import { NotificationCarousel } from './notification-carousel';
import { addNotification, getNotifications, markNotificationsAsRead } from '@/lib/storage/notifications';
import type { Message, User } from '@/lib/data';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedRoom } from '@/lib/storage/room-cache';

interface NotificationItem {
  roomId: string;
  roomName: string;
  sender: User;
  message: Message;
  timestamp: number;
}

const APP_CLOSED_KEY = 'app_last_closed_time';

export function NotificationManager() {
  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);
  const [pendingNotifications, setPendingNotifications] = useState<NotificationItem[]>([]);
  const [showCarousel, setShowCarousel] = useState(false);
  const router = useRouter();

  // Detectar quando o app foi fechado e reaberto
  useEffect(() => {
    const lastClosedTime = localStorage.getItem(APP_CLOSED_KEY);
    const now = Date.now();

    // Se não há timestamp ou passou mais de 1 minuto desde o fechamento
    if (!lastClosedTime || now - parseInt(lastClosedTime) > 60000) {
      // Buscar notificações não lidas desde a última vez que o app foi fechado
      const allNotifications = getNotifications();
      const unreadNotifications = allNotifications.filter((n) => !n.read);

      if (unreadNotifications.length > 0) {
        // Buscar informações das salas e remetentes
        Promise.all(
          unreadNotifications.map(async (notif) => {
            const room = getCachedRoom(notif.roomId);
            const sender = getCachedUser(notif.message.senderId);

            // Se não temos cache, buscar do servidor
            let roomName = room?.name || 'Sala';
            let senderData = sender;

            if (!sender) {
              try {
                const response = await fetch(`/api/users/${notif.message.senderId}`);
                if (response.ok) {
                  const data = await response.json();
                  senderData = data.user;
                }
              } catch (error) {
                console.error('Error fetching sender:', error);
              }
            }

            if (!room) {
              try {
                const response = await fetch(`/api/rooms/${notif.roomId}`);
                if (response.ok) {
                  const data = await response.json();
                  roomName = data.room?.name || 'Sala';
                }
              } catch (error) {
                console.error('Error fetching room:', error);
              }
            }

            if (senderData) {
              return {
                roomId: notif.roomId,
                roomName,
                sender: senderData,
                message: notif.message,
                timestamp: notif.timestamp,
              };
            }
            return null;
          })
        ).then((notifications) => {
          const validNotifications = notifications.filter(
            (n): n is NotificationItem => n !== null
          );
          if (validNotifications.length > 0) {
            setPendingNotifications(validNotifications);
            setShowCarousel(true);
          }
        });
      }
    }

    // Salvar timestamp quando o app é fechado
    const handleBeforeUnload = () => {
      localStorage.setItem(APP_CLOSED_KEY, Date.now().toString());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        localStorage.setItem(APP_CLOSED_KEY, Date.now().toString());
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Listener para novas mensagens em tempo real
  useEffect(() => {
    const handleNewMessage = async (event: CustomEvent) => {
      const { roomId, message, currentRoomId } = event.detail;

      // Não mostrar notificação se estiver na mesma sala
      if (roomId === currentRoomId) {
        return;
      }

      // Buscar informações da sala e remetente
      const room = getCachedRoom(roomId);
      const sender = getCachedUser(message.senderId);

      let roomName = room?.name || 'Sala';
      let senderData = sender;

      if (!sender) {
        try {
          const response = await fetch(`/api/users/${message.senderId}`);
          if (response.ok) {
            const data = await response.json();
            senderData = data.user;
          }
        } catch (error) {
          console.error('Error fetching sender:', error);
        }
      }

      if (!room) {
        try {
          const response = await fetch(`/api/rooms/${roomId}`);
          if (response.ok) {
            const data = await response.json();
            roomName = data.room?.name || 'Sala';
          }
        } catch (error) {
          console.error('Error fetching room:', error);
        }
      }

      if (senderData) {
        const notification: NotificationItem = {
          roomId,
          roomName,
          sender: senderData,
          message,
          timestamp: Date.now(),
        };

        // Adicionar ao storage
        addNotification(roomId, message);

        // Mostrar popup se o app está aberto
        setActiveNotification(notification);
      }
    };

    const handler = handleNewMessage as unknown as EventListener;
    window.addEventListener('newMessageNotification', handler);

    return () => {
      window.removeEventListener('newMessageNotification', handler);
    };
  }, []);

  const handleNotificationClick = useCallback(
    (roomId: string) => {
      markNotificationsAsRead(roomId);
      router.push(`/chat/${roomId}`);
    },
    [router]
  );

  const handleCarouselClose = useCallback(() => {
    setShowCarousel(false);
    // Marcar todas as notificações como lidas
    pendingNotifications.forEach((notif) => {
      markNotificationsAsRead(notif.roomId);
    });
    setPendingNotifications([]);
  }, [pendingNotifications]);

  return (
    <>
      {activeNotification && (
        <NotificationPopup
          roomId={activeNotification.roomId}
          roomName={activeNotification.roomName}
          sender={activeNotification.sender}
          message={activeNotification.message}
          onClose={() => setActiveNotification(null)}
          onClick={() => handleNotificationClick(activeNotification.roomId)}
        />
      )}

      {showCarousel && pendingNotifications.length > 0 && (
        <NotificationCarousel
          notifications={pendingNotifications}
          onClose={handleCarouselClose}
          onNotificationClick={handleNotificationClick}
        />
      )}
    </>
  );
}

