/**
 * Email Template Structures
 *
 * These are template structures for notification emails.
 * Note: Actual email sending requires a backend service (e.g., Supabase Edge Functions,
 * SendGrid, Resend, etc.). These templates define the structure only.
 *
 * Usage:
 * 1. Call the template function with required data
 * 2. Returns { subject, html, text } ready for email service
 */

// ============================================================================
// COMMON STYLES & COMPONENTS
// ============================================================================

const BRAND_COLORS = {
  primary: '#3ba8a8',      // Ocean teal
  secondary: '#c76e5a',    // Terra cotta
  accent: '#f9cf45',       // Sun yellow
  sage: '#7c9a6c',         // Sage green
  earth: '#5a4a42',        // Earth brown
  sand: '#f5f0eb',         // Sand background
};

const emailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SB Summer Camps</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${BRAND_COLORS.sand};">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td style="text-align: center; padding: 20px 0;">
              <span style="font-family: Georgia, serif; font-size: 24px; color: ${BRAND_COLORS.earth}; font-weight: bold;">SB Summer Camps</span>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: ${BRAND_COLORS.earth}; opacity: 0.7; letter-spacing: 0.5px;">SUMMER PLANNING, SIMPLIFIED</p>
            </td>
          </tr>
        </table>

        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
          <tr>
            <td style="text-align: center; padding: 20px; color: ${BRAND_COLORS.earth}; opacity: 0.6; font-size: 12px;">
              <p style="margin: 0 0 8px 0;">
                <a href="https://sb-summer-camps.vercel.app/settings" style="color: ${BRAND_COLORS.primary}; text-decoration: none;">Manage notification preferences</a>
              </p>
              <p style="margin: 0;">Santa Barbara Summer Camps 2026</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const buttonStyle = `display: inline-block; padding: 12px 24px; background-color: ${BRAND_COLORS.primary}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;`;

const secondaryButtonStyle = `display: inline-block; padding: 12px 24px; background-color: ${BRAND_COLORS.sand}; color: ${BRAND_COLORS.earth}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; border: 1px solid #ddd;`;

// ============================================================================
// TEMPLATE: Registration Opening Alert
// ============================================================================

/**
 * Email for X days before camp registration opens
 * @param {Object} data - Template data
 * @param {string} data.userName - User's name
 * @param {string} data.campName - Camp name
 * @param {string} data.registrationDate - Registration open date
 * @param {number} data.daysUntil - Days until registration
 * @param {string} data.campUrl - Camp details URL
 * @param {string} data.price - Camp price (optional)
 * @param {string} data.ages - Camp age range (optional)
 */
export function registrationOpeningAlert(data) {
  const { userName, campName, registrationDate, daysUntil, campUrl, price, ages } = data;

  const subject = `${campName} registration opens in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;

  const html = emailWrapper(`
    <h1 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 24px; color: ${BRAND_COLORS.earth};">
      Registration Alert
    </h1>

    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      Hi ${userName || 'there'},
    </p>

    <div style="background-color: ${BRAND_COLORS.sand}; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_COLORS.secondary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
        ${daysUntil === 1 ? 'OPENS TOMORROW' : `OPENS IN ${daysUntil} DAYS`}
      </p>
      <h2 style="margin: 0 0 12px 0; font-family: Georgia, serif; font-size: 20px; color: ${BRAND_COLORS.earth};">
        ${campName}
      </h2>
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.earth}; opacity: 0.8;">
        Registration opens: <strong>${registrationDate}</strong>
      </p>
      ${price ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.earth}; opacity: 0.8;">Price: ${price}</p>` : ''}
      ${ages ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.earth}; opacity: 0.8;">Ages: ${ages}</p>` : ''}
    </div>

    <p style="margin: 0 0 24px 0; font-size: 14px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      Set a reminder to register early for the best session selection.
    </p>

    <a href="${campUrl}" style="${buttonStyle}">
      View Camp Details
    </a>
  `);

  const text = `
Registration Alert: ${campName}

Hi ${userName || 'there'},

${campName} registration opens ${daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}!

Registration date: ${registrationDate}
${price ? `Price: ${price}` : ''}
${ages ? `Ages: ${ages}` : ''}

View camp details: ${campUrl}

