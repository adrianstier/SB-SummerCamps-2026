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
      <div className="modal-overlay">
        <div className="modal modal-sm" style={{ padding: 'var(--space-8)' }}>
          <h2 className="heading-lg text-center mb-4">Sign In Required</h2>
          <p className="body-md text-secondary text-center mb-6">
            Sign in to manage children and schedules.
          </p>
          <button onClick={signIn} className="btn-primary btn-full mb-3">
            Sign in with Google
          </button>
          <button onClick={onClose} className="btn-secondary btn-full">
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
    <div className="modal-overlay">
      <div className="modal modal-md">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="heading-md">My Children</h2>
            <p className="body-sm text-muted mt-1">Each child gets their own schedule.</p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon btn-icon-sm"
            aria-label="Close"
          >
            <XIcon className="icon-md" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {/* Children list */}
          {children.length > 0 && !showAddForm && (
            <div className="space-y-3 mb-6">
              {children.map(child => (
                <div key={child.id} className="card flex items-center gap-4 p-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ background: child.color }}
                  >
                    {(child.name || '?')[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="heading-sm">{child.name}</p>
                    {child.age_as_of_summer && (
                      <p className="body-sm text-muted">
                        Age {child.age_as_of_summer} in Summer 2026
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(child)}
                      className="btn-icon btn-icon-sm"
                      aria-label={`Edit ${child.name}`}
                    >
                      <EditIcon className="icon-sm" />
                    </button>
                    {confirmDelete === child.id ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(child.id)}
                          className="btn-danger btn-sm"
                          disabled={loading}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="btn-ghost btn-sm"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(child.id)}
                        className="btn-icon btn-icon-sm"
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
            <div className="alert alert-error mb-4">{error}</div>
          )}

          {/* Add/Edit form */}
          {showAddForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Child's Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Emma"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Age in Summer 2026</label>
                <select
                  value={formData.age_as_of_summer}
                  onChange={(e) => setFormData({ ...formData, age_as_of_summer: e.target.value })}
                  className="select"
                >
                  <option value="">Not specified</option>
                  {[...Array(16)].map((_, i) => (
                    <option key={i + 3} value={i + 3}>{i + 3} years old</option>
                  ))}
                </select>
              </div>

              <div>
                <label id="color-label" className="label">Calendar Color</label>
                <div className="flex gap-2" role="radiogroup" aria-labelledby="color-label">
                  {childColors.map((color, index) => {
                    const colorNames = ['Blue', 'Purple', 'Pink', 'Orange', 'Green', 'Cyan'];
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ocean-500)] ${
                          formData.color === color ? 'ring-2 ring-offset-2' : ''
                        }`}
                        style={{
                          background: color,
                          ringColor: color
                        }}
                        role="radio"
                        aria-checked={formData.color === color}
                        aria-label={`${colorNames[index]} color`}
                      />
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="textarea"
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
              <PlusIcon className="icon-md" />
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
