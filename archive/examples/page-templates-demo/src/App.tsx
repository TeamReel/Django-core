import { Routes, Route, Link, useLocation } from 'react-router-dom';
import DashboardDemo from './pages/DashboardDemo';
import ListDetailDemo from './pages/ListDetailDemo';
import WizardDemo from './pages/WizardDemo';
import SettingsDemo from './pages/SettingsDemo';
import './App.css';

function App() {
  const location = useLocation();

  return (
    <div className="app">
      <nav className="app-nav">
        <div className="nav-container">
          <h1 className="nav-title">Page Templates Demo</h1>
          <div className="nav-links">
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              Dashboard
            </Link>
            <Link
              to="/projects"
              className={`nav-link ${location.pathname === '/projects' ? 'active' : ''}`}
            >
              List-Detail
            </Link>
            <Link
              to="/onboarding"
              className={`nav-link ${location.pathname === '/onboarding' ? 'active' : ''}`}
            >
              Wizard
            </Link>
            <Link
              to="/settings"
              className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
            >
              Settings
            </Link>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<DashboardDemo />} />
        <Route path="/projects" element={<ListDetailDemo />} />
        <Route path="/onboarding" element={<WizardDemo />} />
        <Route path="/settings" element={<SettingsDemo />} />
      </Routes>
    </div>
  );
}

export default App;
