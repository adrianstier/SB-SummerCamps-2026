// ============================================================================
// GOOGLE CALENDAR INTEGRATION
// Generate calendar URLs and export functionality
// ============================================================================

/**
 * Generate a Google Calendar event URL
 * This creates a pre-filled link that opens Google Calendar with event details
 */
export function createGoogleCalendarUrl(event) {
  const { title, description, location, startDate, endDate, startTime, endTime } = event;

  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams();

  params.set('action', 'TEMPLATE');
  params.set('text', title);

  if (description) {
    params.set('details', description);
  }

  if (location) {
    params.set('location', location);
  }

  // Format dates for Google Calendar
  // For all-day events: YYYYMMDD
  // For timed events: YYYYMMDDTHHmmss
  const formatDate = (dateStr, timeStr = null) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const h = String(hours).padStart(2, '0');
      const m = String(minutes).padStart(2, '0');
      return `${year}${month}${day}T${h}${m}00`;
    }

    return `${year}${month}${day}`;
  };

  // If times provided, use them; otherwise treat as all-day event
  if (startTime && endTime) {
    const start = formatDate(startDate, startTime);
    const end = formatDate(endDate, endTime);
    params.set('dates', `${start}/${end}`);
  } else {
    // All-day events need end date + 1 day
    const start = formatDate(startDate);
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const end = formatDate(endDateObj.toISOString().split('T')[0]);
    params.set('dates', `${start}/${end}`);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate an iCal (.ics) file content for download
 */
export function generateICalFile(events) {
  const formatDateForICal = (dateStr, timeStr = null) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const h = String(hours).padStart(2, '0');
      const m = String(minutes).padStart(2, '0');
      return `${year}${month}${day}T${h}${m}00`;
    }

    return `${year}${month}${day}`;
  };

  const escapeText = (text) => {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Santa Barbara Summer Camps 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Summer Camps 2026'
  ];

  events.forEach((event, index) => {
    const uid = `camp-${event.campId || index}-${Date.now()}@sbsummercamps.com`;
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);

    if (event.startTime && event.endTime) {
      lines.push(`DTSTART:${formatDateForICal(event.startDate, event.startTime)}`);
      lines.push(`DTEND:${formatDateForICal(event.endDate, event.endTime)}`);
    } else {
      // All-day event
      lines.push(`DTSTART;VALUE=DATE:${formatDateForICal(event.startDate)}`);
      const endDate = new Date(event.endDate);
      endDate.setDate(endDate.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${formatDateForICal(endDate.toISOString().split('T')[0])}`);
    }

    lines.push(`SUMMARY:${escapeText(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeText(event.location)}`);
    }

    if (event.url) {
      // Escape the URL to prevent iCal injection (strip newlines/carriage returns)
      const safeUrl = event.url.replace(/[\r\n]/g, '');
      lines.push(`URL:${safeUrl}`);
    }

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Download iCal file
 */
export function downloadICalFile(events, filename = 'summer-camps-2026.ics') {
  const content = generateICalFile(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a camp schedule for calendar export
 */
export function formatCampForCalendar(camp, schedule) {
  // Parse hours if available (e.g., "9am-3pm" or "9:00 AM - 3:00 PM")
  let startTime = null;
  let endTime = null;

  if (camp.hours && camp.hours !== 'TBD') {
    const hoursMatch = camp.hours.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*[-–]\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (hoursMatch) {
      const [, startH, startM = '00', startPeriod, endH, endM = '00', endPeriod] = hoursMatch;

      let startHour = parseInt(startH);
      let endHour = parseInt(endH);

      // Convert to 24-hour format
      if (startPeriod?.toLowerCase() === 'pm' && startHour < 12) startHour += 12;
      if (startPeriod?.toLowerCase() === 'am' && startHour === 12) startHour = 0;
      if (endPeriod?.toLowerCase() === 'pm' && endHour < 12) endHour += 12;
      if (endPeriod?.toLowerCase() === 'am' && endHour === 12) endHour = 0;

      startTime = `${String(startHour).padStart(2, '0')}:${startM}`;
      endTime = `${String(endHour).padStart(2, '0')}:${endM}`;
    }
  }

  // Build description
  const descParts = [];
  if (camp.description) descParts.push(camp.description);
  if (camp.ages) descParts.push(`Ages: ${camp.ages}`);
  if (camp.price_week) descParts.push(`Price: ${camp.price_week}`);
  if (camp.contact_phone) descParts.push(`Phone: ${camp.contact_phone}`);
  if (camp.contact_email) descParts.push(`Email: ${camp.contact_email}`);
  if (schedule.notes) descParts.push(`Notes: ${schedule.notes}`);

  return {
    campId: camp.id,
    title: `🏕️ ${camp.camp_name}`,
    description: descParts.join('\n\n'),
    location: camp.address || camp.location || '',
    startDate: schedule.start_date,
    endDate: schedule.end_date,
    startTime,
    endTime,
    url: camp.website_url
  };
}

/**
 * Export all scheduled camps to Google Calendar (opens multiple tabs)
 */
export function exportAllToGoogleCalendar(camps, schedules) {
  const events = schedules.map(schedule => {
    const camp = camps.find(c => c.id === schedule.camp_id);
    if (!camp) return null;
    return formatCampForCalendar(camp, schedule);
  }).filter(Boolean);

  // Open each event in a new tab (limited to first 5 to avoid popup blocking)
  const maxTabs = 5;
  events.slice(0, maxTabs).forEach((event, index) => {
    setTimeout(() => {
      window.open(createGoogleCalendarUrl(event), '_blank');
    }, index * 500); // Stagger to avoid popup blocking
  });

  if (events.length > maxTabs) {
    alert(`Opened first ${maxTabs} events. Download the .ics file to import all ${events.length} events at once.`);
  }
}

/**
 * Export all scheduled camps to iCal file
 */
export function exportAllToICal(camps, schedules, childName = null) {
  const events = schedules.map(schedule => {
    const camp = camps.find(c => c.id === schedule.camp_id);
    if (!camp) return null;
    return formatCampForCalendar(camp, schedule);
  }).filter(Boolean);

  const filename = childName
    ? `${childName.toLowerCase().replace(/\s+/g, '-')}-summer-camps-2026.ics`
    : 'summer-camps-2026.ics';

  downloadICalFile(events, filename);
}
