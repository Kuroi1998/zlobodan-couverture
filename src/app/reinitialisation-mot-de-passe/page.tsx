import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Réinitialiser le mot de passe | Zlobodan" };

export default async function ResetPasswordPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ token?: string | string[] }> }>) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] ?? "" : params.token ?? "";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <section className="w-full max-w-md space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
        <p className="text-sm text-slate-400">Le lien expire après 15 minutes et ne fonctionne qu’une fois.</p>
        <ResetPasswordForm token={token} />
      </section>
    </main>
  );
}
