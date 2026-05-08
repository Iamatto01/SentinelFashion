import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import BottomNav from './components/BottomNav';

import HomePage from './pages/HomePage';
import WardrobePage from './pages/WardrobePage';
import CameraPage from './pages/CameraPage';
import StylistPage from './pages/StylistPage';
import ProfilePage from './pages/ProfilePage';
import OnboardingPage from './pages/OnboardingPage';

function App() {
  const store = useStore();

  return (
    <BrowserRouter basename="/SentinelFashion/">
      <div className="app-layout">

        <main className="page-content">
          <Routes>
            <Route path="/" element={store.profile.onboarded ? <HomePage store={store} /> : <Navigate to="/onboarding" replace />} />
            <Route path="/onboarding" element={!store.profile.onboarded ? <OnboardingPage store={store} /> : <Navigate to="/" replace />} />
            <Route path="/wardrobe" element={<WardrobePage store={store} />} />
            <Route path="/camera" element={<CameraPage store={store} />} />
            <Route path="/stylist" element={<StylistPage store={store} />} />
            <Route path="/profile" element={<ProfilePage store={store} />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
