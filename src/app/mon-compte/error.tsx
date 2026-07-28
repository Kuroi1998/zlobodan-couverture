"use client";

import SegmentError from "@/components/ui/SegmentError";

export default function ClientPortalError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <SegmentError
      error={error}
      reset={reset}
      title="Impossible d'afficher cette page"
      description="Vos données n'ont pas pu être chargées pour le moment. Rien n'a été modifié : réessayez dans quelques instants."
    />
  );
}
