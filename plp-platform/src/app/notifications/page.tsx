'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Rocket, 
  TrendingUp, 
  Users, 
  DollarSign,
  Clock,
  Star,
  ExternalLink,
  Filter,
  Check,
  Trash2
} from 'lucide-react';
import Link from 'next/link';

// Mock data for notifications
const mockNotifications = [
  {
    id: 1,
    type: 'vote_result',
    title: 'DeFi Protocol Alpha - Vote Results',
    message: 'Your YES vote was successful! The project has been approved for token launch.',
    timestamp: '2 minutes ago',
    isRead: false,
    priority: 'high',
    project: {
      name: 'DeFi Protocol Alpha',
      symbol: 'ALPHA',
      category: 'DeFi'
    },
    action: 'view_project',
    actionUrl: '/projects/alpha'
  },
  {
    id: 2,
    type: 'token_launched',
    title: 'GameFi Token Successfully Launched',
    message: 'GameFi Token (GFT) has been launched on pump.fun and is now trading!',
    timestamp: '1 hour ago',
    isRead: false,
    priority: 'high',
    project: {
      name: 'GameFi Token',
      symbol: 'GFT',
      category: 'Gaming'
    },
    action: 'trade_token',
    actionUrl: '/trade/gft'
  },
  {
    id: 3,
    type: 'vote_reminder',
    title: 'NFT Marketplace Beta - Voting Ends Soon',
    message: 'Only 6 hours left to vote on NFT Marketplace Beta. Your opinion matters!',
    timestamp: '3 hours ago',
    isRead: true,
    priority: 'medium',
    project: {
      name: 'NFT Marketplace Beta',
      symbol: 'MVN',
      category: 'NFT'
    },
    action: 'vote_now',
    actionUrl: '/browse'
  },
  {
    id: 4,
    type: 'reward_earned',
    title: 'Reward Earned - AI Trading Bot',
    message: 'You earned 150 AIT tokens for your accurate YES prediction on AI Trading Bot!',
    timestamp: '5 hours ago',
    isRead: true,
    priority: 'medium',
    project: {
      name: 'AI Trading Bot',
      symbol: 'AIT',
      category: 'AI/ML'
    },
    action: 'claim_reward',
    actionUrl: '/rewards'
  },
  {
    id: 5,
    type: 'project_update',
    title: 'Web3 Social - Development Update',
    message: 'The team has released a major update to their platform. Check out the new features!',
    timestamp: '1 day ago',
    isRead: true,
    priority: 'low',
    project: {
      name: 'Web3 Social',
      symbol: 'W3S',
      category: 'Social'
    },
    action: 'view_update',
    actionUrl: '/projects/web3-social'
  },
  {
    id: 6,
    type: 'vote_result',
    title: 'DAO Governance - Vote Results',
    message: 'Unfortunately, your NO vote was correct. The project did not meet the launch criteria.',
    timestamp: '2 days ago',
    isRead: true,
    priority: 'medium',
    project: {
      name: 'DAO Governance',
      symbol: 'GOV',
      category: 'DAO'
    },
    action: 'view_results',
    actionUrl: '/projects/dao-governance'
  },
  {
    id: 7,
    type: 'weekly_digest',
    title: 'Weekly Platform Digest',
    message: 'This week: 3 new projects launched, 2 successful predictions, and 1,247 SOL in total volume.',
    timestamp: '3 days ago',
    isRead: true,
    priority: 'low',
    project: null,
    action: 'view_digest',
    actionUrl: '/digest/weekly'
  },
  {
    id: 8,
    type: 'community_milestone',
    title: 'Platform Milestone Reached!',
    message: 'Congratulations! PLP has reached 100 successfully launched projects. Thank you for being part of our community!',
    timestamp: '1 week ago',
    isRead: true,
    priority: 'high',
    project: null,
    action: 'celebrate',
    actionUrl: '/milestone/100'
  }
];

const notificationTypes = [
  { id: 'all', label: 'All', count: mockNotifications.length },
  { id: 'unread', label: 'Unread', count: mockNotifications.filter(n => !n.isRead).length },
  { id: 'vote_result', label: 'Vote Results', count: mockNotifications.filter(n => n.type === 'vote_result').length },
  { id: 'token_launched', label: 'Token Launched', count: mockNotifications.filter(n => n.type === 'token_launched').length },
  { id: 'reward_earned', label: 'Rewards', count: mockNotifications.filter(n => n.type === 'reward_earned').length },
  { id: 'vote_reminder', label: 'Reminders', count: mockNotifications.filter(n => n.type === 'vote_reminder').length }
];

