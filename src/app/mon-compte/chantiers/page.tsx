import { desc, eq } from "drizzle-orm";
import { HardHat } from "lucide-react";
import { db } from "@/db/client";
import { projects } from "@/db/schema/projects";
import { quotes } from "@/db/schema/quotes";
import { requirePageAuth } from "@/lib/security/guards";

export default async function ClientProjectsPage() {
  const user = await requirePageAuth("/mon-compte/chantiers");
  const rows = await db
    .select({
      id: projects.id,
      address: projects.address,
      roofType: projects.roofType,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      createdAt: projects.createdAt,
      quoteNumber: quotes.number,
    })
    .from(projects)
    .leftJoin(quotes, eq(projects.quoteId, quotes.id))
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Mes chantiers</h1>
        <p className="text-sm text-slate-400">Chantiers réellement rattachés à votre compte.</p>
      </div>
      <div className="space-y-4">
        {rows.map((project) => (
          <article
            key={project.id}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-white">{project.quoteNumber ?? "Chantier"}</p>
              <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs">
                {project.status}
              </span>
            </div>
            <p className="text-sm text-slate-300">{project.address}</p>
            <p className="text-xs text-slate-500">
              {project.roofType} · début{" "}
              {project.startDate?.toLocaleDateString("fr-BE") ?? "à planifier"}
              {project.endDate ? ` · fin ${project.endDate.toLocaleDateString("fr-BE")}` : ""}
            </p>
          </article>
        ))}
        {rows.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            <HardHat className="mx-auto mb-3 h-7 w-7" />
            Aucun chantier n'est rattaché à votre compte.
          </div>
        )}
      </div>
    </div>
  );
}
