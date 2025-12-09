import { cn } from '@/lib/utils';
import { MessageSquareHeart } from 'lucide-react';
import Link from 'next/link';

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        'flex items-center gap-2 transition-all duration-200 hover:scale-105',
        className
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] via-[#EC4899] to-[#10B981] text-white shadow-md">
        <MessageSquareHeart className="h-5 w-5" />
      </div>
      <span className="font-headline text-lg font-semibold bg-gradient-to-r from-[#3B82F6] via-[#EC4899] to-[#10B981] bg-clip-text text-transparent">
        FamilyChat
      </span>
    </Link>
  );
}
