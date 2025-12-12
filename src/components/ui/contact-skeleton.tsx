import { Skeleton } from '@/components/ui/skeleton';

export function ContactSkeleton() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl border-2">
      <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3 w-24 sm:h-4 sm:w-32 md:h-4 md:w-40" />
        <Skeleton className="h-2 w-16 sm:h-3 sm:w-24" />
      </div>
      <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded shrink-0" />
    </div>
  );
}

