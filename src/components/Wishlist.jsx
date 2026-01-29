import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { removeFavorite, updateFavorite, getRegistrationStatus } from '../lib/supabase';

export function Wishlist({ camps, onClose, onScheduleCamp, onCompareCamps }) {
  const { favorites, refreshFavorites, children } = useAuth();
  const [selectedChild, setSelectedChild] = useState('all');
  const [sortBy, setSortBy] = useState('registration'); // registration, name, price
  const [editingNotes, setEditingNotes] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState([]);

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
      items = items.filter(item =>
        item.child_id === selectedChild || item.child_id === null
      );
    }

    // Sort
    if (sortBy === 'registration') {
      items.sort((a, b) => {
        // Open registrations first
        if (a.regStatus.isOpen && !b.regStatus.isOpen) return -1;
        if (!a.regStatus.isOpen && b.regStatus.isOpen) return 1;
        // Then by days until
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

  async function handleRemove(campId) {
    try {
      await removeFavorite(campId);
      await refreshFavorites();
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  }

  async function handleSaveNotes(campId) {
    try {
      await updateFavorite(campId, { notes: noteText });
      await refreshFavorites();
      setEditingNotes(null);
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  }

  function toggleCompare(campId) {
    setSelectedForCompare(prev => {
      if (prev.includes(campId)) {
        return prev.filter(id => id !== campId);
      }
      if (prev.length >= 4) {
        return prev; // Max 4 for comparison
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

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
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
        <div className="flex items-center gap-4 px-6 py-3" style={{ borderBottom: '1px solid var(--sand-200)', background: 'var(--sand-50)' }}>
          {/* Child filter */}
          {children.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="body-sm text-secondary">For:</span>
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="select input-sm"
                style={{ width: 'auto', padding: '6px 32px 6px 12px' }}
              >
                <option value="all">All children</option>
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="body-sm text-secondary">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select input-sm"
              style={{ width: 'auto', padding: '6px 32px 6px 12px' }}
            >
              <option value="registration">Registration Date</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
            </select>
          </div>

          {/* Compare button */}
          {selectedForCompare.length >= 2 && (
            <button
              onClick={handleCompare}
              className="btn-primary btn-sm ml-auto"
            >
              Compare {selectedForCompare.length} Camps
            </button>
          )}
        </div>

        {/* Content */}
        <div className="modal-body">
          {wishlistCamps.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <p className="heading-sm text-secondary">No camps saved yet</p>
              <p className="body-sm text-muted mt-1">
                Tap the heart on any camp to save it here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {wishlistCamps.map(item => (
                <div
                  key={item.id}
                  className="card card-interactive flex items-start gap-4 p-4"
                >
                  {/* Compare checkbox */}
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={selectedForCompare.includes(item.camp_id)}
                      onChange={() => toggleCompare(item.camp_id)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--ocean-500)' }}
                    />
                  </div>

                  {/* Camp info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="heading-sm">{item.camp.camp_name}</h3>
                        <p className="body-sm text-muted">
                          {item.camp.category} | Ages {item.camp.ages} | {formatPrice(item.camp)}/week
                        </p>
                      </div>

                      {/* Registration badge */}
                      <span
                        className="badge badge-pill"
                        style={{
                          backgroundColor: `${item.regStatus.color}20`,
                          color: item.regStatus.color
                        }}
                      >
                        {item.regStatus.label}
                      </span>
                    </div>

                    {/* Child badge */}
                    {item.childName && (
                      <div className="mt-2 flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                          style={{ backgroundColor: item.childColor }}
                        >
                          {item.childName.charAt(0)}
                        </div>
                        <span className="body-sm text-secondary">For {item.childName}</span>
                      </div>
                    )}

                    {/* Notes */}
                    {editingNotes === item.camp_id ? (
                      <div className="mt-3">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add notes about this camp..."
                          className="textarea"
                          style={{ minHeight: '60px' }}
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
                      <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--sand-50)' }}>
                        <p className="body-sm text-secondary">{item.notes}</p>
                        <button
                          onClick={() => {
                            setNoteText(item.notes);
                            setEditingNotes(item.camp_id);
                          }}
                          className="btn-link btn-sm mt-1"
                          style={{ padding: 0 }}
                        >
                          Edit note
                        </button>
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
                        + Add note
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
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
                      className="btn-ghost btn-sm text-error"
                      style={{ color: 'var(--terra-600)' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
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
