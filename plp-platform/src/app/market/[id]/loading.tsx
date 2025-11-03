import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function MarketDetailsLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back Button Skeleton */}
      <div className="h-10 w-32 bg-white/10 rounded animate-pulse"></div>

      {/* Hero Section Skeleton */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10 animate-pulse">
        <CardContent className="p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Project Image */}
            <div className="space-y-4">
              <div className="h-64 bg-white/10 rounded-lg"></div>
              <div className="h-6 bg-white/10 rounded w-3/4"></div>
              <div className="h-4 bg-white/5 rounded w-full"></div>
              <div className="h-4 bg-white/5 rounded w-5/6"></div>
            </div>

            {/* Right: Market Info */}
            <div className="space-y-6">
              <div className="h-10 bg-white/10 rounded w-2/3"></div>
              <div className="space-y-3">
                <div className="h-4 bg-white/5 rounded w-full"></div>
                <div className="h-4 bg-white/5 rounded w-4/5"></div>
                <div className="h-4 bg-white/5 rounded w-3/4"></div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-white/10 rounded w-20"></div>
                    <div className="h-6 bg-white/10 rounded w-24"></div>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-2 bg-white/10 rounded w-full"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-white/5 rounded w-16"></div>
                  <div className="h-4 bg-white/5 rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voting Section Skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 animate-pulse">
          <CardHeader>
            <div className="h-8 bg-white/10 rounded w-48"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-12 bg-white/10 rounded w-full"></div>
            <div className="h-12 bg-white/10 rounded w-full"></div>
            <div className="h-12 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded"></div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 animate-pulse">
          <CardHeader>
            <div className="h-8 bg-white/10 rounded w-48"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-12 bg-white/10 rounded w-full"></div>
            <div className="h-12 bg-white/10 rounded w-full"></div>
            <div className="h-12 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded"></div>
          </CardContent>
        </Card>
      </div>

      {/* Market Stats Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white/5 backdrop-blur-xl border-white/10 animate-pulse">
            <CardHeader>
              <div className="h-6 bg-white/10 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-10 bg-white/10 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trading Activity Skeleton */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10 animate-pulse">
        <CardHeader>
          <div className="h-8 bg-white/10 rounded w-48"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-white/10 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded w-32"></div>
                  <div className="h-3 bg-white/5 rounded w-24"></div>
                </div>
              </div>
              <div className="h-6 bg-white/10 rounded w-20"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
