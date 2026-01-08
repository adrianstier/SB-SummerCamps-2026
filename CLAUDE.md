# Santa Barbara Summer Camps 2026

## Project Overview
A summer camp planning tool for busy moms in Santa Barbara. Built with React + Vite frontend, Supabase backend (PostgreSQL + Auth), deployed on Vercel.

**Live Site**: https://sb-summer-camps.vercel.app

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Row Level Security, Google OAuth)
- **Deployment**: Vercel
- **Auth**: Google OAuth via Supabase

## Key Files
- `src/App.jsx` - Main application component with camp listing, filters, search
- `src/lib/supabase.js` - Supabase client and all database helper functions
- `src/contexts/AuthContext.jsx` - Auth state management, user data loading
- `src/components/SchedulePlanner.jsx` - Drag-and-drop calendar planning
- `backend/uploadCamps.js` - Script to upload camp data to Supabase

## Environment Variables
```
VITE_SUPABASE_URL=https://oucayiltlhweenngsauk.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GOOGLE_CLIENT_ID=<google-client-id>
SUPABASE_SERVICE_KEY=<service-role-key> # For backend scripts only
```

## Supabase Project
- **Project ID**: oucayiltlhweenngsauk
- **Tables**: camps, profiles, children, favorites, scheduled_camps, notifications, reviews, etc.
- **RLS**: Enabled with `is_admin()` security definer function to prevent policy recursion

---

# Brand Voice Guidelines

## Brand Essence
**Tagline**: *"Summer planning, simplified."*

Built for moms who don't have time to waste. They're juggling careers, households, and a hundred other responsibilities—summer camp planning should be one less thing to stress about.

## Core Voice Attributes

### Tone: Confident & Direct
- No fluff, no filler
- Get to the point fast
- Respect the user's time
- Speak like a trusted friend who has all the answers

### Personality: Capable & Calm
- We've done the research so you don't have to
- Organized but not rigid
- Supportive without being preachy
- Smart, not smug

### Values
1. **Efficiency** - Every feature saves time
2. **Clarity** - Information is scannable and actionable
3. **Reliability** - Accurate, up-to-date camp data you can trust
4. **Empowerment** - You're in control of your summer

### Emotional Connection
The feeling users should have: **"I've got this."** Relief, confidence, and control.

## Voice Do's and Don'ts

### DO Say:
- "Compare camps side-by-side"
- "Drag to schedule. Done."
- "10 camps match your criteria"
- "Ages 5-12 | $350/week | Extended care available"
- "Your summer at a glance"
- "Coverage gaps? We'll flag them."

### DON'T Say:
- "Welcome to the ULTIMATE summer camp experience!!!"
- "Hey mama! Ready to make magical memories?"
- "We know how hard it is being a mom..."
- "Click here to learn more about our amazing features!"
- Excessive exclamation points
- Mommy-blog speak
- Patronizing language

## Content Hierarchy Principles

1. **Scannable first** - Assume users are skimming
2. **Numbers over words** - "$350" not "three hundred fifty dollars"
3. **Labels over sentences** - "Ages: 5-12" not "This camp is for children ages 5 to 12"
4. **Actions over descriptions** - "Compare" "Schedule" "Save"

## Button & CTA Language

| Instead of... | Use... |
|---------------|--------|
| Submit | Save |
| Click here to view | View Camp |
| Learn more | Details |
| Get started now! | Plan My Summer |
| Sign up for free | Sign In |
| Add to your favorites | (heart icon) |

## Sample Rewrites

**Before**: "We're so excited to help you find the perfect summer camp for your little ones!"
**After**: "90+ Santa Barbara camps. Find the right fit."

**Before**: "Click the heart icon to add this camp to your favorites so you can easily find it later!"
**After**: (heart icon) Save

**Before**: "Oops! Something went wrong. We're so sorry for the inconvenience!"
**After**: "Something went wrong. Refresh to try again."

## Feature-Specific Copy

### Calendar/Planner
- "Drag camps to weeks"
- "Fill gaps" or "Coverage check"
- "Total: $2,400 for 8 weeks"
- Per-child view: "Emma's Summer" / "Jake's Summer"

### Empty States (helpful, not sad)
- "No camps match these filters. Try adjusting age or price."
- "No favorites yet. Heart camps to save them here."
- "Your calendar is empty. Start by browsing camps."

### Error States (calm and clear)
- "Something went wrong. Refresh to try again."
- "Couldn't load camps. Check your connection."

## Brand Voice Summary

| Attribute | Description |
|-----------|-------------|
| **Primary Tone** | Direct, confident, efficient |
| **Secondary Tone** | Warm but not gushy, helpful but not hovering |
| **Vocabulary** | Simple, scannable, action-oriented |
| **Avoid** | Exclamation points, mommy-blog tone, corporate jargon |
| **Goal Feeling** | "I've got this handled." |

---

## Development Notes

### Deploying
```bash
npm run build
npx vercel --yes --prod
```

### Uploading Camps to Supabase
```bash
SUPABASE_SERVICE_KEY=<key> node backend/uploadCamps.js
```

### Local Development
```bash
npm run dev  # Runs on localhost:5173
```
