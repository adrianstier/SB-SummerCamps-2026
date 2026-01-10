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
    await removeFavorite(campId);
    await refreshFavorites();
  }

  async function handleSaveNotes(campId) {
    await updateFavorite(campId, { notes: noteText });
    await refreshFavorites();
    setEditingNotes(null);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--earth-200)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--earth-800)' }}>
                Considering
              </h2>
              <p className="text-sm" style={{ color: 'var(--earth-500)' }}>
                {wishlistCamps.length} camp{wishlistCamps.length !== 1 ? 's' : ''} saved
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            {/* Child filter */}
            {children.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--earth-600)' }}>For:</span>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="text-sm px-2 py-1 border rounded-lg"
                  style={{ borderColor: 'var(--earth-300)' }}
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
              <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm px-2 py-1 border rounded-lg"
                style={{ borderColor: 'var(--earth-300)' }}
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
                className="ml-auto px-3 py-1.5 text-sm font-medium text-white rounded-lg"
                style={{ backgroundColor: 'var(--accent-500)' }}
              >
                Compare {selectedForCompare.length} Camps
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {wishlistCamps.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <p className="text-lg font-medium" style={{ color: 'var(--earth-600)' }}>No camps saved yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--earth-400)' }}>
                Heart camps to save them here for later
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {wishlistCamps.map(item => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-md"
                  style={{ borderColor: 'var(--earth-200)' }}
                >
                  {/* Compare checkbox */}
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={selectedForCompare.includes(item.camp_id)}
                      onChange={() => toggleCompare(item.camp_id)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent-500)' }}
                    />
                  </div>

                  {/* Camp info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium" style={{ color: 'var(--earth-800)' }}>
                          {item.camp.camp_name}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--earth-500)' }}>
                          {item.camp.category} | Ages {item.camp.ages} | {formatPrice(item.camp)}/week
                        </p>
                      </div>

                      {/* Registration badge */}
                      <div
                        className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: `${item.regStatus.color}20`,
                          color: item.regStatus.color
                        }}
                      >
                        {item.regStatus.label}
                      </div>
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
                        <span className="text-sm" style={{ color: 'var(--earth-600)' }}>
                          For {item.childName}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {editingNotes === item.camp_id ? (
                      <div className="mt-3">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add notes about this camp..."
                          className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
                          style={{ borderColor: 'var(--earth-300)' }}
                          rows={2}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveNotes(item.camp_id)}
                            className="px-3 py-1 text-sm font-medium text-white rounded-lg"
                            style={{ backgroundColor: 'var(--accent-500)' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingNotes(null)}
                            className="px-3 py-1 text-sm rounded-lg hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : item.notes ? (
                      <div className="mt-2 p-2 rounded-lg bg-gray-50">
                        <p className="text-sm" style={{ color: 'var(--earth-600)' }}>{item.notes}</p>
                        <button
                          onClick={() => {
                            setNoteText(item.notes);
                            setEditingNotes(item.camp_id);
                          }}
                          className="text-xs mt-1 hover:underline"
                          style={{ color: 'var(--accent-500)' }}
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
                        className="mt-2 text-sm hover:underline"
                        style={{ color: 'var(--accent-500)' }}
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
                        className="px-3 py-1.5 text-sm font-medium text-white rounded-lg whitespace-nowrap"
                        style={{ backgroundColor: 'var(--sage-600)' }}
                      >
                        Schedule
                      </button>
                    )}

                    {item.camp.website_url && (
                      <a
                        href={item.camp.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm text-center rounded-lg border hover:bg-gray-50"
                        style={{ borderColor: 'var(--earth-300)', color: 'var(--earth-600)' }}
                      >
                        Website
                      </a>
                    )}

                    <button
                      onClick={() => handleRemove(item.camp_id)}
                      className="px-3 py-1.5 text-sm rounded-lg hover:bg-red-50 text-red-600"
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
        <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--earth-200)' }}>
          <p className="text-sm" style={{ color: 'var(--earth-500)' }}>
            Select camps to compare side-by-side
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Wishlist;
