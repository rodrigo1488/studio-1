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

        // Always fetch from server to ensure we have the latest messages
        // Cache is only used as a fallback if server fails
        const messagesResponse = await fetch(`/api/messages/room/${roomId}?limit=50`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          
          // Ensure messages have proper Date objects for timestamps
          const normalizedMessages = messagesData.messages.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
          }));
          
          // Get unique sender IDs for new messages
          const senderIds = [...new Set(normalizedMessages.map((msg: Message) => msg.senderId))];
          
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
          
          // Map messages with users, remove duplicates, and sort by timestamp
          const messagesWithUsers = normalizedMessages
            .map((msg: Message) => ({
              ...msg,
              senderId: msg.senderId, // SEMPRE usar o senderId do servidor
              user: usersMap[msg.senderId],
            }))
            .filter((msg, index, self) => 
              index === self.findIndex(m => m.id === msg.id)
            )
            .sort((a, b) => {
              const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
              const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
              return timeA - timeB;
            });
          
          // Save to cache (already sorted)
          saveMessagesToCache(roomId, messagesWithUsers);
          
          setMessages(messagesWithUsers);
        } else {
          // If server fails, try to use cache as fallback
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
            
            // Map cached messages with users and ensure proper Date objects
            const cachedWithUsers = cachedData.messages
              .map((msg: Message) => ({
                ...msg,
                timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
                senderId: msg.senderId || currentUserData.id,
                user: usersMap[msg.senderId] || (msg.senderId === currentUserData.id ? currentUserData : undefined),
              }))
              .sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                return timeA - timeB;
              });
            
            setMessages(cachedWithUsers);
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
