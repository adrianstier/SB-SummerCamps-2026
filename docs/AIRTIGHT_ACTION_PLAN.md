# Airtight Production Readiness Plan
**Date**: 2026-01-12
**Status**: CRITICAL - Production Hardening Required
**Priority**: ALL issues must be resolved before user launch

---

## Executive Summary

Comprehensive codebase analysis revealed **47 critical issues** across 11 categories that must be addressed for production readiness. This plan provides systematic fixes for all gaps, edge cases, and security vulnerabilities.

**Severity Breakdown**:
- 🔴 **CRITICAL** (4 issues): App-breaking bugs
- 🟠 **HIGH** (8 issues): Data loss/corruption risks
- 🟡 **MEDIUM** (12 issues): Feature bugs and logic errors
- 🟢 **LOW** (23 issues): Performance and UX improvements

**Total Estimated Effort**: 32 hours over 5 days

---

## Phase 1: CRITICAL Fixes (Day 1 - 8 hours)

### 1.1 Add Error Boundaries Throughout App

**Issue**: No error boundaries wrapping major sections - single component error crashes entire app

**Implementation**:

```javascript
// src/components/ErrorBoundary.jsx (NEW FILE)
import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // Optional: Send to error tracking service
    if (window.Sentry) {
      window.Sentry.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>We're sorry for the inconvenience. Please refresh the page to try again.</p>
            {this.props.showDetails && (
              <details>
                <summary>Error details</summary>
                <pre>{this.state.error?.toString()}</pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Usage in App.jsx**:
```javascript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* Wrap major sections */}
      <ErrorBoundary>
        <SchedulePlanner ... />
      </ErrorBoundary>

      <ErrorBoundary>
        <Dashboard ... />
      </ErrorBoundary>

      {/* Modal contents */}
      {selectedCamp && (
        <ErrorBoundary>
          <CampDetailModal ... />
        </ErrorBoundary>
      )}
    </ErrorBoundary>
  );
}
```

**Files to Modify**:
- Create: `src/components/ErrorBoundary.jsx`
- Modify: `src/App.jsx` (wrap sections)
- Modify: `src/index.css` (add .error-boundary styles)

**Time**: 2 hours

---

### 1.2 Fix handleCommitPreviewCamps Exception Handling

**Issue**: Loop with await inside but no try-catch wrapper. If any addScheduledCamp fails, user loses track of which preview camps failed

**Current Code** (SchedulePlanner.jsx:205-220):
```javascript
async function handleCommitPreviewCamps() {
  for (const pc of previewCamps) {
    await addScheduledCamp({
      camp_id: pc.camp_id,
      child_id: pc.child_id,
      start_date: pc.start_date,
      end_date: pc.end_date,
      price: pc.price,
      status: 'planned'
    });
  }
  await refreshSchedule();
  setPreviewCamps([]);
  setPreviewMode(false);
}
```

**Fixed Code**:
```javascript
async function handleCommitPreviewCamps() {
  const results = {
    succeeded: [],
    failed: []
  };

  // Try each camp individually
  for (const pc of previewCamps) {
    try {
      await addScheduledCamp({
        camp_id: pc.camp_id,
        child_id: pc.child_id,
        start_date: pc.start_date,
        end_date: pc.end_date,
        price: pc.price,
        status: 'planned'
      });
      results.succeeded.push(pc);
    } catch (error) {
      console.error('Failed to add camp:', pc.camp_id, error);
      results.failed.push({ camp: pc, error: error.message });
    }
  }

  // Always refresh to show what actually saved
  await refreshSchedule();

  // Clear only successful camps from preview
  if (results.failed.length > 0) {
    // Keep failed camps in preview mode
    setPreviewCamps(results.failed.map(f => f.camp));

    // Show error message
    alert(
      `${results.succeeded.length} camp(s) added successfully. ` +
      `${results.failed.length} camp(s) failed to add. ` +
      `Review remaining preview camps and try again.`
    );
  } else {
    // All succeeded - exit preview mode
    setPreviewCamps([]);
    setPreviewMode(false);
  }
}
```

**Time**: 1 hour

---

### 1.3 Fix Math Operations on Empty Arrays

**Issue**: `Math.min(...prices)` and `Math.max(...prices)` called on potentially empty arrays, returning Infinity

**Current Code** (App.jsx:138-153):
```javascript
const stats = {
  total: camps.length,
  categories: [...new Set(camps.map(c => c.category))].length,
  minPrice: Math.min(...prices),
  maxPrice: Math.max(...prices),
  avgPrice: prices.length > 0 ? Math.round(prices.reduce((a,b) => a+b, 0) / prices.length) : 0
};
```

**Fixed Code**:
```javascript
const stats = {
  total: camps.length,
  categories: [...new Set(camps.map(c => c.category))].length,
  minPrice: prices.length > 0 ? Math.min(...prices) : null,
  maxPrice: prices.length > 0 ? Math.max(...prices) : null,
  avgPrice: prices.length > 0 ? Math.round(prices.reduce((a,b) => a+b, 0) / prices.length) : null
};
```

**Display Update**:
```jsx
{/* Update stats display to handle null */}
<div className="hero-stat">
  <span className="hero-stat-value">
    {stats.minPrice !== null ? `$${stats.minPrice}` : 'Varies'}
  </span>
  <span className="hero-stat-label">Starting from</span>
