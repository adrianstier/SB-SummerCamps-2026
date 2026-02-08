import { memo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, summerWeeks } from './utils';

const WeekSelector = memo(function WeekSelector({
  currentWeekIndex,
  onSwipe,
}) {
  return (
    <div className="planner-mobile-nav">
      <button
        onClick={() => onSwipe('right')}
        disabled={currentWeekIndex === 0}
        className="planner-nav-btn"
      >
        <ChevronLeftIcon />
      </button>
      <div className="planner-nav-indicator">
        <span className="planner-nav-current">{summerWeeks[currentWeekIndex]?.label}</span>
        <span className="planner-nav-dates">{summerWeeks[currentWeekIndex]?.display}</span>
      </div>
      <button
        onClick={() => onSwipe('left')}
        disabled={currentWeekIndex === summerWeeks.length - 1}
        className="planner-nav-btn"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
});

export default WeekSelector;
