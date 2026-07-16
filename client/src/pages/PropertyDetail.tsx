import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, PropertyDetail as PD } from '../api';
import { Badge, Card, Empty, Toast } from '../components';
import { eur, fmtDate, num, UNIT_TYPES } from '../format';

export default function PropertyDetail() {
  const { id } = useParams();
  const [prop, setProp] = useState<PD | null>(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ top_number: '', type: 'wohnung', area_m2: '', floor: '', rooms: '' });

  const load = () =>
    api<PD>(`/api/properties/${id}`)
      .then(setProp)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/api/properties/${id}/units`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          area_m2: Number(form.area_m2),
          rooms: form.rooms ? Number(form.rooms) : null,
        }),
      });
      setToast('Einheit wurde angelegt.');
      setShowForm(false);
      setForm({ top_number: '', type: 'wohnung', area_m2: '', floor: '', rooms: '' });
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  if (error) return <Empty>Fehler: {error}</Empty>;
  if (!prop) return <Empty>Wird geladen …</Empty>;

  const vacant = prop.units.filter((u) => !u.tenancy_id).length;
  const totalArea = prop.units.reduce((s, u) => s + u.area_m2, 0);

  return (
    <>
      <p className="small" style={{ margin: '4px 0' }}>
        <Link to="/objekte" className="plain">
          ← Objekte
        </Link>
      </p>
      <h1 className="page-title">{prop.name}</h1>
      <p className="page-sub">
        {prop.address}, {prop.postal_code} {prop.city}
        {prop.year_built ? ` · Baujahr ${prop.year_built}` : ''}
        {prop.notes ? ` · ${prop.notes}` : ''}
      </p>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Einheiten</div>
          <div className="kpi-value">{prop.units.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Nutzfläche</div>
          <div className="kpi-value">{num(totalArea)} m²</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Leerstand</div>
          <div className="kpi-value">{vacant}</div>
          <div className="kpi-hint">{vacant === 0 ? 'voll vermietet' : 'Einheit(en) ohne Mietverhältnis'}</div>
        </div>
      </div>

      <Card
        title="Einheiten"
        actions={
          <button className="btn small" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Abbrechen' : '+ Einheit'}
          </button>
        }
      >
        {showForm && (
          <form onSubmit={submit} style={{ marginBottom: 14 }}>
            <div className="form-row">
              <label className="field">
                Top-Nummer*
                <input
                  required
                  value={form.top_number}
                  onChange={(e) => setForm({ ...form, top_number: e.target.value })}
                />
              </label>
              <label className="field">
                Kategorie*
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="wohnung">Wohnung</option>
                  <option value="geschaeft">Geschäftsfläche</option>
                  <option value="stellplatz">Stellplatz</option>
                </select>
              </label>
              <label className="field">
                Nutzfläche (m²)*
                <input
                  required
                  type="number"
                  step="0.01"
                  min="1"
                  value={form.area_m2}
                  onChange={(e) => setForm({ ...form, area_m2: e.target.value })}
                />
              </label>
              <label className="field">
                Etage
                <input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
              </label>
              <label className="field">
                Zimmer
                <input
                  type="number"
                  value={form.rooms}
                  onChange={(e) => setForm({ ...form, rooms: e.target.value })}
                />
              </label>
            </div>
            <button className="btn" type="submit">
              Einheit speichern
            </button>
          </form>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Top</th>
                <th>Kategorie</th>
                <th>Etage</th>
                <th className="num">Zimmer</th>
                <th className="num">Nutzfläche</th>
                <th>Status</th>
                <th>Mieter</th>
                <th className="num">Nettomiete</th>
                <th className="num">BK-Akonto</th>
                <th>Mietbeginn</th>
              </tr>
            </thead>
            <tbody>
              {prop.units.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.top_number}</td>
                  <td>{UNIT_TYPES[u.type]}</td>
                  <td>{u.floor || '–'}</td>
                  <td className="num">{u.rooms ?? '–'}</td>
                  <td className="num">{num(u.area_m2)} m²</td>
                  <td>
                    {u.tenancy_id ? <Badge variant="ok">Vermietet</Badge> : <Badge variant="alert">Leerstand</Badge>}
                  </td>
                  <td>{u.tenant_name ?? <span className="muted">–</span>}</td>
                  <td className="num">{u.tenancy_id ? eur(u.net_rent) : '–'}</td>
                  <td className="num">{u.tenancy_id ? eur(u.bk_akonto) : '–'}</td>
                  <td>{u.tenancy_id ? fmtDate(u.start_date) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
