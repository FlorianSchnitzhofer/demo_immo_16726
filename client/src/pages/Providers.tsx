import { useEffect, useState } from 'react';
import { api, Provider } from '../api';
import { Badge, Card, Empty } from '../components';
import { TICKET_CATEGORIES } from '../format';

export default function Providers() {
  const [providers, setProviders] = useState<Provider[] | null>(null);

  useEffect(() => {
    api<Provider[]>('/api/providers').then(setProviders).catch(() => setProviders([]));
  }, []);

  return (
    <>
      <h1 className="page-title">Dienstleister</h1>
      <p className="page-sub">
        Hinterlegte Partner für Reinigung, Wartung, Reparatur und Winterdienst. Die Auftragsabwicklung läuft als
        internes REST/JSON-Modell — externe Dienstleister-APIs können später andocken.
      </p>

      <Card>
        {!providers ? (
          <Empty>Wird geladen …</Empty>
        ) : providers.length === 0 ? (
          <Empty>Keine Dienstleister hinterlegt.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Leistungen</th>
                  <th>E-Mail</th>
                  <th>Telefon</th>
                  <th className="num">Aufträge gesamt</th>
                  <th className="num">Laufende Aufträge</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>
                      <span className="actions">
                        {p.categories.split(',').map((c) => (
                          <Badge key={c.trim()} variant="soft">
                            {TICKET_CATEGORIES[c.trim()] ?? c.trim()}
                          </Badge>
                        ))}
                      </span>
                    </td>
                    <td>{p.contact_email}</td>
                    <td>{p.phone}</td>
                    <td className="num">{p.order_count}</td>
                    <td className="num">{p.active_orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
