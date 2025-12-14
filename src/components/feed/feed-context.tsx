'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type ViewMode = 'timeline' | 'grid';

interface FeedContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const FeedContext = createContext<FeedContextType | null>(null);

export function FeedProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  return (
    <FeedContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed must be used within FeedProvider');
  }
  return context;
}
