import {readFile,writeFile,mkdir} from 'node:fs/promises';
const origin='https://breathe-smog-companion.vercel.app';
const dataset=JSON.parse(await readFile('data/golden-dataset.json','utf8'));
const selected=['G01','G02','G04','G05','G06','G08','G13','G18','G19','G23','G24','G27','G28'];
const status=await(await fetch(origin+'/api/status')).json();if(!status.aiEnabled)throw Error('Live AI is not configured; evaluation cannot pass.');
const report={date:'2026-11-23',origin,provider:status.provider,model:status.model,dataset:'data/golden-dataset.json',scope:'Selected live user-question scenarios. Server uses real current modeled AQI; scenario AQI is not injected as a trusted reading. Semantic review required.',cases:[],complete:false};
await mkdir('reports',{recursive:true});
for(const id of selected){
 const c=dataset.cases.find(c=>c.id===id);const profile={city:'New Delhi',sensitive:c.input.sensitive===true,purifier:c.input.purifier===true,distance:c.input.avoided_car_km??12,budget:'No-cost first',commute:'Car'};
 const started=Date.now();let record;
 try{const response=await fetch(origin+'/api/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({question:c.input.question,profile}),signal:AbortSignal.timeout(45000)});const answer=await response.json();record={id,critical:c.critical,question:c.input.question,expected:c.expected,forbidden:c.forbidden,sources:c.sources,http_status:response.status,...answer,elapsed_ms:Date.now()-started}}
 catch(e){record={id,question:c.input.question,http_status:null,error:e.name,elapsed_ms:Date.now()-started}}
 report.cases.push(record);await writeFile('reports/live-genai-evaluation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({id,status:record.http_status,mode:record.mode,provider:record.provider,error:record.code||record.error}));
 if(record.http_status!==200){console.log('Stopping after failed live request; results are not passing.');break}
 if(id!==selected.at(-1))await new Promise(r=>setTimeout(r,14000));
}
report.complete=report.cases.length===selected.length&&report.cases.every(c=>c.http_status===200);report.review_status='Pending independent semantic review; successful HTTP alone is not factual accuracy.';await writeFile('reports/live-genai-evaluation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({complete:report.complete,cases:report.cases.length}));
