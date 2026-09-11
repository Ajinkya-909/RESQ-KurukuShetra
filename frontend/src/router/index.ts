// ============================================================
// RESQ — Zero-Dependency Browser History Router
// ============================================================

import { useState, useEffect, useCallback } from 'react';

export interface RouteMatch {
  name: 'home' | 'setup' | 'dashboard' | 'depots' | 'agency' | 'not-found';
  params: Record<string, string>;
  pathname: string;
}

export function parseRoute(pathname: string): RouteMatch {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  // 1. Home Route: /
  if (cleanPath === '/') {
    return { name: 'home', params: {}, pathname: cleanPath };
  }

  // 2. Setup Route: /setup/:scenarioId
  const setupMatch = cleanPath.match(/^\/setup\/([^/]+)$/);
  if (setupMatch) {
    return {
      name: 'setup',
      params: { scenarioId: decodeURIComponent(setupMatch[1]) },
      pathname: cleanPath,
    };
  }

  // 3. Dashboard Route: /dashboard/:scenarioId
  const dashboardMatch = cleanPath.match(/^\/dashboard\/([^/]+)$/);
  if (dashboardMatch) {
    return {
      name: 'dashboard',
      params: { scenarioId: decodeURIComponent(dashboardMatch[1]) },
      pathname: cleanPath,
    };
  }

  // 4. Depots & Inventory Route: /depots
  if (cleanPath === '/depots') {
    return { name: 'depots', params: {}, pathname: cleanPath };
  }

  // 5. Agency Dispatch Route: /agency
  if (cleanPath === '/agency') {
    return { name: 'agency', params: {}, pathname: cleanPath };
  }

  // Fallback for /setup or /dashboard without ID
  if (cleanPath === '/setup') {
    return {
      name: 'setup',
      params: { scenarioId: 'scn_pune_monsoon' },
      pathname: '/setup/scn_pune_monsoon',
    };
  }

  if (cleanPath === '/dashboard') {
    return {
      name: 'dashboard',
      params: { scenarioId: 'scn_pune_monsoon' },
      pathname: '/dashboard/scn_pune_monsoon',
    };
  }

  return { name: 'home', params: {}, pathname: cleanPath };
}

export function navigate(to: string) {
  if (to !== window.location.pathname) {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

export function useRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const route = parseRoute(currentPath);

  return { currentPath, route, navigate };
}
