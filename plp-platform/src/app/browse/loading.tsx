import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function BrowseLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-10 w-48 bg-white/10 rounded animate-pulse"></div>
        <div className="h-6 w-96 bg-white/5 rounded animate-pulse"></div>
      </div>

      {/* Filters Skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-24 bg-white/10 rounded animate-pulse"></div>
        ))}
      </div>

      {/* Market Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="bg-white/5 backdrop-blur-xl border-white/10 animate-pulse">
            <CardHeader>
              <div className="space-y-3">
                {/* Image skeleton */}
                <div className="h-48 bg-white/10 rounded-lg"></div>
                {/* Title skeleton */}
                <div className="h-6 bg-white/10 rounded w-3/4"></div>
                {/* Description skeleton */}
                <div className="h-4 bg-white/5 rounded w-full"></div>
                <div className="h-4 bg-white/5 rounded w-2/3"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Stats skeleton */}
                <div className="flex justify-between">
                  <div className="h-4 bg-white/10 rounded w-20"></div>
                  <div className="h-4 bg-white/10 rounded w-20"></div>
                </div>
                {/* Progress bar skeleton */}
                <div className="h-2 bg-white/10 rounded w-full"></div>
                {/* Buttons skeleton */}
                <div className="flex gap-2">
                  <div className="h-10 bg-white/10 rounded flex-1"></div>
                  <div className="h-10 bg-white/10 rounded flex-1"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
