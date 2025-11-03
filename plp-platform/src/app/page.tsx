import { Button } from '@/components/ui/button';
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
            <p className="mx-auto max-w-3xl text-base text-gray-300 sm:text-lg md:text-xl leading-relaxed animate-in fade-in duration-700 delay-100">
              <span className="text-cyan-400">Prediction fusion</span> decides which ideas deserve tokens.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2 animate-in fade-in duration-700 delay-200">
            <Button asChild size="lg" className="text-base md:text-lg px-8 py-5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white hover:scale-105 transition-all duration-300">
              <Link href="/launchpad">Explore Markets</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base md:text-lg px-8 py-5 border-2 border-white/20 text-white hover:bg-white/10 hover:scale-105 transition-all duration-300">
              <Link href="/create">Launch Your Project</Link>
            </Button>
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
            <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border-cyan-400/30 text-white hover:scale-105 transition-all duration-300 ease-out relative">
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

            <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl border-blue-400/30 text-white hover:scale-105 transition-all duration-300 ease-out relative">
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

            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border-purple-400/30 text-white hover:scale-105 transition-all duration-300 ease-out relative">
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
          </div>

          {/* Quote */}
          <div className="max-w-4xl mx-auto pt-4">
            <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 backdrop-blur-xl border-cyan-400/20">
              <CardContent className="p-6 md:p-8 text-center">
                <p className="text-base md:text-lg text-gray-200 leading-relaxed">
                  <span className="text-cyan-400 font-semibold">"Prediction fusion"</span> combines the wisdom of crowds with capital markets.
                  P&L ensures <span className="text-green-400 font-semibold">great ideas win</span>, not just the loudest voices or deepest pockets.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-8 max-w-6xl mx-auto">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Why Choose P&L?</h2>
            <p className="text-gray-400 text-base md:text-lg">Built for the community, powered by Solana</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-300 ease-out group">
              <CardHeader>
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">✅</div>
                <CardTitle className="text-xl text-white">Community Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Projects are validated by the community through prediction markets before token launch.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:border-blue-400/30 transition-all duration-300 ease-out group">
              <CardHeader>
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">⚡</div>
                <CardTitle className="text-xl text-white">Automated Launch</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Successful projects automatically launch tokens on pump.fun with equal distribution to supporters.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:border-green-400/30 transition-all duration-300 ease-out group">
              <CardHeader>
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🎁</div>
                <CardTitle className="text-xl text-white">Fair Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  YES voters get token airdrops, NO voters get SOL rewards - everyone wins with accurate predictions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:border-purple-400/30 transition-all duration-300 ease-out group">
              <CardHeader>
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🔍</div>
                <CardTitle className="text-xl text-white">Transparent Process</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  All transactions and market resolutions are on-chain and verifiable.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:border-pink-400/30 transition-all duration-300 ease-out group">
              <CardHeader>
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">📱</div>
                <CardTitle className="text-xl text-white">Mobile Friendly</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Optimized for mobile devices with touch-friendly interface and responsive design.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:border-orange-400/30 transition-all duration-300 ease-out group">
              <CardHeader>
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🔒</div>
                <CardTitle className="text-xl text-white">Secure Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Built on Solana with custom smart contracts, ensuring security and reliability.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats - Platform Highlights */}
        <div className="space-y-8 max-w-6xl mx-auto">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Platform Highlights</h2>
            <p className="text-gray-400 text-base md:text-lg">Key metrics that make P&L accessible and fair</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border-cyan-400/30 text-white hover:scale-105 transition-all duration-300 ease-out">
              <CardHeader className="text-center py-6">
                <div className="text-4xl mb-3">💰</div>
                <CardTitle className="text-4xl md:text-5xl font-bold text-cyan-400 mb-2">0.01 SOL</CardTitle>
                <CardDescription className="text-white text-base md:text-lg font-semibold mb-2">Minimum Vote Amount</CardDescription>
                <p className="text-sm text-gray-300 leading-relaxed">Low barrier to entry for community participation - everyone can have a voice</p>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border-green-400/30 text-white hover:scale-105 transition-all duration-300 ease-out">
              <CardHeader className="text-center py-6">
                <div className="text-4xl mb-3">💸</div>
                <CardTitle className="text-4xl md:text-5xl font-bold text-green-400 mb-2">Trading Fees</CardTitle>
                <CardDescription className="text-white text-base md:text-lg font-semibold mb-2">Fund Development</CardDescription>
                <p className="text-sm text-gray-300 leading-relaxed">Pump.fun trading fees after launch provide resources for builders to deliver</p>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl border-blue-400/30 text-white hover:scale-105 transition-all duration-300 ease-out">
              <CardHeader className="text-center py-6">
                <div className="text-4xl mb-3">🎯</div>
                <CardTitle className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">100%</CardTitle>
                <CardDescription className="text-white text-base md:text-lg font-semibold mb-2">Fair Distribution</CardDescription>
                <p className="text-sm text-gray-300 leading-relaxed">All tokens airdropped to YES voters - no pre-sale, no insider allocation</p>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Final CTA */}
        <div className="max-w-4xl mx-auto text-center space-y-6 py-8 md:py-12">
          <div className="space-y-3">
            <h2 className="text-3xl md:text-5xl font-bold text-white">Ready to Launch Your Idea?</h2>
            <p className="text-lg md:text-xl text-gray-300">Join the community-driven future of token launches</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
            <Button asChild size="lg" className="text-lg px-10 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:scale-105 transition-all duration-300">
              <Link href="/create">Create Prediction Market</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-10 py-6 border-2 border-white/20 text-white hover:bg-white/10 hover:scale-105 transition-all duration-300">
              <Link href="/browse">Browse Projects</Link>
            </Button>
          </div>
        </div>
      </div>
  );
}