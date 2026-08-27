'use client';
import {useEffect,useState} from 'react';

export default function DiagnosticsPage(){
  const [clicks,setClicks]=useState(0);
  const [api,setApi]=useState<'checking'|'ok'|'error'>('checking');
  const [apiMessage,setApiMessage]=useState('');
  const [storage,setStorage]=useState<'checking'|'ok'|'error'>('checking');

  useEffect(()=>{
    try{
      const key='lifeos_diag';
      localStorage.setItem(key,'ok');
      setStorage(localStorage.getItem(key)==='ok'?'ok':'error');
      localStorage.removeItem(key);
    }catch{setStorage('error')}

    fetch('/backend/health',{cache:'no-store'})
      .then(async response=>{
        const text=await response.text();
        if(!response.ok) throw new Error(`${response.status} ${text}`);
        setApi('ok');setApiMessage(text);
      })
      .catch(error=>{setApi('error');setApiMessage(error instanceof Error?error.message:String(error))});
  },[]);

  return <main className="mx-auto min-h-screen max-w-2xl px-5 py-10">
    <h1 className="text-2xl font-semibold">LifeOS diagnostics</h1>
    <p className="mt-2 text-sm muted">Build marker: API-V3</p>
    <div className="mt-6 space-y-4">
      <section className="card p-5">
        <h2 className="font-medium">1. React client events</h2>
        <p className="mt-2 text-xs muted">If the button increments, client JavaScript is hydrated.</p>
        <button onClick={()=>setClicks(value=>value+1)} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Click test: {clicks}</button>
      </section>
      <section className="card p-5">
        <h2 className="font-medium">2. Backend proxy</h2>
        <p className="mt-2 text-sm">Status: <strong>{api}</strong></p>
        <pre className="mt-3 overflow-auto rounded-xl bg-black/30 p-3 text-xs">{apiMessage||'Checking /backend/health ...'}</pre>
      </section>
      <section className="card p-5">
        <h2 className="font-medium">3. Browser storage</h2>
        <p className="mt-2 text-sm">localStorage: <strong>{storage}</strong></p>
      </section>
      <section className="card p-5">
        <h2 className="font-medium">4. Current origin</h2>
        <p className="mt-2 break-all text-xs muted">{typeof window==='undefined'?'server':window.location.origin}</p>
      </section>
    </div>
  </main>
}
