import Link from "next/link";
import { FileText, Phone } from "lucide-react";
import { companyIdentity } from "@/config/company";

/**
 * Appel à l'action de contact.
 *
 * Le site affichait un bouton « Appeler le 02 345 67 89 » sur une dizaine de
 * pages. Ce numéro était fictif — hérité d'un modèle — et un visiteur qui le
 * composait tombait sur rien. Un bouton d'appel inopérant coûte plus qu'il ne
 * rapporte : il donne l'impression d'une entreprise injoignable.
 *
 * Ce composant résout la question une fois : tant qu'aucun téléphone vérifié
 * n'est renseigné dans `config/company.ts`, il propose le formulaire de devis,
 * qui fonctionne réellement et alimente la base. Le jour où un numéro est
 * confirmé, il devient un lien d'appel partout, sans toucher aux pages.
 */
export default function ContactActionButton({
  className,
  fallbackLabel = "Demander un devis",
}: Readonly<{ className?: string; fallbackLabel?: string }>) {
  const { publicPhone, publicPhoneLabel } = companyIdentity;

  if (publicPhone && publicPhoneLabel) {
    return (
      <a href={`tel:${publicPhone}`} className={className}>
        <Phone className="h-5 w-5 text-brand-terracotta" />
        <span>Appeler le {publicPhoneLabel}</span>
      </a>
    );
  }

  return (
    <Link href="/devis" className={className}>
      <FileText className="h-5 w-5 text-brand-terracotta" />
      <span>{fallbackLabel}</span>
    </Link>
  );
}
