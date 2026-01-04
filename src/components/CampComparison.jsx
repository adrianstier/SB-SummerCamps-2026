import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FavoriteButton } from './FavoriteButton';
import { createComparisonList, shareComparisonList } from '../lib/supabase';

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

const COMPARISON_FIELDS = [
  { key: 'category', label: 'Category', icon: '🏷️' },
  { key: 'ages', label: 'Age Range', icon: '👶' },
  { key: 'price', label: 'Price', icon: '💰', format: formatPrice },
  { key: 'hours', label: 'Hours', icon: '🕐' },
  { key: 'indoor_outdoor', label: 'Indoor/Outdoor', icon: '🏠' },
  { key: 'has_extended_care', label: 'Extended Care', icon: '⏰', type: 'boolean' },
  { key: 'food_included', label: 'Food Included', icon: '🍽️', type: 'boolean' },
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
            Select 2-4 camps to compare them side by side. Click the compare icon on camp cards to add them.
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
        <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--sand-200)' }}>
          <div>
            <h2 className="font-serif text-2xl font-semibold" style={{ color: 'var(--earth-800)' }}>
              Compare Camps
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--sand-400)' }}>
              Comparing {selectedCamps.length} camp{selectedCamps.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
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
              className="p-2 rounded-full hover:bg-sand-100 transition-colors"
              style={{ color: 'var(--sand-400)' }}
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

        {/* Comparison Table */}
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
                      <ComparisonCell camp={camp} field={field} />
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

// Comparison Cell Component
function ComparisonCell({ camp, field }) {
  let value;

  if (field.format) {
    value = field.format(camp);
  } else {
    value = camp[field.key];
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
