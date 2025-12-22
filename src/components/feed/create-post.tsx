'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Image as ImageIcon, Loader2, Upload, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { MentionSelector } from './mention-selector';
import type { User } from '@/lib/data';

interface CreatePostProps {
  open: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export function CreatePost({ open, onClose, onPostCreated }: CreatePostProps) {
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const maxDescriptionLength = 500;

  useEffect(() => {
    if (open) {
      fetchCurrentUser();
    }
  }, [open]);

  // Handle browser back button and mobile back button
  useEffect(() => {
    if (!open) return;

    // Push state to history when dialog opens
    const state = { dialogOpen: true, timestamp: Date.now() };
    window.history.pushState(state, '');

    const handlePopState = () => {
      // When user clicks back button, close the dialog
      if (open) {
        handleClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [open]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.user?.id || '');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      } else {
        toast({
          title: 'Tipo de arquivo inválido',
          description: `${file.name} não é uma imagem válida.`,
          variant: 'destructive',
        });
      }
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'Selecione pelo menos uma imagem',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload files first
      const uploadedMedia: Array<{ url: string; type: 'image' | 'video'; orderIndex: number }> = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Get signed upload URL
        const uploadUrlResponse = await fetch('/api/feed/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fileType: file.type,
          }),
        });

        if (!uploadUrlResponse.ok) {
          throw new Error(`Failed to get upload URL for ${file.name}`);
        }

        const { signedUrl, publicUrl } = await uploadUrlResponse.json();

        // Upload file to signed URL
        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        uploadedMedia.push({
          url: publicUrl,
          type: 'image', // We only support images for now in this UI
          orderIndex: i,
        });
      }

      // 2. Create post with media URLs
      const payload = {
        description: description.trim(),
        mentionedUserIds: selectedUsers.map(u => u.id),
        media: uploadedMedia,
      };

      const response = await fetch('/api/feed/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Safe error parsing to avoid crashing on non-JSON response (like 403 Forbidden text)
        let errorMessage = 'Erro ao criar post';
        let errorDetails = '';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
          errorDetails = data.details ? `\n\nDetalhes: ${data.details}` : '';
        } catch (e) {
          // If JSON parse fails, read text
          const text = await response.text();
          if (text) errorMessage = `Erro do servidor: ${text.slice(0, 100)}`;
        }
        throw new Error(errorMessage + errorDetails);
      }

      const data = await response.json();

      // Convert ISO strings back to Date objects
      if (data.post) {
        const postWithDates = {
          ...data.post,
          createdAt: new Date(data.post.createdAt),
          updatedAt: new Date(data.post.updatedAt),
          media: (data.post.media || []).map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          })),
        };
      }

      toast({
        title: 'Post criado!',
        description: 'Seu post foi publicado com sucesso.',
      });

      // Reset form
      setDescription('');
      setSelectedFiles([]);
      setSelectedUsers([]);
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
      onPostCreated();
      onClose();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        title: 'Erro ao criar post',
        description: error.message || 'Ocorreu um erro ao criar o post.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setDescription('');
    setSelectedFiles([]);
    setSelectedUsers([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const fakeEvent = {
        target: { files },
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose} modal={true}>
      <DialogContent
        className="max-w-3xl max-h-[95vh] h-[100vh] sm:h-auto w-full sm:w-auto m-0 sm:m-auto rounded-none sm:rounded-xl p-0 sm:p-0 overflow-hidden"
        onInteractOutside={(e) => {
          // Allow Popover interactions inside Dialog
          const target = e.target as HTMLElement;
          const isPopover = target.closest('[data-radix-popover-content]') ||
            target.closest('[data-radix-popper-content-wrapper]') ||
            target.closest('.mention-selector-content');
          if (isPopover) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          // Allow Popover interactions inside Dialog
          const target = e.target as HTMLElement;
          const isPopover = target.closest('[data-radix-popover-content]') ||
            target.closest('[data-radix-popper-content-wrapper]') ||
            target.closest('.mention-selector-content');
          if (isPopover) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Nova Publicação
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                Compartilhe seus momentos com a família
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 sm:h-9 sm:w-9"
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row h-[calc(100vh-80px)] sm:h-auto max-h-[calc(95vh-80px)] sm:max-h-[70vh]">
          {/* Área de Upload e Preview - Lado Esquerdo */}
          <div className={cn(
            "flex-1 p-4 sm:p-6 border-b sm:border-b-0 sm:border-r bg-muted/30",
            previews.length === 0 && "flex items-center justify-center min-h-[200px] sm:min-h-[400px]"
          )}>
            {previews.length === 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 p-8 transition-colors cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={cn(
                  "rounded-full p-4 sm:p-6 transition-all",
                  isDragging ? "bg-primary/10 scale-110" : "bg-muted"
                )}>
                  <Upload className={cn(
                    "h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm sm:text-base md:text-lg font-semibold">
                    {isDragging ? 'Solte as imagens aqui' : 'Arraste imagens ou clique para selecionar'}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Suporte para múltiplas imagens
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4 h-full overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-border shadow-md">
                      <Image
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 sm:h-9 sm:w-9 bg-destructive/90 hover:bg-destructive text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        aria-label="Remover imagem"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <div className="absolute bottom-2 left-2 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Imagem {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Adicionar mais imagens
                </Button>
              </div>
            )}
          </div>

          {/* Área de Conteúdo - Lado Direito */}
          <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto min-w-0">
            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Legenda
              </label>
              <Textarea
                placeholder="O que você está pensando? Compartilhe com a família..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] sm:min-h-[150px] resize-none text-sm sm:text-base"
                maxLength={maxDescriptionLength}
              />
              <div className="flex justify-end">
                <span className={cn(
                  "text-xs",
                  description.length > maxDescriptionLength * 0.9
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}>
                  {description.length}/{maxDescriptionLength}
                </span>
              </div>
            </div>

            {/* Mention Selector */}
            {currentUserId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Marcar pessoas</label>
                <MentionSelector
                  selectedUsers={selectedUsers}
                  onUsersChange={setSelectedUsers}
                  currentUserId={currentUserId}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t mt-auto">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedFiles.length === 0}
                className="flex-1 sm:flex-none"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Publicar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

