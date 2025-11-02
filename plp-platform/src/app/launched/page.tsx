'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  ExternalLink,
  Star,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';

// Mock data for launched projects
const launchedProjects = [
  {
    id: 1,
    name: "Solana DeFi Hub",
    symbol: "SDF",
    launchDate: "2024-01-15",
    price: "$0.024",
    change: "+156%",
    volume: "2.4M",
    marketCap: "$1.2M",
    category: "DeFi",
    description: "Revolutionary DeFi protocol for automated yield farming",
    status: "success",
    totalVotes: 89,
    yesVotes: 67,
    noVotes: 22,
    launchPool: "4.5 SOL",
    tokenAddress: "SoLdEf...1234",
    website: "https://solanadefi.com",
    socialLinks: {
      twitter: "https://twitter.com/solanadefi",
      telegram: "https://t.me/solanadefi"
    }
  },
  {
    id: 2,
    name: "MetaVerse NFT",
    symbol: "MVN",
    launchDate: "2024-01-12",
    price: "$0.089",
    change: "+89%",
    volume: "1.8M",
    marketCap: "$890K",
    category: "NFT",
    description: "Cross-chain NFT marketplace with unique features",
    status: "success",
    totalVotes: 78,
    yesVotes: 56,
    noVotes: 22,
    launchPool: "4.5 SOL",
    tokenAddress: "MeTaVe...5678",
    website: "https://metaversenft.io",
    socialLinks: {
      twitter: "https://twitter.com/metaversenft",
      discord: "https://discord.gg/metaversenft"
    }
  },
  {
    id: 3,
    name: "GameFi Token",
    symbol: "GFT",
    launchDate: "2024-01-10",
    price: "$0.156",
    change: "+234%",
    volume: "3.2M",
    marketCap: "$2.1M",
    category: "Gaming",
    description: "Play-to-earn gaming ecosystem with unique mechanics",
    status: "success",
    totalVotes: 95,
    yesVotes: 78,
    noVotes: 17,
    launchPool: "4.5 SOL",
    tokenAddress: "GaMeFi...9012",
    website: "https://gamefi.io",
    socialLinks: {
      twitter: "https://twitter.com/gamefi",
      telegram: "https://t.me/gamefi"
    }
  },
  {
    id: 4,
    name: "AI Trading Bot",
    symbol: "AIT",
    launchDate: "2024-01-08",
    price: "$0.067",
    change: "+67%",
    volume: "1.1M",
    marketCap: "$670K",
    category: "AI/ML",
    description: "AI-powered trading bot for cryptocurrency markets",
    status: "success",
    totalVotes: 72,
    yesVotes: 45,
    noVotes: 27,
    launchPool: "4.5 SOL",
    tokenAddress: "AiTrAd...3456",
    website: "https://aitrading.com",
    socialLinks: {
      twitter: "https://twitter.com/aitrading",
      discord: "https://discord.gg/aitrading"
    }
  },
  {
    id: 5,
    name: "Web3 Social",
    symbol: "W3S",
    launchDate: "2024-01-05",
    price: "$0.134",
    change: "+134%",
    volume: "2.8M",
    marketCap: "$1.8M",
    category: "Social",
    description: "Decentralized social media platform with token rewards",
    status: "success",
    totalVotes: 88,
    yesVotes: 71,
    noVotes: 17,
    launchPool: "4.5 SOL",
    tokenAddress: "WeB3S...7890",
    website: "https://web3social.com",
    socialLinks: {
      twitter: "https://twitter.com/web3social",
      telegram: "https://t.me/web3social"
    }
  },
  {
    id: 6,
    name: "DAO Governance",
    symbol: "GOV",
    launchDate: "2024-01-03",
    price: "$0.098",
    change: "+98%",
    volume: "1.5M",
    marketCap: "$980K",
    category: "DAO",
    description: "Advanced governance tools for decentralized organizations",
    status: "success",
    totalVotes: 76,
    yesVotes: 52,
    noVotes: 24,
    launchPool: "4.5 SOL",
    tokenAddress: "DaOgOv...2468",
    website: "https://daogov.com",
    socialLinks: {
      twitter: "https://twitter.com/daogov",
      discord: "https://discord.gg/daogov"
    }
  }
];

