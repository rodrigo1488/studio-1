'use client';

import ChatLayout from './components/chat-layout';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import type { Room, Message, User } from '@/lib/data';
import { getCachedMessages, saveMessagesToCache } from '@/lib/storage/messages-cache';
import { markNotificationsAsRead } from '@/lib/storage/notifications';
import { 
  getCachedRoom, 
  saveRoomToCache, 
  getCachedCurrentUser, 
  saveCurrentUserToCache,
  getCachedUser,
  saveUsersToCache
} from '@/lib/storage/room-cache';

export default function ChatPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<(Message & { user?: User })[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Try to get current user from cache first
        let currentUserData = getCachedCurrentUser();
        if (!currentUserData) {
          const userResponse = await fetch('/api/auth/me');
          if (!userResponse.ok) {
            router.push('/login');
            return;
          }
          const userData = await userResponse.json();
          currentUserData = userData.user;
          saveCurrentUserToCache(currentUserData);
        }
        setCurrentUser(currentUserData);

        // Try to get room from cache first
        let roomData = getCachedRoom(roomId);
        if (!roomData) {
          const roomResponse = await fetch(`/api/rooms/${roomId}`);
          if (!roomResponse.ok) {
            router.push('/dashboard');
            return;
          }
          const responseData = await roomResponse.json();
          roomData = responseData.room;
          saveRoomToCache(roomData);
        }
        setRoom(roomData);

        // Try to load from cache first for instant display
        const cachedData = getCachedMessages(roomId);
        if (cachedData && cachedData.messages.length > 0) {
          // Get unique sender IDs from cache
          const senderIds = [...new Set(cachedData.messages.map((msg: Message) => msg.senderId))];
          
          // Try to get users from cache first
          let usersMap: Record<string, User> = {};
          senderIds.forEach(id => {
            const cachedUser = getCachedUser(id);
            if (cachedUser) {
              usersMap[id] = cachedUser;
            }
          });
          
          // Only fetch missing users
          const missingUserIds = senderIds.filter(id => !usersMap[id]);
          if (missingUserIds.length > 0) {
            try {
              const usersResponse = await fetch('/api/users/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds: missingUserIds }),
              });
              if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                usersData.users.forEach((user: User) => {
                  usersMap[user.id] = user;
                });
                saveUsersToCache(usersData.users);
              }
            } catch (error) {
              console.error('Error fetching users in batch:', error);
            }
          }
          
          // Map cached messages with users
          // VALIDAÇÃO: Garantir que o senderId do cache é válido
          const cachedWithUsers = cachedData.messages.map((msg: Message) => ({
            ...msg,
            // Garantir que o senderId existe e é válido
            senderId: msg.senderId || currentUserData.id, // Fallback para segurança
            user: usersMap[msg.senderId] || (msg.senderId === currentUserData.id ? currentUserData : undefined),
          }));
          
          setMessages(cachedWithUsers);
          setIsLoading(false); // Show cached messages immediately
          
          // Only fetch from server if cache is stale or doesn't exist
          if (cachedData.isStale) {
            // Fetch in background without blocking
            fetch(`/api/messages/room/${roomId}?limit=8`)
              .then(response => response.json())
              .then(messagesData => {
                if (messagesData.messages) {
                  // Get unique sender IDs for new messages
                  const newSenderIds = [...new Set(messagesData.messages.map((msg: Message) => msg.senderId))];
                  
                  // Get users from cache first
                  const newUsersMap: Record<string, User> = {};
                  newSenderIds.forEach(id => {
                    const cachedUser = getCachedUser(id);
                    if (cachedUser) {
                      newUsersMap[id] = cachedUser;
                    }
                  });
                  
                  // Only fetch missing users
                  const missingIds = newSenderIds.filter(id => !newUsersMap[id]);
                  if (missingIds.length > 0) {
                    return fetch('/api/users/batch', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userIds: missingIds }),
                    })
                      .then(usersResponse => usersResponse.json())
                      .then(usersData => {
                        usersData.users.forEach((user: User) => {
                          newUsersMap[user.id] = user;
                        });
                        saveUsersToCache(usersData.users);
                        return { messagesData, usersMap: newUsersMap };
                      });
                  }
                  return { messagesData, usersMap: newUsersMap };
                }
                return null;
              })
              .then((result) => {
                if (result) {
                  const { messagesData, usersMap } = result;
                  // Map messages with users
                  const messagesWithUsers = messagesData.messages.map((msg: Message) => ({
                    ...msg,
                    user: usersMap[msg.senderId],
                  }));
                  
                  // Save to cache
                  saveMessagesToCache(roomId, messagesWithUsers);
                  
                  // Update messages (merge with cache, keeping latest, removing duplicates)
                  setMessages((prev) => {
                    const messageMap = new Map<string, Message & { user?: User }>();
                    // Add existing messages first
                    prev.forEach(msg => {
                      if (!messageMap.has(msg.id)) {
                        messageMap.set(msg.id, msg);
                      }
                    });
                    // Add/update with server messages
                    messagesWithUsers.forEach(msg => {
                      if (!messageMap.has(msg.id)) {
                        messageMap.set(msg.id, msg);
                      }
                    });
                    // Return sorted by timestamp, ensuring unique IDs
                    const uniqueMessages = Array.from(messageMap.values());
                    return uniqueMessages.sort((a, b) => 
                      a.timestamp.getTime() - b.timestamp.getTime()
                    );
                  });
                }
              })
              .catch(error => {
                console.error('Error refreshing messages:', error);
              });
          }
        } else {
          // No cache, fetch from server
          const messagesResponse = await fetch(`/api/messages/room/${roomId}?limit=8`);
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            
            // Get unique sender IDs for new messages
            const senderIds = [...new Set(messagesData.messages.map((msg: Message) => msg.senderId))];
            
            // Try cache first
            let usersMap: Record<string, User> = {};
            senderIds.forEach(id => {
              const cachedUser = getCachedUser(id);
              if (cachedUser) {
                usersMap[id] = cachedUser;
              }
            });
            
            // Only fetch missing users
            const missingUserIds = senderIds.filter(id => !usersMap[id]);
            if (missingUserIds.length > 0) {
              try {
                const usersResponse = await fetch('/api/users/batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userIds: missingUserIds }),
                });
                if (usersResponse.ok) {
                  const usersData = await usersResponse.json();
                  usersData.users.forEach((user: User) => {
                    usersMap[user.id] = user;
                  });
                  saveUsersToCache(usersData.users);
                }
              } catch (error) {
                console.error('Error fetching users in batch:', error);
              }
            }
            
                  // Map messages with users and remove duplicates
                  // VALIDAÇÃO: Garantir que o senderId vem do servidor, nunca do cache
                  const messagesWithUsers = messagesData.messages
                    .map((msg: Message) => ({
                      ...msg,
                      // Garantir que o senderId é o do servidor (não pode ser alterado)
                      senderId: msg.senderId, // Já vem do servidor, mas garantimos que não foi alterado
                      user: usersMap[msg.senderId],
                    }))
                    .filter((msg, index, self) => 
                      index === self.findIndex(m => m.id === msg.id)
                    );
            
            // Save to cache
            saveMessagesToCache(roomId, messagesWithUsers);
            
            setMessages(messagesWithUsers);
          }
        }
      } catch (error) {
        console.error('Error loading chat data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [roomId, router]);

  if (isLoading || !room || !currentUser) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem-3rem)] flex-col">
      <ChatLayout room={room} messages={messages} currentUser={currentUser} />
    </div>
  );
}
