"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ═══════════════════════════════════════════════
   CONSTANTS — aligned to v7 server PROV keys
   ═══════════════════════════════════════════════ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const S   = v => String(v || '');
const PREVL = new Set(['html','js','javascript','python','py','java','c','cpp','c++','ts','tsx','jsx','go','rust','php','rb','swift','kotlin','sql','bash','sh']);

const DEFAULT_PREF  = 'or_minimax';
const MGR_ID        = 'groq_llama33_70b_b';
const DC_MGR_FB     = 'gh_gpt41';

/* RULES — one entry per v7 PROV key */
const RULES = {
  /* ── OpenRouter ── */
  or_minimax: { role:'MiniMax',     modelName:'MiniMax M1',           prov:'OpenRouter',  s:'long context · recommended', tok:4096,c:'#6366f1',e:'🧩',group:'OpenRouter',isDCWorker:true,isDefault:true},
  or_llama33: { role:'Llama Free',  modelName:'Llama 3.3 70B',        prov:'OpenRouter',  s:'free 70B powerhouse',        tok:4096,c:'#22c55e',e:'🆓',group:'OpenRouter'},
  or_qwen3:   { role:'Qwen3',       modelName:'Qwen3 8B',             prov:'OpenRouter',  s:'compact reasoning',          tok:4096,c:'#f59e0b',e:'🐉',group:'OpenRouter'},
  or_gemma3:  { role:'Gemma 3',     modelName:'Gemma 3 27B',          prov:'OpenRouter',  s:'Google open model',          tok:4096,c:'#84cc16',e:'💚',group:'OpenRouter'},
  or_mistral: { role:'Mistral',     modelName:'Mistral 7B',           prov:'OpenRouter',  s:'efficient & fast',           tok:2000,c:'#f97316',e:'🌊',group:'OpenRouter'},
  or_phi4:    { role:'Phi-4',       modelName:'Phi-4 Reasoning',      prov:'OpenRouter',  s:'Microsoft reasoning',        tok:4096,c:'#0ea5e9',e:'🔬',group:'OpenRouter'},
  /* ── Groq ── */
  groq_llama33_70b:     { role:'Assistant',  modelName:'Llama 3.3 70B',       prov:'Groq', s:'fast chat',                   tok:2000,c:'#06b6d4',e:'⚡',group:'Groq'},
  groq_llama33_70b_b:   { role:'Manager',    modelName:'Llama 3.3 70B',       prov:'Groq', s:'orchestration manager',       tok:6000,c:'#10b981',e:'🎯',group:'Groq',isManager:true},
  groq_llama4_scout:    { role:'Scout',      modelName:'Llama 4 Scout 17B',   prov:'Groq', s:'fast reasoning',              tok:4096,c:'#22c55e',e:'🔭',group:'Groq'},
  groq_llama4_maverick: { role:'Maverick',   modelName:'Llama 4 Maverick',    prov:'Groq', s:'creative thinking',          tok:4096,c:'#a3e635',e:'🦅',group:'Groq',isDCWorker:true},
  groq_llama31_8b:      { role:'Quick',      modelName:'Llama 3.1 8B',        prov:'Groq', s:'instant responses',          tok:2000,c:'#67e8f9',e:'💨',group:'Groq'},
  groq_deepseek_r1:     { role:'DeepSeek R1',modelName:'DeepSeek R1 Qwen-32B',prov:'Groq', s:'reasoning distill',          tok:6000,c:'#60a5fa',e:'🧮',group:'Groq'},
  groq_gemma2_9b:       { role:'Compact',    modelName:'Gemma 2 9B',          prov:'Groq', s:'efficient & concise',        tok:2000,c:'#fb923c',e:'💎',group:'Groq'},
  groq_mixtral:         { role:'Mixture',    modelName:'Mixtral 8x7B',        prov:'Groq', s:'diverse expertise',          tok:4096,c:'#e879f9',e:'🌀',group:'Groq'},
  /* ── Gemini (v7 renamed keys) ── */
  gem_lite_k1: { role:'Flash Lite',   modelName:'Gemini 2.5 Flash Lite',    prov:'Google', s:'fastest · 1M context',  tok:8192,c:'#a78bfa',e:'⚡',group:'Gemini',isDCWorker:true},
  gem_lite_k2: { role:'Flash Lite K2',modelName:'Gemini 2.5 Flash Lite',    prov:'Google', s:'fastest · 1M context',  tok:8192,c:'#c4b5fd',e:'⚡',group:'Gemini'},
  gem_lite_k3: { role:'Flash Lite K3',modelName:'Gemini 2.5 Flash Lite',    prov:'Google', s:'fastest · 1M context',  tok:8192,c:'#ddd6fe',e:'⚡',group:'Gemini'},
  gem_25_k1:   { role:'Flash',        modelName:'Gemini 2.5 Flash',         prov:'Google', s:'multimodal · fast',     tok:8192,c:'#8b5cf6',e:'✨',group:'Gemini'},
  gem_25_k2:   { role:'Flash K2',     modelName:'Gemini 2.5 Flash',         prov:'Google', s:'multimodal · fast',     tok:8192,c:'#a78bfa',e:'✨',group:'Gemini'},
  gem_25_k3:   { role:'Flash K3',     modelName:'Gemini 2.5 Flash',         prov:'Google', s:'multimodal · fast',     tok:8192,c:'#c4b5fd',e:'✨',group:'Gemini'},
  gem_20:      { role:'Flash 2.0',    modelName:'Gemini 2.0 Flash',         prov:'Google', s:'fast & capable',        tok:8192,c:'#7c3aed',e:'🔥',group:'Gemini'},
  gem_20_lite: { role:'Lite',         modelName:'Gemini 2.0 Flash Lite',    prov:'Google', s:'lightest & cheapest',   tok:8192,c:'#6d28d9',e:'🪶',group:'Gemini'},
  /* ── GitHub (gh_gpt41 = DC Manager) ── */
  gh_gpt41_mini:   { role:'GPT-4.1 Mini',modelName:'GPT-4.1 Mini',         prov:'GitHub', s:'fast OpenAI',           tok:3000,c:'#14b8a6',e:'🌐',group:'GitHub'},
  gh_gpt4o:        { role:'GPT-4o',     modelName:'GPT-4o',                 prov:'GitHub', s:'multimodal flagship',   tok:4000,c:'#0d9488',e:'🔮',group:'GitHub',isDCWorker:true},
  gh_gpt41:        { role:'DC Manager', modelName:'GPT-4.1',                prov:'GitHub', s:'code architect · DC mgr',tok:6000,c:'#0f766e',e:'🤖',group:'GitHub',isDCManager:true},
  gh_o4_mini:      { role:'o4-mini',    modelName:'o4-mini',                prov:'GitHub', s:'compact reasoning',     tok:4000,c:'#115e59',e:'🧩',group:'GitHub'},
  gh_deepseek_r1:  { role:'DeepSeek R1',modelName:'DeepSeek R1 (GH)',       prov:'GitHub', s:'full R1 · may 429',     tok:8192,c:'#60a5fa',e:'🧠',group:'GitHub'},
  gh_deepseek_v3:  { role:'DeepSeek V3',modelName:'DeepSeek V3 (GH)',       prov:'GitHub', s:'strong coder',          tok:4096,c:'#3b82f6',e:'🔷',group:'GitHub',isDCWorker:true},
  gh_llama33:      { role:'Llama GH',   modelName:'Llama 3.3 70B (GH)',     prov:'GitHub', s:'Meta via GitHub',       tok:4096,c:'#22c55e',e:'🦙',group:'GitHub'},
  gh_phi4:         { role:'Phi-4 GH',   modelName:'Phi-4 (GH)',             prov:'GitHub', s:'Microsoft small model', tok:4096,c:'#0ea5e9',e:'φ', group:'GitHub'},
  gh_mistral_large:{ role:'Mistral L',  modelName:'Mistral Large (GH)',     prov:'GitHub', s:'Mistral flagship',      tok:4096,c:'#f97316',e:'🌊',group:'GitHub'},
  gh_cohere:       { role:'Cohere',     modelName:'Cohere R+ (GH)',         prov:'GitHub', s:'retrieval & RAG',       tok:4096,c:'#ec4899',e:'📡',group:'GitHub'},
  /* ── SambaNova ── */
  samba_llama33:  { role:'Llama SN',    modelName:'Llama 3.3 70B',          prov:'SambaNova',s:'high-throughput',      tok:4096,c:'#f97316',e:'⚙️',group:'SambaNova'},
  samba_llama32:  { role:'Llama 90B',   modelName:'Llama 3.2 90B',          prov:'SambaNova',s:'vision + language',    tok:4096,c:'#fb923c',e:'👁️',group:'SambaNova'},
  samba_qwen25:   { role:'Qwen SN',     modelName:'Qwen 2.5 72B (SN)',      prov:'SambaNova',s:'open-source powerhouse',tok:4096,c:'#fbbf24',e:'🔶',group:'SambaNova'},
  samba_deepseek: { role:'DeepSeek SN', modelName:'DeepSeek R1 (SN 600t/s)',prov:'SambaNova',s:'600+ tokens/s!',       tok:8192,c:'#60a5fa',e:'🚀',group:'SambaNova',isDCWorker:true},
  /* ── HuggingFace (NEW in v7) ── */
  hf_llama33: { role:'Llama HF',    modelName:'Llama 3.3 70B (HF)',         prov:'HuggingFace',s:'serverless partners',tok:2000,c:'#fbbf24',e:'🤗',group:'HuggingFace'},
  hf_qwen25:  { role:'Qwen HF',     modelName:'Qwen 2.5 72B (HF)',          prov:'HuggingFace',s:'serverless partners',tok:2000,c:'#f59e0b',e:'🤗',group:'HuggingFace'},
  hf_mistral: { role:'Mistral HF',  modelName:'Mistral 7B (HF)',            prov:'HuggingFace',s:'serverless partners',tok:2000,c:'#d97706',e:'🤗',group:'HuggingFace'},
  /* ── Bytez ── */
  bytez_qwen25:  { role:'Qwen',        modelName:'Qwen 2.5 72B',            prov:'Bytez',s:'open-source specialist',  tok:3000,c:'#84cc16',e:'🔬',group:'Bytez'},
  bytez_llama31: { role:'Llama Bytez', modelName:'Llama 3.1 70B',           prov:'Bytez',s:'reliable baseline',       tok:3000,c:'#4ade80',e:'🦙',group:'Bytez'},
  bytez_mistral: { role:'Mistral B',   modelName:'Mistral 7B',              prov:'Bytez',s:'fast & lightweight',      tok:2000,c:'#86efac',e:'💫',group:'Bytez'},
  /* ── DuckDuckGo (v7 → gpt-4o-mini) ── */
  duckduckgo: { role:'GPT-4o Mini',  modelName:'GPT-4o Mini (DDG)',          prov:'DuckDuckGo',s:'free GPT-4o mini · no key',tok:2000,c:'#ef4444',e:'🦆',group:'DuckDuckGo',isDCWorker:true},
};

const GROUP_ORDER  = ['OpenRouter','Groq','Gemini','GitHub','SambaNova','HuggingFace','Bytez','DuckDuckGo'];
const GROUP_COLORS = { OpenRouter:'#6366f1',Groq:'#06b6d4',Gemini:'#8b5cf6',GitHub:'#14b8a6',SambaNova:'#f97316',HuggingFace:'#fbbf24',Bytez:'#84cc16',DuckDuckGo:'#ef4444' };

const MODES = [
  { k:'fast',      l:'⚡ Fast'       },
  { k:'smart',     l:'🧠 Smart'      },
  { k:'managed',   l:'🎯 Managed'    },
  { k:'debate',    l:'💬 Debate'     },
  { k:'deepcoder', l:'💻 DeepCoder'  },
];

const SUGGESTIONS = [
  'Explain quantum computing simply','Help me write a cover letter',
  'Build a REST API in Node.js','Plan a 7-day Italy itinerary',
  'Debug this Python error','Write a short bedtime story',
  'Explain how mortgages work','Suggest a healthy dinner recipe',
];

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
const getMemCtx = m => m.length
  ? '\n\n[Recent context]\n' + m.slice(-5).map((x,i) => `${i+1}. [${x.src}] ${x.q}`).join('\n')
  : '';

