"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  className: string;
  label: string;
  iconClassName: string;
}

export default function LogoutButton({
  className,
  label,
  iconClassName,
}: Readonly<LogoutButtonProps>) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const logout = async (): Promise<void> => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error("logout-failed");
      }

      router.replace("/connexion");
      router.refresh();
    } catch {
      setErrorMessage("La déconnexion a échoué. Veuillez réessayer.");
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={logout}
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className={className}
      >
        <LogOut className={iconClassName} />
        <span>{isSubmitting ? "Déconnexion..." : label}</span>
      </button>
      {errorMessage ? (
        <p role="alert" aria-live="polite" className="mt-2 text-xs text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
