import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { FighterProfile } from '@shared/types';
import { drawFighterCard, shareFighterCard, type CardNumbers } from '@/lib/fighter-card';
import { CircleNotch, ShareNetwork } from './icons';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

/** Os três números da figurinha, tirados do histórico: vitórias, taxa de finalização e disputas de título. */
function cardNumbers(p: FighterProfile): CardNumbers[] {
  const done = p.history.filter(h => h.outcome !== 'pending');
  const wins = done.filter(h => h.outcome === 'W');
  const fin = wins.filter(h => h.method === 'KO/TKO' || h.method === 'Finalização').length;
  const titles = done.filter(h => h.title).length;
  return [
    { label: 'Vitórias', value: String(wins.length) },
    { label: 'Por finalização', value: wins.length ? `${Math.round((fin / wins.length) * 100)}%` : '—' },
    { label: 'Disputas de título', value: String(titles) },
  ];
}

/** Botão "Figurinha": monta o pôster do lutador, mostra a prévia e compartilha (celular) ou baixa (computador). */
export function FighterCardButton({ p }: { p: FighterProfile }) {
  const [open, setOpen] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const make = async () => {
    setOpen(true);
    if (blob) return;
    setBusy(true);
    try {
      const b = await drawFighterCard(p, cardNumbers(p));
      setBlob(b); setUrl(URL.createObjectURL(b));
    } finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" onClick={make} className="btn"><ShareNetwork className="h-4 w-4" /> Figurinha</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[420px] p-4 sm:max-w-[420px]">
          <DialogTitle className="font-display text-[20px] font-bold text-fg">Figurinha de {p.bio.name}</DialogTitle>
          <DialogDescription className="text-[14px] text-fg-3">Um pôster para compartilhar, com o cartel, o estilo e os números de carreira.</DialogDescription>
          <div className="relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-lg bg-surface-2">
            {busy && <span className="flex items-center gap-2 text-[14px] text-fg-3"><CircleNotch className="h-4 w-4 animate-spin" /> Montando a figurinha…</span>}
            {url && (
              <motion.img src={url} alt={`Figurinha de ${p.bio.name}`} className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0, scale: 0.96, rotate: -1.5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} />
            )}
          </div>
          <button type="button" disabled={!blob} onClick={() => blob && shareFighterCard(blob, p)} className="btn-primary w-full justify-center disabled:opacity-50">
            <ShareNetwork className="h-4 w-4" /> Compartilhar ou baixar
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
