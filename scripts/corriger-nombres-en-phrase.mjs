// Réparation ciblée : extraire six et quinze d'une phrase française, avec repères temporels.
import "../src/config.ts";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, appendFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DOSSIER_DONNEES, RACINE, FUSEAU } from "../src/config.ts";
import { db, transaction } from "../src/db.ts";
if (!process.argv.includes("--generer")) throw new Error("Indiquer --generer pour cette réparation ciblée.");
if (process.env.LUMO_PARTAGE === "1") throw new Error("Pas de génération dans le serveur partagé.");
if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOIX) throw new Error("Voix non configurée.");
const texte="Dans cet exercice de mathématiques, le premier nombre est : six. Et voici le second nombre : quinze.";
const modele=process.env.ELEVENLABS_MODELE ?? "eleven_multilingual_v2";
const dossiers=[...new Set([resolve(join(DOSSIER_DONNEES,"voix")),resolve(join(RACINE,"data","voix"))])];
const journal=join(dossiers[0],"suivi.jsonl");
const travail=join(DOSSIER_DONNEES,"corrections-voix",randomUUID());
await mkdir(travail,{recursive:true});
await mkdir(dossiers[0],{recursive:true});
function journaliser(type,caracteres=0){return appendFile(journal,JSON.stringify({date:new Date().toISOString(),type,caracteres})+"\n");}
function framesMp3(audio){
 const frames=[];let p=0,t=0;
 if(audio.subarray(0,3).toString()==="ID3")p=10+((audio[6]&127)<<21)+((audio[7]&127)<<14)+((audio[8]&127)<<7)+(audio[9]&127);
 while(p+4<=audio.length){
   const h=audio.readUInt32BE(p),version=(h>>>19)&3,layer=(h>>>17)&3,bi=(h>>>12)&15,si=(h>>>10)&3;
   if((h>>>21)!==2047||version!==3||layer!==1||bi===0||bi===15||si===3){p++;continue;}
   const bitrate=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320][bi]*1000;
   const hz=[44100,48000,32000][si],size=Math.floor(144*bitrate/hz)+((h>>>9)&1),duree=1152/hz;
   if(p+size>audio.length)break;
   frames.push({debut:p,fin:p+size,temps:t,duree});p+=size;t+=duree;
 }
 if(frames.length<10)throw new Error("Format audio imprévu, cache conservé.");
 return frames;
}
try{
 const limite=Number(process.env.LUMO_VOIX_CARACTERES_JOUR ?? 2000),caracteres=[...texte].length;
 if(!Number.isSafeInteger(limite)||limite<caracteres)throw new Error("Budget quotidien insuffisant.");
 transaction(()=>{const jour=new Date().toLocaleDateString("sv-SE",{timeZone:FUSEAU});db.prepare("INSERT OR IGNORE INTO budget_voix(jour) VALUES(?)").run(jour);const r=db.prepare("UPDATE budget_voix SET caracteres=caracteres+? WHERE jour=? AND caracteres+?<=?").run(caracteres,jour,caracteres,limite);if(!r.changes)throw new Error("Plafond quotidien atteint.");});
 await journaliser("appel",caracteres);
 const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(process.env.ELEVENLABS_VOIX)}/with-timestamps?output_format=mp3_44100_128`,{method:"POST",signal:AbortSignal.timeout(20000),headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({text:texte,model_id:modele,...(modele==="eleven_multilingual_v2"?{}:{language_code:"fr"}),voice_settings:{stability:0.45,similarity_boost:0.8,style:0.3,use_speaker_boost:true}})});
 if(!r.ok){await r.body?.cancel();throw new Error(`Génération refusée (${r.status}), anciens fichiers conservés.`);}
 const resultat=await r.json(),audio=Buffer.from(resultat.audio_base64,"base64"),alignement=resultat.normalized_alignment ?? resultat.alignment;
 if(!alignement||audio.length<1000||audio.length>5000000)throw new Error("Réponse invalide, cache conservé.");
 const phrase=alignement.characters.join(""),frames=framesMp3(audio);
 await writeFile(join(travail,"phrase-francaise.mp3"),audio);
 await writeFile(join(travail,"alignement.json"),JSON.stringify(alignement));
 const extraits=[];
 for(const mot of ["six","quinze"]){
   const debut=phrase.indexOf(mot),fin=debut+mot.length-1;
   if(debut<0)throw new Error("Mot non retrouvé, cache conservé.");
   const t0=Math.max(0,alignement.character_start_times_seconds[debut]-0.12),t1=alignement.character_end_times_seconds[fin]+0.10;
   const selection=frames.filter(f=>f.temps+f.duree>t0&&f.temps<t1);
   if(selection.length<5||t1-t0>2)throw new Error("Découpe invalide, cache conservé.");
   const extrait=Buffer.concat(selection.map(f=>audio.subarray(f.debut,f.fin)));
   await writeFile(join(travail,`${mot}.mp3`),extrait);
   const cle=createHash("sha256").update(`${process.env.ELEVENLABS_VOIX}|${modele}|${mot}`).digest("hex").slice(0,32);
   extraits.push({mot,cle,extrait,t0,t1});
 }
 for(const {mot,cle,extrait,t0,t1}of extraits){
   for(const dossier of dossiers){await mkdir(dossier,{recursive:true});const fichier=join(dossier,`${cle}.mp3`);try{await writeFile(`${fichier}.avant-phrase-${randomUUID()}`,await readFile(fichier));}catch(e){if(e.code!=="ENOENT")throw e;}const temporaire=`${fichier}.${process.pid}.tmp`;await writeFile(temporaire,extrait);await rename(temporaire,fichier);}
   console.log(JSON.stringify({mot,octets:extrait.length,duree:Number((t1-t0).toFixed(2)),extrait:join(travail,`${mot}.mp3`)}));
 }
 await journaliser("generation");
}catch(e){await journaliser("erreur");throw e;}finally{db.close();}
