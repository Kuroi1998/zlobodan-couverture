import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getPostLoginDestination } from "@/lib/auth/destinations";
import { getCurrentUser } from "@/lib/security/session-guard";
import { safeReturnPath } from "@/lib/security/urls";

export const dynamic = "force-dynamic";

interface ConnexionPageProps {
  searchParams?: {
    next?: string | string[];
  };
}

export default async function ConnexionPage({
  searchParams,
}: Readonly<ConnexionPageProps>) {
  const rawNext = Array.isArray(searchParams?.next)
    ? searchParams?.next[0]
    : searchParams?.next;
  const requestedNextPath = safeReturnPath(rawNext, "") || null;
  const user = await getCurrentUser();

  if (user) {
    redirect(getPostLoginDestination(user.role, requestedNextPath));
  }

  return <LoginForm requestedNextPath={requestedNextPath} />;
}
