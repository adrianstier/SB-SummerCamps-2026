import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './CampInsights.css';

// Category colors matching the existing design system
const CATEGORY_COLORS = {
  'Beach/Surf': { bg: '#cfe9eb', fg: '#1e7578', accent: '#2d9599' },
  'Theater': { bg: '#f3e8ff', fg: '#7c3aed', accent: '#a855f7' },
  'Dance': { bg: '#fce7f3', fg: '#db2777', accent: '#ec4899' },
  'Art': { bg: '#fef3c7', fg: '#d97706', accent: '#f59e0b' },
  'Science/STEM': { bg: '#dbeafe', fg: '#2563eb', accent: '#3b82f6' },
  'Nature/Outdoor': { bg: '#dcfce7', fg: '#16a34a', accent: '#22c55e' },
  'Sports': { bg: '#ffedd5', fg: '#ea580c', accent: '#f97316' },
  'Music': { bg: '#e0e7ff', fg: '#4f46e5', accent: '#6366f1' },
  'Cooking': { bg: '#fee2e2', fg: '#dc2626', accent: '#ef4444' },
  'Faith-Based': { bg: '#f3e8ff', fg: '#7c3aed', accent: '#8b5cf6' },
  'Animals/Zoo': { bg: '#ecfccb', fg: '#65a30d', accent: '#84cc16' },
  'Multi-Activity': { bg: '#f1f5f9', fg: '#475569', accent: '#64748b' },
  'Education': { bg: '#ccfbf1', fg: '#0d9488', accent: '#14b8a6' },
  'Overnight': { bg: '#ffe4e6', fg: '#e11d48', accent: '#f43f5e' },
};

// Get numeric price from camp
function getNumericPrice(camp) {
  const minPrice = camp.price_min || camp.min_price;
  if (!minPrice) return null;
  const parsed = parseInt(minPrice);
  return isNaN(parsed) ? null : parsed;
}

