import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-8 p-6 md:p-8">
        {/* Hero Section */}
        <div className="text-center space-y-5 py-4 md:py-8 max-w-6xl mx-auto">
          <div className="space-y-3">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl text-white leading-tight animate-in fade-in duration-700">
              Predict, Launch and <span className="text-green-500">Pump</span>
            </h1>
          </div>
        </div>

        {/* A New Way to Fund Ideas */}
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">A New Way to Fund Ideas</h2>
            <p className="text-gray-400 text-sm md:text-base lg:text-lg">Internet Capital Markets powered by prediction fusion</p>
          </div>

          {/* Main Value Prop */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-xl border-purple-400/30">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-5">
                <div className="text-center space-y-3">
                  <div className="text-5xl mb-2">🎯</div>
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-white">Let the Market Decide, Not VCs</h3>
                  <p className="text-base md:text-lg lg:text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto">
                    P&L isn&apos;t just another token launcher. It&apos;s a <span className="text-cyan-400 font-semibold">validation layer</span> that uses prediction markets to ensure only great ideas get funded.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">❌</div>
                      <div>
                        <h4 className="text-base md:text-lg font-semibold text-red-400 mb-1">Traditional Way</h4>
                        <p className="text-gray-400 text-xs md:text-sm">Launch token → Hope for community → Pray it works</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">✅</div>
                      <div>
                        <h4 className="text-base md:text-lg font-semibold text-green-400 mb-1">P&L Way</h4>
                        <p className="text-gray-400 text-xs md:text-sm">Validate idea → Build community → Launch only if proven</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works - Streamlined */}
          <div className="grid gap-6 md:grid-cols-3 pt-4">
            <Link href="/create" className="block">
              <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border-cyan-400/30 text-white hover:scale-105 transition-all duration-300 ease-out relative cursor-pointer">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xl font-bold shadow-lg shadow-cyan-500/50">
                    1
                  </div>
                  <CardTitle className="text-xl text-white">Prediction Market</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 text-sm">
                    Create a prediction market: "Will this idea succeed?" Community trades YES/NO shares, revealing true sentiment.
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/browse" className="block">
              <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl border-blue-400/30 text-white hover:scale-105 transition-all duration-300 ease-out relative cursor-pointer">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xl font-bold shadow-lg shadow-blue-500/50">
                    2
                  </div>
                  <CardTitle className="text-xl text-white">Wisdom of Crowd</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 text-sm">
                    Money talks. Real believers put SOL behind their conviction. Skeptics can profit by voting NO. Truth emerges.
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/launched" className="block">
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border-purple-400/30 text-white hover:scale-105 transition-all duration-300 ease-out relative cursor-pointer">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold shadow-lg shadow-purple-500/50">
                    3
                  </div>
                  <CardTitle className="text-xl text-white">Great Ideas Win</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 text-sm">
                    If YES wins, token launches on pump.fun with fair distribution. Community formed, funding secured, mission clear.
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>

        </div>



      </div>
  );
}