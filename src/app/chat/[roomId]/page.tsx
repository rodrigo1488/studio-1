'use client';

import ChatLayout from './components/chat-layout';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import type { Room, Message, User } from '@/lib/data';
import { getCachedMessages, saveMessagesToCache } from '@/lib/storage/messages-cache';
import { markNotificationsAsRead } from '@/lib/storage/notifications';

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
        // Get current user
        const userResponse = await fetch('/api/auth/me');
        if (!userResponse.ok) {
          router.push('/login');
          return;
        }
        const userData = await userResponse.json();
        setCurrentUser(userData.user);

        // Get room
        const roomResponse = await fetch(`/api/rooms/${roomId}`);
        if (!roomResponse.ok) {
          router.push('/dashboard');
          return;
        }
        const roomData = await roomResponse.json();
        setRoom(roomData.room);

        // Get messages - only load last 8 initially
        const messagesResponse = await fetch(`/api/messages/${roomId}?limit=8`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          
          // Get unique sender IDs
          const senderIds = [...new Set(messagesData.messages.map((msg: Message) => msg.senderId))];
          
          // Fetch all users in batch
          let usersMap: Record<string, User> = {};
          if (senderIds.length > 0) {
            try {
              const usersResponse = await fetch('/api/users/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds: senderIds }),
              });
              if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                usersMap = usersData.users.reduce((acc: Record<string, User>, user: User) => {
                  acc[user.id] = user;
                  return acc;
                }, {});
              }
            } catch (error) {
              console.error('Error fetching users in batch:', error);
            }
          }
          
          // Map messages with users
          const messagesWithUsers = messagesData.messages.map((msg: Message) => ({
            ...msg,
            user: usersMap[msg.senderId],
          }));
          
          setMessages(messagesWithUsers);
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
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <ChatLayout room={room} messages={messages} currentUser={currentUser} />
    </div>
  );
}
