import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Admin Dashboard Component
export function AdminDashboard({ camps, onClose }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  async function loadAdminData() {
    setLoading(true);
    try {
      // Load all data in parallel
      const [statsRes, usersRes, reviewsRes, reportsRes] = await Promise.all([
        loadStats(),
        loadUsers(),
        loadPendingReviews(),
        loadReports()
      ]);

      setStats(statsRes);
      setUsers(usersRes);
      setReviews(reviewsRes);
      setReports(reportsRes);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    // Get various stats from Supabase
    const [
      { count: totalUsers },
      { count: totalReviews },
      { count: pendingReviews },
      { count: totalChildren },
      { count: totalScheduled }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('children').select('*', { count: 'exact', head: true }),
      supabase.from('scheduled_camps').select('*', { count: 'exact', head: true })
    ]);

    return {
      totalUsers: totalUsers || 0,
      totalReviews: totalReviews || 0,
      pendingReviews: pendingReviews || 0,
      totalChildren: totalChildren || 0,
      totalScheduled: totalScheduled || 0,
      totalCamps: camps?.length || 0
    };
  }

  async function loadUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    return error ? [] : data;
  }

  async function loadPendingReviews() {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, profiles:user_id(full_name, email)')
      .in('status', ['pending', 'flagged'])
      .order('created_at', { ascending: false })
      .limit(20);

    return error ? [] : data;
  }

  async function loadReports() {
    const { data, error } = await supabase
      .from('reported_content')
      .select('*, reporter:reporter_id(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);

    return error ? [] : data;
  }

  async function updateReviewStatus(reviewId, status) {
    const { error } = await supabase
      .from('reviews')
      .update({ status })
      .eq('id', reviewId);

    if (!error) {
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    }
  }

  async function resolveReport(reportId, action) {
    const { error } = await supabase
      .from('reported_content')
      .update({
        status: action,
        resolved_by: profile.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (!error) {
      setReports(prev => prev.filter(r => r.id !== reportId));
    }
  }

  async function updateUserRole(userId, role) {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    }
  }

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--earth-800)' }}>
            Access Denied
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--sand-400)' }}>
            You don't have permission to access the admin dashboard.
          </p>
          <button onClick={onClose} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: 'var(--sand-50)' }}>
      {/* Sidebar */}
      <div className="w-64 bg-white border-r" style={{ borderColor: 'var(--sand-200)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--sand-200)' }}>
          <h1 className="font-serif text-xl font-bold" style={{ color: 'var(--earth-800)' }}>
            Admin Dashboard
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--sand-400)' }}>
            Camp Management System
          </p>
        </div>

        <nav className="p-4 space-y-1">
          {[
            { id: 'overview', icon: '📊', label: 'Overview' },
            { id: 'camps', icon: '🏕️', label: 'Camps' },
            { id: 'users', icon: '👥', label: 'Users' },
            { id: 'reviews', icon: '⭐', label: 'Reviews', badge: reviews.length },
            { id: 'reports', icon: '🚩', label: 'Reports', badge: reports.length },
            { id: 'settings', icon: '⚙️', label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
              style={{
                background: activeTab === tab.id ? 'var(--ocean-50)' : 'transparent',
                color: activeTab === tab.id ? 'var(--ocean-600)' : 'var(--earth-700)'
              }}
            >
              <span>{tab.icon}</span>
              <span className="flex-1">{tab.label}</span>
              {tab.badge > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'var(--terra-500)', color: 'white' }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 w-64 p-4 border-t" style={{ borderColor: 'var(--sand-200)' }}>
          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
            style={{ color: 'var(--sand-500)' }}
          >
            <span>←</span>
            <span>Exit Admin</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                style={{ borderColor: 'var(--ocean-500)', borderTopColor: 'transparent' }} />
              <p style={{ color: 'var(--sand-400)' }}>Loading admin data...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab stats={stats} camps={camps} />}
            {activeTab === 'camps' && <CampsTab camps={camps} />}
            {activeTab === 'users' && <UsersTab users={users} onUpdateRole={updateUserRole} />}
            {activeTab === 'reviews' && <ReviewsTab reviews={reviews} camps={camps} onUpdateStatus={updateReviewStatus} />}
            {activeTab === 'reports' && <ReportsTab reports={reports} onResolve={resolveReport} />}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ stats, camps }) {
  return (
    <div>
      <h2 className="text-2xl font-serif font-bold mb-6" style={{ color: 'var(--earth-800)' }}>
        Dashboard Overview
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon="🏕️" value={stats?.totalCamps || 0} label="Total Camps" color="ocean" />
        <StatCard icon="👥" value={stats?.totalUsers || 0} label="Users" color="sage" />
        <StatCard icon="👶" value={stats?.totalChildren || 0} label="Children" color="sun" />
        <StatCard icon="📅" value={stats?.totalScheduled || 0} label="Bookings" color="terra" />
        <StatCard icon="⭐" value={stats?.totalReviews || 0} label="Reviews" color="ocean" />
        <StatCard icon="⏳" value={stats?.pendingReviews || 0} label="Pending" color="terra" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--sand-200)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 rounded-lg transition-colors hover:bg-sand-50"
              style={{ color: 'var(--earth-700)' }}>
              🔄 Trigger Camp Scrape
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg transition-colors hover:bg-sand-50"
              style={{ color: 'var(--earth-700)' }}>
              📧 Send Weekly Digest
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg transition-colors hover:bg-sand-50"
              style={{ color: 'var(--earth-700)' }}>
              📊 Export User Data
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--sand-200)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>Category Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(
              camps?.reduce((acc, camp) => {
                acc[camp.category] = (acc[camp.category] || 0) + 1;
                return acc;
              }, {}) || {}
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--earth-700)' }}>{category}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--ocean-600)' }}>{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Camps Tab
function CampsTab({ camps }) {
  const [search, setSearch] = useState('');
  const [selectedCamp, setSelectedCamp] = useState(null);

  const filteredCamps = camps?.filter(camp =>
    camp.camp_name?.toLowerCase().includes(search.toLowerCase()) ||
    camp.organization?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif font-bold" style={{ color: 'var(--earth-800)' }}>
          Camp Management
        </h2>
        <button className="btn-primary">
          + Add Camp
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search camps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl"
          style={{ border: '1px solid var(--sand-200)', background: 'white' }}
        />
      </div>

      {/* Camps Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid var(--sand-200)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--sand-50)' }}>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--sand-500)' }}>
                Camp Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--sand-500)' }}>
                Category
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--sand-500)' }}>
                Ages
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--sand-500)' }}>
                Price
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--sand-500)' }}>
                Status
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--sand-500)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCamps.slice(0, 20).map(camp => (
              <tr key={camp.id} className="border-t" style={{ borderColor: 'var(--sand-100)' }}>
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: 'var(--earth-800)' }}>
                    {camp.camp_name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--sand-400)' }}>
                    {camp.organization}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--earth-700)' }}>
                  {camp.category}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--earth-700)' }}>
                  {camp.ages}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--earth-700)' }}>
                  {camp.price_week || 'TBD'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: camp.is_closed ? 'var(--terra-100)' : 'var(--sage-100)',
                      color: camp.is_closed ? 'var(--terra-600)' : 'var(--sage-600)'
                    }}
                  >
                    {camp.is_closed ? 'Closed' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelectedCamp(camp)}
                    className="text-sm font-medium hover:underline"
                    style={{ color: 'var(--ocean-600)' }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCamps.length > 20 && (
        <p className="text-center mt-4 text-sm" style={{ color: 'var(--sand-400)' }}>
          Showing 20 of {filteredCamps.length} camps
        </p>
      )}
    </div>
  );
}

// Users Tab
function UsersTab({ users, onUpdateRole }) {
  return (
    <div>
      <h2 className="text-2xl font-serif font-bold mb-6" style={{ color: 'var(--earth-800)' }}>
        User Management
      </h2>

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid var(--sand-200)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--sand-50)' }}>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--sand-500)' }}>
                User
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--sand-500)' }}>
                Role
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--sand-500)' }}>
                Joined
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--sand-500)' }}>
                Last Active
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--sand-500)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t" style={{ borderColor: 'var(--sand-100)' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                        style={{ background: 'var(--ocean-500)' }}
                      >
                        {user.full_name?.[0] || user.email?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <div className="font-medium" style={{ color: 'var(--earth-800)' }}>
                        {user.full_name || 'No name'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--sand-400)' }}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => onUpdateRole(user.id, e.target.value)}
                    className="px-2 py-1 rounded text-sm"
                    style={{ border: '1px solid var(--sand-200)' }}
                  >
                    <option value="user">User</option>
                    <option value="camp_owner">Camp Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--earth-700)' }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--sand-400)' }}>
                  {user.last_active_at
                    ? new Date(user.last_active_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-sm font-medium hover:underline" style={{ color: 'var(--ocean-600)' }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Reviews Tab
function ReviewsTab({ reviews, camps, onUpdateStatus }) {
  const getCamp = (campId) => camps?.find(c => c.id === campId);

  return (
    <div>
      <h2 className="text-2xl font-serif font-bold mb-6" style={{ color: 'var(--earth-800)' }}>
        Review Moderation
      </h2>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center" style={{ border: '1px solid var(--sand-200)' }}>
          <span className="text-4xl block mb-3">✓</span>
          <h3 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>All caught up!</h3>
          <p className="text-sm" style={{ color: 'var(--sand-400)' }}>No reviews pending moderation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => {
            const camp = getCamp(review.camp_id);
            return (
              <div
                key={review.id}
                className="bg-white rounded-xl p-6"
                style={{ border: '1px solid var(--sand-200)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: review.status === 'flagged' ? 'var(--terra-100)' : 'var(--sun-100)',
                          color: review.status === 'flagged' ? 'var(--terra-600)' : 'var(--sun-600)'
                        }}
                      >
                        {review.status}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--sand-400)' }}>
                        by {review.profiles?.full_name || review.profiles?.email}
                      </span>
                    </div>
                    <h4 className="font-medium" style={{ color: 'var(--earth-800)' }}>
                      Review for: {camp?.camp_name || review.camp_id}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {'★'.repeat(review.overall_rating)}{'☆'.repeat(5 - review.overall_rating)}
                  </div>
                </div>

                {review.title && (
                  <h5 className="font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
                    "{review.title}"
                  </h5>
                )}

                <p className="text-sm mb-4" style={{ color: 'var(--earth-600)' }}>
                  {review.review_text}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onUpdateStatus(review.id, 'published')}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: 'var(--sage-100)', color: 'var(--sage-600)' }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onUpdateStatus(review.id, 'removed')}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: 'var(--terra-100)', color: 'var(--terra-600)' }}
                  >
                    Reject
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: 'var(--sand-100)', color: 'var(--sand-600)' }}
                  >
                    Request Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Reports Tab
function ReportsTab({ reports, onResolve }) {
  return (
    <div>
      <h2 className="text-2xl font-serif font-bold mb-6" style={{ color: 'var(--earth-800)' }}>
        Content Reports
      </h2>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center" style={{ border: '1px solid var(--sand-200)' }}>
          <span className="text-4xl block mb-3">✓</span>
          <h3 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>No pending reports</h3>
          <p className="text-sm" style={{ color: 'var(--sand-400)' }}>All reports have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <div
              key={report.id}
              className="bg-white rounded-xl p-6"
              style={{ border: '1px solid var(--sand-200)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                    style={{ background: 'var(--terra-100)', color: 'var(--terra-600)' }}
                  >
                    {report.reason}
                  </span>
                  <p className="text-sm mt-2" style={{ color: 'var(--sand-400)' }}>
                    Reported by {report.reporter?.full_name || report.reporter?.email}
                    {' on '}
                    {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm" style={{ color: 'var(--sand-400)' }}>
                  {report.content_type}
                </span>
              </div>

              {report.details && (
                <p className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'var(--sand-50)', color: 'var(--earth-700)' }}>
                  "{report.details}"
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onResolve(report.id, 'action_taken')}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--terra-100)', color: 'var(--terra-600)' }}
                >
                  Take Action
                </button>
                <button
                  onClick={() => onResolve(report.id, 'dismissed')}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--sand-100)', color: 'var(--sand-600)' }}
                >
                  Dismiss
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ color: 'var(--ocean-600)' }}
                >
                  View Content
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Settings Tab
function SettingsTab() {
  return (
    <div>
      <h2 className="text-2xl font-serif font-bold mb-6" style={{ color: 'var(--earth-800)' }}>
        Admin Settings
      </h2>

      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--sand-200)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
            Scraper Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
                Scrape Frequency
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg"
                style={{ border: '1px solid var(--sand-200)' }}
              >
                <option>Daily at midnight</option>
                <option>Weekly on Sunday</option>
                <option>Manual only</option>
              </select>
            </div>
            <button className="btn-primary">
              Run Scraper Now
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--sand-200)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
            Email Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: 'var(--earth-700)' }}>Weekly Digest</p>
                <p className="text-sm" style={{ color: 'var(--sand-400)' }}>Send weekly camp updates to users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-ocean-500"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: 'var(--earth-700)' }}>Price Alerts</p>
                <p className="text-sm" style={{ color: 'var(--sand-400)' }}>Notify users of price changes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-ocean-500"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid var(--sand-200)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
            Data Management
          </h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-lg transition-colors hover:bg-sand-50"
              style={{ border: '1px solid var(--sand-200)', color: 'var(--earth-700)' }}>
              📥 Export All Camp Data (JSON)
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg transition-colors hover:bg-sand-50"
              style={{ border: '1px solid var(--sand-200)', color: 'var(--earth-700)' }}>
              📊 Export User Analytics (CSV)
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg transition-colors hover:bg-sand-50"
              style={{ border: '1px solid var(--sand-200)', color: 'var(--earth-700)' }}>
              📋 Export Reviews (CSV)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, value, label, color }) {
  const colors = {
    ocean: { bg: 'var(--ocean-50)', text: 'var(--ocean-600)' },
    sage: { bg: 'var(--sage-50)', text: 'var(--sage-600)' },
    sun: { bg: 'var(--sun-50)', text: 'var(--sun-600)' },
    terra: { bg: 'var(--terra-50)', text: 'var(--terra-600)' }
  };

  return (
    <div className="bg-white rounded-xl p-4" style={{ border: '1px solid var(--sand-200)' }}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3"
        style={{ background: colors[color]?.bg || 'var(--sand-100)' }}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold" style={{ color: colors[color]?.text || 'var(--earth-800)' }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--sand-400)' }}>{label}</p>
    </div>
  );
}

export default AdminDashboard;
