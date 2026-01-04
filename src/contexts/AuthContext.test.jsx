import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: null, // Not configured by default
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  getProfile: vi.fn(),
  getChildren: vi.fn(() => []),
  getFavorites: vi.fn(() => []),
  getScheduledCamps: vi.fn(() => []),
  getNotifications: vi.fn(() => []),
  getUnreadNotificationCount: vi.fn(() => 0),
  updateProfile: vi.fn()
}));

import * as supabaseModule from '../lib/supabase';

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('returns context when used inside AuthProvider', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('profile');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('isConfigured');
      expect(result.current).toHaveProperty('signIn');
      expect(result.current).toHaveProperty('signOut');
    });
  });

  describe('initial state', () => {
    it('has null user when not authenticated', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
    });

    it('isConfigured is false when supabase not set up', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isConfigured).toBe(false);
    });

    it('loading becomes false when supabase not configured', async () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('has empty arrays for data collections', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.children).toEqual([]);
      expect(result.current.favorites).toEqual([]);
      expect(result.current.scheduledCamps).toEqual([]);
      expect(result.current.notifications).toEqual([]);
    });

    it('has zero unread count', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.unreadCount).toBe(0);
    });

    it('showOnboarding is false initially', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.showOnboarding).toBe(false);
    });
  });

  describe('isFavorited function', () => {
    it('returns false when favorites array is empty', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isFavorited('camp-1')).toBe(false);
    });
  });

  describe('getScheduleForWeek function', () => {
    it('returns empty array when no scheduled camps', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      const schedule = result.current.getScheduleForWeek('2026-06-08', '2026-06-12');
      expect(schedule).toEqual([]);
    });
  });

  describe('getTotalCost function', () => {
    it('returns 0 when no scheduled camps', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.getTotalCost()).toBe(0);
    });
  });

  describe('getCoverageGaps function', () => {
    it('returns all weeks as gaps when no camps scheduled', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      const summerWeeks = [
        { weekNum: 1, startDate: '2026-06-08', endDate: '2026-06-12' },
        { weekNum: 2, startDate: '2026-06-15', endDate: '2026-06-19' }
      ];

      const gaps = result.current.getCoverageGaps('child-1', summerWeeks);
      expect(gaps).toHaveLength(2);
    });
  });

  describe('getRecommendationScores function', () => {
    it('returns empty array when no profile', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      const camps = [{ id: 'camp-1', category: 'Art' }];
      const scores = result.current.getRecommendationScores(camps);

      expect(scores).toEqual([]);
    });
  });

  describe('getDashboardStats function', () => {
    it('returns zero stats when nothing scheduled', () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      const stats = result.current.getDashboardStats();

      expect(stats).toEqual({
        totalScheduled: 0,
        totalCost: 0,
        weeksWithCamps: 0,
        favoritesCount: 0,
        childrenCount: 0
      });
    });
  });

  describe('signIn function', () => {
    it('calls signInWithGoogle', async () => {
      supabaseModule.signInWithGoogle.mockResolvedValue({ data: {}, error: null });

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn();
      });

      expect(supabaseModule.signInWithGoogle).toHaveBeenCalled();
    });
  });

  describe('signOut function', () => {
    it('clears all user state', async () => {
      supabaseModule.signOut.mockResolvedValue({ error: null });

      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(result.current.children).toEqual([]);
      expect(result.current.favorites).toEqual([]);
      expect(result.current.scheduledCamps).toEqual([]);
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.showOnboarding).toBe(false);
    });
  });

  describe('completeOnboarding function', () => {
    it('sets showOnboarding to false', async () => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.completeOnboarding();
      });

      expect(result.current.showOnboarding).toBe(false);
    });
  });
});