const buildSys = (pid, sub, mem=[]) => {
  const r = RULES[pid] || RULES[DEFAULT_PREF];
  const base = `You are ${r.modelName}, a helpful AI assistant in GoAi. Be clear, honest, and thorough. Help with anything — coding, writing, research, math, creative work, advice, or conversation.${getMemCtx(mem)}`;
  return sub ? (base + '\n\nYour specific task:\n' + sub) : base;
};

const buildDCSys = (pid, mem=[]) => {
  const r = RULES[pid] || RULES[DEFAULT_PREF];
  return `You are ${r.modelName} in GoAi DeepCoder Mode — an expert software engineer.
RULES: Write COMPLETE, RUNNABLE code. Zero placeholders or TODOs. All imports, error handling included. Clean code, comments only for complex logic. Close ALL \`\`\` blocks. End with [COMPLETE].${getMemCtx(mem)}`;
};

const checkOk = t => {
  if (!t || t.length < 40) return { ok:false, issue:'too short' };
  if ((t.match(/```/g)||[]).length % 2 !== 0) return { ok:false, issue:'unclosed ``` block' };
  if (/(\.\.\.|…)\s*$/.test(t.trim())) return { ok:false, issue:'truncated' };
  if (/\/\/\s*(rest|todo|continue|implement|add more)/i.test(t)) return { ok:false, issue:'placeholder' };
  return { ok:true, issue:'' };
};

const getHist = (msgs, n=3) => msgs
  .filter(m => m.role && (m.role==='user'||m.role==='ai') && m.text)
  .slice(-(n*2))
  .map(m => ({ role: m.role==='ai'?'assistant':'user', content: S(m.text).slice(0,600) }));

const fmtTime = t => {
  const d = new Date(t), n = new Date();
  return d.toDateString() === n.toDateString()
    ? d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
    : d.toLocaleDateString([],{month:'short',day:'numeric'});
};

const fmtDuration = ms => {
  if (ms < 1000) return ms + 'ms';
  return (ms/1000).toFixed(1) + 's';
};

const exportChatMD = (title, msgs) => {
  const lines = [`# ${title}\n\n*Exported from GoAi v7 — ${new Date().toLocaleString()}*\n\n---\n`];
  for (const m of msgs) {
    if (!m.role || m.isLog || m.isComm) continue;
    if (m.role === 'user') lines.push(`\n**You:** ${S(m.text)}\n`);
    else if (m.role === 'ai' || m.role === 'mgr') lines.push(`\n**AI:** ${S(m.text)}\n`);
    else if (m.role === 'meta') lines.push(`\n> ${S(m.text)}\n`);
  }
  const blob = new Blob([lines.join('')], { type:'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (title || 'chat').replace(/[^a-z0-9]/gi,'_') + '.md';
  a.click();
};

/* ═══════════════════════════════════════════════
   API CALLS
   ═══════════════════════════════════════════════ */
async function api(pid, sys, msgs, tok) {
  const r = await fetch('/api/chat', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ provider:pid, systemPrompt:S(sys).slice(0,12000), messages:(msgs||[]).map(m=>({role:m.role,content:S(m.content).slice(0,18000)})), maxTokens:tok||RULES[pid]?.tok||2000 })
  });
  const d = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(d.error || 'HTTP '+r.status);
  if (!d.text) throw new Error('Empty from '+pid);
  return { text:d.text, usage:d.usage||null };
}

async function streamApi(pid, sys, msgs, tok, onChunk) {
  const r = await fetch('/api/stream', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ provider:pid, systemPrompt:S(sys).slice(0,12000), messages:(msgs||[]).map(m=>({role:m.role,content:S(m.content).slice(0,18000)})), maxTokens:tok||RULES[pid]?.tok||2000 })
  });
  if (!r.ok) { let e='HTTP '+r.status; try{const d=await r.json();e=d.error||e;}catch{} throw new Error(e); }
  if (!r.body) throw new Error('No response body');
  const reader = r.body.getReader(), dec = new TextDecoder(); let buf = '';
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, {stream:true});
    const lines = buf.split('\n'); buf = lines.pop()||'';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const pl = line.slice(6).trim(); if (pl==='[DONE]') return;
      try { const d=JSON.parse(pl); if(d.error) throw new Error(d.error); if(d.text) onChunk(d.text); }
      catch(e) { if (e.message && !e.message.includes('JSON')) throw e; }
    }
  }
}

async function doMem(prompt, src) {
  try {
    const r = await fetch('/api/memory', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({prompt:S(prompt).slice(0,500)}) });
    const d = await r.json();
    if (d?.summary) return { q:d.summary, src:src||'user', t:Date.now() };
  } catch {}
  return null;
}

const chatAPI = {
  list:   ()        => fetch('/api/chats').then(r=>r.json()),
  get:    id        => fetch('/api/chats/'+id).then(r=>r.json()),
  create: (id,t,m,p)=> fetch('/api/chats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,title:t,mode:m,pref:p,messages:[]})}),
  save:   (id,t,m,p,msgs)=>fetch('/api/chats/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t,mode:m,pref:p,messages:msgs})}),
  rename: (id,t)    => fetch('/api/chats/'+id+'/rename',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t})}),
  del:    id        => fetch('/api/chats/'+id,{method:'DELETE'}),
};

/* ═══════════════════════════════════════════════
   CODE PARSER
   ═══════════════════════════════════════════════ */
function parseParts(txt) {
  const str = S(txt); if (!str) return [{ t:'txt', c:'' }];
  const rx = /```(\w*)\n([\s\S]*?)```/g; const pts=[]; let li=0, m;
  while ((m=rx.exec(str)) !== null) {
    if (m.index > li) pts.push({ t:'txt', c:str.slice(li,m.index) });
    pts.push({ t:'code', l:m[1]||'', c:m[2]||'' });
    li = rx.lastIndex;
  }
  if (li < str.length) pts.push({ t:'txt', c:str.slice(li) });
  return pts.length ? pts : [{ t:'txt', c:str }];
}

/* ═══════════════════════════════════════════════
   TOAST SYSTEM
   ═══════════════════════════════════════════════ */
