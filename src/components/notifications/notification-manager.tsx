'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { NotificationPopup } from './notification-popup';
import { NotificationCarousel } from './notification-carousel';
import { addNotification, getNotifications, markNotificationsAsRead, addPostNotification, addStoryNotification } from '@/lib/storage/notifications';
import type { Message, User } from '@/lib/data';
import { useRouter } from 'next/navigation';
import { getCachedUser, getCachedRoom } from '@/lib/storage/room-cache';
import { supabase } from '@/lib/supabase/client';
import { convertMessageToAppFormat } from '@/lib/supabase/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { vibrate, isVibrationSupported } from '@/lib/utils/vibration';

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
              // A API retorna objetos com 'id', não 'roomId'
              // O 'id' da conversa direta é usado como room_id na tabela messages
              directRoomIds = (conversationsData.conversations || []).map((c: any) => c.id);
              console.log('[Notifications] Direct conversations found:', directRoomIds);
            }

            // Combinar todas as salas
            const allRoomIds = [...groupRoomIds, ...directRoomIds];
            console.log('[Notifications] All room IDs to subscribe:', {
              groups: groupRoomIds.length,
              direct: directRoomIds.length,
              total: allRoomIds.length,
              ids: allRoomIds
            });
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
      let channel;
      try {
        const channelName = `notifications:${roomId}`;
        console.log(`[Notifications] Creating channel for room: ${roomId} (${channelName})`);
        
        // Usar UUID formatado corretamente no filtro
        const filter = `room_id=eq.${roomId}`;
        console.log(`[Notifications] Filter: ${filter}`);
        
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: filter,
            },
            async (payload) => {
            const newMessage = payload.new as any;
            console.log(`[Notifications] New message received for room ${roomId}:`, {
              messageId: newMessage.id,
              senderId: newMessage.sender_id,
              currentUserId,
              roomId: newMessage.room_id
            });
            
            // Verificar se a mensagem não é do próprio usuário
            if (newMessage.sender_id === currentUserId) {
              console.log(`[Notifications] Ignoring own message from ${currentUserId}`);
              return;
            }

            // Verificar se estamos na sala atual (comparação exata)
            const currentPath = window.location.pathname;
            const isInCurrentRoom = currentPath === `/chat/${roomId}`;
            if (isInCurrentRoom) {
              console.log(`[Notifications] User is in current room ${roomId}, skipping notification`);
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

            // Buscar informações da sala ou conversa direta
            let roomName = 'Sala';
            const room = getCachedRoom(roomId);
            if (room) {
              roomName = room.name;
              console.log(`[Notifications] Room found in cache: ${roomName}`);
            } else {
              // Verificar se é uma conversa direta (tenta buscar o outro usuário primeiro)
              try {
                console.log(`[Notifications] Room not in cache, checking if DM: ${roomId}`);
                const otherUserResponse = await fetch(`/api/direct-conversations/${roomId}/other-user`);
                if (otherUserResponse.ok) {
                  const otherUserData = await otherUserResponse.json();
                  if (otherUserData.user) {
                    roomName = otherUserData.user.name || 'Conversa';
                    console.log(`[Notifications] DM found, other user: ${roomName}`);
                  }
                } else {
                  // Se não for conversa direta, tentar buscar como sala de grupo
                  console.log(`[Notifications] Not a DM, checking as group room: ${roomId}`);
                  const response = await fetch(`/api/rooms/${roomId}`);
                  if (response.ok) {
                    const data = await response.json();
                    roomName = data.room?.name || 'Sala';
                    console.log(`[Notifications] Group room found: ${roomName}`);
                  } else {
                    console.warn(`[Notifications] Room not found: ${roomId}`);
                    // Fallback: usar nome do remetente se disponível
                    if (senderData) {
                      roomName = senderData.name;
                    }
                  }
                }
              } catch (error) {
                console.error(`[Notifications] Error fetching room/conversation info for ${roomId}:`, error);
                // Fallback: usar nome do remetente se disponível
                if (senderData) {
                  roomName = senderData.name;
                }
              }
            }

            // Validar dados antes de criar notificação
            if (!senderData) {
              console.warn(`[Notifications] Sender data not available for message from ${newMessage.sender_id}`);
              return;
            }

            try {
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

              console.log(`[Notifications] Showing notification for room ${roomId} (${roomName}) from ${senderData.name}`);
              
              // Mostrar popup
              setActiveNotification(notification);
            } catch (error) {
              console.error(`[Notifications] Error processing notification for room ${roomId}:`, error);
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Notifications] ✅ Successfully subscribed to room: ${roomId}`);
            if (channel) {
              channelsRef.current.push(channel);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error(`[Notifications] ❌ Error subscribing to room ${roomId}:`, status, err);
          } else {
            console.warn(`[Notifications] ⚠️ Channel status for room ${roomId}: ${status}`, err);
          }
        });
      } catch (error) {
        console.error(`[Notifications] Error creating channel for room ${roomId}:`, error);
      }
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

  // Escutar novos posts em tempo real
  useEffect(() => {
    if (!currentUserId) return;

    // Subscribe to posts table changes
    const channel = supabase
      .channel('notifications:posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        async (payload) => {
          const newPost = payload.new as any;
          
          // Não notificar se for o próprio post do usuário
          if (newPost.user_id === currentUserId) {
            return;
          }

          // Verificar se o usuário segue o autor do post
          try {
            const followResponse = await fetch(`/api/follow/${newPost.user_id}`);
            if (followResponse.ok) {
              const followData = await followResponse.json();
              if (!followData.following) {
                return; // Não notificar se não seguir
              }
            }
          } catch (error) {
            console.error('[Notifications] Error checking follow status:', error);
          }

          // Buscar dados do autor
          try {
            const userResponse = await fetch(`/api/users/${newPost.user_id}`);
            if (userResponse.ok) {
              const userData = await userResponse.json();
              const author = userData.user;

              if (author) {
                const title = `${author.name} publicou um novo post`;
                const body = newPost.description || (newPost.media && newPost.media.length > 0 ? '📷 Nova publicação' : 'Nova publicação');

                // Adicionar notificação
                addPostNotification(
                  newPost.id,
                  author.id,
                  author.name,
                  author.avatarUrl,
                  title,
                  body
                );

                console.log(`[Notifications] New post from ${author.name}`);
              }
            }
          } catch (error) {
            console.error('[Notifications] Error fetching post author:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Notifications] ✅ Subscribed to posts');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Escutar novas stories em tempo real
  useEffect(() => {
    if (!currentUserId) return;

    // Subscribe to stories table changes
    const channel = supabase
      .channel('notifications:stories')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stories',
        },
        async (payload) => {
          const newStory = payload.new as any;
          
          // Não notificar se for a própria story do usuário
          if (newStory.user_id === currentUserId) {
            return;
          }

          // Verificar se o usuário segue o autor da story
          try {
            const followResponse = await fetch(`/api/follow/${newStory.user_id}`);
            if (followResponse.ok) {
              const followData = await followResponse.json();
              if (!followData.following) {
                return; // Não notificar se não seguir
              }
            }
          } catch (error) {
            console.error('[Notifications] Error checking follow status:', error);
          }

          // Buscar dados do autor
          try {
            const userResponse = await fetch(`/api/users/${newStory.user_id}`);
            if (userResponse.ok) {
              const userData = await userResponse.json();
              const author = userData.user;

              if (author) {
                const title = `${author.name} publicou uma nova story`;
                const body = newStory.media_type === 'image' ? '📷 Nova story' : '🎥 Nova story';

                // Adicionar notificação
                addStoryNotification(
                  newStory.id,
                  author.id,
                  author.name,
                  author.avatarUrl,
                  title,
                  body
                );

                console.log(`[Notifications] New story from ${author.name}`);
              }
            }
          } catch (error) {
            console.error('[Notifications] Error fetching story author:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Notifications] ✅ Subscribed to stories');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Listener para reações em stories
  useEffect(() => {
    const handleStoryReaction = async (event: CustomEvent) => {
      const { storyId, storyUserId, reactionType, userId } = event.detail;

      // Não notificar se for a própria reação do usuário
      if (userId === currentUserId) return;

      // Não notificar se for a própria story do usuário
      if (storyUserId === currentUserId) {
        // Buscar dados do usuário que reagiu
        try {
          const userResponse = await fetch(`/api/users/${userId}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            // Criar notificação visual (pode ser um toast ou badge)
            console.log(`[Notifications] ${userData.name} reagiu à sua story com ${reactionType}`);
            // Aqui você pode adicionar um toast ou atualizar um contador de notificações
          }
        } catch (error) {
          console.error('[Notifications] Error fetching user data for story reaction:', error);
        }
      }
    };

    const handler = handleStoryReaction as unknown as EventListener;
    window.addEventListener('storyReaction', handler);

    return () => {
      window.removeEventListener('storyReaction', handler);
    };
  }, [currentUserId]);

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

        // Vibrate when showing in-app notification (if supported)
        if (isVibrationSupported()) {
          vibrate([200, 100, 200]); // Double vibration pattern
        }

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

  // Listen for service worker messages to play notification sound and vibrate
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAY_NOTIFICATION_SOUND') {
        const soundUrl = event.data.soundUrl || '/notification-sound.mp3';
        
        // Play sound
        try {
          const audio = new Audio(soundUrl);
          audio.volume = 0.7; // Set volume to 70%
          audio.play().catch((error) => {
            console.warn('[Notifications] Could not play notification sound:', error);
          });
        } catch (error) {
          console.warn('[Notifications] Error creating audio element:', error);
        }

        // Vibrate if requested and supported
        if (event.data.vibrate && isVibrationSupported()) {
          const vibrationPattern = event.data.vibrationPattern || [200, 100, 200];
          vibrate(vibrationPattern);
          console.log('[Notifications] Vibration triggered');
        }
      }
    };

    // Listen for messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      });

      // Also listen directly (in case service worker is already ready)
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
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

