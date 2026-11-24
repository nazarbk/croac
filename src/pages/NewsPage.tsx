import { useEffect } from 'react';
import { releasedChangelog } from '../content/changelog';
import { useToday } from '../store/appStore';
import { markNewsSeen, ReleaseCard } from '../features/WhatsNew';

export function NewsPage() {
  const today = useToday();
  useEffect(() => markNewsSeen(), [today]);
  return (
    <div>
      <header>
        <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Novedades</h1>
        <p className="text-muted mt-2">Todo lo que hemos ido añadiendo a Croac, de lo más nuevo a lo más antiguo.</p>
      </header>
      <div className="mt-6 space-y-4">
        {releasedChangelog(today).map((r) => <ReleaseCard key={r.version} release={r} />)}
      </div>
    </div>
  );
}
