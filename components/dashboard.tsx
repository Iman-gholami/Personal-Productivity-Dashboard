'use client';
import {useMemo,useState} from 'react';
import {BookOpen,Check,Clock3,FolderKanban,LogOut,Plus,Sparkles,Target,TrendingUp,Zap} from 'lucide-react';
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
  const openTasks=tasks.filter(t=>t.status!=='done').length;
  const activeProjects=projects.filter(p=>p.status==='active').length;
  const learningHours=learning.reduce((sum,item)=>sum+item.completedHours,0);
  const productivity=tasks.length?Math.round((completed/tasks.length)*100):0;

  const stats=[
    {name:'Completion rate',value:`${productivity}%`,icon:Zap,tone:'violet'},
    {name:'Completed tasks',value:String(completed),icon:Check,tone:'emerald'},
    {name:'Learning hours',value:`${learningHours.toFixed(1)}h`,icon:BookOpen,tone:'cyan'},
    {name:'Active projects',value:String(activeProjects),icon:FolderKanban,tone:'violet'},
  ] as const;

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
      setTitle('');
      setDescription('');
      setPriority('medium');
      setShowForm(false);
    }finally{setSaving(false)}
  }

  return <main className="min-h-screen md:pl-[252px]">
    <div className="mx-auto max-w-[1500px] px-5 pb-12 pt-20 md:px-8 md:pt-8 xl:px-10">
      <header className="animate-in relative mb-7 overflow-hidden rounded-[24px] border border-white/[.065] bg-gradient-to-br from-white/[.035] via-white/[.018] to-transparent px-5 py-5 md:px-6">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-violet-500/[.12] blur-3xl"/>
        <div className="pointer-events-none absolute right-40 top-10 h-32 w-32 rounded-full bg-cyan-400/[.06] blur-3xl"/>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="pill border-emerald-400/10 bg-emerald-400/[.04] text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-300/80"><span className="status-dot"/>Live workspace</span>
              <span className="hidden text-[10px] uppercase tracking-[.18em] text-[#666a78] sm:inline">Command center</span>
            </div>
            <h1 className="page-title">Good to see you, <span className="bg-gradient-to-r from-white via-violet-100 to-cyan-100 bg-clip-text text-transparent">{username}</span>.</h1>
            <p className="page-subtitle">A live view of your work, learning progress and current momentum.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowForm(v=>!v)} className="btn-primary h-11 px-5"><Plus size={16}/>{showForm?'Close':'New task'}</button>
            <button onClick={onLogout} className="btn-secondary h-11 w-11 px-0" title="Log out" aria-label="Log out"><LogOut size={16}/></button>
          </div>
        </div>
      </header>

      {error&&<div className="animate-in mb-4 rounded-[16px] border border-rose-400/20 bg-rose-500/[.08] px-4 py-3 text-xs text-rose-200 shadow-[0_10px_35px_rgba(244,63,94,.06)]">{error}</div>}

      {showForm&&<form onSubmit={submit} className="card-static animate-in mb-4 grid gap-3 p-4 md:grid-cols-[1.2fr_1fr_160px_auto] md:p-5">
        <div className="md:col-span-4">
          <p className="section-kicker">Quick capture</p>
          <p className="panel-heading">Create a new task</p>
        </div>
        <input className="input" placeholder="Task title" value={title} onChange={e=>setTitle(e.target.value)}/>
        <input className="input" placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)}/>
        <select className="input" value={priority} onChange={e=>setPriority(e.target.value as TaskPriority)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button disabled={saving} className="btn-primary">{saving?'Saving...':'Create task'}</button>
      </form>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({name,value,icon:Icon,tone},index)=><div key={name} className="metric-card animate-in" style={{animationDelay:`${index*45}ms`}}>
          <div className="relative flex items-start justify-between">
            <span className={`icon-shell ${tone==='cyan'?'text-cyan-300':tone==='emerald'?'text-emerald-300':'text-violet-300'}`}><Icon size={17}/></span>
            <TrendingUp size={14} className="text-[#565a66]"/>
          </div>
          <p className="metric-value mt-5">{loading?'—':value}</p>
          <p className="mt-1 text-xs text-[#808493]">{name}</p>
        </div>)}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="card animate-in p-5 md:p-6">
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Momentum</p>
              <p className="panel-heading">Weekly focus</p>
              <p className="panel-subtitle">A visual pulse of your recent activity.</p>
            </div>
            <span className="pill text-[10px] text-cyan-200/80"><Sparkles size={11}/>Activity</span>
          </div>
          <div className="mt-3"><ActivityChart/></div>
        </div>

        <div className="card animate-in p-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="section-kicker">Progress</p>
              <p className="panel-heading">Learning goals</p>
              <p className="panel-subtitle">Current course and book completion.</p>
            </div>
            <span className="icon-shell text-cyan-300"><BookOpen size={17}/></span>
          </div>
          <div className="mt-6 space-y-5">
            {learning.length?learning.slice(0,4).map(item=>{
              const done=item.type==='book'?item.completedPages:item.completedHours;
              const total=item.type==='book'?item.totalPages:item.totalHours;
              const pct=total?Math.min(100,Math.round(done/total*100)):0;
              return <div key={item._id}>
                <div className="mb-2.5 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0"><p className="truncate font-medium text-[#d7d8df]">{item.title}</p><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-[#696d7a]">{item.type}</p></div>
                  <span className="font-medium text-violet-200">{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[.055]"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_16px_rgba(139,108,255,.25)] transition-all duration-500" style={{width:`${pct}%`}}/></div>
              </div>;
            }):<p className="text-xs muted">No learning goals yet.</p>}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="card animate-in overflow-hidden">
          <div className="flex items-start justify-between border-b border-white/[.055] p-5 md:p-6">
            <div>
              <p className="section-kicker">Execution</p>
              <p className="panel-heading">Recent tasks</p>
              <p className="panel-subtitle">{openTasks} open · {completed} completed</p>
            </div>
            <span className="pill text-[10px]">{tasks.length} total</span>
          </div>
          <div>
            {loading?<p className="p-5 text-xs muted">Loading...</p>:tasks.length?tasks.slice(0,8).map(t=><div key={t._id} className="group flex items-center gap-3 border-b border-white/[.04] px-5 py-4 transition last:border-0 hover:bg-white/[.018] md:px-6">
              <button onClick={()=>onAdvanceTask(t)} title="Advance task status" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${t.status==='done'?'border-emerald-400/30 bg-emerald-400/90 text-[#07110d] shadow-[0_0_18px_rgba(52,211,153,.16)]':'border-white/[.13] bg-white/[.018] group-hover:border-violet-400/30'}`}>{t.status==='done'&&<Check size={12}/>}</button>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-xs font-medium ${t.status==='done'?'text-[#707480] line-through':'text-[#d8d9df]'}`}>{t.title}</p>
                <p className="mt-1 truncate text-[10px] text-[#6f7380]">{t.description||'No description'} · {t.category||t.priority}</p>
              </div>
              <span className={`hidden rounded-full border px-2 py-1 text-[9px] uppercase tracking-[.12em] sm:block ${t.status==='done'?'border-emerald-400/10 bg-emerald-400/[.04] text-emerald-300/80':t.status==='in-progress'?'border-cyan-400/10 bg-cyan-400/[.04] text-cyan-300/80':'border-white/[.06] bg-white/[.02] text-[#777b88]'}`}>{statusLabel[t.status]}</span>
            </div>):<p className="p-5 text-xs muted">No tasks yet. Create your first task.</p>}
          </div>
        </div>

        <div className="card animate-in p-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="section-kicker">Projects</p>
              <p className="panel-heading">Project pulse</p>
              <p className="panel-subtitle">Progress derived from linked tasks.</p>
            </div>
            <span className="icon-shell text-violet-300"><Target size={17}/></span>
          </div>
          <div className="mt-6 space-y-5">
            {projectProgress.length?projectProgress.map(p=><div key={p._id}>
              <div className="mb-2.5 flex items-center justify-between text-xs">
                <span className="truncate font-medium text-[#d4d5dc]">{p.name}</span>
                <span className="text-[#858996]">{p.progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[.055]"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300 shadow-[0_0_16px_rgba(139,108,255,.18)] transition-all duration-500" style={{width:`${p.progress}%`}}/></div>
            </div>):<p className="text-xs muted">No projects yet.</p>}
          </div>
        </div>
      </section>

      <section className="card-static animate-in mt-4 flex items-center gap-4 p-5">
        <div className="icon-shell text-cyan-300"><Clock3 size={18}/></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">System online</p>
          <p className="mt-1 text-xs leading-5 text-[#777b88]">Auth, tasks, learning and reports are connected to the backend.</p>
        </div>
        <div className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-emerald-300/70 sm:flex"><span className="status-dot"/>Connected</div>
      </section>
    </div>
  </main>;
}

export {nextStatus};
