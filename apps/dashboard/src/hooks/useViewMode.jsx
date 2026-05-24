import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth.jsx';

const ViewModeContext = createContext(null);

export function ViewModeProvider({ children }) {
  const { isAdmin } = useAuth();
  const [viewMode, setViewModeState] = useState(() => {
    return localStorage.getItem('viewMode') || 'personal';
  });
  const [period, setPeriodState] = useState(() => {
    const saved = localStorage.getItem('dashboardPeriod');
    return saved || 'all';
  });
  const [customRange, setCustomRange] = useState({ start: null, end: null });

  const setPeriod = useCallback((next) => {
    setPeriodState(next);
    localStorage.setItem('dashboardPeriod', next);
  }, []);

  const setViewMode = useCallback(
    (mode) => {
      if (!isAdmin && mode === 'family') return;
      setViewModeState(mode);
      localStorage.setItem('viewMode', mode);
    },
    [isAdmin]
  );

  const queryParams = useMemo(
    () => ({
      view: isAdmin ? viewMode : 'personal',
      period,
      ...(period === 'custom' && customRange.start && customRange.end
        ? { start: customRange.start, end: customRange.end }
        : {}),
    }),
    [isAdmin, viewMode, period, customRange.start, customRange.end]
  );

  return (
    <ViewModeContext.Provider
      value={{
        viewMode: isAdmin ? viewMode : 'personal',
        setViewMode,
        period,
        setPeriod,
        customRange,
        setCustomRange,
        queryParams,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode must be used within ViewModeProvider');
  return ctx;
}
