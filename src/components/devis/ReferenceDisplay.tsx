"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ReferenceContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const isDuplicate = searchParams.get("duplicate") === "1";
  
  if (!reference || !/^DEV-\d{4}-\d{6}$/.test(reference)) {
    return null;
  }

  return (
    <p className="text-sm text-emerald-300">
      Référence de votre dossier : <strong>{reference}</strong>
      {isDuplicate ? " (déjà enregistré)" : ""}
    </p>
  );
}

export function ReferenceDisplay() {
  return (
    <Suspense fallback={null}>
      <ReferenceContent />
    </Suspense>
  );
}
