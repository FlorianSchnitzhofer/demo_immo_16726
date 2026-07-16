import { useCallback, useEffect, useState } from 'react';
import { api, Invoice } from '../api';
import { Card, Empty, InvoiceStatusBadge, Toast } from '../components';
import { eur, fmtDate, MONTHS, period } from '../format';

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [toast, setToast] = useState('');
  const [genYear, setGenYear] = useState(CURRENT_YEAR);
  const [genMonth, setGenMonth] = useState(CURRENT_MONTH);
  const [filterYear, setFilterYear] = useState<string>(String(CURRENT_YEAR));
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filterYear) params.set('year', filterYear);
    if (filterMonth) params.set('month', filterMonth);
    if (filterStatus) params.set('status', filterStatus);
    api<Invoice[]>(`/api/invoices?${params}`).then(setInvoices).catch(() => setInvoices([]));
  }, [filterYear, filterMonth, filterStatus]);

  useEffect(load, [load]);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await api<{ created: number }>('/api/invoices/generate', {
        method: 'POST',
        body: JSON.stringify({ year: genYear, month: genMonth }),
      });
      setToast(
        res.created > 0
          ? `${res.created} Vorschreibung(en) für ${period(genYear, genMonth)} erzeugt.`
          : `Für ${period(genYear, genMonth)} sind bereits alle Vorschreibungen vorhanden.`
      );
      load();
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (inv: Invoice, status: 'offen' | 'bezahlt') => {
    try {
      await api(`/api/invoices/${inv.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const sum = (invoices ?? []).reduce((s, i) => s + i.total, 0);
  const openSum = (invoices ?? []).filter((i) => i.status === 'offen').reduce((s, i) => s + i.total, 0);

  return (
    <>
      <h1 className="page-title">Vorschreibungen</h1>
      <p className="page-sub">Monatliche Mietvorschreibungen (Nettomiete + BK-Akonto) erzeugen und Zahlungsstatus pflegen</p>

      <Card title="Vorschreibungen erzeugen">
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label className="field">
            Monat
            <select value={genMonth} onChange={(e) => setGenMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Jahr
            <select value={genYear} onChange={(e) => setGenYear(Number(e.target.value))}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={generate} disabled={busy}>
            Vorschreibungen erzeugen
          </button>
          <span className="small muted">
            Erzeugt für alle im Monat aktiven Mietverhältnisse eine Vorschreibung (bereits vorhandene werden übersprungen).
          </span>
        </div>
      </Card>

      <Card
        title="Vorschreibungsliste"
        actions={
          <span className="actions">
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="">Alle Monate</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              <option value="">Alle Jahre</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Alle Status</option>
              <option value="offen">Offen</option>
              <option value="bezahlt">Bezahlt</option>
            </select>
          </span>
        }
      >
        {!invoices ? (
          <Empty>Wird geladen …</Empty>
        ) : invoices.length === 0 ? (
          <Empty>Keine Vorschreibungen für die gewählten Filter.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Zeitraum</th>
                  <th>Einheit</th>
                  <th>Mieter</th>
                  <th className="num">Nettomiete</th>
                  <th className="num">BK-Akonto</th>
                  <th className="num">Gesamt</th>
                  <th>Fällig am</th>
                  <th>Bezahlt am</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{period(inv.year, inv.month)}</td>
                    <td>
                      {inv.property_name} · {inv.top_number}
                    </td>
                    <td>{inv.tenant_name}</td>
                    <td className="num">{eur(inv.net_rent)}</td>
                    <td className="num">{eur(inv.bk_akonto)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {eur(inv.total)}
                    </td>
                    <td>{fmtDate(inv.due_date)}</td>
                    <td>{inv.paid_at ? fmtDate(inv.paid_at) : '–'}</td>
                    <td>
                      <InvoiceStatusBadge status={inv.status} overdue={inv.overdue} />
                    </td>
                    <td>
                      {inv.status === 'offen' ? (
                        <button className="btn small" onClick={() => setStatus(inv, 'bezahlt')}>
                          Als bezahlt markieren
                        </button>
                      ) : (
                        <button className="btn small secondary" onClick={() => setStatus(inv, 'offen')}>
                          Auf offen setzen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>Summe ({invoices.length} Vorschreibungen)</td>
                  <td className="num">{eur(sum)}</td>
                  <td colSpan={3}>davon offen: {eur(openSum)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
