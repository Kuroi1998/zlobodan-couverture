import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getPostLoginDestination } from "@/lib/auth/destinations";
import { getCurrentUser } from "@/lib/security/session-guard";
import { safeReturnPath } from "@/lib/security/urls";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Connexion à l’espace client et à l’administration",
  description: "Connexion sécurisée à l’espace client et à l’administration Zlobodan.",
};

interface ConnexionPageProps {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
}

export default async function ConnexionPage({
  searchParams,
}: Readonly<ConnexionPageProps>) {
  const resolvedSearchParams = await searchParams;
  const rawNext = Array.isArray(resolvedSearchParams?.next)
    ? resolvedSearchParams?.next[0]
    : resolvedSearchParams?.next;
  const requestedNextPath = safeReturnPath(rawNext, "") || null;
  const user = await getCurrentUser();

  if (user) {
    redirect(getPostLoginDestination(user.role, requestedNextPath));
  }

  return <LoginForm requestedNextPath={requestedNextPath} />;
}
