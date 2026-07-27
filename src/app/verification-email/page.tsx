import TokenActionForm from "@/components/auth/TokenActionForm";
import ResendVerificationForm from "@/components/auth/ResendVerificationForm";

export const metadata = { title: "Vérifier l’adresse e-mail | Zlobodan" };

export default async function VerificationEmailPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ token?: string | string[] }> }>) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] ?? "" : params.token ?? "";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <section className="w-full max-w-md space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">Vérifier votre adresse</h1>
        <p className="text-sm text-slate-400">Confirmez explicitement l’adresse avant d’ouvrir une session.</p>
        <TokenActionForm token={token} action="verify-email" />
        <ResendVerificationForm />
      </section>
    </main>
  );
}
