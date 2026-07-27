import Link from "next/link";

interface PaginationProps {
  basePath: string;
  page: number;
  pageCount: number;
  total: number;
  /** Paramètres à conserver d'une page à l'autre (filtre, recherche). */
  params?: Readonly<Record<string, string>>;
}

/**
 * Pagination par liens.
 *
 * Des `<Link>` et non des boutons : chaque page a une URL propre, donc
 * partageable, indexable par le retour arrière du navigateur, et fonctionnelle
 * sans JavaScript. Les filtres actifs sont reconduits dans la requête — les
 * perdre au changement de page est le défaut classique de ce composant.
 */
export default function Pagination({
  basePath,
  page,
  pageCount,
  total,
  params = {},
}: Readonly<PaginationProps>) {
  if (total === 0) return null;

  function href(target: number): string {
    const query = new URLSearchParams(params);
    query.set("page", String(target));
    return `${basePath}?${query.toString()}`;
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 text-xs text-slate-400"
    >
      <span>
        Page {page} sur {pageCount} · {total} résultat{total > 1 ? "s" : ""}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={href(page - 1)}
            rel="prev"
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 font-bold text-slate-200 hover:bg-slate-700"
          >
            Précédent
          </Link>
        )}
        {page < pageCount && (
          <Link
            href={href(page + 1)}
            rel="next"
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 font-bold text-slate-200 hover:bg-slate-700"
          >
            Suivant
          </Link>
        )}
      </div>
    </nav>
  );
}
