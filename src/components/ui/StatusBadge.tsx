import type { StatusTone } from "@/domain/request-labels";

/**
 * Pastille d'état.
 *
 * La couleur est portée par une table indexée sur le type d'union : une teinte
 * ne peut pas être choisie à la main écran par écran, donc « en cours » a la
 * même apparence partout. La couleur ne porte jamais l'information seule — le
 * libellé est toujours écrit.
 */
const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "border-slate-700 bg-slate-900 text-slate-300",
  progress: "border-amber-800 bg-amber-950 text-amber-300",
  positive: "border-emerald-800 bg-emerald-950 text-emerald-300",
  negative: "border-red-900 bg-red-950 text-red-300",
};

export default function StatusBadge({
  label,
  tone,
}: Readonly<{ label: string; tone: StatusTone }>) {
  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