---
Manage notification preferences: https://sb-summer-camps.vercel.app/settings
  `.trim();

  return { subject, html, text };
}

// ============================================================================
// TEMPLATE: Price Drop Notification
// ============================================================================

/**
 * Email when a watched camp drops in price
 * @param {Object} data - Template data
 * @param {string} data.userName - User's name
 * @param {string} data.campName - Camp name
 * @param {number} data.oldPrice - Previous price
 * @param {number} data.newPrice - New price
 * @param {number} data.percentDrop - Percentage drop
 * @param {string} data.campUrl - Camp details URL
 */
export function priceDropNotification(data) {
  const { userName, campName, oldPrice, newPrice, percentDrop, campUrl } = data;

  const savings = oldPrice - newPrice;
  const subject = `Price drop: ${campName} now $${newPrice} (${percentDrop}% off)`;

  const html = emailWrapper(`
    <h1 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 24px; color: ${BRAND_COLORS.earth};">
      Price Drop Alert
    </h1>

    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      Hi ${userName || 'there'},
    </p>

    <div style="background-color: #e8f5e9; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid ${BRAND_COLORS.sage};">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_COLORS.sage}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
        ${percentDrop}% PRICE DROP
      </p>
      <h2 style="margin: 0 0 12px 0; font-family: Georgia, serif; font-size: 20px; color: ${BRAND_COLORS.earth};">
        ${campName}
      </h2>
      <div style="display: flex; align-items: baseline; gap: 12px;">
        <span style="font-size: 24px; font-weight: bold; color: ${BRAND_COLORS.sage};">$${newPrice}</span>
        <span style="font-size: 16px; color: ${BRAND_COLORS.earth}; text-decoration: line-through; opacity: 0.5;">$${oldPrice}</span>
        <span style="font-size: 14px; color: ${BRAND_COLORS.sage}; font-weight: 600;">Save $${savings}</span>
      </div>
    </div>

    <a href="${campUrl}" style="${buttonStyle}">
      View Camp
    </a>
  `);

  const text = `
Price Drop Alert: ${campName}

Hi ${userName || 'there'},

Great news! ${campName} just dropped in price.

New price: $${newPrice} (was $${oldPrice})
You save: $${savings} (${percentDrop}% off)

View camp: ${campUrl}

---
Manage notification preferences: https://sb-summer-camps.vercel.app/settings
  `.trim();

  return { subject, html, text };
}

// ============================================================================
// TEMPLATE: Waitlist Update
// ============================================================================

/**
 * Email when waitlist status changes
 * @param {Object} data - Template data
 * @param {string} data.userName - User's name
 * @param {string} data.campName - Camp name
 * @param {string} data.sessionName - Session name
 * @param {string} data.updateType - 'spot_available' | 'position_changed'
 * @param {number} data.newPosition - New position (if position_changed)
 * @param {string} data.campUrl - Camp details URL
 * @param {string} data.deadline - Deadline to respond (if spot_available)
 */
export function waitlistUpdate(data) {
  const { userName, campName, sessionName, updateType, newPosition, campUrl, deadline } = data;

  const isSpotAvailable = updateType === 'spot_available';

  const subject = isSpotAvailable
    ? `Spot available: ${campName} - Act fast!`
    : `Waitlist update: ${campName}`;

  const html = emailWrapper(`
    <h1 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 24px; color: ${BRAND_COLORS.earth};">
      ${isSpotAvailable ? 'A Spot Opened Up!' : 'Waitlist Update'}
    </h1>

    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      Hi ${userName || 'there'},
    </p>

    ${isSpotAvailable ? `
      <div style="background-color: #fff3e0; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid ${BRAND_COLORS.secondary};">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_COLORS.secondary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          SPOT AVAILABLE
        </p>
        <h2 style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 20px; color: ${BRAND_COLORS.earth};">
          ${campName}
        </h2>
        ${sessionName ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_COLORS.earth};">Session: ${sessionName}</p>` : ''}
        ${deadline ? `<p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.secondary}; font-weight: 600;">Respond by: ${deadline}</p>` : ''}
      </div>

      <p style="margin: 0 0 24px 0; font-size: 14px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
        A spot just opened up in your waitlisted camp. Respond quickly to secure your spot.
      </p>

      <a href="${campUrl}" style="${buttonStyle}">
        Claim Your Spot
      </a>
    ` : `
      <div style="background-color: ${BRAND_COLORS.sand}; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 20px; color: ${BRAND_COLORS.earth};">
          ${campName}
        </h2>
        ${sessionName ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_COLORS.earth};">Session: ${sessionName}</p>` : ''}
        <p style="margin: 0; font-size: 16px; color: ${BRAND_COLORS.primary}; font-weight: 600;">
          Your position: #${newPosition}
        </p>
      </div>

      <p style="margin: 0 0 24px 0; font-size: 14px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
        You've moved up on the waitlist. We'll notify you when a spot opens.
      </p>

      <a href="${campUrl}" style="${secondaryButtonStyle}">
        View Camp
      </a>
    `}
  `);

  const text = isSpotAvailable
    ? `
Spot Available: ${campName}

Hi ${userName || 'there'},

A spot just opened up in ${campName}${sessionName ? ` (${sessionName})` : ''}!

${deadline ? `Respond by: ${deadline}` : ''}

Claim your spot: ${campUrl}

---
Manage notification preferences: https://sb-summer-camps.vercel.app/settings
    `.trim()
    : `
Waitlist Update: ${campName}

Hi ${userName || 'there'},

Your waitlist position for ${campName}${sessionName ? ` (${sessionName})` : ''} has changed.

New position: #${newPosition}

View camp: ${campUrl}

---
Manage notification preferences: https://sb-summer-camps.vercel.app/settings
    `.trim();

  return { subject, html, text };
}