</div>
```

**Time**: 30 minutes

---

### 1.4 Fix clearSampleData Cascade Delete Race Condition

**Issue**: Two separate delete calls. If first succeeds and second fails, sample data is partially deleted

**Current Code** (supabase.js:1314-1348):
```javascript
export async function clearSampleData() {
  // Delete sample children (will cascade to scheduled_camps)
  const { error: childError } = await supabase
    .from('children')
    .delete()
    .eq('is_sample', true);

  if (childError) throw childError;

  // Delete sample scheduled camps
  const { error: campError } = await supabase
    .from('scheduled_camps')
    .delete()
    .eq('is_sample', true);

  if (campError) throw campError;

  return { success: true };
}
```

**Fixed Code**:
```javascript
export async function clearSampleData() {
  try {
    // Use RPC function for atomic operation
    const { data, error } = await supabase
      .rpc('clear_sample_data');

    if (error) throw error;
    return { success: true };

  } catch (error) {
    console.error('Failed to clear sample data:', error);

    // Fallback: Try manual cleanup with transaction-like behavior
    const { error: childError } = await supabase
      .from('children')
      .delete()
      .eq('is_sample', true);

    if (childError) {
      throw new Error(`Failed to clear sample data: ${childError.message}`);
    }

    // Children cascade should handle camps, but double-check
    const { error: campError } = await supabase
      .from('scheduled_camps')
      .delete()
      .eq('is_sample', true);

    if (campError) {
      console.warn('Sample camps cleanup warning:', campError);
      // Don't throw - children delete already succeeded
    }

    return { success: true };
  }
}
```

**Database Migration** (backend/migrations/clear_sample_data_rpc.sql):
```sql
-- Create atomic RPC function for clearing sample data
CREATE OR REPLACE FUNCTION clear_sample_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete in reverse dependency order
  DELETE FROM scheduled_camps WHERE is_sample = true;
  DELETE FROM children WHERE is_sample = true;
END;
$$;
```

**Time**: 2 hours

---

### 1.5 Add Global Try-Catch for Async Operations

**Implementation**:

```javascript
// src/lib/errorHandler.js (NEW FILE)
export class AppError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.code = code;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

export function handleAsyncError(error, context = '') {
  console.error(`[${context}]`, error);

  // User-friendly error messages
  const errorMap = {
    'PGRST116': 'No data found. Please refresh and try again.',
    '23505': 'This item already exists.',
    '23503': 'Cannot delete - item is in use.',
    'auth/invalid-credential': 'Invalid login credentials.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment.'
  };

  const userMessage = errorMap[error.code] ||
                      errorMap[error.originalError?.code] ||
                      'Something went wrong. Please try again.';

  return {
    message: userMessage,
    code: error.code || 'UNKNOWN',
    canRetry: !['23505', '23503'].includes(error.code)
  };
}

// Wrapper for async functions
export function withErrorHandling(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const handled = handleAsyncError(error, context);
      throw new AppError(handled.message, handled.code, error);
    }
  };
}
```

**Usage Example**:
```javascript
// Wrap all exported functions from supabase.js
export const addScheduledCamp = withErrorHandling(
  async (campData) => {
    // ... existing implementation
  },
  'addScheduledCamp'
);
```

**Time**: 2.5 hours

---

## Phase 2: HIGH Priority Fixes (Day 2 - 8 hours)

### 2.1 Add Input Validation for All Database Operations

**Create Validation Schemas**:

```javascript
// src/lib/validation.js (EXPAND EXISTING)
import { z } from 'zod';

