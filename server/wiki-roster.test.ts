import { describe, expect, it } from 'vitest';
import { parseRoster } from './wiki.ts';

const WT = `==Debuted fighters==
===Lightweights (155 lb, 70 kg)===
{| class="wikitable sortable"
|-
|{{#invoke:flag|icon|BRA}}
|{{sortname|Renato|Moicano}}
|{{age nts|1989|5|21}}
|{{height|ft=5|in=11}}
|''Money''
|{{color|green|'''Win'''}} – [[UFC 311]]
|<ref>x</ref>
|{{ntsh|9.5}}9–5
|{{ntsh|21.7}}21–7–1
|-
|{{#invoke:flag|icon|USA}}
|{{sortname|Dan|Hooker}}
|-
|}`;

describe('plantel por país (Wikipédia)', () => {
  it('pega só o país pedido, com divisão em português, apelido e cartel', () => {
    const r = parseRoster(WT, 'BRA');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ name: 'Renato Moicano', slug: 'renato-moicano', division: 'Leve', nickname: 'Money', record: '21-7-1' });
  });
});
