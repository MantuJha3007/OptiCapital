import { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import { LandingPage } from './components/LandingPage';
import './index.css';

type ViewMode = 'landing' | 'terminal';

function App() {
  const [view, setView] = useState<ViewMode>(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#terminal' || hash === '#app') return 'terminal';
    if (hash === '#landing' || hash === '#overview') return 'landing';
    return 'landing'; // First time user arrives at the institutional landing page
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#terminal' || hash === '#app') {
        setView('terminal');
      } else if (hash === '#landing' || hash === '#overview') {
        setView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLaunchTerminal = () => {
    window.location.hash = '#terminal';
    setView('terminal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReturnToLanding = () => {
    window.location.hash = '#landing';
    setView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (view === 'terminal') {
    return <Dashboard onReturnToLanding={handleReturnToLanding} />;
  }

  return <LandingPage onLaunchTerminal={handleLaunchTerminal} />;
}

export default App;

