import React from 'react';
import App from '../App';

// BrowsePage renders the main App component which contains
// the hero, filters, camp grid, footer, compare bar, and camp detail modal.
// App.jsx has been slimmed to only contain browse-related content,
// with camp data coming from CampsContext and compare state from CompareContext.
export default function BrowsePage() {
  return <App />;
}
