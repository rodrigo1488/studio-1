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
  avatarUrl?: string;
  lastMessage?: {
    text: string;
    timestamp: Date;
  };
};

export type PostMedia = {
  id: string;
  postId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  orderIndex: number;
  createdAt: Date;
};

export type PostMention = {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
  user?: User;
};

export type Post = {
  id: string;
  userId: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  media: PostMedia[];
  user?: User;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  mentions?: PostMention[];
};

export type PostLike = {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
  user?: User;
};

export type PostComment = {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
};

export type ContactRequest = {
  id: string;
  requesterId: string;
  requestedId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  requester?: User;
  requested?: User;
};
