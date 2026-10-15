// Analyse une seule fois les mp3 existants des missions de démonstration, sans refaire la voix.
import "../src/config.ts";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readFile, writeFile, appendFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DOSSIER_DONNEES, RACINE } from "../src/config.ts";
if (!process.argv.includes("--aligner")) throw new Error("Indiquer --aligner pour préparer les repères.");
if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOIX) throw new Error("Voix Milo non configurée.");
if (process.env.LUMO_PARTAGE === "1") throw new Error("Préparation réservée au serveur local.");
const base=new DatabaseSync(join(DOSSIER_DONNEES,"lumo.db"),{readOnly:true});
const textes=[...new Set(base.prepare("SELECT qu.consigne FROM questions qu JOIN quetes q ON q.id=qu.quete_id JOIN enfants e ON e.id=q.enfant_id WHERE e.code='LUMO01' AND q.archivee=0 AND q.origine_id IS NULL").all().map(q=>q.consigne))].filter(t=>!/^\s*\d+\s*[×x*+−÷:\-]\s*\d+\s*=\s*\?\s*$/.test(t));
base.close();
if(textes.length>20)throw new Error("Plus de 20 consignes : limiter la préparation de démonstration.");
const dossiers=[...new Set([resolve(join(DOSSIER_DONNEES,"voix")),resolve(join(RACINE,"data","voix"))])];
let prepares=0,reutilises=0;
for(const texte of textes){
 const cle=createHash("sha256").update(`${process.env.ELEVENLABS_VOIX}|${process.env.ELEVENLABS_MODELE??"eleven_multilingual_v2"}|${texte}`).digest("hex").slice(0,32);
 const audio=await readFile(join(dossiers[0],`${cle}.mp3`)),empreinte=createHash("sha256").update(audio).digest("hex");
 try{const ancien=JSON.parse(await readFile(join(dossiers[0],`${cle}.mots.json`),"utf8"));if(ancien.audio_sha256===empreinte){reutilises++;continue;}}catch{}
 const formulaire=new FormData();formulaire.append("file",new Blob([audio],{type:"audio/mpeg"}),"milo.mp3");formulaire.append("text",texte);
 const r=await fetch("https://api.elevenlabs.io/v1/forced-alignment",{method:"POST",headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY},body:formulaire,signal:AbortSignal.timeout(20000)});
 if(!r.ok){const detail=await r.json().catch(()=>({}));console.log(JSON.stringify({statut:r.status,raison:detail.detail?.status,message:detail.detail?.message}));throw new Error(`Analyse audio refusée (${r.status}).`);}
 const alignement=await r.json();
 if(!Array.isArray(alignement.words)||!alignement.words.length||alignement.words.some(m=>!Number.isFinite(m.start)||!Number.isFinite(m.end)||m.end<=m.start))throw new Error("Repères invalides.");
 const contenu=JSON.stringify({audio_sha256:empreinte,mots:alignement.words.map(({text,start,end})=>({text,start,end}))});
 for(const dossier of dossiers){const cible=await readFile(join(dossier,`${cle}.mp3`));if(createHash("sha256").update(cible).digest("hex")===empreinte)await writeFile(join(dossier,`${cle}.mots.json`),contenu);}
 await appendFile(join(dossiers[0],"suivi.jsonl"),JSON.stringify({date:new Date().toISOString(),type:"alignement",caracteres:texte.length})+"\n");
 prepares++;
}
console.log(JSON.stringify({consignes:textes.length,prepares,reutilises,generationVoix:0}));
