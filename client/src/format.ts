const eurFmt = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' });
const numFmt = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 1 });

export const eur = (n: number | null | undefined) => eurFmt.format(n ?? 0);
export const num = (n: number | null | undefined) => numFmt.format(n ?? 0);

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const MONTHS = [
  'Jänner',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

export const period = (year: number, month: number) =>
  `${String(month).padStart(2, '0')}/${year}`;

export const UNIT_TYPES: Record<string, string> = {
  wohnung: 'Wohnung',
  geschaeft: 'Geschäftsfläche',
  stellplatz: 'Stellplatz',
};

export const TICKET_CATEGORIES: Record<string, string> = {
  reinigung: 'Reinigung',
  wartung: 'Wartung',
  reparatur: 'Reparatur',
  winterdienst: 'Winterdienst',
};

export const ORDER_STATUS: Record<string, string> = {
  angefragt: 'Angefragt',
  beauftragt: 'Beauftragt',
  in_arbeit: 'In Arbeit',
  abgeschlossen: 'Abgeschlossen',
};

export const PRIORITIES: Record<string, string> = {
  niedrig: 'Niedrig',
  mittel: 'Mittel',
  hoch: 'Hoch',
};
