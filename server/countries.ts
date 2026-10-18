/* Nome de país (em inglês, como vem da ESPN) → código ISO 3166 e nome em pt-BR.
   O código alimenta as bandeiras em SVG (circle-flags / flag-icons) na interface. */

// importa só o núcleo (sem o registro automático de todos os idiomas) e os dois idiomas usados,
// para que o empacotamento da função do Vercel inclua os JSONs
import countries from 'i18n-iso-countries/index.js';
import en from 'i18n-iso-countries/langs/en.json' with { type: 'json' };
import pt from 'i18n-iso-countries/langs/pt.json' with { type: 'json' };

countries.registerLocale(en);
countries.registerLocale(pt);

/* Nações do Reino Unido e nomes que a biblioteca não reconhece */
const SPECIAL: Record<string, { code: string; name: string }> = {
  england: { code: 'gb-eng', name: 'Inglaterra' },
  scotland: { code: 'gb-sct', name: 'Escócia' },
  wales: { code: 'gb-wls', name: 'País de Gales' },
  'northern ireland': { code: 'gb-nir', name: 'Irlanda do Norte' },
  moldova: { code: 'md', name: 'Moldávia' },
  'democratic republic of congo': { code: 'cd', name: 'República Democrática do Congo' },
};

/* A biblioteca usa grafias de Portugal; aqui vão as do Brasil */
const PT_BR: Record<string, string> = {
  am: 'Armênia', pl: 'Polônia', ro: 'Romênia', vn: 'Vietnã', cz: 'Tchéquia', ir: 'Irã', ke: 'Quênia', si: 'Eslovênia',
  mk: 'Macedônia do Norte', mm: 'Mianmar', ps: 'Palestina', ba: 'Bósnia e Herzegovina', bh: 'Barein', lv: 'Letônia',
  ee: 'Estônia', mc: 'Mônaco', tt: 'Trinidad e Tobago', gb: 'Reino Unido', us: 'Estados Unidos',
};

const memo = new Map<string, { code: string; name: string } | null>();

export function countryInfo(en?: string | null): { code: string; name: string } | undefined {
  if (!en || en === 'default') return undefined;
  const key = en.trim().toLowerCase();
  if (!memo.has(key)) {
    const special = SPECIAL[key];
    const a2 = special ? undefined : countries.getAlpha2Code(en, 'en')?.toLowerCase();
    memo.set(key, special ?? (a2 ? { code: a2, name: PT_BR[a2] ?? countries.getName(a2, 'pt') ?? en } : null));
  }
  return memo.get(key) ?? undefined;
}
