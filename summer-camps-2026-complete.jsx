import React, { useState, useMemo } from 'react';

const camps = [
  {
    name: "Lobster Jo's Beach Camp",
    description: "Beach day camp with surfing, boogie boarding, sandcastles, beach games, arts & crafts. Color-coded rash guards indicate swim levels.",
    ages: "5-13",
    price: "$360-450",
    hours: "9am-3pm",
    indoor_outdoor: "Outdoor (East Beach)",
    food: "No - bring lunch",
    extended_care: "Half-day add-on 12-3pm available",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "Yes - swim test Mondays",
    transport: "No (escort from other camps available)",
    refund: "SB Parks & Rec policy: 15+ days 90%, 5-14 days 50%, <5 days none",
    phone: "(831) 594-9158",
    email: "lobsterjos@gmail.com",
    address: "East Beach, Santa Barbara",
    website: "lobsterjosbeachcamp.com",
    reg_date: "Rolling (fills fast)",
    notes: "1:7 ratio. CPR/First Aid certified. Rash guards $25.",
    category: "Beach/Surf"
  },
  {
    name: "SB Parks & Recreation",
    description: "City-run camps: Jr Lifeguards, LEGO, Basketball, Art, Ocean Explorers, Nature Camp, Theater, Pickleball, Volleyball, Skate Camp. 15+ options.",
    ages: "5-17",
    price: "$195-420",
    hours: "Varies by camp",
    indoor_outdoor: "Varies by camp",
    food: "No - bring lunch",
    extended_care: "Yes - some camps; aftercare $25/day",
    sibling_discount: "No",
    multi_week: "No",
    swim_req: "Varies (Jr Lifeguards requires swim)",
    transport: "No",
    refund: "15+ days 90%, 5-14 days 50%, <5 days none; medical 90%",
    phone: "(805) 564-5418",
    email: "Camps@SantaBarbaraCA.gov",
    address: "620 Laguna Street, Santa Barbara",
    website: "sbparksandrec.santabarbaraca.gov",
    reg_date: "Feb 3 at 9am",
    notes: "Scholarships via PARC Foundation. Fills quickly - set up account early.",
    category: "Multi-Activity"
  },
  {
    name: "UCSB Day Camp",
    description: "University-run camp with swimming, gymnastics, adventure ropes course, arts & crafts, games, movies. Uses UCSB campus facilities.",
    ages: "5-14",
    price: "$305+",
    hours: "8:15am-5:15pm (extended included)",
    indoor_outdoor: "Both (UCSB campus)",
    food: "No - bring lunch",
    extended_care: "Yes - included in price",
    sibling_discount: "$15 off per additional sibling (same session, full-day only)",
    multi_week: "Unknown",
    swim_req: "No (pool time included)",
    transport: "No",
    refund: "90% if 3+ months prior; illness $25/day refund with doctor note",
    phone: "(805) 893-3913",
    email: "camps@recreation.ucsb.edu",
    address: "UCSB Campus, Santa Barbara",
    website: "recreation.ucsb.edu/youth-programs/summer-day-camp",
    reg_date: "Rolling (early bird deadlines per session)",
    notes: "June 16 - Aug 15. Beach 'n Surf combo available ages 9-15.",
    category: "Multi-Activity"
  },
  {
    name: "Peak2Pacific",
    description: "Outdoor adventure: hiking, bouldering, kayaking, surfing, sailing, marine biology, nature art. PACIFIC (beach) and PEAK (mountains) programs.",
    ages: "3-18 (LIT/CIT programs)",
    price: "$375-425",
    hours: "9am-3pm",
    indoor_outdoor: "Both (Stevens Park & West Beach/Harbor)",
    food: "No - bring lunch",
    extended_care: "Yes - Early Care 8am, After Care 4pm",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No (offers both land & water programs)",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 689-8326",
    email: "peak2pacific@gmail.com",
    address: "West Beach / SB Harbor",
    website: "peak2pacific.com",
    reg_date: "Rolling",
    notes: "11 sessions June-Aug. LIT (13-14) and CIT (15-18) leadership programs.",
    category: "Outdoor/Adventure"
  },
  {
    name: "Wilderness Youth Project",
    description: "Small-group nature mentoring in creeks, beaches, and open spaces. Builds confidence, problem-solving, nature connection. Van transport to wilderness.",
    ages: "6-12",
    price: "$425-650 (sliding scale)",
    hours: "9am-4pm",
    indoor_outdoor: "Outdoor (various wilderness areas)",
    food: "No - bring lunch",
    extended_care: "No",
    sibling_discount: "No (but 76% receive scholarships, 6-tier sliding scale)",
    multi_week: "No (max 3 weeks/child)",
    swim_req: "No",
    transport: "Yes - 8 or 15-passenger vans",
    refund: "15+ days 90% minus $30 deposit; 7-14 days 50%; <7 days none",
    phone: "(805) 964-8096",
    email: "info@wyp.org",
    address: "5386 Hollister Ave Suite D, Goleta",
    website: "wyp.org",
    reg_date: "Feb 12-19 (lottery)",
    notes: "Weighted lottery prioritizes returning families & DEI. Results announced ~2.5 weeks after.",
    category: "Nature/Outdoor"
  },
  {
    name: "Santa Barbara Zoo Camp",
    description: "Animal-focused camp with behind-the-scenes visits, animal encounters, hands-on science, crafts, songs, skits. Half and full day options.",
    ages: "3-12",
    price: "$350-400 ($300-350 members)",
    hours: "Half: 9am-12pm; Full: 9am-3pm",
    indoor_outdoor: "Outdoor (Zoo grounds)",
    food: "Snacks - bring lunch for full day",
    extended_care: "No",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Must cancel in writing",
    phone: "(805) 962-5339",
    email: "education@sbzoo.org",
    address: "500 Niños Dr, Santa Barbara",
    website: "sbzoo.org/zoo-camp",
    reg_date: "Jan 12 at 10am",
    notes: "1:10 ratio. Scholarships via PAL. Specialty camps in summer.",
    category: "Science/Nature"
  },
  {
    name: "YMCA Summer Camp",
    description: "Traditional day camp with art, STEM, sports, outdoor recreation, field trips. Weekly themes. ACA accredited.",
    ages: "2.5-18",
    price: "Varies by location",
    hours: "8:30am-5pm",
    indoor_outdoor: "Both",
    food: "No - bring lunch",
    extended_care: "Yes - drop-off 8:30am, pick-up 4:30-5:30pm",
    sibling_discount: "Unknown (financial assistance available)",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 687-7727 (SB); (805) 969-3288 (Montecito)",
    email: "info@ciymca.org",
    address: "36 Hitchcock Way (SB); 591 Santa Rosa Ln (Montecito)",
    website: "ciymca.org/summer-camp",
    reg_date: "Feb 1",
    notes: "Multiple locations: SB, Montecito. Financial assistance available.",
    category: "Multi-Activity"
  },
  {
    name: "Girls Inc. of Greater Santa Barbara",
    description: "Pro-girl summer camp with STEM, art, sports, theater, cooking, woodshop themes. Separate elementary and teen programs.",
    ages: "TK-6 (elementary); 7-12 (teens)",
    price: "$280-345",
    hours: "Unknown",
    indoor_outdoor: "Both",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "No (gymnastics); financial aid for CAMP IGNITE",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 963-4757 x2 (elem); (805) 730-0508 (teens)",
    email: "info@girlsincsb.org",
    address: "4973 Hollister Ave, Goleta",
    website: "girlsincsb.org/programs/elementary",
    reg_date: "Contact for date",
    notes: "TK-6 $280/week, Teen $200/week, Gymnastics $345/week (2025 prices).",
    category: "Multi-Activity"
  },
  {
    name: "MOXI Museum Camp",
    description: "STEM/STEAM day camps at interactive science museum. Hands-on activities in science, technology, engineering, arts, and math.",
    ages: "K-6 (entering)",
    price: "$325-375",
    hours: "9am-3pm (extended to 5pm)",
    indoor_outdoor: "Indoor (museum)",
    food: "Snacks provided; lunch at nearby parks",
    extended_care: "Yes - Extended day to 5pm $100/week",
    sibling_discount: "Unknown (members get discounts)",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "1+ month 90%, 2-4 weeks 50%, <2 weeks none",
    phone: "(805) 770-5000",
    email: "camps@moxi.org",
    address: "125 State Street, Santa Barbara",
    website: "moxi.org/programs/for-families/camps/",
    reg_date: "Rolling",
    notes: "16 campers/session. CPR-certified counselors.",
    category: "Science/STEM"
  },
  {
    name: "SB Botanic Garden",
    description: "Nature-based camps exploring 78-acre garden. Age-specific themes, nature science, outdoor exploration. Two camp shirts provided.",
    ages: "5-12",
    price: "$370",
    hours: "9am-3pm",
    indoor_outdoor: "Outdoor (78-acre garden)",
    food: "Snacks provided",
    extended_care: "Yes - Extended day 3-5pm $100/week",
    sibling_discount: "No",
    multi_week: "No",
    swim_req: "No",
    transport: "No",
    refund: "15+ days refund minus 10% admin; illness prorated up to 2 days",
    phone: "(805) 682-4726 x161",
    email: "camp@sbbotanicgarden.org",
    address: "1212 Mission Canyon Road, Santa Barbara",
    website: "sbbotanicgarden.org",
    reg_date: "Members Mar 4; Public Mar 18",
    notes: "1:8 ratio. Member early access.",
    category: "Nature/Outdoor"
  },
  {
    name: "Nature Rangers",
    description: "Nature immersion with games, problem-solving quests, crafts, science experiments. Focus on confidence, resilience, nature connection.",
    ages: "5-14",
    price: "$320-400",
    hours: "9am-2pm (aftercare to 4pm)",
    indoor_outdoor: "Outdoor (Stow Grove/Ellwood)",
    food: "No - bring lunch",
    extended_care: "Yes - 2-hour aftercare available",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 895-2110",
    email: "registrar@nature-rangers.org",
    address: "Various locations in Goleta/SB",
    website: "naturerangers.org/camp/",
    reg_date: "Rolling",
    notes: "6:1 ratio max. Max 12 kids per session.",
    category: "Nature/Outdoor"
  },
  {
    name: "Camp Haverim",
    description: "Jewish day camp with swimming, sports, arts, music, field trips, and Judaic enrichment. Celebrates Shabbat. Open to everyone.",
    ages: "TK-11",
    price: "$800-860 (2 weeks); $1,600 (4 weeks)",
    hours: "9am-3pm",
    indoor_outdoor: "Both",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Yes - $50 off one sibling (2-week sessions)",
    multi_week: "Yes - $100 off all 4 weeks",
    swim_req: "Unknown",
    transport: "Yes - bus available",
    refund: "Unknown",
    phone: "(805) 957-1115",
    email: "See website",
    address: "Various locations (TBD for 2026)",
    website: "camphaverim.org",
    reg_date: "Rolling (early bird by Jun 15)",
    notes: "Scholarships available - apply by Mar 31. CIT/JC leadership path.",
    category: "Multi-Activity"
  },
  {
    name: "Art Explorers",
    description: "Visual arts camps: drawing, painting, clay, sewing, cooking, movie making, digital arts. Nine weekly themed camps. Artist-quality materials.",
    ages: "K-8",
    price: "~$299+",
    hours: "9am-3pm",
    indoor_outdoor: "Indoor (Vieja Valley School 2026)",
    food: "No - bring lunch",
    extended_care: "Yes - aftercare 3:30-5pm $12/day",
    sibling_discount: "Yes - $10 off sibling",
    multi_week: "Yes - $10 off multi-camp",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 570-5599",
    email: "ozwicke@artexplorerssantabarbara.org",
    address: "Vieja Valley School, 434 Nogal Dr (2026)",
    website: "terrificscientific.org",
    reg_date: "Rolling (fills fast)",
    notes: "Early bird $25 off Feb 9-23. Projects never repeat.",
    category: "Art"
  },
  {
    name: "Terrific Scientific",
    description: "STEAM camps: science experiments, engineering, technology, robotics. 65 different themed camps. Same org as Art Explorers.",
    ages: "K-8",
    price: "~$299+",
    hours: "8:30am-3:30pm",
    indoor_outdoor: "Indoor (Vieja Valley School 2026)",
    food: "No - bring lunch",
    extended_care: "Yes - aftercare 3:30-5pm $12/day",
    sibling_discount: "Yes - $10 off sibling",
    multi_week: "Yes - $10 off multi-camp",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 570-5599",
    email: "ozwicke@terrificscientific.org",
    address: "Vieja Valley School, 434 Nogal Dr (2026)",
    website: "terrificscientific.org",
    reg_date: "Rolling (fills fast)",
    notes: "Early bird $25 off Feb 9-23. 65 different STEAM camps.",
    category: "Science/STEM"
  },
  {
    name: "Santa Barbara Museum of Art Camp",
    description: "Museum art camps with drawing, painting, printmaking, ceramics, textiles. Visits to museum galleries for inspiration from original artworks.",
    ages: "5-9 (varies by session)",
    price: "~$350 ($300 members)",
    hours: "TBD",
    indoor_outdoor: "Indoor (museum)",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "4+ weeks full refund; 2-4 weeks credit; <2 weeks none",
    phone: "(805) 963-4364",
    email: "communityprograms@sbma.net",
    address: "1130 State Street, Santa Barbara",
    website: "sbma.net/learn/kidsfamilies/summer-camp-2025",
    reg_date: "Rolling",
    notes: "Teaching Artists staff. TA volunteer positions available.",
    category: "Art"
  },
  {
    name: "Boxtales Theatre Camp",
    description: "Professional theatre training: acting, storytelling, mime, acro-yoga, music, collaboration. Create original play based on Greek mythology.",
    ages: "9-13",
    price: "~$875 (3-week intensive)",
    hours: "Mon-Thu 9am-3:30pm; Fri 9am-1pm",
    indoor_outdoor: "Indoor (Marjorie Luke Theatre)",
    food: "No - bring lunch",
    extended_care: "No",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 962-1142",
    email: "info@boxtales.org",
    address: "721 E. Cota St, Santa Barbara",
    website: "boxtales.org/education/summer-camp",
    reg_date: "Early March (only 15 spots)",
    notes: "Only 15 positions. 3-week intensive. Professional theatre environment.",
    category: "Theater"
  },
  {
    name: "Ensemble Theatre Company",
    description: "Young Actors Conservatory: Camp DramaRama (9-13), Performance Playground (5-8), Acting Intensive (14-22), Musical Theatre Intensive (14-22).",
    ages: "5-22",
    price: "Varies by program",
    hours: "Varies",
    indoor_outdoor: "Indoor (New Vic Theater)",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 965-5400 x541",
    email: "education@etcsb.org",
    address: "33 W. Victoria St, Santa Barbara",
    website: "etcsb.org/education-and-outreach/the-young-actors-conservatory",
    reg_date: "Feb 1",
    notes: "Professional performance training.",
    category: "Theater"
  },
  {
    name: "Santa Barbara Dance Arts",
    description: "Dance camps in jazz, ballet, hip hop, tap, acro. Themed camps: Disney Dance, Bluey, Tutu & Tails, Cupcakes & Cartwheels. Performance at end of week.",
    ages: "3-17",
    price: "Varies by camp",
    hours: "Varies by camp",
    indoor_outdoor: "Indoor (dance studio)",
    food: "No - bring lunch",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 569-1711",
    email: "hannah@sbdancearts.com",
    address: "630 Chapala St, Santa Barbara",
    website: "sbdancearts.com/summer-camps-mini",
    reg_date: "Rolling",
    notes: "Voted best dance studio in SB. Mini camps for ages 3-5.",
    category: "Dance"
  },
  {
    name: "Momentum Dance Company",
    description: "Dance camps with jazz, hip hop, tumbling, ballet, contemporary. Themed weeks with costumes and final performance. Ages 3 to teen.",
    ages: "3-18",
    price: "Varies",
    hours: "1pm-4pm (camps); varies (intensives)",
    indoor_outdoor: "Indoor (dance studio)",
    food: "No - bring lunch",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "4 weeks refund/credit; <2 weeks none",
    phone: "(805) 364-1638",
    email: "momentumdancesb@gmail.com",
    address: "12 E. Figueroa St, Santa Barbara",
    website: "momentumdancesb.com/summer",
    reg_date: "Rolling",
    notes: "Company prep intensive available for competitive dancers ages 7-18.",
    category: "Dance"
  },
  {
    name: "Next Level Sports Camp",
    description: "Multi-sport camp: baseball, football, lacrosse, soccer, volleyball. Choose different sports each session. Top local coaches.",
    ages: "6-14",
    price: "$TBD",
    hours: "Full day",
    indoor_outdoor: "Outdoor (various facilities)",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(714) 333-8623",
    email: "jeff@nextlevelsportscamp.com",
    address: "Goleta Valley South Little League fields",
    website: "nextlevelsportscamp.com",
    reg_date: "Rolling",
    notes: "Partnership with pro athletes and nonprofits.",
    category: "Sports"
  },
  {
    name: "Santa Barbara Soccer Club Camp",
    description: "Soccer skills development through drills and games. Professional coaching staff. Open to all abilities. Scholarships available.",
    ages: "5-12",
    price: "$TBD",
    hours: "Half & Full Day options",
    indoor_outdoor: "Outdoor (Girsh Park Turf)",
    food: "No - bring lunch",
    extended_care: "Full day option available",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Non-refundable; credit toward rec programs",
    phone: "(805) 452-0083",
    email: "bianca@santabarbarasc.org",
    address: "Girsh Park, 7050 Phelps Rd, Goleta",
    website: "santabarbarasc.org/recreational-programs/camps/",
    reg_date: "Rolling",
    notes: "Scholarship applications available.",
    category: "Sports"
  },
  {
    name: "Surf Happens",
    description: "Premier surf camp at Santa Claus Lane. Beginner to advanced instruction. Hot lunch included. CPR-certified instructors.",
    ages: "4-17",
    price: "$550 ($750 ages 4-6)",
    hours: "9am-3pm",
    indoor_outdoor: "Outdoor (Santa Claus Lane)",
    food: "Yes - hot lunch daily",
    extended_care: "No",
    sibling_discount: "Yes - multi-week discounts",
    multi_week: "Unknown",
    swim_req: "No (all levels)",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 966-3613",
    email: "info@surfhappens.com",
    address: "3825 Santa Claus Lane, Carpinteria",
    website: "surfhappens.com/surf-camps/day-surf-camps/",
    reg_date: "Rolling (fills fast)",
    notes: "Half-day $400/week. 1:4 ratio (1:2 for ages 4-6). Scholarships via Surf Happens Foundation.",
    category: "Beach/Surf"
  },
  {
    name: "A-Frame Surf Camp",
    description: "Surf and beach camp since 2005. Surfing, games, beach fun. Weekday camps and Saturday options. Generations of campers.",
    ages: "5-16",
    price: "$TBD",
    hours: "Monday-Friday all summer",
    indoor_outdoor: "Outdoor (Santa Claus Beach)",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "See website",
    email: "See website",
    address: "Santa Claus Lane Beach, Carpinteria",
    website: "aframesurf.com/beach-camp/",
    reg_date: "Rolling",
    notes: "Saturday camps Aug-Oct for weekend flexibility.",
    category: "Beach/Surf"
  },
  {
    name: "WinShape Camps",
    description: "Faith-based day camp hosted by Chick-fil-A. Activities include sports, games, worship, crafts. Friday family lunch with Chick-fil-A.",
    ages: "K-6 (entering)",
    price: "$275",
    hours: "8:15am-5pm",
    indoor_outdoor: "Both",
    food: "Friday Chick-fil-A lunch",
    extended_care: "No (8:15-5pm included)",
    sibling_discount: "Yes - 10% off each additional child",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "$65 deposit non-refundable; 30+ days full minus deposit; <30 days none",
    phone: "844-WS-CAMPS (844-972-2677)",
    email: "ajwagner55@gmail.com (host church)",
    address: "Goleta Valley Jr High School",
    website: "camps.winshape.org",
    reg_date: "March (fills in days)",
    notes: "Christian values-based. Register ASAP when opens.",
    category: "Faith-Based"
  },
  {
    name: "Laguna Blanca Summer Programs",
    description: "Independent school camps at Hope Ranch & Montecito campuses. Wide variety including sports, arts, academics. Lunch included.",
    ages: "4-17",
    price: "$405",
    hours: "9am-3pm",
    indoor_outdoor: "Both (two campuses)",
    food: "Yes - snacks and lunch included",
    extended_care: "Yes - early 8:15am free; aftercare to 5pm $25/day",
    sibling_discount: "No (financial aid available - 10% revenue)",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "Yes - bus between campuses $75/week",
    refund: "2+ weeks before full minus $75; <2 weeks 50%; after reg closes none",
    phone: "(805) 687-2461",
    email: "camps@lagunablanca.org",
    address: "4125 Paloma Dr (Hope Ranch); 260 San Ysidro Rd (Montecito)",
    website: "lagunablanca.org",
    reg_date: "Feb 28 at 9am",
    notes: "Some camps fill day 1.",
    category: "Multi-Activity"
  },
  {
    name: "Safety Town",
    description: "Traffic, fire, water, and personal safety education for pre-K and kindergarteners. Interactive lessons with guest speakers.",
    ages: "Pre-K/K (5 by 9/1)",
    price: "$200",
    hours: "8:30am-12pm (3.5 hours)",
    indoor_outdoor: "Both (elementary schools)",
    food: "Snack provided",
    extended_care: "No (half-day program)",
    sibling_discount: "Unknown",
    multi_week: "N/A (one-week program)",
    swim_req: "No",
    transport: "No",
    refund: "Refund only if space filled; $25 fee",
    phone: "(805) 252-7998",
    email: "info@sbsafetytown.org",
    address: "Kellogg/Mountain View/Montecito Union Schools",
    website: "sbsafetytown.org",
    reg_date: "Early spring",
    notes: "Includes t-shirt. 1:2-3 CIT ratio.",
    category: "Education"
  },
  {
    name: "Apples to Zucchini Cooking School",
    description: "Hands-on cooking camp teaching culinary skills and kitchen safety. Each day features recipes around weekly themes.",
    ages: "1-6 (grades)",
    price: "$495",
    hours: "9am-3pm",
    indoor_outdoor: "Indoor (commercial kitchen)",
    food: "Yes - lunch and snacks included",
    extended_care: "No",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Age waiver violations = removal no refund",
    phone: "(805) 214-1213",
    email: "info@atozcookingschool.org",
    address: "2300 Garden Street, Santa Barbara",
    website: "atozcookingschool.org",
    reg_date: "Rolling",
    notes: "All meals/snacks included. 501(c)(3) nonprofit.",
    category: "Cooking"
  },
  {
    name: "Camp Stow",
    description: "Historic ranch camp with nature exploration, ranch activities, and local history at the 1872 Stow House.",
    ages: "5-12",
    price: "$400 (half-day); $550 (full-day)",
    hours: "Half: 9am-12:30pm; Full: 9am-3pm",
    indoor_outdoor: "Both (historic ranch)",
    food: "Unknown",
    extended_care: "No (half or full day options)",
    sibling_discount: "Unknown",
    multi_week: "N/A (3 one-week sessions only)",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 681-7216",
    email: "campstow@goletahistory.org",
    address: "304 N. Los Carneros Road, Goleta",
    website: "goletahistory.org/camp-stow/",
    reg_date: "Spring",
    notes: "2026: July 7-11, 14-18, 21-25 only. Limited sessions.",
    category: "Nature/History"
  },
  {
    name: "Ice in Paradise",
    description: "Figure skating and hockey camps at indoor ice rink. No prior skating experience required. Grouped by age and ability level.",
    ages: "4-11",
    price: "Unknown",
    hours: "9am-3pm",
    indoor_outdoor: "Indoor (ice rink)",
    food: "Unknown",
    extended_care: "No",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No (skating - no experience needed)",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 879-1550",
    email: "camps@iceinparadise.org",
    address: "6985 Santa Felicia Drive, Goleta",
    website: "iceinparadise.org/in-house-camps",
    reg_date: "Rolling",
    notes: "All equipment provided.",
    category: "Sports"
  },
  {
    name: "United Boys & Girls Club",
    description: "Affordable full-day camp at multiple locations. Sports, games, arts, STEM activities. Scholarships available.",
    ages: "5-18",
    price: "$75",
    hours: "8am-6pm (included)",
    indoor_outdoor: "Both (multiple locations)",
    food: "Unknown",
    extended_care: "Yes - 8am-6pm included",
    sibling_discount: "Unknown (scholarships available)",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "Varies by location",
    email: "See website",
    address: "Multiple locations countywide",
    website: "unitedbg.org/programs/",
    reg_date: "Spring",
    notes: "Best value for working parents.",
    category: "Multi-Activity"
  },
  {
    name: "Refugio Jr. Guards",
    description: "Ocean safety program at state beach run by CA State Parks lifeguards. CPR, first aid, surf rescue, environmental education.",
    ages: "7-17",
    price: "$450 ($430 siblings)",
    hours: "9am-3pm",
    indoor_outdoor: "Outdoor (Refugio State Beach)",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Yes - sibling $430 vs $450",
    multi_week: "Unknown",
    swim_req: "Yes - ocean swim test Day 1",
    transport: "Bus from Goleta offered 2026 (fee TBD)",
    refund: "CA State Parks policy",
    phone: "(805) 331-8018",
    email: "refugio.guards@parks.ca.gov",
    address: "10 Refugio Beach Road, Goleta",
    website: "parks.ca.gov",
    reg_date: "Feb (dates announced Jan 31)",
    notes: "2026 dates announced by Jan 31.",
    category: "Beach/Surf"
  },
  {
    name: "Page Youth Center",
    description: "Sports-focused camp in 23,000 sq ft facility with 16,000 sq ft gym. Basketball, volleyball, sports games.",
    ages: "Grades 1-8",
    price: "Unknown",
    hours: "8:30am-4pm",
    indoor_outdoor: "Indoor (gym facility)",
    food: "Unknown",
    extended_care: "No",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 967-8778",
    email: "pyc@pageyouthcenter.org",
    address: "4540 Hollister Ave, Santa Barbara",
    website: "pageyouthcenter.org/summer-camps",
    reg_date: "Jan/Feb",
    notes: "",
    category: "Sports"
  },
  {
    name: "GUSD Summer Thrive",
    description: "District-run summer program at Goleta elementary schools. Free for ELOP-eligible families; low-cost paid option for others.",
    ages: "K-6",
    price: "Free (ELOP) or low cost",
    hours: "7:30am-4:30pm",
    indoor_outdoor: "Both",
    food: "Unknown",
    extended_care: "Yes - 7:30am-4:30pm included",
    sibling_discount: "N/A",
    multi_week: "N/A",
    swim_req: "No",
    transport: "No",
    refund: "N/A (mostly free)",
    phone: "See GUSD website",
    email: "See GUSD website",
    address: "Ellwood/Brandon Elementary, Goleta",
    website: "sites.google.com/goleta.k12.ca.us/afterschool2019/summer-thrive-camp",
    reg_date: "Spring (school notification)",
    notes: "Best hours for working parents.",
    category: "Multi-Activity"
  },
  {
    name: "Camp Elings",
    description: "Outdoor adventure at 230-acre park: tag, dodgeball, relay races, basketball, soccer, hiking, nature art, live reptile visits.",
    ages: "5-12",
    price: "$TBD",
    hours: "TBD",
    indoor_outdoor: "Outdoor (Elings Park)",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 569-5611",
    email: "dsouza@elingspark.org",
    address: "Elings Park, 1298 Las Positas Rd",
    website: "elingspark.org/summer-camp/",
    reg_date: "Spring",
    notes: "Scholarships via Campership Alliance/PAL.",
    category: "Outdoor/Adventure"
  },
  {
    name: "Westmont Summer Sports Camps",
    description: "University sports camps: basketball, soccer, volleyball, and more. 35+ years of experience. Fun, safe environment.",
    ages: "5-13",
    price: "$TBD",
    hours: "TBD",
    indoor_outdoor: "Outdoor (Westmont campus)",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 680-3590",
    email: "ldorr@westmont.edu",
    address: "Westmont College, 955 La Paz Rd",
    website: "westmont.edu/athletics/summercamps",
    reg_date: "Spring",
    notes: "College campus facilities.",
    category: "Sports"
  },
  {
    name: "Nick Rail Summer Band Camp",
    description: "Band camp for students learning instruments. Sponsored by SB Education Foundation. Builds musical skills and confidence.",
    ages: "Various",
    price: "$TBD",
    hours: "TBD",
    indoor_outdoor: "Indoor",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Withdrawals before June 9; $50 non-refundable registration fee",
    phone: "See SBEF website",
    email: "See website",
    address: "Various locations",
    website: "sbefoundation.org/community-programs/the-nick-rail-summer-band-camp/",
    reg_date: "Spring",
    notes: "Also offers Summer String Camp.",
    category: "Music"
  },
  {
    name: "Twin Lakes Junior Golf",
    description: "Golf fundamentals: putting, chipping, full swing. Concepts valuable on and off the course. PGA instruction.",
    ages: "4-14",
    price: "$TBD",
    hours: "TBD",
    indoor_outdoor: "Outdoor (golf course)",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "See website",
    email: "carly@donparsonsgolf.com",
    address: "Twin Lakes Golf Course, 6034 Hollister Ave, Goleta",
    website: "twinlakesgolf.com/junior-golf",
    reg_date: "Rolling",
    notes: "Don Parsons Golf instruction.",
    category: "Sports"
  },
  {
    name: "SB Rock Gym Camp",
    description: "PERMANENTLY CLOSED November 2025. Alternative: The Pad Climbing in Ventura.",
    ages: "N/A",
    price: "CLOSED",
    hours: "N/A",
    indoor_outdoor: "N/A",
    food: "N/A",
    extended_care: "N/A",
    sibling_discount: "N/A",
    multi_week: "N/A",
    swim_req: "N/A",
    transport: "N/A",
    refund: "N/A",
    phone: "N/A",
    email: "N/A",
    address: "322 State St, Santa Barbara (closed)",
    website: "sbrockgym.com",
    reg_date: "N/A",
    notes: "Closed Nov 2025. Try The Pad Climbing (Ventura) or SB indoor climbing walls.",
    category: "CLOSED"
  },
  {
    name: "Octobots Robotics Camp",
    description: "Engineering and robotics camp combining craftsmanship with excitement of high school robotics. All levels welcome.",
    ages: "9-14",
    price: "$TBD",
    hours: "TBD",
    indoor_outdoor: "Indoor",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 637-0197",
    email: "info@teamoctobots.org",
    address: "7266 Alameda Ave, Goleta",
    website: "teamoctobots.org/campseducation",
    reg_date: "Spring",
    notes: "FIRST Robotics team runs camp.",
    category: "Science/STEM"
  },
  {
    name: "Anacapa School Arts & Exploration",
    description: "Dynamic mix of hands-on art projects, musical sessions, and outdoor activities/exploration.",
    ages: "9-13",
    price: "$TBD",
    hours: "TBD",
    indoor_outdoor: "Both",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 965-0228",
    email: "camp@anacapaschool.org",
    address: "814 Santa Barbara St, Santa Barbara",
    website: "anacapaschool.org/summer-2025",
    reg_date: "Rolling",
    notes: "Private school campus.",
    category: "Art"
  },
  {
    name: "Best U Camp",
    description: "Affordable all-day downtown camp. Sports, games, hikes, beach days, Slip 'N Slide, and more.",
    ages: "K-6 (grades)",
    price: "$TBD",
    hours: "Full day",
    indoor_outdoor: "Both",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 490-2285",
    email: "seanbestucamp@yahoo.com",
    address: "Notre Dame School, 33 E. Micheltorena St",
    website: "BestUCamp.com",
    reg_date: "Rolling",
    notes: "Affordable option in downtown SB.",
    category: "Multi-Activity"
  },
  {
    name: "Montessori Center School Camp",
    description: "Thematic summer camp with Montessori principles. Creativity, discovery, social interaction, and fun.",
    ages: "3-12",
    price: "$TBD",
    hours: "TBD",
    indoor_outdoor: "Both",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 683-9383",
    email: "t.clark@mcssb.org",
    address: "401 N. Fairview Ave, Ste. 1, Goleta",
    website: "mcssb.org/summer-camp",
    reg_date: "Spring",
    notes: "Montessori approach to summer learning.",
    category: "Education"
  },
  {
    name: "Sea League Excursion Camp",
    description: "Overnight coastal adventure at Dos Pueblos Ranch. Surfing, boogie boarding, giant SUP, Channel Islands trip with snorkeling.",
    ages: "9-13",
    price: "$TBD",
    hours: "5-day overnight",
    indoor_outdoor: "Outdoor (Gaviota Coast)",
    food: "Yes - meals included",
    extended_care: "N/A (overnight)",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 419-0717",
    email: "info@thesealeague.org",
    address: "Dos Pueblos Ranch, Gaviota",
    website: "thesealeague.org/summer-camps",
    reg_date: "Spring",
    notes: "Channel Islands snorkeling trip included.",
    category: "Overnight/Adventure"
  },
  {
    name: "InterAct Theatre School",
    description: "Theatrical experience combining performance, creativity, teamwork, and personal growth. Act It! Move It! Make It!",
    ages: "4-16",
    price: "$TBD",
    hours: "TBD",
    indoor_outdoor: "Indoor",
    food: "Unknown",
    extended_care: "Unknown",
    sibling_discount: "Unknown",
    multi_week: "Unknown",
    swim_req: "No",
    transport: "No",
    refund: "Unknown",
    phone: "(805) 869-2348",
    email: "info@interacttheatreschool.com",
    address: "Unity of SB, 227 E. Arrellaga St",
    website: "interacttheatreschool.com/summer-camps",
    reg_date: "Rolling",
    notes: "Building confidence through theatre.",
    category: "Theater"
  },
  {
    name: "Fairview Gardens",
    description: "CLOSED - Historic educational farm under renovation 2022-2027/28. No summer camp currently available.",
    ages: "N/A",
    price: "N/A",
    hours: "N/A",
    indoor_outdoor: "N/A",
    food: "N/A",
    extended_care: "N/A",
    sibling_discount: "N/A",
    multi_week: "N/A",
    swim_req: "N/A",
    transport: "N/A",
    refund: "N/A",
    phone: "N/A",
    email: "N/A",
    address: "598 N. Fairview Ave, Goleta",
    website: "fairviewgardens.org",
    reg_date: "N/A",
    notes: "Check status before 2026.",
    category: "CLOSED"
  },
  {
    name: "South Coast Railroad Museum",
    description: "NO SUMMER CAMP - Museum open weekends only. Birthday parties and school field trips available.",
    ages: "N/A",
    price: "N/A",
    hours: "N/A",
    indoor_outdoor: "N/A",
    food: "N/A",
    extended_care: "N/A",
    sibling_discount: "N/A",
    multi_week: "N/A",
    swim_req: "N/A",
    transport: "N/A",
    refund: "N/A",
    phone: "(805) 964-3540",
    email: "museum@goletadepot.org",
    address: "300 N Los Carneros Rd, Goleta",
    website: "goletadepot.org",
    reg_date: "N/A",
    notes: "Miniature train rides available. No summer camp.",
    category: "NO CAMP"
  }
];

