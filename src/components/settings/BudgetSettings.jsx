import { memo } from 'react';

const BUDGET_PRESETS = [2500, 5000, 7500, 10000];

/**
 * Budget configuration panel.
 *
 * @param {Object} props
 * @param {string|number} props.budget - Current budget value
 * @param {function} props.onBudgetChange - Called with new budget string
 * @param {number} props.childrenCount - Number of children (for per-child estimate)
 */
function BudgetSettings({ budget, onBudgetChange, childrenCount }) {
  return (
    <div role="tabpanel" id="panel-budget" aria-labelledby="tab-budget" className="space-y-6">
      <div>
        <h3 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>Summer Budget</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--earth-600)' }}>
          Track your total summer spend.
        </p>

        <div>
          <label htmlFor="summer-budget" className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
            Total Summer Budget
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true">$</span>
            <input
              id="summer-budget"
              type="number"
              value={budget}
              onChange={(e) => onBudgetChange(e.target.value)}
              placeholder="e.g., 5000"
              className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
              style={{ borderColor: 'var(--earth-300)' }}
            />
          </div>
        </div>

        {/* Budget presets */}
        <div className="mt-4">
          <p className="text-sm mb-2" style={{ color: 'var(--earth-600)' }}>Common budgets:</p>
          <div className="flex gap-2">
            {BUDGET_PRESETS.map(amount => (
              <button
                key={amount}
                onClick={() => onBudgetChange(amount.toString())}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  budget === amount.toString()
                    ? ''
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                style={budget === amount.toString() ? {
                  backgroundColor: 'var(--accent-100)',
                  color: 'var(--accent-700)'
                } : {}}
              >
                ${amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {childrenCount > 0 && budget && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--sage-50)' }}>
            <p className="text-sm" style={{ color: 'var(--sage-700)' }}>
              For {childrenCount} child{childrenCount > 1 ? 'ren' : ''}, that's roughly{' '}
              <strong>${Math.round(parseFloat(budget) / childrenCount).toLocaleString()}</strong> per child
              {' '}or <strong>${Math.round(parseFloat(budget) / childrenCount / 10).toLocaleString()}</strong> per week each.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(BudgetSettings);
