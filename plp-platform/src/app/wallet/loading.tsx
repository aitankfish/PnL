import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function WalletLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-10 w-48 bg-white/10 rounded animate-pulse"></div>
        <div className="h-6 w-96 bg-white/5 rounded animate-pulse"></div>
      </div>

      {/* Wallet Overview Skeleton */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10 animate-pulse">
        <CardHeader>
          <div className="h-8 w-40 bg-white/10 rounded"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-12 w-64 bg-white/10 rounded"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-white/10 rounded"></div>
                <div className="h-8 w-32 bg-white/10 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-40 bg-white/10 rounded animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white/5 backdrop-blur-xl border-white/10 animate-pulse">
              <CardHeader>
                <div className="h-6 bg-white/10 rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-white/5 rounded w-full"></div>
                <div className="h-4 bg-white/5 rounded w-2/3"></div>
                <div className="h-10 bg-white/10 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