const categories = [...new Set(camps.map(c => c.category))].sort();

export default function SummerCamps2026() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [expanded, setExpanded] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = camps.filter(c => {
      if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return Object.values(c).some(v => 
          typeof v === 'string' && v.toLowerCase().includes(s)
        );
      }
      return true;
    });
    
    result.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      if (sortBy === 'price') {
        const extractNum = (p) => {
          const m = p.match(/\$(\d+)/);
          return m ? parseInt(m[1]) : 9999;
        };
        aVal = extractNum(aVal);
        bVal = extractNum(bVal);
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [search, categoryFilter, sortBy, sortDir]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const activeCamps = filtered.filter(c => !['CLOSED', 'NO CAMP'].includes(c.category));

  const DetailRow = ({ label, value }) => {
    if (!value || value === 'Unknown' || value === 'N/A') return null;
    return (
      <div className="py-1">
        <span className="font-semibold text-gray-700">{label}:</span>{' '}
        <span className="text-gray-900">{value}</span>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-full bg-gray-50 min-h-screen">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Santa Barbara Summer Camps 2026</h1>
        <p className="text-sm text-gray-600">{activeCamps.length} active camps • {camps.length} total entries</p>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search all fields..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg flex-1 min-w-48 bg-white"
        />
        <select 
          value={categoryFilter} 
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="w-full bg-white text-sm">
          <thead className="bg-blue-600 text-white sticky top-0">
            <tr>
              {[
                {key: 'name', label: 'Camp Name'},
                {key: 'ages', label: 'Ages'},
                {key: 'price', label: 'Price/Week'},
                {key: 'hours', label: 'Hours'},
                {key: 'category', label: 'Category'},
                {key: 'reg_date', label: 'Registration'}
              ].map(col => (
                <th 
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-3 text-left cursor-pointer hover:bg-blue-700 whitespace-nowrap select-none"
                >
                  {col.label} {sortBy === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((camp, i) => (
              <React.Fragment key={camp.name}>
                <tr 
                  className={`border-b cursor-pointer transition-colors ${
                    ['CLOSED', 'NO CAMP'].includes(camp.category) 
                      ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' 
                      : 'hover:bg-blue-50'
                  } ${expanded === i ? 'bg-blue-100' : ''}`}
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <td className="px-3 py-2 font-medium max-w-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">{expanded === i ? '▼' : '▶'}</span>
                      {camp.name}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{camp.ages}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{camp.price}</td>
                  <td className="px-3 py-2">{camp.hours}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{camp.category}</td>
                  <td className="px-3 py-2">{camp.reg_date}</td>
                </tr>
                {expanded === i && (
                  <tr className="bg-blue-50 border-b">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1 text-sm">
                        <div className="md:col-span-2 lg:col-span-3 pb-2 mb-2 border-b border-blue-200">
                          <span className="font-semibold text-gray-700">Description:</span>{' '}
                          <span className="text-gray-900">{camp.description}</span>
                        </div>
                        
                        <DetailRow label="Indoor/Outdoor" value={camp.indoor_outdoor} />
                        <DetailRow label="Food Provided" value={camp.food} />
                        <DetailRow label="Extended Care" value={camp.extended_care} />
                        <DetailRow label="Sibling Discount" value={camp.sibling_discount} />
                        <DetailRow label="Multi-Week Discount" value={camp.multi_week} />
                        <DetailRow label="Swim Requirement" value={camp.swim_req} />
                        <DetailRow label="Transport" value={camp.transport} />
                        <DetailRow label="Refund Policy" value={camp.refund} />
                        <DetailRow label="Phone" value={camp.phone} />
                        <DetailRow label="Email" value={camp.email} />
                        <DetailRow label="Address" value={camp.address} />
                        
                        <div className="py-1">
                          <span className="font-semibold text-gray-700">Website:</span>{' '}
                          <a 
                            href={`https://${camp.website}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {camp.website}
                          </a>
                        </div>
                        
                        {camp.notes && (
                          <div className="md:col-span-2 lg:col-span-3 pt-2 mt-2 border-t border-blue-200">
                            <span className="font-semibold text-gray-700">Notes:</span>{' '}
                            <span className="text-gray-900">{camp.notes}</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>Last updated: January 3, 2026. Prices marked with ~ are estimates based on 2025 rates.</p>
        <p>Click any row to expand full details. Click column headers to sort.</p>
      </div>
    </div>
  );
}
