'use client';

import {BarChart3,BookOpenCheck,ClipboardCheck,GraduationCap,LogOut,Menu,MessageSquare,Users,X} from 'lucide-react';
import {useState} from 'react';
import {ThemeToggle} from './theme-toggle';

type CounselingRole='counselor'|'student'|'admin';

const roleLabels:Record<CounselingRole,string>={
  counselor:'پنل مشاور',
  student:'پنل دانش‌آموز',
  admin:'پنل ادمین',
};

const roleItems:Record<CounselingRole,{id:string;label:string;icon:any}[]>={
  counselor:[
    {id:'counseling-students',label:'دانش‌آموزها',icon:Users},
    {id:'counseling-plan',label:'برنامه هفتگی',icon:BookOpenCheck},
    {id:'counseling-report',label:'گزارش‌ها',icon:BarChart3},
    {id:'counseling-feedback',label:'بازخورد',icon:MessageSquare},
  ],
  student:[
    {id:'student-week',label:'برنامه من',icon:BookOpenCheck},
    {id:'student-tasks',label:'ثبت گزارش',icon:ClipboardCheck},
    {id:'student-report',label:'تحلیل عملکرد',icon:BarChart3},
    {id:'student-exams',label:'آزمون‌ها',icon:GraduationCap},
    {id:'student-feedback',label:'بازخورد مشاور',icon:MessageSquare},
  ],
  admin:[
    {id:'admin-overview',label:'نمای کلی',icon:BarChart3},
    {id:'admin-counselors',label:'مشاورها',icon:Users},
    {id:'admin-students',label:'دانش‌آموزها',icon:GraduationCap},
  ],
};

export function CounselingSidebar({
  role,
  username,
  onLogout,
}:{
  role:CounselingRole;
  username:string;
  onLogout:()=>void;
}){
  const [open,setOpen]=useState(false);
  const items=roleItems[role];

  function go(id:string){
    document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
    setOpen(false);
  }

  return <>
    <button
      type="button"
      onClick={()=>setOpen(true)}
      className="theme-mobile-nav fixed left-5 top-5 z-40 grid h-10 w-10 place-items-center rounded-[14px] border border-white/10 bg-[#0d1017]/90 shadow-2xl backdrop-blur-xl md:hidden"
      aria-label="باز کردن منو"
    ><Menu size={18}/></button>

    <aside className={`theme-sidebar ${open?'translate-x-0':'-translate-x-full'} fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col border-r border-white/[.065] bg-[#080a0f]/92 p-4 backdrop-blur-2xl transition duration-300 md:translate-x-0`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-violet-500/[.07] to-transparent"/>
      <div className="relative mb-7 flex items-center gap-3 rounded-[18px] border border-white/[.055] bg-white/[.025] px-3 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-[13px] bg-gradient-to-br from-violet-400 via-violet-600 to-cyan-500 text-white">
          <GraduationCap size={19}/>
        </div>
        <div className="min-w-0">
          <p className="font-semibold">LifeOS Counseling</p>
          <p className="mt-0.5 text-[10px] muted">{roleLabels[role]}</p>
        </div>
        <button type="button" onClick={()=>setOpen(false)} className="ml-auto md:hidden"><X size={18}/></button>
      </div>

      <div className="relative">
        <p className="label mb-3 px-2">بخش‌های مرتبط با شما</p>
        <nav className="space-y-1.5">
          {items.map(({id,label,icon:Icon})=><button
            key={id}
            type="button"
            onClick={()=>go(id)}
            className="group flex w-full items-center gap-3 rounded-[14px] border border-transparent px-3 py-2.5 text-right text-sm text-[#858997] transition hover:border-white/[.05] hover:bg-white/[.03] hover:text-white"
          >
            <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-white/[.025]"><Icon size={15}/></span>
            <span>{label}</span>
          </button>)}
        </nav>
      </div>

      <div className="relative mt-auto space-y-2 pt-6">
        <ThemeToggle/>
        <div className="rounded-[14px] border border-white/[.055] bg-white/[.02] px-3 py-3">
          <p className="truncate text-xs font-medium">{username}</p>
          <p className="mt-1 text-[10px] muted">{roleLabels[role]}</p>
        </div>
        <button type="button" onClick={onLogout} className="btn-secondary w-full"><LogOut size={15}/>خروج از حساب</button>
      </div>
    </aside>

    {open&&<div onClick={()=>setOpen(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"/>}
  </>;
}
