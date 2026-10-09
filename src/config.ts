// Chargé avant toute ouverture de base ou de cache, quel que soit le point d'entrée.
import { join, resolve } from "node:path";
export const RACINE = resolve(import.meta.dirname, "..");
if (process.env.LUMO_ENV_IGNORE !== "1") {
  try {
    process.loadEnvFile(join(RACINE, ".env"));
  } catch (erreur) {
    if ((erreur as NodeJS.ErrnoException).code !== "ENOENT") throw erreur;
  }
}
export const DOSSIER_DONNEES = resolve(process.env.LUMO_DATA ?? join(RACINE, "data"));
export const FUSEAU = process.env.LUMO_FUSEAU ?? "Europe/Brussels";
new Intl.DateTimeFormat("fr", { timeZone: FUSEAU }).format();
