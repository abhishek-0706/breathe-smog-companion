import {readFile,readdir,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
const ignore=new Set(['.git','.sites-runtime','node_modules','dist']);let bytes=0,files=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(ignore.has(entry.name)||/\.tar\.gz$|\.zip$/.test(entry.name))continue;const file=dir+'/'+entry.name;if(entry.isDirectory())await walk(file);else{assert.ok(!/^\.env(?:\.|$)/.test(entry.name)||entry.name==='.env.example','Environment file must not be published: '+file);const s=await stat(file);bytes+=s.size;files++;const text=await readFile(file,'utf8');assert.doesNotMatch(text,/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}|\bart_v2_[A-Za-z0-9_]{15,}|\bghp_[A-Za-z0-9]{20,}/,'Potential secret in '+file)}}}
await walk('.');assert.ok(bytes<10*1024*1024,'Source exceeds submission limit');console.log(JSON.stringify({sourceFiles:files,sourceBytes:bytes,under10MB:true,knownSecretPatternsFound:0}));
