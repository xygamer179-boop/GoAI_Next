"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from "react";

/* ─── UTILS ──────────────────────────────────────────────────────────────── */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const S = v => String(v || '');
const PREVL = new Set(['html','js','javascript','python','py','java','c','cpp','c++','ts','tsx','jsx','go','rust','php','rb','swift','kotlin','sql','bash','sh']);

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const DEFAULT_PREF = 'or_minimax';
const MGR_ID = 'groq_llama33_70b_b';
const DC_MGR_FALLBACK = 'gh_gpt41';

/* ─── MODEL REGISTRY ─────────────────────────────────────────────────────── */
const RULES = {
  /* OpenRouter */
  'or_minimax':    { role:'MiniMax',      modelName:'MiniMax M1',          prov:'OpenRouter',   s:'long context · recommended', tok:4096, c:'#6366f1', e:'🧩', group:'OpenRouter', isDCWorker:true,  isDefault:true },
  'or_llama33':    { role:'Llama Free',   modelName:'Llama 3.3 70B',       prov:'OpenRouter',   s:'free 70B powerhouse',        tok:4096, c:'#22c55e', e:'🆓', group:'OpenRouter' },
  'or_qwen3':      { role:'Qwen3',        modelName:'Qwen3 8B',            prov:'OpenRouter',   s:'compact reasoning',          tok:4096, c:'#f59e0b', e:'🐉', group:'OpenRouter' },
  'or_gemma3':     { role:'Gemma 3',      modelName:'Gemma 3 27B',         prov:'OpenRouter',   s:'Google open model',          tok:4096, c:'#84cc16', e:'💚', group:'OpenRouter' },
  'or_mistral':    { role:'Mistral',      modelName:'Mistral 7B',          prov:'OpenRouter',   s:'efficient & fast',           tok:2000, c:'#f97316', e:'🌊', group:'OpenRouter' },
  'or_phi4':       { role:'Phi-4',        modelName:'Phi-4 Reasoning',     prov:'OpenRouter',   s:'Microsoft reasoning',        tok:4096, c:'#0ea5e9', e:'🔬', group:'OpenRouter' },
  /* Groq */
  'groq_llama33_70b':     { role:'Assistant',  modelName:'Llama 3.3 70B',        prov:'Groq', s:'fast chat',               tok:2000, c:'#06b6d4', e:'⚡', group:'Groq' },
  'groq_llama33_70b_b':   { role:'Manager',    modelName:'Llama 3.3 70B',        prov:'Groq', s:'orchestration manager',   tok:6000, c:'#10b981', e:'🎯', group:'Groq', isManager:true },
  'groq_llama4_scout':    { role:'Scout',      modelName:'Llama 4 Scout 17B',    prov:'Groq', s:'fast reasoning',          tok:4096, c:'#22c55e', e:'🔭', group:'Groq' },
  'groq_llama4_maverick': { role:'Maverick',   modelName:'Llama 4 Maverick',     prov:'Groq', s:'creative · DC worker',    tok:4096, c:'#a3e635', e:'🦅', group:'Groq', isDCWorker:true },
  'groq_llama31_8b':      { role:'Quick',      modelName:'Llama 3.1 8B',         prov:'Groq', s:'instant responses',       tok:2000, c:'#67e8f9', e:'💨', group:'Groq' },
  'groq_deepseek_r1':     { role:'DeepSeek R1',modelName:'DeepSeek R1 Qwen-32B', prov:'Groq', s:'reasoning · qwen-32b',    tok:6000, c:'#60a5fa', e:'🧮', group:'Groq' },
  'groq_gemma2_9b':       { role:'Compact',    modelName:'Gemma 2 9B',           prov:'Groq', s:'efficient & concise',     tok:2000, c:'#fb923c', e:'💎', group:'Groq' },
  'groq_mixtral':         { role:'Mixture',    modelName:'Mixtral 8x7B',         prov:'Groq', s:'diverse expertise',       tok:4096, c:'#e879f9', e:'🌀', group:'Groq' },
  /* Gemini */
  'gem_31_flash_lite_k1': { role:'Flash Lite',   modelName:'Gemini 2.5 Flash Lite', prov:'Google', s:'fastest · 1M ctx', tok:8192, c:'#a78bfa', e:'⚡', group:'Gemini', isDCWorker:true },
  'gem_31_flash_lite_k2': { role:'Flash Lite K2', modelName:'Gemini 2.5 Flash Lite', prov:'Google', s:'fastest · 1M ctx', tok:8192, c:'#c4b5fd', e:'⚡', group:'Gemini' },
  'gem_31_flash_lite_k3': { role:'Flash Lite K3', modelName:'Gemini 2.5 Flash Lite', prov:'Google', s:'fastest · 1M ctx', tok:8192, c:'#ddd6fe', e:'⚡', group:'Gemini' },
  'gem_25_flash_k1':  { role:'Flash',    modelName:'Gemini 2.5 Flash',    prov:'Google', s:'multimodal · fast', tok:8192, c:'#8b5cf6', e:'✨', group:'Gemini' },
  'gem_25_flash_k2':  { role:'Flash K2', modelName:'Gemini 2.5 Flash',    prov:'Google', s:'multimodal · fast', tok:8192, c:'#a78bfa', e:'✨', group:'Gemini' },
  'gem_25_flash_k3':  { role:'Flash K3', modelName:'Gemini 2.5 Flash',    prov:'Google', s:'multimodal · fast', tok:8192, c:'#c4b5fd', e:'✨', group:'Gemini' },
  'gem_20_flash':     { role:'Flash 2.0',modelName:'Gemini 2.0 Flash',    prov:'Google', s:'fast & capable',   tok:8192, c:'#7c3aed', e:'🔥', group:'Gemini' },
  'gem_20_flash_lite':{ role:'Lite',     modelName:'Gemini 2.0 Flash Lite',prov:'Google', s:'lightest & cheapest',tok:8192,c:'#6d28d9', e:'🪶', group:'Gemini' },
  /* GitHub */
  'gh_gpt41_mini':    { role:'GPT-4.1 Mini', modelName:'GPT-4.1 Mini',         prov:'GitHub', s:'fast OpenAI model',     tok:3000, c:'#14b8a6', e:'🌐', group:'GitHub' },
  'gh_gpt4o':         { role:'GPT-4o',       modelName:'GPT-4o',               prov:'GitHub', s:'multimodal flagship',   tok:4000, c:'#0d9488', e:'🔮', group:'GitHub', isDCWorker:true },
  'gh_gpt41':         { role:'DC Manager',   modelName:'GPT-4.1',              prov:'GitHub', s:'code architect · DC mgr',tok:6000, c:'#0f766e', e:'🤖', group:'GitHub', isDCManager:true },
  'gh_o4_mini':       { role:'o4-mini',      modelName:'o4-mini',              prov:'GitHub', s:'compact reasoning',     tok:4000, c:'#115e59', e:'🧩', group:'GitHub' },
  'gh_deepseek_r1':   { role:'DeepSeek R1',  modelName:'DeepSeek R1 (GH)',     prov:'GitHub', s:'full R1 · may rate-limit',tok:8192,c:'#60a5fa', e:'🧠', group:'GitHub' },
  'gh_deepseek_v3':   { role:'DeepSeek V3',  modelName:'DeepSeek V3 (GH)',     prov:'GitHub', s:'strong coder',          tok:4096, c:'#3b82f6', e:'🔷', group:'GitHub', isDCWorker:true },
  'gh_llama33':       { role:'Llama GH',     modelName:'Llama 3.3 70B (GH)',   prov:'GitHub', s:'Meta via GitHub',       tok:4096, c:'#22c55e', e:'🦙', group:'GitHub' },
  'gh_phi4':          { role:'Phi-4 GH',     modelName:'Phi-4 (GH)',           prov:'GitHub', s:'Microsoft small model', tok:4096, c:'#0ea5e9', e:'φ',  group:'GitHub' },
  'gh_mistral_large': { role:'Mistral L',    modelName:'Mistral Large (GH)',   prov:'GitHub', s:'Mistral flagship',      tok:4096, c:'#f97316', e:'🌊', group:'GitHub' },
  'gh_cohere':        { role:'Cohere',       modelName:'Cohere R+ (GH)',       prov:'GitHub', s:'retrieval & RAG',       tok:4096, c:'#ec4899', e:'📡', group:'GitHub' },
  /* SambaNova */
  'samba_llama33': { role:'Llama SN',  modelName:'Llama 3.3 70B',    prov:'SambaNova', s:'high-throughput',         tok:4096, c:'#f97316', e:'⚙️', group:'SambaNova' },
  'samba_llama32': { role:'Llama 90B', modelName:'Llama 3.2 90B',    prov:'SambaNova', s:'vision + language',       tok:4096, c:'#fb923c', e:'👁️', group:'SambaNova' },
  'samba_qwen25':  { role:'Qwen SN',   modelName:'Qwen 2.5 72B',     prov:'SambaNova', s:'open-source powerhouse',  tok:4096, c:'#fbbf24', e:'🔶', group:'SambaNova' },
  /* Bytez */
  'bytez_qwen25':  { role:'Qwen',       modelName:'Qwen 2.5 72B',   prov:'Bytez', s:'open-source specialist',    tok:4096, c:'#84cc16', e:'🔬', group:'Bytez' },
  'bytez_llama31': { role:'Llama Bytez',modelName:'Llama 3.1 70B',  prov:'Bytez', s:'reliable baseline',         tok:4096, c:'#4ade80', e:'🦙', group:'Bytez' },
  'bytez_mistral': { role:'Mistral B',  modelName:'Mistral 7B',     prov:'Bytez', s:'fast & lightweight',        tok:4096, c:'#86efac', e:'💫', group:'Bytez' },
  /* DuckDuckGo */
  'duckduckgo': { role:'Haiku Free', modelName:'Claude Haiku', prov:'DuckDuckGo', s:'free Claude — no key needed', tok:2000, c:'#ef4444', e:'🦆', group:'DuckDuckGo', isDCWorker:true },
  /* HuggingFace */
  'hf_mistral':  { role:'Mistral HF',  modelName:'Mistral 7B Instruct', prov:'HuggingFace', s:'serverless · your HF key', tok:2048, c:'#ff9500', e:'🤗', group:'HuggingFace', hfModel:'mistralai/Mistral-7B-Instruct-v0.3' },
  'hf_zephyr':   { role:'Zephyr',      modelName:'Zephyr 7B Beta',      prov:'HuggingFace', s:'aligned chatbot',          tok:2048, c:'#ff6b35', e:'💨', group:'HuggingFace', hfModel:'HuggingFaceH4/zephyr-7b-beta' },
  'hf_phi3':     { role:'Phi-3 Mini',  modelName:'Phi-3.5 Mini',        prov:'HuggingFace', s:'Microsoft compact model',  tok:2048, c:'#ff8c00', e:'φ',  group:'HuggingFace', hfModel:'microsoft/Phi-3.5-mini-instruct' },
  'hf_gemma2':   { role:'Gemma 2 HF',  modelName:'Gemma 2 9B IT',       prov:'HuggingFace', s:'Google open · instruct',   tok:2048, c:'#ffa500', e:'🌿', group:'HuggingFace', hfModel:'google/gemma-2-9b-it' },
  'hf_qwen25':   { role:'Qwen HF',     modelName:'Qwen2.5 7B Instruct', prov:'HuggingFace', s:'Alibaba open model',       tok:2048, c:'#ffb347', e:'🐉', group:'HuggingFace', hfModel:'Qwen/Qwen2.5-7B-Instruct' },
};

const GROUP_COLORS = {
  OpenRouter:'#6366f1', Groq:'#06b6d4', Gemini:'#8b5cf6',
  GitHub:'#14b8a6', SambaNova:'#f97316', Bytez:'#84cc16',
  DuckDuckGo:'#ef4444', HuggingFace:'#ff9500'
};
const GROUP_ORDER = ['OpenRouter','Groq','Gemini','GitHub','SambaNova','Bytez','DuckDuckGo','HuggingFace'];

/* ─── SYSTEM PROMPT BUILDERS ─────────────────────────────────────────────── */
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
  if (/\/\/\s*(rest|todo|continue|implement|add more)/i.test(t)) return { ok:false, issue:'placeholder comment' };
  return { ok:true, issue:'' };
};

const getHist = (msgs, n=3) =>
  msgs.filter(m => m.role && (m.role==='user'||m.role==='ai') && m.text)
    .slice(-(n*2))
    .map(m => ({ role: m.role==='ai'?'assistant':'user', content: S(m.text).slice(0,600) }));