export default function NotificationsPage() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [notifications, setNotifications] = useState(mockNotifications);

  const filteredNotifications = notifications.filter(notification => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'unread') return !notification.isRead;
    return notification.type === selectedFilter;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'vote_result': return <CheckCircle className="w-5 h-5" />;
      case 'token_launched': return <Rocket className="w-5 h-5" />;
      case 'vote_reminder': return <Clock className="w-5 h-5" />;
      case 'reward_earned': return <Star className="w-5 h-5" />;
      case 'project_update': return <TrendingUp className="w-5 h-5" />;
      case 'weekly_digest': return <Bell className="w-5 h-5" />;
      case 'community_milestone': return <Users className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'high') {
      switch (type) {
        case 'vote_result': return 'from-green-500 to-cyan-500';
        case 'token_launched': return 'from-blue-500 to-purple-500';
        case 'community_milestone': return 'from-yellow-500 to-orange-500';
        default: return 'from-purple-500 to-pink-500';
      }
    }
    if (priority === 'medium') {
      return 'from-blue-500 to-cyan-500';
    }
    return 'from-gray-500 to-gray-600';
  };

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
            <p className="text-white/70">
              Stay updated with your prediction market activities and platform updates
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
              {unreadCount} Unread
            </Badge>
            <Button
              onClick={markAllAsRead}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 hover:border-white/30"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {notificationTypes.map((type) => (
                <Button
                  key={type.id}
                  variant={selectedFilter === type.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedFilter(type.id)}
                  className={
                    selectedFilter === type.id
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }
                >
                  {type.label}
                  {type.count > 0 && (
                    <Badge className="ml-2 bg-white/20 text-white text-xs">
                      {type.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white">
              <CardContent className="p-12 text-center">
                <Bell className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Notifications</h3>
                <p className="text-white/70">
                  {selectedFilter === 'unread' 
                    ? "You're all caught up! No unread notifications."
                    : "No notifications match your current filter."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`backdrop-blur-xl border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:scale-102 group ${
                  notification.isRead ? 'bg-white/5' : 'bg-white/10 border-white/20'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Notification Icon */}
                    <div className={`w-12 h-12 bg-gradient-to-r ${getNotificationColor(notification.type, notification.priority)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={`font-semibold ${notification.isRead ? 'text-white' : 'text-white font-bold'}`}>
                              {notification.title}
                            </h3>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <Badge className={`text-xs ${
                              notification.priority === 'high' 
                                ? 'bg-red-500/20 text-red-300 border-red-400/30'
                                : notification.priority === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
                                : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                            }`}>
                              {notification.priority}
                            </Badge>
                          </div>
                          
                          <p className="text-white/70 text-sm mb-2">
                            {notification.message}
                          </p>

                          {notification.project && (
                            <div className="flex items-center space-x-2 mb-3">
                              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs">
                                {notification.project.category}
                              </Badge>
                              <span className="text-white/60 text-sm">
                                {notification.project.name} ({notification.project.symbol})
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-xs flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {notification.timestamp}
                            </span>

                            <div className="flex items-center space-x-2">
                              {notification.action && (
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                                >
                                  {notification.action === 'view_project' && <ExternalLink className="w-3 h-3 mr-1" />}
                                  {notification.action === 'trade_token' && <TrendingUp className="w-3 h-3 mr-1" />}
                                  {notification.action === 'vote_now' && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {notification.action === 'claim_reward' && <Star className="w-3 h-3 mr-1" />}
                                  {notification.action === 'view_update' && <ExternalLink className="w-3 h-3 mr-1" />}
                                  {notification.action === 'view_results' && <TrendingUp className="w-3 h-3 mr-1" />}
                                  {notification.action === 'view_digest' && <Bell className="w-3 h-3 mr-1" />}
                                  {notification.action === 'celebrate' && <Star className="w-3 h-3 mr-1" />}
                                  {notification.action.replace('_', ' ')}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.isRead && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                              className="text-white/70 hover:text-white hover:bg-white/10"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-white/70 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl border-purple-500/20 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Stay Active in the Community</h2>
                <p className="text-white/70">Participate in prediction markets and earn rewards</p>
              </div>
              <div className="flex space-x-3">
                <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:border-white/30">
                  <Link href="/browse">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Browse Markets
                  </Link>
                </Button>
                <Button asChild className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Link href="/create">
                    <Rocket className="w-4 h-4 mr-2" />
                    Launch Project
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
