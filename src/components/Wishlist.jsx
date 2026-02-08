import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { removeFavorite, updateFavorite, getRegistrationStatus } from '../lib/supabase';
import BrandIcon from './BrandIcon';
import './Wishlist.css';

// Category gradients matching App.jsx camp cards
const categoryGradients = {
  'Beach/Surf': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  'Theater': 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
  'Dance': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  'Art': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'Science/STEM': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  'Nature/Outdoor': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  'Sports': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  'Music': 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  'Cooking': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  'Faith-Based': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  'Animals/Zoo': 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
  'Multi-Activity': 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
  'Education': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  'Overnight': 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
};

// Category badge background colors (lighter versions)
const categoryBadgeColors = {
  'Beach/Surf': { bg: '#ecfeff', text: '#0891b2' },
  'Theater': { bg: '#faf5ff', text: '#9333ea' },
  'Dance': { bg: '#fdf2f8', text: '#db2777' },
  'Art': { bg: '#fffbeb', text: '#d97706' },
  'Science/STEM': { bg: '#eff6ff', text: '#2563eb' },
  'Nature/Outdoor': { bg: '#f0fdf4', text: '#16a34a' },
  'Sports': { bg: '#fff7ed', text: '#ea580c' },
  'Music': { bg: '#eef2ff', text: '#4f46e5' },
  'Cooking': { bg: '#fef2f2', text: '#dc2626' },
  'Faith-Based': { bg: '#f5f3ff', text: '#7c3aed' },
  'Animals/Zoo': { bg: '#f7fee7', text: '#65a30d' },
  'Multi-Activity': { bg: '#f8fafc', text: '#475569' },
  'Education': { bg: '#f0fdfa', text: '#0d9488' },
  'Overnight': { bg: '#fff1f2', text: '#e11d48' },
};

const categoryIcons = {
  'Beach/Surf': 'beach-surf',
  'Theater': 'theater',
  'Dance': 'theater',
  'Art': 'art',
  'Science/STEM': 'science-stem',
  'Nature/Outdoor': 'nature-outdoor',
  'Sports': 'sports',
  'Music': 'music',
  'Cooking': 'cooking',
  'Faith-Based': 'overnight',
  'Animals/Zoo': 'nature-outdoor',
  'Multi-Activity': 'sports',
  'Education': 'science-stem',
  'Overnight': 'overnight',
};

