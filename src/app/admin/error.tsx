"use client";

import SegmentError from "@/components/ui/SegmentError";

export default function AdminError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <SegmentError
      error={error}
      reset={reset}
      title="Le back-office n'a pas pu charger ces données"
      description="La lecture PostgreSQL a échoué. Aucune modification n'a été appliquée. Si le problème persiste, consultez les journaux du serveur."
    />
  );
}