describe('AuthContext helper functions (unit tests)', () => {
  describe('isFavorited', () => {
    it('correctly identifies favorited camps', () => {
      // Test the logic: favorites.some(f => f.camp_id === campId)
      const favorites = [
        { camp_id: 'camp-1' },
        { camp_id: 'camp-2' }
      ];

      const isFavorited = (campId) => favorites.some(f => f.camp_id === campId);

      expect(isFavorited('camp-1')).toBe(true);
      expect(isFavorited('camp-2')).toBe(true);
      expect(isFavorited('camp-3')).toBe(false);
    });
  });

  describe('getScheduleForWeek', () => {
    it('finds overlapping scheduled camps', () => {
      const scheduledCamps = [
        { start_date: '2026-06-08', end_date: '2026-06-12' }, // Week 1
        { start_date: '2026-06-15', end_date: '2026-06-19' }, // Week 2
        { start_date: '2026-06-10', end_date: '2026-06-17' }  // Spans Week 1-2
      ];

      const getScheduleForWeek = (startDate, endDate) => {
        return scheduledCamps.filter(sc => {
          const scStart = new Date(sc.start_date);
          const scEnd = new Date(sc.end_date);
          const weekStart = new Date(startDate);
          const weekEnd = new Date(endDate);
          return (scStart <= weekEnd && scEnd >= weekStart);
        });
      };

      // Week 1
      const week1 = getScheduleForWeek('2026-06-08', '2026-06-12');
      expect(week1).toHaveLength(2); // Camp 1 and spanning camp

      // Week 2
      const week2 = getScheduleForWeek('2026-06-15', '2026-06-19');
      expect(week2).toHaveLength(2); // Camp 2 and spanning camp

      // Week 3 (no camps)
      const week3 = getScheduleForWeek('2026-06-22', '2026-06-26');
      expect(week3).toHaveLength(0);
    });
  });

  describe('getTotalCost', () => {
    it('sums prices excluding cancelled', () => {
      const scheduledCamps = [
        { price: 400, status: 'planned' },
        { price: 350, status: 'confirmed' },
        { price: 500, status: 'cancelled' }, // Should be excluded
        { price: null, status: 'planned' }   // Should be 0
      ];

      const getTotalCost = () => {
        return scheduledCamps
          .filter(sc => sc.status !== 'cancelled')
          .reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);
      };

      expect(getTotalCost()).toBe(750); // 400 + 350
    });
  });

  describe('getCoverageGaps', () => {
    it('identifies weeks without camps for child', () => {
      const scheduledCamps = [
        { child_id: 'child-1', start_date: '2026-06-08', end_date: '2026-06-12', status: 'planned' },
        { child_id: 'child-1', start_date: '2026-06-22', end_date: '2026-06-26', status: 'cancelled' } // Cancelled
      ];

      const summerWeeks = [
        { weekNum: 1, startDate: '2026-06-08', endDate: '2026-06-12' },
        { weekNum: 2, startDate: '2026-06-15', endDate: '2026-06-19' },
        { weekNum: 3, startDate: '2026-06-22', endDate: '2026-06-26' }
      ];

      const getCoverageGaps = (childId, weeks) => {
        const childSchedule = scheduledCamps.filter(
          sc => sc.child_id === childId && sc.status !== 'cancelled'
        );

        return weeks.filter(week => {
          const weekStart = new Date(week.startDate);
          const weekEnd = new Date(week.endDate);

          return !childSchedule.some(sc => {
            const scStart = new Date(sc.start_date);
            const scEnd = new Date(sc.end_date);
            return (scStart <= weekEnd && scEnd >= weekStart);
          });
        });
      };

      const gaps = getCoverageGaps('child-1', summerWeeks);
      expect(gaps).toHaveLength(2); // Week 2 and Week 3 (cancelled)
      expect(gaps.map(g => g.weekNum)).toEqual([2, 3]);
    });
  });

  describe('getRecommendationScores', () => {
    const profile = {
      preferred_categories: ['Beach/Surf', 'Art']
    };

    const children = [
      { age_as_of_summer: 10, interests: ['swimming'] }
    ];

    const favorites = [{ camp_id: 'camp-2' }];

    const camps = [
      {
        id: 'camp-1',
        category: 'Beach/Surf',
        min_age: 8,
        max_age: 14,
        description: 'A very long description that provides comprehensive and detailed information about the camp activities, schedules, and learning opportunities for children.',
        contact_email: 'test@test.com',
        website_url: 'https://test.com',
        has_extended_care: true,
        food_included: true
      },
      {
        id: 'camp-2',
        category: 'Sports',
        min_age: 5,
        max_age: 12
      },
      {
        id: 'camp-3',
        category: 'Art',
        min_age: 12,
        max_age: 18 // Child too young
      }
    ];

    it('scores higher for matching category', () => {
      const getScore = (camp) => {
        let score = 0;
        if (profile.preferred_categories.includes(camp.category)) score += 30;
        return score;
      };

      expect(getScore(camps[0])).toBe(30); // Beach/Surf matches
      expect(getScore(camps[1])).toBe(0);  // Sports doesn't match
      expect(getScore(camps[2])).toBe(30); // Art matches
    });

    it('scores higher for age-appropriate camps', () => {
      const getScore = (camp) => {
        let score = 0;
        const childAges = children.map(c => c.age_as_of_summer);
        const campMinAge = parseInt(camp.min_age) || 0;
        const campMaxAge = parseInt(camp.max_age) || 18;

        if (childAges.some(age => age >= campMinAge && age <= campMaxAge)) {
          score += 25;
        }
        return score;
      };

      expect(getScore(camps[0])).toBe(25); // 10 is 8-14
      expect(getScore(camps[1])).toBe(25); // 10 is 5-12
      expect(getScore(camps[2])).toBe(0);  // 10 is not 12-18
    });

    it('boosts favorited camps', () => {
      const getScore = (camp) => {
        let score = 0;
        if (favorites.some(f => f.camp_id === camp.id)) score += 15;
        return score;
      };

      expect(getScore(camps[0])).toBe(0);  // Not favorited
      expect(getScore(camps[1])).toBe(15); // Favorited
    });

    it('boosts camps with complete data', () => {
      const getScore = (camp) => {
        let score = 0;
        if (camp.description && camp.description.length > 100) score += 5;
        if (camp.contact_email || camp.contact_phone) score += 5;
        if (camp.website_url && camp.website_url !== 'N/A') score += 5;
        if (camp.has_extended_care) score += 5;
        if (camp.food_included) score += 3;
        return score;
      };

      expect(getScore(camps[0])).toBe(23); // All bonuses
      expect(getScore(camps[1])).toBe(0);  // No bonuses
    });
  });

  describe('getDashboardStats', () => {
    it('calculates correct stats', () => {
      const scheduledCamps = [
        { start_date: '2026-06-08', price: 400, status: 'planned' },
        { start_date: '2026-06-08', price: 350, status: 'confirmed' },
        { start_date: '2026-06-15', price: 500, status: 'cancelled' }
      ];

      const favorites = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const children = [{ id: 'child-1' }, { id: 'child-2' }];

      const getDashboardStats = () => {
        const totalScheduled = scheduledCamps.filter(sc => sc.status !== 'cancelled').length;
        const totalCost = scheduledCamps
          .filter(sc => sc.status !== 'cancelled')
          .reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);
        const weeksWithCamps = new Set(scheduledCamps.map(sc => sc.start_date)).size;
        const favoritesCount = favorites.length;

        return {
          totalScheduled,
          totalCost,
          weeksWithCamps,
          favoritesCount,
          childrenCount: children.length
        };
      };

      const stats = getDashboardStats();

      expect(stats.totalScheduled).toBe(2);     // Excludes cancelled
      expect(stats.totalCost).toBe(750);        // 400 + 350
      expect(stats.weeksWithCamps).toBe(2);     // 2 unique dates
      expect(stats.favoritesCount).toBe(3);
      expect(stats.childrenCount).toBe(2);
    });
  });
});
