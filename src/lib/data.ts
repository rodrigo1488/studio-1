export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  nickname?: string;
  bio?: string;
};

export type Message = {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'gif';
  status?: 'sending' | 'sent' | 'error'; // Status de envio da mensagem
  replyToId?: string;
  replyTo?: Message & { user?: User };
  isEdited?: boolean;
  editedAt?: Date;
  expiresAt?: Date;
  threadId?: string;
  threadCount?: number;
  threadMessages?: Message[];
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

export type Story = {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: Date;
  expiresAt: Date;
  user?: User;
  viewCount?: number;
  isViewed?: boolean;
  reactionsCount?: number;
  userReaction?: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  isLoaded?: boolean;
};

export type StoryView = {
  id: string;
  storyId: string;
  viewerId: string;
  viewedAt: Date;
  viewer?: User;
};
