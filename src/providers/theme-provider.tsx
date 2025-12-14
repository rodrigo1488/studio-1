'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes/dist/types';

/**
 * Componente interno para gerenciar tema automático baseado em horário
 */
function AutoThemeManager() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const updateThemeByTime = () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Escuro após 18h (6 PM) até 6h (6 AM)
      const shouldBeDark = hour >= 18 || hour < 6;
      
      // Verificar preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Aplicar tema baseado em horário se não houver preferência do sistema explícita
      // ou se o horário indicar escuro
      if (shouldBeDark && !prefersDark) {
        // Forçar escuro baseado em horário
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else if (!shouldBeDark && prefersDark) {
        // Forçar claro baseado em horário
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    };

    // Atualizar imediatamente
    updateThemeByTime();

    // Atualizar a cada minuto
    const interval = setInterval(updateThemeByTime, 60000);

    // Escutar mudanças na preferência do sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      updateThemeByTime();
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      clearInterval(interval);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [mounted, theme]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <AutoThemeManager />
      {children}
    </NextThemesProvider>
  );
}

