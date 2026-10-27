/* Formatação pt-BR. Horários sempre no fuso de Brasília. */

const TZ = 'America/Sao_Paulo';

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...o });
const dDayMonth = fmt({ day: '2-digit', month: 'short' });
const dFull = fmt({ day: '2-digit', month: 'short', year: 'numeric' });
const dWeekday = fmt({ weekday: 'short' });
const dTime = fmt({ hour: '2-digit', minute: '2-digit' });
const dLong = fmt({ weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

const clean = (s: string) => s.replace(/\./g, '').replace(/ de /g, ' ');

/* Datas inválidas viram "—" em vez de derrubar a página. */
const safe = (f: Intl.DateTimeFormat, post: (s: string) => string = s => s) => (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? post(f.format(d)) : '—';
};

export const dayMonth = safe(dDayMonth, clean);
export const fullDate = safe(dFull, clean);
export const weekday = safe(dWeekday, clean);
export const time = safe(dTime);
export const longDate = safe(dLong);

/** "em 6d 14h", "em 3h 20min", "agora" */
export function countdown(iso: string, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'agora';
  const m = Math.floor(ms / 60_000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d >= 1) return `em ${d}d ${h % 24}h`;
  if (h >= 1) return `em ${h}h ${m % 60}min`;
  return `em ${m}min`;
}

export const nf = (v: number | undefined, d = 1) =>
  v === undefined || Number.isNaN(v) ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

export const pct = (v: number | undefined, d = 0) => (v === undefined ? '—' : `${nf(v, d)}%`);

export const ratio = (l?: number, a?: number) => (a ? Math.round((l! / a) * 100) : undefined);

export const recordStr = (r?: { w: number; l: number; d: number; nc?: number }) =>
  r ? `${r.w}-${r.l}-${r.d}${r.nc ? ` (${r.nc} NC)` : ''}` : '—';

export const mmss = (sec?: number) => (sec === undefined ? '—' : `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`);

/** Sobrenome para rótulos compactos ("Du Plessis", "Van"). */
export function lastName(n: string) {
  const p = n.split(' ');
  return p.length > 2 && /^(du|da|de|dos|van|del|della|st\.?)$/i.test(p[p.length - 2]) ? p.slice(-2).join(' ') : p[p.length - 1];
}

/** "UFC Fight Night: Allen vs. Duncan" → { series: "UFC Fight Night", title: "Allen vs. Duncan" } */
export function splitEventName(name: string) {
  const i = name.indexOf(':');
  if (i < 0) return { series: name, title: '' };
  return { series: name.slice(0, i).trim(), title: name.slice(i + 1).trim().replace(/ vs\.? /gi, ' × ') };
}

export const shortEvent = (name: string) =>
  name.replace('UFC Fight Night', 'UFC FN').replace("Dana White's Contender Series", 'DWCS');

/** "Pena" → "peso-pena"; "Meio-médio" → "peso meio-médio"; "Mosca (F)" → "peso-mosca feminino" */
export function weightPhrase(wc: string) {
  const women = wc.includes('(F)');
  const base = wc.replace(' (F)', '').toLowerCase();
  return `${base.includes('-') || base.includes(' ') ? 'peso ' : 'peso-'}${base}${women ? ' feminino' : ''}`;
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "sábado, 24 de outubro" (sem o ano: o texto corrido da home não precisa dele). */
export const dayLong = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });
/** "sábado" */
export const weekdayLong = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });

/** Distância em dias, em frase: "hoje", "amanhã", "daqui a 6 dias". */
export function inDays(iso: string, now = Date.now()) {
  const day = (ms: number) => Math.floor((ms - 3 * 3600_000) / 86_400_000); // dias no horário de Brasília
  const d = day(Date.parse(iso)) - day(now);
  return d <= 0 ? 'hoje' : d === 1 ? 'amanhã' : `daqui a ${d} dias`;
}

export const SEGMENT_LABEL = { main: 'Card principal', prelims: 'Preliminares', early: 'Preliminares iniciais' } as const;
