// Ajoute le connecteur Lumo à Claude Desktop (à lancer quand Claude Desktop est complètement fermé).
// Fait une copie de sauvegarde, ne touche à rien d'autre dans le fichier.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

if (process.platform === "win32") {
  const processus = execFileSync("tasklist.exe", ["/FI", "IMAGENAME eq Claude.exe", "/FO", "CSV", "/NH"], { encoding: "utf8", windowsHide: true });
  if (/"Claude\.exe"/i.test(processus)) throw new Error("Ferme complètement Claude Desktop (y compris l'icône près de l'horloge), puis relance cet installateur. Claude pourrait sinon écraser sa configuration.");
}

const fichier = join(process.env.APPDATA ?? "", "Claude", "claude_desktop_config.json");
const connexionParent = process.argv[2] ? resolve(process.argv[2]) : undefined;
if (connexionParent && !existsSync(connexionParent)) throw new Error("Fichier de connexion parent introuvable.");
const mcp = join(import.meta.dirname, "..", "src", connexionParent ? "mcp-client.ts" : "mcp.ts");

const config = existsSync(fichier) ? JSON.parse(readFileSync(fichier, "utf8")) : {};
if (existsSync(fichier)) copyFileSync(fichier, `${fichier}.sauvegarde-avant-lumo`);
config.mcpServers ??= {};
config.mcpServers.lumo = { command: process.execPath, args: connexionParent ? [mcp, connexionParent] : [mcp] };
writeFileSync(fichier, JSON.stringify(config, null, 2));

console.log("Connecteur Lumo ajouté à Claude Desktop.");
console.log(`  Node : ${process.execPath}`);
console.log(`  Connecteur : ${mcp}`);
console.log("Tu peux relancer Claude Desktop.");
