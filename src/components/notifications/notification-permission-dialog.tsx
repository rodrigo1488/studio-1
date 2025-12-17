"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  isPushNotificationSupported,
  getNotificationPermission,
  getPushSubscription,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPushNotifications,
} from "@/lib/push-notifications";
import { useToast } from "@/hooks/use-toast";

export function NotificationPermissionDialog() {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Executa apenas no cliente
    if (typeof window === "undefined") return;

    // Verificar suporte a push notifications
    if (!isPushNotificationSupported()) return;

    // Não ficar exibindo para sempre se o usuário já recusou
    const dismissed = window.localStorage.getItem("notifications_permission_prompt_dismissed");
    if (dismissed === "true") return;

    const permission = getNotificationPermission();
    if (permission === "granted") {
      // Já permitido, nada a fazer
      return;
    }

    // Verificar se já existe subscription ativa; se sim, não precisa mostrar
    getPushSubscription()
      .then((sub) => {
        if (!sub) {
          setOpen(true);
        }
      })
      .catch(() => {
        // Em caso de erro ao checar, mostrar o prompt uma vez
        setOpen(true);
      });
  }, []);

  const handleEnable = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const permission = await requestNotificationPermission();

      if (permission !== "granted") {
        // Usuário negou ou fechou o prompt do navegador
        window.localStorage.setItem("notifications_permission_prompt_dismissed", "true");
        setOpen(false);
        return;
      }

      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error("Falha ao registrar Service Worker para notificações");
      }

      const vapidResponse = await fetch("/api/push/vapid-key", {
        credentials: "include",
      });
      if (!vapidResponse.ok) {
        throw new Error("Falha ao obter chave VAPID");
      }
      const { publicKey } = await vapidResponse.json();
      if (!publicKey) {
        throw new Error("Chave VAPID não disponível");
      }

      const subscription = await subscribeToPushNotifications(publicKey);
      if (!subscription) {
        throw new Error("Falha ao inscrever-se em notificações push");
      }

      const registerResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(subscription),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}));
        const code = (errorData as any).code;
        if (code === "TABLE_NOT_FOUND") {
          throw new Error(
            "Tabela de notificações não encontrada. Por favor, execute a migration no Supabase Dashboard."
          );
        }
        throw new Error(
          (errorData as any).error ||
            (errorData as any).details ||
            "Falha ao registrar subscription no servidor"
        );
      }

      window.localStorage.setItem("notifications_permission_prompt_dismissed", "true");
      setOpen(false);

      toast({
        title: "Notificações ativadas!",
        description: "Você receberá alertas em tempo real de novas mensagens, curtidas e menções.",
      });
    } catch (error: any) {
      console.error("[Notifications] Error enabling notifications:", error);
      toast({
        title: "Erro ao ativar notificações",
        description: error?.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });

      // Mesmo em caso de erro, não ficar importunando o usuário toda vez
      if (typeof window !== "undefined") {
        window.localStorage.setItem("notifications_permission_prompt_dismissed", "true");
      }
      setOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLater = () => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("notifications_permission_prompt_dismissed", "true");
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Ativar notificações?
          </DialogTitle>
          <DialogDescription>
            Ative as notificações para receber avisos imediatos de novas mensagens, curtidas, menções e stories.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={handleEnable} disabled={isProcessing} className="w-full">
            {isProcessing ? "Ativando..." : "Ativar notificações"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleLater}
            disabled={isProcessing}
            className="w-full text-muted-foreground"
          >
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
