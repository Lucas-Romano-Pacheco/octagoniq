import { Skeleton as S } from './kit';

/* Telas de carregamento com o contorno real de cada página (em vez de blocos genéricos):
   o visitante já vê onde vão ficar nome, foto, números e listas enquanto os dados chegam. */

const Octagon = ({ className }: { className?: string }) => (
  <div className={`skeleton aspect-square ${className ?? ''}`} style={{ clipPath: 'polygon(29.3% 0, 70.7% 0, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0 70.7%, 0 29.3%)' }} />
);

/** Faixa de placar: rótulo + número grande, separados por linhas finas. */
const Strip = ({ n = 4 }: { n?: number }) => (
  <div className={`rule grid grid-cols-2 gap-y-6 lg:divide-x lg:divide-line ${n === 6 ? 'sm:grid-cols-3 lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} className={i ? 'lg:pl-6' : ''}><S className="h-3 w-24" /><S className="mt-3 h-11 w-20" /><S className="mt-2 h-3 w-28" /></div>
    ))}
  </div>
);

/** Linha de luta: foto + nome de cada lado e o resultado no meio. */
const FightLine = () => (
  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4">
    <div className="flex items-center justify-end gap-3"><div className="space-y-2"><S className="ml-auto h-4 w-32" /><S className="ml-auto h-3 w-16" /></div><S className="h-14 w-14 rounded-full" /></div>
    <div className="w-[140px] space-y-2"><S className="mx-auto h-3 w-16" /><S className="mx-auto h-4 w-24" /></div>
    <div className="flex items-center gap-3"><S className="h-14 w-14 rounded-full" /><div className="space-y-2"><S className="h-4 w-32" /><S className="h-3 w-16" /></div></div>
  </div>
);

export function FighterSkeleton() {
  return (
    <div className="min-h-[1500px] space-y-6" aria-busy="true" aria-label="Carregando o perfil do lutador">
      <section className="grid items-center gap-8 pb-6 pt-2 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="flex gap-2"><S className="h-7 w-36 rounded-md" /><S className="h-7 w-28 rounded-md" /></div>
          <S className="mt-6 h-14 w-[80%]" /><S className="mt-3 h-14 w-[55%]" />
          <div className="mt-6 flex gap-3"><S className="h-5 w-24" /><S className="h-5 w-44" /></div>
          <S className="mt-9 h-12 w-64 rounded-full" />
          <S className="mt-6 h-4 w-72" />
        </div>
        <div className="relative mx-auto h-[440px] w-full max-w-[520px] sm:h-[520px]">
          <Octagon className="absolute bottom-0 left-1/2 h-[86%] -translate-x-1/2" />
        </div>
      </section>
      <Strip />
      <div className="flex justify-center"><S className="h-10 w-80 rounded-full" /></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="rule"><S className="h-6 w-56" /><div className="mt-5 grid gap-8 sm:grid-cols-[1.3fr_1fr]"><S className="h-32" /><div className="space-y-5"><S className="h-10" /><S className="h-10" /></div></div></div>
          <div className="rule"><S className="h-6 w-72" /><div className="mt-5 grid gap-8 md:grid-cols-2"><div className="grid grid-cols-2 gap-5">{Array.from({ length: 6 }).map((_, i) => <S key={i} className="h-16" />)}</div><div className="space-y-6">{Array.from({ length: 4 }).map((_, i) => <S key={i} className="h-8" />)}</div></div></div>
        </div>
        <aside className="space-y-6"><S className="h-24" /><div className="rule"><S className="h-6 w-40" /><Octagon className="mx-auto mt-6 w-[70%]" /></div></aside>
      </div>
      <p className="text-center text-[13px] text-fg-3">Consultando UFC.com e ESPN: o primeiro carregamento de um lutador leva alguns segundos.</p>
    </div>
  );
}

export function EventSkeleton() {
  return (
    <div className="min-h-[1600px] space-y-6" aria-busy="true" aria-label="Carregando o evento">
      <S className="h-8 w-24 rounded-full" />
      <section className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="pb-4"><S className="h-4 w-24" /><S className="mt-5 h-16 w-[85%]" /><S className="mt-3 h-16 w-[60%]" /><S className="mt-6 h-4 w-80" /></div>
        <div className="relative mx-auto h-[300px] w-full max-w-[560px] sm:h-[400px]"><Octagon className="absolute bottom-0 left-1/2 h-[92%] -translate-x-1/2" /></div>
      </section>
      <Strip n={6} />
      <div className="panel"><div className="px-6 pt-5"><S className="h-6 w-44" /></div><div className="divide-y divide-line/70 px-2 pb-2">{Array.from({ length: 5 }).map((_, i) => <FightLine key={i} />)}</div></div>
    </div>
  );
}

export function FightSkeleton() {
  const corner = (right?: boolean) => (
    <div className={`flex flex-col ${right ? 'items-end' : 'items-start'}`}>
      <S className="h-1 w-10" /><S className="mt-3 h-9 w-[80%]" /><S className="mt-2 h-4 w-32" /><S className="mt-4 h-[230px] w-[70%] sm:h-[400px]" />
    </div>
  );
  return (
    <div className="min-h-[1300px] space-y-8" aria-busy="true" aria-label="Carregando a luta">
      <div><S className="h-5 w-72" /><S className="mt-4 h-4 w-48" /></div>
      <section className="grid grid-cols-2 items-start gap-x-3 gap-y-6 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-8">
        {corner()}
        <div className="order-last col-span-2 space-y-4 sm:order-none sm:col-span-1 sm:w-[380px] sm:pt-24">
          <S className="mx-auto h-7 w-28 rounded-md" /><S className="h-20 rounded-xl" />
          {Array.from({ length: 4 }).map((_, i) => <S key={i} className="h-9" />)}
        </div>
        {corner(true)}
      </section>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="panel space-y-5 p-6">{Array.from({ length: 6 }).map((_, i) => <S key={i} className="h-8" />)}</div>
        <div className="panel space-y-4 p-6"><S className="h-6 w-40" /><S className="h-12" /><S className="h-3" /></div>
      </div>
    </div>
  );
}
