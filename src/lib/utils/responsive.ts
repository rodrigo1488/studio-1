/**
 * Responsive utilities for mobile-first design
 */

import { useState, useEffect } from 'react';

// Breakpoints matching Tailwind defaults
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Hook to detect screen size
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState<{
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  }>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 0,
        height: 0,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      };
    }

    const width = window.innerWidth;
    return {
      width,
      height: window.innerHeight,
      isMobile: width < breakpoints.md,
      isTablet: width >= breakpoints.md && width < breakpoints.lg,
      isDesktop: width >= breakpoints.lg,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScreenSize({
        width,
        height,
        isMobile: width < breakpoints.md,
        isTablet: width >= breakpoints.md && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
}

/**
 * Hook to check if screen is smaller than a breakpoint
 */
export function useBreakpoint(breakpoint: keyof typeof breakpoints) {
  const [isBelow, setIsBelow] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth < breakpoints[breakpoint];
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsBelow(window.innerWidth < breakpoints[breakpoint]);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isBelow;
}

/**
 * Get responsive class names based on screen size
 */
export function getResponsiveClasses(
  mobile: string,
  tablet?: string,
  desktop?: string
): string {
  let classes = mobile;
  if (tablet) classes += ` md:${tablet}`;
  if (desktop) classes += ` lg:${desktop}`;
  return classes;
}

/**
 * Check if device is touch-enabled
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get safe area insets for mobile devices (notch, etc.)
 */
export function getSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // @ts-ignore - CSS environment variables
  const env = window.getComputedStyle(document.documentElement);
  const safeAreaTop = parseInt(
    env.getPropertyValue('env(safe-area-inset-top)') || '0',
    10
  );
  const safeAreaRight = parseInt(
    env.getPropertyValue('env(safe-area-inset-right)') || '0',
    10
  );
  const safeAreaBottom = parseInt(
    env.getPropertyValue('env(safe-area-inset-bottom)') || '0',
    10
  );
  const safeAreaLeft = parseInt(
    env.getPropertyValue('env(safe-area-inset-left)') || '0',
    10
  );

  return {
    top: safeAreaTop,
    right: safeAreaRight,
    bottom: safeAreaBottom,
    left: safeAreaLeft,
  };
}

