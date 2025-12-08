import { mockRooms, mockMessages, getUserById, getCurrentUser } from '@/lib/data';
import ChatLayout from './components/chat-layout';
import { notFound } from 'next/navigation';

export default function ChatPage({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const room = mockRooms.find((r) => r.id === roomId);
  const currentUser = getCurrentUser();

  if (!room || !currentUser) {
    return notFound();
  }

  const messages = mockMessages
    .filter((m) => m.roomId === roomId)
    .map((message) => ({
      ...message,
      user: getUserById(message.senderId),
    }))
    // Ensure user is defined before rendering
    .filter(m => m.user);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
       <ChatLayout room={room} messages={messages} currentUser={currentUser} />
    </div>
  );
}
