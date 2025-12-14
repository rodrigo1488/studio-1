/**
 * Touch feedback wrapper component
 * Provides visual feedback on touch interactions
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TouchFeedbackProps {
  children: React.ReactNode;
  className?: string;
  ripple?: boolean;
  activeClassName?: string;
}

export function TouchFeedback({
  children,
  className,
  ripple = true,
  activeClassName = 'opacity-70 scale-95',
}: TouchFeedbackProps) {
  const [isActive, setIsActive] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsActive(true);

    if (ripple && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const newRipple = {
        x,
        y,
        id: rippleIdRef.current++,
      };

      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    }
  };

  const handleTouchEnd = () => {
    setIsActive(false);
  };

  const handleTouchCancel = () => {
    setIsActive(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className, isActive && activeClassName)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onMouseLeave={() => setIsActive(false)}
    >
      {children}
      {ripple && ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '100px',
            height: '100px',
            marginLeft: '-50px',
            marginTop: '-50px',
          }}
        />
      ))}
    </div>
  );
}

