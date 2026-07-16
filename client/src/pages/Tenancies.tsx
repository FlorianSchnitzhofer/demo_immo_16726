import { FormEvent, useEffect, useState } from 'react';
import { api, Tenancy, Unit } from '../api';
import { Badge, Card, Empty, Toast } from '../components';
import { eur, fmtDate, UNIT_TYPES } from '../format';

const today = () => new Date().toISOString().slice(0, 10);

export default function Tenancies() {
  const [tenancies, setTenancies] = useState<Tenancy[] | null>(null);
  const [vacantUnits, setVacantUnits] = useState<Unit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [endingId, setEndingId] = useState<number | null>(null);
  const [endDate, setEndDate] = useState(today());
  const [form, setForm] = useState({
    unit_id: '',
    tenant_name: '',
    tenant_email: '',
    tenant_phone: '',
    start_date: today(),
    net_rent: '',
    bk_akonto: '',
    deposit: '',
  });

  const load = () => {
    api<Tenancy[]>('/api/tenancies').then(setTenancies).catch(() => setTenancies([]));
    api<Unit[]>('/api/units/vacant').then(setVacantUnits).catch(() => setVacantUnits([]));
  };
  useEffect(load, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/tenancies', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          unit_id: Number(form.unit_id),
          net_rent: Number(form.net_rent),
          bk_akonto: Number(form.bk_akonto),
          deposit: form.deposit ? Number(form.deposit) : 0,
        }),
      });
      setToast('Mietverhältnis wurde angelegt.');
      setShowForm(false);
      setForm({
        unit_id: '',
        tenant_name: '',
        tenant_email: '',
        tenant_phone: '',
        start_date: today(),
        net_rent: '',
        bk_akonto: '',
        deposit: '',
      });
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const endTenancy = async (id: number) => {
    try {
      await api(`/api/tenancies/${id}`, { method: 'PATCH', body: JSON.stringify({ end_date: endDate }) });
      setToast('Mietverhältnis wurde beendet.');
      setEndingId(null);
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  return (
    <>
      <h1 className="page-title">Mietverhältnisse</h1>
      <p className="page-sub">Mieter, Vertragsdaten, Nettomiete, Betriebskosten-Akonto und Kaution</p>

      <div style={{ marginBottom: 14 }}>
        <button className="btn" onClick={() => setShowForm((s) => !s)} disabled={!showForm && vacantUnits.length === 0}>
          {showForm ? 'Abbrechen' : '+ Neues Mietverhältnis'}
        </button>
        {vacantUnits.length === 0 && !showForm && (
          <span className="small muted" style={{ marginLeft: 10 }}>
            Keine leerstehenden Einheiten verfügbar.
          </span>
        )}
      </div>

      {showForm && (
        <Card title="Neues Mietverhältnis">
          <form onSubmit={submit}>
            <div className="form-row">
              <label className="field">
                Einheit* (nur Leerstand)
                <select
                  required
                  value={form.unit_id}
                  onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                >
                  <option value="">– wählen –</option>
                  {vacantUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.property_name} · {u.top_number} ({UNIT_TYPES[u.type]}, {u.area_m2} m²)
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Mieter (Name)*
                <input
                  required
                  value={form.tenant_name}
                  onChange={(e) => setForm({ ...form, tenant_name: e.target.value })}
                />
              </label>
              <label className="field">
                E-Mail
                <input
                  type="email"
                  value={form.tenant_email}
                  onChange={(e) => setForm({ ...form, tenant_email: e.target.value })}
                />
              </label>
              <label className="field">
                Telefon
                <input
                  value={form.tenant_phone}
                  onChange={(e) => setForm({ ...form, tenant_phone: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row">
              <label className="field">
                Vertragsbeginn*
                <input
                  required
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </label>
              <label className="field">
                Nettomiete (EUR)*
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.net_rent}
                  onChange={(e) => setForm({ ...form, net_rent: e.target.value })}
                />
              </label>
              <label className="field">
                BK-Akonto (EUR)*
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.bk_akonto}
                  onChange={(e) => setForm({ ...form, bk_akonto: e.target.value })}
                />
              </label>
              <label className="field">
                Kaution (EUR)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.deposit}
                  onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                />
              </label>
            </div>
            <button className="btn" type="submit">
              Mietverhältnis speichern
            </button>
          </form>
        </Card>
      )}

      <Card>
        {!tenancies ? (
          <Empty>Wird geladen …</Empty>
        ) : tenancies.length === 0 ? (
          <Empty>Keine Mietverhältnisse vorhanden.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Einheit</th>
                  <th>Mieter</th>
                  <th>Kontakt</th>
                  <th>Beginn</th>
                  <th>Ende</th>
                  <th className="num">Nettomiete</th>
                  <th className="num">BK-Akonto</th>
                  <th className="num">Kaution</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tenancies.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>
                      {t.property_name} · {t.top_number}
                    </td>
                    <td>{t.tenant_name}</td>
                    <td className="small">
                      {t.tenant_email}
                      {t.tenant_phone ? <div className="muted">{t.tenant_phone}</div> : null}
                    </td>
                    <td>{fmtDate(t.start_date)}</td>
                    <td>{t.end_date ? fmtDate(t.end_date) : '–'}</td>
                    <td className="num">{eur(t.net_rent)}</td>
                    <td className="num">{eur(t.bk_akonto)}</td>
                    <td className="num">{eur(t.deposit)}</td>
                    <td>{t.active ? <Badge variant="ok">Aktiv</Badge> : <Badge variant="outline">Beendet</Badge>}</td>
                    <td>
                      {t.active &&
                        (endingId === t.id ? (
                          <span className="actions">
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              style={{ padding: '3px 6px' }}
                            />
                            <button className="btn small danger" onClick={() => endTenancy(t.id)}>
                              Beenden
                            </button>
                            <button className="btn small secondary" onClick={() => setEndingId(null)}>
                              ×
                            </button>
                          </span>
                        ) : (
                          <button
                            className="btn small secondary"
                            onClick={() => {
                              setEndingId(t.id);
                              setEndDate(today());
                            }}
                          >
                            Beenden
                          </button>
                        ))}
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
