import type { Metadata } from 'next';
import { Fredoka } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/providers/theme-provider';
import { NotificationProvider } from '@/components/notifications/notification-provider';
import { PushNotificationSetup } from '@/components/push-notifications/push-notification-setup';
import { cn } from '@/lib/utils';

const fredoka = Fredoka({ 
  subsets: ['latin'], 
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'FamilyChat: Secure Connect',
  description:
    'Converse com seus filhos de forma segura. Sem exposição. Sem ruído. Só vocês.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased flex flex-col',
          fredoka.variable
        )}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex-1">
            {children}
          </div>
          <footer className="w-full py-3 px-4 text-center text-xs sm:text-sm text-muted-foreground border-t border-primary/20 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
            <p className="font-medium">
              Feito com ❤️ de <span className="text-primary font-semibold">Rodrigo Gomes</span> para <span className="text-secondary font-semibold">Laura Vitoria</span>
            </p>
          </footer>
          <Toaster />
          <NotificationProvider />
          <div className="fixed bottom-4 right-4 z-50">
            <PushNotificationSetup />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
