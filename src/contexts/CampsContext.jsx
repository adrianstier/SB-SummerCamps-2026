import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const CampsContext = createContext(null);

// Retry helper for transient API failures (exponential backoff)
async function withRetry(fn, maxRetries = 2, delay = 500) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`API call failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// Fetch camps from Supabase
async function fetchCamps(filters = {}) {
  if (!supabase) {
    return { camps: [], total: 0 };
  }

  return withRetry(async () => {
    let query = supabase.from('camps').select('*');

    // Apply filters
    // SECURITY: Escape characters with special meaning in PostgREST filter expressions
    if (filters.search) {
      const safeSearch = filters.search
        .replace(/[%_\\]/g, c => '\\' + c)  // Escape LIKE wildcards
        .replace(/[,.()[\]]/g, '')          // Remove PostgREST operators
        .trim();
      if (safeSearch) {
        query = query.or(`camp_name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
      }
    }

    if (filters.category && filters.category !== 'All') {
      query = query.eq('category', filters.category);
    }

    if (filters.minAge) {
      query = query.gte('max_age', parseInt(filters.minAge, 10));
    }

    if (filters.maxAge) {
      query = query.lte('min_age', parseInt(filters.maxAge, 10));
    }

    if (filters.maxPrice) {
      query = query.lte('min_price', parseInt(filters.maxPrice, 10));
    }

    if (!filters.includeClosed) {
      query = query.eq('is_closed', false);
    }

    const { data, error } = await query.order('camp_name');

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    return { camps: data || [], total: data?.length || 0 };
  });
}

async function fetchCategories() {
  if (!supabase) return [];

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('camps')
      .select('category')
      .not('category', 'is', null)
      .eq('is_closed', false);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Filter out status indicators that aren't real categories
    const invalidCategories = ['CLOSED', 'NO CAMP', 'TBD', 'Unknown', 'N/A'];
    const categories = [...new Set(data.map(c => c.category))]
      .filter(cat => cat && !invalidCategories.includes(cat.toUpperCase()));
    return categories.sort();
  });
}

async function fetchStats() {
  if (!supabase) {
    return { total: 0, active: 0, closed: 0, categories: {}, priceRange: {}, ageRange: {} };
  }

  return withRetry(async () => {
    const { data: camps, error } = await supabase.from('camps').select('category, min_price, max_price, min_age, max_age, is_closed');

    if (error || !camps) {
      throw new Error(`Supabase error: ${error?.message || 'No data returned'}`);
    }

    const active = camps.filter(c => !c.is_closed);

    const categories = {};
    active.forEach(c => {
      if (c.category) {
        categories[c.category] = (categories[c.category] || 0) + 1;
      }
    });

    const prices = active.filter(c => c.min_price).map(c => c.min_price);
    const ages = active.filter(c => c.min_age);
    const maxPrices = active.filter(c => c.max_price).map(c => c.max_price);
    const maxAges = ages.filter(c => c.max_age).map(c => c.max_age);

    return {
      total: camps.length,
      active: active.length,
      closed: camps.length - active.length,
      categories,
      priceRange: {
        min: prices.length ? prices.reduce((a, b) => Math.min(a, b), Infinity) : null,
        max: maxPrices.length ? maxPrices.reduce((a, b) => Math.max(a, b), -Infinity) : null
      },
      ageRange: {
        min: ages.length ? ages.map(c => c.min_age).reduce((a, b) => Math.min(a, b), Infinity) : null,
        max: maxAges.length ? maxAges.reduce((a, b) => Math.max(a, b), -Infinity) : null
      }
    };
  });
}

export function CampsProvider({ children }) {
  const [camps, setCamps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const initialLoadDone = useRef(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [campsData, categoriesData, statsData] = await Promise.all([
        fetchCamps(),
        fetchCategories(),
        fetchStats()
      ]);
      setCamps(campsData.camps);
      setCategories(categoriesData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, []);

  // Fetch camps on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const value = {
    camps,
    categories,
    stats,
    loading,
    error,
    refreshCamps: loadData
  };

  return (
    <CampsContext.Provider value={value}>
      {children}
    </CampsContext.Provider>
  );
}

export function useCamps() {
  const context = useContext(CampsContext);
  if (!context) {
    throw new Error('useCamps must be used within a CampsProvider');
  }
  return context;
}
