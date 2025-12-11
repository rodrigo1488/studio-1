'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { NotificationPopup } from './notification-popup';
import { NotificationCarousel } from './notification-carousel';
import { addNotification, getNotifications, markNotificationsAsRead } from '@/lib/storage/notifications';
import type { Message, User } from '@/lib/data';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedRoom } from '@/lib/storage/room-cache';
import { supabase } from '@/lib/supabase/client';
import { convertMessageToAppFormat } from '@/lib/supabase/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRooms, setUserRooms] = useState<string[]>([]);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const router = useRouter();

  // Buscar usuário atual e suas salas
  useEffect(() => {
    const fetchUserAndRooms = async () => {
      try {
        // Buscar usuário atual
        const userResponse = await fetch('/api/auth/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUserId(userData.user?.id || null);

          // Buscar salas do usuário (incluindo conversas diretas)
          if (userData.user?.id) {
            // Buscar salas de grupos
            const roomsResponse = await fetch('/api/rooms/list');
            let groupRoomIds: string[] = [];
            if (roomsResponse.ok) {
              const roomsData = await roomsResponse.json();
              groupRoomIds = (roomsData.rooms || []).map((r: any) => r.id);
            }

            // Buscar conversas diretas
            const conversationsResponse = await fetch('/api/direct-conversations/list');
            let directRoomIds: string[] = [];
            if (conversationsResponse.ok) {
              const conversationsData = await conversationsResponse.json();
              directRoomIds = (conversationsData.conversations || []).map((c: any) => c.roomId);
            }

            // Combinar todas as salas
            const allRoomIds = [...groupRoomIds, ...directRoomIds];
            setUserRooms(allRoomIds);
          }
        }
      } catch (error) {
        console.error('Error fetching user and rooms:', error);
      }
    };

    fetchUserAndRooms();
  }, []);

  // Escutar mensagens em tempo real de todas as salas do usuário
  useEffect(() => {
    if (!currentUserId || userRooms.length === 0) return;

    // Limpar canais anteriores
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Criar canais para cada sala
    userRooms.forEach((roomId) => {
      const channel = supabase
        .channel(`notifications:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            const newMessage = payload.new as any;
            
            // Verificar se a mensagem não é do próprio usuário
            if (newMessage.sender_id === currentUserId) {
              return;
            }

            // Verificar se estamos na sala atual
            const currentPath = window.location.pathname;
            const isInCurrentRoom = currentPath.includes(`/chat/${roomId}`);
            if (isInCurrentRoom) {
              return; // Não mostrar notificação se estiver na sala
            }

            // Buscar informações do remetente
            let senderData: User | null = getCachedUser(newMessage.sender_id);
            if (!senderData) {
              try {
                const response = await fetch(`/api/users/${newMessage.sender_id}`);
                if (response.ok) {
                  const data = await response.json();
                  senderData = data.user;
                }
              } catch (error) {
                console.error('Error fetching sender:', error);
              }
            }

            // Buscar informações da sala
            let roomName = 'Sala';
            const room = getCachedRoom(roomId);
            if (room) {
              roomName = room.name;
            } else {
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
              // Converter mensagem para formato do app
              const appMessage = convertMessageToAppFormat(newMessage, senderData);

              // Adicionar ao storage
              addNotification(roomId, appMessage);

              // Criar notificação
              const notification: NotificationItem = {
                roomId,
                roomName,
                sender: senderData,
                message: appMessage,
                timestamp: Date.now(),
              };

              // Mostrar popup
              setActiveNotification(notification);
            }
          }
        )
        .subscribe();

      channelsRef.current.push(channel);
    });

    return () => {
      // Limpar canais ao desmontar
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [currentUserId, userRooms]);

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

