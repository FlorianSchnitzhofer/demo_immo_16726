import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, BkAbrechnung, OperatingCost, Property } from '../api';
import { Badge, Card, Empty, Toast } from '../components';
import { eur, num, UNIT_TYPES } from '../format';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 3 + i);

export default function OperatingCosts() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState<string>('');
  const [year, setYear] = useState(CURRENT_YEAR - 1);
  const [costs, setCosts] = useState<OperatingCost[] | null>(null);
  const [statement, setStatement] = useState<BkAbrechnung | null>(null);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ category: '', description: '', amount: '' });

  useEffect(() => {
    api<Property[]>('/api/properties').then((ps) => {
      setProperties(ps);
      if (ps.length && !propertyId) setPropertyId(String(ps[0].id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(() => {
    if (!propertyId) return;
    api<OperatingCost[]>(`/api/operating-costs?property_id=${propertyId}&year=${year}`)
      .then(setCosts)
      .catch(() => setCosts([]));
    setStatement(null);
  }, [propertyId, year]);

  useEffect(load, [load]);

  const addCost = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/operating-costs', {
        method: 'POST',
        body: JSON.stringify({
          property_id: Number(propertyId),
          year,
          category: form.category,
          description: form.description,
          amount: Number(form.amount),
        }),
      });
      setForm({ category: '', description: '', amount: '' });
      setToast('Kostenposition wurde erfasst.');
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const removeCost = async (id: number) => {
    try {
      await api(`/api/operating-costs/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const calculate = async () => {
    try {
      const st = await api<BkAbrechnung>(`/api/properties/${propertyId}/bk-abrechnung?year=${year}`);
      setStatement(st);
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const totalCosts = (costs ?? []).reduce((s, c) => s + c.amount, 0);

  return (
    <>
      <h1 className="page-title">Betriebskosten</h1>
      <p className="page-sub">
        Kosten je Objekt und Jahr erfassen und nach dem Verteilerschlüssel Nutzfläche auf die Einheiten umlegen
      </p>

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
          Abrechnungsjahr
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Card title={`Erfasste Kosten ${year}`}>
        <form onSubmit={addCost}>
          <div className="form-row">
            <label className="field">
              Kategorie*
              <input
                required
                placeholder="z. B. Versicherung"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </label>
            <label className="field" style={{ flex: '2 1 220px' }}>
              Beschreibung
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="field">
              Betrag (EUR)*
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </label>
            <button className="btn" type="submit">
              Erfassen
            </button>
          </div>
        </form>
        {!costs ? (
          <Empty>Wird geladen …</Empty>
        ) : costs.length === 0 ? (
          <Empty>Für {year} sind noch keine Kosten erfasst.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kategorie</th>
                  <th>Beschreibung</th>
                  <th className="num">Betrag</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.category}</td>
                    <td>{c.description}</td>
                    <td className="num">{eur(c.amount)}</td>
                    <td>
                      <button className="btn small secondary" onClick={() => removeCost(c.id)}>
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Gesamtkosten {year}</td>
                  <td className="num">{eur(totalCosts)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <Card
        title={`Betriebskostenabrechnung ${year}`}
        actions={
          <button className="btn" onClick={calculate} disabled={!propertyId || !costs || costs.length === 0}>
            Abrechnung erstellen
          </button>
        }
      >
        {!statement ? (
          <Empty>
            Erstellt die Abrechnung: Umlage der Gesamtkosten nach Nutzfläche, Gegenüberstellung mit den
            Akonto-Zahlungen und Saldo je Mietverhältnis.
          </Empty>
        ) : (
          <>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="kpi-label">Gesamtkosten</div>
                <div className="kpi-value">{eur(statement.total_costs)}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Nutzfläche</div>
                <div className="kpi-value">{num(statement.total_area)} m²</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Kosten je m²</div>
                <div className="kpi-value">{eur(statement.cost_per_m2)}</div>
                <div className="kpi-hint">pro Jahr</div>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Top</th>
                    <th>Kategorie</th>
                    <th className="num">Fläche</th>
                    <th className="num">Kostenanteil</th>
                    <th>Mieter</th>
                    <th className="num">Monate</th>
                    <th className="num">Akonto</th>
                    <th className="num">Saldo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {statement.allocations.flatMap((a) => {
                    const rows = a.tenancies.map((t, ti) => (
                      <tr key={`${a.unit_id}-${t.tenancy_id}`}>
                        <td style={{ fontWeight: 600 }}>{ti === 0 ? a.top_number : ''}</td>
                        <td>{ti === 0 ? UNIT_TYPES[a.type] ?? a.type : ''}</td>
                        <td className="num">{ti === 0 ? `${num(a.area_m2)} m²` : ''}</td>
                        <td className="num">{eur(t.cost_share)}</td>
                        <td>{t.tenant_name}</td>
                        <td className="num">{t.months}</td>
                        <td className="num">{eur(t.akonto)}</td>
                        <td className="num" style={{ fontWeight: 600 }}>
                          {eur(Math.abs(t.saldo))}
                        </td>
                        <td>
                          {t.saldo >= 0 ? (
                            <Badge variant="ok">Guthaben</Badge>
                          ) : (
                            <Badge variant="alert">Nachzahlung</Badge>
                          )}
                        </td>
                      </tr>
                    ));
                    if (a.owner_share > 0.005) {
                      rows.push(
                        <tr key={`${a.unit_id}-owner`}>
                          <td style={{ fontWeight: 600 }}>{a.tenancies.length === 0 ? a.top_number : ''}</td>
                          <td>{a.tenancies.length === 0 ? UNIT_TYPES[a.type] ?? a.type : ''}</td>
                          <td className="num">{a.tenancies.length === 0 ? `${num(a.area_m2)} m²` : ''}</td>
                          <td className="num">{eur(a.owner_share)}</td>
                          <td className="muted">Leerstand — zulasten Eigentümer</td>
                          <td className="num">–</td>
                          <td className="num">–</td>
                          <td className="num">–</td>
                          <td>
                            <Badge variant="outline">Eigentümer</Badge>
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Summen</td>
                    <td className="num">{eur(statement.allocations.reduce((s, a) => s + a.unit_share, 0))}</td>
                    <td></td>
                    <td></td>
                    <td className="num">
                      {eur(statement.allocations.reduce((s, a) => s + a.tenancies.reduce((x, t) => x + t.akonto, 0), 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="small muted" style={{ marginBottom: 0 }}>
              Saldo = Akonto-Vorschreibung minus anteilige Kosten. Positiver Saldo bedeutet Guthaben des Mieters,
              negativer Saldo eine Nachzahlung. Leerstandszeiten gehen zulasten des Eigentümers.
            </p>
          </>
        )}
      </Card>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
