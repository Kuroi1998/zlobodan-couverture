import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { companyIdentity, insuranceCoverage } from "@/config/company";
import { siteConfig } from "@/config/site";

/**
 * Garde-fou de contenu.
 *
 * L'audit éditorial du 2026-07-27 a retiré du site un numéro d'entreprise, une
 * police d'assurance, une note Google, six témoignages et six chantiers, tous
 * inventés — hérités d'un modèle conçu pour une entreprise française de la
 * région nantaise.
 *
 * Ces tests existent pour que ce contenu ne revienne pas. Ils lisent les
 * fichiers réellement publiés plutôt que d'inspecter des valeurs importées :
 * une affirmation réintroduite en dur dans un composant échapperait sinon au
 * contrôle.
 *
 * Ils ne prétendent pas détecter toute affirmation invérifiable — c'est un
 * travail de relecture humaine. Ils verrouillent les motifs précis qui ont été
 * trouvés, plus quelques familles évidentes.
 */

const CONTENT_ROOTS = ["src/app", "src/components", "src/data", "src/config"];

/** Fichiers publiés au visiteur, hors tests et hors code d'infrastructure. */
function collectContentFiles(): string[] {
  const files: string[] = [];

  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__" || entry.name === "node_modules") continue;
        walk(full);
        continue;
      }
      if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };

  for (const root of CONTENT_ROOTS) {
    if (fs.existsSync(root)) walk(root);
  }
  return files;
}

const contentFiles = collectContentFiles();

/**
 * Lit un fichier en écartant les commentaires.
 *
 * Indispensable : les corrections de l'audit sont justifiées par des
 * commentaires qui *citent* le contenu retiré (« la note 4.9/5 a été
 * supprimée »). Sans ce filtrage, la trace de la correction déclencherait
 * l'alerte qu'elle documente.
 */
