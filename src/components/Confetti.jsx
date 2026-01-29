import React, { memo, useEffect, useState, useCallback } from 'react';
import { useAchievements } from '../contexts/AchievementsContext';
import './Confetti.css';

// Confetti particle configuration
const PARTICLE_COUNT = 100;
const COLORS = [
  '#f87171', // red
  '#fb923c', // orange
  '#facc15', // yellow
  '#4ade80', // green
  '#38bdf8', // blue
  '#a78bfa', // purple
  '#f472b6', // pink
  '#2dd4bf', // teal
];

// Generate random confetti particles
function generateParticles(count, isLegendary = false) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100, // % from left
      delay: Math.random() * 2, // seconds
      duration: 2.5 + Math.random() * 2, // seconds
      size: isLegendary ? 10 + Math.random() * 10 : 6 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 720,
      type: Math.random() > 0.5 ? 'square' : 'circle',
      wobble: Math.random() * 30 - 15, // horizontal wobble
    });
  }
  return particles;
}

export const Confetti = memo(function Confetti() {
  const { celebration, recentAchievement, dismissCelebration } = useAchievements();
  const [particles, setParticles] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (celebration) {
      const isLegendary = celebration === 'legendary';
      setParticles(generateParticles(isLegendary ? PARTICLE_COUNT * 1.5 : PARTICLE_COUNT, isLegendary));
      setVisible(true);

      // Hide after animation completes
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [celebration]);

  const handleClose = useCallback(() => {
    setVisible(false);
    dismissCelebration();
  }, [dismissCelebration]);

  if (!visible) return null;

  return (
    <div className="confetti-container" onClick={handleClose} aria-hidden="true">
      {/* Confetti particles */}
      <div className="confetti-particles">
        {particles.map(particle => (
          <div
            key={particle.id}
            className={`confetti-particle confetti-${particle.type}`}
            style={{
              '--x': `${particle.x}%`,
              '--delay': `${particle.delay}s`,
              '--duration': `${particle.duration}s`,
              '--size': `${particle.size}px`,
              '--color': particle.color,
              '--rotation': `${particle.rotation}deg`,
              '--rotation-speed': `${particle.rotationSpeed}deg`,
              '--wobble': `${particle.wobble}px`,
            }}
          />
        ))}
      </div>

      {/* Achievement toast notification */}
      {recentAchievement && (
        <div className={`confetti-toast ${celebration === 'legendary' ? 'legendary' : ''}`}>
          <div className="confetti-toast-content">
            <span className="confetti-toast-icon">{recentAchievement.icon}</span>
            <div className="confetti-toast-text">
              <span className="confetti-toast-label">Achievement Unlocked</span>
              <span className="confetti-toast-title">{recentAchievement.title}</span>
              <span className="confetti-toast-celebration">{recentAchievement.celebration}</span>
            </div>
          </div>
          <button className="confetti-toast-close" onClick={handleClose} aria-label="Dismiss">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
});

// Standalone celebration function for manual triggers
export function CelebrationBurst({ active, onComplete, type = 'default' }) {
  const [particles, setParticles] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setParticles(generateParticles(type === 'legendary' ? 150 : 80, type === 'legendary'));
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [active, type, onComplete]);

  if (!visible) return null;

  return (
    <div className="confetti-burst" aria-hidden="true">
      {particles.map(particle => (
        <div
          key={particle.id}
          className={`confetti-particle confetti-${particle.type}`}
          style={{
            '--x': `${particle.x}%`,
            '--delay': `${particle.delay * 0.5}s`,
            '--duration': `${particle.duration}s`,
            '--size': `${particle.size}px`,
            '--color': particle.color,
            '--rotation': `${particle.rotation}deg`,
            '--rotation-speed': `${particle.rotationSpeed}deg`,
            '--wobble': `${particle.wobble}px`,
          }}
        />
      ))}
    </div>
  );
}

export default Confetti;
