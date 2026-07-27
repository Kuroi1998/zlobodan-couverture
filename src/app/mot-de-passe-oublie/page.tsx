import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Mot de passe oublié | Zlobodan" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <section className="w-full max-w-md space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
        <p className="text-sm text-slate-400">
          La réponse est identique pour toutes les adresses afin de protéger les comptes.
        </p>
        <ForgotPasswordForm />
        <Link href="/connexion" className="block text-center text-sm text-brand-terracotta underline">Retour à la connexion</Link>
      </section>
    </main>
  );
}
