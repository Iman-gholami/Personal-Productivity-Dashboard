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

  return <>
    <button
      onClick={()=>setOpen(true)}
      className="fixed left-5 top-5 z-40 grid h-10 w-10 place-items-center rounded-[14px] border border-white/10 bg-[#0d1017]/90 shadow-2xl backdrop-blur-xl md:hidden"
      aria-label="Open navigation"
    ><Menu size={18}/></button>

    <aside className={`${open?'translate-x-0':'-translate-x-full'} fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col border-r border-white/[.065] bg-[#080a0f]/88 p-4 backdrop-blur-2xl transition duration-300 md:translate-x-0`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-violet-500/[.07] to-transparent"/>
      <div className="pointer-events-none absolute -left-24 top-28 h-40 w-40 rounded-full bg-violet-600/[.08] blur-3xl"/>

      <div className="relative mb-8 flex items-center gap-3 rounded-[18px] border border-white/[.055] bg-white/[.025] px-3 py-3">
        <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[13px] bg-gradient-to-br from-violet-400 via-violet-600 to-cyan-500 shadow-[0_10px_30px_rgba(109,93,252,.28)]">
          <div className="absolute inset-[1px] rounded-[12px] bg-[#0b0d13]/20"/>
          <Command size={18} className="relative"/>
        </div>
        <div className="min-w-0">
          <div className="font-semibold tracking-[-.025em]">LifeOS</div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300/80">Personal command</div>
        </div>
        <button className="ml-auto text-[#737785] md:hidden" onClick={()=>setOpen(false)} aria-label="Close navigation"><X size={18}/></button>
      </div>

      <div className="relative mb-6">
        <p className="label mb-3 px-2">Workspace</p>
        <nav className="space-y-1.5">
          {links.map(({id,label,icon:Icon})=>{
            const active=activeView===id;
            return <button
              onClick={()=>navigate(id)}
              key={id}
              className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-[14px] px-3 py-2.5 text-sm transition duration-200 ${active?'border border-white/[.075] bg-white/[.055] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_10px_28px_rgba(0,0,0,.16)]':'border border-transparent text-[#858997] hover:border-white/[.05] hover:bg-white/[.03] hover:text-white'}`}
            >
              {active&&<span className="absolute inset-y-2 left-0 w-[2px] rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400 shadow-[0_0_14px_rgba(139,108,255,.9)]"/>}
              <span className={`grid h-7 w-7 place-items-center rounded-[9px] transition ${active?'bg-violet-500/10 text-violet-300':'text-[#707482] group-hover:bg-white/[.03] group-hover:text-[#b9bdc8]'}`}><Icon size={15}/></span>
              <span className="tracking-[-.01em]">{label}</span>
              {id==='work'&&<span className={`ml-auto rounded-md border px-1.5 py-0.5 text-[10px] ${active?'border-violet-400/15 bg-violet-400/10 text-violet-200':'border-white/[.06] bg-white/[.025] text-[#777b88]'}`}>{taskCount}</span>}
            </button>;
          })}
        </nav>
      </div>

      <div className="relative rounded-[18px] border border-violet-400/[.10] bg-gradient-to-br from-violet-500/[.10] via-white/[.025] to-cyan-400/[.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="icon-shell h-8 w-8 rounded-[10px]"><Sparkles size={14} className="text-violet-300"/></div>
          <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.16em] text-emerald-300/80"><span className="status-dot"/>Live</div>
        </div>
        <p className="text-xs font-medium">Workspace synced</p>
        <p className="mt-1.5 text-[11px] leading-5 text-[#7e8290]">Tasks, reports and learning data are connected to your API.</p>
      </div>

      <div className="relative mt-auto space-y-1.5 pt-6">
        <div className="cyber-line mb-3 opacity-40"/>
        <button
          onClick={()=>navigate('settings')}
          className={`group flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-sm transition duration-200 ${activeView==='settings'?'border-white/[.075] bg-white/[.055] text-white':'border-transparent text-[#858997] hover:border-white/[.05] hover:bg-white/[.03] hover:text-white'}`}
        >
          <span className="grid h-7 w-7 place-items-center rounded-[9px] text-[#747886] group-hover:text-white"><Settings size={15}/></span>
          Settings
        </button>

        <div className="mt-2 flex items-center gap-3 rounded-[16px] border border-white/[.055] bg-white/[.022] p-3">
          <div className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-600 text-[11px] font-bold shadow-[0_8px_24px_rgba(53,214,199,.12)]">
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0c12] bg-emerald-400"/>
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{username}</p>
            <p className="mt-0.5 text-[10px] text-[#747886]">Personal workspace</p>
          </div>
          <Activity size={14} className="ml-auto text-cyan-300/80"/>
        </div>
      </div>
    </aside>

    {open&&<div onClick={()=>setOpen(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"/>}
  </>;
}
