import SectionSkeleton from "@/components/ui/SectionSkeleton";

/**
 * Squelette de l'espace client.
 *
 * Placé à la racine du segment : Next l'applique à toutes les sous-routes qui
 * n'ont pas le leur. La barre latérale du layout reste affichée pendant ce
 * temps, donc la navigation ne disparaît jamais sous l'utilisateur.
 */
export default function ClientPortalLoading() {
  return <SectionSkeleton rows={3} label="Chargement de votre espace client…" />;
}
