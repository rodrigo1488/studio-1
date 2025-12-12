import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function PostCardSkeleton() {
  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24 sm:h-4 sm:w-32" />
              <Skeleton className="h-2 w-16 sm:h-3 sm:w-20" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Skeleton className="aspect-square sm:aspect-video w-full" />
        <div className="p-2 sm:p-4 space-y-2">
          <div className="flex items-center gap-3 sm:gap-4">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded" />
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded" />
          </div>
          <Skeleton className="h-3 w-20 sm:h-4 sm:w-24" />
          <Skeleton className="h-3 w-full sm:h-4" />
          <Skeleton className="h-3 w-3/4 sm:h-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PostGridSkeleton() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-md sm:rounded-lg">
      <Skeleton className="h-full w-full" />
    </div>
  );
}

