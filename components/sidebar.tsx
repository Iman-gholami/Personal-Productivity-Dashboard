'use client';
import {Activity,BookOpen,Briefcase,CalendarDays,Command,LayoutDashboard,Menu,Settings,Sparkles,X} from 'lucide-react';
import {useState} from 'react';

export type WorkspaceView='overview'|'work'|'learning'|'review'|'settings';

const links=[
  {id:'overview' as const,label:'Overview',icon:LayoutDashboard},
  {id:'work' as const,label:'Work',icon:Briefcase},
  {id:'learning' as const,label:'Learning',icon:BookOpen},
  {id:'review' as const,label:'Daily review',icon:CalendarDays},
];

export function Sidebar({
  username='User',
  taskCount=0,
  activeView,
  onNavigate,
}:{
  username?:string;
  taskCount?:number;
  activeView:WorkspaceView;
  onNavigate:(view:WorkspaceView)=>void;
}){
  const [open,setOpen]=useState(false);
  const initials=username.slice(0,2).toUpperCase();

  function navigate(view:WorkspaceView){
    onNavigate(view);
    setOpen(false);
  }

  return <><button onClick={()=>setOpen(true)} className="fixed left-5 top-5 z-40 rounded-xl border border-white/10 bg-[#111218] p-2 md:hidden"><Menu size={19}/></button>
  <aside className={`${open?'translate-x-0':'-translate-x-full'} fixed inset-y-0 left-0 z-50 flex w-[244px] flex-col border-r border-white/[.06] bg-[#090a0f]/95 p-5 backdrop-blur-xl transition md:translate-x-0`}>
    <div className="mb-9 flex items-center gap-3 px-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 shadow-lg shadow-violet-800/30"><Command size={18}/></div><div><div className="font-semibold tracking-tight">LifeOS</div><div className="text-[10px] uppercase tracking-[.18em] text-violet-300">Personal system</div></div><button className="ml-auto md:hidden" onClick={()=>setOpen(false)}><X size={18}/></button></div>
    <p className="label mb-3 px-3">Workspace</p>
    <nav className="space-y-1">{links.map(({id,label,icon:Icon})=>{const active=activeView===id;return <button onClick={()=>navigate(id)} key={id} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active?'bg-white/[.07] text-white shadow-inner shadow-white/[.03]':'text-[#898894] hover:bg-white/[.04] hover:text-white'}`}><Icon size={17} className={active?'text-violet-400':''}/>{label}{id==='work'&&<span className="ml-auto rounded-md bg-white/[.06] px-1.5 text-[10px]">{taskCount}</span>}</button>})}</nav>
    <div className="mt-8 rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[.12] to-transparent p-4"><Sparkles size={16} className="mb-3 text-violet-300"/><p className="text-xs font-medium">Live workspace</p><p className="mt-1 text-[11px] leading-relaxed text-[#8d8c98]">Tasks and account data are loaded from your API.</p></div>
    <div className="mt-auto space-y-1"><button onClick={()=>navigate('settings')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${activeView==='settings'?'bg-white/[.07] text-white':'muted hover:bg-white/[.04] hover:text-white'}`}><Settings size={17}/>Settings</button><div className="mt-3 flex items-center gap-3 border-t border-white/[.06] px-2 pt-5"><div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-xs font-bold">{initials}</div><div className="min-w-0"><p className="truncate text-xs font-medium">{username}</p><p className="text-[10px] muted">Personal workspace</p></div><Activity size={14} className="ml-auto text-emerald-400"/></div></div>
  </aside>{open&&<div onClick={()=>setOpen(false)} className="fixed inset-0 z-40 bg-black/60 md:hidden"/>}</>
}
