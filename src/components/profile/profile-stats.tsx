'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Heart, MessageCircle, Users, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileStatsProps {
  userId: string;
}

interface Stats {
  postsCount: number;
  likesReceived: number;
  commentsReceived: number;
  followersCount: number;
  followingCount: number;
}

export function ProfileStats({ userId }: ProfileStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/profile/${userId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-3 sm:p-4">
              <Skeleton className="h-8 w-8 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    {
      label: 'Posts',
      value: stats.postsCount,
      icon: FileText,
      color: 'text-blue-500',
    },
    {
      label: 'Curtidas',
      value: stats.likesReceived,
      icon: Heart,
      color: 'text-red-500',
    },
    {
      label: 'Comentários',
      value: stats.commentsReceived,
      icon: MessageCircle,
      color: 'text-green-500',
    },
    {
      label: 'Seguidores',
      value: stats.followersCount,
      icon: Users,
      color: 'text-purple-500',
    },
    {
      label: 'Seguindo',
      value: stats.followingCount,
      icon: UserPlus,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 text-center">
              <Icon className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 ${item.color}`} />
              <p className="text-lg sm:text-2xl font-bold">{item.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