/* ─── API LAYER ──────────────────────────────────────────────────────────── */
async function callHFDirect(pid, sys, msgs, tok, hfKey) {
  const r = RULES[pid];
  if (!r?.hfModel) throw new Error('Not an HF model');
  if (!hfKey) throw new Error('HuggingFace API key required — click ⚙️ to set');
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${r.hfModel}/v1/chat/completions`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: r.hfModel,
        messages: [{ role:'system', content: sys }, ...msgs],
        max_tokens: tok || 2048,
        temperature: 0.7,
        stream: false
      })
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || data.error || 'HF API error ' + response.status);
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty response from HuggingFace');
  return text;
}

async function api(pid, sys, msgs, tok, hfKey) {
  if (RULES[pid]?.group === 'HuggingFace') {
    return callHFDirect(pid, sys, msgs, tok, hfKey);
  }
  const r = await fetch('/api/chat', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ provider:pid, systemPrompt:S(sys).slice(0,12000), messages:(msgs||[]).map(m=>({role:m.role,content:S(m.content).slice(0,18000)})), maxTokens:tok||RULES[pid]?.tok||2000 })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
  if (!d.text) throw new Error('Empty from ' + pid);
  return d.text;
}

async function streamApi(pid, sys, msgs, tok, onChunk, hfKey) {
  if (RULES[pid]?.group === 'HuggingFace') {
    const text = await callHFDirect(pid, sys, msgs, tok, hfKey);
    onChunk(text);
    return;
  }
  const r = await fetch('/api/stream', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ provider:pid, systemPrompt:S(sys).slice(0,12000), messages:(msgs||[]).map(m=>({role:m.role,content:S(m.content).slice(0,18000)})), maxTokens:tok||RULES[pid]?.tok||2000 })
  });
  if (!r.ok) { let e='HTTP '+r.status; try{const d=await r.json();e=d.error||e;}catch{} throw new Error(e); }
  if (!r.body) throw new Error('No response body');
  const reader = r.body.getReader(), dec = new TextDecoder(); let buf='';
  while (true) {
    const {done,value} = await reader.read(); if (done) break;
    buf += dec.decode(value,{stream:true});
    const lines = buf.split('\n'); buf = lines.pop()||'';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const pl = line.slice(6).trim(); if (pl==='[DONE]') return;
      try { const d=JSON.parse(pl); if(d.error) throw new Error(d.error); if(d.text) onChunk(d.text); }
      catch(e) { if(e.message&&!e.message.includes('JSON')) throw e; }
    }
  }
}

async function doMem(prompt, src) {
  try {
    const r = await fetch('/api/memory', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({prompt: S(prompt).slice(0,500)}) });
    const d = await r.json();
    if (d?.summary) return { q:d.summary, src:src||'user', t:Date.now() };
  } catch {}
  return null;
}

/* ─── CHAT API ───────────────────────────────────────────────────────────── */
const chatAPI = {
  list:   ()       => fetch('/api/chats').then(r=>r.json()),
  get:    id       => fetch('/api/chats/'+id).then(r=>r.json()),
  create: (id,title,mode,pref) => fetch('/api/chats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,title,mode,pref,messages:[]})}),
  save:   (id,title,mode,pref,msgs) => fetch('/api/chats/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,mode,pref,messages:msgs})}),
  rename: (id,title) => fetch('/api/chats/'+id+'/rename',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title})}),
  del:    id       => fetch('/api/chats/'+id,{method:'DELETE'})
};

/* ─── TOAST CONTEXT ──────────────────────────────────────────────────────── */
const ToastCtx = createContext(null);
const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type='info', dur=3000) => {
    const id = uid();
    setToasts(p => [...p, { id, msg, type, dur }]);
    setTimeout(() => {
      setToasts(p => p.map(t => t.id===id ? {...t, out:true} : t));
      setTimeout(() => setToasts(p => p.filter(t => t.id!==id)), 350);
    }, dur);
  }, []);
  const icons = { success:'✅', error:'❌', warn:'⚠️', info:'💡', copy:'📋' };
  const colors = { success:'rgba(16,185,129,.15)', error:'rgba(239,68,68,.15)', warn:'rgba(249,115,22,.15)', info:'rgba(99,102,241,.12)', copy:'rgba(6,182,212,.12)' };
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type} ${t.out?'out':''}`} style={{background:colors[t.type]||colors.info}}>
            <span style={{fontSize:14,flexShrink:0}}>{icons[t.type]||'ℹ️'}</span>
            <span style={{fontSize:12,color:'var(--text-primary)',flex:1}}>{t.msg}</span>
            <div className="toast-progress"/>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ─── PARSE PARTS ────────────────────────────────────────────────────────── */
function parseParts(txt) {
  const str = S(txt); if (!str) return [{ t:'txt', c:'' }];
  const rx = /```(\w*)\n([\s\S]*?)```/g;
  const pts = []; let li=0, m;
  while ((m=rx.exec(str))!==null) {
    if (m.index > li) pts.push({ t:'txt', c:str.slice(li,m.index) });
    pts.push({ t:'code', l:m[1]||'', c:m[2]||'' });
    li = rx.lastIndex;
  }
  if (li < str.length) pts.push({ t:'txt', c:str.slice(li) });
  return pts.length ? pts : [{ t:'txt', c:str }];
}

