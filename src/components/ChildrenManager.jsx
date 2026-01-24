import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addChild, updateChild, deleteChild } from '../lib/supabase';

const childColors = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#22c55e', // green
  '#06b6d4', // cyan
];

export function ChildrenManager({ onClose }) {
  const { user, isConfigured, signIn, children, refreshChildren } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    age_as_of_summer: '',
    color: childColors[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState(null);

  if (!isConfigured || !user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <h2 className="font-serif text-2xl font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
            Sign In Required
          </h2>
          <p className="mb-6" style={{ color: 'var(--earth-700)' }}>
            Sign in to add your children and start planning their summer.
          </p>
          <button onClick={signIn} className="btn-primary w-full mb-3">
            Sign in with Google
          </button>
          <button onClick={onClose} className="btn-secondary w-full">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      if (editingChild) {
        await updateChild(editingChild.id, {
          name: formData.name,
          age_as_of_summer: formData.age_as_of_summer ? parseInt(formData.age_as_of_summer) : null,
          color: formData.color,
          notes: formData.notes
        });
      } else {
        await addChild({
          name: formData.name,
          age_as_of_summer: formData.age_as_of_summer ? parseInt(formData.age_as_of_summer) : null,
          color: formData.color,
          notes: formData.notes
        });
      }

      await refreshChildren();
      resetForm();
    } catch (err) {
      console.error('Error saving child:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    setLoading(true);
    setError(null);
    try {
      await deleteChild(id);
      await refreshChildren();
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting child:', err);
      setError('Failed to remove child. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(child) {
    setEditingChild(child);
    setFormData({
      name: child.name,
      age_as_of_summer: child.age_as_of_summer?.toString() || '',
      color: child.color || childColors[0],
      notes: child.notes || ''
    });
    setShowAddForm(true);
  }

  function resetForm() {
    setEditingChild(null);
    setFormData({
      name: '',
      age_as_of_summer: '',
      color: childColors[children.length % childColors.length],
      notes: ''
    });
    setShowAddForm(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6" style={{ borderBottom: '1px solid var(--sand-200)' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--earth-800)' }}>
              My Children
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-colors hover:bg-[var(--sand-100)]"
              style={{ color: 'var(--sand-400)' }}
              aria-label="Close"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--earth-700)' }}>
            Add your children to plan their summer schedules separately.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 150px)' }}>
          {/* Children list */}
          {children.length > 0 && !showAddForm && (
            <div className="space-y-3 mb-6">
              {children.map(child => (
                <div
                  key={child.id}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{ background: 'var(--sand-50)', border: '1px solid var(--sand-200)' }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: child.color }}
                  >
                    {(child.name || '?')[0].toUpperCase()}
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: 'var(--earth-800)' }}>
                      {child.name}
                    </p>
                    {child.age_as_of_summer && (
                      <p className="text-sm" style={{ color: 'var(--sand-400)' }}>
                        Age {child.age_as_of_summer} in Summer 2026
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(child)}
                      className="p-2 rounded-lg transition-colors hover:bg-[var(--sand-200)]"
                      style={{ color: 'var(--earth-700)' }}
                      aria-label={`Edit ${child.name}`}
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    {confirmDelete === child.id ? (
                      <span className="flex items-center gap-1 text-xs">
                        <button
                          onClick={() => handleDelete(child.id)}
                          className="px-2 py-1 rounded bg-red-500 text-white font-medium"
                          disabled={loading}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 rounded bg-gray-200 font-medium"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(child.id)}
                        className="p-2 rounded-lg transition-colors hover:bg-[var(--terra-50)]"
                        style={{ color: 'var(--terra-500)' }}
                        aria-label={`Delete ${child.name}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--terra-50)', color: 'var(--terra-600)' }}>
              {error}
            </div>
          )}

          {/* Add/Edit form */}
          {showAddForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
                  Child's Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
                  style={{ borderColor: 'var(--sand-200)' }}
                  placeholder="e.g., Emma"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
                  Age in Summer 2026
                </label>
                <select
                  value={formData.age_as_of_summer}
                  onChange={(e) => setFormData({ ...formData, age_as_of_summer: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
                  style={{ borderColor: 'var(--sand-200)', background: 'white' }}
                >
                  <option value="">Not specified</option>
                  {[...Array(16)].map((_, i) => (
                    <option key={i + 3} value={i + 3}>{i + 3} years old</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
                  Calendar Color
                </label>
                <div className="flex gap-2">
                  {childColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-full transition-all ${
                        formData.color === color ? 'ring-2 ring-offset-2' : ''
                      }`}
                      style={{
                        background: color,
                        ringColor: color
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all resize-none"
                  style={{ borderColor: 'var(--sand-200)' }}
                  placeholder="e.g., Loves swimming, allergic to peanuts"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={loading || !formData.name.trim()}
                >
                  {loading ? 'Saving...' : editingChild ? 'Save Changes' : 'Add Child'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors hover:border-[var(--ocean-400)] hover:bg-[var(--ocean-50)]"
              style={{ borderColor: 'var(--sand-300)', color: 'var(--earth-700)' }}
            >
              <PlusIcon className="w-5 h-5" />
              <span className="font-medium">Add a Child</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Icons
function XIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function EditIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
