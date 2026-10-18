import { readdir, readFile, mkdir, rm, rename, writeFile } from "node:fs/promises";
import path from "node:path";
const FORMATS=new Map([[".ogg",0x01],[".mp3",0x02],[".wav",0x03]]);
const MAGIC=Buffer.from([0x43,0x4e,0x45,0x41,0x01]);
const root=path.resolve(process.argv[2]??".");
const inputRoot=path.join(root,"audio_original"), outputRoot=path.join(root,"audio"), tempRoot=path.join(root,".audio-cnea-tmp-"+process.pid);
async function files(dir){try{return (await readdir(dir,{withFileTypes:true})).filter(x=>x.isFile()&&FORMATS.has(path.extname(x.name).toLowerCase())).map(x=>x.name).sort((a,b)=>a.localeCompare(b,"ja",{numeric:true,sensitivity:"base"}));}catch(e){if(e.code==="ENOENT")return [];throw e;}}
async function convert(kind,prefix,map){const names=await files(path.join(inputRoot,kind));if(names.length>999)throw new Error(kind+": 999 files maximum");await mkdir(path.join(tempRoot,kind),{recursive:true});for(let i=0;i<names.length;i++){const original=names[i],ext=path.extname(original).toLowerCase(),packed=prefix+String(i+1).padStart(3,"0")+".dat";const payload=await readFile(path.join(inputRoot,kind,original));await writeFile(path.join(tempRoot,kind,packed),Buffer.concat([MAGIC,Buffer.from([FORMATS.get(ext)]),payload]));map.push(kind.toUpperCase()+"\t"+original+"\t"+packed);}}
const map=["type\toriginal\tpacked"];
try{await rm(tempRoot,{recursive:true,force:true});await convert("bgm","B",map);await convert("se","S",map);await writeFile(path.join(tempRoot,"map.txt"),map.join("\n")+"\n","utf8");await rm(outputRoot,{recursive:true,force:true});await rename(tempRoot,outputRoot);console.log("CNEA: "+(map.length-1)+" file(s) -> "+outputRoot);}catch(e){await rm(tempRoot,{recursive:true,force:true});console.error(e.message);process.exitCode=1;}
