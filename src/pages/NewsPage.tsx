import { useEffect } from 'react';
import { CHANGELOG } from '../content/changelog';
import { markNewsSeen, ReleaseCard } from '../features/WhatsNew';

export function NewsPage() {
  useEffect(() => markNewsSeen(), []);
  return (
    <div>
      <header>
        <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Novedades</h1>
        <p className="text-muted mt-2">Todo lo que hemos ido añadiendo a Croac, de lo más nuevo a lo más antiguo.</p>
      </header>
      <div className="mt-6 space-y-4">
        {CHANGELOG.map((r) => <ReleaseCard key={r.version} release={r} />)}
      </div>
    </div>
  );
}