export function Wishlist({ camps, onClose, onScheduleCamp, onCompareCamps }) {
  const { children } = useAuth();
  const { favorites, refreshFavorites } = useFavorites();
  const [selectedChild, setSelectedChild] = useState('all');
  const [sortBy, setSortBy] = useState('registration');
  const [editingNotes, setEditingNotes] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [removingIds, setRemovingIds] = useState([]);
  const modalRef = useRef(null);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Get favorited camps with full camp data
  const wishlistCamps = useMemo(() => {
    let items = favorites.map(fav => {
      const camp = camps.find(c => c.id === fav.camp_id);
      if (!camp) return null;

      const regStatus = getRegistrationStatus(camp);

      return {
        ...fav,
        camp,
        regStatus,
        childName: fav.children?.name || null,
        childColor: fav.children?.color || null
      };
    }).filter(Boolean);

    // Filter by child
    if (selectedChild !== 'all') {
      items = items.filter(item => item.child_id === selectedChild);
    }

    // Sort
    if (sortBy === 'registration') {
      items.sort((a, b) => {
        if (a.regStatus.isOpen && !b.regStatus.isOpen) return -1;
        if (!a.regStatus.isOpen && b.regStatus.isOpen) return 1;
        const aDays = a.regStatus.daysUntil ?? 999;
        const bDays = b.regStatus.daysUntil ?? 999;
        return aDays - bDays;
      });
    } else if (sortBy === 'name') {
      items.sort((a, b) => a.camp.camp_name.localeCompare(b.camp.camp_name));
    } else if (sortBy === 'price') {
      items.sort((a, b) => (a.camp.min_price || 0) - (b.camp.min_price || 0));
    }

    return items;
  }, [favorites, camps, selectedChild, sortBy]);

  const handleRemove = useCallback(async (campId) => {
    // Trigger fade-out animation first
    setRemovingIds(prev => [...prev, campId]);

    // Wait for animation to complete, then actually remove
    setTimeout(async () => {
      try {
        await removeFavorite(campId);
        await refreshFavorites();
      } catch (err) {
        console.error('Error removing favorite:', err);
      } finally {
        setRemovingIds(prev => prev.filter(id => id !== campId));
      }
    }, 350);
  }, [refreshFavorites]);

  async function handleSaveNotes(campId) {
    try {
      await updateFavorite(campId, { notes: noteText });
      await refreshFavorites();
      setEditingNotes(null);
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  }

  async function handleChildAssignment(campId, childId) {
    try {
      await updateFavorite(campId, { child_id: childId || null });
      await refreshFavorites();
    } catch (err) {
      console.error('Error assigning child:', err);
    }
  }

  function toggleCompare(campId) {
    setSelectedForCompare(prev => {
      if (prev.includes(campId)) {
        return prev.filter(id => id !== campId);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, campId];
    });
  }

  function handleCompare() {
    if (onCompareCamps && selectedForCompare.length >= 2) {
      onCompareCamps(selectedForCompare);
    }
  }

  function formatPrice(camp) {
    if (!camp.min_price && !camp.max_price) return 'TBD';
    if (camp.min_price === camp.max_price) return `$${camp.min_price}`;
    return `$${camp.min_price}-${camp.max_price}`;
  }

  const sortOptions = [
    { value: 'registration', label: 'Registration' },
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
  ];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Wishlist">
      <div className="modal modal-lg" ref={modalRef}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="heading-md">Considering</h2>
            <p className="body-sm text-muted mt-1">
              {wishlistCamps.length} camp{wishlistCamps.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon btn-icon-sm"
            aria-label="Close"
          >
            <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters bar */}
        <div className="wishlist-filters-bar">
          {/* Child filter as pills */}
          {children.length > 0 && (
            <div className="wishlist-child-pills" role="group" aria-label="Filter by child">
              <button
                className="wishlist-child-pill"
                aria-pressed={selectedChild === 'all'}
                onClick={() => setSelectedChild('all')}
              >
                All
              </button>
              {children.map(child => (
                <button
                  key={child.id}
                  className="wishlist-child-pill"
                  aria-pressed={selectedChild === child.id}
                  onClick={() => setSelectedChild(child.id)}
                >
                  {child.color && (
                    <span
                      className="wishlist-child-pill-dot"
                      style={{ backgroundColor: child.color }}
                    />
                  )}
                  {child.name}
                </button>
              ))}
            </div>
          )}

          {/* Sort as pill segmented control */}
          <div className="wishlist-sort-pills" role="group" aria-label="Sort by">
            {sortOptions.map(opt => (
              <button
                key={opt.value}
                className="wishlist-sort-pill"
                aria-pressed={sortBy === opt.value}
                onClick={() => setSortBy(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Compare button */}
          {selectedForCompare.length >= 2 && (
            <button
              onClick={handleCompare}
              className="wishlist-compare-bar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compare {selectedForCompare.length}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="modal-body">
          {wishlistCamps.length === 0 ? (
            /* Empty State */
            <div className="wishlist-empty">
              <div className="wishlist-empty-icon">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3>No favorites yet</h3>
              <p>
                Save camps you are considering and organize them here.
              </p>
              <button onClick={onClose} className="wishlist-empty-cta">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse Camps
              </button>
            </div>
          ) : (
            <div className="wishlist-grid">
              {wishlistCamps.map(item => {
                const gradient = categoryGradients[item.camp.category] || categoryGradients['Multi-Activity'];
                const badgeColors = categoryBadgeColors[item.camp.category] || categoryBadgeColors['Multi-Activity'];
                const iconName = categoryIcons[item.camp.category] || 'sports';
                const isRemoving = removingIds.includes(item.camp_id);

                return (
                  <div
                    key={item.id}
                    className={`wishlist-card ${isRemoving ? 'wishlist-card-removing' : ''}`}
                  >
                    {/* Gradient accent bar */}
                    <div
                      className="wishlist-card-accent"
                      style={{ background: gradient }}
                    />

                    {/* Camp image thumbnail */}
                    <div className="wishlist-card-image">
                      {item.camp.image_url ? (
                        <img
                          src={item.camp.image_url}
                          alt={item.camp.camp_name}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="wishlist-card-image-placeholder"
                          style={{ background: gradient }}
                        >
                          <BrandIcon name={iconName} size={32} />
                        </div>
                      )}
                    </div>

                    {/* Compare checkbox */}
                    <div className="flex items-center px-2">
                      <input
                        type="checkbox"
                        checked={selectedForCompare.includes(item.camp_id)}
                        onChange={() => toggleCompare(item.camp_id)}
                        className="wishlist-compare-check"
                        aria-label={`Select ${item.camp.camp_name} for comparison`}
                      />
                    </div>

                    {/* Camp info */}
                    <div className="flex-1 min-w-0 py-3 pr-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="heading-sm truncate">{item.camp.camp_name}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {/* Category badge */}
                            <span
                              className="wishlist-category-badge"
                              style={{
                                backgroundColor: badgeColors.bg,
                                color: badgeColors.text,
                              }}
                            >
                              {item.camp.category}
                            </span>
                            <span className="body-sm text-muted">
                              Ages {item.camp.ages}
                            </span>
                            <span className="body-sm text-muted">
                              {formatPrice(item.camp)}/wk
                            </span>
                          </div>
                        </div>

                        {/* Registration badge */}
                        <span
                          className="badge badge-pill flex-shrink-0"
                          style={{
                            backgroundColor: `${item.regStatus.color}20`,
                            color: item.regStatus.color
                          }}
                        >
                          {item.regStatus.label}
                        </span>
                      </div>

                      {/* Child assignment */}
                      {children.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          {item.childColor && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                              style={{ backgroundColor: item.childColor }}
                            >
                              {item.childName?.charAt(0) || '?'}
                            </div>
                          )}
                          <span className="body-sm text-secondary">For:</span>
                          <select
                            value={item.child_id || ''}
                            onChange={(e) => handleChildAssignment(item.camp_id, e.target.value)}
                            className="select input-sm"
                            style={{ width: 'auto', padding: '4px 28px 4px 10px', fontSize: '13px' }}
                            aria-label={`Assign ${item.camp.camp_name} to a child`}
                          >
                            <option value="">No child assigned</option>
                            {children.map(child => (
                              <option key={child.id} value={child.id}>{child.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Notes */}
                      {editingNotes === item.camp_id ? (
                        <div className="wishlist-note-edit-area">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add notes about this camp..."
                            rows={2}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleSaveNotes(item.camp_id)}
                              className="btn-primary btn-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNotes(null)}
                              className="btn-ghost btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : item.notes ? (
                        <div className="wishlist-note">
                          <p>{item.notes}</p>
                          <div className="wishlist-note-actions">
                            <button
                              onClick={() => {
                                setNoteText(item.notes);
                                setEditingNotes(item.camp_id);
                              }}
                              className="btn-link btn-sm"
                              style={{ padding: 0 }}
                            >
                              Edit note
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await updateFavorite(item.camp_id, { notes: null });
                                  await refreshFavorites();
                                } catch (err) {
                                  console.error('Error deleting note:', err);
                                }
                              }}
                              className="btn-link btn-sm flex items-center gap-1"
                              style={{ padding: 0, color: 'var(--terra-600)' }}
                              aria-label="Delete note"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setNoteText('');
                            setEditingNotes(item.camp_id);
                          }}
                          className="btn-link btn-sm mt-2"
                          style={{ padding: 0 }}
                        >
                          <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Add note
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="wishlist-card-actions">
                      {onScheduleCamp && (
                        <button
                          onClick={() => onScheduleCamp(item.camp)}
                          className="btn-success btn-sm"
                        >
                          Schedule
                        </button>
                      )}

                      {item.camp.website_url && (
                        <a
                          href={item.camp.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary btn-sm text-center"
                        >
                          Website
                        </a>
                      )}

                      <button
                        onClick={() => handleRemove(item.camp_id)}
                        className="wishlist-remove-btn"
                        disabled={isRemoving}
                        aria-label={`Remove ${item.camp.camp_name}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <p className="body-sm text-muted flex-1">Check 2-4 camps to compare</p>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Wishlist;
