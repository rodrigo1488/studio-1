import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function ConversationSkeleton() {
  return (
    <Card className="p-2 sm:p-3 md:p-4">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Skeleton className="h-3 w-32 sm:h-4 sm:w-40 md:h-4 md:w-48" />
            <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 rounded-full shrink-0" />
          </div>
          <Skeleton className="h-2.5 w-full sm:h-3 sm:w-3/4" />
          <Skeleton className="h-2 w-16 sm:h-2.5 sm:w-20" />
        </div>
      </div>
    </Card>
  );
}

