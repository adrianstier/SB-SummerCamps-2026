/**
 * Sample Data Generator for Guided Tour
 * Creates realistic sample children and scheduled camps for first-time users
 */

import { getSummerWeeks2026 } from './supabase';

const summerWeeks = getSummerWeeks2026();

/**
 * Generate sample children for guided tour
 * @returns {Array} Array of sample child objects
 */
export function generateSampleChildren() {
  return [
    {
      name: "Emma (sample)",
      age_as_of_summer: 8,
      color: "#ec4899", // Pink
      avatar_emoji: "👧",
      interests: ["Art", "Beach/Surf"],
      is_sample: true,
      birth_date: new Date(2018, 5, 15).toISOString().split('T')[0] // June 15, 2018
    },
    {
      name: "Jake (sample)",
      age_as_of_summer: 10,
      color: "#3b82f6", // Blue
      avatar_emoji: "👦",
      interests: ["Sports", "Science/STEM"],
      is_sample: true,
      birth_date: new Date(2016, 3, 20).toISOString().split('T')[0] // April 20, 2016
    }
  ];
}

/**
 * Generate sample scheduled camps for guided tour
 * Creates a realistic mix of camps across different weeks
 *
 * @param {Array} children - Sample children objects (must have id from database)
 * @param {Array} camps - Available camps from database
 * @returns {Array} Array of sample scheduled camp objects
 */
export function generateSampleSchedule(children, camps) {
  if (!children || children.length < 2 || !camps || camps.length === 0) {
    console.warn('Not enough children or camps to generate sample schedule');
    return [];
  }

  const emma = children.find(c => c.name.includes('Emma'));
  const jake = children.find(c => c.name.includes('Jake'));

  if (!emma || !jake) {
    console.warn('Sample children not found');
    return [];
  }

  const scheduledCamps = [];

  // Find suitable camps for Emma (age 8, interests: Art, Beach/Surf)
  const artCamp = camps.find(c =>
    c.category && c.category.toLowerCase().includes('art') &&
    isAgeAppropriate(c.ages, 8)
  );

  const beachCamp = camps.find(c =>
    c.category && c.category.toLowerCase().includes('beach') &&
    isAgeAppropriate(c.ages, 8)
  );

  // Find suitable camps for Jake (age 10, interests: Sports, Science/STEM)
  const sportsCamp = camps.find(c =>
    c.category && c.category.toLowerCase().includes('sport') &&
    isAgeAppropriate(c.ages, 10)
  );

  const scienceCamp = camps.find(c =>
    c.category && (c.category.toLowerCase().includes('science') || c.category.toLowerCase().includes('stem')) &&
    isAgeAppropriate(c.ages, 10)
  );

  // Emma's schedule: Week 1 (Art), Week 3 (Beach), Week 5 (Art again)
  if (artCamp) {
    scheduledCamps.push({
      camp_id: artCamp.id,
      child_id: emma.id,
      start_date: summerWeeks[0].startDate, // Week 1
      end_date: summerWeeks[0].endDate,
      price: artCamp.min_price || 350,
      status: 'registered',
      is_sample: true
    });
  }

  if (beachCamp) {
    scheduledCamps.push({
      camp_id: beachCamp.id,
      child_id: emma.id,
      start_date: summerWeeks[2].startDate, // Week 3
      end_date: summerWeeks[2].endDate,
      price: beachCamp.min_price || 400,
      status: 'confirmed',
      is_sample: true
    });
  }

  // Add another art camp week 5 (reuse first art camp)
  if (artCamp) {
    scheduledCamps.push({
      camp_id: artCamp.id,
      child_id: emma.id,
      start_date: summerWeeks[4].startDate, // Week 5
      end_date: summerWeeks[4].endDate,
      price: artCamp.min_price || 350,
      status: 'planned',
      is_sample: true
    });
  }

  // Jake's schedule: Week 1 (Sports), Week 2 (Sports), Week 4 (Science)
  if (sportsCamp) {
    scheduledCamps.push({
      camp_id: sportsCamp.id,
      child_id: jake.id,
      start_date: summerWeeks[0].startDate, // Week 1
      end_date: summerWeeks[0].endDate,
      price: sportsCamp.min_price || 425,
      status: 'confirmed',
      is_sample: true
    });

    scheduledCamps.push({
      camp_id: sportsCamp.id,
      child_id: jake.id,
      start_date: summerWeeks[1].startDate, // Week 2
      end_date: summerWeeks[1].endDate,
      price: sportsCamp.min_price || 425,
      status: 'registered',
      is_sample: true
    });
  }

  if (scienceCamp) {
    scheduledCamps.push({
      camp_id: scienceCamp.id,
      child_id: jake.id,
      start_date: summerWeeks[3].startDate, // Week 4
      end_date: summerWeeks[3].endDate,
      price: scienceCamp.min_price || 475,
      status: 'waitlisted',
      is_sample: true
    });
  }

  // Fallback: If we couldn't find specific camps, use any camps
  if (scheduledCamps.length === 0 && camps.length >= 2) {
    scheduledCamps.push({
      camp_id: camps[0].id,
      child_id: emma.id,
      start_date: summerWeeks[0].startDate,
      end_date: summerWeeks[0].endDate,
      price: camps[0].min_price || 350,
      status: 'registered',
      is_sample: true
    });

    scheduledCamps.push({
      camp_id: camps[1].id,
      child_id: jake.id,
      start_date: summerWeeks[0].startDate,
      end_date: summerWeeks[0].endDate,
      price: camps[1].min_price || 400,
      status: 'confirmed',
      is_sample: true
    });
  }

  return scheduledCamps;
}

/**
 * Check if camp is appropriate for child's age
 * @param {string} ageRange - Camp age range string (e.g., "5-12", "8-14")
 * @param {number} childAge - Child's age
 * @returns {boolean} Whether camp is age-appropriate
 */
function isAgeAppropriate(ageRange, childAge) {
  if (!ageRange) return true; // If no age restriction, it's appropriate

  // Extract numbers from age range string
  const matches = ageRange.match(/(\d+)/g);
  if (!matches || matches.length === 0) return true;

  const minAge = parseInt(matches[0]);
  const maxAge = matches.length > 1 ? parseInt(matches[1]) : minAge + 5;

  return childAge >= minAge && childAge <= maxAge;
}

/**
 * Calculate total cost of sample schedule
 * @param {Array} scheduledCamps - Sample scheduled camps
 * @returns {number} Total cost
 */
export function calculateSampleCost(scheduledCamps) {
  return scheduledCamps.reduce((sum, camp) => sum + (camp.price || 0), 0);
}