// ============================================================================
// TEMPLATE: New Camps Matching Preferences
// ============================================================================

/**
 * Email when new camps match user preferences
 * @param {Object} data - Template data
 * @param {string} data.userName - User's name
 * @param {Array} data.camps - Array of matching camps
 * @param {string} data.camps[].name - Camp name
 * @param {string} data.camps[].category - Camp category
 * @param {string} data.camps[].price - Camp price
 * @param {string} data.camps[].ages - Age range
 * @param {string} data.camps[].url - Camp URL
 */
export function newCampsMatching(data) {
  const { userName, camps } = data;

  const subject = `${camps.length} new camp${camps.length > 1 ? 's' : ''} matching your preferences`;

  const campListHtml = camps.map(camp => `
    <div style="padding: 16px; border-bottom: 1px solid #eee;">
      <h3 style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 16px; color: ${BRAND_COLORS.earth};">
        ${camp.name}
      </h3>
      <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.earth}; opacity: 0.7;">
        ${camp.category} | ${camp.ages} | ${camp.price}
      </p>
      <a href="${camp.url}" style="display: inline-block; margin-top: 8px; font-size: 13px; color: ${BRAND_COLORS.primary}; text-decoration: none;">
        View details &rarr;
      </a>
    </div>
  `).join('');

  const html = emailWrapper(`
    <h1 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 24px; color: ${BRAND_COLORS.earth};">
      New Camps Found
    </h1>

    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      Hi ${userName || 'there'},
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      We found ${camps.length} new camp${camps.length > 1 ? 's' : ''} that match${camps.length === 1 ? 'es' : ''} your preferences:
    </p>

    <div style="background-color: white; border: 1px solid #eee; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
      ${campListHtml}
    </div>

    <a href="https://sb-summer-camps.vercel.app" style="${buttonStyle}">
      Browse All Camps
    </a>
  `);

  const campListText = camps.map(camp =>
    `- ${camp.name} (${camp.category}, ${camp.ages}, ${camp.price})\n  ${camp.url}`
  ).join('\n\n');

  const text = `
New Camps Matching Your Preferences

Hi ${userName || 'there'},

We found ${camps.length} new camp${camps.length > 1 ? 's' : ''} that match your preferences:

${campListText}

Browse all camps: https://sb-summer-camps.vercel.app

---
Manage notification preferences: https://sb-summer-camps.vercel.app/settings
  `.trim();

  return { subject, html, text };
}

// ============================================================================
// TEMPLATE: Schedule Conflict Warning
// ============================================================================

