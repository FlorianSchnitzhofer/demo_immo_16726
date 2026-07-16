import { useEffect, useState } from 'react';
import { api, Property } from '../api';
import { Card } from '../components';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 3 + i);

export default function ExportPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR - 1);

  useEffect(() => {
    api<Property[]>('/api/properties').then((ps) => {
      setProperties(ps);
      if (ps.length) setPropertyId(String(ps[0].id));
    });
  }, []);

  const download = () => {
    window.location.href = `/api/properties/${propertyId}/export.csv?year=${year}`;
  };

  return (
    <>
      <h1 className="page-title">Steuerberater-Export</h1>
      <p className="page-sub">CSV-Export der Einnahmen und Ausgaben je Objekt und Jahr</p>

      <Card title="Export erstellen">
        <div className="form-row">
          <label className="field">
            Objekt
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Jahr
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={download} disabled={!propertyId}>
            ⬇ CSV herunterladen
          </button>
        </div>
        <hr className="divider" />
        <p className="small" style={{ margin: 0 }}>
          Der Export enthält als <strong>Einnahmen</strong> alle Vorschreibungen des Jahres (Nettomiete und
          BK-Akonto je Zeile, inklusive Zahlungsstatus) und als <strong>Ausgaben</strong> die erfassten
          Betriebskosten sowie abgeschlossene Dienstleister-Aufträge mit erfassten Kosten. Format: CSV mit
          Semikolon-Trennung und deutschem Zahlenformat — direkt in Excel öffenbar.
        </p>
      </Card>
    </>
  );
}
