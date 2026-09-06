const API_VERSION = 'c4.2';
const GEMINI_MODEL = 'gemini-3.8-flash';
const SYSTEM_PROMPT = "You are Rudiment, a personal drumming coach and curriculum designer for a self-taught, self-motivated drummer. Meet the student exactly where they are, never let them skip foundational understanding, and always give an achievable next step.\n\nCORE RULES:\n1. The deterministic canonical curriculum is authoritative. Do not introduce unrelated weak skills as required work.\n2. Start new skills slow, relaxed, and clean before increasing tempo.\n3. Treat levels per strand, not as one global ability.\n4. Every technical answer should include tempo, meter/subdivision where relevant, and practical musical application.\n5. Musical application matters: groove, song form, dynamics, fills, transitions, and deliberate restraint.\n6. Be encouraging, direct, structured, and specific.\n";
function readBody(req){ if(req&&req.body&&typeof req.body==='object') return req.body; if(req&&typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return {}}} return {}; }
async function generate(prompt){
  const key=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY;
  if(!key){const e=new Error('Gemini is not configured. Add GEMINI_API_KEY in Vercel and redeploy.');e.status=503;e.code='AI_NOT_CONFIGURED';throw e;}
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(GEMINI_MODEL)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({system_instruction:{parts:[{text:SYSTEM_PROMPT}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.7}}),signal:controller.signal});
    const raw=await r.text(); let data={}; try{data=raw?JSON.parse(raw):{}}catch{const e=new Error('Gemini returned unreadable JSON.');e.status=502;throw e;}
    if(!r.ok){const e=new Error(data?.error?.message||('Gemini request failed ('+r.status+').'));e.status=r.status;e.code=data?.error?.status||'GEMINI_REQUEST_FAILED';throw e;}
    const text=(data?.candidates||[]).flatMap(c=>c?.content?.parts||[]).map(p=>typeof p?.text==='string'?p.text:'').join('').trim();
    if(!text){const e=new Error('Gemini responded without text.');e.status=502;throw e;} return text;
  }catch(err){if(err?.name==='AbortError'){const e=new Error('Gemini request timed out.');e.status=502;e.code='AI_TIMEOUT';throw e;} throw err;}finally{clearTimeout(timer)}
}
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store'); res.setHeader('X-Rudiment-API-Version',API_VERSION);
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed. Use POST.',apiVersion:API_VERSION});}
  try{const {durationMinutes,targetTrack,currentLevel,specificFocus}=readBody(req); const prompt='Create a detailed, step-by-step '+(durationMinutes||30)+'-minute drumming practice plan for the "'+(targetTrack||'Rudiments')+'" skill track at the "'+(currentLevel||'Beginner')+'" level. '+(specificFocus?('Specific focus: '+specificFocus+'. '):'')+'Keep the plan curriculum-aware and include musical application rather than disconnected random skills.'; const plan=await generate(prompt); return res.status(200).json({apiVersion:API_VERSION,plan});}
  catch(err){console.error('Generate Plan API Error:',err);return res.status(Number.isFinite(err?.status)?err.status:500).json({error:err?.message||'Unexpected server error.',code:err?.code||'SERVER_ERROR',apiVersion:API_VERSION});}
}
