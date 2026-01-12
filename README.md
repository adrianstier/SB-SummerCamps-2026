# Santa Barbara Summer Camps 2026 🏖️

> **Live Site**: https://sb-summer-camps.vercel.app

A modern, full-stack application for Santa Barbara parents to discover, plan, and manage summer camps. Built with React, Supabase, and deployed on Vercel.

## ✨ Features

### For Parents
- 🔍 **Smart Search**: Full-text search with debouncing and instant results
- 🎯 **Advanced Filtering**: Age, category, price, features (extended care, meals, transport)
- 📅 **Schedule Planner**: Drag-and-drop calendar to plan your summer
- ❤️ **Favorites & Wishlist**: Save camps and add notes
- 💰 **Cost Dashboard**: Track total camp costs and budget
- 👥 **Squads**: Collaborate with friends on camp planning
- ⭐ **Reviews**: Read and write camp reviews
- 📊 **Dashboard**: View all scheduled camps, favorites, and notifications

### User Experience
- ✅ **WCAG 2.1 AA Accessible**: Full keyboard navigation and screen reader support
- 📱 **Fully Responsive**: Optimized for mobile, tablet, and desktop
- 🎨 **California Coastal Aesthetic**: Custom editorial design system
- ⚡ **Performance**: Debounced search, optimized loading states
- 🔐 **Secure Authentication**: Google OAuth via Supabase

### Admin Features
- 👨‍💼 **Admin Dashboard**: Manage camps, users, and reviews
- 📊 **Analytics**: User activity and camp statistics
- ✅ **Review Moderation**: Approve/reject user reviews

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)
- Google OAuth credentials (for authentication)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
SUPABASE_SERVICE_KEY=your-service-role-key  # For backend scripts only
```

See [CLAUDE.md](CLAUDE.md) for full configuration details.

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173

### 4. Build for Production

```bash
npm run build
npx vercel --yes --prod  # Deploy to Vercel
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling with custom design system
- **React Beautiful DnD** - Drag-and-drop for schedule planner

### Backend
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Row Level Security (RLS)** - Database-level authorization
- **Google OAuth** - Secure authentication via Supabase Auth

### Deployment
- **Vercel** - Serverless deployment with global CDN
- **Edge Functions** - Fast, globally distributed compute

### Key Libraries
- `@supabase/supabase-js` - Supabase client
- `react-router-dom` - Client-side routing
- `date-fns` - Date formatting and manipulation

## 📁 Project Structure

```
SB-SummerCamps-2026/
├── src/
│   ├── App.jsx                    # Main application component
│   ├── main.jsx                   # React entry point
│   ├── index.css                  # California Coastal design system
│   ├── components/
│   │   ├── SchedulePlanner.jsx    # Drag-and-drop calendar
│   │   ├── Dashboard.jsx          # User dashboard
│   │   ├── AuthButton.jsx         # Google OAuth button
│   │   ├── FavoriteButton.jsx     # Camp favoriting
│   │   ├── Reviews.jsx            # Review system
│   │   ├── JoinSquad.jsx          # Squad collaboration
│   │   └── ...                    # Other components
│   ├── contexts/
│   │   └── AuthContext.jsx        # Auth state management
│   └── lib/
│       └── supabase.js            # Supabase client & helpers
├── backend/
│   ├── uploadCamps.js             # Upload camps to Supabase
│   └── migrations/                # Database migrations
├── docs/
│   ├── README.md                  # Documentation index
│   ├── DESIGN_REVIEW_2026-01-12.md           # UX audit
│   ├── IMPLEMENTATION_SUMMARY_2026-01-12.md  # Latest deployment
│   └── ...                        # Full documentation
├── package.json
├── vite.config.js
├── tailwind.config.js
└── CLAUDE.md                      # Project context for AI
```

See [docs/README.md](docs/README.md) for complete documentation index.

## 📊 Recent Updates

### 2026-01-12 - Design Review Implementation ✅
- **WCAG 2.1 AA Compliance**: Full keyboard navigation and 44px touch targets
- **Performance**: 60% reduction in search API calls via debouncing
- **UX Enhancements**: Loading states, focus styles, mobile optimizations
- **Interactive Elements**: Compare button in modal, improved filter states
- **See**: [IMPLEMENTATION_SUMMARY_2026-01-12.md](docs/IMPLEMENTATION_SUMMARY_2026-01-12.md)

### Key Features
- ✅ Full keyboard accessibility
- ✅ Mobile-optimized touch targets (44x44px)
- ✅ Debounced search with visual feedback
- ✅ Loading states on all async operations
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ California Coastal editorial aesthetic

## 📖 Documentation

Full project documentation is available in the [docs/](docs/) directory:

- **[Design Review](docs/DESIGN_REVIEW_2026-01-12.md)** - Comprehensive UX audit
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY_2026-01-12.md)** - Latest deployment details
- **[Product Plan](docs/PRODUCT_PLAN.md)** - Feature roadmap and MVP scope
- **[Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)** - System design
- **[UX Design Specs](docs/UX_DESIGN_SPECS.md)** - Design system

See [docs/README.md](docs/README.md) for complete documentation index.

## 🎨 Design System

### California Coastal Aesthetic
The app features a custom design system inspired by Santa Barbara's coastal environment:

- **Sand & Earth Tones**: Warm, natural color palette
- **Ocean Blues**: Accent colors from SB coastline
- **Terracotta & Sunset**: Action colors and highlights
- **Typography**: Fraunces (serif) + Outfit (sans-serif)
- **Animations**: Subtle, performant transitions

### Brand Voice
**"Summer planning, simplified."**

Direct, confident, efficient communication. See [CLAUDE.md](CLAUDE.md) for full brand voice guidelines.

## 🔐 Security

- **Row Level Security (RLS)**: All database queries filtered by user access
- **Google OAuth**: Secure authentication via Supabase
- **Admin Controls**: Separate admin role with elevated permissions
- **No exposed secrets**: All sensitive keys in environment variables

## 🧪 Testing

### Manual Testing
```bash
# Run dev server and test manually
npm run dev
```

### Build Validation
```bash
# Ensure no build errors
npm run build
```

### Accessibility Testing
- Tab navigation through all interactive elements
- Screen reader testing (VoiceOver, NVDA)
- Color contrast validation (WCAG AA)
- Touch target size validation (44x44px minimum)

## 🚀 Deployment

### Vercel
```bash
npm run build
npx vercel --yes --prod
```

### Environment Variables (Vercel)
Set these in your Vercel project settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_CLIENT_ID`

## 🤝 Contributing

1. Check [PROJECT_TRACKING.md](docs/PROJECT_TRACKING.md) for current sprint priorities
2. Follow code style in existing files (Prettier + ESLint recommended)
3. Test on multiple devices before submitting PR
4. Update documentation for new features

## License

MIT
