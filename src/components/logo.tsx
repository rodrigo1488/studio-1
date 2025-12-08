import { cn } from '@/lib/utils';
import { MessageSquareHeart } from 'lucide-react';
import Link from 'next/link';

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        'flex items-center gap-2 text-primary hover:text-primary/80 transition-colors',
        className
      )}
    >
      <MessageSquareHeart className="h-6 w-6" />
      <span className="font-headline text-lg font-semibold">FamilyChat</span>
    </Link>
  );
}
