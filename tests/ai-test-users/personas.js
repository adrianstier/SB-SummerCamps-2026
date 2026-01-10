/**
 * AI Test User Personas
 * 30 diverse personas from different walks of life with varying family configurations
 */

export const personas = [
  // ============================================================================
  // SINGLE PARENTS (5)
  // ============================================================================
  {
    id: 'sp-01',
    name: 'Maria Santos',
    email: 'maria.santos@test.local',
    background: 'Single mom, works as a nurse at Cottage Hospital. Night shifts make scheduling tricky.',
    income: 'middle',
    techSavvy: 'moderate',
    timeConstrained: true,
    children: [
      { name: 'Sofia', age: 7, interests: ['art', 'dance', 'animals'] },
      { name: 'Diego', age: 10, interests: ['soccer', 'coding', 'legos'] }
    ],
    priorities: ['extended-care', 'affordable', 'reliable-transport'],
    specialNeeds: null,
    expectedBehavior: 'Will filter heavily by extended care and price. Needs camps that start early/end late.'
  },
  {
    id: 'sp-02',
    name: 'James Chen',
    email: 'james.chen@test.local',
    background: 'Single dad, software engineer working remote. Flexible schedule but needs focus time.',
    income: 'high',
    techSavvy: 'expert',
    timeConstrained: false,
    children: [
      { name: 'Lily', age: 5, interests: ['music', 'swimming', 'nature'] }
    ],
    priorities: ['quality', 'enrichment', 'small-class-size'],
    specialNeeds: null,
    expectedBehavior: 'Will use all filters, comparison features. Price less of a concern.'
  },
  {
    id: 'sp-03',
    name: 'Tanya Washington',
    email: 'tanya.washington@test.local',
    background: 'Single mom, teacher on summer break. Can volunteer at camps. Budget-conscious.',
    income: 'lower-middle',
    techSavvy: 'moderate',
    timeConstrained: false,
    children: [
      { name: 'Marcus', age: 8, interests: ['basketball', 'reading', 'science'] },
      { name: 'Aaliyah', age: 11, interests: ['volleyball', 'art', 'drama'] },
      { name: 'Jaylen', age: 6, interests: ['dinosaurs', 'building', 'outdoor'] }
    ],
    priorities: ['sibling-discount', 'affordable', 'meals-included'],
    specialNeeds: null,
    expectedBehavior: 'Needs to schedule 3 kids. Will look for sibling discounts. Coverage gaps critical.'
  },
  {
    id: 'sp-04',
    name: 'Roberto Mendez',
    email: 'roberto.mendez@test.local',
    background: 'Single dad, construction foreman. Early starts. Spanish-speaking household.',
    income: 'middle',
    techSavvy: 'low',
    timeConstrained: true,
    children: [
      { name: 'Carlos', age: 9, interests: ['soccer', 'skateboarding', 'video games'] }
    ],
    priorities: ['early-dropoff', 'physical-activity', 'affordable'],
    specialNeeds: 'Spanish-speaking staff preferred',
    expectedBehavior: 'May struggle with complex UI. Needs simple, clear information.'
  },
  {
    id: 'sp-05',
    name: 'Jennifer Park',
    email: 'jennifer.park@test.local',
    background: 'Single mom, real estate agent. Unpredictable schedule, needs flexibility.',
    income: 'upper-middle',
    techSavvy: 'high',
    timeConstrained: true,
    children: [
      { name: 'Ethan', age: 12, interests: ['tennis', 'piano', 'robotics'] }
    ],
    priorities: ['flexible-scheduling', 'enrichment', 'teen-programs'],
    specialNeeds: null,
    expectedBehavior: 'Will want weekly flexibility. May book multiple short sessions.'
  },

  // ============================================================================
  // TWO-PARENT HOUSEHOLDS (10)
  // ============================================================================
  {
    id: 'tp-01',
    name: 'Sarah & Mike Thompson',
    email: 'thompson.family@test.local',
    background: 'Both work corporate jobs. Grandparents nearby for backup. Well-organized.',
    income: 'upper-middle',
    techSavvy: 'high',
    timeConstrained: true,
    children: [
      { name: 'Emma', age: 8, interests: ['gymnastics', 'art', 'horses'] },
      { name: 'Jack', age: 6, interests: ['t-ball', 'legos', 'animals'] }
    ],
    priorities: ['quality', 'variety', 'same-location-both-kids'],
    specialNeeds: null,
    expectedBehavior: 'Will use comparison lists extensively. Want both kids at same camps when possible.'
  },
  {
    id: 'tp-02',
    name: 'David & Rachel Cohen',
    email: 'cohen.family@test.local',
    background: 'Dad is a doctor, mom works part-time from home. Active Jewish family.',
    income: 'high',
    techSavvy: 'moderate',
    timeConstrained: false,
    children: [
      { name: 'Noah', age: 10, interests: ['swimming', 'chess', 'science'] },
      { name: 'Hannah', age: 7, interests: ['dance', 'art', 'cooking'] },
      { name: 'Ben', age: 4, interests: ['trucks', 'sandbox', 'music'] }
    ],
    priorities: ['quality', 'diverse-experiences', 'kosher-food-option'],
    specialNeeds: 'Dietary restrictions (kosher)',
    expectedBehavior: 'Will look for food-included camps with dietary options. Youngest needs preschool camps.'
  },
  {
    id: 'tp-03',
    name: 'Carlos & Ana Rodriguez',
    email: 'rodriguez.family@test.local',
    background: 'Both work in hospitality. Summer is their busy season. Extended family helps.',
    income: 'lower-middle',
    techSavvy: 'low',
    timeConstrained: true,
    children: [
      { name: 'Isabella', age: 9, interests: ['soccer', 'dance', 'cooking'] },
      { name: 'Mateo', age: 7, interests: ['baseball', 'art', 'swimming'] }
    ],
    priorities: ['affordable', 'reliable', 'full-day'],
    specialNeeds: 'Bilingual preferred',
    expectedBehavior: 'Budget is primary filter. Need full coverage. May not use advanced features.'
  },
  {
    id: 'tp-04',
    name: 'Tom & Lisa Anderson',
    email: 'anderson.family@test.local',
    background: 'Dad military (often deployed), mom stay-at-home. On-base housing, limited budget.',
    income: 'lower-middle',
    techSavvy: 'moderate',
    timeConstrained: false,
    children: [
      { name: 'Tyler', age: 11, interests: ['martial arts', 'video games', 'fishing'] },
      { name: 'Megan', age: 8, interests: ['cheerleading', 'crafts', 'animals'] }
    ],
    priorities: ['military-discount', 'structure', 'character-building'],
    specialNeeds: null,
    expectedBehavior: 'Will search for military discounts. Values structured programs. Mom handles all planning.'
  },
  {
    id: 'tp-05',
    name: 'Kevin & Priya Patel',
    email: 'patel.family@test.local',
    background: 'Both are doctors. Nanny helps with transport. Education-focused.',
    income: 'high',
    techSavvy: 'high',
    timeConstrained: true,
    children: [
      { name: 'Arjun', age: 10, interests: ['math', 'tennis', 'coding'] },
      { name: 'Maya', age: 8, interests: ['violin', 'reading', 'swimming'] }
    ],
    priorities: ['academic-enrichment', 'music', 'stem'],
    specialNeeds: 'Vegetarian meals needed',
    expectedBehavior: 'Will filter by category (STEM, Arts). Will use schedule planner heavily. Expect excellence.'
  },
  {
    id: 'tp-06',
    name: 'Brian & Michelle Davis',
    email: 'davis.family@test.local',
    background: 'Dad owns landscaping business, mom is hairstylist. Blue-collar, community-minded.',
    income: 'middle',
    techSavvy: 'low',
    timeConstrained: true,
    children: [
      { name: 'Brandon', age: 13, interests: ['football', 'fishing', 'camping'] },
      { name: 'Brittany', age: 10, interests: ['softball', 'baking', 'animals'] },
      { name: 'Blake', age: 7, interests: ['soccer', 'bugs', 'climbing'] }
    ],
    priorities: ['outdoor', 'affordable', 'physical-activity'],
    specialNeeds: null,
    expectedBehavior: 'Looking for outdoor/sports camps. Oldest may be too old for many camps. Need teen options.'
  },
  {
    id: 'tp-07',
    name: 'Alex & Jordan Taylor',
    email: 'taylor.family@test.local',
    background: 'Same-sex parents. Alex is lawyer, Jordan is therapist. Very involved.',
    income: 'high',
    techSavvy: 'high',
    timeConstrained: true,
    children: [
      { name: 'Riley', age: 6, interests: ['art', 'music', 'nature'] }
    ],
    priorities: ['inclusive', 'creative', 'social-emotional'],
    specialNeeds: null,
    expectedBehavior: 'Will research camps thoroughly. Care about inclusive environment. Will read reviews.'
  },
  {
    id: 'tp-08',
    name: 'William & Grace Kim',
    email: 'kim.family@test.local',
    background: 'First-generation Korean-American. Dad engineer, mom accountant. High expectations.',
    income: 'upper-middle',
    techSavvy: 'high',
    timeConstrained: true,
    children: [
      { name: 'Daniel', age: 9, interests: ['taekwondo', 'piano', 'math'] },
      { name: 'Sophie', age: 7, interests: ['ballet', 'art', 'reading'] }
    ],
    priorities: ['academic', 'music', 'discipline'],
    specialNeeds: null,
    expectedBehavior: 'Will look for academic enrichment and music camps. Schedule optimization important.'
  },
  {
    id: 'tp-09',
    name: 'Marcus & Destiny Johnson',
    email: 'johnson.family@test.local',
    background: 'Dad is firefighter, mom is school counselor. Active in community. Church-going.',
    income: 'middle',
    techSavvy: 'moderate',
    timeConstrained: false,
    children: [
      { name: 'Jayden', age: 11, interests: ['basketball', 'drums', 'video games'] },
      { name: 'Zoe', age: 8, interests: ['dance', 'singing', 'crafts'] }
    ],
    priorities: ['values-based', 'affordable', 'community'],
    specialNeeds: null,
    expectedBehavior: 'May look for faith-based camps. Community reputation matters. Will check reviews.'
  },
  {
    id: 'tp-10',
    name: 'Erik & Ingrid Larsen',
    email: 'larsen.family@test.local',
    background: 'Scandinavian immigrants. Dad marine biologist at UCSB, mom works at a nonprofit.',
    income: 'middle',
    techSavvy: 'high',
    timeConstrained: false,
    children: [
      { name: 'Astrid', age: 7, interests: ['sailing', 'marine-life', 'swimming'] },
      { name: 'Olaf', age: 5, interests: ['building', 'nature', 'animals'] }
    ],
    priorities: ['nature', 'outdoor', 'environmental'],
    specialNeeds: null,
    expectedBehavior: 'Will prioritize outdoor/nature camps. Beach and ocean activities preferred.'
  },

  // ============================================================================
  // BLENDED FAMILIES (3)
  // ============================================================================
  {
    id: 'bf-01',
    name: 'Steve & Linda Martinez-Williams',
    email: 'martinez.williams@test.local',
    background: 'Blended family. His, hers, and theirs. Complex custody schedules.',
    income: 'upper-middle',
    techSavvy: 'moderate',
    timeConstrained: true,
    children: [
      { name: 'Jake', age: 12, interests: ['skateboarding', 'gaming', 'music'], custody: 'every-other-week' },
      { name: 'Olivia', age: 10, interests: ['gymnastics', 'art', 'horses'], custody: 'full-time' },
      { name: 'Max', age: 5, interests: ['superheroes', 'swimming', 'animals'], custody: 'full-time' }
    ],
    priorities: ['flexible-weeks', 'sibling-bonding', 'easy-logistics'],
    specialNeeds: 'Custody schedule complicates planning',
    expectedBehavior: 'Needs week-by-week flexibility. May only book specific weeks for Jake. Vacation blocking important.'
  },
  {
    id: 'bf-02',
    name: 'Patricia & John OConnor-Singh',
    email: 'oconnor.singh@test.local',
    background: 'Multicultural blended family. Step-parent dynamics. Lots of coordination needed.',
    income: 'high',
    techSavvy: 'high',
    timeConstrained: true,
    children: [
      { name: 'Connor', age: 14, interests: ['surfing', 'music', 'photography'] },
      { name: 'Anika', age: 11, interests: ['dance', 'coding', 'fashion'] },
      { name: 'Liam', age: 8, interests: ['soccer', 'drawing', 'magic'] },
      { name: 'Priya', age: 6, interests: ['ballet', 'dolls', 'baking'] }
    ],
    priorities: ['age-appropriate', 'cultural-exposure', 'teen-programs'],
    specialNeeds: 'Oldest may be too old for most camps',
    expectedBehavior: 'Wide age range. Need teen programs for 14yo. Will use squads feature to coordinate with ex-spouses.'
  },
  {
    id: 'bf-03',
    name: 'Rebecca & Thomas Green-Harris',
    email: 'green.harris@test.local',
    background: 'Recently blended. Still adjusting. Kids have different last names, different needs.',
    income: 'middle',
    techSavvy: 'moderate',
    timeConstrained: false,
    children: [
      { name: 'Emily Green', age: 9, interests: ['horses', 'reading', 'art'] },
      { name: 'Aiden Harris', age: 8, interests: ['baseball', 'video games', 'building'] }
    ],
    priorities: ['shared-experiences', 'bonding', 'fun'],
    specialNeeds: 'Kids still adjusting to each other',
    expectedBehavior: 'Want kids to do camps together to bond. Will look for camps both might enjoy.'
  },

  // ============================================================================
  // GRANDPARENTS AS PRIMARY CAREGIVERS (2)
  // ============================================================================
  {
    id: 'gp-01',
    name: 'Robert & Dorothy Wilson',
    email: 'wilson.grandparents@test.local',
    background: 'Raising grandchildren after daughter passed. Retired teachers. Fixed income.',
    income: 'lower-middle',
    techSavvy: 'low',
    timeConstrained: false,
    children: [
      { name: 'Samantha', age: 10, interests: ['dance', 'reading', 'animals'] },
      { name: 'Michael', age: 8, interests: ['sports', 'legos', 'science'] }
    ],
    priorities: ['affordable', 'reliable-transport', 'trusted'],
    specialNeeds: 'Grandparents cant drive much - need transport or nearby',
    expectedBehavior: 'May struggle with technology. Need simple interface. Transport critical. Will call camps directly.'
  },
  {
    id: 'gp-02',
    name: 'Gloria Hernandez',
    email: 'gloria.hernandez@test.local',
    background: 'Grandmother raising grandson. Speaks primarily Spanish. Limited mobility.',
    income: 'low',
    techSavvy: 'very-low',
    timeConstrained: false,
    children: [
      { name: 'Miguel', age: 7, interests: ['soccer', 'art', 'music'] }
    ],
    priorities: ['free-or-scholarship', 'spanish-speaking', 'meals-included'],
    specialNeeds: 'Needs financial assistance, Spanish-speaking staff',
    expectedBehavior: 'Will need help using site. Should look for scholarship info. Free camps prioritized.'
  },

  // ============================================================================
  // SPECIAL CIRCUMSTANCES (5)
  // ============================================================================
  {
    id: 'sc-01',
    name: 'Amanda Foster',
    email: 'amanda.foster@test.local',
    background: 'Foster parent with rotating placements. May have kids for part of summer.',
    income: 'middle',
    techSavvy: 'moderate',
    timeConstrained: true,
    children: [
      { name: 'Current Child', age: 9, interests: ['varies', 'outdoor', 'active'] }
    ],
    priorities: ['flexible-cancellation', 'trauma-informed', 'inclusive'],
    specialNeeds: 'Kids may have behavioral challenges, uncertain placement duration',
    expectedBehavior: 'Needs flexible policies. Will look for trauma-informed programs. Last-minute bookings possible.'
  },
  {
    id: 'sc-02',
    name: 'Christine & Mark Lewis',
    email: 'lewis.family@test.local',
    background: 'Child with autism. Need specialized programs or inclusion support.',
    income: 'upper-middle',
    techSavvy: 'high',
    timeConstrained: false,
    children: [
      { name: 'Andrew', age: 8, interests: ['trains', 'computers', 'specific-routines'] }
    ],
    priorities: ['special-needs-support', 'low-ratio', 'structured'],
    specialNeeds: 'Autism - needs sensory-friendly, structured environment with support',
    expectedBehavior: 'Will search for special needs camps. Need to check inclusion policies. May contact camps directly.'
  },
  {
    id: 'sc-03',
    name: 'Daniel & Mia Reynolds',
    email: 'reynolds.family@test.local',
    background: 'Child with severe food allergies. Safety is paramount.',
    income: 'middle',
    techSavvy: 'high',
    timeConstrained: true,
    children: [
      { name: 'Nathan', age: 7, interests: ['swimming', 'legos', 'animals'] }
    ],
    priorities: ['allergy-aware', 'medical-staff', 'safety'],
    specialNeeds: 'Severe peanut and tree nut allergies (EpiPen required)',
    expectedBehavior: 'Will scrutinize food policies. Need camps with medical staff. May filter by meals NOT included.'
  },
  {
    id: 'sc-04',
    name: 'Victoria Chang',
    email: 'victoria.chang@test.local',
    background: 'Single mom of child prodigy. Needs academic challenge during summer.',
    income: 'high',
    techSavvy: 'high',
    timeConstrained: true,
    children: [
      { name: 'Alexander', age: 10, interests: ['advanced-math', 'physics', 'chess', 'music'] }
    ],
    priorities: ['academic-challenge', 'gifted-programs', 'intellectual-peers'],
    specialNeeds: 'Gifted - needs intellectual stimulation beyond age level',
    expectedBehavior: 'Will look for STEM, academic camps. May search for university-run programs. High expectations.'
  },
  {
    id: 'sc-05',
    name: 'Paul & Nancy Baker',
    email: 'baker.family@test.local',
    background: 'Recently relocated to SB from East Coast. Know nothing about local camps.',
    income: 'upper-middle',
    techSavvy: 'high',
    timeConstrained: true,
    children: [
      { name: 'Charlotte', age: 9, interests: ['tennis', 'art', 'reading'] },
      { name: 'Henry', age: 6, interests: ['soccer', 'bugs', 'building'] }
    ],
    priorities: ['local-favorites', 'well-reviewed', 'established'],
    specialNeeds: 'New to area - need recommendations',
    expectedBehavior: 'Will rely heavily on reviews and ratings. May use questions feature. Need discovery features.'
  },

  // ============================================================================
  // DIVERSE SCHEDULES (5)
  // ============================================================================
  {
    id: 'ds-01',
    name: 'Hannah & Oliver Wright',
    email: 'wright.family@test.local',
    background: 'Family takes 3-week vacation in July. Need camps around that.',
    income: 'high',
    techSavvy: 'high',
    timeConstrained: false,
    children: [
      { name: 'Grace', age: 8, interests: ['sailing', 'art', 'languages'] },
      { name: 'Lucas', age: 6, interests: ['swimming', 'legos', 'dinosaurs'] }
    ],
    priorities: ['specific-weeks', 'quality', 'variety'],
    specialNeeds: null,
    expectedBehavior: 'Will use vacation blocking feature. Only need camps in June and August. Schedule planner critical.'
  },
  {
    id: 'ds-02',
    name: 'Omar & Fatima Al-Hassan',
    email: 'alhassen.family@test.local',
    background: 'Dad is a pilot with rotating schedule. Mom works part-time. Need week-by-week flexibility.',
    income: 'upper-middle',
    techSavvy: 'moderate',
    timeConstrained: true,
    children: [
      { name: 'Layla', age: 7, interests: ['swimming', 'art', 'animals'] },
      { name: 'Yusuf', age: 5, interests: ['building', 'trucks', 'water-play'] }
    ],
    priorities: ['weekly-booking', 'last-minute-availability', 'halal-food'],
    specialNeeds: 'Halal food preferred',
    expectedBehavior: 'May book week-by-week based on Dads schedule. Need camps with availability info.'
  },
  {
    id: 'ds-03',
    name: 'Stephanie Moore',
    email: 'stephanie.moore@test.local',
    background: 'Single mom, nurse with 12-hour shifts. Works 3 days on, 4 days off rotating.',
    income: 'middle',
    techSavvy: 'moderate',
    timeConstrained: true,
    children: [
      { name: 'Jasmine', age: 9, interests: ['dance', 'gymnastics', 'crafts'] }
    ],
    priorities: ['extended-care', 'flexible-days', 'reliable'],
    specialNeeds: null,
    expectedBehavior: 'Needs extended care for shift days. Might want half-day camps for days off. Complex scheduling needs.'
  },
  {
    id: 'ds-04',
    name: 'Robert & Susan Clark',
    email: 'clark.family@test.local',
    background: 'Both work from home. Want to maximize activities without full-day care.',
    income: 'upper-middle',
    techSavvy: 'high',
    timeConstrained: false,
    children: [
      { name: 'Owen', age: 8, interests: ['coding', 'sports', 'reading'] }
    ],
    priorities: ['half-day', 'variety', 'enrichment'],
    specialNeeds: null,
    expectedBehavior: 'Looking for morning OR afternoon camps. May double-book different half-day camps. Need time filtering.'
  },
  {
    id: 'ds-05',
    name: 'Christopher & Amy Nelson',
    email: 'nelson.family@test.local',
    background: 'Dad is teacher (summers off), mom works. Want coverage when dad has commitments.',
    income: 'middle',
    techSavvy: 'high',
    timeConstrained: false,
    children: [
      { name: 'Ryan', age: 10, interests: ['baseball', 'fishing', 'science'] },
      { name: 'Katie', age: 7, interests: ['soccer', 'art', 'animals'] }
    ],
    priorities: ['specific-weeks-only', 'outdoor', 'sports'],
    specialNeeds: null,
    expectedBehavior: 'Only need camps for 3-4 specific weeks. Dad covers rest. Will use calendar view heavily.'
  }
];

export default personas;
