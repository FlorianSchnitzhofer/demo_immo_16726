import { useEffect, useState } from 'react';
import { api, User } from '../api';
import { Badge, Card, Toast } from '../components';

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<User>('/api/me').then(setUser).catch(() => {});
  }, []);

  const reset = async () => {
    if (
      !window.confirm(
        'Alle Daten werden gelöscht und die Beispieldaten neu angelegt. Fortfahren?'
      )
    )
      return;
    setBusy(true);
    try {
      await api('/api/admin/reset-sample-data', { method: 'POST' });
      setToast('Beispieldaten wurden zurückgesetzt.');
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="page-title">Administration</h1>
      <p className="page-sub">Angemeldeter Benutzer und Verwaltung der Beispieldaten</p>

      <Card title="Benutzer">
        {user && (
          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <td style={{ width: 180, fontWeight: 600 }}>Name</td>
                  <td>{user.name}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>E-Mail</td>
                  <td>{user.email}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Rolle</td>
                  <td>
                    <Badge variant="solid">{user.role}</Badge>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Anmeldung</td>
                  <td className="small">
                    Auto-Login über die Umgebungsvariable <code>AUTO_LOGIN_USER</code>. Die Auth-Schicht ist
                    gekapselt, sodass später Entra ID (OIDC) ergänzt werden kann.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Beispieldaten">
        <p className="small" style={{ marginTop: 0 }}>
          Setzt den gesamten Datenbestand auf die Beispieldaten zurück: 1 Mietzinshaus in Wien mit 8 Einheiten,
          7 Mietverhältnisse (1 Einheit Leerstand), 6 Monate Vorschreibungshistorie, 2 offene Schadenstickets,
          3 Dienstleister und Betriebskosten für das abgeschlossene Vorjahr.
        </p>
        <button className="btn danger" onClick={reset} disabled={busy}>
          {busy ? 'Wird zurückgesetzt …' : 'Beispieldaten zurücksetzen'}
        </button>
      </Card>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
