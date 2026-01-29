import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FavoriteButton } from './FavoriteButton';
import { createComparisonList, shareComparisonList } from '../lib/supabase';
import './CampComparison.css';

// Category colors for visual accents
const CATEGORY_COLORS = {
  'Beach/Surf': '#2d9599',
  'Theater': '#a855f7',
  'Dance': '#ec4899',
  'Art': '#f59e0b',
  'Science/STEM': '#3b82f6',
  'Nature/Outdoor': '#22c55e',
  'Sports': '#f97316',
  'Music': '#6366f1',
  'Cooking': '#ef4444',
  'Faith-Based': '#8b5cf6',
  'Animals/Zoo': '#84cc16',
  'Multi-Activity': '#64748b',
  'Education': '#14b8a6',
  'Overnight': '#f43f5e',
};

// Format price for display
function formatPrice(camp) {
  const minPrice = camp.price_min || camp.min_price;
  const maxPrice = camp.price_max || camp.max_price;

  if (!minPrice || minPrice === '0' || minPrice === 0) {
    if (camp.price_week && /free/i.test(camp.price_week)) return 'Free';
    if (camp.price_week && camp.price_week !== '$TBD') return camp.price_week;
    return 'TBD';
  }

  const min = parseInt(minPrice);
  const max = parseInt(maxPrice);

  if (isNaN(min)) return camp.price_week || 'TBD';
  if (min === max || isNaN(max)) return `$${min}`;
  return `$${min}–${max}`;
}

// Get numeric price for comparison
function getNumericPrice(camp) {
  const minPrice = camp.price_min || camp.min_price;
  if (!minPrice) return null;
  const parsed = parseInt(minPrice);
  return isNaN(parsed) ? null : parsed;
}

// Get age range as object
function getAgeRange(camp) {
  const minAge = parseInt(camp.min_age) || 3;
  const maxAge = parseInt(camp.max_age) || 18;
  return { min: minAge, max: maxAge };
}

const COMPARISON_FIELDS = [
  { key: 'category', label: 'Category', icon: '🏷️', visualType: 'category' },
  { key: 'ages', label: 'Age Range', icon: '👶', visualType: 'ageRange' },
  { key: 'price', label: 'Price', icon: '💰', format: formatPrice, visualType: 'priceBar' },
  { key: 'hours', label: 'Hours', icon: '🕐' },
  { key: 'indoor_outdoor', label: 'Indoor/Outdoor', icon: '🏠', visualType: 'badge' },
  { key: 'has_extended_care', label: 'Extended Care', icon: '⏰', type: 'boolean', highlight: true },
  { key: 'food_included', label: 'Food Included', icon: '🍽️', type: 'boolean', highlight: true },
  { key: 'has_transport', label: 'Transportation', icon: '🚌', type: 'boolean' },
  { key: 'has_sibling_discount', label: 'Sibling Discount', icon: '👨‍👩‍👧‍👦', type: 'boolean' },
  { key: 'address', label: 'Location', icon: '📍' },
  { key: 'contact_email', label: 'Email', icon: '📧' },
  { key: 'contact_phone', label: 'Phone', icon: '📞' }
];

