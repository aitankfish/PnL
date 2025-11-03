'use client';

import { usePathname } from 'next/navigation';
import AppLayout from './AppLayout';

interface AppLayoutWrapperProps {
  children: React.ReactNode;
}

export default function AppLayoutWrapper({ children }: AppLayoutWrapperProps) {
  const pathname = usePathname();

  // Map pathnames to page IDs for sidebar active state
  const getCurrentPage = (): string | undefined => {
    if (pathname === '/' || pathname === '/launchpad') return 'dashboard';
    if (pathname === '/create') return 'create';
    if (pathname === '/browse') return 'markets';
    if (pathname.startsWith('/market/')) return 'markets';
    if (pathname === '/launched') return 'launched';
    if (pathname === '/notifications') return 'notifications';
    if (pathname === '/wallet') return 'wallet';
    return undefined;
  };

  return (
    <AppLayout currentPage={getCurrentPage()}>
      {children}
    </AppLayout>
  );
}
