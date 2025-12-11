'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getInitials, cn } from '@/lib/utils';
import type { Message, User } from '@/lib/data';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface NotificationCarouselProps {
  notifications: Array<{
    roomId: string;
    roomName: string;
    sender: User;
    message: Message;
  }>;
  onClose: () => void;
  onNotificationClick: (roomId: string) => void;
}

export function NotificationCarousel({
  notifications,
  onClose,
  onNotificationClick,
}: NotificationCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setIsVisible(true);
    }
  }, [notifications.length]);

  useEffect(() => {
    if (notifications.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notifications.length);
    }, 4000); // Muda a cada 4 segundos

    return () => clearInterval(interval);
  }, [notifications.length]);

  if (notifications.length === 0 || !isVisible) {
    return null;
  }

  const currentNotification = notifications[currentIndex];
  
  const getMessagePreview = (msg: Message) => {
    if (msg.text) return msg.text;
    if (msg.mediaType === 'image') return '📷 Imagem';
    if (msg.mediaType === 'video') return '🎥 Vídeo';
    if (msg.mediaType === 'audio') return '🎵 Áudio';
    return 'Mensagem';
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + notifications.length) % notifications.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % notifications.length);
  };

  const handleClick = () => {
    onNotificationClick(currentNotification.roomId);
    onClose();
  };

  return (
    <Dialog open={isVisible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0">
        <Card className="border-0 shadow-none">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Mensagens recebidas</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {notifications.map((notification, index) => (
                  <div
                    key={`${notification.roomId}-${notification.message.id}`}
                    className="min-w-full px-1"
                  >
                    <Card
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={handleClick}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarImage src={notification.sender.avatarUrl} />
                          <AvatarFallback>
                            {getInitials(notification.sender.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm truncate">
                              {notification.sender.name}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 truncate">
                            {notification.roomName}
                          </p>
                          <p className="text-sm text-foreground line-clamp-3 mb-2">
                            {(() => {
                              const msg = notification.message;
                              if (msg.text) return msg.text;
                              if (msg.mediaType === 'image') return '📷 Imagem';
                              if (msg.mediaType === 'video') return '🎥 Vídeo';
                              if (msg.mediaType === 'audio') return '🎵 Áudio';
                              return 'Mensagem';
                            })()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(notification.message.timestamp, {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>

              {notifications.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 h-8 w-8 rounded-full bg-background shadow-md"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 h-8 w-8 rounded-full bg-background shadow-md"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {notifications.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                {notifications.map((_, index) => (
                  <button
                    key={index}
                    className={cn(
                      'h-2 rounded-full transition-all',
                      index === currentIndex
                        ? 'w-8 bg-primary'
                        : 'w-2 bg-muted-foreground/30'
                    )}
                    onClick={() => setCurrentIndex(index)}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                {currentIndex + 1} de {notifications.length}
              </p>
            </div>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

