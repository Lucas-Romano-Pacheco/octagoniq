import { describe, expect, it } from 'vitest';
import { parseReigns, sectionText, wikiDate } from './wiki.ts';

// trecho real da tabela do peso-leve (List of UFC champions, Wikipédia)
const TABLE = `===Lightweight Championship===
{| class="wikitable"
! No.!!Name!! Event!! Date!! Reign<br>(Total)!!Defenses
|-
! 1
| {{flagicon|USA}} [[Jens Pulver]]<br>{{small|def. [[Caol Uno]]}}
| [[UFC 30]]<br>{{small|Atlantic City, NJ, US}}
| align=center| Feb 23, 2001
| align=center| 393 days
|
{{small| 1. def. [[Dennis Hallman]] at [[UFC 33]] on Sep 28, 2001<br>
2. def. [[B.J. Penn]] at [[UFC 35]] on Jan 11, 2002}}
|-
! colspan=6 align=center |''Pulver was stripped of the title on March 23, 2002.''
|-
! —
| {{flagicon|USA}} [[Justin Gaethje]] {{small|(2)}}<br>{{small| {{nowrap|def. [[Paddy Pimblett]] for interim title}}}}
| [[UFC 324]]<br>{{small|Las Vegas, NV, US}}
| align=center| Jan 24, 2026
| align=center| —
|
|-
! 14
| {{flagicon|USA}} [[Justin Gaethje]]
| [[UFC Freedom 250]]<br>{{small|Washington, D.C., US}}
| align=center| Jun 14, 2026
| align=center| {{age in days|2026|06|14|show unit=full}}<br>(incumbent)<br>
|
|}
===Featherweight Championship===
{| class="wikitable"
|}`;

describe('linha do tempo dos cinturões (Wikipédia)', () => {
  it('lê data no formato da tabela', () => expect(wikiDate('Feb 23, 2001')?.slice(0, 10)).toBe('2001-02-23'));
  it('separa a seção da divisão pelo título', () => {
    expect(sectionText(TABLE, 'Lightweight Championship')).toContain('Jens Pulver');
    expect(sectionText(TABLE, 'Lightweight Championship')).not.toContain('Featherweight');
  });
  it('pega reinados oficiais (sem interino nem notas), com país, evento, dias e defesas', () => {
    const r = parseReigns(sectionText(TABLE, 'Lightweight Championship')!);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ n: 1, name: 'Jens Pulver', country: 'USA', event: 'UFC 30', days: 393, defenses: 2, incumbent: false });
    expect(r[1]).toMatchObject({ n: 14, name: 'Justin Gaethje', incumbent: true, defenses: 0 });
  });
});
