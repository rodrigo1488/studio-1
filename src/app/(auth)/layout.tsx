import { Logo } from '@/components/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 left-4 md:top-6 md:left-6">
        <Logo />
      </div>
      <main className="w-full max-w-md">{children}</main>
    </div>
  );
}
