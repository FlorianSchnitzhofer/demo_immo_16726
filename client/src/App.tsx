import { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { api, User } from './api';
import {
  IconBuilding,
  IconCalculator,
  IconDashboard,
  IconDownload,
  IconGear,
  IconPeople,
  IconReceipt,
  IconTruck,
  IconWrench,
} from './icons';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Tenancies from './pages/Tenancies';
import Invoices from './pages/Invoices';
import OperatingCosts from './pages/OperatingCosts';
import Tickets from './pages/Tickets';
import Providers from './pages/Providers';
import ExportPage from './pages/ExportPage';
import Admin from './pages/Admin';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api<User>('/api/me').then(setUser).catch(console.error);
  }, []);

  const initials = user
    ? user.name
        .split(' ')
        .map((s) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          Tech2Be <span>Immo Manager</span>
        </div>
        <div className="spacer" />
        {user && (
          <div className="user" title={`Angemeldet als ${user.email} (${user.role})`}>
            <span>{user.email}</span>
            <div className="avatar">{initials}</div>
          </div>
        )}
      </header>
      <div className="layout">
        <nav className="sidebar">
          <NavLink to="/" end>
            <IconDashboard /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/objekte">
            <IconBuilding /> <span>Objekte</span>
          </NavLink>
          <NavLink to="/mietverhaeltnisse">
            <IconPeople /> <span>Mietverhältnisse</span>
          </NavLink>
          <NavLink to="/vorschreibungen">
            <IconReceipt /> <span>Vorschreibungen</span>
          </NavLink>
          <NavLink to="/betriebskosten">
            <IconCalculator /> <span>Betriebskosten</span>
          </NavLink>
          <NavLink to="/tickets">
            <IconWrench /> <span>Tickets & Aufträge</span>
          </NavLink>
          <NavLink to="/dienstleister">
            <IconTruck /> <span>Dienstleister</span>
          </NavLink>
          <NavLink to="/export">
            <IconDownload /> <span>Steuerberater-Export</span>
          </NavLink>
          <NavLink to="/admin">
            <IconGear /> <span>Administration</span>
          </NavLink>
        </nav>
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/objekte" element={<Properties />} />
            <Route path="/objekte/:id" element={<PropertyDetail />} />
            <Route path="/mietverhaeltnisse" element={<Tenancies />} />
            <Route path="/vorschreibungen" element={<Invoices />} />
            <Route path="/betriebskosten" element={<OperatingCosts />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/dienstleister" element={<Providers />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
