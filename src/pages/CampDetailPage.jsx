import React, { useState, useMemo, useEffect, memo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useCamps } from '../contexts/CampsContext';
import { useCompare } from '../contexts/CompareContext';
import { FavoriteButton } from '../components/FavoriteButton';
import { useRecommendations } from '../hooks/useRecommendations';
import { getRegistrationStatus } from '../lib/supabase';
import { formatPrice } from '../lib/formatters';
import BrandIcon from '../components/BrandIcon';

// Category gradient colors (shared with App.jsx)
const categoryGradients = {
  'Beach/Surf': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  'Theater': 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
  'Dance': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  'Art': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'Science/STEM': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  'Nature/Outdoor': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  'Sports': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  'Music': 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  'Cooking': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  'Faith-Based': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  'Animals/Zoo': 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
  'Multi-Activity': 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
  'Education': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  'Overnight': 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
};

// Validate URL schemes before rendering as href
function safeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

// Helper to check if a camp is effectively closed
function isCampEffectivelyClosed(camp) {
  if (camp.is_closed) return true;
  const cat = (camp.category || '').toUpperCase();
  return cat === 'CLOSED' || cat === 'NO CAMP';
}

// App logo for standalone view
const AppLogo = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="11" r="5" fill="#f9cf45" />
    <path d="M16 3v3M16 14v3M9 11H6M26 11h-3M10.5 5.5l2 2M19.5 7.5l2-2M10.5 16.5l2-2M19.5 14.5l2 2" stroke="#f9cf45" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M3 24c3-3 6-1 9 1s6 3 9 1 6-3 9-1" stroke="#3ba8a8" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M3 28c3-2 6-1 9 1s6 2 9 0 6-2 9 0" stroke="#6bc4c4" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
  </svg>
);

/**
 * CampDetailPage renders camp details either as a modal overlay (when navigated from browse)
 * or as a standalone page (when navigated to directly via URL).
 */
