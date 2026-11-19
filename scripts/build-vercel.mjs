import './build.mjs';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('public',{recursive:true});
for(const name of ['index.html','app.js','style.css'])await copyFile('web/'+name,'public/'+name);
await copyFile('lib/guidance.mjs','public/guidance.js');
console.log('Prepared Vercel static assets and shared API function.');
