'use client';
import {FormEvent,useState} from 'react';
import {BookOpen,Briefcase,CalendarDays,CheckCircle2,Clock3,FolderKanban,LogOut,Settings as SettingsIcon} from 'lucide-react';
import type {ApiLearningItem,ApiProject,ApiReview,ApiTask} from '@/lib/api';
import type {WorkspaceView} from './sidebar';

export function WorkspaceViews({
  view,
  username,
  tasks,
  projects,
  learning,
  reviews,
  error,
  onCreateReview,
  onLogout,
}:{
  view:WorkspaceView;
  username:string;
  tasks:ApiTask[];
  projects:ApiProject[];
  learning:ApiLearningItem[];
  reviews:ApiReview[];
  error:string|null;
  onCreateReview:(input:{learnedToday?:string;blockers?:string;tomorrowFocus?:string})=>Promise<void>;
  onLogout:()=>void;
}){
  if(view==='work') return <WorkView tasks={tasks} projects={projects} error={error}/>;
  if(view==='learning') return <LearningView learning={learning} error={error}/>;
  if(view==='review') return <DailyReviewView reviews={reviews} error={error} onCreateReview={onCreateReview}/>;
  return <SettingsView username={username} onLogout={onLogout}/>;
}

function Shell({title,subtitle,icon:Icon,children}:{title:string;subtitle:string;icon:any;children:React.ReactNode}){
  return <main className="min-h-screen md:pl-[244px]"><div className="mx-auto max-w-[1500px] px-5 pb-12 pt-20 md:px-8 md:pt-7 xl:px-10">
    <header className="mb-8"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.05] text-violet-300"><Icon size={18}/></div><h1 className="text-2xl font-semibold tracking-tight md:text-[30px]">{title}</h1><p className="mt-2 text-xs muted">{subtitle}</p></header>
    {children}
  </div></main>
}

