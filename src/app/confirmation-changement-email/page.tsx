import TokenActionForm from "@/components/auth/TokenActionForm";

export const metadata = { title: "Confirmer la nouvelle adresse | Zlobodan" };

export default async function ConfirmEmailChangePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ token?: string | string[] }> }>) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] ?? "" : params.token ?? "";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <section className="w-full max-w-md space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">Confirmer la nouvelle adresse</h1>
        <p className="text-sm text-slate-400">Toutes les sessions seront fermées après confirmation.</p>
        <TokenActionForm token={token} action="confirm-email-change" />
      </section>
    </main>
  );
}