function readPublishedText(file: string): string {
  return fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

interface ForbiddenPattern {
  readonly label: string;
  readonly pattern: RegExp;
}

const FORBIDDEN: readonly ForbiddenPattern[] = [
  // Contenu provisoire.
  { label: "texte de remplissage", pattern: /lorem ipsum/i },
  { label: "marqueur TODO/FIXME visible", pattern: /\b(TODO|FIXME)\b/ },
  { label: "mention « à compléter »", pattern: /à compléter/i },
  // L'attribut JSX `placeholder="…"` et l'utilitaire Tailwind `placeholder:`
  // sont légitimes ; seul le mot employé comme contenu est visé.
  { label: "placeholder explicite", pattern: /\bplaceholder\b(?!\s*[=:])/i },

  // Coordonnées et identités de démonstration.
  { label: "domaine d'exemple", pattern: /example\.(com|org|net)/i },
  { label: "nom fictif conventionnel", pattern: /john doe|jean dupont/i },
  { label: "numéro de téléphone de démonstration", pattern: /02 345 67 89|0470 12 34 56/ },
  { label: "numéro BCE hérité du modèle", pattern: /0849\.201\.394/ },
  { label: "numéro de police inventé", pattern: /POL-DEC-BE-849201/ },

  // Géographie du modèle français d'origine.
  { label: "commune nantaise résiduelle", pattern: /\b(Nantes|Orvault|Vertou|Carquefou)\b/ },
  { label: "département français résiduel", pattern: /Loire-Atlantique/i },

  // Notes et avis.
  { label: "note codée en dur", pattern: /\b4[.,]9\s*\/\s*5|\b4[.,]9\b\s*sur\s*5/i },
  { label: "nombre d'avis codé en dur", pattern: /\d+\s*\+?\s*avis\b/i },
  { label: "balisage d'avis agrégé", pattern: /aggregateRating/ },

  // Dispositifs et assureurs cités sans droit ni preuve.
  { label: "certification française (RGE/Qualibat)", pattern: /\bRGE\b|Qualibat/ },
  { label: "assureur nommé sans preuve", pattern: /AXA|Ethias|SMA BTP/ },

  // Engagements de délai non organisés.
  { label: "disponibilité permanente affirmée", pattern: /24\s*h\s*\/\s*24|7\s*j\s*\/\s*7|\b24\/7\b/i },
  { label: "délai de devis garanti", pattern: /sous 48\s*h|sous 24\s*h|devis .{0,12}48\s*h/i },
];

describe("Contenu publié", () => {
  it("analyse effectivement des fichiers", () => {
    // Filet : une erreur de chemin rendrait tous les tests suivants verts sans
    // rien vérifier.
    expect(contentFiles.length).toBeGreaterThan(30);
  });

  for (const { label, pattern } of FORBIDDEN) {
    it(`ne contient pas de ${label}`, () => {
      const offenders = contentFiles.filter((file) =>
        pattern.test(readPublishedText(file))
      );
      expect(offenders).toEqual([]);
    });
  }
});

describe("Références de fichiers", () => {
  it("ne pointe vers aucune image absente du dépôt", () => {
    // Une image référencée mais absente produit un 404 silencieux : la page
    // s'affiche, le visuel manque.
    const missing: string[] = [];

    // Boucle `exec` plutôt que `matchAll` : ce dernier renvoie un itérateur,
    // que la cible ES5 du projet ne sait pas parcourir sans `downlevelIteration`.
    for (const file of contentFiles) {
      const text = readPublishedText(file);
      const pattern = /["'`](\/images\/[^"'`$]+)["'`]/g;
      let match = pattern.exec(text);

      while (match !== null) {
        const reference = match[1];
        if (reference && !fs.existsSync(path.join("public", reference))) {
          missing.push(`${file} → ${reference}`);
        }
        match = pattern.exec(text);
      }
    }

    expect(missing).toEqual([]);
  });
});

describe("Identité de l'entreprise", () => {
  it("n'expose que des données déclarées vérifiées", () => {
    // Ces champs valent `null` tant qu'aucune preuve n'existe. Le test échoue
    // dès qu'une valeur est renseignée, ce qui force à passer par le registre
    // de vérification plutôt qu'à recopier une valeur trouvée quelque part.
    //
    // Lorsque l'entreprise fournira ses données réelles, ce test devra être
    // mis à jour en même temps que `config/company.ts` — c'est délibéré : le
    // renseignement d'un numéro d'entreprise mérite une modification explicite.
    expect(companyIdentity.companyNumber).toBeNull();
    expect(companyIdentity.vatNumber).toBeNull();
    expect(companyIdentity.registeredAddress).toBeNull();
    expect(insuranceCoverage.insurerName).toBeNull();
    expect(insuranceCoverage.policyNumber).toBeNull();
  });

  it("garde un nom commercial et une URL de site", () => {
    expect(companyIdentity.tradeName.length).toBeGreaterThan(0);
    expect(companyIdentity.websiteUrl).toMatch(/^https:\/\//);
  });

  it("ne réintroduit pas la forme juridique dans le nom commercial", () => {
    // « Zlobodan Couverture-Zinguerie SRL » affirmait une forme juridique non
    // vérifiée à chaque occurrence du nom, y compris dans les PDF.
    expect(companyIdentity.tradeName).not.toMatch(/\b(SRL|SA|SPRL|SAS|SARL)\b/);
  });
});

describe("Cohérence de la zone d'intervention", () => {
  it("ne déclare que des codes postaux belges à quatre chiffres", () => {
    for (const code of siteConfig.coveredPostalCodes) {
      expect(code).toMatch(/^[0-9]{4}$/);
    }
  });

  it("couvre chaque commune disposant d'une page dédiée", async () => {
    // Une page locale pour une commune absente de la zone annoncée est
    // exactement la page trompeuse que l'audit a supprimée pour Namur et
    // Liège.
    const { villesData } = await import("@/data/villes");
    for (const ville of Object.values(villesData)) {
      expect(siteConfig.coveredPostalCodes).toContain(ville.postalCode);
    }
  });
});
