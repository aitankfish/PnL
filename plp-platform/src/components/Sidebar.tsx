'use client';

import React, { useState, useEffect, useTransition, useMemo, memo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Plus,
  Target,
  Rocket,
  Bell,
  User,
  Loader2
} from 'lucide-react';
import UserInfo from './UserInfo';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: string;
  isActive?: boolean;
}

interface SidebarProps {
  currentPage?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'create',
    label: 'Create Project',
    icon: Plus,
    href: '/create',
    badge: 'New'
  },
  {
    id: 'markets',
    label: 'Browse Markets',
    icon: Target,
    href: '/browse'
  },
  {
    id: 'launched',
    label: 'Launched Projects',
    icon: Rocket,
    href: '/launched'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    href: '/notifications'
  }
];

function Sidebar({ currentPage }: SidebarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { ready, authenticated, login, primaryWallet } = useWallet();
  const { displayName, profilePhotoUrl } = useUserProfile();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Show navigation when scrolling down, hide when scrolling up
          if (currentScrollY < lastScrollY) {
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsVisible(false);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Handle wallet button click - memoized to prevent recreation on every render
  const handleWalletClick = useCallback(() => {
    if (!ready) return; // Wait for wallet provider to be ready

    if (!authenticated) {
      // User is not authenticated, show login modal
      login();
    } else {
      // User is authenticated, navigate to wallet page with smooth transition
      startTransition(() => {
        router.push('/wallet');
      });
    }
  }, [ready, authenticated, login, router, startTransition]);

  // Memoize enriched sidebar items to prevent recalculation
  const enrichedSidebarItems = useMemo(() => {
    return sidebarItems.map(item => ({
      ...item,
      showNotificationBadge: item.id === 'notifications' && unreadCount > 0,
      showNewBadge: item.badge === 'New',
      isActive: currentPage === item.id
    }));
  }, [unreadCount, currentPage]);

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-4 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-20'
    }`}>
      <div className="bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl shadow-white/5 p-4 relative overflow-hidden">
        {/* Space Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-2 left-8 w-1 h-1 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-3 right-12 w-0.5 h-0.5 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-4 left-1/3 w-0.5 h-0.5 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-2 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute top-3 left-2/3 w-0.5 h-0.5 bg-cyan-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        </div>
        <div className="flex items-center justify-between relative z-10">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/launchpad" prefetch={true} className="flex items-center hover:scale-105 transition-transform mr-6 group">
              <span className="text-2xl font-bold">
                <span className="text-green-400">P</span>
                <span className="text-blue-400">&</span>
                <span className="text-red-400">L</span>
              </span>
            </Link>
          </div>

          {/* Navigation Icons */}
          <nav className="flex items-center space-x-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const showNotificationBadge = item.id === 'notifications' && unreadCount > 0;
              const showNewBadge = item.badge === 'New';

              return (
                <Link
                  key={item.id}
                  href={item.href || '#'}
                  prefetch={true}
                  className={`
                    flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 group relative
                    ${isActive
                      ? 'bg-white/20 text-white shadow-lg shadow-purple-500/20'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }
                  `}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                  {showNotificationBadge && (
                    <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </div>
                  )}
                  {showNewBadge && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">!</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Information & Wallet Management */}
          <div className="flex items-center space-x-3">
            {/* User Info Component - Always show on larger screens */}
            <UserInfo compact={true} className="hidden lg:flex" />
            <button
              onClick={handleWalletClick}
              disabled={isPending}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:scale-105 transition-transform cursor-pointer overflow-hidden relative group disabled:opacity-70 disabled:cursor-not-allowed"
              title={authenticated ? `${displayName} - Wallet & Profile` : "Connect Wallet"}
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : authenticated && profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Sidebar);
