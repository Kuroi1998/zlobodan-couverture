/**
 * Squelette de chargement.
 *
 * Des blocs aux dimensions proches du contenu réel, pour que l'arrivée des
 * données ne fasse pas sauter la mise en page. L'animation reste discrète et
 * `aria-hidden` : un lecteur d'écran doit entendre l'annonce de la région
 * occupée, pas décrire des rectangles gris.
 */
export default function SectionSkeleton({
  rows = 3,
  label = "Chargement en cours…",
}: Readonly<{ rows?: number; label?: string }>) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className="h-9 w-1/3 animate-pulse rounded-xl bg-slate-800"
      />
      <div className="space-y-4" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="h-4 w-1/4 animate-pulse rounded bg-slate-800" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
