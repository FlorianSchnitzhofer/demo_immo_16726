import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api, Property, PropertyDetail, Provider, Ticket, Unit } from '../api';
import { Badge, Card, Empty, PriorityBadge, StatusChain, TicketStatusBadge, Toast } from '../components';
import { eur, fmtDate, TICKET_CATEGORIES } from '../format';

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [providerChoice, setProviderChoice] = useState<Record<number, string>>({});
  const [amountDraft, setAmountDraft] = useState<Record<number, string>>({});
  const simWatch = useRef<Set<number>>(new Set());
  const [form, setForm] = useState({
    property_id: '',
    unit_id: '',
    category: 'reparatur',
    priority: 'mittel',
    title: '',
    description: '',
  });

  const load = useCallback(() => {
    api<Ticket[]>('/api/tickets').then(setTickets).catch(() => setTickets([]));
  }, []);

  useEffect(() => {
    load();
    api<Provider[]>('/api/providers').then(setProviders).catch(() => {});
    api<Property[]>('/api/properties').then((ps) => {
      setProperties(ps);
      if (ps.length) setForm((f) => ({ ...f, property_id: String(ps[0].id) }));
    });
  }, [load]);

  // Einheiten des gewählten Objekts für das Formular laden
  useEffect(() => {
    if (!form.property_id) return setUnits([]);
    api<PropertyDetail>(`/api/properties/${form.property_id}`)
      .then((p) => setUnits(p.units))
      .catch(() => setUnits([]));
  }, [form.property_id]);

  // Während einer laufenden Simulation regelmäßig aktualisieren
  useEffect(() => {
    const interval = setInterval(() => {
      if (simWatch.current.size === 0) return;
      const doneIds = (tickets ?? [])
        .filter((t) => t.order_id && simWatch.current.has(t.order_id) && t.order_status === 'abgeschlossen')
        .map((t) => t.order_id as number);
      doneIds.forEach((id) => simWatch.current.delete(id));
      if (simWatch.current.size > 0) load();
    }, 2500);
    return () => clearInterval(interval);
  }, [tickets, load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          property_id: Number(form.property_id),
          unit_id: form.unit_id ? Number(form.unit_id) : null,
          category: form.category,
          priority: form.priority,
          title: form.title,
          description: form.description,
        }),
      });
      setToast('Schadensticket wurde angelegt.');
      setShowForm(false);
      setForm((f) => ({ ...f, unit_id: '', title: '', description: '' }));
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const assign = async (ticket: Ticket) => {
    const providerId = providerChoice[ticket.id];
    if (!providerId) {
      setToast('Bitte zuerst einen Dienstleister wählen.');
      return;
    }
    try {
      await api(`/api/tickets/${ticket.id}/order`, {
        method: 'POST',
        body: JSON.stringify({ provider_id: Number(providerId) }),
      });
      setToast('Auftrag wurde angefragt.');
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const advance = async (orderId: number) => {
    try {
      await api(`/api/orders/${orderId}/advance`, { method: 'POST' });
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const simulate = async (orderId: number) => {
    try {
      await api(`/api/orders/${orderId}/simulate`, { method: 'POST' });
      simWatch.current.add(orderId);
      setToast('Simulation gestartet — der Auftrag wird alle 5 Sekunden weitergeschaltet.');
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const saveAmount = async (orderId: number) => {
    const val = amountDraft[orderId];
    if (val == null || val === '') return;
    try {
      await api(`/api/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ amount: Number(val) }) });
      setToast('Auftragskosten wurden gespeichert.');
      load();
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  return (
    <>
      <h1 className="page-title">Tickets & Aufträge</h1>
      <p className="page-sub">
        Schadenstickets erfassen, Dienstleister beauftragen und den Statusverlauf verfolgen
      </p>

      <div style={{ marginBottom: 14 }}>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Abbrechen' : '+ Neues Ticket'}
        </button>
      </div>

      {showForm && (
        <Card title="Neues Schadensticket">
          <form onSubmit={submit}>
            <div className="form-row">
              <label className="field">
                Objekt*
                <select
                  required
                  value={form.property_id}
                  onChange={(e) => setForm({ ...form, property_id: e.target.value, unit_id: '' })}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Einheit (optional)
                <select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })}>
                  <option value="">Allgemeinbereich</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.top_number}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Kategorie*
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {Object.entries(TICKET_CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Priorität
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="niedrig">Niedrig</option>
                  <option value="mittel">Mittel</option>
                  <option value="hoch">Hoch</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label className="field" style={{ flex: '2 1 260px' }}>
                Titel*
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </label>
            </div>
            <div className="form-row">
              <label className="field" style={{ flex: '1 1 100%' }}>
                Beschreibung
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
            </div>
            <button className="btn" type="submit">
              Ticket anlegen
            </button>
          </form>
        </Card>
      )}

      {!tickets ? (
        <Empty>Wird geladen …</Empty>
      ) : tickets.length === 0 ? (
        <Empty>Keine Tickets vorhanden.</Empty>
      ) : (
        <div className="ticket-grid">
          {tickets.map((t) => (
            <div className="card" key={t.id} style={{ marginBottom: 0 }}>
              <div className="card-title" style={{ marginBottom: 6 }}>
                <span>
                  #{t.id} · {t.title}
                </span>
                <TicketStatusBadge status={t.status} />
              </div>
              <div className="actions" style={{ marginBottom: 8 }}>
                <Badge variant="soft">{TICKET_CATEGORIES[t.category]}</Badge>
                <PriorityBadge priority={t.priority} />
              </div>
              <div className="small muted" style={{ marginBottom: 8 }}>
                {t.property_name}
                {t.top_number ? ` · ${t.top_number}` : ' · Allgemeinbereich'} · erstellt am {fmtDate(t.created_at)}
              </div>
              {t.description && (
                <div className="small" style={{ marginBottom: 8 }}>
                  {t.description}
                </div>
              )}
              <hr className="divider" />
              {t.status === 'offen' ? (
                <div className="actions">
                  <select
                    value={providerChoice[t.id] ?? ''}
                    onChange={(e) => setProviderChoice({ ...providerChoice, [t.id]: e.target.value })}
                  >
                    <option value="">– Dienstleister wählen –</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button className="btn small" onClick={() => assign(t)}>
                    Beauftragen
                  </button>
                </div>
              ) : (
                <>
                  <div className="small" style={{ marginBottom: 4 }}>
                    <strong>Auftrag an:</strong> {t.provider_name}
                  </div>
                  <StatusChain status={t.order_status ?? 'angefragt'} />
                  <div className="actions">
                    {t.order_status !== 'abgeschlossen' && t.order_id && (
                      <>
                        <button className="btn small" onClick={() => advance(t.order_id!)}>
                          Weiterschalten →
                        </button>
                        <button className="btn small secondary" onClick={() => simulate(t.order_id!)}>
                          ▶ Timer simulieren
                        </button>
                      </>
                    )}
                    {t.order_id && (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Kosten (EUR)"
                          style={{ width: 110, padding: '4px 6px' }}
                          value={amountDraft[t.order_id] ?? (t.order_amount != null ? String(t.order_amount) : '')}
                          onChange={(e) => setAmountDraft({ ...amountDraft, [t.order_id!]: e.target.value })}
                        />
                        <button className="btn small secondary" onClick={() => saveAmount(t.order_id!)}>
                          Kosten speichern
                        </button>
                      </>
                    )}
                  </div>
                  {t.order_amount != null && (
                    <div className="small muted" style={{ marginTop: 6 }}>
                      Auftragskosten: {eur(t.order_amount)} — fließen in den Steuerberater-Export ein.
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
