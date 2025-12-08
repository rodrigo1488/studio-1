import { PlaceHolderImages } from './placeholder-images';

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
};

export type Message = {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
};

export type Room = {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  lastMessage?: {
    text: string;
    timestamp: Date;
  };
};

const userAvatar1 = PlaceHolderImages.find((img) => img.id === 'user-avatar-1')?.imageUrl || '';
const userAvatar2 = PlaceHolderImages.find((img) => img.id === 'user-avatar-2')?.imageUrl || '';
const userAvatar3 = PlaceHolderImages.find((img) => img.id === 'user-avatar-3')?.imageUrl || '';
const userAvatar4 = PlaceHolderImages.find((img) => img.id === 'user-avatar-4')?.imageUrl || '';
const mediaPreview1 = PlaceHolderImages.find((img) => img.id === 'media-preview-1')?.imageUrl || '';

export const mockUsers: User[] = [
  { id: 'user-1', name: 'Maria Silva', email: 'maria@example.com', avatarUrl: userAvatar1 },
  { id: 'user-2', name: 'João Pereira', email: 'joao@example.com', avatarUrl: userAvatar2 },
  { id: 'user-3', name: 'Ana Costa', email: 'ana@example.com', avatarUrl: userAvatar3 },
  { id: 'user-4', name: 'Carlos Souza', email: 'carlos@example.com', avatarUrl: userAvatar4 },
];

export const mockRooms: Room[] = [
  {
    id: 'room-1',
    name: 'Família Silva',
    ownerId: 'user-1',
    members: ['user-1', 'user-2', 'user-3'],
    lastMessage: {
      text: 'Vamos fazer um churrasco no domingo?',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
  },
  {
    id: 'room-2',
    name: 'Férias na Praia',
    ownerId: 'user-2',
    members: ['user-1', 'user-2', 'user-4'],
    lastMessage: {
      text: 'Não se esqueçam do protetor solar!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
  },
  {
    id: 'room-3',
    name: 'Grupo dos Pais',
    ownerId: 'user-4',
    members: ['user-1', 'user-4'],
    lastMessage: {
      text: 'Reunião da escola amanhã.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  },
];

export const mockMessages: Message[] = [
  // Messages for Room 1
  {
    id: 'msg-1',
    roomId: 'room-1',
    senderId: 'user-2',
    text: 'Oi pessoal, tudo bem?',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
  },
  {
    id: 'msg-2',
    roomId: 'room-1',
    senderId: 'user-1',
    text: 'Tudo ótimo, João! E com você?',
    timestamp: new Date(Date.now() - 1000 * 60 * 9),
  },
  {
    id: 'msg-3',
    roomId: 'room-1',
    senderId: 'user-3',
    text: 'Estou ansiosa para o fim de semana!',
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    id: 'msg-4',
    roomId: 'room-1',
    senderId: 'user-1',
    text: 'Olha que foto linda que tiramos!',
    timestamp: new Date(Date.now() - 1000 * 60 * 7),
    mediaUrl: mediaPreview1,
    mediaType: 'image',
  },
  {
    id: 'msg-5',
    roomId: 'room-1',
    senderId: 'user-2',
    text: 'Vamos fazer um churrasco no domingo?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  // Messages for Room 2
  {
    id: 'msg-6',
    roomId: 'room-2',
    senderId: 'user-4',
    text: 'Tudo pronto para a viagem?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    id: 'msg-7',
    roomId: 'room-2',
    senderId: 'user-1',
    text: 'Sim! Malas prontas.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2.5),
  },
  {
    id: 'msg-8',
    roomId: 'room-2',
    senderId: 'user-2',
    text: 'Não se esqueçam do protetor solar!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
];

// Helper to get user by ID
export const getUserById = (id: string) => mockUsers.find((user) => user.id === id);

// Assume the current logged-in user is 'user-1'
export const getCurrentUser = () => mockUsers.find((user) => user.id === 'user-1');
