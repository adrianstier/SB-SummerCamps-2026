import React, { createContext, useContext, useState, useCallback } from 'react';

const CompareContext = createContext(null);

function getInitialCompareList() {
  try {
    const stored = sessionStorage.getItem('sb-camps-compare');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persistCompareList(list) {
  try {
    sessionStorage.setItem('sb-camps-compare', JSON.stringify(list));
  } catch {
    // sessionStorage may be unavailable
  }
}

export function CompareProvider({ children }) {
  const [compareList, setCompareList] = useState(getInitialCompareList);

  const toggleCompare = useCallback((campId) => {
    setCompareList(prev => {
      const next = prev.includes(campId)
        ? prev.filter(id => id !== campId)
        : prev.length < 6 ? [...prev, campId] : prev;
      persistCompareList(next);
      return next;
    });
  }, []);

  const addToCompare = useCallback((campId) => {
    setCompareList(prev => {
      if (prev.includes(campId) || prev.length >= 6) return prev;
      const next = [...prev, campId];
      persistCompareList(next);
      return next;
    });
  }, []);

  const removeFromCompare = useCallback((campId) => {
    setCompareList(prev => {
      const next = prev.filter(id => id !== campId);
      persistCompareList(next);
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
    persistCompareList([]);
  }, []);

  const isComparing = compareList.length > 0;

  const value = {
    compareList,
    setCompareList,
    toggleCompare,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isComparing
  };

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}