export default function LaunchedPage() {
  const totalProjects = launchedProjects.length;
  const totalMarketCap = launchedProjects.reduce((sum, project) => {
    const cap = parseFloat(project.marketCap.replace(/[$,]/g, ''));
    return sum + cap;
  }, 0);
  const totalVolume = launchedProjects.reduce((sum, project) => {
    const vol = parseFloat(project.volume.replace(/[$,]/g, ''));
    return sum + vol;
  }, 0);
  const avgChange = launchedProjects.reduce((sum, project) => {
    const change = parseFloat(project.change.replace(/[+%]/g, ''));
    return sum + change;
  }, 0) / totalProjects;

  return (
    <AppLayout currentPage="launched">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white mb-2">
            Successfully Launched Projects
          </h1>
          <p className="text-white/70 text-lg">
            Explore tokens that have been successfully launched through our prediction markets
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20 cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold text-white group-hover:text-green-300 transition-colors">{totalProjects}</CardTitle>
              <CardDescription className="text-gray-300 group-hover:text-white transition-colors">Total Launched</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20 cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold text-white group-hover:text-blue-300 transition-colors">${(totalMarketCap / 1000).toFixed(1)}M</CardTitle>
              <CardDescription className="text-gray-300 group-hover:text-white transition-colors">Total Market Cap</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20 cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold text-white group-hover:text-purple-300 transition-colors">${(totalVolume / 1000).toFixed(1)}M</CardTitle>
              <CardDescription className="text-gray-300 group-hover:text-white transition-colors">Total Volume</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20 cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold text-white group-hover:text-orange-300 transition-colors">+{avgChange.toFixed(0)}%</CardTitle>
              <CardDescription className="text-gray-300 group-hover:text-white transition-colors">Avg Performance</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Projects Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white">Launched Tokens</h2>
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-white/70">Sorted by Launch Date</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {launchedProjects.map((project) => (
              <Card key={project.id} className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:scale-102 group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl flex items-center justify-center">
                          <Rocket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white group-hover:text-green-300 transition-colors">
                            {project.name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs">
                              {project.symbol}
                            </Badge>
                            <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-xs">
                              {project.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 group-hover:text-white transition-colors">
                        {project.description}
                      </p>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-gray-400 text-xs">Price</div>
                      <div className="font-bold text-white text-lg">{project.price}</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-gray-400 text-xs">Change</div>
                      <div className="font-bold text-green-400 text-lg">{project.change}</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-gray-400 text-xs">Volume</div>
                      <div className="font-bold text-white">{project.volume}</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-gray-400 text-xs">Market Cap</div>
                      <div className="font-bold text-white">{project.marketCap}</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Launch Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">Launched:</span>
                      </div>
                      <span className="text-white font-medium">{project.launchDate}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">Total Votes:</span>
                      </div>
                      <span className="text-white font-medium">{project.totalVotes}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">YES Rate:</span>
                      </div>
                      <span className="text-green-400 font-medium">
                        {Math.round((project.yesVotes / project.totalVotes) * 100)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">Launch Pool:</span>
                      </div>
                      <span className="text-white font-medium">{project.launchPool}</span>
                    </div>
                  </div>

                  {/* Token Address */}
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-gray-400 mb-1">Token Address</div>
                    <div className="flex items-center justify-between">
                      <code className="text-xs text-white font-mono">{project.tokenAddress}</code>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Trade
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10 hover:border-white/30"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Website
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center space-y-6 py-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Want to Launch Your Own Token?</h2>
            <p className="text-white/70 text-lg mb-6">
              Create a prediction market and let the community decide if your project deserves a token launch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Link href="/create">
                  <Zap className="w-5 h-5 mr-2" />
                  Launch Your Project
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:border-white/30">
                <Link href="/browse">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Browse Active Markets
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Success Stats */}
        <Card className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 backdrop-blur-xl border-green-500/20 text-white">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Star className="w-8 h-8 text-yellow-400" />
                <h3 className="text-2xl font-bold text-white">Platform Success Metrics</h3>
                <Star className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-green-400">100%</div>
                  <div className="text-white/70">Launch Success Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-400">+{avgChange.toFixed(0)}%</div>
                  <div className="text-white/70">Average Token Performance</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400">{Math.round((totalProjects * 89) / totalProjects)}%</div>
                  <div className="text-white/70">Average Community Approval</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
