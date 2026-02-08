import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sand-100)' }}>
          <svg className="w-10 h-10" style={{ color: 'var(--sand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl font-display mb-3" style={{ color: 'var(--earth-800)' }}>
          Page not found
        </h1>
        <p className="text-base mb-8" style={{ color: 'var(--earth-600)' }}>
          This page does not exist. Head back to browse camps.
        </p>
        <Link to="/" className="btn-primary inline-flex">
          Browse Camps
        </Link>
      </div>
    </div>
  );
}
