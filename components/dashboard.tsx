'use client';
import {useMemo,useState} from 'react';
import {BookOpen,Check,Clock3,FolderKanban,LogOut,Plus,Target,Zap} from 'lucide-react';
import {ActivityChart} from './charts';
import type {ApiLearningItem,ApiProject,ApiTask,TaskPriority,TaskStatus} from '@/lib/api';

const statusLabel:Record<TaskStatus,string>={todo:'Todo','in-progress':'In progress',done:'Done'};
const nextStatus:Record<TaskStatus,TaskStatus>={todo:'in-progress','in-progress':'done',done:'todo'};

export function Dashboard({
  username,tasks,projects,learning,loading,error,onCreateTask,onAdvanceTask,onLogout
}:{
  username:string;
  tasks:ApiTask[];
  projects:ApiProject[];
  learning:ApiLearningItem[];
  loading:boolean;
  error:string|null;
  onCreateTask:(input:{title:string;description?:string;priority:TaskPriority})=>Promise<void>;
  onAdvanceTask:(task:ApiTask)=>Promise<void>;
  onLogout:()=>void;
}){
  const [showForm,setShowForm]=useState(false);
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [priority,setPriority]=useState<TaskPriority>('medium');
  const [saving,setSaving]=useState(false);

  const completed=tasks.filter(t=>t.status==='done').length;
  const activeProjects=projects.filter(p=>p.status==='active').length;
  const learningHours=learning.reduce((sum,item)=>sum+item.completedHours,0);
  const productivity=tasks.length?Math.round((completed/tasks.length)*100):0;
  const stats=[
    {name:'Productivity score',value:String(productivity),icon:Zap},
    {name:'Tasks completed',value:String(completed),icon:Check},
    {name:'Learning hours',value:`${learningHours.toFixed(1)}h`,icon:BookOpen},
    {name:'Active projects',value:String(activeProjects),icon:FolderKanban},
  ];

  const projectProgress=useMemo(()=>projects.map(project=>{
    const related=tasks.filter(task=>task.projectId===project._id);
    const done=related.filter(task=>task.status==='done').length;
    return {...project,progress:related.length?Math.round(done/related.length*100):0};
  }),[projects,tasks]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(!title.trim()) return;
    setSaving(true);
    try{
      await onCreateTask({title:title.trim(),description:description.trim()||undefined,priority});
      setTitle('');setDescription('');setPriority('medium');setShowForm(false);
    } finally {setSaving(false)}
  }

  return <main className="min-h-screen md:pl-[244px]"><div className="mx-auto max-w-[1500px] px-5 pb-12 pt-20 md:px-8 md:pt-7 xl:px-10">
    <header className="mb-8 flex items-start justify-between gap-4"><div><p className="mb-1 text-xs text-violet-300">LIVE API · BUILD API-V3</p><h1 className="text-2xl font-semibold tracking-tight md:text-[30px]">Good to see you, {username}.</h1><p className="mt-2 text-xs muted">Task data below is loaded from your Express + MongoDB backend.</p></div><div className="flex items-center gap-2"><button onClick={()=>setShowForm(v=>!v)} className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-black"><Plus size={16}/>New task</button><button onClick={onLogout} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10" title="Log out"><LogOut size={16}/></button></div></header>
    {error&&<div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}
    {showForm&&<form onSubmit={submit} className="card mb-4 grid gap-3 p-5 md:grid-cols-[1fr_1fr_160px_auto]"><input className="input" placeholder="Task title" value={title} onChange={e=>setTitle(e.target.value)}/><input className="input" placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)}/><select className="input" value={priority} onChange={e=>setPriority(e.target.value as TaskPriority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><button disabled={saving} className="rounded-xl bg-violet-500 px-4 py-3 text-sm font-medium disabled:opacity-50">{saving?'Saving...':'Create'}</button></form>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({name,value,icon:Icon})=><div key={name} className="card p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.05] text-violet-300"><Icon size={17}/></span><p className="mt-5 text-2xl font-semibold tracking-tight">{loading?'—':value}</p><p className="mt-1 text-xs muted">{name}</p></div>)}</section>
    <section className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]"><div className="card overflow-hidden p-5"><div><p className="font-medium">Weekly focus</p><p className="mt-1 text-xs muted">Demo activity until session analytics are added</p></div><div className="mt-2"><ActivityChart/></div></div>
    <div className="card p-5"><div className="flex items-center justify-between"><div><p className="font-medium">Learning progress</p><p className="mt-1 text-xs muted">Live learning records</p></div><BookOpen size={17} className="text-cyan-300"/></div><div className="mt-5 space-y-4">{learning.length?learning.slice(0,4).map(item=>{const pct=item.totalHours?Math.round(item.completedHours/item.totalHours*100):0;return <div key={item._id}><div className="mb-2 flex justify-between text-xs"><span className="truncate">{item.title}</span><span className="muted">{pct}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-violet-500" style={{width:`${pct}%`}}/></div></div>}):<p className="text-xs muted">No learning items yet.</p>}</div></div></section>
    <section className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]"><div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-white/[.06] p-5"><div><p className="font-medium">Your tasks</p><p className="mt-1 text-xs muted">{tasks.length} records from MongoDB</p></div></div><div>{loading?<p className="p-5 text-xs muted">Loading...</p>:tasks.length?tasks.slice(0,8).map(t=><div key={t._id} className="flex items-center gap-3 border-b border-white/[.045] px-5 py-3.5 last:border-0"><button onClick={()=>onAdvanceTask(t)} title="Advance task status" className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${t.status==='done'?'border-emerald-500 bg-emerald-500 text-black':'border-white/20'}`}>{t.status==='done'&&<Check size={12}/>}</button><div className="min-w-0 flex-1"><p className={`truncate text-xs font-medium ${t.status==='done'?'text-[#676670] line-through':''}`}>{t.title}</p><p className="mt-1 truncate text-[10px] muted">{t.description||'No description'} · {t.priority}</p></div><span className="hidden w-20 text-right text-[10px] muted sm:block">{statusLabel[t.status]}</span></div>):<p className="p-5 text-xs muted">No tasks yet. Create your first task.</p>}</div></div>
    <div className="card p-5"><div className="flex items-center justify-between"><div><p className="font-medium">Project pulse</p><p className="mt-1 text-xs muted">Derived from linked tasks</p></div><Target size={17} className="text-violet-300"/></div><div className="mt-6 space-y-5">{projectProgress.length?projectProgress.map(p=><div key={p._id}><div className="mb-2 flex justify-between text-xs"><span>{p.name}</span><span className="muted">{p.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-violet-500" style={{width:`${p.progress}%`}}/></div></div>):<p className="text-xs muted">No projects yet.</p>}</div></div></section>
    <section className="mt-4 card flex items-center gap-4 p-5"><div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Clock3 size={20}/></div><div><p className="text-sm font-medium">Backend connected</p><p className="mt-1 text-xs muted">Auth, protected reads, task creation and task updates now use the API.</p></div></section>
  </div></main>
}

export {nextStatus};
