export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  nickname?: string;
};

export type Message = {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  status?: 'sending' | 'sent' | 'error'; // Status de envio da mensagem
};

export type Room = {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  code?: string;
  lastMessage?: {
    text: string;
    timestamp: Date;
  };
};