function WorkView({tasks,projects,error}:{tasks:ApiTask[];projects:ApiProject[];error:string|null}){
  const done=tasks.filter(t=>t.status==='done').length;
  const active=tasks.filter(t=>t.status!=='done').length;
  return <Shell title="Work" subtitle="Projects and tasks from your MongoDB workspace." icon={Briefcase}>
    {error&&<ErrorBanner message={error}/>}
    <section className="grid gap-3 sm:grid-cols-3">
      <Metric label="Projects" value={projects.length}/>
      <Metric label="Open tasks" value={active}/>
      <Metric label="Completed" value={done}/>
    </section>
    <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
      <div className="card p-5"><div className="mb-5 flex items-center gap-2"><FolderKanban size={17} className="text-violet-300"/><h2 className="font-medium">Projects</h2></div><div className="space-y-3">{projects.length?projects.map(project=><div key={project._id} className="rounded-xl border border-white/[.06] bg-white/[.025] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{project.name}</p><span className="pill text-[10px] muted">{project.status}</span></div><p className="mt-2 text-xs muted">{project.description||'No description'}</p></div>):<Empty text="No projects yet."/>}</div></div>
      <div className="card overflow-hidden"><div className="border-b border-white/[.06] p-5"><h2 className="font-medium">Tasks</h2><p className="mt-1 text-xs muted">{tasks.length} total</p></div><div>{tasks.length?tasks.map(task=><div key={task._id} className="flex items-center gap-3 border-b border-white/[.045] px-5 py-4 last:border-0"><div className={`grid h-8 w-8 place-items-center rounded-lg ${task.status==='done'?'bg-emerald-500/10 text-emerald-300':'bg-white/[.04] muted'}`}><CheckCircle2 size={16}/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{task.title}</p><p className="mt-1 truncate text-xs muted">{task.description||'No description'}</p></div><div className="text-right"><p className="text-[10px] uppercase tracking-wide muted">{task.priority}</p><p className="mt-1 text-[10px] text-violet-300">{task.status}</p></div></div>):<div className="p-5"><Empty text="No tasks yet."/></div>}</div></div>
    </section>
  </Shell>
}

function LearningView({learning,error}:{learning:ApiLearningItem[];error:string|null}){
  const completedHours=learning.reduce((sum,item)=>sum+item.completedHours,0);
  return <Shell title="Learning" subtitle="Track courses, books, skills, and completed hours." icon={BookOpen}>
    {error&&<ErrorBanner message={error}/>}
    <section className="grid gap-3 sm:grid-cols-2"><Metric label="Learning items" value={learning.length}/><Metric label="Completed hours" value={completedHours.toFixed(1)}/></section>
    <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{learning.length?learning.map(item=>{const pct=item.totalHours?Math.round(item.completedHours/item.totalHours*100):0;return <article key={item._id} className="card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-violet-300">{item.type}</p></div><span className="pill text-[10px] muted">{item.status}</span></div><p className="mt-4 min-h-8 text-xs muted">{item.description||'No description'}</p><div className="mt-5"><div className="mb-2 flex justify-between text-xs"><span>{item.completedHours.toFixed(1)} / {item.totalHours.toFixed(1)} hours</span><span className="muted">{pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-violet-500" style={{width:`${pct}%`}}/></div></div></article>}):<div className="card p-5"><Empty text="No learning items yet."/></div>}</section>
  </Shell>
}

function DailyReviewView({reviews,error,onCreateReview}:{reviews:ApiReview[];error:string|null;onCreateReview:(input:{learnedToday?:string;blockers?:string;tomorrowFocus?:string})=>Promise<void>}){
  const [saving,setSaving]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    setSaving(true);
    try{
      await onCreateReview({
        learnedToday:String(form.get('learnedToday')||'').trim()||undefined,
        blockers:String(form.get('blockers')||'').trim()||undefined,
        tomorrowFocus:String(form.get('tomorrowFocus')||'').trim()||undefined,
      });
      e.currentTarget.reset();
    } finally {setSaving(false)}
  }

  return <Shell title="Daily review" subtitle="Capture what you learned, blockers, and tomorrow's focus." icon={CalendarDays}>
    {error&&<ErrorBanner message={error}/>}
    <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <form onSubmit={submit} className="card p-5"><h2 className="font-medium">New review</h2><div className="mt-4 space-y-3"><textarea name="learnedToday" className="input min-h-28 resize-y" placeholder="What did you learn today?"/><textarea name="blockers" className="input min-h-24 resize-y" placeholder="Any blockers?"/><textarea name="tomorrowFocus" className="input min-h-24 resize-y" placeholder="What is tomorrow's focus?"/><button disabled={saving} className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-medium disabled:opacity-50">{saving?'Saving...':'Save daily review'}</button></div></form>
      <div className="card overflow-hidden"><div className="border-b border-white/[.06] p-5"><h2 className="font-medium">Review history</h2><p className="mt-1 text-xs muted">{reviews.length} entries</p></div><div>{reviews.length?reviews.map(review=><article key={review._id} className="border-b border-white/[.045] p-5 last:border-0"><div className="mb-3 flex items-center gap-2 text-xs muted"><Clock3 size={13}/>{new Date(review.date||review.createdAt).toLocaleDateString()}</div>{review.learnedToday&&<ReviewField label="Learned" value={review.learnedToday}/>} {review.blockers&&<ReviewField label="Blockers" value={review.blockers}/>} {review.tomorrowFocus&&<ReviewField label="Tomorrow" value={review.tomorrowFocus}/>}</article>):<div className="p-5"><Empty text="No daily reviews yet."/></div>}</div></div>
    </section>
  </Shell>
}

function SettingsView({username,onLogout}:{username:string;onLogout:()=>void}){
  return <Shell title="Settings" subtitle="Current local workspace configuration." icon={SettingsIcon}>
    <section className="card max-w-2xl p-5"><div className="flex items-center justify-between gap-4 border-b border-white/[.06] pb-5"><div><p className="text-sm font-medium">Signed in as</p><p className="mt-1 text-xs muted">{username}</p></div><span className="pill text-[10px] text-emerald-300">API connected</span></div><div className="py-5"><p className="text-sm font-medium">Backend connection</p><p className="mt-1 text-xs muted">Requests are proxied through Next.js to the Express API.</p></div><button onClick={onLogout} className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200"><LogOut size={16}/>Log out</button></section>
  </Shell>
}

function Metric({label,value}:{label:string;value:string|number}){return <div className="card p-5"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs muted">{label}</p></div>}
function Empty({text}:{text:string}){return <p className="text-xs muted">{text}</p>}
function ErrorBanner({message}:{message:string}){return <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{message}</div>}
function ReviewField({label,value}:{label:string;value:string}){return <div className="mb-3 last:mb-0"><p className="text-[10px] uppercase tracking-wide text-violet-300">{label}</p><p className="mt-1 text-xs leading-relaxed text-[#c5c4cc]">{value}</p></div>}