/**
 * Email when schedule conflicts are detected
 * @param {Object} data - Template data
 * @param {string} data.userName - User's name
 * @param {string} data.childName - Child's name
 * @param {Array} data.conflicts - Array of conflict details
 * @param {string} data.conflicts[].camp1 - First camp name
 * @param {string} data.conflicts[].camp2 - Second camp name
 * @param {string} data.conflicts[].dates - Overlapping dates
 * @param {string} data.plannerUrl - Planner URL
 */
export function scheduleConflictWarning(data) {
  const { userName, childName, conflicts, plannerUrl } = data;

  const subject = `Schedule conflict${conflicts.length > 1 ? 's' : ''} detected for ${childName}`;

  const conflictListHtml = conflicts.map(conflict => `
    <div style="padding: 16px; background-color: #fff3e0; border-radius: 8px; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 20px;">&#x26A0;</span>
        <strong style="color: ${BRAND_COLORS.secondary};">${conflict.dates}</strong>
      </div>
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.earth};">
        ${conflict.camp1} <strong>overlaps with</strong> ${conflict.camp2}
      </p>
    </div>
  `).join('');

  const html = emailWrapper(`
    <h1 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 24px; color: ${BRAND_COLORS.earth};">
      Schedule Conflict Detected
    </h1>

    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      Hi ${userName || 'there'},
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      We noticed ${conflicts.length > 1 ? 'some overlapping camps' : 'an overlap'} in ${childName}'s summer schedule:
    </p>

    ${conflictListHtml}

    <p style="margin: 16px 0 24px 0; font-size: 14px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      Open your planner to resolve the conflict.
    </p>

    <a href="${plannerUrl}" style="${buttonStyle}">
      View Schedule
    </a>
  `);

  const conflictListText = conflicts.map(conflict =>
    `- ${conflict.dates}: ${conflict.camp1} overlaps with ${conflict.camp2}`
  ).join('\n');

  const text = `
Schedule Conflict Detected

Hi ${userName || 'there'},

We noticed overlapping camps in ${childName}'s summer schedule:

${conflictListText}

View schedule: ${plannerUrl}

---
Manage notification preferences: https://sb-summer-camps.vercel.app/settings
  `.trim();

  return { subject, html, text };
}

// ============================================================================
// TEMPLATE: Coverage Gap Reminder
// ============================================================================

/**
 * Email reminder about uncovered weeks
 * @param {Object} data - Template data
 * @param {string} data.userName - User's name
 * @param {Array} data.children - Array of children with gaps
 * @param {string} data.children[].name - Child's name
 * @param {Array} data.children[].gaps - Array of gap weeks
 * @param {number} data.totalGaps - Total gap count
 * @param {string} data.plannerUrl - Planner URL
 */
export function coverageGapReminder(data) {
  const { userName, children, totalGaps, plannerUrl } = data;

  const subject = `${totalGaps} uncovered week${totalGaps > 1 ? 's' : ''} in your summer plan`;

  const childrenHtml = children.map(child => `
    <div style="margin-bottom: 16px;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_COLORS.earth}; font-weight: 600;">
        ${child.name}
      </h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${child.gaps.map(gap => `
          <span style="padding: 4px 12px; background-color: #fff3e0; border-radius: 16px; font-size: 13px; color: ${BRAND_COLORS.secondary};">
            ${gap}
          </span>
        `).join('')}
      </div>
    </div>
  `).join('');

  const html = emailWrapper(`
    <h1 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 24px; color: ${BRAND_COLORS.earth};">
      Coverage Gap Reminder
    </h1>

    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      Hi ${userName || 'there'},
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      You have ${totalGaps} week${totalGaps > 1 ? 's' : ''} without camp coverage this summer:
    </p>

    <div style="background-color: ${BRAND_COLORS.sand}; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      ${childrenHtml}
    </div>

    <a href="${plannerUrl}" style="${buttonStyle}">
      Fill the Gaps
    </a>
  `);

  const childrenText = children.map(child =>
    `${child.name}: ${child.gaps.join(', ')}`
  ).join('\n');

  const text = `
Coverage Gap Reminder

Hi ${userName || 'there'},

You have ${totalGaps} week${totalGaps > 1 ? 's' : ''} without camp coverage:

${childrenText}

Fill the gaps: ${plannerUrl}

---
Manage notification preferences: https://sb-summer-camps.vercel.app/settings
  `.trim();

  return { subject, html, text };
}