export default function CampDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { camps, loading } = useCamps();
  const { compareList, toggleCompare } = useCompare();
  const { findSimilarCamps } = useRecommendations();

  const isOverlay = !!location.state?.backgroundLocation;

  const camp = useMemo(() => {
    if (!camps || camps.length === 0) return null;
    return camps.find(c => c.id === id);
  }, [camps, id]);

  const isInCompare = useMemo(() => {
    return compareList.includes(id);
  }, [compareList, id]);

  const similarCamps = useMemo(() => {
    if (!findSimilarCamps || !camp || camps.length === 0) return [];
    return findSimilarCamps(camp, camps, 4);
  }, [camp, camps, findSimilarCamps]);

  // Lock body scroll when in overlay mode
  useEffect(() => {
    if (isOverlay) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOverlay]);

  // Keyboard: Escape closes
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOverlay]);

  function handleClose() {
    if (isOverlay) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }

  function handleAddToSchedule() {
    navigate('/schedule');
  }

  function handleSelectSimilar(similarCamp) {
    navigate(`/camp/${similarCamp.id}`, {
      state: isOverlay ? { backgroundLocation: location.state.backgroundLocation } : undefined,
      replace: isOverlay,
    });
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <svg className="w-8 h-8 animate-spin loading-spinner-branded" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  // Camp not found
  if (!camp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <h1 className="text-2xl font-serif font-heading mb-4" style={{ color: 'var(--earth-800)' }}>
          Camp not found
        </h1>
        <p className="mb-6" style={{ color: 'var(--earth-600)' }}>
          The camp you're looking for doesn't exist or may have been removed.
        </p>
        <Link to="/" className="btn-primary">
          Back to all camps
        </Link>
      </div>
    );
  }

  // Build feature pills
  const regStatus = getRegistrationStatus(camp);
  const featurePills = [];
  if (!isCampEffectivelyClosed(camp) && regStatus.status !== 'unknown') {
    const statusIconMap = { open: 'check', upcoming: 'calendar', waitlist: 'hourglass', closed: 'x-circle' };
    featurePills.push({
      icon: regStatus.isOpen ? 'check' : (statusIconMap[regStatus.status] || 'info'),
      label: regStatus.label,
      type: regStatus.isOpen ? 'open' : regStatus.status === 'upcoming' ? (regStatus.daysUntil <= 7 ? 'soon' : 'upcoming') : 'full',
      key: 'registration',
      color: regStatus.color,
    });
  }
  if (camp.has_extended_care) featurePills.push({ icon: 'clock-plus', label: 'Extended Care', key: 'extended' });
  if (camp.food_included) featurePills.push({ icon: 'utensils', label: 'Meals Included', key: 'food' });
  if (camp.has_transport) featurePills.push({ icon: 'van', label: 'Transport', key: 'transport' });
  if (camp.has_sibling_discount) featurePills.push({ icon: 'people-percent', label: 'Sibling Discount', key: 'sibling' });
  if (camp.fsa_eligible) featurePills.push({ icon: 'card-check', label: 'FSA Eligible', key: 'fsa', type: 'fsa' });

  const categoryGradient = categoryGradients[camp.category] || categoryGradients['Multi-Activity'];

  // Shared camp detail content used in both modal and standalone views
  const campDetailContent = (
    <CampDetailContent
      camp={camp}
      categoryGradient={categoryGradient}
      featurePills={featurePills}
      regStatus={regStatus}
      campId={id}
      isInCompare={isInCompare}
      similarCamps={similarCamps}
      onClose={handleClose}
      onAddToSchedule={handleAddToSchedule}
      onToggleCompare={() => toggleCompare(id)}
      onSelectSimilar={handleSelectSimilar}
    />
  );

  // Overlay/modal mode
  if (isOverlay) {
    return (
      <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true" aria-label={`${camp.camp_name} details`}>
        <article className="modal-card" onClick={(e) => e.stopPropagation()}>
          {campDetailContent}
        </article>
      </div>
    );
  }

  // Standalone page mode
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 no-underline" style={{ color: 'var(--earth-800)' }}>
            <AppLogo className="w-8 h-8" />
            <span className="font-serif text-lg">Summer Camps</span>
          </Link>
          <span style={{ color: 'var(--sand-300)' }}>/</span>
          <span className="text-sm truncate" style={{ color: 'var(--earth-600)' }}>{camp.camp_name}</span>
        </div>
      </header>
      <div className="max-w-4xl mx-auto">
        <article className="bg-white rounded-2xl shadow-sm overflow-hidden my-6 mx-4">
          {campDetailContent}
        </article>
      </div>
    </div>
  );
}

/**
 * Shared content rendered inside the modal card or standalone article.
 * Extracted to avoid duplication between overlay and standalone modes.
 */
