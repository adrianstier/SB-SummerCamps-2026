import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function CostDashboard({ camps, onClose }) {
  const { profile, children, scheduledCamps } = useAuth();

  const budget = profile?.summer_budget || 0;

  // Calculate detailed cost breakdown
  const costBreakdown = useMemo(() => {
    const activeSchedules = scheduledCamps.filter(sc => sc.status !== 'cancelled');

    // Total cost
    const total = activeSchedules.reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);

    // Per-child breakdown
    const byChild = {};
    children.forEach(child => {
      const childSchedules = activeSchedules.filter(sc => sc.child_id === child.id);
      const childTotal = childSchedules.reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);
      const weeks = new Set(childSchedules.map(sc => sc.start_date)).size;

      byChild[child.id] = {
        name: child.name,
        color: child.color,
        total: childTotal,
        weeks,
        camps: childSchedules.length,
        avgPerWeek: weeks > 0 ? childTotal / weeks : 0
      };
    });

    // Per-week breakdown
    const byWeek = {};
    activeSchedules.forEach(sc => {
      const weekKey = sc.start_date;
      if (!byWeek[weekKey]) {
        byWeek[weekKey] = { date: weekKey, camps: [], total: 0 };
      }
      byWeek[weekKey].camps.push(sc);
      byWeek[weekKey].total += parseFloat(sc.price) || 0;
    });

    // FSA eligible (check camp data)
    let fsaEligible = 0;
    activeSchedules.forEach(sc => {
      const camp = camps.find(c => c.id === sc.camp_id);
      if (camp?.fsa_eligible) {
        fsaEligible += parseFloat(sc.price) || 0;
      }
    });

    // Status breakdown
    const byStatus = {
      planned: activeSchedules.filter(sc => sc.status === 'planned'),
      registered: activeSchedules.filter(sc => sc.status === 'registered'),
      confirmed: activeSchedules.filter(sc => sc.status === 'confirmed'),
      waitlisted: activeSchedules.filter(sc => sc.status === 'waitlisted')
    };

    const plannedCost = byStatus.planned.reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);
    const confirmedCost = byStatus.confirmed.reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);
    const registeredCost = byStatus.registered.reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);

    return {
      total,
      byChild,
      byWeek: Object.values(byWeek).sort((a, b) => a.date.localeCompare(b.date)),
      fsaEligible,
      byStatus,
      plannedCost,
      confirmedCost,
      registeredCost,
      remaining: budget > 0 ? budget - total : null,
      percentUsed: budget > 0 ? (total / budget) * 100 : null
    };
  }, [scheduledCamps, children, camps, budget]);

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--earth-200)' }}>
          <div>
            <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--earth-800)' }}>
              Summer Budget
            </h2>
            <p className="text-sm" style={{ color: 'var(--earth-500)' }}>
              Track your summer camp spending
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Total Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--sage-50)' }}>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--sage-600)' }}>Total Cost</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--sage-800)' }}>
                {formatCurrency(costBreakdown.total)}
              </p>
            </div>

            {budget > 0 && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: costBreakdown.remaining >= 0 ? 'var(--earth-50)' : '#fef2f2' }}>
                <p className="text-sm font-medium mb-1" style={{ color: costBreakdown.remaining >= 0 ? 'var(--earth-600)' : '#dc2626' }}>
                  {costBreakdown.remaining >= 0 ? 'Remaining' : 'Over Budget'}
                </p>
                <p className="text-2xl font-bold" style={{ color: costBreakdown.remaining >= 0 ? 'var(--earth-800)' : '#dc2626' }}>
                  {formatCurrency(Math.abs(costBreakdown.remaining))}
                </p>
              </div>
            )}

            {costBreakdown.fsaEligible > 0 && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#eff6ff' }}>
                <p className="text-sm font-medium mb-1" style={{ color: '#2563eb' }}>FSA Eligible</p>
                <p className="text-2xl font-bold" style={{ color: '#1d4ed8' }}>
                  {formatCurrency(costBreakdown.fsaEligible)}
                </p>
              </div>
            )}
          </div>

          {/* Budget Progress Bar */}
          {budget > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: 'var(--earth-600)' }}>Budget Progress</span>
                <span style={{ color: 'var(--earth-600)' }}>
                  {formatCurrency(costBreakdown.total)} of {formatCurrency(budget)}
                </span>
              </div>
              <div
                className="h-3 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--earth-200)' }}
                role="progressbar"
                aria-valuenow={Math.round(Math.min(costBreakdown.percentUsed, 100))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Budget usage"
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(costBreakdown.percentUsed, 100)}%`,
                    backgroundColor: costBreakdown.percentUsed > 100 ? '#ef4444' :
                      costBreakdown.percentUsed > 80 ? '#f59e0b' : 'var(--sage-500)'
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--earth-500)' }}>
                {Math.round(costBreakdown.percentUsed)}% of budget used
              </p>
            </div>
          )}

          {/* Status Breakdown */}
          <div>
            <h3 className="font-medium mb-3" style={{ color: 'var(--earth-800)' }}>By Status</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Confirmed', count: costBreakdown.byStatus.confirmed.length, cost: costBreakdown.confirmedCost, color: '#10b981' },
                { label: 'Registered', count: costBreakdown.byStatus.registered.length, cost: costBreakdown.registeredCost, color: '#3b82f6' },
                { label: 'Planned', count: costBreakdown.byStatus.planned.length, cost: costBreakdown.plannedCost, color: '#6b7280' },
                { label: 'Waitlisted', count: costBreakdown.byStatus.waitlisted.length, cost: 0, color: '#f59e0b' }
              ].map(status => (
                <div key={status.label} className="p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--earth-700)' }}>{status.label}</span>
                  </div>
                  <p className="text-lg font-semibold" style={{ color: 'var(--earth-800)' }}>
                    {status.count} camps
                  </p>
                  {status.cost > 0 && (
                    <p className="text-sm" style={{ color: 'var(--earth-500)' }}>
                      {formatCurrency(status.cost)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Per-Child Breakdown */}
          {Object.keys(costBreakdown.byChild).length > 0 && (
            <div>
              <h3 className="font-medium mb-3" style={{ color: 'var(--earth-800)' }}>By Child</h3>
              <div className="space-y-3">
                {Object.values(costBreakdown.byChild).map(child => (
                  <div key={child.name} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: child.color }}
                    >
                      {child.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: 'var(--earth-800)' }}>{child.name}</p>
                      <p className="text-sm" style={{ color: 'var(--earth-500)' }}>
                        {child.camps} camp{child.camps !== 1 ? 's' : ''} over {child.weeks} week{child.weeks !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" style={{ color: 'var(--earth-800)' }}>
                        {formatCurrency(child.total)}
                      </p>
                      {child.weeks > 0 && (
                        <p className="text-sm" style={{ color: 'var(--earth-500)' }}>
                          {formatCurrency(child.avgPerWeek)}/week
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Breakdown */}
          {costBreakdown.byWeek.length > 0 && (
            <div>
              <h3 className="font-medium mb-3" style={{ color: 'var(--earth-800)' }}>By Week</h3>
              <div className="space-y-2">
                {costBreakdown.byWeek.map(week => (
                  <div key={week.date} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium" style={{ color: 'var(--earth-800)' }}>
                        Week of {formatDate(week.date)}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--earth-500)' }}>
                        {week.camps.length} camp{week.camps.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--earth-800)' }}>
                      {formatCurrency(week.total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {scheduledCamps.filter(sc => sc.status !== 'cancelled').length === 0 && (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p style={{ color: 'var(--earth-500)' }}>No camps scheduled yet</p>
              <p className="text-sm" style={{ color: 'var(--earth-400)' }}>
                Add camps to your schedule to track costs
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--earth-200)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--earth-500)' }}>
              Costs are estimates based on camp pricing.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--accent-500)' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CostDashboard;