function ToastContainer({ toasts }) {
  return (
    <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:99999, display:'flex', flexDirection:'column', gap:8, alignItems:'center', pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} className={t.exiting ? 'toast-exit' : 'toast-enter'} style={{
          background: t.type==='error' ? 'rgba(239,68,68,.95)' : t.type==='success' ? 'rgba(16,185,129,.95)' : 'rgba(20,30,55,.97)',
          border:'1px solid '+(t.type==='error'?'rgba(239,68,68,.5)':t.type==='success'?'rgba(16,185,129,.5)':'rgba(99,102,241,.3)'),
          borderRadius:14, padding:'9px 18px', color:'#f1f5f9', fontSize:12.5, fontWeight:600,
          display:'flex', alignItems:'center', gap:8, pointerEvents:'none',
          boxShadow:'0 8px 24px rgba(0,0,0,.4)', backdropFilter:'blur(20px)', whiteSpace:'nowrap'
        }}>
          <span>{t.type==='error'?'❌':t.type==='success'?'✅':'ℹ️'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MESSAGE CONTENT
   ═══════════════════════════════════════════════ */
function MsgContent({ text, onPv }) {
  const [cpd, setCpd] = useState({});
  const cp = (i, c) => {
    try { navigator.clipboard.writeText(c||''); } catch {}
    setCpd(p=>({...p,[i]:1})); setTimeout(()=>setCpd(p=>({...p,[i]:0})), 1400);
  };
  const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
  return (
    <div>
      {parseParts(text).map((p,i) => p.t==='txt'
        ? <div key={i} style={{ whiteSpace:'pre-wrap', lineHeight:1.82, wordBreak:'break-word', fontSize:13.5 }}>{p.c}</div>
        : <div key={i} style={{ margin:'10px 0' }}>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:5 }}>
              <span style={{ fontSize:9, background:'rgba(99,102,241,.14)', border:'1px solid rgba(99,102,241,.26)', borderRadius:6, padding:'1px 7px', color:'#a5b4fc', letterSpacing:'.05em' }}>{p.l||'code'}</span>
              <button onClick={()=>cp(i,p.c)} style={{ background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.22)', borderRadius:11, padding:'2px 9px', fontSize:9, cursor:'pointer', color:'#c4b5fd', fontFamily:'inherit', transition:'all .15s' }}>{cpd[i]?'✅':'📋'}</button>
              {PREVL.has((p.l||'').toLowerCase()) && onPv && (
                <button onClick={()=>onPv(p.c,p.l)} style={{ background:'rgba(6,182,212,.08)', border:'1px solid rgba(6,182,212,.24)', borderRadius:11, padding:'2px 9px', fontSize:9, cursor:'pointer', color:'#67e8f9', fontFamily:'inherit', transition:'all .15s' }}>▶ preview</button>
              )}
            </div>
            <pre className="code-pre"><code style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color: isLight ? '#fdba74' : '#a5b4fc' }}>{p.c}</code></pre>
          </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   WORKER LOG
   ═══════════════════════════════════════════════ */
function WorkerLog({ label, ok, text, onPv }) {
  const [open, setOpen] = useState(false);
  return (
    <details style={{ border:'1px solid rgba(99,102,241,.1)', borderRadius:13, marginBottom:4, alignSelf:'flex-start', maxWidth:'96%', overflow:'hidden' }} onToggle={e=>setOpen(e.currentTarget.open)}>
      <summary style={{ padding:'7px 13px', cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:11.5, background:open?'rgba(99,102,241,.07)':'transparent', userSelect:'none', color:'var(--tx3)' }}>
        <span>{ok?'✅':'⚠️'}</span>
        <b style={{ color:'#818cf8', fontSize:11 }}>Worker:</b>
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label||'AI'}</span>
        <span style={{ fontSize:8, opacity:.3 }}>{open?'▲':'▼'}</span>
      </summary>
      {open && <div style={{ padding:'11px 14px', borderTop:'1px solid rgba(99,102,241,.08)', maxHeight:320, overflowY:'auto', fontSize:13 }}><MsgContent text={text||''} onPv={onPv}/></div>}
    </details>
  );
}

/* ═══════════════════════════════════════════════
   COMM LOG
   ═══════════════════════════════════════════════ */
function CommLog({ comms }) {
  const [open, setOpen] = useState(true);
  if (!Array.isArray(comms)||!comms.length) return null;
  return (
    <details open={open} style={{ border:'1px solid rgba(245,158,11,.14)', borderRadius:13, marginBottom:4, alignSelf:'flex-start', maxWidth:'96%', overflow:'hidden' }} onToggle={e=>setOpen(e.currentTarget.open)}>
      <summary style={{ padding:'7px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:11.5, background:'rgba(245,158,11,.05)', userSelect:'none', color:'#f59e0b' }}>
        <b>💬 AI Discussion ({comms.length})</b>
        <span style={{ fontSize:8, opacity:.38, marginLeft:'auto' }}>{open?'▲':'▼'}</span>
      </summary>
      <div style={{ padding:'11px 14px', borderTop:'1px solid rgba(245,158,11,.09)', display:'flex', flexDirection:'column', gap:9 }}>
        {comms.map((c,i) => { const r = c?.pid ? RULES[c.pid] : null; return (
          <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <span style={{ fontSize:17, flexShrink:0, lineHeight:1.4 }}>{r?.e||'·'}</span>
            <div>
              <span style={{ fontSize:10.5, color:'#fbbf24', fontWeight:700 }}>{r?.modelName||S(c?.pid)||'AI'} </span>
              <span style={{ fontSize:9, color:'var(--tx3)' }}>({r?.role||'worker'})</span>
              <div style={{ fontSize:12.5, color:'var(--tx2)', lineHeight:1.65, marginTop:3, fontStyle:'italic' }}>"{S(c?.text)}"</div>
            </div>
          </div>
        ); })}
      </div>
    </details>
  );
}

/* ═══════════════════════════════════════════════
   DEEPCODER STATUS PANEL  ← new in v7
   ═══════════════════════════════════════════════ */
function DeepCoderPanel({ statuses, elapsed }) {
  if (!statuses || !statuses.length) return null;
  const icons = { waiting:'⏳', thinking:'⟳', done:'✅', error:'❌' };
  const colors = { waiting:'#64748b', thinking:'#f59e0b', done:'#10b981', error:'#ef4444' };
  return (
    <div className="dc-panel">
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <span style={{ fontSize:13 }}>💻</span>
        <span style={{ fontSize:11.5, fontWeight:700, color:'#fdba74' }}>DeepCoder Running</span>
        {elapsed > 0 && <span style={{ marginLeft:'auto', fontSize:9.5, color:'var(--tx3)', fontFamily:"'JetBrains Mono',monospace" }}>⏱ {fmtDuration(elapsed)}</span>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {statuses.map((s,i) => {
          const r = RULES[s.pid] || {};
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:9, background: s.status==='thinking' ? 'rgba(249,115,22,.1)' : 'rgba(255,255,255,.03)', border:'1px solid '+(s.status==='thinking'?'rgba(249,115,22,.2)':'rgba(255,255,255,.04)'), transition:'all .3s' }}>
              <span style={{ fontSize:14, width:22, textAlign:'center', flexShrink:0 }}>{r.e||'·'}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:s.status==='thinking'?700:500, color: s.status==='thinking'?'#fdba74':'var(--tx2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.modelName||s.pid}</div>
                <div style={{ fontSize:9, color:colors[s.status]||'var(--tx3)', marginTop:1 }}>{s.label||s.status}</div>
              </div>
              <span style={{ fontSize:14, flexShrink:0, animation:s.status==='thinking'?'spin .8s linear infinite':'' }}>{icons[s.status]||'⏳'}</span>
              {s.status==='thinking' && (
                <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                  {[0,1,2].map(j => <span key={j} className="think-dot" style={{ animationDelay:j*.16+'s' }}/>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div style={{ marginTop:10, height:3, background:'rgba(249,115,22,.15)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', background:'linear-gradient(90deg,#f97316,#ef4444)', borderRadius:2, transition:'width .5s ease', width: Math.round((statuses.filter(s=>s.status==='done').length/statuses.length)*100)+'%' }}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   STREAM BUBBLE
   ═══════════════════════════════════════════════ */
function StreamBubble({ text, pid }) {
  const r = RULES[pid] || RULES[DEFAULT_PREF];
  return (
    <div style={{ maxWidth:'94%', alignSelf:'flex-start' }} className="bub-ai">
      <div style={{ padding:'13px 16px', borderRadius:'6px 24px 24px 24px', background:'var(--bubble-ai-bg)', border:'1.2px solid var(--bubble-ai-bd)', lineHeight:1.82, boxShadow:'0 6px 20px rgba(139,92,246,.1)' }}>
        <div style={{ fontSize:9.5, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:14 }}>{r.e}</span>
          <span style={{ color:r.c||'#64748b', fontWeight:700 }}>{r.modelName||pid}</span>
          <span style={{ color:'var(--tx4)', fontSize:8.5 }}>streaming…</span>
          <div style={{ marginLeft:4, display:'flex', gap:3 }}>
            {[0,1,2].map(i => <span key={i} className="think-dot" style={{ animationDelay:i*.14+'s' }}/>)}
          </div>
        </div>
        <MsgContent text={text}/>
        <span className="scur"/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TYPING INDICATOR
   ═══════════════════════════════════════════════ */
function Typing({ text }) {
  return (
    <div className="bub-ai" style={{ alignSelf:'flex-start', display:'flex', alignItems:'center', gap:10, padding:'9px 15px', background:'rgba(99,102,241,.06)', border:'1px solid rgba(99,102,241,.12)', borderRadius:'6px 20px 20px 20px', fontSize:12.5, color:'var(--tx3)', maxWidth:'92%' }}>
      <div style={{ display:'flex', gap:4 }}>{[0,1,2].map(i => <span key={i} className="think-dot" style={{ animationDelay:i*.18+'s' }}/>)}</div>
      <span style={{ fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:280 }}>{text||'…'}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MESSAGE BUBBLE
   ═══════════════════════════════════════════════ */
const BUBBLE_STYLES = {
  user: { bg:'var(--bubble-user-bg)', bd:'var(--bubble-user-bd)', br:'24px 6px 24px 24px', se:'flex-end' },
  ai:   { bg:'var(--bubble-ai-bg)',   bd:'var(--bubble-ai-bd)',   br:'6px 24px 24px 24px', se:'flex-start' },
  mgr:  { bg:'var(--bubble-mgr-bg)',  bd:'var(--bubble-mgr-bd)',  br:'6px 24px 24px 24px', se:'flex-start' },
  disc: { bg:'var(--bubble-disc-bg)', bd:'var(--bubble-disc-bd)', br:'6px 24px 24px 24px', se:'flex-start' },
  warn: { bg:'var(--bubble-warn-bg)', bd:'var(--bubble-warn-bd)', br:'6px 24px 24px 24px', se:'flex-start', tc:'var(--bubble-warn-tx)' },
  meta: { bg:'transparent', bd:'transparent', br:'0', se:'flex-start', tc:'var(--bubble-meta-tx)', fi:'italic' },
};

function Bubble({ msg, onPv, onToast }) {
  const [cpd, setCpd] = useState(false);
  if (msg.isLog)  return <WorkerLog label={S(msg.label)} ok={!!msg.ok} text={S(msg.text)} onPv={onPv}/>;
  if (msg.isComm) return <CommLog comms={msg.comms||[]}/>;
  const b = BUBBLE_STYLES[msg.role] || BUBBLE_STYLES.meta;
  return (
    <div className={`bub bub-${msg.role}`} style={{ maxWidth:'94%', alignSelf:b.se||'flex-start', position:'relative' }}>
      <div style={{ padding:'12px 16px', borderRadius:b.br, background:b.bg||'transparent', border:'1.2px solid '+(b.bd||'transparent'), color:b.tc||'var(--tx1)', fontStyle:b.fi||'normal', lineHeight:1.82, boxShadow: b.bg !== 'transparent' ? '0 4px 14px rgba(0,0,0,.12)' : 'none' }}>
        <MsgContent text={S(msg.text)} onPv={onPv}/>
        {msg.usage && (
          <div style={{ marginTop:6, fontSize:9, color:'var(--tx4)', display:'flex', gap:8 }}>
            {msg.usage.prompt_tokens && <span>↑{msg.usage.prompt_tokens}</span>}
            {msg.usage.completion_tokens && <span>↓{msg.usage.completion_tokens}</span>}
          </div>
        )}
      </div>
      {msg.role !== 'meta' && msg.role !== 'warn' && msg.text && (
        <button className="cpb" onClick={()=>{
          try { navigator.clipboard.writeText(S(msg.text)); } catch {}
          setCpd(true); setTimeout(()=>setCpd(false),1400);
          onToast?.('Copied!','success');
        }} style={{ position:'absolute', top:8, right:8, opacity:0, background:'rgba(8,14,32,.95)', border:'1px solid rgba(99,102,241,.28)', borderRadius:10, padding:'3px 8px', fontSize:9, cursor:'pointer', color:'#a5b4fc', transition:'opacity .18s' }}>{cpd?'✅':'📋'}</button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MODEL PICKER BUTTON
   ═══════════════════════════════════════════════ */
function ModelPickerBtn({ pref, provs, onClick }) {
  const cur = RULES[pref] || {};
  const av  = provs[pref]?.available;
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(var(--primary-rgb),.08)', border:'1.5px solid rgba(var(--primary-rgb),.24)', borderRadius:22, padding:'6px 12px 6px 9px', cursor:'pointer', color:'#c4b5fd', fontFamily:'inherit', flexShrink:0, maxWidth:205, transition:'all .2s', boxShadow:'0 2px 8px rgba(var(--primary-rgb),.1)' }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:av?'var(--success)':'var(--tx4)', flexShrink:0, boxShadow:av?'0 0 8px rgba(16,185,129,.5)':'none', transition:'all .2s' }}/>
      <span style={{ fontSize:16, lineHeight:1, flexShrink:0 }}>{cur.e||'·'}</span>
      <div style={{ minWidth:0, textAlign:'left' }}>
        <div style={{ fontSize:11.5, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:'var(--primary-lt)' }}>{cur.role||pref}</div>
        <div style={{ fontSize:8.5, opacity:.45, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:'var(--tx2)' }}>{cur.modelName||''}</div>
      </div>
      <span style={{ fontSize:9, opacity:.3, flexShrink:0 }}>▾</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════
   MODEL SHEET
   ═══════════════════════════════════════════════ */
function ModelSheet({ open, onClose, provs, pref, setPref }) {
  const [q, setQ] = useState('');
  if (!open) return null;
  const avCount = Object.values(provs).filter(v=>v.available).length;
  const groups = {};
  for (const [pid,info] of Object.entries(provs)) {
    const r = RULES[pid]; if (!r) continue;
    const g = r.group||'Other';
    const ql = q.toLowerCase();
    if (ql && !r.modelName?.toLowerCase().includes(ql) && !r.role?.toLowerCase().includes(ql) && !g.toLowerCase().includes(ql) && !r.s?.toLowerCase().includes(ql) && !r.prov?.toLowerCase().includes(ql)) continue;
    if (!groups[g]) groups[g]=[];
    groups[g].push({pid,info,r});
  }
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9990, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      <div onClick={()=>{onClose();setQ('');}} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.82)', backdropFilter:'blur(6px)' }}/>
      <div style={{ position:'relative', background:'var(--glass3)', borderTop:'2px solid rgba(var(--primary-rgb),.3)', borderRadius:'28px 28px 0 0', maxHeight:'88vh', display:'flex', flexDirection:'column', animation:'slideUp .3s cubic-bezier(.4,0,.2,1)', boxShadow:'0 -24px 60px rgba(0,0,0,.5)' }}>
        <div style={{ width:44, height:5, background:'rgba(var(--primary-rgb),.28)', borderRadius:3, margin:'12px auto 0', flexShrink:0 }}/>
        <div style={{ padding:'12px 16px 11px', flexShrink:0, borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:11 }}>
            <div>
              <div style={{ fontWeight:900, color:'var(--primary-lt)', fontSize:15.5, fontFamily:"'Orbitron',monospace" }}>Select Model</div>
              <div style={{ fontSize:9.5, color:'var(--tx3)', marginTop:3 }}>{avCount}/{Object.keys(provs).length} available · MiniMax recommended</div>
            </div>
            <button onClick={()=>{onClose();setQ('');}} style={{ background:'rgba(var(--primary-rgb),.1)', border:'1px solid rgba(var(--primary-rgb),.24)', borderRadius:14, padding:'5px 13px', cursor:'pointer', color:'var(--primary-lt)', fontSize:12, fontFamily:'inherit', fontWeight:600 }}>✕</button>
          </div>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search models, providers…" style={{ width:'100%', background:'rgba(var(--primary-rgb),.06)', border:'1.2px solid rgba(var(--primary-rgb),.18)', borderRadius:13, padding:'8px 13px', color:'var(--tx1)', fontSize:12.5, fontFamily:'inherit', outline:'none' }}/>
        </div>
        <div style={{ overflowY:'auto', padding:'6px 0 60px' }}>
          {GROUP_ORDER.map(g => {
            const items = groups[g]; if (!items?.length) return null;
            return (
              <div key={g}>
                <div className="grp-lbl" style={{ color:GROUP_COLORS[g]||'var(--tx3)' }}>{g} <span style={{ color:'var(--tx4)', fontSize:'8.5px' }}>({items.length})</span></div>
                <div style={{ padding:'0 12px', display:'flex', flexDirection:'column', gap:3 }}>
                  {items.map(({pid,info,r}) => {
                    const sel = pref===pid, isDef = pid===DEFAULT_PREF;
                    return (
                      <button key={pid} onClick={()=>{setPref(pid);onClose();setQ('');}}
                        style={{ display:'flex', alignItems:'center', gap:11, background:sel?'rgba(var(--primary-rgb),.18)':isDef?'rgba(var(--primary-rgb),.07)':'rgba(255,255,255,.014)', border:'1.2px solid '+(sel?'rgba(var(--primary-rgb),.46)':isDef?'rgba(var(--primary-rgb),.22)':'rgba(var(--primary-rgb),.07)'), borderRadius:14, padding:'11px 13px', cursor:'pointer', textAlign:'left', fontFamily:'inherit', width:'100%', transition:'all .2s', boxShadow:sel?'0 4px 12px rgba(var(--primary-rgb),.14)':'none' }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:info.available?'var(--success)':'#1e2d3d', boxShadow:info.available?'0 0 10px rgba(16,185,129,.3)':'none', flexShrink:0 }}/>
                        <span style={{ fontSize:20, lineHeight:1, flexShrink:0, width:26, textAlign:'center' }}>{r.e||'·'}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                            <span style={{ fontSize:12.5, fontWeight:sel?700:600, color:sel?'var(--primary-lt)':'var(--tx1)' }}>{r.role||pid}</span>
                            {isDef && <Badge color="#6366f1" label="DEFAULT"/>}
                            {info.isManager && <Badge color="#10b981" label="MGR"/>}
                            {info.isDCManager && <Badge color="#60a5fa" label="DC-MGR"/>}
                            {info.isDCWorker  && <Badge color="#f97316" label="DC-WRK"/>}
                            {/* SDK badge */}
                            {info.sdk && <Badge color="#64748b" label={info.sdk.toUpperCase()}/>}
                          </div>
                          <div style={{ fontSize:10, marginTop:2.5 }}><span style={{ color:r.c||'var(--tx3)', fontWeight:600 }}>{r.modelName||pid}</span><span style={{ color:'var(--tx4)', fontSize:9 }}> · {r.prov||''}</span></div>
                          <div style={{ fontSize:8.8, color:'var(--tx3)', marginTop:1.5 }}>{r.s||''}</div>
                        </div>
                        {sel && <span style={{ color:'#818cf8', fontSize:14, flexShrink:0, fontWeight:700 }}>✓</span>}
                        {!info.available && <span style={{ fontSize:8.5, color:'var(--tx3)', flexShrink:0, background:'rgba(30,41,59,.55)', borderRadius:6, padding:'2px 6px' }}>no key</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Badge({ color, label }) {
  return (
    <span style={{ fontSize:7.5, background:color+'22', border:'1px solid '+color+'44', borderRadius:5, padding:'1px 5px', color:color, fontWeight:700 }}>{label}</span>
  );
}

/* ═══════════════════════════════════════════════
   PREVIEW MODAL
   ═══════════════════════════════════════════════ */
function PvModal({ pv, onClose }) {
  if (!pv) return null;
  const { code, lang } = pv; const l = (lang||'').toLowerCase();
  const pm = { python:'3', py:'3', java:'java', c:'c', cpp:'cpp', 'c++':'cpp' };
  const jsDoc = `<!DOCTYPE html><html><head><style>body{font-family:'JetBrains Mono',monospace;font-size:12px;padding:14px;background:#06080f;color:#d4d4d4}div{margin:3px 0}.e{color:#f48771}.w{color:#fcd34d}</style></head><body><div id="o"></div><script>const _o=document.getElementById('o');const _p=(s,c)=>{const d=document.createElement('div');d.className=c||'';d.textContent=typeof s==='object'?JSON.stringify(s,null,2):String(s);_o.appendChild(d);};console.log=(...a)=>_p(a.join(' '));console.warn=(...a)=>_p(a.join(' '),'w');console.error=(...a)=>_p(a.join(' '),'e');try{${code||''}}catch(e){_p('Error: '+e.message,'e');}<\/script></body></html>`;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.94)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9995, padding:12, animation:'fadeIn .15s ease' }}>
      <div style={{ background:'var(--glass3)', border:'1px solid rgba(var(--primary-rgb),.28)', borderRadius:22, width:'100%', maxWidth:980, height:'88vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 0 60px rgba(var(--primary-rgb),.12)' }}>
        <div style={{ padding:'11px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <span style={{ fontWeight:900, color:'var(--primary-lt)', fontSize:14, fontFamily:"'Orbitron',monospace" }}>▶ {(lang||'').toUpperCase()||'CODE'} Preview</span>
          <button onClick={onClose} style={{ background:'rgba(var(--primary-rgb),.1)', border:'1px solid rgba(var(--primary-rgb),.24)', borderRadius:14, padding:'4px 14px', cursor:'pointer', color:'var(--primary-lt)', fontFamily:'inherit', fontSize:12 }}>✕</button>
        </div>
        <div style={{ flex:1, overflow:'hidden' }}>
          {l==='html' && <iframe style={{ width:'100%',height:'100%',border:'none' }} sandbox="allow-scripts allow-same-origin allow-forms" srcDoc={code||''}/>}
          {(l==='js'||l==='javascript') && <iframe style={{ width:'100%',height:'100%',border:'none' }} sandbox="allow-scripts" srcDoc={jsDoc}/>}
          {pm[l] && <iframe style={{ width:'100%',height:'100%',border:'none' }} src={`https://pythontutor.com/iframe-embed.html#code=${encodeURIComponent(code||'')}&py=${pm[l]}&curInstr=0&verticalStack=false`}/>}
          {!pm[l]&&l!=='html'&&l!=='js'&&l!=='javascript' && <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--tx3)',flexDirection:'column',gap:12 }}><span style={{ fontSize:40 }}>🔍</span><span style={{ fontSize:13.5 }}>No preview for {lang}</span></div>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MEMORY DRAWER
   ═══════════════════════════════════════════════ */
function MemDrawer({ mem, open, onClose, onClear }) {
  return (
    <>
      {open && <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9980,animation:'fadeIn .15s ease' }}/>}
      <div style={{ position:'fixed',right:0,top:0,bottom:0,width:296,background:'var(--sidebar-bg)',border:'1px solid var(--border)',borderRight:'none',borderRadius:'20px 0 0 20px',zIndex:9981,transform:open?'translateX(0)':'translateX(100%)',transition:'transform .3s cubic-bezier(.4,0,.2,1)',display:'flex',flexDirection:'column',boxShadow:'-12px 0 40px rgba(0,0,0,.5)' }}>
        <div style={{ padding:'14px 15px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 }}>
          <span style={{ fontWeight:900,color:'var(--primary-lt)',fontSize:14,fontFamily:"'Orbitron',monospace" }}>🧠 Memory ({mem.length})</span>
          <div style={{ display:'flex',gap:5 }}>
            <button onClick={onClear} style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.24)',borderRadius:12,padding:'3px 10px',cursor:'pointer',color:'#fca5a5',fontSize:10,fontFamily:'inherit' }}>🗑</button>
            <button onClick={onClose} style={{ background:'rgba(var(--primary-rgb),.1)',border:'1px solid rgba(var(--primary-rgb),.24)',borderRadius:12,padding:'3px 10px',cursor:'pointer',color:'var(--primary-lt)',fontSize:10,fontFamily:'inherit' }}>✕</button>
          </div>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:10,display:'flex',flexDirection:'column',gap:6 }}>
          {!mem.length && <p style={{ color:'var(--tx4)',fontStyle:'italic',textAlign:'center',marginTop:40,fontSize:12 }}>No memories yet.</p>}
          {mem.slice().reverse().map((m,i) => (
            <div key={i} style={{ background:'rgba(var(--primary-rgb),.05)',border:'1px solid rgba(var(--primary-rgb),.1)',borderRadius:11,padding:'8px 11px' }}>
              <div style={{ display:'flex',gap:4,marginBottom:3,alignItems:'center' }}>
                <span style={{ fontSize:8,background:'rgba(var(--primary-rgb),.18)',borderRadius:5,padding:'1px 6px',color:'var(--primary-lt)' }}>{m?.src||'?'}</span>
                <span style={{ fontSize:8,color:'var(--tx4)',marginLeft:'auto' }}>{m?.t?new Date(m.t).toLocaleTimeString():''}</span>
              </div>
              <p style={{ fontSize:12,color:'var(--tx2)',lineHeight:1.6 }}>{m?.q||''}</p>
            </div>
          ))}
        </div>
        <div style={{ padding:'7px 13px',borderTop:'1px solid var(--border)',fontSize:9,color:'var(--tx4)',textAlign:'center',flexShrink:0 }}>Anti-Gajini Quick Memory Reference</div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   ABOUT MODAL
   ═══════════════════════════════════════════════ */
function AboutModal({ open, onClose }) {
  if (!open) return null;
  const modes = [
    ['🧩','Default', 'MiniMax M1 via OpenRouter — long context, recommended'],
    ['⚡','Fast',    'Stream one AI instantly with smart fallback'],
    ['🧠','Smart',   'Intelligent fallback through all available AIs'],
    ['🎯','Managed', 'Plan → parallel workers → review → assemble'],
    ['💬','Debate',  'AIs critique and improve each other\'s answers'],
    ['💻','DeepCoder','GPT-4.1 leads a specialist coding team with live status'],
  ];
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9998,padding:20,animation:'fadeIn .2s ease',overflowY:'auto' }}>
      <div style={{ background:'var(--glass3)',border:'1px solid rgba(var(--primary-rgb),.24)',borderRadius:26,width:'100%',maxWidth:430,overflow:'hidden',boxShadow:'0 0 80px rgba(var(--primary-rgb),.14)',animation:'popIn .35s cubic-bezier(.34,1.56,.64,1)' }}>
        <div className="rainbow"/>
        <div style={{ padding:'28px 26px' }}>
          <div style={{ textAlign:'center',marginBottom:24 }}>
            <div style={{ fontFamily:"'Orbitron',monospace",fontSize:'2.5rem',fontWeight:900,background:'linear-gradient(135deg,#06b6d4,#8b5cf6,#10b981)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',letterSpacing:'-1px',marginBottom:4 }}>⚡ GoAi</div>
            <div style={{ fontSize:10,color:'var(--tx3)',letterSpacing:'.18em',textTransform:'uppercase' }}>Multi-AI Collaboration System</div>
            <div style={{ fontSize:11.5,color:'var(--tx3)',marginTop:5 }}>v7.0 · {Object.keys(RULES).length} Models · SDK-based · MongoDB · Streaming</div>
          </div>
          <div style={{ background:'linear-gradient(135deg,rgba(var(--primary-rgb),.09),rgba(139,92,246,.06))',border:'1px solid rgba(var(--primary-rgb),.22)',borderRadius:18,padding:'18px 20px',marginBottom:20,textAlign:'center',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',inset:0,background:'radial-gradient(circle at 50% 0%,rgba(var(--primary-rgb),.08),transparent 70%)',pointerEvents:'none' }}/>
            <div style={{ fontSize:10,color:'var(--tx4)',marginBottom:6,letterSpacing:'.14em',textTransform:'uppercase' }}>Created by</div>
            <div style={{ fontFamily:"'Orbitron',monospace",fontSize:'1.45rem',fontWeight:900,background:'linear-gradient(135deg,#06b6d4,#8b5cf6)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent' }}>Arush Kumar</div>
            <div style={{ marginTop:5,fontSize:10.5,color:'var(--tx4)' }}>Builder · Developer · Innovator</div>
          </div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:9.5,color:'var(--tx4)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.12em' }}>Collaboration Modes</div>
            {modes.map(([e,n,d]) => (
              <div key={n} style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'6px 2px',borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:14,width:22,textAlign:'center',flexShrink:0,lineHeight:1.8 }}>{e}</span>
                <span style={{ fontSize:11.5,fontWeight:700,color:'var(--primary-lt)',width:84,flexShrink:0,lineHeight:1.8 }}>{n}</span>
                <span style={{ fontSize:10,color:'var(--tx3)',lineHeight:1.8 }}>{d}</span>
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{ width:'100%',background:'rgba(var(--primary-rgb),.1)',border:'1.5px solid rgba(var(--primary-rgb),.28)',borderRadius:14,padding:'12px',cursor:'pointer',color:'var(--primary-lt)',fontSize:13,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,transition:'all .2s' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   KEYBOARD SHORTCUTS MODAL
   ═══════════════════════════════════════════════ */
function ShortcutsModal({ open, onClose }) {
  if (!open) return null;
  const shortcuts = [
    ['Ctrl+Enter','Send message'],
    ['Shift+Enter','New line in message'],
    ['Ctrl+N','New chat'],
    ['Ctrl+/','Toggle shortcuts'],
    ['Ctrl+E','Export chat as Markdown'],
    ['Ctrl+K','Open model picker'],
    ['Ctrl+M','Open memory drawer'],
    ['Ctrl+T','Toggle dark/light theme'],
    ['Escape','Close any modal'],
  ];
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9997,padding:20,animation:'fadeIn .15s ease' }}>
      <div style={{ background:'var(--glass3)',border:'1px solid var(--border)',borderRadius:22,width:'100%',maxWidth:380,overflow:'hidden',boxShadow:'0 0 50px rgba(var(--primary-rgb),.12)',animation:'popIn .3s cubic-bezier(.34,1.56,.64,1)' }}>
        <div style={{ padding:'18px 20px 14px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontWeight:900,color:'var(--primary-lt)',fontSize:14,fontFamily:"'Orbitron',monospace" }}>⌨️ Shortcuts</span>
          <button onClick={onClose} style={{ background:'rgba(var(--primary-rgb),.1)',border:'1px solid rgba(var(--primary-rgb),.2)',borderRadius:12,padding:'3px 11px',cursor:'pointer',color:'var(--primary-lt)',fontFamily:'inherit',fontSize:12 }}>✕</button>
        </div>
        <div style={{ padding:'12px 20px 20px' }}>
          {shortcuts.map(([k,d]) => (
            <div key={k} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:12,color:'var(--tx2)' }}>{d}</span>
              <kbd style={{ fontSize:10,background:'rgba(var(--primary-rgb),.12)',border:'1px solid rgba(var(--primary-rgb),.24)',borderRadius:7,padding:'2px 8px',color:'var(--primary-lt)',fontFamily:"'JetBrains Mono',monospace",fontWeight:600,whiteSpace:'nowrap' }}>{k}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   CHAT ITEM
   ═══════════════════════════════════════════════ */
function ChatItem({ chat, active, onSelect, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(chat.title||'New Chat');
  const inputRef = useRef(null);
  useEffect(()=>{ if(editing){ setVal(chat.title||'New Chat'); setTimeout(()=>{inputRef.current?.focus();inputRef.current?.select();},10); } },[editing,chat.title]);
  const commit = () => { const t=val.trim(); if(t&&t!==chat.title) onRename(chat.id,t); setEditing(false); };
  return (
    <div className={`ci${active?' active':''}`} onClick={()=>!editing&&onSelect(chat.id)}>
      {editing ? (
        <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)} onBlur={commit}
          onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit();}if(e.key==='Escape'){setEditing(false);setVal(chat.title||'New Chat');}}}
          onClick={e=>e.stopPropagation()}
          style={{ flex:1,background:'rgba(var(--primary-rgb),.1)',border:'1.2px solid rgba(var(--primary-rgb),.32)',borderRadius:9,padding:'4px 9px',color:'var(--primary-lt)',fontFamily:'inherit',fontSize:12,outline:'none',minWidth:0 }}
        />
      ) : (
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:12,color:active?'var(--primary-lt)':'var(--tx2)',fontWeight:active?700:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{chat.title||'New Chat'}</div>
          <div style={{ fontSize:9,color:'var(--tx4)',marginTop:2,display:'flex',gap:5 }}>
            <span>{fmtTime(chat.updated_at)}</span><span>·</span><span>{chat.msg_count||0} msg</span>
          </div>
        </div>
      )}
      {!editing && <>
        <button className="ci-btn" onClick={e=>{e.stopPropagation();setEditing(true);}} title="Rename">✏️</button>
        <button className="ci-btn" onClick={e=>{e.stopPropagation();onDelete(chat.id);}} title="Delete" style={{ fontSize:16 }}>×</button>
      </>}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════ */
function Sidebar({ chats, activeId, onNew, onSelect, onDelete, onRename, onAbout, open, provAvail, onExport, onShortcuts }) {
  return (
    <div style={{ width:open?'var(--sw)':'0',flexShrink:0,overflow:'hidden',transition:'width .3s cubic-bezier(.4,0,.2,1)',background:'var(--sidebar-bg)',borderRight:'1px solid var(--border)',position:'relative',zIndex:50,boxShadow:open?'4px 0 28px rgba(0,0,0,.35)':'none' }}>
      <div style={{ width:'var(--sw)',height:'100%',display:'flex',flexDirection:'column',minWidth:0 }}>
        {/* Logo */}
        <div style={{ padding:'18px 16px 14px',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
          <div style={{ fontFamily:"'Orbitron',monospace",fontSize:'1.18rem',fontWeight:900,background:'linear-gradient(135deg,var(--accent),var(--primary))',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',marginBottom:3,letterSpacing:'-0.4px' }}>⚡ GoAi</div>
          <div style={{ fontSize:8.5,color:'var(--tx4)',letterSpacing:'.14em',fontWeight:500 }}>{provAvail} PROVIDERS · SDK · v7.0</div>
        </div>
        {/* New Chat */}
        <div style={{ padding:'11px 12px 6px',flexShrink:0 }}>
          <button onClick={onNew} style={{ width:'100%',background:'linear-gradient(135deg,rgba(var(--primary-rgb),.14),rgba(139,92,246,.1))',border:'1.2px solid rgba(var(--primary-rgb),.26)',borderRadius:14,padding:'11px 14px',cursor:'pointer',color:'var(--primary-lt)',fontFamily:'inherit',fontSize:12.5,fontWeight:700,display:'flex',alignItems:'center',gap:9,justifyContent:'center',transition:'all .2s',boxShadow:'0 4px 14px rgba(var(--primary-rgb),.1)' }}>
            <span style={{ fontSize:18,lineHeight:1 }}>＋</span> New Chat
          </button>
        </div>
        {/* Chat list */}
        {chats.length > 0 && <div style={{ padding:'10px 16px 4px',fontSize:8.5,color:'var(--tx3)',letterSpacing:'.12em',textTransform:'uppercase',flexShrink:0,fontWeight:700 }}>Chats ({chats.length})</div>}
        <div style={{ flex:1,overflowY:'auto',padding:'4px 10px 8px' }}>
          {!chats.length && <div style={{ color:'var(--tx4)',fontSize:11,textAlign:'center',marginTop:40,fontStyle:'italic' }}>No chats yet</div>}
          {[...chats].sort((a,b)=>b.updated_at-a.updated_at).map(c => (
            <ChatItem key={c.id} chat={c} active={c.id===activeId} onSelect={onSelect} onDelete={onDelete} onRename={onRename}/>
          ))}
        </div>
        {/* Footer */}
        <div style={{ borderTop:'1px solid var(--border)',padding:'10px 12px',flexShrink:0,display:'flex',flexDirection:'column',gap:5 }}>
          <button onClick={onExport} style={{ background:'rgba(var(--primary-rgb),.05)',border:'1px solid var(--border)',borderRadius:12,padding:'8px 13px',cursor:'pointer',color:'var(--tx3)',fontFamily:'inherit',fontSize:11.5,textAlign:'left',display:'flex',alignItems:'center',gap:8,transition:'all .2s' }}>
            📥 Export Chat
          </button>
          <div style={{ display:'flex',gap:5 }}>
            <button onClick={onAbout} style={{ flex:1,background:'rgba(var(--primary-rgb),.05)',border:'1px solid var(--border)',borderRadius:12,padding:'7px 10px',cursor:'pointer',color:'var(--tx3)',fontFamily:'inherit',fontSize:11,textAlign:'center',transition:'all .2s' }}>ℹ️ About</button>
            <button onClick={onShortcuts} style={{ flex:1,background:'rgba(var(--primary-rgb),.05)',border:'1px solid var(--border)',borderRadius:12,padding:'7px 10px',cursor:'pointer',color:'var(--tx3)',fontFamily:'inherit',fontSize:11,textAlign:'center',transition:'all .2s' }}>⌨️ Keys</button>
          </div>
          <div style={{ fontSize:8,color:'var(--tx4)',textAlign:'center' }}>Made by Arush Kumar · v7.0</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════ */
function ThemeToggle({ theme, onToggle }) {
  return (
    <button onClick={onToggle} title="Toggle theme (Ctrl+T)"
      style={{ background:'rgba(var(--primary-rgb),.08)',border:'1.5px solid rgba(var(--primary-rgb),.2)',borderRadius:20,padding:'6px 11px',cursor:'pointer',color:'var(--tx2)',fontFamily:'inherit',fontSize:14,transition:'all .25s',display:'flex',alignItems:'center',gap:5,lineHeight:1,boxShadow:'0 2px 8px rgba(var(--primary-rgb),.08)' }}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

/* ═══════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════ */
export default function App() {
  /* ── State ── */
  const [chats,       setChats]       = useState([]);
  const [activeId,    setActiveId]    = useState(null);
  const [activeMsgs,  setActiveMsgs]  = useState([]);
  const [activeMode,  setActiveMode]  = useState('fast');
  const [activePref,  setActivePref]  = useState(DEFAULT_PREF);
  const [sideOpen,    setSideOpen]    = useState(true);
  const [aboutOpen,   setAboutOpen]   = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [memOpen,     setMemOpen]     = useState(false);
  const [pv,          setPv]          = useState(null);
  const [busy,        setBusy]        = useState(false);
  const [typing,      setTyping]      = useState('');
  const [streamBuf,   setStreamBuf]   = useState('');
  const [streamPid,   setStreamPid]   = useState('');
  const [stat,        setStat]        = useState({ t:'Connecting…', c:'' });
  const [provs,       setProvs]       = useState({});
  const [inp,         setInp]         = useState('');
  const [mem,         setMem]         = useState([]);
  const [theme,       setTheme]       = useState('dark');
  const [toasts,      setToasts]      = useState([]);
  const [dcStatuses,  setDcStatuses]  = useState([]);
  const [dcElapsed,   setDcElapsed]   = useState(0);

  const chatRef  = useRef(null);
  const inpRef   = useRef(null);
  const saveTimer = useRef(null);
  const dcTimer   = useRef(null);

  /* ── Derived ── */
  const avail      = useMemo(() => Object.entries(provs).filter(([,v])=>v.available).map(([k])=>k), [provs]);
  const provAvail  = useMemo(() => Object.values(provs).filter(v=>v.available).length, [provs]);
  const dcManagers = useMemo(() => Object.entries(provs).filter(([,v])=>v.available&&v.isDCManager).map(([k])=>k), [provs]);
  const dcWorkers  = useMemo(() => Object.entries(provs).filter(([,v])=>v.available&&v.isDCWorker).map(([k])=>k),  [provs]);
  const isDC       = activeMode === 'deepcoder';
  const dc         = stat.c==='good'?'#10b981':stat.c==='bad'?'#ef4444':'#f59e0b';
  const activeTitle = chats.find(c=>c.id===activeId)?.title || 'GoAi';

  /* ── Toast helper ── */
  const toast = useCallback((msg, type='info') => {
    const id = uid();
    setToasts(p => [...p, { id, msg, type, exiting:false }]);
    setTimeout(() => setToasts(p => p.map(t => t.id===id ? {...t,exiting:true} : t)), 2200);
    setTimeout(() => setToasts(p => p.filter(t => t.id!==id)), 2500);
  }, []);

  /* ── Theme ── */
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev==='dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('goai_theme', next); } catch {}
      return next;
    });
  }, []);

  /* ── Scroll on new messages ── */
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [activeMsgs, typing, streamBuf, dcStatuses]);

  /* ── Init ── */
  useEffect(() => {
    // Theme
    try { const t=localStorage.getItem('goai_theme'); if(t) { setTheme(t); document.documentElement.setAttribute('data-theme',t); } } catch {}
    // Providers
    fetch('/api/providers').then(r=>r.json()).then(d => {
      setProvs(d);
      setStat({ t:'Ready · '+Object.values(d).filter(v=>v.available).length+' AIs', c:'good' });
    }).catch(() => setStat({ t:'⚠️ Server offline', c:'bad' }));
    // Chats
    chatAPI.list().then(cs => {
      if (cs?.length) {
        setChats(cs);
        const last = cs[0]; setActiveId(last.id);
        return chatAPI.get(last.id).then(c => { setActiveMsgs(Array.isArray(c.messages)?c.messages:[]); setActiveMode(c.mode||'fast'); setActivePref(c.pref||DEFAULT_PREF); });
      } else return createChatFn();
    }).catch(() => createChatFn());
    // Memory
    try { const s=localStorage.getItem('goai_mem'); if(s){const p=JSON.parse(s);if(Array.isArray(p))setMem(p);} } catch {}
    // Keyboard shortcuts
    const onKey = e => {
      if (e.ctrlKey||e.metaKey) {
        if (e.key==='n')    { e.preventDefault(); createChatFn(); }
        if (e.key==='/')    { e.preventDefault(); setShortcutsOpen(v=>!v); }
        if (e.key==='e')    { e.preventDefault(); handleExport(); }
        if (e.key==='k')    { e.preventDefault(); setPickerOpen(true); }
        if (e.key==='m')    { e.preventDefault(); setMemOpen(true); }
        if (e.key==='t')    { e.preventDefault(); toggleTheme(); }
      }
      if (e.key==='Escape') { setPickerOpen(false); setMemOpen(false); setAboutOpen(false); setShortcutsOpen(false); setPv(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line

  /* ── DeepCoder elapsed timer ── */
  useEffect(() => {
    if (busy && isDC && dcStatuses.length) {
      const start = Date.now() - dcElapsed;
      dcTimer.current = setInterval(() => setDcElapsed(Date.now()-start), 500);
    } else { clearInterval(dcTimer.current); if (!busy) setDcElapsed(0); }
    return () => clearInterval(dcTimer.current);
  }, [busy, isDC, dcStatuses.length]); // eslint-disable-line

  /* ── Save ── */
  const scheduleSave = useCallback((id, title, mode, pref, msgs) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const clean = msgs.filter(m=>!m.isLog&&!m.isComm&&m.role&&m.text!=null);
      chatAPI.save(id,title,mode,pref,clean).catch(console.error);
      setChats(prev => prev.map(c => c.id===id ? {...c,msg_count:clean.length,updated_at:Date.now(),title} : c));
    }, 900);
  }, []);

  /* ── Chat CRUD ── */
  const createChatFn = useCallback(async () => {
    const id=uid(), mode='fast', pref=DEFAULT_PREF;
    await chatAPI.create(id,'New Chat',mode,pref).catch(console.error);
    setChats(prev=>[{id,title:'New Chat',mode,pref,msg_count:0,created_at:Date.now(),updated_at:Date.now()},...prev]);
    setActiveId(id); setActiveMsgs([]); setActiveMode(mode); setActivePref(pref); setInp('');
  }, []);

  const selectChat = useCallback(async id => {
    if (id===activeId) { setSideOpen(false); return; }
    const c = chats.find(x=>x.id===id); if (!c) return;
    setActiveId(id);
    try { const data=await chatAPI.get(id); setActiveMsgs(Array.isArray(data.messages)?data.messages:[]); setActiveMode(data.mode||'fast'); setActivePref(data.pref||DEFAULT_PREF); }
    catch { setActiveMsgs([]); }
    setSideOpen(false);
  }, [activeId, chats]);

  const deleteChat = useCallback(async id => {
    await chatAPI.del(id).catch(console.error);
    setChats(prev => {
      const n = prev.filter(c=>c.id!==id);
      if (id===activeId) {
        if (n.length) { const f=n[0]; setActiveId(f.id); chatAPI.get(f.id).then(c=>{setActiveMsgs(Array.isArray(c.messages)?c.messages:[]);setActiveMode(c.mode||'fast');setActivePref(c.pref||DEFAULT_PREF);}).catch(()=>setActiveMsgs([])); }
        else { setActiveId(null); setActiveMsgs([]); createChatFn(); }
      }
      return n;
    });
  }, [activeId, createChatFn]);

  const renameChat = useCallback(async (id,title) => {
    setChats(prev => prev.map(c=>c.id===id?{...c,title}:c));
    if (id===activeId) scheduleSave(id,title,activeMode,activePref,activeMsgs);
    await chatAPI.rename(id,title).catch(console.error);
  }, [activeId,activeMode,activePref,activeMsgs,scheduleSave]);

  const setMode = useCallback(m => {
    setActiveMode(m);
    if (activeId) { setChats(prev=>prev.map(c=>c.id===activeId?{...c,mode:m}:c)); chatAPI.save(activeId,activeTitle,m,activePref,activeMsgs.filter(x=>!x.isLog&&!x.isComm)).catch(console.error); }
  }, [activeId,activeTitle,activePref,activeMsgs]);

  const setPref = useCallback(p => {
    setActivePref(p);
    if (activeId) { setChats(prev=>prev.map(c=>c.id===activeId?{...c,pref:p}:c)); chatAPI.save(activeId,activeTitle,activeMode,p,activeMsgs.filter(x=>!x.isLog&&!x.isComm)).catch(console.error); }
  }, [activeId,activeTitle,activeMode,activeMsgs]);

  /* ── Message helpers ── */
  const addMsg = useCallback((role, text, extra={}) => {
    const msg = { id:uid(), role, text:S(text), ...extra };
    setActiveMsgs(prev => {
      const n = [...prev, msg];
      const chat = chats.find(c=>c.id===activeId);
      const title = (chat?.title==='New Chat'&&role==='user') ? text.slice(0,46)+(text.length>46?'…':'') : chat?.title||'New Chat';
      scheduleSave(activeId, title, activeMode, activePref, n);
      if (title!==chat?.title) setChats(p=>p.map(c=>c.id===activeId?{...c,title}:c));
      return n;
    });
  }, [activeId,activeMode,activePref,chats,scheduleSave]);

  const addLog  = useCallback((label,ok,text) => setActiveMsgs(p=>[...p,{id:uid(),isLog:true,label:S(label),ok:!!ok,text:S(text)}]), []);
  const addComm = useCallback(comms => { if(Array.isArray(comms)&&comms.length) setActiveMsgs(p=>[...p,{id:uid(),isComm:true,comms}]); }, []);
  const addMem  = useCallback(m => { if(m){ setMem(prev=>{const n=[...prev,m].slice(-30);try{localStorage.setItem('goai_mem',JSON.stringify(n));}catch{}return n;}); } }, []);
  const ss      = useCallback((t,c='') => setStat({t,c}), []);
  const clearChat = useCallback(() => {
    setActiveMsgs([]);
    if (activeId) chatAPI.save(activeId,activeTitle,activeMode,activePref,[]).catch(console.error);
    ss('Cleared','good'); toast('Chat cleared');
  }, [activeId,activeTitle,activeMode,activePref,ss,toast]);

  const handleExport = useCallback(() => {
    const msgs = activeMsgs.filter(m=>!m.isLog&&!m.isComm&&m.role&&m.text);
    if (!msgs.length) { toast('Nothing to export','error'); return; }
    exportChatMD(activeTitle, msgs);
    toast('Exported as Markdown ✓','success');
  }, [activeMsgs,activeTitle,toast]);

  /* ═══════════════════════════════════════════════
     AI PIPELINES
     ═══════════════════════════════════════════════ */
  async function commsRound(task, workers) {
    const settled = await Promise.allSettled(workers.slice(0,6).map(async pid => {
      const r = RULES[pid]||RULES[DEFAULT_PREF];
      const { text } = await api(pid,`You are ${r.modelName}. In ONE sentence (max 20 words), state what YOU will specifically handle.`,[{role:'user',content:'Task: '+S(task).slice(0,240)}],90);
      return { pid, text:S(text).replace(/\n/g,' ').trim().slice(0,170) };
    }));
    return settled.filter(r=>r.status==='fulfilled'&&r.value?.pid).map(r=>r.value);
  }

  async function mgrPlan(task, workers, proposals, mgrId) {
    const mgr = mgrId||MGR_ID;
    const propText = proposals.length
      ? 'Proposals:\n'+proposals.map(p=>`${p.pid}(${RULES[p.pid]?.role||p.pid}): "${p.text}"`).join('\n')
      : 'Workers: '+workers.map(p=>`${p}(${RULES[p]?.role||p})`).join(', ');
    const q = `Task: "${S(task).slice(0,280)}"\n\n${propText}\n\nOutput ONLY: {"plan":"strategy","assignments":[{"prov":"or_minimax","subtask":"..."},...]}`;
    try {
      const { text:raw } = await api(mgr,'You are GoAi Manager. Output ONLY valid JSON.',[{role:'user',content:q}],2200);
      const m=(raw||'').match(/\{[\s\S]*?"assignments"[\s\S]*?\}/); if(!m) throw new Error();
      const p=JSON.parse(m[0]); if(!Array.isArray(p.assignments)) throw new Error();
      return p;
    } catch {
      return { plan:'Parallel fallback', assignments:workers.slice(0,6).map(w=>({prov:w,subtask:task+'\n\nYou are '+S(RULES[w]?.modelName||w)+'. Provide a COMPLETE helpful response.'})) };
    }
  }

  async function mgrReview(task, responses, mgrId) {
    const mgr = mgrId||MGR_ID;
    const listing = responses.map((r,i)=>`[${i}] ${r.label}: ${S(r.text).slice(0,200)}`).join('\n---\n');
    const q = `Task: "${S(task).slice(0,130)}"\nOutputs:\n${listing}\nJSON: {"reviews":[{"idx":0,"label":"...","complete":true,"score":8,"issue":""}],"missing":"gaps"}`;
    try { const {text:raw}=await api(mgr,'You are GoAi Manager. Output ONLY valid JSON.',[{role:'user',content:q}],1500); const m=(raw||'').match(/\{[\s\S]*?"reviews"[\s\S]*?\}/); if(!m) throw new Error(); return JSON.parse(m[0]); }
    catch { return null; }
  }

  async function mgrAssemble(task, responses, rd, hist, memSnap, mgrId, isCoding=false) {
    setTyping('🎯 Assembling final answer…');
    const mgr = mgrId||MGR_ID;
    const sorted = [...responses].sort((a,b)=>(b.score||5)-(a.score||5));
    const parts = sorted.map(r=>`### ${r.label} [${r.score||'?'}/10]\n${S(r.text).slice(0,650)}`).join('\n---\n');
    const sys = isCoding
      ? `You are GoAi Manager in DeepCoder Mode. Assemble ONE FINAL complete, runnable codebase. Close ALL \`\`\` blocks. End [COMPLETE].${getMemCtx(memSnap)}`
      : `You are GoAi Manager. Produce ONE FINAL clear, complete, helpful answer.${getMemCtx(memSnap)}`;
    const q = `Task: "${S(task).slice(0,270)}"${rd?.missing?'\nMissing: '+rd.missing:''}\n\nWorkers:\n${parts}\n\nFinal answer:`;
    try {
      const { text:final, usage } = await api(mgr,sys,[...hist.slice(-2),{role:'user',content:q.slice(0,18000)}],RULES[mgr]?.tok||6000);
      addMsg('mgr',(isCoding?'💻':'🎯')+' Manager Final Answer\n\n'+S(final),{usage});
      ss('✓ Done · '+responses.length+' workers','good');
      doMem((isCoding?'DeepCoder':'Manager')+': '+S(task).slice(0,60),isCoding?'deepcoder':'manager').then(addMem);
    } catch(e) {
      addMsg('warn','❌ Assembly: '+S(e.message));
      if (sorted.length) addMsg('mgr','🎯 Best result ('+S(sorted[0].label)+')\n\n'+S(sorted[0].text));
    }
    setTyping('');
  }

  /* ── DeepCoder Pipeline ── */
  async function runDeepCoder(p, hist, memSnap) {
    const dcMgr = dcManagers[0] || avail.find(x=>x===DC_MGR_FB) || MGR_ID;
    const workers = dcWorkers.filter(x=>x!==dcMgr&&avail.includes(x));
    const useWorkers = workers.length ? workers : avail.filter(x=>x!==dcMgr).slice(0,5);
    if (!useWorkers.length) { addMsg('warn','No DeepCoder workers available.'); ss('No workers','bad'); return; }
    // Init status panel
    setDcStatuses(useWorkers.map(pid=>({ pid, label:'Waiting…', status:'waiting' })));
    addMsg('meta',`💻 DeepCoder · Manager: ${RULES[dcMgr]?.modelName||dcMgr} · ${useWorkers.length} specialists`);
    // Proposals
    setTyping('💻 Specialists proposing architecture…');
    setDcStatuses(s=>s.map(x=>({...x,status:'thinking',label:'Proposing…'})));
    let proposals = [];
    try {
      const settled = await Promise.allSettled(useWorkers.slice(0,5).map(async pid => {
        const r = RULES[pid];
        const { text } = await api(pid,`You are ${r.modelName}. In ONE sentence (max 22 words), state the specific module you will implement.`,[{role:'user',content:'Coding task: '+S(p).slice(0,220)}],90);
        return { pid, text:S(text).replace(/\n/g,' ').trim().slice(0,180) };
      }));
      proposals = settled.filter(r=>r.status==='fulfilled'&&r.value?.pid).map(r=>r.value);
    } catch {}
    setTyping(''); if(proposals.length) addComm(proposals);
    // Plan
    setTyping('📋 Architecting modules…');
    setDcStatuses(s=>s.map(x=>({...x,status:'waiting',label:'Waiting for plan…'})));
    let assignments = useWorkers.slice(0,6).map(w=>({prov:w,subtask:`Write COMPLETE code for: "${S(p).slice(0,150)}"\nYou are ${RULES[w]?.modelName||w}. ALL code runnable. End [COMPLETE].`}));
    try {
      const propText = proposals.length ? 'Proposals:\n'+proposals.map(x=>`${x.pid}(${RULES[x.pid]?.role}): "${x.text}"`).join('\n') : 'Workers: '+useWorkers.map(x=>`${x}(${RULES[x]?.role})`).join(', ');
      const { text:planRaw } = await api(dcMgr,'You are GoAi DeepCoder Manager. Output ONLY valid JSON.',[{role:'user',content:`Coding task: "${S(p).slice(0,250)}"\n\n${propText}\n\nOutput ONLY: {"plan":"architecture","assignments":[{"prov":"gh_gpt4o","subtask":"Implement..."}]}`}],2200);
      const m=(planRaw||'').match(/\{[\s\S]*?"assignments"[\s\S]*?\}/);
      if (m) { const parsed=JSON.parse(m[0]); if(Array.isArray(parsed.assignments)&&parsed.assignments.length){ const va=parsed.assignments.filter(a=>a.prov&&avail.includes(a.prov)&&a.subtask&&a.prov!==dcMgr); if(va.length){ assignments=va; addMsg('mgr','📋 DeepCoder Architecture: '+S(parsed.plan)+'\n\n'+assignments.map(a=>`${RULES[a.prov]?.e||'·'} ${RULES[a.prov]?.modelName||a.prov}:\n  ${S(a.subtask).slice(0,80)}`).join('\n')); } } }
    } catch(e) { console.warn('DC plan:',e.message); }
    setTyping('');
    // Parallel execution with live status
    setDcStatuses(assignments.map(a=>({ pid:a.prov, label:'Writing code…', status:'thinking' })));
    setTyping(`⚙️ ${assignments.length} coding AIs writing in parallel…`);
    const settled = await Promise.allSettled(assignments.map(async (a,i) => {
      const { text:ans, usage } = await api(a.prov, buildDCSys(a.prov,memSnap), [...hist,{role:'user',content:S(a.subtask||p)}]);
      setDcStatuses(s=>s.map((x,j)=>j===i?{...x,status:'done',label:'Done ✓'}:x));
      return { prov:a.prov, label:S(RULES[a.prov]?.modelName||a.prov)+' ('+S(RULES[a.prov]?.role||'AI')+')', sub:S(a.subtask||p), text:S(ans||''), score:7, usage };
    }));
    setTyping('');
    const responses = [];
    for (const r of settled) {
      if (r.status==='fulfilled'&&r.value) { const v=r.value,chk=checkOk(v.text);v.ok=chk.ok;v.issue=chk.issue;responses.push(v);addLog(v.label+(chk.ok?'':' ⚠️ '+chk.issue),chk.ok,v.text); }
      else addMsg('warn','❌ Coder: '+S(r.reason?.message||'failed').slice(0,150));
    }
    if (!responses.length) { addMsg('warn','🚫 All coders failed.'); ss('Failed','bad'); setDcStatuses([]); return; }
    // Review
    setTyping('🔍 Reviewing code quality…');
    let rd=null; try { rd=await mgrReview(p,responses,dcMgr); } catch {}
    setTyping('');
    if (rd?.reviews&&Array.isArray(rd.reviews)) {
      addMsg('mgr','🔍 Code Review:\n'+rd.reviews.map(rv=>`• ${rv.label||'AI'}: ${rv.score||'?'}/10 ${rv.complete?'✅':'⚠️ '+S(rv.issue)}`).join('\n')+(rd.missing?'\n📌 Missing: '+rd.missing:''));
      rd.reviews.forEach(rv=>{ if(typeof rv.idx==='number'&&rv.idx<responses.length) responses[rv.idx].score=rv.score||7; });
    }
    setDcStatuses(s=>s.map(x=>({...x,status:'done',label:'Assembled ✓'})));
    await mgrAssemble(p,responses,rd,hist,memSnap,dcMgr,true);
    setTimeout(()=>setDcStatuses([]),3000);
  }

  /* ── Managed/Debate Pipeline ── */
  async function runManaged(p, hist, memSnap, isDebate) {
    const workers = avail.filter(x=>x!==MGR_ID);
    if (!workers.length) { addMsg('warn','No workers. Check API keys.'); ss('No workers','bad'); return; }
    addMsg('meta',(isDebate?'💬 Debate':'🎯 Managed')+' · Manager: '+S(RULES[MGR_ID]?.modelName||MGR_ID)+' · '+workers.length+' workers');
    setTyping('💬 AIs discussing…'); let proposals=[];
    try { proposals=await commsRound(p,workers); } catch {} setTyping(''); if(proposals.length) addComm(proposals);
    setTyping('📋 Planning…'); let plan={plan:'Parallel',assignments:[]};
    try { plan=await mgrPlan(p,workers,proposals); } catch {}
    const rawA = Array.isArray(plan?.assignments) ? plan.assignments : [];
    const va = rawA.filter(a=>a&&a.prov&&a.prov!==MGR_ID&&avail.includes(a.prov)&&a.subtask);
    const fa = va.length ? va : workers.slice(0,5).map(w=>({prov:w,subtask:p+'\n\nYou are '+S(RULES[w]?.modelName||w)+'. Give a complete, helpful answer.'}));
    addMsg('mgr','📋 Plan: '+S(plan?.plan)+'\n\n'+fa.map(a=>`${RULES[a.prov]?.e||'·'} ${RULES[a.prov]?.modelName||a.prov}:\n  ${S(a.subtask).slice(0,80)}`).join('\n'));
    setTyping('');
    setTyping(`⚙️ ${fa.length} workers responding…`);
    const settled = await Promise.allSettled(fa.map(async a=>{
      const {text:ans,usage}=await api(a.prov,buildSys(a.prov,a.subtask,memSnap),[...hist,{role:'user',content:S(a.subtask||p)}]);
      return {prov:a.prov,label:S(RULES[a.prov]?.modelName||a.prov)+' ('+S(RULES[a.prov]?.role||'AI')+')',sub:S(a.subtask||p),text:S(ans||''),score:7,usage};
    }));
    setTyping(''); const responses=[];
    for (const r of settled) {
      if(r.status==='fulfilled'&&r.value){const v=r.value,chk=checkOk(v.text);v.ok=chk.ok;v.issue=chk.issue;responses.push(v);addLog(v.label,chk.ok,v.text);}
      else addMsg('warn','❌ Worker: '+S(r.reason?.message||'failed').slice(0,160));
    }
    if (!responses.length) { addMsg('warn','🚫 All failed.'); ss('Failed','bad'); return; }
    setTyping('🔍 Reviewing…'); let rd=null;
    try { rd=await mgrReview(p,responses); } catch {} setTyping('');
    if (rd?.reviews&&Array.isArray(rd.reviews)) {
      addMsg('mgr','🔍 Review:\n'+rd.reviews.map(rv=>`• ${rv.label||'AI'}: ${rv.score||'?'}/10 ${rv.complete?'✅':'⚠️ '+S(rv.issue)}`).join('\n')+(rd.missing?'\n📌 Gap: '+rd.missing:''));
      rd.reviews.forEach(rv=>{if(typeof rv.idx==='number'&&rv.idx<responses.length)responses[rv.idx].score=rv.score||7;});
      let fc=0;
      for (const rv of rd.reviews) {
        if(fc>=2) break; if(rv.complete||typeof rv.idx!=='number'||rv.idx>=responses.length) continue;
        const resp=responses[rv.idx]; if(!resp||!avail.includes(resp.prov)) continue;
        try { setTyping('🔄 Fixing '+S(RULES[resp.prov]?.modelName||resp.prov)+'…'); const{text:fix}=await api(resp.prov,buildSys(resp.prov,resp.sub,memSnap)+'\nFix issue: "'+S(rv.issue||'incomplete')+'".',[...hist,{role:'user',content:'Fix issue "'+S(rv.issue)+'" in your response.'}]); responses[rv.idx].text+='\n[FIXED]\n'+S(fix); addMsg('mgr','🔄 '+S(RULES[resp.prov]?.modelName||resp.prov)+' fixed'); fc++; setTyping(''); }
        catch(e2) { addMsg('warn','❌ Fix: '+S(e2.message)); setTyping(''); }
      }
    }
    if (isDebate && responses.length > 1) {
      addMsg('disc','💬 Debate — AIs reviewing each other');
      for (let i=0; i<Math.min(responses.length,3); i++) {
        const rv=responses[(i+1)%responses.length], sb=responses[i];
        if(!rv||!sb||!avail.includes(rv.prov)) continue;
        try { setTyping('💬 '+S(RULES[rv.prov]?.modelName||rv.prov)+' → '+S(RULES[sb.prov]?.modelName||sb.prov)+'…'); const{text:disc}=await api(rv.prov,buildSys(rv.prov,'',memSnap)+' Structured peer review.',[...hist,{role:'user',content:'Review this response to "'+S(p).slice(0,130)+'":\n\n'+S(sb.text).slice(0,380)+'\n\n1. What\'s good\n2. What\'s wrong\n3. Your complete improved answer'}]); addMsg('disc','💬 '+S(RULES[rv.prov]?.modelName)+' reviews '+S(RULES[sb.prov]?.modelName)+':\n\n'+S(disc)); setTyping(''); }
        catch(e3) { addMsg('warn','❌ Debate: '+S(e3.message)); setTyping(''); }
      }
    }
    await mgrAssemble(p,responses,rd,hist,memSnap,MGR_ID,false);
  }

  /* ── SEND ── */
  const send = useCallback(async () => {
    const p = inp.trim(); if (!p || busy) return;
    if (!activeId) { await createChatFn(); setTimeout(()=>inpRef.current?.focus(), 100); return; }
    const hist = getHist(activeMsgs, 3);
    addMsg('user', p); setInp(''); setBusy(true); ss('Thinking…','warn');
    doMem(p,'user').then(addMem);
    const memSnap = [...mem];
    try {
      if (activeMode === 'deepcoder') {
        await runDeepCoder(p, hist, memSnap);
      } else if (activeMode==='managed'||activeMode==='debate') {
        await runManaged(p, hist, memSnap, activeMode==='debate');
      } else {
        /* Fast & Smart — stream */
        const order = [activePref, ...avail.filter(x=>x!==activePref)];
        addMsg('meta',(activeMode==='smart'?'🧠 Smart':'⚡ Fast')+' · '+S(RULES[activePref]?.modelName||activePref)+' · streaming');
        for (const pid of order) {
          if (!avail.includes(pid)) continue;
          const t0 = performance.now(); let accumulated=''; let firstChunk=true;
          try {
            setTyping((RULES[pid]?.e||'⟳')+' '+S(RULES[pid]?.modelName||pid)+'…');
            await streamApi(pid, buildSys(pid,'',memSnap), [...hist,{role:'user',content:p}], RULES[pid]?.tok||2000, chunk=>{
              if (firstChunk) { setTyping(''); firstChunk=false; }
              accumulated+=chunk; setStreamBuf(accumulated); setStreamPid(pid);
            });
            setStreamBuf(''); setStreamPid('');
            if (accumulated) {
              addMsg('ai',S(RULES[pid]?.e||'·')+' '+S(RULES[pid]?.modelName||pid)+' ('+S(RULES[pid]?.role||'AI')+')\n\n'+accumulated);
              ss('✓ '+S(RULES[pid]?.modelName||pid)+' · '+fmtDuration(performance.now()-t0),'good');
              return;
            }
            throw new Error('Empty stream');
          } catch(e) {
            setStreamBuf(''); setStreamPid(''); setTyping('');
            if (accumulated) { addMsg('ai',S(RULES[pid]?.e||'·')+' '+S(RULES[pid]?.modelName||pid)+'\n\n'+accumulated+'\n\n[⚠️ Stream interrupted]'); ss('Partial','warn'); return; }
            const em=S(e.message||'error');
            if(/quota|rate|429|limit/i.test(em)) addMsg('warn','⚠️ '+S(RULES[pid]?.modelName||pid)+': rate limited');
            else addMsg('warn','❌ '+pid+': '+em);
            if (activeMode==='fast') break;
          }
        }
        if (activeMode!=='fast') addMsg('warn','🚫 All AIs failed. Check keys.');
        ss('Done','good');
      }
    } catch(e) { addMsg('warn','🚨 '+S(e?.message||'Unexpected error')); ss('Error','bad'); }
    finally { setBusy(false); setTyping(''); setStreamBuf(''); setStreamPid(''); }
  }, [inp,busy,activeId,activeMsgs,activeMode,activePref,avail,mem,addMsg,addLog,addComm,addMem,ss,createChatFn]); // eslint-disable-line

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  const SUGGESTIONS_LIVE = isDC
    ? ['Build a REST API with auth','Create a React todo app','Write a Python scraper','Build a CLI tool in Node.js','Create an SQLite-backed Express API','Write a TypeScript utility library']
    : SUGGESTIONS;

  return (
    <div className="layout">
      {/* Background blobs */}
      <div className="bg-fx">
        <div className="blob b1"/><div className="blob b2"/><div className="blob b3"/><div className="blob b4"/>
      </div>

      {/* Sidebar */}
      <Sidebar
        chats={chats} activeId={activeId} onNew={createChatFn} onSelect={selectChat}
        onDelete={deleteChat} onRename={renameChat} onAbout={()=>setAboutOpen(true)}
        open={sideOpen} provAvail={provAvail} onExport={handleExport}
        onShortcuts={()=>setShortcutsOpen(true)}
      />

      {/* Main */}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

        {/* ── Header ── */}
        <div style={{ flexShrink:0, padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--header-bg)', backdropFilter:'blur(30px)', display:'flex', alignItems:'center', gap:10, zIndex:10, boxShadow:'0 4px 14px rgba(0,0,0,.25)' }}>
          <button onClick={()=>setSideOpen(v=>!v)} style={{ background:'rgba(var(--primary-rgb),.07)', border:'1px solid var(--border)', cursor:'pointer', color:'var(--primary-lt)', fontSize:16, padding:'5px 9px', borderRadius:11, flexShrink:0, lineHeight:1, transition:'all .2s' }}>
            {sideOpen?'◁':'≡'}
          </button>
          <div style={{ width:1.5, height:22, background:'var(--border)', flexShrink:0, borderRadius:1 }}/>
          <div style={{ minWidth:0, flex:1, overflow:'hidden' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--tx2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeTitle}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
            <ModelPickerBtn pref={activePref} provs={provs} onClick={()=>setPickerOpen(true)}/>
            <button onClick={()=>setMemOpen(true)} style={{ background:'rgba(var(--primary-rgb),.08)', border:'1px solid rgba(var(--primary-rgb),.2)', borderRadius:16, padding:'6px 11px', cursor:'pointer', color:'var(--primary-lt)', fontSize:11.5, fontFamily:'inherit', transition:'all .2s', display:'flex', alignItems:'center', gap:4, fontWeight:600 }}>
              🧠 {mem.length}
            </button>
            <ThemeToggle theme={theme} onToggle={toggleTheme}/>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:dc, flexShrink:0, background:'rgba(var(--primary-rgb),.05)', border:'1px solid var(--border)', borderRadius:13, padding:'5px 10px', fontWeight:500 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:dc, display:'inline-block', animation:busy?'pulse 1.2s ease-in-out infinite':'', boxShadow:'0 0 7px '+dc }}/>
              <span style={{ maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{stat.t}</span>
            </div>
          </div>
        </div>

        {/* ── Mode bar ── */}
        <div style={{ flexShrink:0, padding:'7px 12px', borderBottom:'1px solid var(--border)', background:'var(--header-bg)', display:'flex', gap:6, alignItems:'center', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
          {MODES.map(m => {
            const isAct=activeMode===m.k, isDCBtn=m.k==='deepcoder';
            return <button key={m.k} className={`mbtn${isAct?(isDCBtn?' dc':' on'):''}`} onClick={()=>setMode(m.k)} style={{ flex:'0 0 auto' }}>{m.l}</button>;
          })}
          {isDC && dcManagers.length > 0 && (
            <span style={{ fontSize:9, color:'#fdba74', background:'rgba(249,115,22,.1)', border:'1px solid rgba(249,115,22,.22)', borderRadius:10, padding:'4px 10px', flexShrink:0, whiteSpace:'nowrap', marginLeft:6, fontWeight:600 }}>
              🧠 {RULES[dcManagers[0]]?.modelName||dcManagers[0]} · {dcWorkers.length} workers
            </span>
          )}
        </div>

        {/* ── Chat area ── */}
        <div ref={chatRef} style={{ flex:1, overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:11 }}>

          {/* DC Status Panel */}
          {isDC && dcStatuses.length > 0 && (
            <DeepCoderPanel statuses={dcStatuses} elapsed={dcElapsed}/>
          )}

          {/* Welcome screen */}
          {activeMsgs.filter(m=>!m.isLog&&!m.isComm&&m.role).length===0 && activeMsgs.length===0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:18, textAlign:'center', padding:32 }}>
              <div style={{ fontSize:60, lineHeight:1, animation:'pulse 3.5s ease-in-out infinite' }}>{isDC?'💻':'🧩'}</div>
              <div style={{ fontFamily:"'Orbitron',monospace", fontWeight:900, fontSize:'1.5rem', background:'linear-gradient(135deg,var(--primary),var(--accent))', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent', letterSpacing:'-.4px' }}>GoAi v7</div>
              <div style={{ fontSize:12.5, color:'var(--tx3)', maxWidth:420, lineHeight:2.2 }}>
                {isDC
                  ? <><span style={{ color:'#fdba74', fontWeight:700 }}>💻 DeepCoder Mode</span> — GPT-4.1 orchestrates a specialist coding team with live status</>
                  : <>Powered by <span style={{ color:'var(--primary-lt)', fontWeight:700 }}>MiniMax M1</span> · {Object.keys(RULES).length} models · SDK-based · MongoDB<br/>Ask anything — coding, writing, math, advice, or creative work</>
                }
              </div>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap', justifyContent:'center', maxWidth:520, marginTop:4 }}>
                {SUGGESTIONS_LIVE.map(s => (
                  <button key={s} onClick={()=>{ setInp(s); inpRef.current?.focus(); }}
                    style={{ background:'rgba(var(--primary-rgb),.06)', border:'1px solid rgba(var(--primary-rgb),.18)', borderRadius:22, padding:'7px 14px', cursor:'pointer', color:'var(--primary-lt)', fontSize:11.5, fontFamily:'inherit', transition:'all .22s', fontWeight:500 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {activeMsgs.map(msg => <Bubble key={msg.id} msg={msg} onPv={(code,lang)=>setPv({code,lang})} onToast={toast}/>)}

          {/* Stream bubble */}
          {busy && streamBuf && <StreamBubble text={streamBuf} pid={streamPid}/>}

          {/* Typing */}
          {busy && typing && !streamBuf && <Typing text={typing}/>}
        </div>

        {/* ── Composer ── */}
        <div style={{ flexShrink:0, padding:'12px 14px 15px', borderTop:'1px solid var(--border)', background:'var(--composer-bg)', backdropFilter:'blur(30px)', boxShadow:'0 -4px 14px rgba(0,0,0,.22)' }}>
          <div style={{ display:'flex', gap:9, alignItems:'flex-end' }}>
            <textarea ref={inpRef} value={inp}
              onChange={e=>setInp(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} }}
              disabled={busy}
              placeholder={isDC ? '💻 Describe what to build… (DeepCoder mode — live status shown)' : 'Ask anything… Enter = send · Shift+Enter = new line · Ctrl+/ = shortcuts'}
              style={{ flex:1, background:'rgba(var(--primary-rgb),.05)', border:'1.5px solid '+(isDC?'rgba(249,115,22,.26)':'rgba(var(--primary-rgb),.22)'), borderRadius:20, padding:'11px 16px', color:'var(--tx1)', fontSize:13.5, resize:'none', minHeight:46, maxHeight:150, lineHeight:1.72, fontFamily:'inherit', outline:'none', transition:'all .22s' }}
              rows={1}
            />
            <button onClick={send} disabled={busy||!inp.trim()}
              style={{ background:busy||!inp.trim()?'rgba(var(--primary-rgb),.06)':isDC?'linear-gradient(135deg,#f97316 0%,#ef4444 100%)':'linear-gradient(135deg,var(--primary) 0%,#8b5cf6 100%)', border:'none', borderRadius:18, padding:'12px 22px', cursor:busy||!inp.trim()?'not-allowed':'pointer', color:busy||!inp.trim()?'var(--tx4)':'#fff', fontWeight:800, fontSize:17, fontFamily:'inherit', flexShrink:0, boxShadow:!busy&&inp.trim()?(isDC?'0 8px 24px rgba(249,115,22,.35)':'0 8px 24px rgba(var(--primary-rgb),.38)'):'none', transition:'all .25s cubic-bezier(.4,0,.2,1)', display:'flex', alignItems:'center', justifyContent:'center', minWidth:54 }}>
              {busy ? <span style={{ display:'inline-block', animation:'spin .7s linear infinite', fontSize:18 }}>⟳</span> : '→'}
            </button>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:7, alignItems:'center', fontSize:9.5, color:'var(--tx4)', lineHeight:1.5 }}>
            <span>GoAi v7 · {provAvail} AIs · {activeMode} · DDG→gpt-4o-mini · HuggingFace · Made by Arush Kumar</span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleExport} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx4)', fontSize:9.5, fontFamily:'inherit', padding:'2px 4px', borderRadius:5, transition:'all .18s' }} title="Export (Ctrl+E)">📥 Export</button>
              <button onClick={clearChat}     style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx4)', fontSize:9.5, fontFamily:'inherit', padding:'2px 4px', borderRadius:5, transition:'all .18s' }}>🗑 Clear</button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlays */}
      <ModelSheet   open={pickerOpen}   onClose={()=>setPickerOpen(false)}   provs={provs}    pref={activePref}  setPref={setPref}/>
      <MemDrawer    mem={mem}            open={memOpen}                        onClose={()=>setMemOpen(false)} onClear={()=>{setMem([]);try{localStorage.removeItem('goai_mem');}catch{};toast('Memory cleared');}}/>
      <PvModal      pv={pv}             onClose={()=>setPv(null)}/>
      <AboutModal   open={aboutOpen}    onClose={()=>setAboutOpen(false)}/>
      <ShortcutsModal open={shortcutsOpen} onClose={()=>setShortcutsOpen(false)}/>
      <ToastContainer toasts={toasts}/>
    </div>
  );
}