/* ─── MESSAGE CONTENT ────────────────────────────────────────────────────── */
function MsgContent({ text, onPv, searchQ }) {
  const [cpd, setCpd] = useState({});
  const cp = (i, c) => { try{navigator.clipboard.writeText(c||'');}catch{} setCpd(p=>({...p,[i]:1})); setTimeout(()=>setCpd(p=>({...p,[i]:0})),1400); };
  const highlight = (str) => {
    if (!searchQ || !str) return str;
    const parts = str.split(new RegExp(`(${searchQ.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'));
    return parts.map((p, i) => p.toLowerCase()===searchQ.toLowerCase() ? <mark key={i}>{p}</mark> : p);
  };
  return (
    <div>
      {parseParts(text).map((p,i) => p.t==='txt'
        ? <div key={i} style={{whiteSpace:'pre-wrap',lineHeight:1.85,wordBreak:'break-word',fontSize:13.5}}>{highlight(p.c)}</div>
        : <div key={i} style={{margin:'10px 0'}}>
            <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:5}}>
              <span style={{fontSize:9,background:'rgba(var(--primary-rgb),.12)',border:'1px solid rgba(var(--primary-rgb),.22)',borderRadius:6,padding:'1px 7px',color:'var(--primary-light)',letterSpacing:'.04em'}}>{p.l||'code'}</span>
              <button onClick={()=>cp(i,p.c)} style={{background:'rgba(var(--primary-rgb),.07)',border:'1px solid rgba(var(--primary-rgb),.18)',borderRadius:10,padding:'2px 9px',fontSize:9,cursor:'pointer',color:'var(--primary-light)',fontFamily:'inherit',transition:'all .15s'}}>{cpd[i]?'✅':'📋 copy'}</button>
              {PREVL.has((p.l||'').toLowerCase())&&onPv&&<button onClick={()=>onPv(p.c,p.l)} style={{background:'rgba(6,182,212,.07)',border:'1px solid rgba(6,182,212,.2)',borderRadius:10,padding:'2px 9px',fontSize:9,cursor:'pointer',color:'#67e8f9',fontFamily:'inherit',transition:'all .15s'}}>▶ preview</button>}
            </div>
            <pre style={{background:'rgba(1,3,12,.97)',border:'1px solid rgba(var(--primary-rgb),.12)',borderRadius:14,padding:'14px 16px',overflowX:'auto',lineHeight:1.65}}>
              <code style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:'#a5b4fc'}}>{p.c}</code>
            </pre>
          </div>
      )}
    </div>
  );
}

/* ─── WORKER LOG ─────────────────────────────────────────────────────────── */
function WorkerLog({ label, ok, text, onPv }) {
  const [open, setOpen] = useState(false);
  return (
    <details style={{border:'1px solid rgba(var(--primary-rgb),.09)',borderRadius:12,marginBottom:3,alignSelf:'flex-start',maxWidth:'96%',overflow:'hidden'}} onToggle={e=>setOpen(e.currentTarget.open)}>
      <summary style={{padding:'6px 13px',cursor:'pointer',display:'flex',alignItems:'center',gap:7,fontSize:11,background:open?'rgba(var(--primary-rgb),.06)':'transparent',userSelect:'none',color:'var(--text-muted)'}}>
        <span>{ok?'✅':'⚠️'}</span>
        <b style={{color:'var(--primary-light)',fontSize:10.5}}>Worker:</b>
        <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label||'AI'}</span>
        <span style={{fontSize:8,opacity:.24}}>{open?'▲':'▼'}</span>
      </summary>
      {open&&<div style={{padding:'10px 13px',borderTop:'1px solid rgba(var(--primary-rgb),.07)',maxHeight:300,overflowY:'auto',fontSize:13}}><MsgContent text={text||''} onPv={onPv}/></div>}
    </details>
  );
}

/* ─── COMM LOG ───────────────────────────────────────────────────────────── */
function CommLog({ comms }) {
  const [open, setOpen] = useState(true);
  if (!Array.isArray(comms)||!comms.length) return null;
  return (
    <details open={open} style={{border:'1px solid rgba(245,158,11,.13)',borderRadius:12,marginBottom:3,alignSelf:'flex-start',maxWidth:'96%',overflow:'hidden'}} onToggle={e=>setOpen(e.currentTarget.open)}>
      <summary style={{padding:'6px 13px',cursor:'pointer',display:'flex',alignItems:'center',gap:7,fontSize:11,background:'rgba(245,158,11,.04)',userSelect:'none',color:'#f59e0b'}}>
        <b>💬 AI Discussion ({comms.length})</b>
        <span style={{fontSize:8,opacity:.34,marginLeft:'auto'}}>{open?'▲':'▼'}</span>
      </summary>
      <div style={{padding:'10px 13px',borderTop:'1px solid rgba(245,158,11,.08)',display:'flex',flexDirection:'column',gap:8}}>
        {comms.map((c,i)=>{ const r=c?.pid?RULES[c.pid]:null; return (
          <div key={i} style={{display:'flex',gap:9,alignItems:'flex-start'}}>
            <span style={{fontSize:16,flexShrink:0,lineHeight:1.4}}>{r?.e||'·'}</span>
            <div>
              <span style={{fontSize:10,color:'#fbbf24',fontWeight:700}}>{r?.modelName||S(c?.pid)||'AI'} </span>
              <span style={{fontSize:9,color:'var(--text-muted)'}}>({r?.role||'worker'})</span>
              <div style={{fontSize:12.5,color:'var(--text-secondary)',lineHeight:1.6,marginTop:3,fontStyle:'italic'}}>"{S(c?.text)}"</div>
            </div>
          </div>
        );})}
      </div>
    </details>
  );
}

/* ─── STREAM BUBBLE ──────────────────────────────────────────────────────── */
function StreamBubble({ text, pid }) {
  const r = RULES[pid] || RULES[DEFAULT_PREF];
  return (
    <div style={{maxWidth:'94%',alignSelf:'flex-start',animation:'msgIn .35s cubic-bezier(.34,1.56,.64,1)'}}>
      <div style={{padding:'13px 16px',borderRadius:'6px 22px 22px 22px',background:'rgba(var(--primary-rgb),.07)',border:'1.2px solid rgba(var(--primary-rgb),.2)',lineHeight:1.85,boxShadow:'0 4px 20px rgba(var(--primary-rgb),.1)'}}>
        <div style={{fontSize:9.5,marginBottom:8,display:'flex',alignItems:'center',gap:6,fontWeight:600}}>
          <span style={{fontSize:15}}>{r.e}</span>
          <span style={{color:r.c||'var(--text-muted)',fontWeight:700}}>{r.modelName||pid}</span>
          <span style={{color:'var(--text-muted)',fontSize:8.5,animation:'pulse 1.5s ease infinite'}}>● streaming</span>
        </div>
        <MsgContent text={text}/>
        <span className="scur"/>
      </div>
    </div>
  );
}

/* ─── MODEL PICKER BUTTON ────────────────────────────────────────────────── */
function ModelPickerBtn({ pref, provs, onClick }) {
  const cur = RULES[pref] || {};
  const av = provs[pref]?.available;
  const isDefault = pref===DEFAULT_PREF;
  return (
    <button onClick={onClick} style={{display:'flex',alignItems:'center',gap:7,background:isDefault?'linear-gradient(135deg,rgba(var(--primary-rgb),.14),rgba(139,92,246,.1))':'rgba(var(--primary-rgb),.07)',border:'1.2px solid '+(isDefault?'rgba(var(--primary-rgb),.3)':'rgba(var(--primary-rgb),.18)'),borderRadius:20,padding:'6px 12px 6px 9px',cursor:'pointer',color:'var(--primary-light)',fontFamily:'inherit',flexShrink:0,maxWidth:200,transition:'all .2s',fontWeight:isDefault?600:500}}>
      <span style={{width:7,height:7,borderRadius:'50%',background:av?'#10b981':'var(--text-muted)',flexShrink:0,transition:'all .3s',boxShadow:av?'0 0 8px rgba(16,185,129,.5)':'none'}}/>
      <span style={{fontSize:16,lineHeight:1,flexShrink:0}}>{cur.e||'·'}</span>
      <div style={{minWidth:0,textAlign:'left'}}>
        <div style={{fontSize:11.5,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cur.role||pref}</div>
        <div style={{fontSize:8,opacity:.45,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cur.modelName||''}</div>
      </div>
      <span style={{fontSize:9,opacity:.3,flexShrink:0}}>▾</span>
    </button>
  );
}

/* ─── MODEL SHEET ────────────────────────────────────────────────────────── */
function ModelSheet({ open, onClose, provs, pref, setPref, hfKey, onSetHFKey }) {
  const [q, setQ] = useState('');
  const [activeGroup, setActiveGroup] = useState('all');
  if (!open) return null;
  const avCount = Object.values(provs).filter(v=>v.available).length;
  const groups = {};
  for (const [pid, info] of Object.entries(provs)) {
    const r = RULES[pid]; if (!r) continue;
    const g = r.group||'Other';
    const ql = q.toLowerCase();
    if (ql && !r.modelName?.toLowerCase().includes(ql) && !r.role?.toLowerCase().includes(ql) && !g.toLowerCase().includes(ql) && !r.s?.toLowerCase().includes(ql)) continue;
    if (activeGroup !== 'all' && g !== activeGroup) continue;
    if (!groups[g]) groups[g] = [];
    groups[g].push({ pid, info, r });
  }
  return (
    <div style={{position:'fixed',inset:0,zIndex:9990,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.82)',backdropFilter:'blur(10px)'}}/>
      <div style={{position:'relative',background:'var(--bg-secondary)',borderTop:'2px solid rgba(var(--primary-rgb),.3)',borderRadius:'28px 28px 0 0',maxHeight:'90vh',display:'flex',flexDirection:'column',animation:'slideUp .32s cubic-bezier(.34,1.56,.64,1)',boxShadow:'0 -24px 60px var(--shadow)'}}>
        <div style={{width:44,height:5,background:'rgba(var(--primary-rgb),.25)',borderRadius:3,margin:'12px auto 0',flexShrink:0}}/>
        <div style={{padding:'12px 16px 10px',flexShrink:0,borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div>
              <div style={{fontWeight:900,color:'var(--primary-light)',fontSize:15,fontFamily:"'Orbitron',monospace"}}>Select Model</div>
              <div style={{fontSize:9,color:'var(--text-muted)',marginTop:2}}>{avCount}/{Object.keys(provs).length} available · {hfKey ? '🤗 HF connected' : 'Set HF key for more models'}</div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={onSetHFKey} title="HuggingFace Settings" style={{background:'rgba(255,149,0,.1)',border:'1px solid rgba(255,149,0,.3)',borderRadius:12,padding:'5px 10px',cursor:'pointer',color:'#ffb347',fontSize:11,fontFamily:'inherit',transition:'all .2s'}}>🤗 HF Key</button>
              <button onClick={onClose} style={{background:'rgba(var(--primary-rgb),.09)',border:'1px solid rgba(var(--primary-rgb),.22)',borderRadius:12,padding:'5px 12px',cursor:'pointer',color:'var(--primary-light)',fontSize:12,fontFamily:'inherit',fontWeight:600}}>✕</button>
            </div>
          </div>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search models…" style={{width:'100%',background:'var(--card-bg)',border:'1.2px solid var(--glass-border)',borderRadius:13,padding:'8px 12px',color:'var(--text-primary)',fontSize:12.5,fontFamily:'inherit',outline:'none',fontWeight:500}}/>
          <div style={{display:'flex',gap:5,marginTop:8,overflowX:'auto',paddingBottom:2}}>
            {['all',...GROUP_ORDER].map(g=>(
              <button key={g} onClick={()=>setActiveGroup(g)} style={{flexShrink:0,background:activeGroup===g?'rgba(var(--primary-rgb),.2)':'rgba(var(--primary-rgb),.05)',border:'1px solid '+(activeGroup===g?'rgba(var(--primary-rgb),.4)':'rgba(var(--primary-rgb),.12)'),borderRadius:10,padding:'3px 10px',cursor:'pointer',color:activeGroup===g?'var(--primary-light)':'var(--text-secondary)',fontSize:9.5,fontFamily:'inherit',fontWeight:600,transition:'all .2s',whiteSpace:'nowrap'}}>{g==='all'?'All':g}</button>
            ))}
          </div>
        </div>
        <div style={{overflowY:'auto',padding:'6px 0 60px'}}>
          {GROUP_ORDER.map(g => {
            const items = groups[g]; if (!items?.length) return null;
            return (
              <div key={g}>
                <div className="grp-lbl" style={{color:GROUP_COLORS[g]||'var(--text-muted)'}}>{g} <span style={{opacity:.5,fontSize:'8px'}}>({items.length})</span></div>
                <div style={{padding:'0 10px',display:'flex',flexDirection:'column',gap:3}}>
                  {items.map(({pid,info,r})=>{
                    const sel=pref===pid, isDef=pid===DEFAULT_PREF;
                    return (
                      <button key={pid} onClick={()=>{setPref(pid);onClose();setQ('');}}
                        style={{display:'flex',alignItems:'center',gap:10,background:sel?'rgba(var(--primary-rgb),.18)':isDef?'rgba(var(--primary-rgb),.07)':'rgba(var(--primary-rgb),.02)',border:'1.2px solid '+(sel?'rgba(var(--primary-rgb),.45)':isDef?'rgba(var(--primary-rgb),.22)':'var(--border)'),borderRadius:14,padding:'10px 12px',cursor:'pointer',textAlign:'left',fontFamily:'inherit',width:'100%',transition:'all .22s',boxShadow:sel?'0 4px 14px rgba(var(--primary-rgb),.14)':'none'}}>
                        <span style={{width:7,height:7,borderRadius:'50%',background:info.available?'#10b981':'var(--text-muted)',boxShadow:info.available?'0 0 10px rgba(16,185,129,.4)':'none',flexShrink:0}}/>
                        <span style={{fontSize:20,lineHeight:1,flexShrink:0,width:26,textAlign:'center'}}>{r.e||'·'}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                            <span style={{fontSize:12,fontWeight:sel?700:600,color:sel?'var(--primary-light)':'var(--text-primary)'}}>{r.role||pid}</span>
                            {isDef&&<span style={{fontSize:7,background:'rgba(var(--primary-rgb),.2)',borderRadius:5,padding:'1px 5px',color:'var(--primary-light)',fontWeight:700}}>DEFAULT</span>}
                            {info.isManager&&<span style={{fontSize:7,background:'rgba(16,185,129,.12)',borderRadius:5,padding:'1px 5px',color:'#6ee7b7',fontWeight:700}}>MGR</span>}
                            {info.isDCManager&&<span style={{fontSize:7,background:'rgba(96,165,250,.14)',borderRadius:5,padding:'1px 5px',color:'#93c5fd',fontWeight:700}}>DC-MGR</span>}
                            {info.isDCWorker&&<span style={{fontSize:7,background:'rgba(249,115,22,.14)',borderRadius:5,padding:'1px 5px',color:'#fdba74',fontWeight:700}}>DC-WRK</span>}
                            {r.group==='HuggingFace'&&<span style={{fontSize:7,background:'rgba(255,149,0,.15)',borderRadius:5,padding:'1px 5px',color:'#ffb347',fontWeight:700}}>HF</span>}
                          </div>
                          <div style={{fontSize:9.5,marginTop:2}}><span style={{color:r.c||'var(--text-muted)',fontWeight:600}}>{r.modelName||pid}</span><span style={{color:'var(--text-muted)',fontSize:8.5}}> · {r.prov||''}</span></div>
                          <div style={{fontSize:8.5,color:'var(--text-muted)',marginTop:1.5}}>{r.s||''}</div>
                        </div>
                        {sel&&<span style={{color:'var(--primary-light)',fontSize:14,flexShrink:0,fontWeight:700}}>✓</span>}
                        {!info.available&&<span style={{fontSize:8,color:'var(--text-muted)',flexShrink:0,background:'rgba(var(--primary-rgb),.05)',borderRadius:6,padding:'2px 6px',fontWeight:500}}>no key</span>}
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

/* ─── HF SETTINGS MODAL ──────────────────────────────────────────────────── */
function HFSettingsModal({ open, onClose, hfKey, onSave }) {
  const [val, setVal] = useState(hfKey||'');
  useEffect(()=>{ if(open) setVal(hfKey||''); },[open,hfKey]);
  if (!open) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9997,padding:20,animation:'fadeIn .2s ease'}}>
      <div style={{background:'var(--bg-secondary)',border:'1px solid rgba(255,149,0,.3)',borderRadius:24,width:'100%',maxWidth:400,overflow:'hidden',boxShadow:'0 0 60px rgba(255,149,0,.15)'}}>
        <div style={{background:'linear-gradient(135deg,rgba(255,149,0,.12),rgba(255,107,53,.08))',padding:'22px 24px',borderBottom:'1px solid rgba(255,149,0,.15)'}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:'1.1rem',fontWeight:900,color:'#ffb347',marginBottom:4}}>🤗 HuggingFace API Key</div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>Enables {Object.values(RULES).filter(r=>r.group==='HuggingFace').length} HF models · Stored locally · Never sent to server</div>
        </div>
        <div style={{padding:'20px 24px'}}>
          <div style={{fontSize:10.5,color:'var(--text-secondary)',marginBottom:8}}>Get your key at <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" style={{color:'#ffb347'}}>huggingface.co/settings/tokens</a></div>
          <input
            type="password"
            value={val}
            onChange={e=>setVal(e.target.value)}
            placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxx"
            style={{width:'100%',background:'var(--card-bg)',border:'1.5px solid rgba(255,149,0,.25)',borderRadius:12,padding:'10px 14px',color:'var(--text-primary)',fontSize:13,fontFamily:"'JetBrains Mono',monospace",outline:'none'}}
          />
          <div style={{fontSize:9.5,color:'var(--text-muted)',marginTop:7}}>Models: Mistral 7B, Zephyr 7B, Phi-3.5 Mini, Gemma 2 9B, Qwen2.5 7B</div>
          <div style={{display:'flex',gap:9,marginTop:16}}>
            <button onClick={()=>{onSave(val.trim());onClose();}} style={{flex:1,background:'linear-gradient(135deg,rgba(255,149,0,.2),rgba(255,107,53,.15))',border:'1px solid rgba(255,149,0,.35)',borderRadius:14,padding:'11px',cursor:'pointer',color:'#ffb347',fontSize:12,fontFamily:'inherit',fontWeight:700,transition:'all .2s'}}>Save Key</button>
            {hfKey&&<button onClick={()=>{onSave('');onClose();}} style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:14,padding:'11px 18px',cursor:'pointer',color:'#fca5a5',fontSize:11,fontFamily:'inherit',transition:'all .2s'}}>Clear</button>}
            <button onClick={onClose} style={{background:'rgba(var(--primary-rgb),.06)',border:'1px solid var(--glass-border)',borderRadius:14,padding:'11px 18px',cursor:'pointer',color:'var(--text-secondary)',fontSize:11,fontFamily:'inherit',transition:'all .2s'}}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── PREVIEW MODAL ──────────────────────────────────────────────────────── */
function PvModal({ pv, onClose }) {
  if (!pv) return null;
  const { code, lang } = pv; const l = (lang||'').toLowerCase();
  const pm = { python:'3', py:'3', java:'java', c:'c', cpp:'cpp', 'c++':'cpp' };
  const jsDoc = `<!DOCTYPE html><html><head><style>body{font-family:'JetBrains Mono',monospace;font-size:12px;padding:14px;background:#06080f;color:#d4d4d4}div{margin:3px 0}.e{color:#f48771}.w{color:#fcd34d}</style></head><body><div id="o"></div><script>const _o=document.getElementById('o');const _p=(s,c)=>{const d=document.createElement('div');d.className=c||'';d.textContent=typeof s==='object'?JSON.stringify(s,null,2):String(s);_o.appendChild(d);};console.log=(...a)=>_p(a.join(' '));console.warn=(...a)=>_p(a.join(' '),'w');console.error=(...a)=>_p(a.join(' '),'e');try{${code||''}}catch(e){_p('Error: '+e.message,'e');}<\/script></body></html>`;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.95)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9995,padding:12,animation:'fadeIn .18s ease'}}>
      <div style={{background:'var(--bg-secondary)',border:'1px solid rgba(var(--primary-rgb),.28)',borderRadius:20,width:'100%',maxWidth:980,height:'88vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 0 60px rgba(var(--primary-rgb),.12)'}}>
        <div style={{padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          <span style={{fontWeight:700,color:'var(--primary-light)',fontSize:13,fontFamily:"'Orbitron',monospace"}}>▶ {(lang||'').toUpperCase()||'CODE'} Preview</span>
          <button onClick={onClose} style={{background:'rgba(var(--primary-rgb),.09)',border:'1px solid rgba(var(--primary-rgb),.22)',borderRadius:14,padding:'3px 13px',cursor:'pointer',color:'var(--primary-light)',fontFamily:'inherit',fontSize:12}}>✕</button>
        </div>
        <div style={{flex:1,overflow:'hidden'}}>
          {l==='html'&&<iframe style={{width:'100%',height:'100%',border:'none'}} sandbox="allow-scripts allow-same-origin allow-forms" srcDoc={code||''}/>}
          {(l==='js'||l==='javascript')&&<iframe style={{width:'100%',height:'100%',border:'none'}} sandbox="allow-scripts" srcDoc={jsDoc}/>}
          {pm[l]&&<iframe style={{width:'100%',height:'100%',border:'none'}} src={`https://pythontutor.com/iframe-embed.html#code=${encodeURIComponent(code||'')}&py=${pm[l]}&curInstr=0`}/>}
          {!pm[l]&&l!=='html'&&l!=='js'&&l!=='javascript'&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted)',flexDirection:'column',gap:12}}><span style={{fontSize:40}}>🔍</span><span style={{fontSize:13}}>No preview for {lang}</span></div>}
        </div>
      </div>
    </div>
  );
}

/* ─── MEMORY DRAWER ──────────────────────────────────────────────────────── */
function MemDrawer({ mem, open, onClose, onClear }) {
  return (
    <>
      {open&&<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9980,animation:'fadeIn .15s ease'}}/>}
      <div style={{position:'fixed',right:0,top:0,bottom:0,width:292,background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRight:'none',borderRadius:'18px 0 0 18px',zIndex:9981,transform:open?'translateX(0)':'translateX(100%)',transition:'transform .28s cubic-bezier(.4,0,.2,1)',display:'flex',flexDirection:'column',boxShadow:'-8px 0 40px var(--shadow)'}}>
        <div style={{padding:'13px 14px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontWeight:900,color:'var(--primary-light)',fontSize:13,fontFamily:"'Orbitron',monospace"}}>🧠 Memory ({mem.length})</span>
          <div style={{display:'flex',gap:5}}>
            <button onClick={onClear} style={{background:'rgba(239,68,68,.09)',border:'1px solid rgba(239,68,68,.22)',borderRadius:12,padding:'2px 10px',cursor:'pointer',color:'#fca5a5',fontSize:10,fontFamily:'inherit'}}>🗑</button>
            <button onClick={onClose} style={{background:'rgba(var(--primary-rgb),.09)',border:'1px solid rgba(var(--primary-rgb),.22)',borderRadius:12,padding:'2px 10px',cursor:'pointer',color:'var(--primary-light)',fontSize:10,fontFamily:'inherit'}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:9,display:'flex',flexDirection:'column',gap:5}}>
          {!mem.length&&<p style={{color:'var(--text-muted)',fontStyle:'italic',textAlign:'center',marginTop:40,fontSize:12}}>No memories yet.</p>}
          {mem.slice().reverse().map((m,i)=>(
            <div key={i} style={{background:'var(--glass)',border:'1px solid var(--glass-border)',borderRadius:10,padding:'7px 10px'}}>
              <div style={{display:'flex',gap:4,marginBottom:3,alignItems:'center'}}>
                <span style={{fontSize:8,background:'rgba(var(--primary-rgb),.14)',borderRadius:5,padding:'1px 6px',color:'var(--primary-light)'}}>{m?.src||'?'}</span>
                <span style={{fontSize:8,color:'var(--text-muted)',marginLeft:'auto'}}>{m?.t?new Date(m.t).toLocaleTimeString():''}</span>
              </div>
              <p style={{fontSize:11.5,color:'var(--text-secondary)',lineHeight:1.55}}>{m?.q||''}</p>
            </div>
          ))}
        </div>
        <div style={{padding:'6px 12px',borderTop:'1px solid var(--border)',fontSize:8.5,color:'var(--text-muted)',textAlign:'center'}}>Anti-Gajini Quick Memory Reference</div>
      </div>
    </>
  );
}

/* ─── SEARCH DRAWER ──────────────────────────────────────────────────────── */
function SearchDrawer({ open, onClose, msgs, onJump }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    if (!q.trim() || !open) return [];
    const ql = q.toLowerCase();
    return msgs.filter(m => m.text && m.text.toLowerCase().includes(ql) && !m.isLog && !m.isComm)
      .map(m => ({ ...m, snippet: (() => { const idx=m.text.toLowerCase().indexOf(ql); return m.text.slice(Math.max(0,idx-40), idx+80); })() }));
  }, [q, msgs, open]);
  const ROLE_ICONS = { user:'👤', ai:'🤖', mgr:'🎯', disc:'💬', warn:'⚠️', meta:'ℹ️' };
  return (
    <>
      {open&&<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9983,animation:'fadeIn .15s ease'}}/>}
      <div style={{position:'fixed',left:0,top:0,bottom:0,width:320,background:'var(--bg-secondary)',border:'1px solid var(--border)',borderLeft:'none',borderRadius:'0 18px 18px 0',zIndex:9984,transform:open?'translateX(0)':'translateX(-100%)',transition:'transform .28s cubic-bezier(.4,0,.2,1)',display:'flex',flexDirection:'column',boxShadow:'8px 0 40px var(--shadow)'}}>
        <div style={{padding:'13px 14px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontWeight:900,color:'var(--primary-light)',fontSize:13,fontFamily:"'Orbitron',monospace"}}>🔍 Search</span>
          <button onClick={onClose} style={{background:'rgba(var(--primary-rgb),.09)',border:'1px solid rgba(var(--primary-rgb),.22)',borderRadius:12,padding:'2px 10px',cursor:'pointer',color:'var(--primary-light)',fontSize:10,fontFamily:'inherit'}}>✕</button>
        </div>
        <div style={{padding:'10px 12px',flexShrink:0}}>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search messages…"
            style={{width:'100%',background:'var(--card-bg)',border:'1.5px solid var(--glass-border)',borderRadius:13,padding:'9px 13px',color:'var(--text-primary)',fontSize:12.5,fontFamily:'inherit',outline:'none'}}/>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'0 9px 8px'}}>
          {q&&!results.length&&<p style={{color:'var(--text-muted)',fontStyle:'italic',textAlign:'center',marginTop:30,fontSize:12}}>No results for "{q}"</p>}
          {results.map((m,i)=>(
            <button key={m.id||i} onClick={()=>{onJump(m.id);onClose();}} style={{width:'100%',textAlign:'left',background:'var(--glass)',border:'1px solid var(--glass-border)',borderRadius:10,padding:'9px 11px',cursor:'pointer',marginBottom:4,fontFamily:'inherit',transition:'all .2s'}}>
              <div style={{fontSize:9.5,color:'var(--text-muted)',marginBottom:3}}>{ROLE_ICONS[m.role]||'·'} {m.role} · {m?.t?new Date(m.t).toLocaleTimeString():''}</div>
              <div style={{fontSize:11.5,color:'var(--text-secondary)',lineHeight:1.5,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                …{m.snippet.replace(new RegExp(q,'gi'), s=>`【${s}】'`)}…
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── ABOUT MODAL ────────────────────────────────────────────────────────── */
function AboutModal({ open, onClose }) {
  if (!open) return null;
  const modes = [
    ['🧩','Default','MiniMax M1 — powerful, fast, free via OpenRouter'],
    ['⚡','Fast','Stream one AI instantly, falls back if needed'],
    ['🧠','Smart','Smart fallback through all available AIs'],
    ['🎯','Managed','Plan → parallel workers → review → assemble'],
    ['💬','Debate','AIs critique and improve each other\'s answers'],
    ['💻','DeepCoder','GPT-4.1 leads specialist coding team'],
  ];
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9998,padding:20,animation:'fadeIn .2s ease',overflowY:'auto'}}>
      <div style={{background:'var(--bg-secondary)',border:'1px solid rgba(var(--primary-rgb),.22)',borderRadius:24,width:'100%',maxWidth:430,overflow:'hidden',boxShadow:'0 0 80px rgba(var(--primary-rgb),.14)'}}>
        <div className="rainbow"/>
        <div style={{padding:'26px 24px'}}>
          <div style={{textAlign:'center',marginBottom:22}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:'2.4rem',fontWeight:900,background:'linear-gradient(135deg,#06b6d4,#8b5cf6,#10b981)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',letterSpacing:'-1px',marginBottom:4}}>⚡ GoAi</div>
            <div style={{fontSize:9.5,color:'var(--text-muted)',letterSpacing:'.18em',textTransform:'uppercase'}}>Multi-AI Collaboration System</div>
            <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:4}}>v6.4 · {Object.keys(RULES).length} Models · Streaming · MongoDB · HuggingFace</div>
          </div>
          <div style={{background:'linear-gradient(135deg,rgba(var(--primary-rgb),.09),rgba(139,92,246,.06))',border:'1px solid rgba(var(--primary-rgb),.2)',borderRadius:18,padding:'16px 20px',marginBottom:18,textAlign:'center'}}>
            <div style={{fontSize:9.5,color:'var(--text-muted)',marginBottom:5,letterSpacing:'.12em',textTransform:'uppercase'}}>Created by</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:'1.4rem',fontWeight:900,background:'linear-gradient(135deg,#06b6d4,#8b5cf6)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'}}>Arush Kumar</div>
            <div style={{marginTop:5,fontSize:10,color:'var(--text-muted)'}}>Builder · Developer · Innovator</div>
          </div>
          <div style={{marginBottom:18}}>
            <div style={{fontSize:9,color:'var(--text-muted)',marginBottom:7,textTransform:'uppercase',letterSpacing:'.12em'}}>Modes</div>
            {modes.map(([e,n,d])=>(
              <div key={n} style={{display:'flex',alignItems:'flex-start',gap:9,padding:'5px 2px',borderBottom:'1px solid var(--border)'}}>
                <span style={{fontSize:13,width:20,textAlign:'center',flexShrink:0,lineHeight:1.7}}>{e}</span>
                <span style={{fontSize:11,fontWeight:700,color:'var(--primary-light)',width:80,flexShrink:0,lineHeight:1.7}}>{n}</span>
                <span style={{fontSize:9.5,color:'var(--text-muted)',lineHeight:1.7}}>{d}</span>
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{width:'100%',background:'rgba(var(--primary-rgb),.09)',border:'1px solid rgba(var(--primary-rgb),.24)',borderRadius:14,padding:'11px',cursor:'pointer',color:'var(--primary-light)',fontSize:12,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,transition:'all .18s'}}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─── CHAT ITEM ──────────────────────────────────────────────────────────── */
function ChatItem({ chat, active, onSelect, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(chat.title||'New Chat');
  const inputRef = useRef(null);
  useEffect(()=>{ if(editing){ setVal(chat.title||'New Chat'); setTimeout(()=>{ inputRef.current?.focus(); inputRef.current?.select(); },10); } },[editing,chat.title]);
  const commit = () => { const t=val.trim(); if(t&&t!==chat.title) onRename(chat.id,t); setEditing(false); };
  const fmt = t => { const d=new Date(t),n=new Date(); return d.toDateString()===n.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'}); };
  return (
    <div className={`ci${active?' active':''}`} onClick={()=>!editing&&onSelect(chat.id)}>
      {editing ? (
        <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e=>{ if(e.key==='Enter'){e.preventDefault();commit();} if(e.key==='Escape'){setEditing(false);setVal(chat.title||'New Chat');} }}
          onClick={e=>e.stopPropagation()}
          style={{flex:1,background:'rgba(var(--primary-rgb),.1)',border:'1.2px solid rgba(var(--primary-rgb),.3)',borderRadius:9,padding:'5px 9px',color:'var(--primary-light)',fontFamily:'inherit',fontSize:11.5,outline:'none',minWidth:0,fontWeight:500}}
        />
      ) : (
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,color:active?'var(--primary-light)':'var(--text-secondary)',fontWeight:active?700:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{chat.title||'New Chat'}</div>
          <div style={{fontSize:8.5,color:'var(--text-muted)',marginTop:2,display:'flex',gap:5}}>
            <span>{fmt(chat.updated_at)}</span><span>·</span><span>{chat.msg_count||0} msg</span>
          </div>
        </div>
      )}
      {!editing&&<>
        <button className="ci-btn" onClick={e=>{e.stopPropagation();setEditing(true);}} title="Rename">✏️</button>
        <button className="ci-btn" onClick={e=>{e.stopPropagation();onDelete(chat.id);}} title="Delete" style={{fontSize:16}}>×</button>
      </>}
    </div>
  );
}

/* ─── SIDEBAR ────────────────────────────────────────────────────────────── */
function Sidebar({ chats, activeId, onNew, onSelect, onDelete, onRename, onAbout, open, provAvail, theme, onThemeToggle }) {
  return (
    <div style={{width:open?'var(--sw)':'0',flexShrink:0,overflow:'hidden',transition:'width .3s cubic-bezier(.4,0,.2,1)',background:'var(--bg-secondary)',borderRight:'1px solid var(--border)',position:'relative',zIndex:50,boxShadow:open?'4px 0 24px var(--shadow)':'none'}}>
      <div style={{width:'var(--sw)',height:'100%',display:'flex',flexDirection:'column',minWidth:0}}>
        <div style={{padding:'16px 14px 12px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:'1.1rem',fontWeight:900,background:'linear-gradient(135deg,#06b6d4,var(--primary))',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',letterSpacing:'-0.5px'}}>⚡ GoAi</div>
            <button
              onClick={onThemeToggle}
              title={theme==='dark'?'Switch to Light':'Switch to Dark'}
              style={{background:'none',border:'none',cursor:'pointer',fontSize:17,transition:'transform .3s ease',display:'flex',alignItems:'center',padding:4}}
            >
              <span style={{display:'inline-block',animation:theme==='light'?'pulse 2s ease infinite':''}}>{theme==='light'?'🌙':'☀️'}</span>
            </button>
          </div>
          <div style={{fontSize:8,color:'var(--text-muted)',letterSpacing:'.13em',fontWeight:500}}>{provAvail} PROVIDERS · STREAMING</div>
        </div>
        <div style={{padding:'10px 11px 7px',flexShrink:0}}>
          <button onClick={onNew} style={{width:'100%',background:'linear-gradient(135deg,rgba(var(--primary-rgb),.14),rgba(139,92,246,.1))',border:'1.2px solid rgba(var(--primary-rgb),.24)',borderRadius:14,padding:'10px 13px',cursor:'pointer',color:'var(--primary-light)',fontFamily:'inherit',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:9,justifyContent:'center',transition:'all .2s',boxShadow:'0 4px 12px rgba(var(--primary-rgb),.1)'}}>
            <span style={{fontSize:17,lineHeight:1}}>＋</span> New Chat
          </button>
        </div>
        {chats.length>0&&<div style={{padding:'8px 14px 4px',fontSize:8.5,color:'var(--text-muted)',letterSpacing:'.1em',textTransform:'uppercase',flexShrink:0,fontWeight:600}}>Chats ({chats.length})</div>}
        <div style={{flex:1,overflowY:'auto',padding:'3px 9px 8px'}}>
          {!chats.length&&<div style={{color:'var(--text-muted)',fontSize:11,textAlign:'center',marginTop:40,fontStyle:'italic'}}>No chats yet</div>}
          {[...chats].sort((a,b)=>b.updated_at-a.updated_at).map(c=>(
            <ChatItem key={c.id} chat={c} active={c.id===activeId} onSelect={onSelect} onDelete={onDelete} onRename={onRename}/>
          ))}
        </div>
        <div style={{borderTop:'1px solid var(--border)',padding:'9px 11px',flexShrink:0,display:'flex',flexDirection:'column',gap:5}}>
          <button onClick={onAbout} style={{background:'var(--glass)',border:'1px solid var(--glass-border)',borderRadius:12,padding:'8px 12px',cursor:'pointer',color:'var(--text-secondary)',fontFamily:'inherit',fontSize:11,textAlign:'left',display:'flex',alignItems:'center',gap:9,transition:'all .2s',fontWeight:500}}>
            <span>ℹ️</span> About GoAi
          </button>
          <div style={{fontSize:8.5,color:'var(--text-muted)',textAlign:'center',fontWeight:500}}>Made by Arush · v6.4</div>
        </div>
      </div>
    </div>
  );
}

/* ─── TYPING INDICATOR ───────────────────────────────────────────────────── */
function Typing({ text }) {
  return (
    <div style={{alignSelf:'flex-start',display:'flex',alignItems:'center',gap:11,padding:'10px 16px',background:'var(--glass)',border:'1.2px solid var(--glass-border)',borderRadius:'6px 18px 18px 18px',fontSize:12.5,color:'var(--text-muted)',animation:'msgIn .3s cubic-bezier(.34,1.56,.64,1)',maxWidth:'92%',fontWeight:500}}>
      <div style={{display:'flex',gap:5,flexShrink:0,alignItems:'center'}}>
        {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:'50%',background:'var(--primary-light)',display:'inline-block',animation:`blink 1.4s ease-in-out infinite`,animationDelay:i*.22+'s',boxShadow:'0 0 5px rgba(var(--primary-rgb),.5)'}}/>)}
      </div>
      <span style={{fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:280}}>{text||'Processing…'}</span>
    </div>
  );
}

/* ─── BUBBLE ─────────────────────────────────────────────────────────────── */
const BS = {
  user: { bg:'rgba(6,182,212,.07)',  bd:'rgba(6,182,212,.18)',  se:'flex-end',   br:'22px 6px 22px 22px', anim:'msgInRight' },
  ai:   { bg:'rgba(139,92,246,.07)', bd:'rgba(139,92,246,.18)', se:'flex-start', br:'6px 22px 22px 22px', anim:'msgIn' },
  mgr:  { bg:'rgba(16,185,129,.07)', bd:'rgba(16,185,129,.18)', se:'flex-start', br:'6px 22px 22px 22px', anim:'msgIn' },
  disc: { bg:'rgba(245,158,11,.05)', bd:'rgba(245,158,11,.16)', se:'flex-start', br:'6px 22px 22px 22px', anim:'msgIn' },
  warn: { bg:'rgba(239,68,68,.05)',  bd:'rgba(239,68,68,.18)',  se:'flex-start', br:'6px 22px 22px 22px', tc:'#fca5a5', anim:'msgIn' },
  meta: { bg:'transparent', bd:'transparent', se:'flex-start', tc:'var(--text-muted)', fi:'italic', anim:'fadeIn' }
};

function Bubble({ msg, onPv, searchQ, msgRef }) {
  const [cpd, setCpd] = useState(false);
  if (msg.isLog) return <WorkerLog label={S(msg.label)} ok={!!msg.ok} text={S(msg.text)} onPv={onPv}/>;
  if (msg.isComm) return <CommLog comms={msg.comms||[]}/>;
  const b = BS[msg.role] || BS.meta;
  return (
    <div ref={msgRef} className="bub" style={{maxWidth:'94%',alignSelf:b.se||'flex-start',animation:`${b.anim||'msgIn'} .35s cubic-bezier(.34,1.56,.64,1)`,position:'relative'}}>
      <div style={{padding:'12px 16px',borderRadius:b.br||'6px 22px 22px 22px',background:b.bg||'transparent',border:'1.2px solid '+(b.bd||'transparent'),color:b.tc||'var(--text-primary)',fontStyle:b.fi||'normal',lineHeight:1.85}}>
        <MsgContent text={S(msg.text)} onPv={onPv} searchQ={searchQ}/>
      </div>
      {msg.role!=='meta'&&msg.role!=='warn'&&msg.text&&(
        <button className="cpb" onClick={()=>{try{navigator.clipboard.writeText(S(msg.text));}catch{}setCpd(true);setTimeout(()=>setCpd(false),1400);}} style={{position:'absolute',top:8,right:8,opacity:0,background:'var(--card-bg)',border:'1px solid rgba(var(--primary-rgb),.25)',borderRadius:10,padding:'3px 9px',fontSize:10,cursor:'pointer',color:'var(--primary-light)',transition:'all .18s',fontWeight:500}}>
          {cpd?'✅':'📋'}
        </button>
      )}
    </div>
  );
}

/* ─── EXPORT HELPERS ─────────────────────────────────────────────────────── */
function exportAsMarkdown(msgs, title) {
  const lines = [`# ${title||'GoAi Chat Export'}`, `_Exported: ${new Date().toLocaleString()}_`, '---', ''];
  for (const m of msgs) {
    if (m.isLog||m.isComm) continue;
    const prefix = { user:'**You**', ai:'**AI**', mgr:'**Manager**', disc:'**Debate**', warn:'**⚠️**', meta:'_Info_' }[m.role]||'**?**';
    lines.push(`${prefix}\n\n${m.text||''}\n\n---\n`);
  }
  const blob = new Blob([lines.join('\n')], {type:'text/markdown'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download = `goai-chat-${Date.now()}.md`; a.click();
}

function exportAsJSON(msgs, title) {
  const blob = new Blob([JSON.stringify({title,exported:new Date().toISOString(),messages:msgs.filter(m=>!m.isLog&&!m.isComm)},null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`goai-chat-${Date.now()}.json`; a.click();
}

/* ─── MAIN APP ───────────────────────────────────────────────────────────── */
export default function App() {
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeMsgs, setActiveMsgs] = useState([]);
  const [activeMode, setActiveMode] = useState('fast');
  const [activePref, setActivePref] = useState(DEFAULT_PREF);
  const [sideOpen, setSideOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mem, setMem] = useState([]);
  const [memOpen, setMemOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hfModalOpen, setHfModalOpen] = useState(false);
  const [pv, setPv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState('');
  const [streamBuf, setStreamBuf] = useState('');
  const [streamPid, setStreamPid] = useState('');
  const [stat, setStat] = useState({ t:'Connecting…', c:'' });
  const [provs, setProvs] = useState({});
  const [inp, setInp] = useState('');
  const [theme, setTheme] = useState(() => { try{return localStorage.getItem('goai_theme')||'dark';}catch{return 'dark';} });
  const [hfKey, setHfKey] = useState(() => { try{return localStorage.getItem('goai_hfkey')||'';}catch{return '';} });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ] = useState('');
  const chatRef = useRef(null);
  const inpRef = useRef(null);
  const saveTimer = useRef(null);
  const msgRefs = useRef({});
  const toast = useToast();

  /* ── Apply theme ── */
  useEffect(() => {
    document.body.classList.toggle('theme-light', theme==='light');
    try { localStorage.setItem('goai_theme', theme); } catch {}
  }, [theme]);

  /* ── Inject HF models into provs ── */
  useEffect(() => {
    if (hfKey) {
      setProvs(prev => {
        const updated = { ...prev };
        for (const pid of Object.keys(RULES)) {
          if (RULES[pid].group==='HuggingFace') updated[pid] = { available:true, label:RULES[pid].modelName, group:'HuggingFace', free:false };
        }
        return updated;
      });
    } else {
      setProvs(prev => {
        const updated = { ...prev };
        for (const pid of Object.keys(RULES)) {
          if (RULES[pid].group==='HuggingFace') delete updated[pid];
        }
        return updated;
      });
    }
  }, [hfKey]);

  const avail = useMemo(() => Object.entries(provs).filter(([,v])=>v.available).map(([k])=>k), [provs]);
  const provAvail = useMemo(() => Object.values(provs).filter(v=>v.available).length, [provs]);
  const dcManagers = useMemo(() => Object.entries(provs).filter(([,v])=>v.available&&v.isDCManager).map(([k])=>k), [provs]);
  const dcWorkers = useMemo(() => Object.entries(provs).filter(([,v])=>v.available&&v.isDCWorker).map(([k])=>k), [provs]);

  /* ── Init ── */
  useEffect(() => {
    fetch('/api/providers').then(r=>r.json()).then(d => {
      setProvs(prev => ({ ...d, ...Object.fromEntries(Object.entries(prev).filter(([k])=>RULES[k]?.group==='HuggingFace')) }));
      const cnt = Object.values(d).filter(v=>v.available).length;
      setStat({ t:`Ready · ${cnt} AIs`, c:'good' });
    }).catch(()=>setStat({t:'⚠️ Server offline',c:'bad'}));
    chatAPI.list().then(cs => {
      if (cs?.length) {
        setChats(cs); const last=cs[0]; setActiveId(last.id);
        return chatAPI.get(last.id).then(c => { setActiveMsgs(Array.isArray(c.messages)?c.messages:[]); setActiveMode(c.mode||'fast'); setActivePref(c.pref||DEFAULT_PREF); });
      } else return createChatFn();
    }).catch(()=>createChatFn());
    try { const s=localStorage.getItem('goai_mem'); if(s){const p=JSON.parse(s);if(Array.isArray(p))setMem(p);} } catch {}
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.metaKey||e.ctrlKey) {
        if (e.key==='k') { e.preventDefault(); setPickerOpen(p=>!p); }
        if (e.key==='n') { e.preventDefault(); createChatFn(); }
        if (e.key==='f') { e.preventDefault(); setSearchOpen(p=>!p); }
        if (e.key==='b') { e.preventDefault(); setSideOpen(p=>!p); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; }, [activeMsgs,typing,streamBuf]);

  /* ── Save ── */
  const scheduleSave = useCallback((id,title,mode,pref,msgs) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const clean = msgs.filter(m=>!m.isLog&&!m.isComm&&m.role&&m.text!=null);
      chatAPI.save(id,title,mode,pref,clean).catch(console.error);
      setChats(prev=>prev.map(c=>c.id===id?{...c,msg_count:clean.length,updated_at:Date.now(),title}:c));
    }, 800);
  }, []);

  /* ── Create chat ── */
  const createChatFn = useCallback(async () => {
    const id=uid(), mode='fast', pref=DEFAULT_PREF;
    await chatAPI.create(id,'New Chat',mode,pref).catch(console.error);
    const nc = { id,title:'New Chat',mode,pref,msg_count:0,created_at:Date.now(),updated_at:Date.now() };
    setChats(prev=>[nc,...prev]); setActiveId(id); setActiveMsgs([]); setActiveMode(mode); setActivePref(pref); setInp('');
  }, []);

  const selectChat = useCallback(async id => {
    if (id===activeId) return;
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
    toast('Chat deleted', 'warn');
  }, [activeId, createChatFn, toast]);

  const renameChat = useCallback(async (id,title) => {
    setChats(prev=>prev.map(c=>c.id===id?{...c,title}:c));
    if (id===activeId) scheduleSave(id,title,activeMode,activePref,activeMsgs);
    await chatAPI.rename(id,title).catch(console.error);
  }, [activeId, activeMode, activePref, activeMsgs, scheduleSave]);

  const setMode = useCallback(m => {
    setActiveMode(m);
    if (activeId) { setChats(prev=>prev.map(c=>c.id===activeId?{...c,mode:m}:c)); chatAPI.save(activeId,chats.find(c=>c.id===activeId)?.title||'New Chat',m,activePref,activeMsgs.filter(x=>!x.isLog&&!x.isComm)).catch(console.error); }
  }, [activeId, activePref, activeMsgs, chats]);

  const setPref = useCallback(p => {
    setActivePref(p);
    if (activeId) { setChats(prev=>prev.map(c=>c.id===activeId?{...c,pref:p}:c)); chatAPI.save(activeId,chats.find(c=>c.id===activeId)?.title||'New Chat',activeMode,p,activeMsgs.filter(x=>!x.isLog&&!x.isComm)).catch(console.error); }
    toast(`Model: ${RULES[p]?.modelName||p}`, 'info');
  }, [activeId, activeMode, activeMsgs, chats, toast]);

  const addMsg = useCallback((role,text,extra={}) => {
    const msg = { id:uid(), role, text:S(text), t:Date.now(), ...extra };
    setActiveMsgs(prev => {
      const n = [...prev, msg];
      const chat = chats.find(c=>c.id===activeId);
      const title = (chat?.title==='New Chat'&&role==='user') ? text.slice(0,44)+(text.length>44?'…':'') : chat?.title||'New Chat';
      scheduleSave(activeId,title,activeMode,activePref,n);
      if (title!==chat?.title) setChats(p=>p.map(c=>c.id===activeId?{...c,title}:c));
      return n;
    });
  }, [activeId, activeMode, activePref, chats, scheduleSave]);

  const addLog  = useCallback((label,ok,text) => setActiveMsgs(prev=>[...prev,{id:uid(),isLog:true,label:S(label),ok:!!ok,text:S(text)}]),[]);
  const addComm = useCallback(comms => { if(Array.isArray(comms)&&comms.length) setActiveMsgs(prev=>[...prev,{id:uid(),isComm:true,comms}]); },[]);
  const addMem  = useCallback(m => { if(m) setMem(prev=>{ const n=[...prev,m].slice(-30); try{localStorage.setItem('goai_mem',JSON.stringify(n));}catch{} return n; }); },[]);
  const ss = useCallback((t,c='') => setStat({t,c}), []);
  const clearChat = useCallback(() => { setActiveMsgs([]); if(activeId) chatAPI.save(activeId,chats.find(c=>c.id===activeId)?.title||'New Chat',activeMode,activePref,[]).catch(console.error); toast('Chat cleared','warn'); }, [activeId,activeMode,activePref,chats,toast]);

  const jumpToMsg = useCallback(id => {
    const el = msgRefs.current[id];
    if (el) el.scrollIntoView({ behavior:'smooth', block:'center' });
  }, []);

  const handleSaveHFKey = useCallback(key => {
    setHfKey(key);
    try { if(key) localStorage.setItem('goai_hfkey',key); else localStorage.removeItem('goai_hfkey'); } catch {}
    toast(key ? '🤗 HuggingFace connected!' : 'HF key cleared', key?'success':'warn');
  }, [toast]);

  /* ─── AI Orchestration ── */
  async function commsRound(task, workers) {
    const settled = await Promise.allSettled(workers.slice(0,6).map(async pid => {
      const r = RULES[pid]||RULES[DEFAULT_PREF];
      const text = await api(pid,`You are ${r.modelName}. In ONE sentence (max 20 words), state what YOU will specifically handle.`,[{role:'user',content:'Task: '+S(task).slice(0,240)}],90,hfKey);
      return { pid, text: S(text).replace(/\n/g,' ').trim().slice(0,170) };
    }));
    return settled.filter(r=>r.status==='fulfilled'&&r.value?.pid).map(r=>r.value);
  }

  async function mgrPlan(task, workers, proposals, mgrId) {
    const mgr = mgrId||MGR_ID;
    const propText = proposals.length ? 'Proposals:\n'+proposals.map(p=>`${p.pid}(${RULES[p.pid]?.role||p.pid}): "${p.text}"`).join('\n') : 'Workers: '+workers.map(p=>`${p}(${RULES[p]?.role||p})`).join(', ');
    const q = `Task: "${S(task).slice(0,280)}"\n\n${propText}\n\nOutput ONLY: {"plan":"strategy","assignments":[{"prov":"or_minimax","subtask":"..."},...]}`;
    try {
      const raw = await api(mgr,'You are GoAi Manager. Output ONLY valid JSON.',[{role:'user',content:q}],2000,hfKey);
      const m = (raw||'').match(/\{[\s\S]*?"assignments"[\s\S]*?\}/); if(!m) throw new Error();
      const p = JSON.parse(m[0]); if(!Array.isArray(p.assignments)) throw new Error(); return p;
    } catch { return { plan:'Parallel fallback', assignments:workers.slice(0,6).map(w=>({prov:w,subtask:task+'\n\nYou are '+S(RULES[w]?.modelName||w)+'. Provide a COMPLETE helpful response.'})) }; }
  }

  async function mgrReview(task, responses, mgrId) {
    const mgr = mgrId||MGR_ID;
    const listing = responses.map((r,i)=>`[${i}] ${r.label}: ${S(r.text).slice(0,200)}`).join('\n---\n');
    const q = `Task: "${S(task).slice(0,120)}"\nOutputs:\n${listing}\nJSON: {"reviews":[{"idx":0,"label":"...","complete":true,"score":8,"issue":""}],"missing":"gaps"}`;
    try { const raw=await api(mgr,'You are GoAi Manager. Output ONLY valid JSON.',[{role:'user',content:q}],1400,hfKey); const m=(raw||'').match(/\{[\s\S]*?"reviews"[\s\S]*?\}/); if(!m) throw new Error(); return JSON.parse(m[0]); }
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
    const q = `Task: "${S(task).slice(0,260)}"${rd?.missing?'\nMissing: '+rd.missing:''}\n\nWorkers:\n${parts}\n\nFinal answer:`;
    try {
      const final = await api(mgr, sys, [...hist.slice(-2),{role:'user',content:q.slice(0,18000)}], RULES[mgr]?.tok||6000, hfKey);
      addMsg('mgr',(isCoding?'💻':'🎯')+' Manager Final Answer\n\n'+S(final));
      ss('✓ Done · '+responses.length+' workers','good');
      toast(`Done! ${responses.length} workers`, 'success');
      doMem((isCoding?'DeepCoder':'Manager')+': '+S(task).slice(0,60), isCoding?'deepcoder':'manager').then(addMem);
    } catch(e) {
      addMsg('warn','❌ Assembly: '+S(e.message));
      if (sorted.length) addMsg('mgr','🎯 Best result ('+S(sorted[0].label)+')\n\n'+S(sorted[0].text));
    }
    setTyping('');
  }

  async function runDeepCoder(p, hist, memSnap) {
    const dcMgr = dcManagers[0]||avail.find(x=>x===DC_MGR_FALLBACK)||MGR_ID;
    const workers = dcWorkers.filter(x=>x!==dcMgr&&avail.includes(x));
    const useWorkers = workers.length ? workers : avail.filter(x=>x!==dcMgr).slice(0,5);
    if (!useWorkers.length) { addMsg('warn','No DeepCoder workers available.'); ss('No workers','bad'); return; }
    addMsg('meta',`💻 DeepCoder · Manager: ${RULES[dcMgr]?.modelName||dcMgr} · ${useWorkers.length} specialists`);
    setTyping('💻 Specialists proposing architecture…');
    let proposals=[];
    try {
      const settled = await Promise.allSettled(useWorkers.slice(0,5).map(async pid => {
        const r=RULES[pid];
        const text=await api(pid,`You are ${r.modelName}. In ONE sentence, state the specific module you will implement.`,[{role:'user',content:'Coding task: '+S(p).slice(0,220)}],90,hfKey);
        return { pid, text:S(text).replace(/\n/g,' ').trim().slice(0,180) };
      }));
      proposals = settled.filter(r=>r.status==='fulfilled'&&r.value?.pid).map(r=>r.value);
    } catch {}
    setTyping(''); if(proposals.length) addComm(proposals);
    setTyping('📋 Architecting modules…');
    let assignments = useWorkers.slice(0,6).map(w=>({ prov:w, subtask:`Write COMPLETE code for: "${S(p).slice(0,150)}"\nYou are ${RULES[w]?.modelName||w}. ALL code runnable. End [COMPLETE].` }));
    try {
      const propText = proposals.length ? 'Proposals:\n'+proposals.map(x=>`${x.pid}(${RULES[x.pid]?.role}): "${x.text}"`).join('\n') : 'Workers: '+useWorkers.map(x=>`${x}(${RULES[x]?.role})`).join(', ');
      const planRaw = await api(dcMgr,'You are GoAi DeepCoder Manager. Output ONLY valid JSON.',[{role:'user',content:`Coding task: "${S(p).slice(0,250)}"\n\n${propText}\n\nAssign each worker a SPECIFIC module.\nOutput ONLY: {"plan":"architecture","assignments":[{"prov":"or_minimax","subtask":"Implement [specific module]..."}]}`}],2200,hfKey);
      const m = (planRaw||'').match(/\{[\s\S]*?"assignments"[\s\S]*?\}/);
      if (m) { const parsed=JSON.parse(m[0]); if(Array.isArray(parsed.assignments)&&parsed.assignments.length){ const va=parsed.assignments.filter(a=>a.prov&&avail.includes(a.prov)&&a.subtask&&a.prov!==dcMgr); if(va.length){ assignments=va; addMsg('mgr','📋 DeepCoder Architecture: '+S(parsed.plan)+'\n\n'+assignments.map(a=>`${RULES[a.prov]?.e||'·'} ${RULES[a.prov]?.modelName||a.prov}:\n  ${S(a.subtask).slice(0,80)}`).join('\n')); }}}
    } catch(e) { console.warn('DC plan:',e.message); }
    setTyping('');
    setTyping(`⚙️ ${assignments.length} coding AIs writing in parallel…`);
    const settled = await Promise.allSettled(assignments.map(async a => { const ans=await api(a.prov,buildDCSys(a.prov,memSnap),[...hist,{role:'user',content:S(a.subtask||p)}],undefined,hfKey); return {prov:a.prov,label:S(RULES[a.prov]?.modelName||a.prov)+' ('+S(RULES[a.prov]?.role||'AI')+')',sub:S(a.subtask||p),text:S(ans||''),score:7}; }));
    setTyping('');
    const responses=[];
    for (const r of settled) { if(r.status==='fulfilled'&&r.value){ const v=r.value,chk=checkOk(v.text); v.ok=chk.ok; v.issue=chk.issue; responses.push(v); addLog(v.label+(chk.ok?'':' ⚠️ '+chk.issue),chk.ok,v.text); } else addMsg('warn','❌ Coder: '+S(r.reason?.message||'failed').slice(0,150)); }
    if (!responses.length) { addMsg('warn','🚫 All coders failed.'); ss('Failed','bad'); return; }
    setTyping('🔍 Reviewing code quality…');
    let rd=null; try{rd=await mgrReview(p,responses,dcMgr);}catch{}
    setTyping('');
    if (rd?.reviews&&Array.isArray(rd.reviews)) { addMsg('mgr','🔍 Code Review:\n'+rd.reviews.map(rv=>`• ${rv.label||'AI'}: ${rv.score||'?'}/10 ${rv.complete?'✅':'⚠️ '+S(rv.issue)}`).join('\n')+(rd.missing?'\n📌 Missing: '+rd.missing:'')); rd.reviews.forEach(rv=>{ if(typeof rv.idx==='number'&&rv.idx<responses.length) responses[rv.idx].score=rv.score||7; }); }
    await mgrAssemble(p,responses,rd,hist,memSnap,dcMgr,true);
  }

  async function runManaged(p, hist, memSnap, isDebate) {
    const workers = avail.filter(x=>x!==MGR_ID);
    if (!workers.length) { addMsg('warn','No workers. Check API keys.'); ss('No workers','bad'); return; }
    addMsg('meta',(isDebate?'💬 Debate':'🎯 Managed')+' · Manager: '+S(RULES[MGR_ID]?.modelName||MGR_ID)+' · '+workers.length+' workers');
    setTyping('💬 AIs discussing…'); let proposals=[]; try{proposals=await commsRound(p,workers);}catch{} setTyping(''); if(proposals.length) addComm(proposals);
    setTyping('📋 Planning…'); let plan={plan:'Parallel',assignments:[]}; try{plan=await mgrPlan(p,workers,proposals);}catch{}
    const rawA = Array.isArray(plan?.assignments)?plan.assignments:[];
    const va = rawA.filter(a=>a&&a.prov&&a.prov!==MGR_ID&&avail.includes(a.prov)&&a.subtask);
    const fa = va.length ? va : workers.slice(0,5).map(w=>({prov:w,subtask:p+'\n\nYou are '+S(RULES[w]?.modelName||w)+'. Give a complete, helpful answer.'}));
    addMsg('mgr','📋 Plan: '+S(plan?.plan)+'\n\n'+fa.map(a=>`${RULES[a.prov]?.e||'·'} ${RULES[a.prov]?.modelName||a.prov}:\n  ${S(a.subtask).slice(0,80)}`).join('\n')); setTyping('');
    setTyping(`⚙️ ${fa.length} workers responding…`);
    const settled = await Promise.allSettled(fa.map(async a => { const ans=await api(a.prov,buildSys(a.prov,a.subtask,memSnap),[...hist,{role:'user',content:S(a.subtask||p)}],undefined,hfKey); return {prov:a.prov,label:S(RULES[a.prov]?.modelName||a.prov)+' ('+S(RULES[a.prov]?.role||'AI')+')',sub:S(a.subtask||p),text:S(ans||''),score:7}; }));
    setTyping(''); const responses=[];
    for (const r of settled) { if(r.status==='fulfilled'&&r.value){ const v=r.value,chk=checkOk(v.text); v.ok=chk.ok; v.issue=chk.issue; responses.push(v); addLog(v.label,chk.ok,v.text); } else addMsg('warn','❌ Worker: '+S(r.reason?.message||'failed').slice(0,160)); }
    if (!responses.length) { addMsg('warn','🚫 All failed.'); ss('Failed','bad'); return; }
    setTyping('🔍 Reviewing…'); let rd=null; try{rd=await mgrReview(p,responses);}catch{} setTyping('');
    if (rd?.reviews&&Array.isArray(rd.reviews)) {
      addMsg('mgr','🔍 Review:\n'+rd.reviews.map(rv=>`• ${rv.label||'AI'}: ${rv.score||'?'}/10 ${rv.complete?'✅':'⚠️ '+S(rv.issue)}`).join('\n')+(rd.missing?'\n📌 Gap: '+rd.missing:''));
      rd.reviews.forEach(rv=>{ if(typeof rv.idx==='number'&&rv.idx<responses.length) responses[rv.idx].score=rv.score||7; });
      let fc=0;
      for (const rv of rd.reviews) {
        if(fc>=2) break; if(rv.complete||typeof rv.idx!=='number'||rv.idx>=responses.length) continue;
        const resp=responses[rv.idx]; if(!resp||!avail.includes(resp.prov)) continue;
        try { setTyping('🔄 Fixing '+S(RULES[resp.prov]?.modelName||resp.prov)+'…'); const fix=await api(resp.prov,buildSys(resp.prov,resp.sub,memSnap)+'\nFix issue: "'+S(rv.issue||'incomplete')+'".',[...hist,{role:'user',content:'Fix issue "'+S(rv.issue)+'" in your response.'}],undefined,hfKey); responses[rv.idx].text+='\n[FIXED]\n'+S(fix); addMsg('mgr','🔄 '+S(RULES[resp.prov]?.modelName||resp.prov)+' fixed'); fc++; setTyping(''); }
        catch(e2) { addMsg('warn','❌ Fix: '+S(e2.message)); setTyping(''); }
      }
    }
    if (isDebate&&responses.length>1) {
      addMsg('disc','💬 Debate — AIs reviewing each other');
      for (let i=0;i<Math.min(responses.length,3);i++) {
        const rv=responses[(i+1)%responses.length],sb=responses[i]; if(!rv||!sb||!avail.includes(rv.prov)) continue;
        try { setTyping('💬 '+S(RULES[rv.prov]?.modelName||rv.prov)+' → '+S(RULES[sb.prov]?.modelName||sb.prov)+'…'); const disc=await api(rv.prov,buildSys(rv.prov,'',memSnap)+' Structured peer review.',[...hist,{role:'user',content:'Review this response to "'+S(p).slice(0,130)+'":\n\n'+S(sb.text).slice(0,380)+'\n\n1. What\'s good\n2. What\'s wrong\n3. Your complete improved answer'}],undefined,hfKey); addMsg('disc','💬 '+S(RULES[rv.prov]?.modelName)+' reviews '+S(RULES[sb.prov]?.modelName)+':\n\n'+S(disc)); setTyping(''); }
        catch(e3) { addMsg('warn','❌ Debate: '+S(e3.message)); setTyping(''); }
      }
    }
    await mgrAssemble(p,responses,rd,hist,memSnap,MGR_ID,false);
  }

  /* ─── SEND ── */
  const send = async () => {
    const p = inp.trim(); if (!p||busy) return;
    if (!activeId) { await createChatFn(); setTimeout(()=>{ inpRef.current?.focus(); },100); return; }
    const hist = getHist(activeMsgs,3);
    addMsg('user',p); setInp(''); setBusy(true); ss('Thinking…','warn');
    doMem(p,'user').then(addMem);
    const memSnap = [...mem];
    try {
      if (activeMode==='deepcoder') {
        await runDeepCoder(p,hist,memSnap);
      } else if (activeMode==='managed'||activeMode==='debate') {
        await runManaged(p,hist,memSnap,activeMode==='debate');
      } else {
        const order = [activePref,...avail.filter(x=>x!==activePref)];
        addMsg('meta',(activeMode==='smart'?'🧠 Smart':'⚡ Fast')+' · '+S(RULES[activePref]?.modelName||activePref)+' · streaming');
        for (const pid of order) {
          if (!avail.includes(pid)) continue;
          const t0 = performance.now(); let accumulated=''; let firstChunk=true;
          try {
            setTyping((RULES[pid]?.e||'⟳')+' '+S(RULES[pid]?.modelName||pid)+'…');
            await streamApi(pid,buildSys(pid,'',memSnap),[...hist,{role:'user',content:p}],RULES[pid]?.tok||2000,chunk=>{
              if(firstChunk){setTyping('');firstChunk=false;}
              accumulated+=chunk; setStreamBuf(accumulated); setStreamPid(pid);
            }, hfKey);
            setStreamBuf(''); setStreamPid('');
            if (accumulated) {
              addMsg('ai',S(RULES[pid]?.e||'·')+' '+S(RULES[pid]?.modelName||pid)+' ('+S(RULES[pid]?.role||'AI')+')\n\n'+accumulated);
              ss('✓ '+S(RULES[pid]?.modelName||pid)+' · '+Math.round(performance.now()-t0)+'ms','good');
              return;
            }
            throw new Error('Empty stream');
          } catch(e) {
            setStreamBuf(''); setStreamPid(''); setTyping('');
            if (accumulated) { addMsg('ai',S(RULES[pid]?.e||'·')+' '+S(RULES[pid]?.modelName||pid)+'\n\n'+accumulated+'\n\n[⚠️ Stream interrupted]'); ss('Partial response','warn'); return; }
            const em = S(e.message||'error');
            if (/quota|rate|429|limit/i.test(em)) addMsg('warn','⚠️ '+S(RULES[pid]?.modelName||pid)+': rate limited');
            else addMsg('warn','❌ '+pid+': '+em);
            if (activeMode==='fast') break;
          }
        }
        if (activeMode!=='fast') addMsg('warn','🚫 All AIs failed. Check keys.');
        ss('Done','good');
      }
    } catch(e) { addMsg('warn','🚨 '+S(e?.message||'Unexpected error')); ss('Error','bad'); }
    finally { setBusy(false); setTyping(''); setStreamBuf(''); setStreamPid(''); }
  };

  /* ─── UI CONSTANTS ── */
  const MODES = [
    { k:'fast',      l:'⚡ Fast' },
    { k:'smart',     l:'🧠 Smart' },
    { k:'managed',   l:'🎯 Managed' },
    { k:'debate',    l:'💬 Debate' },
    { k:'deepcoder', l:'💻 DeepCoder' },
  ];
  const SUGGESTIONS = [
    'Explain quantum entanglement simply','Help me write a cover letter',
    'Build a REST API in Node.js','Plan a 7-day Italy itinerary',
    'Explain how mortgages work','Write a short story about AI',
    'Debug my Python code','Suggest a healthy dinner',
    'How does recursion work?','Write a regex for email validation'
  ];
  const dc = stat.c==='good'?'#10b981':stat.c==='bad'?'#ef4444':'#f59e0b';
  const isDC = activeMode==='deepcoder';
  const activeTitle = chats.find(c=>c.id===activeId)?.title||'GoAi';
  const isLight = theme==='light';
  const charCount = inp.length;
  const charLimit = RULES[activePref]?.tok ? Math.floor(RULES[activePref].tok * 3) : 6000;

  return (
    <ToastProvider>
      <_AppInner
        chats={chats} activeId={activeId} activeMsgs={activeMsgs}
        activeMode={activeMode} activePref={activePref} sideOpen={sideOpen}
        aboutOpen={aboutOpen} mem={mem} memOpen={memOpen}
        pickerOpen={pickerOpen} hfModalOpen={hfModalOpen} pv={pv}
        busy={busy} typing={typing} streamBuf={streamBuf} streamPid={streamPid}
        stat={stat} provs={provs} inp={inp} theme={theme} hfKey={hfKey}
        searchOpen={searchOpen} searchQ={searchQ} dc={dc} isDC={isDC}
        activeTitle={activeTitle} isLight={isLight} charCount={charCount} charLimit={charLimit}
        MODES={MODES} SUGGESTIONS={SUGGESTIONS} dcManagers={dcManagers} dcWorkers={dcWorkers}
        provAvail={provAvail} avail={avail}
        chatRef={chatRef} inpRef={inpRef} msgRefs={msgRefs}
        setChats={setChats} setActiveId={setActiveId} setActiveMsgs={setActiveMsgs}
        setActiveMode={setActiveMode} setActivePref={setActivePref} setSideOpen={setSideOpen}
        setAboutOpen={setAboutOpen} setMem={setMem} setMemOpen={setMemOpen}
        setPickerOpen={setPickerOpen} setHfModalOpen={setHfModalOpen} setPv={setPv}
        setBusy={setBusy} setTyping={setTyping} setStreamBuf={setStreamBuf} setStreamPid={setStreamPid}
        setStat={setStat} setProvs={setProvs} setInp={setInp} setTheme={setTheme}
        setSearchOpen={setSearchOpen}
        createChatFn={createChatFn} selectChat={selectChat} deleteChat={deleteChat}
        renameChat={renameChat} setMode={setMode} setPref={setPref} addMsg={addMsg}
        clearChat={clearChat} send={send} jumpToMsg={jumpToMsg}
        handleSaveHFKey={handleSaveHFKey}
        exportMD={()=>{ exportAsMarkdown(activeMsgs,activeTitle); toast('Exported as Markdown ✨','success'); }}
        exportJSON={()=>{ exportAsJSON(activeMsgs,activeTitle); toast('Exported as JSON','success'); }}
      />
    </ToastProvider>
  );
}

/* ─── INNER APP (needs toast context) ───────────────────────────────────── */
function _AppInner(props) {
  const { chats,activeId,activeMsgs,activeMode,activePref,sideOpen,aboutOpen,mem,memOpen,pickerOpen,hfModalOpen,pv,busy,typing,streamBuf,streamPid,stat,provs,inp,theme,hfKey,searchOpen,searchQ,dc,isDC,activeTitle,isLight,charCount,charLimit,MODES,SUGGESTIONS,dcManagers,dcWorkers,provAvail,avail,chatRef,inpRef,msgRefs,setSideOpen,setAboutOpen,setMemOpen,setPickerOpen,setHfModalOpen,setPv,setInp,setSearchOpen,setTheme,createChatFn,selectChat,deleteChat,renameChat,setMode,setPref,clearChat,send,jumpToMsg,handleSaveHFKey,exportMD,exportJSON } = props;

  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="layout">
      {/* Background FX */}
      <div className="bg-fx" aria-hidden>
        <div className="blob b1"/><div className="blob b2"/><div className="blob b3"/>
        <div className="blob b4"/><div className="blob b5"/>
      </div>

      <Sidebar
        chats={chats} activeId={activeId} onNew={createChatFn}
        onSelect={selectChat} onDelete={deleteChat} onRename={renameChat}
        onAbout={()=>setAboutOpen(true)} open={sideOpen} provAvail={provAvail}
        theme={theme} onThemeToggle={()=>setTheme(t=>t==='dark'?'light':'dark')}
      />

      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:'transparent'}}>
        {/* ── Topbar ── */}
        <div style={{flexShrink:0,padding:'9px 13px',borderBottom:'1px solid var(--border)',background:isLight?'rgba(255,251,247,.96)':'rgba(7,10,24,.98)',backdropFilter:'blur(30px)',display:'flex',alignItems:'center',gap:9,zIndex:10,boxShadow:'0 2px 12px var(--shadow)'}}>
          <button onClick={()=>setSideOpen(v=>!v)} style={{background:'var(--glass)',border:'1px solid var(--glass-border)',cursor:'pointer',color:'var(--primary-light)',fontSize:15,padding:'5px 8px',borderRadius:10,flexShrink:0,lineHeight:1,transition:'all .2s'}}>
            {sideOpen?'◁':'☰'}
          </button>
          <div style={{width:1,height:18,background:'var(--border)',flexShrink:0,borderRadius:1}}/>
          <div style={{minWidth:0,flex:1,overflow:'hidden'}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeTitle}</div>
          </div>
          <div style={{display:'flex',gap:7,alignItems:'center',flexShrink:0}}>
            <ModelPickerBtn pref={activePref} provs={provs} onClick={()=>setPickerOpen(true)}/>
            {/* Search */}
            <button onClick={()=>setSearchOpen(v=>!v)} title="Search (Ctrl+F)" style={{background:'var(--glass)',border:'1px solid var(--glass-border)',borderRadius:14,padding:'6px 10px',cursor:'pointer',color:'var(--text-secondary)',fontSize:13,fontFamily:'inherit',transition:'all .2s',display:'flex',alignItems:'center'}}>🔍</button>
            {/* Memory */}
            <button onClick={()=>setMemOpen(true)} style={{background:'var(--glass)',border:'1px solid var(--glass-border)',borderRadius:14,padding:'6px 11px',cursor:'pointer',color:'var(--primary-light)',fontSize:11,fontFamily:'inherit',transition:'all .2s',display:'flex',alignItems:'center',gap:4,fontWeight:600}}>
              🧠<span>{mem.length}</span>
            </button>
            {/* Export */}
            <div style={{position:'relative'}}>
              <button onClick={()=>setShowExportMenu(v=>!v)} title="Export chat" style={{background:'var(--glass)',border:'1px solid var(--glass-border)',borderRadius:14,padding:'6px 10px',cursor:'pointer',color:'var(--text-secondary)',fontSize:13,transition:'all .2s'}}>⬇️</button>
              {showExportMenu&&(
                <div onClick={()=>setShowExportMenu(false)} style={{position:'absolute',top:'110%',right:0,background:isLight?'rgba(255,251,247,.98)':'rgba(7,10,24,.99)',border:'1px solid var(--border)',borderRadius:14,padding:'6px',zIndex:100,minWidth:150,boxShadow:'0 8px 32px var(--shadow)'}}>
                  <button onClick={exportMD} style={{display:'block',width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',color:'var(--text-primary)',fontFamily:'inherit',padding:'7px 12px',borderRadius:9,fontSize:12,transition:'all .2s'}}>📄 Export Markdown</button>
                  <button onClick={exportJSON} style={{display:'block',width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',color:'var(--text-primary)',fontFamily:'inherit',padding:'7px 12px',borderRadius:9,fontSize:12,transition:'all .2s'}}>🗂 Export JSON</button>
                </div>
              )}
            </div>
            {/* Status */}
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:dc,flexShrink:0,background:'var(--glass)',border:'1px solid var(--glass-border)',borderRadius:12,padding:'5px 10px',fontWeight:500,maxWidth:120}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:dc,display:'inline-block',animation:busy?'glow 1.2s ease-in-out infinite':'',flexShrink:0}}/>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:10}}>{stat.t}</span>
            </div>
          </div>
        </div>

        {/* ── Mode bar ── */}
        <div style={{flexShrink:0,padding:'7px 11px',borderBottom:'1px solid var(--border)',background:isLight?'rgba(255,251,247,.94)':'rgba(7,10,24,.95)',display:'flex',gap:5,alignItems:'center',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          {MODES.map(m => {
            const isAct=activeMode===m.k, isDCBtn=m.k==='deepcoder';
            return <button key={m.k} className={`mbtn${isAct?(isDCBtn?' dc':' on'):''}`} onClick={()=>setMode(m.k)} style={{flex:'0 0 auto'}}>{m.l}</button>;
          })}
          {hfKey&&<span style={{fontSize:9,color:'#ffb347',background:'rgba(255,149,0,.1)',border:'1px solid rgba(255,149,0,.2)',borderRadius:10,padding:'3px 9px',flexShrink:0,fontWeight:600,marginLeft:3}}>🤗 HF</span>}
          {isDC&&dcManagers.length>0&&<span style={{fontSize:9,color:'#fdba74',background:'rgba(249,115,22,.1)',border:'1px solid rgba(249,115,22,.2)',borderRadius:10,padding:'3px 9px',flexShrink:0,whiteSpace:'nowrap',marginLeft:3,fontWeight:500}}>🧠 {RULES[dcManagers[0]]?.modelName||dcManagers[0]} · {dcWorkers.length} workers</span>}
        </div>

        {/* ── Chat area ── */}
        <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'14px 13px',display:'flex',flexDirection:'column',gap:10}}>
          {activeMsgs.filter(m=>!m.isLog&&!m.isComm&&m.role).length===0&&activeMsgs.length===0&&(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:16,textAlign:'center',padding:32}}>
              <div style={{fontSize:60,lineHeight:1,animation:'pulse 4s ease-in-out infinite',filter:'drop-shadow(0 0 24px rgba(var(--primary-rgb),.4))'}}>⚡</div>
              <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:'1.5rem',background:'linear-gradient(135deg,var(--primary),#8b5cf6,#06b6d4)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',letterSpacing:'-.3px'}}>GoAi v6.4</div>
              <div style={{fontSize:12,color:'var(--text-muted)',maxWidth:440,lineHeight:2.2}}>
                {Object.keys(RULES).length} models · Multi-AI orchestration · {hfKey ? '🤗 HF connected' : <span onClick={()=>setHfModalOpen(true)} style={{color:'#ffb347',cursor:'pointer',textDecoration:'underline'}}>Add HuggingFace key</span>}<br/>
                {isDC
                  ? <span style={{color:'#fdba74',fontWeight:600}}>💻 Specialist coding agents ready</span>
                  : <span>Ask me anything — coding, writing, math, or creative exploration</span>}
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center',maxWidth:500,marginTop:4}}>
                {SUGGESTIONS.map(s=>(
                  <button key={s} onClick={()=>{ props.setInp(s); inpRef.current?.focus(); }}
                    style={{background:'var(--glass)',border:'1px solid var(--glass-border)',borderRadius:20,padding:'6px 14px',cursor:'pointer',color:'var(--primary-light)',fontSize:11,fontFamily:'inherit',transition:'all .22s',fontWeight:500}}
                    onMouseEnter={e=>{e.target.style.background='rgba(var(--primary-rgb),.12)';e.target.style.transform='translateY(-2px)';}}
                    onMouseLeave={e=>{e.target.style.background='var(--glass)';e.target.style.transform='translateY(0)';}}
                  >{s}</button>
                ))}
              </div>
              <div style={{fontSize:9,color:'var(--text-muted)',marginTop:8,opacity:.6}}>
                ⌘K model · ⌘N new chat · ⌘F search · ⌘B sidebar
              </div>
            </div>
          )}
          {activeMsgs.map(msg => (
            <Bubble
              key={msg.id} msg={msg}
              onPv={(code,lang)=>setPv({code,lang})}
              searchQ={searchQ}
              msgRef={el=>{ if(el) msgRefs.current[msg.id]=el; }}
            />
          ))}
          {busy&&streamBuf&&<StreamBubble text={streamBuf} pid={streamPid}/>}
          {busy&&typing&&!streamBuf&&<Typing text={typing}/>}
        </div>

        {/* ── Input bar ── */}
        <div style={{flexShrink:0,padding:'11px 13px 13px',borderTop:'1px solid var(--border)',background:isLight?'rgba(255,251,247,.97)':'rgba(7,10,24,.99)',backdropFilter:'blur(30px)'}}>
          <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
            <div style={{flex:1,position:'relative'}}>
              <textarea
                ref={inpRef} value={inp}
                onChange={e=>props.setInp(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} }}
                disabled={busy}
                placeholder={isDC?'💻 Describe what to build… (DeepCoder)':'Ask anything… Enter = send · Shift+Enter = new line'}
                style={{width:'100%',background:isLight?'rgba(255,251,247,.9)':'rgba(4,8,24,.92)',border:'1.5px solid '+(isDC?'rgba(249,115,22,.28)':'var(--glass-border)'),borderRadius:18,padding:'11px 40px 11px 15px',color:'var(--text-primary)',fontSize:13.5,resize:'none',minHeight:46,maxHeight:150,lineHeight:1.7,fontFamily:'inherit',outline:'none',transition:'all .2s',boxShadow:'0 2px 8px var(--shadow)'}}
                rows={1}
              />
              {inp&&<span style={{position:'absolute',bottom:9,right:11,fontSize:9,color:charCount>charLimit*0.9?'var(--error)':'var(--text-muted)',pointerEvents:'none'}}>{charCount}</span>}
            </div>
            <button onClick={send} disabled={busy||!inp.trim()}
              style={{background:busy||!inp.trim()?'var(--glass)':isDC?'linear-gradient(135deg,#f97316,#ef4444)':'linear-gradient(135deg,var(--primary),#8b5cf6)',border:'none',borderRadius:16,padding:'11px 20px',cursor:busy||!inp.trim()?'not-allowed':'pointer',color:busy||!inp.trim()?'var(--text-muted)':'#fff',fontWeight:800,fontSize:16,fontFamily:'inherit',flexShrink:0,boxShadow:!busy&&inp.trim()?(isDC?'0 6px 20px rgba(249,115,22,.3)':'0 6px 20px rgba(var(--primary-rgb),.32)'):'none',transition:'all .24s cubic-bezier(.4,0,.2,1)',display:'flex',alignItems:'center',justifyContent:'center'}}
            >
              {busy?<span style={{display:'inline-block',animation:'spin 0.7s linear infinite',fontSize:17}}>⟳</span>:'↑'}
            </button>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6,alignItems:'center',fontSize:9,color:'var(--text-muted)'}}>
            <span>GoAi v6.4 · {provAvail} AIs · {activeMode} · {RULES[activePref]?.modelName||activePref}</span>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button onClick={()=>setHfModalOpen(true)} style={{background:'none',border:'none',cursor:'pointer',color:hfKey?'#ffb347':'var(--text-muted)',fontSize:9,fontFamily:'inherit',padding:'1px 3px',borderRadius:5,transition:'all .2s'}}>🤗 {hfKey?'HF ✓':'Add HF'}</button>
              <button onClick={clearChat} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:9,fontFamily:'inherit',padding:'1px 4px',borderRadius:5,transition:'all .2s'}}
                onMouseEnter={e=>e.target.style.color='var(--error)'} onMouseLeave={e=>e.target.style.color='var(--text-muted)'}>🗑 Clear</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals / Drawers ── */}
      <ModelSheet open={pickerOpen} onClose={()=>setPickerOpen(false)} provs={provs} pref={activePref} setPref={setPref} hfKey={hfKey} onSetHFKey={()=>{ setPickerOpen(false); setHfModalOpen(true); }}/>
      <HFSettingsModal open={hfModalOpen} onClose={()=>setHfModalOpen(false)} hfKey={hfKey} onSave={handleSaveHFKey}/>
      <MemDrawer mem={mem} open={memOpen} onClose={()=>setMemOpen(false)} onClear={()=>{ props.setMem([]); try{localStorage.removeItem('goai_mem');}catch{} }}/>
      <SearchDrawer open={searchOpen} onClose={()=>setSearchOpen(false)} msgs={activeMsgs} onJump={jumpToMsg}/>
      <PvModal pv={pv} onClose={()=>setPv(null)}/>
      <AboutModal open={aboutOpen} onClose={()=>setAboutOpen(false)}/>
    </div>
  );
}
