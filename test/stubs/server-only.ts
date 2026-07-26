/**
 * Neutralisation de `server-only` sous Vitest.
 *
 * Le paquet `server-only` leve une exception des qu il est charge hors d un
 * bundle serveur Next (RSC, route handler, middleware). Les tests s executent
 * en Node pur, ou cette condition n est pas posee : sans alias, tout module
 * marque `server-only` — et il y en a beaucoup, transitivement via db/client —
 * ferait echouer l import.
 *
 * Ce stub vide reproduit le comportement du serveur reel (import inerte). La
 * protection reelle contre l inclusion cote navigateur reste assuree au build
 * par Next et par scripts/check-client-bundle.js.
 */
export {};