// ============================================================================
// TEMPLATE: Friend Activity Notification
// ============================================================================

/**
 * Email when a squad member schedules a camp
 * @param {Object} data - Template data
 * @param {string} data.userName - User's name
 * @param {string} data.friendName - Friend's name (or 'A friend' if anonymous)
 * @param {string} data.campName - Camp name
 * @param {string} data.dates - Camp dates
 * @param {string} data.squadName - Squad name
 * @param {string} data.campUrl - Camp URL
 */
export function friendActivityNotification(data) {
  const { userName, friendName, campName, dates, squadName, campUrl } = data;

  const subject = `${friendName} scheduled ${campName}`;

  const html = emailWrapper(`
    <h1 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 24px; color: ${BRAND_COLORS.earth};">
      Friend Activity
    </h1>

    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      Hi ${userName || 'there'},
    </p>

    <div style="background-color: #e3f2fd; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid ${BRAND_COLORS.primary};">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_COLORS.primary}; font-weight: 600;">
        ${squadName}
      </p>
      <p style="margin: 0 0 12px 0; font-size: 16px; color: ${BRAND_COLORS.earth};">
        <strong>${friendName}</strong> just scheduled:
      </p>
      <h2 style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 20px; color: ${BRAND_COLORS.earth};">
        ${campName}
      </h2>
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.earth}; opacity: 0.8;">
        ${dates}
      </p>
    </div>

    <p style="margin: 0 0 24px 0; font-size: 14px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      Want your kids at the same camp?
    </p>

    <a href="${campUrl}" style="${buttonStyle}">
      View Camp
    </a>
  `);

  const text = `
Friend Activity

Hi ${userName || 'there'},

${friendName} from ${squadName} just scheduled ${campName} for ${dates}.

View camp: ${campUrl}

---
Manage notification preferences: https://sb-summer-camps.vercel.app/settings
  `.trim();

  return { subject, html, text };
}

// ============================================================================
// TEMPLATE: Weekly Planning Digest
// ============================================================================

/**
 * Weekly summary email
 * @param {Object} data - Template data
 * @param {string} data.userName - User's name
 * @param {Array} data.upcomingRegistrations - Camps opening this week
 * @param {Object} data.coverageStatus - Coverage stats per child
 * @param {Array} data.priceChanges - Recent price changes
 * @param {Array} data.recommendations - Recommended camps
 * @param {string} data.plannerUrl - Planner URL
 */