// Format price
function formatPrice(amount) {
  if (amount === null || amount === undefined) return 'TBD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Extract age range
function getAgeRange(camp) {
  const minAge = parseInt(camp.min_age) || 3;
  const maxAge = parseInt(camp.max_age) || 18;
  return { min: minAge, max: maxAge };
}

export function CampInsights({ camps, onClose, onSelectCamp, onCompare }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [priceSort, setPriceSort] = useState('low');
  const [ageFilter, setAgeFilter] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { children } = useAuth();

  // Calculate stats
  const stats = useMemo(() => {
    const activeCamps = camps.filter(c => !c.is_closed);
    const prices = activeCamps.map(getNumericPrice).filter(p => p !== null);

    // Category breakdown
    const categories = {};
    activeCamps.forEach(c => {
      if (c.category) {
        categories[c.category] = (categories[c.category] || 0) + 1;
      }
    });

    // Age distribution
    const ageDistribution = {};
    for (let age = 3; age <= 18; age++) {
      ageDistribution[age] = activeCamps.filter(c => {
        const range = getAgeRange(c);
        return age >= range.min && age <= range.max;
      }).length;
    }

    // Price distribution
    const priceRanges = [
      { label: 'Under $200', min: 0, max: 199, count: 0 },
      { label: '$200-$350', min: 200, max: 350, count: 0 },
      { label: '$350-$500', min: 351, max: 500, count: 0 },
      { label: 'Over $500', min: 501, max: Infinity, count: 0 },
    ];

    activeCamps.forEach(c => {
      const price = getNumericPrice(c);
      if (price !== null) {
        const range = priceRanges.find(r => price >= r.min && price <= r.max);
        if (range) range.count++;
      }
    });

    return {
      total: activeCamps.length,
      avgPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      categories,
      categoryCount: Object.keys(categories).length,
      ageDistribution,
      priceRanges,
      withExtendedCare: activeCamps.filter(c => c.has_extended_care).length,
      withFood: activeCamps.filter(c => c.food_included).length,
    };
  }, [camps]);

  // Price-sorted camps
  const priceSortedCamps = useMemo(() => {
    return [...camps]
      .filter(c => !c.is_closed && getNumericPrice(c) !== null)
      .sort((a, b) => {
        const priceA = getNumericPrice(a);
        const priceB = getNumericPrice(b);
        return priceSort === 'low' ? priceA - priceB : priceB - priceA;
      })
      .slice(0, 15);
  }, [camps, priceSort]);

  // Camps by category for the selected category
  const categoryCamps = useMemo(() => {
    if (!selectedCategory) return [];
    return camps.filter(c => c.category === selectedCategory && !c.is_closed);
  }, [camps, selectedCategory]);

  // Age-filtered camps
  const ageFilteredCamps = useMemo(() => {
    if (ageFilter === null) return [];
    return camps.filter(c => {
      if (c.is_closed) return false;
      const range = getAgeRange(c);
      return ageFilter >= range.min && ageFilter <= range.max;
    });
  }, [camps, ageFilter]);

  // Child age quick filters
  const childAges = useMemo(() => {
    return children.map(c => ({
      name: c.name,
      age: c.age,
      color: c.color
    }));
  }, [children]);

  return (
    <div className="insights-overlay" onClick={onClose}>
      <div className="insights-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <header className="insights-header">
          <div className="insights-header-content">
            <div className="insights-title-group">
              <h1 className="insights-title">Camp Insights</h1>
              <p className="insights-subtitle">Data to help you decide</p>
            </div>
            <div className="insights-quick-stats">
              <div className="quick-stat">
                <span className="quick-stat-value">{stats.total}</span>
                <span className="quick-stat-label">camps</span>
              </div>
              <div className="quick-stat-divider" />
              <div className="quick-stat">
                <span className="quick-stat-value">{formatPrice(stats.avgPrice)}</span>
                <span className="quick-stat-label">avg price</span>
              </div>
              <div className="quick-stat-divider" />
              <div className="quick-stat">
                <span className="quick-stat-value">{stats.categoryCount}</span>
                <span className="quick-stat-label">categories</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="insights-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Tab Navigation */}
        <nav className="insights-tabs">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'price', label: 'Price', icon: '💰' },
            { id: 'ages', label: 'Ages', icon: '👶' },
            { id: 'map', label: 'Map', icon: '📍' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`insights-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="insights-tab-icon">{tab.icon}</span>
              <span className="insights-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="insights-content">
          {activeTab === 'overview' && (
            <OverviewTab
              stats={stats}
              camps={camps}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categoryCamps={categoryCamps}
              onSelectCamp={onSelectCamp}
            />
          )}

          {activeTab === 'price' && (
            <PriceTab
              stats={stats}
              camps={priceSortedCamps}
              priceSort={priceSort}
              setPriceSort={setPriceSort}
              onSelectCamp={onSelectCamp}
              onCompare={onCompare}
            />
          )}

          {activeTab === 'ages' && (
            <AgesTab
              stats={stats}
              camps={camps}
              ageFilter={ageFilter}
              setAgeFilter={setAgeFilter}
              ageFilteredCamps={ageFilteredCamps}
              childAges={childAges}
              onSelectCamp={onSelectCamp}
            />
          )}

          {activeTab === 'map' && (
            <MapTab
              camps={camps}
              mapLoaded={mapLoaded}
              setMapLoaded={setMapLoaded}
              onSelectCamp={onSelectCamp}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ stats, camps, selectedCategory, setSelectedCategory, categoryCamps, onSelectCamp }) {
  const categoryData = useMemo(() => {
    return Object.entries(stats.categories)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / stats.total) * 100),
        colors: CATEGORY_COLORS[name] || { bg: '#f1f5f9', fg: '#475569', accent: '#64748b' }
      }));
  }, [stats]);

  const totalCount = categoryData.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="insights-tab-content">
      {/* Category Donut Chart */}
      <section className="insights-section">
        <h2 className="section-title">Camp Categories</h2>
        <p className="section-subtitle">Click a category to explore</p>

        <div className="category-chart-container">
          <div className="donut-chart-wrapper">
            <DonutChart data={categoryData} total={totalCount} onSelect={setSelectedCategory} selected={selectedCategory} />
          </div>

          <div className="category-legend">
            {categoryData.map(cat => (
              <button
                key={cat.name}
                className={`legend-item ${selectedCategory === cat.name ? 'selected' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                style={{ '--cat-color': cat.colors.accent }}
              >
                <span className="legend-color" style={{ background: cat.colors.accent }} />
                <span className="legend-name">{cat.name}</span>
                <span className="legend-count">{cat.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Category Detail */}
        {selectedCategory && categoryCamps.length > 0 && (
          <div className="category-detail" style={{ '--cat-bg': CATEGORY_COLORS[selectedCategory]?.bg || '#f1f5f9' }}>
            <div className="category-detail-header">
              <h3 className="category-detail-title">{selectedCategory}</h3>
              <span className="category-detail-count">{categoryCamps.length} camps</span>
            </div>
            <div className="category-camp-grid">
              {categoryCamps.slice(0, 6).map(camp => (
                <button
                  key={camp.id}
                  className="category-camp-card"
                  onClick={() => onSelectCamp?.(camp)}
                >
                  <span className="category-camp-name">{camp.camp_name}</span>
                  <span className="category-camp-meta">
                    {camp.ages} | {formatPrice(getNumericPrice(camp))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Quick Stats Grid */}
      <section className="insights-section">
        <h2 className="section-title">At a Glance</h2>
        <div className="stats-grid">
          <div className="stat-card stat-card-teal">
            <div className="stat-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">{formatPrice(stats.minPrice)} - {formatPrice(stats.maxPrice)}</span>
              <span className="stat-card-label">Price Range</span>
            </div>
          </div>

          <div className="stat-card stat-card-coral">
            <div className="stat-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">{stats.withExtendedCare}</span>
              <span className="stat-card-label">With Extended Care</span>
            </div>
          </div>

          <div className="stat-card stat-card-sage">
            <div className="stat-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">{stats.withFood}</span>
              <span className="stat-card-label">Food Included</span>
            </div>
          </div>

          <div className="stat-card stat-card-amber">
            <div className="stat-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="stat-card-content">
              <span className="stat-card-value">{Math.max(...Object.values(stats.ageDistribution))}+</span>
              <span className="stat-card-label">Peak Age Options</span>
            </div>
          </div>
        </div>
      </section>

      {/* Price Distribution Mini Chart */}
      <section className="insights-section">
        <h2 className="section-title">Price Distribution</h2>
        <div className="price-distribution">
          {stats.priceRanges.map(range => {
            const percentage = Math.round((range.count / stats.total) * 100);
            return (
              <div key={range.label} className="price-range-bar">
                <div className="price-range-label">{range.label}</div>
                <div className="price-range-track">
                  <div
                    className="price-range-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="price-range-count">{range.count}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// Donut Chart Component (CSS-based)
function DonutChart({ data, total, onSelect, selected }) {
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Calculate segments
  let cumulativePercentage = 0;
  const segments = data.map(item => {
    const percentage = (item.count / total) * 100;
    const segment = {
      ...item,
      percentage,
      rotation: cumulativePercentage * 3.6, // 360deg / 100
      dashArray: `${percentage * 2.51327} ${251.327 - percentage * 2.51327}` // circumference = 2 * PI * 40
    };
    cumulativePercentage += percentage;
    return segment;
  });

  const activeSegment = hoveredSegment || (selected ? segments.find(s => s.name === selected) : null);

  return (
    <div className="donut-chart">
      <svg viewBox="0 0 100 100" className="donut-svg">
        {/* Background circle */}
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--sand-200)" strokeWidth="12" />

        {/* Segments */}
        {segments.map((segment, index) => {
          const isActive = activeSegment?.name === segment.name;
          return (
            <circle
              key={segment.name}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={segment.colors.accent}
              strokeWidth={isActive ? 16 : 12}
              strokeDasharray={segment.dashArray}
              strokeDashoffset={-cumulativeOffset(segments, index) * 2.51327}
              strokeLinecap="round"
              className={`donut-segment ${isActive ? 'active' : ''}`}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                cursor: 'pointer',
                transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                opacity: activeSegment && !isActive ? 0.5 : 1
              }}
              onMouseEnter={() => setHoveredSegment(segment)}
              onMouseLeave={() => setHoveredSegment(null)}
              onClick={() => onSelect?.(selected === segment.name ? null : segment.name)}
            />
          );
        })}
      </svg>

      {/* Center label */}
      <div className="donut-center">
        {activeSegment ? (
          <>
            <span className="donut-center-value" style={{ color: activeSegment.colors.fg }}>
              {activeSegment.count}
            </span>
            <span className="donut-center-label">{activeSegment.name}</span>
          </>
        ) : (
          <>
            <span className="donut-center-value">{total}</span>
            <span className="donut-center-label">Total Camps</span>
          </>
        )}
      </div>
    </div>
  );
}

function cumulativeOffset(segments, index) {
  return segments.slice(0, index).reduce((sum, s) => sum + s.percentage, 0);
}

// Price Tab Component
function PriceTab({ stats, camps, priceSort, setPriceSort, onSelectCamp, onCompare }) {
  const maxPrice = Math.max(...camps.map(getNumericPrice).filter(Boolean));

  return (
    <div className="insights-tab-content">
      <section className="insights-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Price Comparison</h2>
            <p className="section-subtitle">Weekly rates for camps</p>
          </div>
          <div className="sort-toggle">
            <button
              className={`sort-btn ${priceSort === 'low' ? 'active' : ''}`}
              onClick={() => setPriceSort('low')}
            >
              Low to High
            </button>
            <button
              className={`sort-btn ${priceSort === 'high' ? 'active' : ''}`}
              onClick={() => setPriceSort('high')}
            >
              High to Low
            </button>
          </div>
        </div>

        <div className="price-chart">
          {camps.map((camp, index) => {
            const price = getNumericPrice(camp);
            const percentage = (price / maxPrice) * 100;
            const colors = CATEGORY_COLORS[camp.category] || { accent: '#64748b' };
            const isGoodValue = price <= stats.avgPrice;

            return (
              <div
                key={camp.id}
                className="price-bar-row"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <button
                  className="price-bar-label"
                  onClick={() => onSelectCamp?.(camp)}
                >
                  <span className="price-bar-name">{camp.camp_name}</span>
                  <span className="price-bar-category" style={{ color: colors.accent }}>
                    {camp.category}
                  </span>
                </button>
                <div className="price-bar-container">
                  <div
                    className="price-bar-fill"
                    style={{
                      width: `${percentage}%`,
                      background: `linear-gradient(90deg, ${colors.accent}dd, ${colors.accent})`,
                    }}
                  >
                    {isGoodValue && (
                      <span className="value-badge" title="Below average price">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </span>
                    )}
                  </div>
                  <span className="price-bar-value">{formatPrice(price)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Average line indicator */}
        <div className="price-average-indicator">
          <div className="price-average-line" style={{ left: `${(stats.avgPrice / maxPrice) * 100}%` }}>
            <span className="price-average-label">Avg: {formatPrice(stats.avgPrice)}</span>
          </div>
        </div>
      </section>

      {/* Best Value Picks */}
      <section className="insights-section">
        <h2 className="section-title">Best Value Picks</h2>
        <p className="section-subtitle">Below-average price with extended care or food</p>
        <div className="value-picks-grid">
          {camps
            .filter(c => {
              const price = getNumericPrice(c);
              return price && price <= stats.avgPrice && (c.has_extended_care || c.food_included);
            })
            .slice(0, 4)
            .map(camp => {
              const colors = CATEGORY_COLORS[camp.category] || { bg: '#f1f5f9', accent: '#64748b' };
              return (
                <div
                  key={camp.id}
                  className="value-pick-card"
                  style={{ '--card-accent': colors.accent }}
                >
                  <div className="value-pick-header">
                    <span className="value-pick-price">{formatPrice(getNumericPrice(camp))}</span>
                    <div className="value-pick-badges">
                      {camp.has_extended_care && <span className="value-badge-mini">Ext Care</span>}
                      {camp.food_included && <span className="value-badge-mini">Food</span>}
                    </div>
                  </div>
                  <h4 className="value-pick-name">{camp.camp_name}</h4>
                  <p className="value-pick-meta">{camp.ages} | {camp.category}</p>
                  <button
                    className="value-pick-btn"
                    onClick={() => onSelectCamp?.(camp)}
                  >
                    View Details
                  </button>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}

// Ages Tab Component
function AgesTab({ stats, camps, ageFilter, setAgeFilter, ageFilteredCamps, childAges, onSelectCamp }) {
  const ages = Object.keys(stats.ageDistribution).map(Number).sort((a, b) => a - b);
  const maxCamps = Math.max(...Object.values(stats.ageDistribution));

  return (
    <div className="insights-tab-content">
      <section className="insights-section">
        <h2 className="section-title">Camps by Age</h2>
        <p className="section-subtitle">Click an age to see matching camps</p>

        {/* Child quick filters */}
        {childAges.length > 0 && (
          <div className="child-age-filters">
            <span className="child-filter-label">Quick select:</span>
            {childAges.map(child => (
              <button
                key={child.name}
                className={`child-age-btn ${ageFilter === child.age ? 'active' : ''}`}
                style={{ '--child-color': child.color }}
                onClick={() => setAgeFilter(ageFilter === child.age ? null : child.age)}
              >
                <span className="child-avatar" style={{ background: child.color }}>
                  {child.name.charAt(0)}
                </span>
                <span className="child-info">
                  <span className="child-name">{child.name}</span>
                  <span className="child-age-label">Age {child.age}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Age heatmap */}
        <div className="age-heatmap">
          {ages.map(age => {
            const count = stats.ageDistribution[age];
            const intensity = count / maxCamps;
            const isSelected = ageFilter === age;
            const hasChild = childAges.some(c => c.age === age);

            return (
              <button
                key={age}
                className={`age-cell ${isSelected ? 'selected' : ''} ${hasChild ? 'has-child' : ''}`}
                style={{
                  '--intensity': intensity,
                  '--cell-bg': `rgba(30, 117, 120, ${0.1 + intensity * 0.7})`
                }}
                onClick={() => setAgeFilter(isSelected ? null : age)}
              >
                <span className="age-cell-age">{age}</span>
                <span className="age-cell-count">{count}</span>
                {hasChild && <span className="age-cell-child-dot" />}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="age-legend">
          <span className="age-legend-item">
            <span className="age-legend-low" /> Fewer options
          </span>
          <span className="age-legend-item">
            <span className="age-legend-high" /> More options
          </span>
          {childAges.length > 0 && (
            <span className="age-legend-item">
              <span className="age-legend-child" /> Your child's age
            </span>
          )}
        </div>
      </section>

      {/* Age Range Visualization */}
      <section className="insights-section">
        <h2 className="section-title">Age Range Coverage</h2>
        <p className="section-subtitle">Visual timeline of camp age ranges</p>

        <div className="age-timeline">
          <div className="age-timeline-header">
            {ages.filter(a => a % 2 === 0 || a === 3 || a === 17 || a === 18).map(age => (
              <span key={age} className="age-timeline-label" style={{ left: `${((age - 3) / 15) * 100}%` }}>
                {age}
              </span>
            ))}
          </div>

          <div className="age-timeline-camps">
            {camps
              .filter(c => !c.is_closed)
              .slice(0, 20)
              .map(camp => {
                const range = getAgeRange(camp);
                const left = ((range.min - 3) / 15) * 100;
                const width = ((range.max - range.min) / 15) * 100;
                const colors = CATEGORY_COLORS[camp.category] || { accent: '#64748b' };
                const matchesFilter = ageFilter !== null && ageFilter >= range.min && ageFilter <= range.max;

                return (
                  <button
                    key={camp.id}
                    className={`age-timeline-bar ${matchesFilter ? 'matches' : ''}`}
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 3)}%`,
                      '--bar-color': colors.accent
                    }}
                    onClick={() => onSelectCamp?.(camp)}
                    title={`${camp.camp_name}: Ages ${range.min}-${range.max}`}
                  >
                    <span className="age-timeline-bar-name">{camp.camp_name}</span>
                  </button>
                );
              })}
          </div>
        </div>
      </section>

      {/* Filtered camps list */}
      {ageFilter !== null && ageFilteredCamps.length > 0 && (
        <section className="insights-section">
          <div className="section-header-row">
            <h2 className="section-title">Camps for Age {ageFilter}</h2>
            <span className="section-count">{ageFilteredCamps.length} camps</span>
          </div>
          <div className="filtered-camps-list">
            {ageFilteredCamps.slice(0, 8).map(camp => {
              const colors = CATEGORY_COLORS[camp.category] || { accent: '#64748b', bg: '#f1f5f9' };
              return (
                <button
                  key={camp.id}
                  className="filtered-camp-card"
                  onClick={() => onSelectCamp?.(camp)}
                >
                  <div
                    className="filtered-camp-accent"
                    style={{ background: colors.accent }}
                  />
                  <div className="filtered-camp-content">
                    <h4 className="filtered-camp-name">{camp.camp_name}</h4>
                    <p className="filtered-camp-meta">
                      {camp.ages} | {formatPrice(getNumericPrice(camp))} | {camp.category}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// Map Tab Component
function MapTab({ camps, mapLoaded, setMapLoaded, onSelectCamp }) {
  const mapRef = useRef(null);
  const [selectedCamp, setSelectedCamp] = useState(null);

  // Santa Barbara coordinates
  const SB_CENTER = { lat: 34.4208, lng: -119.6982 };

  // Camps with location data (approximate based on address)
  const campLocations = useMemo(() => {
    return camps
      .filter(c => !c.is_closed && c.address)
      .map(camp => {
        // Simple geocoding approximation for Santa Barbara area
        const address = camp.address?.toLowerCase() || '';
        let lat = SB_CENTER.lat;
        let lng = SB_CENTER.lng;

        if (address.includes('east beach') || address.includes('cabrillo')) {
          lat = 34.4152; lng = -119.6839;
        } else if (address.includes('goleta') || address.includes('ucsb')) {
          lat = 34.4359; lng = -119.8276;
        } else if (address.includes('montecito')) {
          lat = 34.4369; lng = -119.6326;
        } else if (address.includes('downtown') || address.includes('state st')) {
          lat = 34.4208; lng = -119.6982;
        } else if (address.includes('hope ranch')) {
          lat = 34.4398; lng = -119.7652;
        } else if (address.includes('carpinteria')) {
          lat = 34.3986; lng = -119.5186;
        } else if (address.includes('summerland')) {
          lat = 34.4214; lng = -119.5964;
        } else {
          // Add some variance for camps without specific location
          lat += (Math.random() - 0.5) * 0.02;
          lng += (Math.random() - 0.5) * 0.02;
        }

        return { ...camp, lat, lng };
      });
  }, [camps]);

  return (
    <div className="insights-tab-content">
      <section className="insights-section">
        <h2 className="section-title">Camp Locations</h2>
        <p className="section-subtitle">Explore camps around Santa Barbara</p>

        <div className="map-container">
          {/* Embedded OpenStreetMap via iframe */}
          <div className="map-wrapper">
            <iframe
              ref={mapRef}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=-119.95,34.35,-119.45,34.50&layer=mapnik&marker=${SB_CENTER.lat},${SB_CENTER.lng}`}
              className="map-iframe"
              title="Santa Barbara Camp Locations"
              onLoad={() => setMapLoaded(true)}
            />

            {/* Custom markers overlay */}
            <div className="map-markers-overlay">
              {campLocations.map(camp => {
                const colors = CATEGORY_COLORS[camp.category] || { accent: '#64748b' };
                // Convert lat/lng to percentage position (approximate)
                const x = ((camp.lng - (-119.95)) / ((-119.45) - (-119.95))) * 100;
                const y = ((34.50 - camp.lat) / (34.50 - 34.35)) * 100;

                return (
                  <button
                    key={camp.id}
                    className={`map-marker ${selectedCamp?.id === camp.id ? 'selected' : ''}`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      '--marker-color': colors.accent
                    }}
                    onClick={() => setSelectedCamp(selectedCamp?.id === camp.id ? null : camp)}
                    title={camp.camp_name}
                  >
                    <svg width="24" height="32" viewBox="0 0 24 32">
                      <path
                        d="M12 0C5.4 0 0 5.4 0 12c0 7.5 12 20 12 20s12-12.5 12-20c0-6.6-5.4-12-12-12z"
                        fill={colors.accent}
                      />
                      <circle cx="12" cy="12" r="5" fill="white" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected camp popup */}
          {selectedCamp && (
            <div className="map-popup">
              <button className="map-popup-close" onClick={() => setSelectedCamp(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              <h4 className="map-popup-name">{selectedCamp.camp_name}</h4>
              <p className="map-popup-address">{selectedCamp.address}</p>
              <p className="map-popup-meta">
                {selectedCamp.category} | {selectedCamp.ages} | {formatPrice(getNumericPrice(selectedCamp))}
              </p>
              <button
                className="map-popup-btn"
                onClick={() => onSelectCamp?.(selectedCamp)}
              >
                View Details
              </button>
            </div>
          )}
        </div>

        {/* Location list */}
        <div className="location-list">
          <h3 className="location-list-title">Camps by Area</h3>
          <div className="location-areas">
            {[
              { name: 'Downtown SB', count: campLocations.filter(c => c.address?.toLowerCase().includes('state') || c.address?.toLowerCase().includes('downtown')).length },
              { name: 'East Beach', count: campLocations.filter(c => c.address?.toLowerCase().includes('east') || c.address?.toLowerCase().includes('cabrillo')).length },
              { name: 'Goleta/UCSB', count: campLocations.filter(c => c.address?.toLowerCase().includes('goleta') || c.address?.toLowerCase().includes('ucsb')).length },
              { name: 'Montecito', count: campLocations.filter(c => c.address?.toLowerCase().includes('montecito')).length },
            ].map(area => (
              <div key={area.name} className="location-area-item">
                <span className="location-area-name">{area.name}</span>
                <span className="location-area-count">{area.count} camps</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default CampInsights;
