import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createGoogleCalendarUrl,
  generateICalFile,
  formatCampForCalendar,
  exportAllToICal,
  exportAllToGoogleCalendar
} from './googleCalendar';

describe('googleCalendar', () => {
  describe('createGoogleCalendarUrl', () => {
    it('creates URL with required parameters', () => {
      const event = {
        title: 'Summer Camp Week 1',
        description: 'Fun summer activities',
        location: '123 Beach Blvd',
        startDate: '2026-06-08',
        endDate: '2026-06-12'
      };

      const url = createGoogleCalendarUrl(event);

      expect(url).toContain('https://calendar.google.com/calendar/render');
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain('text=Summer+Camp+Week+1');
      expect(url).toContain('details=Fun+summer+activities');
      expect(url).toContain('location=123+Beach+Blvd');
      expect(url).toContain('dates=');
    });

    it('creates URL for timed event with start and end times', () => {
      const event = {
        title: 'Morning Camp Session',
        startDate: '2026-06-08',
        endDate: '2026-06-08',
        startTime: '09:00',
        endTime: '15:00'
      };

      const url = createGoogleCalendarUrl(event);

      // Timed event format: YYYYMMDDTHHmmss
      expect(url).toMatch(/dates=\d{8}T090000%2F\d{8}T150000/);
    });

    it('handles event without description', () => {
      const event = {
        title: 'Simple Event',
        startDate: '2026-07-01',
        endDate: '2026-07-01'
      };

      const url = createGoogleCalendarUrl(event);

      expect(url).toContain('text=Simple+Event');
      expect(url).not.toContain('details=');
    });

    it('handles event without location', () => {
      const event = {
        title: 'Online Event',
        description: 'Virtual camp session',
        startDate: '2026-07-01',
        endDate: '2026-07-01'
      };

      const url = createGoogleCalendarUrl(event);

      expect(url).not.toContain('location=');
    });

    it('properly encodes special characters in title', () => {
      const event = {
        title: "Kid's Art & Music Camp",
        startDate: '2026-06-15',
        endDate: '2026-06-19'
      };

      const url = createGoogleCalendarUrl(event);

      expect(url).toContain('text=Kid%27s+Art+%26+Music+Camp');
    });

    it('handles single-day all-day event', () => {
      const event = {
        title: 'One Day Workshop',
        startDate: '2026-07-15',
        endDate: '2026-07-15'
      };

      const url = createGoogleCalendarUrl(event);

      // Should contain dates parameter
      expect(url).toContain('dates=');
    });

    it('handles multi-week event', () => {
      const event = {
        title: 'Extended Camp',
        startDate: '2026-06-08',
        endDate: '2026-06-26'
      };

      const url = createGoogleCalendarUrl(event);

      expect(url).toContain('dates=');
    });

    it('handles edge case with midnight times', () => {
      const event = {
        title: 'Overnight Camp',
        startDate: '2026-06-08',
        endDate: '2026-06-09',
        startTime: '00:00',
        endTime: '23:59'
      };

      const url = createGoogleCalendarUrl(event);

      expect(url).toMatch(/T000000/);
      expect(url).toMatch(/T235900/);
    });
  });

  describe('generateICalFile', () => {
    it('generates valid iCal format for single event', () => {
      const events = [{
        campId: 'camp-1',
        title: 'Surf Camp',
        description: 'Learn to surf',
        location: 'Santa Barbara Beach',
        startDate: '2026-06-08',
        endDate: '2026-06-12',
        url: 'https://surfcamp.com'
      }];

      const ical = generateICalFile(events);

      expect(ical).toContain('BEGIN:VCALENDAR');
      expect(ical).toContain('VERSION:2.0');
      expect(ical).toContain('PRODID:-//Santa Barbara Summer Camps 2026//EN');
      expect(ical).toContain('BEGIN:VEVENT');
      expect(ical).toContain('SUMMARY:Surf Camp');
      expect(ical).toContain('DESCRIPTION:Learn to surf');
      expect(ical).toContain('LOCATION:Santa Barbara Beach');
      expect(ical).toContain('DTSTART;VALUE=DATE:');
      expect(ical).toContain('URL:https://surfcamp.com');
      expect(ical).toContain('END:VEVENT');
      expect(ical).toContain('END:VCALENDAR');
    });

    it('generates iCal with timed events', () => {
      const events = [{
        title: 'Morning Session',
        startDate: '2026-06-08',
        endDate: '2026-06-08',
        startTime: '09:00',
        endTime: '12:00'
      }];

      const ical = generateICalFile(events);

      expect(ical).toMatch(/DTSTART:\d{8}T090000/);
      expect(ical).toMatch(/DTEND:\d{8}T120000/);
    });

    it('handles multiple events', () => {
      const events = [
        { title: 'Week 1', startDate: '2026-06-08', endDate: '2026-06-12' },
        { title: 'Week 2', startDate: '2026-06-15', endDate: '2026-06-19' },
        { title: 'Week 3', startDate: '2026-06-22', endDate: '2026-06-26' }
      ];

      const ical = generateICalFile(events);

      const eventCount = (ical.match(/BEGIN:VEVENT/g) || []).length;
      expect(eventCount).toBe(3);
      expect(ical).toContain('SUMMARY:Week 1');
      expect(ical).toContain('SUMMARY:Week 2');
      expect(ical).toContain('SUMMARY:Week 3');
    });

    it('escapes special characters in text', () => {
      const events = [{
        title: 'Event with; semicolon, comma, and backslash\\',
        description: 'Line 1\nLine 2',
        startDate: '2026-06-08',
        endDate: '2026-06-08'
      }];

      const ical = generateICalFile(events);

      expect(ical).toContain('SUMMARY:Event with\\; semicolon\\, comma\\, and backslash\\\\');
      expect(ical).toContain('DESCRIPTION:Line 1\\nLine 2');
    });

    it('handles empty events array', () => {
      const ical = generateICalFile([]);

      expect(ical).toContain('BEGIN:VCALENDAR');
      expect(ical).toContain('END:VCALENDAR');
      expect(ical).not.toContain('BEGIN:VEVENT');
    });

    it('generates unique UIDs for each event', () => {
      const events = [
        { campId: 'camp-1', title: 'Event 1', startDate: '2026-06-08', endDate: '2026-06-08' },
        { campId: 'camp-2', title: 'Event 2', startDate: '2026-06-08', endDate: '2026-06-08' }
      ];

      const ical = generateICalFile(events);
      const uids = ical.match(/UID:([^\r\n]+)/g);

      expect(uids).toHaveLength(2);
      expect(uids[0]).not.toBe(uids[1]);
    });

    it('includes DTSTAMP for each event', () => {
      const events = [{
        title: 'Test Event',
        startDate: '2026-06-08',
        endDate: '2026-06-08'
      }];

      const ical = generateICalFile(events);

      expect(ical).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    });
  });

  describe('formatCampForCalendar', () => {
    const mockCamp = {
      id: 'camp-1',
      camp_name: 'Adventure Surf Camp',
      description: 'Learn surfing skills',
      ages: '8-14',
      price_week: '$400-500',
      address: '123 Beach Blvd, Santa Barbara',
      hours: '9am-3pm',
      contact_phone: '(805) 555-1234',
      contact_email: 'info@surfcamp.com',
      website_url: 'https://surfcamp.com'
    };

    const mockSchedule = {
      start_date: '2026-06-08',
      end_date: '2026-06-12',
      notes: 'Bring sunscreen'
    };

    it('formats camp with all fields', () => {
      const result = formatCampForCalendar(mockCamp, mockSchedule);

      expect(result.campId).toBe('camp-1');
      expect(result.title).toBe('🏕️ Adventure Surf Camp');
      expect(result.location).toBe('123 Beach Blvd, Santa Barbara');
      expect(result.startDate).toBe('2026-06-08');
      expect(result.endDate).toBe('2026-06-12');
      expect(result.startTime).toBe('09:00');
      expect(result.endTime).toBe('15:00');
      expect(result.url).toBe('https://surfcamp.com');
      expect(result.description).toContain('Learn surfing skills');
      expect(result.description).toContain('Ages: 8-14');
      expect(result.description).toContain('Price: $400-500');
      expect(result.description).toContain('Phone: (805) 555-1234');
      expect(result.description).toContain('Email: info@surfcamp.com');
      expect(result.description).toContain('Notes: Bring sunscreen');
    });

    it('parses various hour formats correctly', () => {
      const testCases = [
        { hours: '9am-3pm', expected: { start: '09:00', end: '15:00' } },
        { hours: '8:30am-4pm', expected: { start: '08:30', end: '16:00' } },
        { hours: '9:00 AM - 3:00 PM', expected: { start: '09:00', end: '15:00' } },
        { hours: '8am-12pm', expected: { start: '08:00', end: '12:00' } },
        { hours: '12pm-5pm', expected: { start: '12:00', end: '17:00' } },
        { hours: '9am–3pm', expected: { start: '09:00', end: '15:00' } }, // em-dash
      ];

      testCases.forEach(({ hours, expected }) => {
        const camp = { ...mockCamp, hours };
        const result = formatCampForCalendar(camp, mockSchedule);

        expect(result.startTime).toBe(expected.start);
        expect(result.endTime).toBe(expected.end);
      });
    });

    it('handles TBD hours', () => {
      const camp = { ...mockCamp, hours: 'TBD' };
      const result = formatCampForCalendar(camp, mockSchedule);

      expect(result.startTime).toBeNull();
      expect(result.endTime).toBeNull();
    });

    it('handles missing hours', () => {
      const camp = { ...mockCamp, hours: undefined };
      const result = formatCampForCalendar(camp, mockSchedule);

      expect(result.startTime).toBeNull();
      expect(result.endTime).toBeNull();
    });

    it('handles camp with minimal data', () => {
      const minimalCamp = {
        id: 'camp-min',
        camp_name: 'Basic Camp'
      };
      const minimalSchedule = {
        start_date: '2026-06-08',
        end_date: '2026-06-12'
      };

      const result = formatCampForCalendar(minimalCamp, minimalSchedule);

      expect(result.campId).toBe('camp-min');
      expect(result.title).toBe('🏕️ Basic Camp');
      expect(result.location).toBe('');
      expect(result.description).toBe('');
    });

    it('uses location fallback when address missing', () => {
      const camp = {
        ...mockCamp,
        address: undefined,
        location: 'Downtown Santa Barbara'
      };
      const result = formatCampForCalendar(camp, mockSchedule);

      expect(result.location).toBe('Downtown Santa Barbara');
    });
  });

  describe('exportAllToICal', () => {
    beforeEach(() => {
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('generates filename with child name', () => {
      const camps = [{ id: 'camp-1', camp_name: 'Test Camp' }];
      const schedules = [{ camp_id: 'camp-1', start_date: '2026-06-08', end_date: '2026-06-12' }];

      exportAllToICal(camps, schedules, 'Alex Johnson');

      const createElementCalls = vi.mocked(document.createElement).mock.calls;
      const linkCall = createElementCalls.find(call => call[0] === 'a');
      expect(linkCall).toBeDefined();
    });

    it('filters out schedules with non-matching camps', () => {
      const camps = [{ id: 'camp-1', camp_name: 'Test Camp' }];
      const schedules = [
        { camp_id: 'camp-1', start_date: '2026-06-08', end_date: '2026-06-12' },
        { camp_id: 'camp-nonexistent', start_date: '2026-06-15', end_date: '2026-06-19' }
      ];

      expect(() => exportAllToICal(camps, schedules)).not.toThrow();
    });

    it('handles empty schedules', () => {
      const camps = [{ id: 'camp-1', camp_name: 'Test Camp' }];
      const schedules = [];

      expect(() => exportAllToICal(camps, schedules)).not.toThrow();
    });
  });

  describe('exportAllToGoogleCalendar', () => {
    let windowOpenMock;
    let alertMock;

    beforeEach(() => {
      vi.useFakeTimers();
      windowOpenMock = vi.spyOn(window, 'open').mockImplementation(() => null);
      alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('opens Google Calendar URLs for events (limited to 5)', () => {
      const camps = [
        { id: 'camp-1', camp_name: 'Camp 1' },
        { id: 'camp-2', camp_name: 'Camp 2' },
        { id: 'camp-3', camp_name: 'Camp 3' }
      ];
      const schedules = [
        { camp_id: 'camp-1', start_date: '2026-06-08', end_date: '2026-06-12' },
        { camp_id: 'camp-2', start_date: '2026-06-15', end_date: '2026-06-19' },
        { camp_id: 'camp-3', start_date: '2026-06-22', end_date: '2026-06-26' }
      ];

      exportAllToGoogleCalendar(camps, schedules);
      vi.runAllTimers();

      expect(windowOpenMock).toHaveBeenCalledTimes(3);
      expect(windowOpenMock).toHaveBeenCalledWith(expect.stringContaining('calendar.google.com'), '_blank');
    });

    it('shows alert when more than 5 events', () => {
      const camps = Array.from({ length: 8 }, (_, i) => ({
        id: `camp-${i}`,
        camp_name: `Camp ${i}`
      }));
      const schedules = camps.map(camp => ({
        camp_id: camp.id,
        start_date: '2026-06-08',
        end_date: '2026-06-12'
      }));

      exportAllToGoogleCalendar(camps, schedules);
      vi.runAllTimers();

      expect(windowOpenMock).toHaveBeenCalledTimes(5);
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining('Opened first 5 events')
      );
    });

    it('handles empty schedules gracefully', () => {
      const camps = [{ id: 'camp-1', camp_name: 'Camp 1' }];
      const schedules = [];

      exportAllToGoogleCalendar(camps, schedules);
      vi.runAllTimers();

      expect(windowOpenMock).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles dates at year boundaries', () => {
      const event = {
        title: 'New Year Camp',
        startDate: '2025-12-28',
        endDate: '2026-01-02'
      };

      const url = createGoogleCalendarUrl(event);

      expect(url).toContain('dates=');
      expect(url).toContain('calendar.google.com');
    });

    it('handles leap year dates', () => {
      const event = {
        title: 'Leap Day Event',
        startDate: '2028-02-29',
        endDate: '2028-02-29'
      };

      const url = createGoogleCalendarUrl(event);

      expect(url).toContain('dates=');
    });

    it('handles 24-hour time format conversion edge cases', () => {
      const testCases = [
        { hours: '12am-12pm', expectedStart: '00', expectedEnd: '12' },
        { hours: '12pm-12am', expectedStart: '12', expectedEnd: '00' }
      ];

      const mockSchedule = { start_date: '2026-06-08', end_date: '2026-06-08' };

      testCases.forEach(({ hours, expectedStart, expectedEnd }) => {
        const camp = { camp_name: 'Test', hours };
        const result = formatCampForCalendar(camp, mockSchedule);

        expect(result.startTime).toContain(expectedStart);
        expect(result.endTime).toContain(expectedEnd);
      });
    });

    it('handles very long descriptions gracefully', () => {
      const longDescription = 'A'.repeat(5000);
      const event = {
        title: 'Test Event',
        description: longDescription,
        startDate: '2026-06-08',
        endDate: '2026-06-08'
      };

      const url = createGoogleCalendarUrl(event);
      expect(url).toBeDefined();
      expect(url.length).toBeGreaterThan(0);
    });

    it('handles Unicode characters in event data', () => {
      const event = {
        title: '夏のキャンプ 🏕️ Camp été',
        description: 'Schöne Sommerferien',
        location: 'São Paulo, Brasil',
        startDate: '2026-06-08',
        endDate: '2026-06-12'
      };

      const url = createGoogleCalendarUrl(event);
      expect(url).toContain('calendar.google.com');
      expect(url).toContain('text=');

      const ical = generateICalFile([event]);
      expect(ical).toContain('SUMMARY:');
    });
  });
});