export function CampComparison({ camps, selectedCampIds, onClose, onRemoveCamp, onAddCamp }) {
  const { user, children } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [viewMode, setViewMode] = useState('visual'); // 'visual' or 'table'

  // Get selected camps
  const selectedCamps = useMemo(() => {
    return selectedCampIds
      .map(id => camps.find(c => c.id === id))
      .filter(Boolean)
      .slice(0, 4); // Max 4 camps
  }, [camps, selectedCampIds]);

  // Filter available camps for adding
  const availableCamps = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return camps
      .filter(c => !selectedCampIds.includes(c.id))
      .filter(c =>
        c.camp_name.toLowerCase().includes(query) ||
        c.category?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [camps, selectedCampIds, searchQuery]);

  // Price stats for visual comparison
  const priceStats = useMemo(() => {
    const prices = selectedCamps.map(getNumericPrice).filter(p => p !== null);
    if (prices.length === 0) return { min: 0, max: 0, avg: 0 };
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    };
  }, [selectedCamps]);

  // Find best value
  const bestValue = useMemo(() => {
    const campsWithPrices = selectedCamps.filter(c => getNumericPrice(c) !== null);
    if (campsWithPrices.length === 0) return null;
    return campsWithPrices.reduce((min, c) =>
      getNumericPrice(c) < getNumericPrice(min) ? c : min
    );
  }, [selectedCamps]);

  // Find best for extended care
  const bestExtendedCare = useMemo(() => {
    return selectedCamps.find(c => c.has_extended_care);
  }, [selectedCamps]);

  // Calculate feature scores for each camp
  const featureScores = useMemo(() => {
    return selectedCamps.map(camp => {
      let score = 0;
      if (camp.has_extended_care) score += 2;
      if (camp.food_included) score += 2;
      if (camp.has_transport) score += 1;
      if (camp.has_sibling_discount) score += 1;
      if (getNumericPrice(camp) && getNumericPrice(camp) <= priceStats.avg) score += 1;
      return { campId: camp.id, score, maxScore: 7 };
    });
  }, [selectedCamps, priceStats]);

  const handleSave = async () => {
    if (!user || !saveName.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await createComparisonList(
        saveName,
        selectedCampIds,
        selectedChildId
      );
      if (!error) {
        alert('Comparison saved!');
        setSaveName('');
      }
    } catch (err) {
      console.error('Error saving comparison:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    // For now, just copy camp names to clipboard
    const text = selectedCamps.map(c => c.camp_name).join('\n');
    await navigator.clipboard.writeText(
      `Comparing camps:\n${text}\n\nView at: ${window.location.origin}`
    );
    alert('Comparison copied to clipboard!');
  };

  if (selectedCamps.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center">
          <span className="text-5xl block mb-4">⚖️</span>
          <h2 className="font-serif text-2xl font-semibold mb-3" style={{ color: 'var(--earth-800)' }}>
            Compare Camps
          </h2>
          <p className="mb-6" style={{ color: 'var(--earth-600)' }}>
            Select 2-4 camps to compare. Click the compare icon on camp cards.
          </p>
          <button onClick={onClose} className="btn-secondary">
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="comparison-header">
          <div className="comparison-header-left">
            <h2 className="comparison-title">Compare Camps</h2>
            <p className="comparison-subtitle">
              Comparing {selectedCamps.length} camp{selectedCamps.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="comparison-header-right">
            {/* View Mode Toggle */}
            <div className="comparison-view-toggle">
              <button
                className={`comparison-view-btn ${viewMode === 'visual' ? 'active' : ''}`}
                onClick={() => setViewMode('visual')}
                title="Visual comparison"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
              <button
                className={`comparison-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
            </div>
            {selectedCamps.length < 4 && (
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="btn-secondary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Camp</span>
              </button>
            )}
            <button
              onClick={handleShare}
              className="btn-secondary"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Share</span>
            </button>
            <button
              onClick={onClose}
              className="comparison-close-btn"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search dropdown */}
        {showSearch && (
          <div className="p-4" style={{ background: 'var(--sand-50)', borderBottom: '1px solid var(--sand-200)' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search camps to add..."
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--sand-200)' }}
              autoFocus
            />
            {availableCamps.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl" style={{ background: 'white', border: '1px solid var(--sand-200)' }}>
                {availableCamps.map(camp => (
                  <button
                    key={camp.id}
                    onClick={() => {
                      onAddCamp?.(camp.id);
                      setSearchQuery('');
                      setShowSearch(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-sand-50 transition-colors flex items-center justify-between"
                    style={{ borderBottom: '1px solid var(--sand-100)' }}
                  >
                    <div>
                      <p className="font-medium" style={{ color: 'var(--earth-800)' }}>{camp.camp_name}</p>
                      <p className="text-sm" style={{ color: 'var(--sand-400)' }}>{camp.category}</p>
                    </div>
                    <svg className="w-5 h-5" style={{ color: 'var(--ocean-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Visual Comparison Mode */}
        {viewMode === 'visual' && (
          <div className="comparison-visual-content">
            {/* Camp Cards with Feature Scores */}
            <div className="comparison-cards-row">
              {selectedCamps.map((camp, index) => {
                const catColor = CATEGORY_COLORS[camp.category] || '#64748b';
                const score = featureScores.find(s => s.campId === camp.id);
                const price = getNumericPrice(camp);
                const ageRange = getAgeRange(camp);

                return (
                  <div key={camp.id} className="comparison-card" style={{ '--card-accent': catColor }}>
                    <div className="comparison-card-header">
                      <div className="comparison-card-accent" style={{ background: catColor }} />
                      <button
                        onClick={() => onRemoveCamp?.(camp.id)}
                        className="comparison-card-remove"
                        title="Remove"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="comparison-card-body">
                      <div className="comparison-card-title-row">
                        <h3 className="comparison-card-name">{camp.camp_name}</h3>
                        <FavoriteButton campId={camp.id} size="sm" />
                      </div>
                      <span className="comparison-card-category" style={{ color: catColor }}>
                        {camp.category}
                      </span>

                      {/* Feature Score Ring */}
                      <div className="comparison-score-ring">
                        <svg viewBox="0 0 36 36" className="comparison-score-svg">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--sand-200)" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            stroke={catColor}
                            strokeWidth="3"
                            strokeDasharray={`${(score.score / score.maxScore) * 94.2} 94.2`}
                            strokeLinecap="round"
                            transform="rotate(-90 18 18)"
                          />
                        </svg>
                        <span className="comparison-score-value">{score.score}/{score.maxScore}</span>
                        <span className="comparison-score-label">features</span>
                      </div>

                      {/* Badges */}
                      <div className="comparison-badges">
                        {camp.id === bestValue?.id && (
                          <span className="comparison-badge comparison-badge-value">Best Value</span>
                        )}
                        {camp.has_extended_care && (
                          <span className="comparison-badge comparison-badge-feature">Ext. Care</span>
                        )}
                        {camp.food_included && (
                          <span className="comparison-badge comparison-badge-feature">Food</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual Price Comparison */}
            <div className="comparison-section">
              <h4 className="comparison-section-title">
                <span className="comparison-section-icon">💰</span>
                Price Comparison
              </h4>
              <div className="comparison-price-bars">
                {selectedCamps.map(camp => {
                  const price = getNumericPrice(camp);
                  const percentage = price ? ((price - priceStats.min) / (priceStats.max - priceStats.min || 1)) * 100 : 0;
                  const catColor = CATEGORY_COLORS[camp.category] || '#64748b';
                  const isBestValue = camp.id === bestValue?.id;

                  return (
                    <div key={camp.id} className="comparison-price-row">
                      <span className="comparison-price-name">{camp.camp_name}</span>
                      <div className="comparison-price-track">
                        <div
                          className="comparison-price-fill"
                          style={{
                            width: `${Math.max(percentage, 5)}%`,
                            background: `linear-gradient(90deg, ${catColor}cc, ${catColor})`
                          }}
                        />
                        {isBestValue && <span className="comparison-price-best">Best</span>}
                      </div>
                      <span className="comparison-price-value">{formatPrice(camp)}</span>
                    </div>
                  );
                })}
              </div>
              {/* Price sparkline summary */}
              <div className="comparison-price-summary">
                <span>Range: {formatPrice({ price_min: priceStats.min })} - {formatPrice({ price_min: priceStats.max })}</span>
                <span className="comparison-price-avg">Avg: {formatPrice({ price_min: priceStats.avg })}</span>
              </div>
            </div>

            {/* Visual Age Range Comparison */}
            <div className="comparison-section">
              <h4 className="comparison-section-title">
                <span className="comparison-section-icon">👶</span>
                Age Range Coverage
              </h4>
              <div className="comparison-age-timeline">
                <div className="comparison-age-labels">
                  {[3, 5, 7, 9, 11, 13, 15, 17].map(age => (
                    <span key={age} className="comparison-age-label">{age}</span>
                  ))}
                </div>
                {selectedCamps.map(camp => {
                  const range = getAgeRange(camp);
                  const left = ((range.min - 3) / 15) * 100;
                  const width = ((range.max - range.min) / 15) * 100;
                  const catColor = CATEGORY_COLORS[camp.category] || '#64748b';

                  return (
                    <div key={camp.id} className="comparison-age-row">
                      <span className="comparison-age-name">{camp.camp_name}</span>
                      <div className="comparison-age-track">
                        <div
                          className="comparison-age-bar"
                          style={{
                            left: `${left}%`,
                            width: `${Math.max(width, 5)}%`,
                            background: catColor
                          }}
                        >
                          <span className="comparison-age-range">{range.min}-{range.max}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feature Checklist Grid */}
            <div className="comparison-section">
              <h4 className="comparison-section-title">
                <span className="comparison-section-icon">✓</span>
                Features at a Glance
              </h4>
              <div className="comparison-features-grid">
                <div className="comparison-features-header">
                  <div className="comparison-features-label">Feature</div>
                  {selectedCamps.map(camp => (
                    <div key={camp.id} className="comparison-features-camp">
                      {camp.camp_name.split(' ').slice(0, 2).join(' ')}
                    </div>
                  ))}
                </div>
                {COMPARISON_FIELDS.filter(f => f.type === 'boolean').map(field => (
                  <div key={field.key} className="comparison-features-row">
                    <div className="comparison-features-label">
                      <span className="comparison-features-icon">{field.icon}</span>
                      {field.label}
                    </div>
                    {selectedCamps.map(camp => {
                      const hasFeature = camp[field.key];
                      return (
                        <div key={camp.id} className={`comparison-features-cell ${hasFeature ? 'has-feature' : ''}`}>
                          {hasFeature ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Table Comparison Mode */}
        {viewMode === 'table' && (
        <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <table className="w-full">
            {/* Camp Headers */}
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 w-40 p-4 text-left" style={{ background: 'var(--sand-50)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--sand-400)' }}>
                    Feature
                  </span>
                </th>
                {selectedCamps.map(camp => (
                  <th
                    key={camp.id}
                    className="sticky top-0 z-10 p-4 text-left min-w-[200px]"
                    style={{ background: 'white', borderBottom: '2px solid var(--sand-200)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-serif font-semibold line-clamp-2" style={{ color: 'var(--earth-800)' }}>
                          {camp.camp_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          {camp.id === bestValue?.id && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--sage-100)', color: 'var(--sage-600)' }}>
                              Best Value
                            </span>
                          )}
                          {camp.id === bestExtendedCare?.id && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--ocean-100)', color: 'var(--ocean-600)' }}>
                              Extended Care
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <FavoriteButton campId={camp.id} size="sm" />
                        <button
                          onClick={() => onRemoveCamp?.(camp.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          style={{ color: 'var(--terra-500)' }}
                          title="Remove from comparison"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Comparison Rows */}
            <tbody>
              {COMPARISON_FIELDS.map((field, index) => (
                <tr
                  key={field.key}
                  style={{ background: index % 2 === 0 ? 'var(--sand-50)' : 'white' }}
                >
                  <td className="sticky left-0 p-4" style={{ background: index % 2 === 0 ? 'var(--sand-50)' : 'white' }}>
                    <div className="flex items-center gap-2">
                      <span>{field.icon}</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--earth-700)' }}>
                        {field.label}
                      </span>
                    </div>
                  </td>
                  {selectedCamps.map(camp => (
                    <td key={camp.id} className="p-4">
                      <ComparisonCell camp={camp} field={field} allCamps={selectedCamps} priceStats={priceStats} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Description row */}
              <tr style={{ background: 'white' }}>
                <td className="sticky left-0 p-4 align-top" style={{ background: 'white' }}>
                  <div className="flex items-center gap-2">
                    <span>📝</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--earth-700)' }}>
                      Description
                    </span>
                  </div>
                </td>
                {selectedCamps.map(camp => (
                  <td key={camp.id} className="p-4 align-top">
                    <p className="text-sm line-clamp-4" style={{ color: 'var(--earth-600)' }}>
                      {camp.description || 'No description available'}
                    </p>
                  </td>
                ))}
              </tr>

              {/* Website row */}
              <tr style={{ background: 'var(--sand-50)' }}>
                <td className="sticky left-0 p-4" style={{ background: 'var(--sand-50)' }}>
                  <div className="flex items-center gap-2">
                    <span>🌐</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--earth-700)' }}>
                      Website
                    </span>
                  </div>
                </td>
                {selectedCamps.map(camp => (
                  <td key={camp.id} className="p-4">
                    {camp.website_url && camp.website_url !== 'N/A' ? (
                      <a
                        href={camp.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline flex items-center gap-1"
                        style={{ color: 'var(--ocean-600)' }}
                      >
                        Visit Website
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--sand-400)' }}>—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        )}

        {/* Save for later */}
        {user && (
          <div className="p-4 flex items-center gap-4" style={{ borderTop: '1px solid var(--sand-200)', background: 'var(--sand-50)' }}>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Name this comparison..."
              className="flex-1 max-w-xs px-4 py-2 rounded-xl border-2 focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--sand-200)' }}
            />
            {children.length > 0 && (
              <select
                value={selectedChildId || ''}
                onChange={(e) => setSelectedChildId(e.target.value || null)}
                className="px-4 py-2 rounded-xl border-2 focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--sand-200)' }}
              >
                <option value="">For any child</option>
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={handleSave}
              disabled={!saveName.trim() || saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Comparison'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Comparison Cell Component with visual enhancements
function ComparisonCell({ camp, field, allCamps, priceStats }) {
  let value;

  if (field.format) {
    value = field.format(camp);
  } else {
    value = camp[field.key];
  }

  // Category badge visualization
  if (field.visualType === 'category') {
    const catColor = CATEGORY_COLORS[value] || '#64748b';
    return (
      <span
        className="inline-flex items-center gap-2 text-sm font-medium px-2.5 py-1 rounded-full"
        style={{ background: `${catColor}15`, color: catColor }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: catColor }} />
        {value || '—'}
      </span>
    );
  }

  // Price bar visualization
  if (field.visualType === 'priceBar' && priceStats) {
    const price = getNumericPrice(camp);
    if (price === null) return <span className="text-sm" style={{ color: 'var(--sand-400)' }}>TBD</span>;

    const percentage = ((price - priceStats.min) / (priceStats.max - priceStats.min || 1)) * 100;
    const isBest = price === priceStats.min;

    return (
      <div className="comparison-cell-price">
        <span className="comparison-cell-price-value">{value}</span>
        <div className="comparison-cell-price-bar">
          <div
            className="comparison-cell-price-fill"
            style={{ width: `${Math.max(percentage, 8)}%` }}
          />
        </div>
        {isBest && <span className="comparison-cell-best-tag">Best</span>}
      </div>
    );
  }

  // Age range visualization
  if (field.visualType === 'ageRange') {
    const range = getAgeRange(camp);
    return (
      <div className="comparison-cell-age">
        <span className="comparison-cell-age-text">{range.min}-{range.max} years</span>
        <div className="comparison-cell-age-bar">
          {Array.from({ length: 16 }, (_, i) => i + 3).map(age => (
            <div
              key={age}
              className={`comparison-cell-age-dot ${age >= range.min && age <= range.max ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Badge visualization for indoor/outdoor
  if (field.visualType === 'badge') {
    const isOutdoor = value?.toLowerCase().includes('outdoor');
    const isIndoor = value?.toLowerCase().includes('indoor');
    const isBoth = isOutdoor && isIndoor;

    return (
      <span
        className={`inline-flex items-center gap-1.5 text-sm font-medium px-2 py-0.5 rounded-md ${
          isBoth ? 'bg-purple-50 text-purple-600' :
          isOutdoor ? 'bg-green-50 text-green-600' :
          isIndoor ? 'bg-blue-50 text-blue-600' :
          'bg-gray-50 text-gray-500'
        }`}
      >
        {isBoth ? '🏡🌳' : isOutdoor ? '🌳' : isIndoor ? '🏡' : '—'}
        {value || '—'}
      </span>
    );
  }

  if (field.type === 'boolean') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-sm font-medium ${value ? 'text-sage-600' : 'text-sand-400'}`}
        style={{ color: value ? 'var(--sage-600)' : 'var(--sand-400)' }}
      >
        {value ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Yes
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            No
          </>
        )}
      </span>
    );
  }

  if (!value || value === 'N/A' || value === 'Unknown') {
    return <span className="text-sm" style={{ color: 'var(--sand-400)' }}>—</span>;
  }

  return <span className="text-sm" style={{ color: 'var(--earth-700)' }}>{value}</span>;
}

export default CampComparison;
