import { memo } from 'react';

/**
 * Notification preferences panel.
 *
 * @param {Object} props
 * @param {Object|null} props.notificationPrefs - Current notification preferences object
 * @param {boolean} props.notificationPrefsLoading - Whether prefs are still loading
 * @param {function} props.onUpdatePref - Called with (key, value) to update a single pref
 */
function NotificationSettings({ notificationPrefs, notificationPrefsLoading, onUpdatePref }) {
  if (notificationPrefsLoading) {
    return (
      <div role="tabpanel" id="panel-notifications" aria-labelledby="tab-notifications" className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--earth-400)' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  if (!notificationPrefs) return null;

  return (
    <div role="tabpanel" id="panel-notifications" aria-labelledby="tab-notifications" className="space-y-6">
      {/* Global Settings */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--earth-50)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium" style={{ color: 'var(--earth-800)' }}>All Notifications</h4>
            <p className="text-sm" style={{ color: 'var(--earth-500)' }}>Master switch for all notifications</p>
          </div>
          <button
            onClick={() => onUpdatePref('notifications_enabled', !notificationPrefs.notifications_enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notificationPrefs.notifications_enabled ? '' : 'bg-gray-300'
            }`}
            style={notificationPrefs.notifications_enabled ? { backgroundColor: 'var(--accent-500)' } : {}}
            role="switch"
            aria-checked={notificationPrefs.notifications_enabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificationPrefs.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {notificationPrefs.notifications_enabled && (
        <>
          {/* Registration Alerts */}
          <div>
            <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--terra-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Registration Alerts
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
              Get notified before registration opens
            </p>

            <div className="space-y-3 pl-7">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.registration_alerts_enabled}
                  onChange={(e) => onUpdatePref('registration_alerts_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Enable registration alerts</span>
              </label>

              {notificationPrefs.registration_alerts_enabled && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Alert me</span>
                    <select
                      value={notificationPrefs.registration_alert_days}
                      onChange={(e) => onUpdatePref('registration_alert_days', parseInt(e.target.value))}
                      className="px-2 py-1 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--earth-300)' }}
                    >
                      <option value={3}>3 days</option>
                      <option value={5}>5 days</option>
                      <option value={7}>1 week</option>
                      <option value={14}>2 weeks</option>
                      <option value={30}>1 month</option>
                    </select>
                    <span className="text-sm" style={{ color: 'var(--earth-600)' }}>before registration opens</span>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.registration_opening_email}
                      onChange={(e) => onUpdatePref('registration_opening_email', e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent-500)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email for registration alerts</span>
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

          {/* Price Notifications */}
          <div>
            <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--sage-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Price Notifications
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
              Track price changes on watched camps
            </p>

            <div className="space-y-3 pl-7">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.price_drop_enabled}
                  onChange={(e) => onUpdatePref('price_drop_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Price drop alerts</span>
              </label>

              {notificationPrefs.price_drop_enabled && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Alert when price drops by at least</span>
                    <select
                      value={notificationPrefs.price_drop_threshold}
                      onChange={(e) => onUpdatePref('price_drop_threshold', parseInt(e.target.value))}
                      className="px-2 py-1 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--earth-300)' }}
                    >
                      <option value={5}>5%</option>
                      <option value={10}>10%</option>
                      <option value={15}>15%</option>
                      <option value={20}>20%</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.price_drop_email}
                      onChange={(e) => onUpdatePref('price_drop_email', e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent-500)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email for price drops</span>
                  </label>
                </>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.early_bird_reminder_enabled}
                  onChange={(e) => onUpdatePref('early_bird_reminder_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Early bird deadline reminders</span>
              </label>

              {notificationPrefs.early_bird_reminder_enabled && (
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Remind me</span>
                  <select
                    value={notificationPrefs.early_bird_days_before}
                    onChange={(e) => onUpdatePref('early_bird_days_before', parseInt(e.target.value))}
                    className="px-2 py-1 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--earth-300)' }}
                  >
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={5}>5 days</option>
                    <option value={7}>1 week</option>
                  </select>
                  <span className="text-sm" style={{ color: 'var(--earth-600)' }}>before early bird ends</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

          {/* Waitlist Notifications */}
          <div>
            <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--ocean-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Waitlist Updates
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
              Track waitlist status and spot availability
            </p>

            <div className="space-y-3 pl-7">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.waitlist_updates_enabled}
                  onChange={(e) => onUpdatePref('waitlist_updates_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Enable waitlist updates</span>
              </label>

              {notificationPrefs.waitlist_updates_enabled && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.waitlist_spot_available}
                      onChange={(e) => onUpdatePref('waitlist_spot_available', e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent-500)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Spot becomes available</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.waitlist_position_change}
                      onChange={(e) => onUpdatePref('waitlist_position_change', e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent-500)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Position changed</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.waitlist_email}
                      onChange={(e) => onUpdatePref('waitlist_email', e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent-500)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email for waitlist updates</span>
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

          {/* New Camps Matching Preferences */}
          <div>
            <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--sun-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              New Camp Matches
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
              Get notified when new camps match your preferences
            </p>

            <div className="space-y-3 pl-7">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.new_camp_match_enabled}
                  onChange={(e) => onUpdatePref('new_camp_match_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Enable new camp match alerts</span>
              </label>

              {notificationPrefs.new_camp_match_enabled && (
                <>
                  <div className="ml-4 space-y-2">
                    <p className="text-xs font-medium" style={{ color: 'var(--earth-600)' }}>Match based on:</p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.match_by_category}
                        onChange={(e) => onUpdatePref('match_by_category', e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--accent-500)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Preferred categories</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.match_by_age}
                        onChange={(e) => onUpdatePref('match_by_age', e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--accent-500)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Child ages</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.match_by_price}
                        onChange={(e) => onUpdatePref('match_by_price', e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--accent-500)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Budget range</span>
                    </label>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.new_camp_email}
                      onChange={(e) => onUpdatePref('new_camp_email', e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent-500)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email for new camp matches</span>
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

          {/* Schedule Notifications */}
          <div>
            <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--earth-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Schedule Alerts
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
              Conflicts and coverage gap reminders
            </p>

            <div className="space-y-3 pl-7">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.schedule_conflict_enabled}
                  onChange={(e) => onUpdatePref('schedule_conflict_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Schedule conflict warnings</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.coverage_gap_enabled}
                  onChange={(e) => onUpdatePref('coverage_gap_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Coverage gap reminders</span>
              </label>

              {notificationPrefs.coverage_gap_enabled && (
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Remind me on</span>
                  <select
                    value={notificationPrefs.coverage_reminder_day}
                    onChange={(e) => onUpdatePref('coverage_reminder_day', e.target.value)}
                    className="px-2 py-1 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--earth-300)' }}
                  >
                    <option value="sunday">Sunday</option>
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

          {/* Friend/Squad Notifications
              BUG-F-022: Squad notification category preferences are implemented here.
              - friend_match: Covered by friend_match_enabled (same camp notifications)
              - looking_for_friends: Covered by friend_activity_enabled (friend coordination)
              - new_member/schedule_change: Covered by squad_updates_enabled
          */}
          <div>
            <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--ocean-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Friend Activity (Squads)
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
              Notifications about squad members and friend matches
            </p>

            <div className="space-y-3 pl-7">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.friend_match_enabled}
                  onChange={(e) => onUpdatePref('friend_match_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Friend will be at the same camp</span>
              </label>

              {notificationPrefs.friend_match_enabled && (
                <label className="flex items-center gap-3 cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={notificationPrefs.friend_match_email}
                    onChange={(e) => onUpdatePref('friend_match_email', e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--accent-500)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email for friend matches</span>
                </label>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.friend_activity_enabled}
                  onChange={(e) => onUpdatePref('friend_activity_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Friend scheduled a camp</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.squad_updates_enabled}
                  onChange={(e) => onUpdatePref('squad_updates_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Squad member updates (joins, leaves)</span>
              </label>
            </div>
          </div>

          <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

          {/* Weekly Digest */}
          <div>
            <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--earth-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Weekly Planning Digest
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
              Summary email with upcoming registrations and reminders
            </p>

            <div className="space-y-3 pl-7">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.weekly_digest_enabled}
                  onChange={(e) => onUpdatePref('weekly_digest_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Enable weekly digest email</span>
              </label>

              {notificationPrefs.weekly_digest_enabled && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Send on</span>
                    <select
                      value={notificationPrefs.weekly_digest_day}
                      onChange={(e) => onUpdatePref('weekly_digest_day', e.target.value)}
                      className="px-2 py-1 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--earth-300)' }}
                    >
                      <option value="sunday">Sunday</option>
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                    </select>
                    <span className="text-sm" style={{ color: 'var(--earth-600)' }}>at</span>
                    <input
                      type="time"
                      value={notificationPrefs.weekly_digest_time || '09:00'}
                      onChange={(e) => {
                        const timeValue = e.target.value;
                        if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeValue) || timeValue === '') {
                          onUpdatePref('weekly_digest_time', timeValue || '09:00');
                        }
                      }}
                      className="px-2 py-1 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--earth-300)' }}
                    />
                  </div>

                  <div className="ml-4 space-y-2">
                    <p className="text-xs font-medium" style={{ color: 'var(--earth-600)' }}>Include in digest:</p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.digest_include_registration_dates}
                        onChange={(e) => onUpdatePref('digest_include_registration_dates', e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--accent-500)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Upcoming registration dates</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.digest_include_coverage_status}
                        onChange={(e) => onUpdatePref('digest_include_coverage_status', e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--accent-500)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Summer coverage status</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.digest_include_price_changes}
                        onChange={(e) => onUpdatePref('digest_include_price_changes', e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--accent-500)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Price changes on watched camps</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.digest_include_recommendations}
                        onChange={(e) => onUpdatePref('digest_include_recommendations', e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--accent-500)' }}
                      />
                      <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Camp recommendations</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

          {/* Budget Alerts */}
          <div>
            <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--terra-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Budget Alerts
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
              Get notified when approaching or exceeding budget
            </p>

            <div className="space-y-3 pl-7">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.budget_alerts_enabled}
                  onChange={(e) => onUpdatePref('budget_alerts_enabled', e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Enable budget alerts</span>
              </label>

              {notificationPrefs.budget_alerts_enabled && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Warn me at</span>
                    <select
                      value={notificationPrefs.budget_warning_threshold}
                      onChange={(e) => onUpdatePref('budget_warning_threshold', parseInt(e.target.value))}
                      className="px-2 py-1 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--earth-300)' }}
                    >
                      <option value={50}>50%</option>
                      <option value={75}>75%</option>
                      <option value={80}>80%</option>
                      <option value={90}>90%</option>
                      <option value={100}>100%</option>
                    </select>
                    <span className="text-sm" style={{ color: 'var(--earth-600)' }}>of budget</span>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.budget_exceeded_email}
                      onChange={(e) => onUpdatePref('budget_exceeded_email', e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent-500)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email when budget exceeded</span>
                  </label>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(NotificationSettings);
