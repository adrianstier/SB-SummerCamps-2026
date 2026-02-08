import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCamps } from '../contexts/CampsContext';

const Dashboard = lazy(() => import('../components/Dashboard').then(m => ({ default: m.Dashboard })));

function ModalLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
        <svg className="w-8 h-8 animate-spin loading-spinner-branded" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p style={{ color: 'var(--earth-700)' }}>Preparing your view...</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { camps } = useCamps();

  return (
    <Suspense fallback={<ModalLoadingFallback />}>
      <Dashboard
        camps={camps}
        onClose={() => navigate('/')}
        onOpenPlanner={() => navigate('/schedule')}
        onSelectCamp={(camp) => {
          // Navigate to browse and let the camp card handle it
          navigate('/');
        }}
      />
    </Suspense>
  );
}
