import { ReactNode, useEffect } from 'react';
import { ORDER_STATUS } from './format';

export function Card(props: { title?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="card">
      {(props.title || props.actions) && (
        <div className="card-title">
          <span>{props.title}</span>
          {props.actions && <span className="actions">{props.actions}</span>}
        </div>
      )}
      {props.children}
    </div>
  );
}

export function Badge(props: {
  variant?: 'solid' | 'outline' | 'soft' | 'alert' | 'ok';
  children: ReactNode;
}) {
  const v = props.variant ?? 'outline';
  const cls = v === 'ok' ? 'badge soft ok' : v === 'alert' ? 'badge alert' : `badge ${v}`;
  return <span className={cls}>{props.children}</span>;
}

export function InvoiceStatusBadge(props: { status: string; overdue: boolean }) {
  if (props.status === 'bezahlt') return <Badge variant="ok">Bezahlt</Badge>;
  if (props.overdue) return <Badge variant="alert">Überfällig</Badge>;
  return <Badge variant="outline">Offen</Badge>;
}

export function TicketStatusBadge(props: { status: string }) {
  if (props.status === 'abgeschlossen') return <Badge variant="ok">Abgeschlossen</Badge>;
  if (props.status === 'beauftragt') return <Badge variant="solid">Beauftragt</Badge>;
  return <Badge variant="outline">Offen</Badge>;
}

export function PriorityBadge(props: { priority: string }) {
  if (props.priority === 'hoch') return <Badge variant="alert">Hoch</Badge>;
  if (props.priority === 'mittel') return <Badge variant="soft">Mittel</Badge>;
  return <Badge variant="outline">Niedrig</Badge>;
}

const CHAIN: (keyof typeof ORDER_STATUS)[] = ['angefragt', 'beauftragt', 'in_arbeit', 'abgeschlossen'];

export function StatusChain(props: { status: string }) {
  const currentIdx = CHAIN.indexOf(props.status as (typeof CHAIN)[number]);
  return (
    <div className="status-chain">
      {CHAIN.map((s, i) => (
        <div key={s} className={`status-step${i <= currentIdx ? ' done' : ''}`}>
          {i > 0 && <div className={`status-connector${i <= currentIdx ? ' done' : ''}`} />}
          <div className="status-dot">{i <= currentIdx ? '✓' : ''}</div>
          <div className="status-label">{ORDER_STATUS[s]}</div>
        </div>
      ))}
    </div>
  );
}

export function Toast(props: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(props.onDone, 3500);
    return () => clearTimeout(t);
  }, [props]);
  return <div className="toast">{props.message}</div>;
}

export function Empty(props: { children: ReactNode }) {
  return <div className="empty">{props.children}</div>;
}
