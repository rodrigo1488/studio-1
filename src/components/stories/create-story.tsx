'use client';

import { useState, useRef } from 'react';
import { Camera, Video, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CameraCapture } from '@/components/media/camera-capture';

interface CreateStoryProps {
  open: boolean;
  onClose: () => void;
  onStoryCreated?: () => void;
}

export function CreateStory({ open, onClose, onStoryCreated }: CreateStoryProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setMediaType('image');
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else if (file.type.startsWith('video/')) {
      setMediaType('video');
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Por favor, selecione uma imagem ou vídeo',
        variant: 'destructive',
      });
    }
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setMediaType('image');
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else if (file.type.startsWith('video/')) {
      setMediaType('video');
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: 'Selecione uma mídia',
        description: 'Por favor, selecione uma imagem ou vídeo para criar sua story',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mediaType', mediaType);

      const response = await fetch('/api/stories/create', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar story');
      }

      toast({
        title: 'Story criada!',
        description: 'Sua story foi publicada com sucesso e expira em 24 horas.',
      });

      // Reset form
      setSelectedFile(null);
      setPreview(null);
      if (preview) {
        URL.revokeObjectURL(preview);
      }

      onStoryCreated?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar story',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setSelectedFile(null);
    setPreview(null);
    setShowCamera(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Story</DialogTitle>
            <DialogDescription>
              Compartilhe um momento que expira em 24 horas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!preview ? (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setMediaType('image');
                      fileInputRef.current?.click();
                    }}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Foto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setMediaType('video');
                      fileInputRef.current?.click();
                    }}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Vídeo
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCamera(true)}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Tirar Foto/Vídeo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 z-10"
                  onClick={() => {
                    if (preview) {
                      URL.revokeObjectURL(preview);
                    }
                    setPreview(null);
                    setSelectedFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                {mediaType === 'image' ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-64 w-full rounded-lg object-cover"
                  />
                ) : (
                  <video
                    src={preview}
                    className="h-64 w-full rounded-lg object-cover"
                    controls
                  />
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedFile || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  'Publicar Story'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showCamera && (
        <CameraCapture
          open={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
        />
      )}
    </>
  );
}

