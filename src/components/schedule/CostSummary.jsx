import { memo } from 'react';
import { XIcon } from './utils';

const CostSummary = memo(function CostSummary({
  costStats,
  selectedChildData,
  onClose,
}) {
  return (
    <div className="planner-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Cost Breakdown">
      <div className="planner-modal cost-breakdown-modal" onClick={e => e.stopPropagation()}>
        <div className="planner-modal-header">
          <h2 className="planner-modal-title">Cost Breakdown</h2>
          <button onClick={onClose} className="planner-modal-close" aria-label="Close">
            <XIcon />
          </button>
        </div>
        <div className="planner-modal-content">
          <div className="cost-breakdown-summary">
            <div className="cost-summary-stat">
              <span className="cost-summary-value">${costStats.totalCost.toLocaleString()}</span>
              <span className="cost-summary-label">Total</span>
            </div>
            <div className="cost-summary-stat">
              <span className="cost-summary-value">${Math.round(costStats.avgPerWeek)}</span>
              <span className="cost-summary-label">Avg/Week</span>
            </div>
          </div>
          <div className="cost-breakdown-chart">
            {costStats.byWeek.map(week => (
              <div key={week.weekNum} className="cost-breakdown-row">
                <span className="cost-week-label">Wk {week.weekNum}</span>
                <div className="cost-bar-container">
                  <div
                    className={`cost-bar ${week.isBlocked ? 'blocked' : ''}`}
                    style={{
                      width: `${costStats.maxWeekCost > 0 ? (week.cost / costStats.maxWeekCost) * 100 : 0}%`,
                      '--bar-color': week.isBlocked ? week.blockType?.color : selectedChildData?.color
                    }}
                  />
                </div>
                <span className="cost-week-value">
                  {week.isBlocked ? week.blockType?.label : week.cost > 0 ? `$${week.cost}` : '-'}
                </span>
                <span className="cost-week-running">${week.runningTotal}</span>
              </div>
            ))}
          </div>
          <div className="cost-breakdown-legend">
            <span className="cost-legend-item">
              <span className="cost-legend-dot" style={{ background: selectedChildData?.color }} />
              Camp cost
            </span>
            <span className="cost-legend-item">
              <span className="cost-legend-line" />
              Running total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CostSummary;
