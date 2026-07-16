import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Property } from '../api';
import { Badge, Card, Empty, Toast } from '../components';
import { num } from '../format';

export default function Properties() {
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ name: '', address: '', postal_code: '', city: '', year_built: '' });

  const load = () => api<Property[]>('/api/properties').then(setProperties).catch(() => setProperties([]));
  useEffect(() => {
    load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/properties', {
        method: 'POST',
        body: JSON.stringify({ ...form, year_built: form.year_built ? Number(form.year_built) : null }),
      });
      setToast('Objekt wurde angelegt.');
      setShowForm(false);
      setForm({ name: '', address: '', postal_code: '', city: '', year_built: '' });
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  return (
    <>
      <h1 className="page-title">Objekte</h1>
      <p className="page-sub">Bestandsverwaltung — Mietzinshäuser, Mietwohnungen, Geschäftsflächen</p>

      <div style={{ marginBottom: 14 }}>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Abbrechen' : '+ Neues Objekt'}
        </button>
      </div>

      {showForm && (
        <Card title="Neues Objekt anlegen">
          <form onSubmit={submit}>
            <div className="form-row">
              <label className="field">
                Bezeichnung*
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="field">
                Adresse*
                <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </label>
              <label className="field">
                PLZ
                <input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
              </label>
              <label className="field">
                Ort
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </label>
              <label className="field">
                Baujahr
                <input
                  type="number"
                  value={form.year_built}
                  onChange={(e) => setForm({ ...form, year_built: e.target.value })}
                />
              </label>
            </div>
            <button className="btn" type="submit">
              Objekt speichern
            </button>
          </form>
        </Card>
      )}

      <Card>
        {!properties ? (
          <Empty>Wird geladen …</Empty>
        ) : properties.length === 0 ? (
          <Empty>Noch keine Objekte vorhanden.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Objekt</th>
                  <th>Adresse</th>
                  <th className="num">Einheiten</th>
                  <th className="num">Nutzfläche</th>
                  <th>Leerstand</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="plain" to={`/objekte/${p.id}`}>
                        {p.name}
                      </Link>
                    </td>
                    <td>
                      {p.address}, {p.postal_code} {p.city}
                    </td>
                    <td className="num">{p.unit_count}</td>
                    <td className="num">{num(p.total_area)} m²</td>
                    <td>
                      {p.vacant_count ? (
                        <Badge variant="alert">{p.vacant_count} Einheit(en) leer</Badge>
                      ) : (
                        <Badge variant="ok">Voll vermietet</Badge>
                      )}
                    </td>
                    <td>
                      <Link to={`/objekte/${p.id}`} className="btn small secondary" style={{ textDecoration: 'none' }}>
                        Öffnen
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
