import { CSSProperties, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, DashboardData } from '../api';
import { Card, Empty } from '../components';
import { eur, num, MONTHS, UNIT_TYPES } from '../format';

type MonthPoint = { year: number; month: number; prescribed: number; paid: number };

function niceCeil(v: number) {
  if (v <= 0) return 1000;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const frac = v / pow;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return nice * pow;
}

// Balken mit abgerundetem Datenende (oben), an der Basislinie verankert
function topRoundedBar(x: number, y: number, w: number, h: number, r: number) {
  if (h <= r) return `M ${x} ${y + h} L ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} Z`;
  return `M ${x} ${y + h} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h} Z`;
}

function RentChart({ points }: { points: MonthPoint[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null);

  const W = 640;
  const H = 250;
  const m = { top: 14, right: 10, bottom: 28, left: 58 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const maxVal = niceCeil(Math.max(...points.map((p) => Math.max(p.prescribed, p.paid)), 1));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxVal);
  const y = (v: number) => m.top + plotH - (v / maxVal) * plotH;

  const groupW = plotW / points.length;
  const barW = Math.min(24, (groupW - 16) / 2);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img"
        aria-label="Balkendiagramm: vorgeschriebene und bezahlte Beträge der letzten sechs Monate">
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#f5f5f4" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#8a8886" strokeWidth="1.4" />
          </pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#c8c6c4' : '#edebe9'} />
            <text x={m.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#8a8886">
              {num(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const cx = m.left + groupW * i + groupW / 2;
          const x1 = cx - barW - 1; // 2px Abstand zwischen den beiden Balken
          const x2 = cx + 1;
          const label = MONTHS[p.month - 1].slice(0, 3);
          return (
            <g key={`${p.year}-${p.month}`}>
              {p.prescribed > 0 && (
                <path
                  d={topRoundedBar(x1, y(p.prescribed), barW, m.top + plotH - y(p.prescribed), 3)}
                  fill="url(#hatch)"
                  stroke="#8a8886"
                  strokeWidth="1"
                />
              )}
              {p.paid > 0 && (
                <path
                  d={topRoundedBar(x2, y(p.paid), barW, m.top + plotH - y(p.paid), 3)}
                  fill="#171717"
                />
              )}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="11.5" fill="#605e5c">
                {label} {String(p.year).slice(2)}
              </text>
              <rect
                x={m.left + groupW * i}
                y={m.top}
                width={groupW}
                height={plotH}
                fill="transparent"
                onMouseMove={(e) => {
                  const r = wrapRef.current?.getBoundingClientRect();
                  if (r) setTip({ i, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                onMouseLeave={() => setTip(null)}
              />
            </g>
          );
        })}
      </svg>
      {tip && (
        <div
          className="chart-tooltip"
          style={{
            left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? 300) - 190),
            top: tip.y - 10,
          }}
        >
          <div className="tt-title">
            {MONTHS[points[tip.i].month - 1]} {points[tip.i].year}
          </div>
          <div>Vorgeschrieben: {eur(points[tip.i].prescribed)}</div>
          <div>Bezahlt: {eur(points[tip.i].paid)}</div>
          <div>Offen: {eur(points[tip.i].prescribed - points[tip.i].paid)}</div>
        </div>
      )}
    </div>
  );
}

const hatchBg: CSSProperties = {
  background: 'repeating-linear-gradient(45deg, #f5f5f4 0 4px, #8a8886 4px 5.4px)',
  border: '1px solid #8a8886',
};

function OccupancyBar({ rented, total }: { rented: number; total: number }) {
  if (total === 0) return null;
  const pct = (rented / total) * 100;
  return (
    <div style={{ display: 'flex', gap: 2, height: 26, borderRadius: 3, overflow: 'hidden' }}>
      {rented > 0 && (
        <div
          style={{
            width: `${pct}%`,
            background: '#171717',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 8,
          }}
        >
          {pct >= 25 ? `${rented} vermietet` : rented}
        </div>
      )}
      {total - rented > 0 && (
        <div
          style={{
            width: `${100 - pct}%`,
            ...hatchBg,
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#201f1e',
          }}
          title={`${total - rented} Leerstand`}
        >
          {100 - pct >= 18 ? `${total - rented} leer` : total - rented}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardData>('/api/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Empty>Fehler beim Laden: {error}</Empty>;
  if (!data) return <Empty>Wird geladen …</Empty>;

  // Letzte 6 Monate lückenlos auffüllen
  const now = new Date();
  const points: MonthPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yy = d.getFullYear();
    const mm = d.getMonth() + 1;
    const row = data.months.find((r) => r.year === yy && r.month === mm);
    points.push({ year: yy, month: mm, prescribed: row?.prescribed ?? 0, paid: row?.paid ?? 0 });
  }

  const rented = data.unit_count - data.vacant_count;

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Portfolio-Überblick — Stand {now.toLocaleDateString('de-AT')}</p>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Objekte</div>
          <div className="kpi-value">{data.property_count}</div>
          <div className="kpi-hint">{num(data.total_area)} m² Nutzfläche</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Einheiten</div>
          <div className="kpi-value">{data.unit_count}</div>
          <div className="kpi-hint">{data.active_tenancies} aktive Mietverhältnisse</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Leerstand</div>
          <div className="kpi-value">{data.vacant_count}</div>
          <div className="kpi-hint">
            {data.unit_count > 0 ? `${((data.vacant_count / data.unit_count) * 100).toFixed(1)} % der Einheiten` : '–'}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Monatliches Mietsoll</div>
          <div className="kpi-value">{eur(data.monthly_target)}</div>
          <div className="kpi-hint">Miete + BK-Akonto</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Offene Forderungen</div>
          <div className="kpi-value">{eur(data.open_amount)}</div>
          <div className="kpi-hint">{data.open_count} offene Vorschreibungen</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Davon überfällig</div>
          <div className="kpi-value">{eur(data.overdue_amount)}</div>
          <div className="kpi-hint">{data.overdue_count} Vorschreibungen</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Offene Tickets</div>
          <div className="kpi-value">{data.open_tickets}</div>
          <div className="kpi-hint">{data.assigned_tickets} in Beauftragung</div>
        </div>
      </div>

      <div className="grid-2">
        <Card
          title="Vorschreibungen der letzten 6 Monate"
          actions={
            <span className="legend">
              <span>
                <span className="chip" style={hatchBg} />
                Vorgeschrieben
              </span>
              <span>
                <span className="chip" style={{ background: '#171717' }} />
                Bezahlt
              </span>
            </span>
          }
        >
          <RentChart points={points} />
        </Card>

        <Card title="Auslastung">
          <OccupancyBar rented={rented} total={data.unit_count} />
          <div className="legend" style={{ marginTop: 8 }}>
            <span>
              <span className="chip" style={{ background: '#171717' }} />
              Vermietet
            </span>
            <span>
              <span className="chip" style={hatchBg} />
              Leerstand
            </span>
          </div>
          <hr className="divider" />
          <table>
            <thead>
              <tr>
                <th>Kategorie</th>
                <th className="num">Vermietet</th>
                <th className="num">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {data.occupancy.map((o) => (
                <tr key={o.type}>
                  <td>{UNIT_TYPES[o.type] ?? o.type}</td>
                  <td className="num">{o.rented}</td>
                  <td className="num">{o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12 }} className="small">
            <Link className="plain" to="/objekte">
              Zu den Objekten →
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