export function weeklyPlanningDigest(data) {
  const {
    userName,
    upcomingRegistrations = [],
    coverageStatus = {},
    priceChanges = [],
    recommendations = [],
    plannerUrl
  } = data;

  const subject = 'Your weekly summer planning digest';

  let sectionsHtml = '';

  // Upcoming registrations
  if (upcomingRegistrations.length > 0) {
    sectionsHtml += `
      <div style="margin-bottom: 32px;">
        <h2 style="margin: 0 0 12px 0; font-family: Georgia, serif; font-size: 18px; color: ${BRAND_COLORS.earth}; border-bottom: 2px solid ${BRAND_COLORS.primary}; padding-bottom: 8px;">
          Registration Opening This Week
        </h2>
        ${upcomingRegistrations.map(camp => `
          <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div>
                <strong style="color: ${BRAND_COLORS.earth};">${camp.name}</strong>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: ${BRAND_COLORS.earth}; opacity: 0.7;">${camp.category}</p>
              </div>
              <span style="font-size: 13px; color: ${BRAND_COLORS.secondary}; font-weight: 600;">${camp.openDate}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Coverage status
  const childrenNames = Object.keys(coverageStatus);
  if (childrenNames.length > 0) {
    sectionsHtml += `
      <div style="margin-bottom: 32px;">
        <h2 style="margin: 0 0 12px 0; font-family: Georgia, serif; font-size: 18px; color: ${BRAND_COLORS.earth}; border-bottom: 2px solid ${BRAND_COLORS.sage}; padding-bottom: 8px;">
          Summer Coverage Status
        </h2>
        ${childrenNames.map(name => {
          const status = coverageStatus[name];
          const percentage = Math.round((status.covered / status.total) * 100);
          return `
            <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="color: ${BRAND_COLORS.earth};">${name}</strong>
                <span style="font-size: 14px; color: ${percentage === 100 ? BRAND_COLORS.sage : BRAND_COLORS.secondary}; font-weight: 600;">
                  ${status.covered}/${status.total} weeks
                </span>
              </div>
              <div style="background-color: #eee; border-radius: 4px; height: 8px; overflow: hidden;">
                <div style="background-color: ${percentage === 100 ? BRAND_COLORS.sage : BRAND_COLORS.primary}; height: 100%; width: ${percentage}%;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Price changes
  if (priceChanges.length > 0) {
    sectionsHtml += `
      <div style="margin-bottom: 32px;">
        <h2 style="margin: 0 0 12px 0; font-family: Georgia, serif; font-size: 18px; color: ${BRAND_COLORS.earth}; border-bottom: 2px solid ${BRAND_COLORS.sage}; padding-bottom: 8px;">
          Price Changes on Watched Camps
        </h2>
        ${priceChanges.map(change => `
          <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: ${BRAND_COLORS.earth};">${change.campName}</strong>
              <div>
                <span style="text-decoration: line-through; color: #999; font-size: 13px;">$${change.oldPrice}</span>
                <span style="margin-left: 8px; color: ${BRAND_COLORS.sage}; font-weight: 600;">$${change.newPrice}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Recommendations
  if (recommendations.length > 0) {
    sectionsHtml += `
      <div style="margin-bottom: 32px;">
        <h2 style="margin: 0 0 12px 0; font-family: Georgia, serif; font-size: 18px; color: ${BRAND_COLORS.earth}; border-bottom: 2px solid ${BRAND_COLORS.accent}; padding-bottom: 8px;">
          Recommended for You
        </h2>
        ${recommendations.slice(0, 3).map(camp => `
          <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <strong style="color: ${BRAND_COLORS.earth};">${camp.name}</strong>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: ${BRAND_COLORS.earth}; opacity: 0.7;">
              ${camp.category} | ${camp.ages} | ${camp.price}
            </p>
          </div>
        `).join('')}
      </div>
    `;
  }

  const html = emailWrapper(`
    <h1 style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 24px; color: ${BRAND_COLORS.earth};">
      Weekly Planning Digest
    </h1>
    <p style="margin: 0 0 32px 0; font-size: 14px; color: ${BRAND_COLORS.earth}; opacity: 0.7;">
      Your summer camp planning summary
    </p>

    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND_COLORS.earth}; line-height: 1.6;">
      Hi ${userName || 'there'},
    </p>

    ${sectionsHtml || '<p style="color: ' + BRAND_COLORS.earth + '; opacity: 0.7;">No updates this week. Your summer planning is on track.</p>'}

    <div style="margin-top: 32px; text-align: center;">
      <a href="${plannerUrl}" style="${buttonStyle}">
        Open Planner
      </a>
    </div>
  `);

  const text = `
Weekly Planning Digest

Hi ${userName || 'there'},

${upcomingRegistrations.length > 0 ? `
REGISTRATION OPENING THIS WEEK
${upcomingRegistrations.map(c => `- ${c.name}: ${c.openDate}`).join('\n')}
` : ''}

${childrenNames.length > 0 ? `
SUMMER COVERAGE STATUS
${childrenNames.map(name => `- ${name}: ${coverageStatus[name].covered}/${coverageStatus[name].total} weeks`).join('\n')}
` : ''}

${priceChanges.length > 0 ? `
PRICE CHANGES
${priceChanges.map(c => `- ${c.campName}: $${c.oldPrice} -> $${c.newPrice}`).join('\n')}
` : ''}

${recommendations.length > 0 ? `
RECOMMENDED FOR YOU
${recommendations.slice(0, 3).map(c => `- ${c.name} (${c.category})`).join('\n')}
` : ''}

Open planner: ${plannerUrl}

---
Manage notification preferences: https://sb-summer-camps.vercel.app/settings
  `.trim();

  return { subject, html, text };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  registrationOpeningAlert,
  priceDropNotification,
  waitlistUpdate,
  newCampsMatching,
  scheduleConflictWarning,
  coverageGapReminder,
  friendActivityNotification,
  weeklyPlanningDigest,
};