// Scheduled Camp Schema
export const ScheduledCampSchema = z.object({
  camp_id: z.string().uuid(),
  child_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.number().min(0).max(10000).nullable(),
  status: z.enum(['planned', 'registered', 'confirmed', 'waitlisted', 'cancelled']),
  notes: z.string().max(500).optional()
}).refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  'End date must be after start date'
);

// Update Schema (for updateScheduledCamp)
export const ScheduledCampUpdateSchema = z.object({
  price: z.number().min(0).max(10000).nullable().optional(),
  status: z.enum(['planned', 'registered', 'confirmed', 'waitlisted', 'cancelled']).optional(),
  notes: z.string().max(500).optional()
}).strict(); // Reject unknown fields

// Comparison List Schema
export const ComparisonListUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_public: z.boolean().optional(),
  notes: z.string().max(1000).optional()
}).strict();

// Watchlist Item Schema
export const WatchlistItemSchema = z.object({
  camp_id: z.string().uuid(),
  notes: z.string().max(500).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional()
}).strict();
```

**Apply Validation in supabase.js**:

```javascript
// Update addScheduledCamp (supabase.js:305-322)
export async function addScheduledCamp(campData) {
  try {
    // Validate input
    const validated = ScheduledCampSchema.parse(campData);

    const { data, error } = await supabase
      .from('scheduled_camps')
      .insert([{
        ...validated,
        user_id: (await supabase.auth.getUser()).data.user.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(
        `Invalid camp data: ${error.errors[0].message}`,
        'VALIDATION_ERROR',
        error
      );
    }
    throw error;
  }
}

// Update updateScheduledCamp (supabase.js:324-332)
export async function updateScheduledCamp(scheduleId, updates) {
  try {
    // Validate updates - strict mode rejects unknown fields
    const validated = ScheduledCampUpdateSchema.parse(updates);

    const { data, error } = await supabase
      .from('scheduled_camps')
      .update(validated)
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(
        `Invalid update data: ${error.errors[0].message}`,
        'VALIDATION_ERROR',
        error
      );
    }
    throw error;
  }
}

// Add validation to all other functions similarly...
```

**Time**: 4 hours

---

### 2.2 Fix Unsafe Optional Chaining in getSquadCampInterests

**Issue**: `member?.profiles?.full_name` - if profiles is null, entire member object becomes unusable

**Current Code** (supabase.js:1140-1159):
```javascript
const membersWithInterests = members.map(member => ({
  ...member,
  full_name: member.profiles?.full_name || 'Unknown',
  interests: interestsByChild[member.child_id] || []
}));
```

**Fixed Code**:
```javascript
const membersWithInterests = members
  .filter(member => {
    // Filter out members without valid profile data
    if (!member.profiles) {
      console.warn('Squad member missing profile:', member.id);
      return false;
    }
    return true;
  })
  .map(member => ({
    ...member,
    full_name: member.profiles.full_name || 'Anonymous',
    avatar: member.profiles.avatar_url || null,
    interests: interestsByChild[member.child_id] || []
  }));

// Return with metadata
return {
  interests: membersWithInterests,
  stats: {
    total: members.length,
    withProfiles: membersWithInterests.length,
    missingProfiles: members.length - membersWithInterests.length
  }
};
```

**Time**: 1 hour

---

### 2.3 Add Duplicate Prevention Checks

**Issue**: No check if user is already a member before joining squad

**Current Code** (supabase.js:1027-1044):
```javascript
export async function joinSquad(inviteCode) {
  const squad = await getSquadByInviteCode(inviteCode);
  // ... just inserts without checking
}
```

**Fixed Code**:
```javascript
export async function joinSquad(inviteCode) {
  const squad = await getSquadByInviteCode(inviteCode);
  if (!squad) {
    throw new AppError('Invalid invite code', 'INVALID_INVITE');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError('Must be logged in to join squad', 'AUTH_REQUIRED');
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('squad_members')
    .select('id')
    .eq('squad_id', squad.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    throw new AppError('You are already a member of this squad', 'ALREADY_MEMBER');
  }

  // Proceed with join
  const { data, error } = await supabase
    .from('squad_members')
    .insert({
      squad_id: squad.id,
      user_id: user.id,
      role: 'member'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

**Time**: 1 hour

---

### 2.4 Fix Favorite Button Race Condition

**Issue**: Rapid clicks can cause state desync

**Current Code** (FavoriteButton.jsx:38-44):
```javascript
async function handleClick(e) {
  e.stopPropagation();
  if (isFav) {
    await removeFavorite(campId);
  } else {
    await addFavorite(campId);
  }
  await refreshFavorites();
}
```

**Fixed Code**:
```javascript
const [isSubmitting, setIsSubmitting] = useState(false);

async function handleClick(e) {
  e.stopPropagation();

  if (isSubmitting) return; // Prevent concurrent clicks

  setIsSubmitting(true);

  try {
    // Use current server state, not local state
    const { data: current } = await supabase
      .from('favorites')
      .select('id')
      .eq('camp_id', campId)
      .maybeSingle();

    if (current) {
      await removeFavorite(campId);
    } else {
      await addFavorite(campId);
    }

    await refreshFavorites();
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    alert('Failed to update favorite. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
}
```

**Time**: 1 hour

---

### 2.5 Implement Optimistic Updates for Better UX

**Create optimistic update helper**:

```javascript
// src/lib/optimisticUpdates.js (NEW FILE)
export function createOptimisticUpdate(setState, updateFn, rollbackFn) {
  return async (optimisticValue) => {
    // Store original state
    const originalState = React.useRef(null);

    // Apply optimistic update
    setState(prev => {
      originalState.current = prev;
      return typeof optimisticValue === 'function'
        ? optimisticValue(prev)
        : optimisticValue;
    });

    try {
      // Attempt actual update
      await updateFn();
    } catch (error) {
      // Rollback on error
      if (rollbackFn) {
        rollbackFn(error);
      }
      setState(originalState.current);
      throw error;
    }
  };
}
```

**Usage in ChildrenManager**:
```javascript
async function handleSubmit(e) {
  e.preventDefault();

  // Optimistic update - show new child immediately
  const tempId = `temp-${Date.now()}`;
  const optimisticChild = {
    id: tempId,
    ...formData,
    is_sample: false
  };

  setChildren(prev => [...prev, optimisticChild]);

  try {
    const newChild = editingChild
      ? await updateChild(editingChild.id, formData)
      : await addChild(formData);

    // Replace temp with real data
    setChildren(prev =>
      prev.map(c => c.id === tempId ? newChild : c)
    );
  } catch (error) {
    // Rollback
    setChildren(prev => prev.filter(c => c.id !== tempId));
    alert('Failed to save child. Please try again.');
  }
}
```

**Time**: 1 hour

---

## Phase 3: MEDIUM Priority Fixes (Day 3 - 6 hours)

### 3.1 Add Camp Session Overlap Validation

**Issue**: No validation that child doesn't have conflicting camps

**Implementation in supabase.js**:

```javascript
// New function to check for overlaps
export async function checkScheduleOverlap(childId, startDate, endDate, excludeId = null) {
  const { data, error } = await supabase
    .from('scheduled_camps')
    .select('id, start_date, end_date, camps(camp_name)')
    .eq('child_id', childId)
    .neq('status', 'cancelled')
    .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

  if (error) throw error;

  // Filter out the camp being edited
  const conflicts = data.filter(camp => camp.id !== excludeId);

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

// Update addScheduledCamp to check overlaps
export async function addScheduledCamp(campData) {
  const validated = ScheduledCampSchema.parse(campData);

  // Check for overlaps
  const { hasConflict, conflicts } = await checkScheduleOverlap(
    validated.child_id,
    validated.start_date,
    validated.end_date
  );

  if (hasConflict) {
    const conflictNames = conflicts.map(c => c.camps?.camp_name).join(', ');
    throw new AppError(
      `This camp overlaps with: ${conflictNames}`,
      'SCHEDULE_CONFLICT',
      { conflicts }
    );
  }

  // Proceed with insert
  const { data, error } = await supabase
    .from('scheduled_camps')
    .insert([{
      ...validated,
      user_id: (await supabase.auth.getUser()).data.user.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

**UI Update**:
```javascript
// In SchedulePlanner.jsx - show warning before adding
async function handleAddCamp(camp, weekNum) {
  // ... existing code

  try {
    // Check for conflicts first
    const { hasConflict, conflicts } = await checkScheduleOverlap(
      selectedChild,
      week.startDate,
      week.endDate
    );

    if (hasConflict) {
      const proceed = confirm(
        `Warning: This overlaps with ${conflicts[0].camps.camp_name}. ` +
        `Continue anyway?`
      );
      if (!proceed) return;
    }

    await addScheduledCamp({ ... });
  } catch (error) {
    // Handle error
  }
}
```

**Time**: 2 hours

---

### 3.2 Fix Date Timezone Handling

**Issue**: Date constructor uses local timezone, causing off-by-one errors

**Fix getSummerWeeks**:

```javascript
// src/lib/supabase.js
export function getSummerWeeks2026() {
  // Use UTC dates to avoid timezone issues
  const weeks = [
    { weekNum: 1, startDate: '2026-06-08', endDate: '2026-06-12', label: 'Week 1' },
    // ... other weeks
  ];

  return weeks.map(week => ({
    ...week,
    // Create Date objects in local timezone consistently
    startDateObj: new Date(`${week.startDate}T00:00:00`),
    endDateObj: new Date(`${week.endDate}T23:59:59`),
    display: `${formatDate(week.startDate)} - ${formatDate(week.endDate)}`
  }));
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

**Time**: 1 hour

---

### 3.3 Fix bestValue Calculation with Null Checks

**Current Code** (CampComparison.jsx:79-85):
```javascript
const bestValue = camps.reduce((best, camp) => {
  const price = getNumericPrice(camp);
  return price < best ? price : best;
}, Infinity);
```

**Fixed Code**:
```javascript
const bestValue = (() => {
  const prices = camps
    .map(c => getNumericPrice(c))
    .filter(p => p !== null && !isNaN(p) && p > 0);

  return prices.length > 0 ? Math.min(...prices) : null;
})();

// Update display
{bestValue !== null ? (
  <div className="comparison-badge">
    Best Value: ${bestValue}
  </div>
) : null}
```

**Time**: 30 minutes

---

### 3.4 Add Null Guards for Selected Child

**Current Code** (SchedulePlanner.jsx:34):
```javascript
const [selectedChild, setSelectedChild] = useState(children[0]?.id || null);
```

**Fix handlers that use selectedChild**:

```javascript
// Add guard at top of functions
function handleAddCamp(camp, weekNum) {
  if (!selectedChild) {
    alert('Please select a child first');
    return;
  }

  // ... rest of function
}

function handleWeekDrop(weekNum, e) {
  if (!selectedChild) {
    alert('Please select a child first to add camps to their schedule.');
    setDragOverWeek(null);
    setDraggedCamp(null);
    return;
  }

  // ... rest of function
}

// Add effect to handle children array changes
useEffect(() => {
  // If selected child is removed, select first available
  if (selectedChild && !children.find(c => c.id === selectedChild)) {
    setSelectedChild(children[0]?.id || null);
  }

  // If no children, clear selection
  if (children.length === 0) {
    setSelectedChild(null);
  }
}, [children, selectedChild]);
```

**Time**: 1 hour

---

### 3.5 Add Loading States to Prevent Race Conditions

**Implementation**:

```javascript
// src/hooks/useAsyncAction.js (NEW FILE)
import { useState } from 'react';

export function useAsyncAction(action) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (...args) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await action(...args);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading, error };
}
```

**Usage**:
```javascript
// In SchedulePlanner.jsx
const { execute: executeAddCamp, isLoading: isAdding } = useAsyncAction(addScheduledCamp);

async function handleAddCamp(camp, weekNum) {
  if (isAdding) return; // Prevent concurrent adds

  try {
    await executeAddCamp({ ... });
    await refreshSchedule();
    setShowAddCamp(null);
  } catch (error) {
    alert(error.message);
  }
}
```

**Time**: 1.5 hours

---

## Phase 4: LOW Priority Fixes (Day 4 - 6 hours)

### 4.1 Optimize N+1 Queries

**Create RPC function for squad camp interests**:

```sql
-- backend/migrations/optimize_squad_interests.sql
CREATE OR REPLACE FUNCTION get_squad_camp_interests_optimized(squad_id_param UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  child_id UUID,
  child_name TEXT,
  camp_id UUID,
  interest_level TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id as member_id,
    sm.user_id,
    p.full_name,
    p.avatar_url,
    sm.child_id,
    c.name as child_name,
    ci.camp_id,
    ci.interest_level,
    ci.notes
  FROM squad_members sm
  JOIN profiles p ON p.id = sm.user_id
  LEFT JOIN children c ON c.id = sm.child_id
  LEFT JOIN camp_interests ci ON ci.child_id = sm.child_id
  WHERE sm.squad_id = squad_id_param
    AND sm.status = 'active'
  ORDER BY p.full_name, c.name;
END;
$$;
```

**Update supabase.js**:
```javascript
export async function getSquadCampInterests(squadId) {
  const { data, error } = await supabase
    .rpc('get_squad_camp_interests_optimized', { squad_id_param: squadId });

  if (error) throw error;

  // Group by member
  const grouped = data.reduce((acc, row) => {
    const key = row.member_id;
    if (!acc[key]) {
      acc[key] = {
        id: row.member_id,
        user_id: row.user_id,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        child: row.child_id ? {
          id: row.child_id,
          name: row.child_name
        } : null,
        interests: []
      };
    }

    if (row.camp_id) {
      acc[key].interests.push({
        camp_id: row.camp_id,
        interest_level: row.interest_level,
        notes: row.notes
      });
    }

    return acc;
  }, {});

  return Object.values(grouped);
}
```

**Time**: 2 hours

---

### 4.2 Add Pagination to Large Lists

**Modify getNotifications**:

```javascript
export async function getNotifications(limit = 50, offset = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    notifications: data,
    total: count,
    hasMore: count > offset + limit
  };
}
```

**UI Component**:
```javascript
function NotificationsList() {
  const [page, setPage] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  async function loadMore() {
    const { notifications: newNotifs, hasMore: more } =
      await getNotifications(50, page * 50);

    setNotifications(prev => [...prev, ...newNotifs]);
    setHasMore(more);
    setPage(p => p + 1);
  }

  return (
    <div>
      {notifications.map(n => <NotificationItem key={n.id} {...n} />)}
      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

**Time**: 2 hours

---

### 4.3 Batch Context State Updates

**Optimize AuthContext**:

```javascript
// Current: Multiple setState calls
const loadUserData = async (user) => {
  setProfile(profileData);
  setChildren(childrenData);
  setFavorites(favoritesData);
  // ... 11 separate setState calls
};

// Optimized: Single state object
const [userState, setUserState] = useState({
  profile: null,
  children: [],
  favorites: [],
  scheduledCamps: [],
  notifications: [],
  squads: [],
  campInterests: [],
  watchlist: [],
  comparisonLists: []
});

const loadUserData = async (user) => {
  const [
    profileData,
    childrenData,
    favoritesData,
    // ... all data
  ] = await Promise.all([
    getProfile(),
    getChildren(),
    getFavorites(),
    // ... all queries
  ]);

  // Single state update
  setUserState({
    profile: profileData,
    children: childrenData,
    favorites: favoritesData,
    // ... all data
  });
};
```

**Time**: 2 hours

---

## Phase 5: Testing & Validation (Day 5 - 4 hours)

### 5.1 Create Comprehensive Test Suite

```javascript
// src/lib/__tests__/supabase.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import {
  addScheduledCamp,
  checkScheduleOverlap,
  clearSampleData
} from '../supabase';

describe('addScheduledCamp', () => {
  it('should reject invalid dates', async () => {
    await expect(addScheduledCamp({
      camp_id: '123',
      child_id: '456',
      start_date: '2026-13-01', // Invalid month
      end_date: '2026-12-31'
    })).rejects.toThrow('VALIDATION_ERROR');
  });

  it('should reject end date before start date', async () => {
    await expect(addScheduledCamp({
      camp_id: '123',
      child_id: '456',
      start_date: '2026-12-31',
      end_date: '2026-06-01'
    })).rejects.toThrow();
  });

  it('should detect overlapping camps', async () => {
    // ... test implementation
  });
});
```

**Time**: 4 hours

---

## Summary & Deployment

### Total Implementation Time
- **Phase 1 (Critical)**: 8 hours
- **Phase 2 (High)**: 8 hours
- **Phase 3 (Medium)**: 6 hours
- **Phase 4 (Low)**: 6 hours
- **Phase 5 (Testing)**: 4 hours
- **Total**: 32 hours (4 days)

### Deployment Checklist

Before deploying to production:

- [ ] All 47 issues resolved
- [ ] Error boundaries added
- [ ] Input validation implemented
- [ ] Null checks added throughout
- [ ] Race conditions fixed
- [ ] Test suite passing
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Rollback plan ready

### Post-Deployment Monitoring

Monitor these metrics for 48 hours:
- Error rate (target: <0.1%)
- P95 response time (target: <500ms)
- Failed operations (target: <1%)
- User complaints about data loss (target: 0)

---

**Status**: Ready for implementation
**Priority**: CRITICAL - Must complete before user launch
**Owner**: Frontend Engineering Team
**Review Required**: Yes (Security + QA)