const CampDetailContent = memo(function CampDetailContent({
  camp,
  categoryGradient,
  featurePills,
  regStatus,
  campId,
  isInCompare,
  similarCamps,
  onClose,
  onAddToSchedule,
  onToggleCompare,
  onSelectSimilar,
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <>
      <button className="modal-close" onClick={onClose} aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        <span>Close</span>
      </button>
      <header className="modal-hero">
        {camp.image_url && !imageError ? (
          <img src={camp.image_url} alt={camp.camp_name} className="modal-hero-img" width={800} height={280} loading="lazy" decoding="async" onError={() => setImageError(true)} />
        ) : (
          <div className="modal-hero-fallback" style={{ background: categoryGradient }} />
        )}
        <div className="modal-hero-gradient" />
        <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
          {onToggleCompare && (
            <button type="button" className={`modal-favorite ${isInCompare ? 'is-active' : ''}`} onClick={onToggleCompare} aria-label={isInCompare ? 'Remove from comparison' : 'Add to comparison'}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </button>
          )}
          <FavoriteButton campId={campId} size="md" />
        </div>
        <div className="modal-hero-content">
          <p className="modal-category">{camp.category}</p>
          <h1 className="modal-title">{camp.camp_name}</h1>
          <p className="modal-subtitle">{camp.ages || 'All ages'} · {formatPrice(camp)} · {camp.hours || 'Hours TBD'}</p>
        </div>
      </header>
      <div className="modal-body">
        {featurePills.length > 0 && (
          <div className="modal-pills">
            {featurePills.map((pill) => (
              <span key={pill.key} className={`modal-pill ${pill.type ? `modal-pill--${pill.type}` : ''}`}>
                <span className="modal-pill-icon"><BrandIcon name={pill.icon} size={14} /></span>
                {pill.label}
              </span>
            ))}
          </div>
        )}
        {camp.description && (<p className="modal-description">{camp.description}</p>)}
        <div className="modal-grid">
          <section className="modal-section">
            <h2 className="modal-section-title">Where & When</h2>
            <dl className="modal-dl">
              {camp.address && (<><dt>Location</dt><dd>{camp.address}</dd></>)}
              {camp.indoor_outdoor && camp.indoor_outdoor !== 'Unknown' && (<><dt>Setting</dt><dd>{camp.indoor_outdoor}</dd></>)}
              {camp.hours && (<><dt>Hours</dt><dd>{camp.hours}</dd></>)}
              {camp.extended_care && camp.extended_care !== 'Unknown' && (<><dt>Extended Care</dt><dd>{camp.extended_care}</dd></>)}
            </dl>
          </section>
          {((camp.contact_phone && !camp.contact_phone.toLowerCase().includes('see website') && camp.contact_phone.replace(/\D/g, '').length >= 7) || (camp.contact_email && !camp.contact_email.toLowerCase().includes('see website') && camp.contact_email.includes('@')) || (camp.extended_care_cost && camp.extended_care_cost !== 'Unknown' && camp.extended_care_cost !== 'N/A') || (camp.sibling_discount && camp.sibling_discount !== 'Unknown') || (camp.refund_policy && camp.refund_policy !== 'Unknown' && camp.refund_policy !== 'N/A')) && (
            <section className="modal-section">
              <h2 className="modal-section-title">Contact & Cost</h2>
              <dl className="modal-dl">
                {camp.contact_phone && !camp.contact_phone.toLowerCase().includes('see website') && camp.contact_phone.replace(/\D/g, '').length >= 7 && (<><dt>Phone</dt><dd><a href={`tel:${camp.contact_phone.replace(/\D/g, '')}`} className="modal-link">{camp.contact_phone}</a></dd></>)}
                {camp.contact_email && !camp.contact_email.toLowerCase().includes('see website') && camp.contact_email.includes('@') && (<><dt>Email</dt><dd><a href={`mailto:${camp.contact_email}`} className="modal-link">{camp.contact_email}</a></dd></>)}
                {camp.extended_care_cost && camp.extended_care_cost !== 'Unknown' && camp.extended_care_cost !== 'N/A' && (<><dt>Extended Care Cost</dt><dd>{camp.extended_care_cost}</dd></>)}
                {camp.sibling_discount && camp.sibling_discount !== 'Unknown' && (<><dt>Sibling Discount</dt><dd>{camp.sibling_discount}</dd></>)}
                {camp.refund_policy && camp.refund_policy !== 'Unknown' && camp.refund_policy !== 'N/A' && (<><dt>Cancellation</dt><dd>{camp.refund_policy}</dd></>)}
              </dl>
            </section>
          )}
        </div>
        {camp.extracted?.pricing_tiers && (camp.extracted.pricing_tiers.earlyBird || camp.extracted.pricing_tiers.regular || camp.extracted.pricing_tiers.halfDay || camp.extracted.pricing_tiers.fullDay || camp.extracted.pricing_tiers.perSession) && (
          <section className="modal-section modal-section--full">
            <h2 className="modal-section-title">Pricing</h2>
            <dl className="modal-dl modal-dl--pricing">
              {camp.extracted.pricing_tiers.earlyBird && (<><dt>Early Bird</dt><dd>${camp.extracted.pricing_tiers.earlyBird}/week</dd></>)}
              {camp.extracted.pricing_tiers.regular && (<><dt>Regular</dt><dd>${camp.extracted.pricing_tiers.regular}/week</dd></>)}
              {camp.extracted.pricing_tiers.halfDay && (<><dt>Half Day</dt><dd>${camp.extracted.pricing_tiers.halfDay}</dd></>)}
              {camp.extracted.pricing_tiers.fullDay && (<><dt>Full Day</dt><dd>${camp.extracted.pricing_tiers.fullDay}</dd></>)}
              {camp.extracted.pricing_tiers.perSession && (<><dt>Per Session</dt><dd>${camp.extracted.pricing_tiers.perSession}</dd></>)}
            </dl>
          </section>
        )}
        {camp.extracted?.sessions && camp.extracted.sessions.length > 0 && (
          <section className="modal-section modal-section--full">
            <h2 className="modal-section-title">2026 Sessions</h2>
            <div className="modal-sessions">
              {camp.extracted.sessions.map((session, i) => {
                const text = (session.raw || '').replace(/[\n\t]+/g, ' ').trim();
                return text ? (<div key={i} className="modal-session-row"><span className="modal-session-text">{text}</span></div>) : null;
              })}
            </div>
          </section>
        )}
        {camp.extracted?.activities && camp.extracted.activities.length > 0 && (
          <section className="modal-section modal-section--full">
            <h2 className="modal-section-title">Activities</h2>
            <div className="modal-tags">
              {camp.extracted.activities.map((activity, i) => (<span key={i} className="modal-tag">{activity}</span>))}
            </div>
          </section>
        )}
        {camp.extracted?.testimonials && camp.extracted.testimonials.length > 0 && (
          <div className="modal-testimonials">
            {camp.extracted.testimonials.slice(0, 3).map((quote, i) => (
              <blockquote key={i} className="modal-quote"><p>"{quote}"</p></blockquote>
            ))}
          </div>
        )}
        {camp.notes && (
          <div className="modal-callout modal-callout--sun">
            <span className="modal-callout-icon"><BrandIcon name="pencil" size={18} /></span>
            <div><strong>Notes</strong><p>{camp.notes}</p></div>
          </div>
        )}
        {similarCamps.length > 0 && (
          <section className="modal-similar-camps">
            <h2 className="modal-section-title">Camps Like This</h2>
            <p className="modal-similar-subtitle">Similar options you might like</p>
            <div className="modal-similar-grid">
              {similarCamps.map(({ camp: similarCamp, explanation }) => (
                <button key={similarCamp.id} className="modal-similar-card" onClick={() => onSelectSimilar?.(similarCamp)}>
                  {similarCamp.image_url ? (
                    <img src={similarCamp.image_url} alt="" className="modal-similar-img" width={200} height={100} loading="lazy" decoding="async" />
                  ) : (
                    <div className="modal-similar-img-fallback" style={{ background: categoryGradients[similarCamp.category] || 'var(--sand-200)' }} />
                  )}
                  <div className="modal-similar-info">
                    <p className="modal-similar-name">{similarCamp.camp_name}</p>
                    <p className="modal-similar-meta">{similarCamp.ages || 'All ages'} · {formatPrice(similarCamp)}</p>
                    {explanation && (<p className="modal-similar-reason">{explanation}</p>)}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      {!isCampEffectivelyClosed(camp) && regStatus.status !== 'closed' && (
        <footer className="modal-footer">
          {camp.website_url && safeUrl(camp.website_url) && (
            <a href={safeUrl(camp.website_url)} target="_blank" rel="noopener noreferrer" className="modal-btn modal-btn--primary">
              Visit Website
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>
            </a>
          )}
          <button onClick={onAddToSchedule} className="modal-btn modal-btn--secondary">
            Schedule This Camp
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </button>
        </footer>
      )}
      {camp.social_media && Object.keys(camp.social_media).length > 0 && (
        <div className="modal-social">
          {safeUrl(camp.social_media.facebook) && (<a href={safeUrl(camp.social_media.facebook)} target="_blank" rel="noopener noreferrer" className="modal-social-link" aria-label="Facebook"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>)}
          {safeUrl(camp.social_media.instagram) && (<a href={safeUrl(camp.social_media.instagram)} target="_blank" rel="noopener noreferrer" className="modal-social-link" aria-label="Instagram"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>)}
          {safeUrl(camp.social_media.youtube) && (<a href={safeUrl(camp.social_media.youtube)} target="_blank" rel="noopener noreferrer" className="modal-social-link" aria-label="YouTube"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>)}
        </div>
      )}
    </>
  );
});
