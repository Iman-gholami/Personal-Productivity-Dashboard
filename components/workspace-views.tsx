'use client';
import {FormEvent,useMemo,useState} from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Flame,
  LogOut,
  Plus,
  Settings as SettingsIcon,
} from 'lucide-react';
import type {
  ApiLearningItem,
  ApiProject,
  ApiReport,
  ApiReview,
  ApiTask,
  ReportPeriod,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from '@/lib/api';
import type {WorkspaceView} from './sidebar';

const taskCategories:TaskCategory[]=['Splunk','Security','Automation','DevOps','Meeting','Support','Other'];

export function WorkspaceViews({
  view,
  username,
  tasks,
  projects,
  learning,
  reviews,
  report,
  reportPeriod,
  error,
  onCreateTask,
  onAdvanceTask,
  onCreateProject,
  onCreateLearningItem,
  onLogLearningSession,
  onReportPeriodChange,
  onCreateReview,
  onLogout,
}:{
  view:WorkspaceView;
  username:string;
  tasks:ApiTask[];
  projects:ApiProject[];
  learning:ApiLearningItem[];
  reviews:ApiReview[];
  report:ApiReport|null;
  reportPeriod:ReportPeriod;
  error:string|null;
  onCreateTask:(input:{
    title:string;
    description?:string;
    priority:TaskPriority;
    category:TaskCategory;
    projectId?:string;
    status?:TaskStatus;
  })=>Promise<void>;
  onAdvanceTask:(task:ApiTask)=>Promise<void>;
  onCreateProject:(input:{name:string;description?:string})=>Promise<void>;
  onCreateLearningItem:(input:{
    title:string;
    type:'course'|'book';
    description?:string;
    totalHours?:number;
    totalPages?:number;
  })=>Promise<void>;
  onLogLearningSession:(item:ApiLearningItem,input:{durationHours?:number;pagesRead?:number;note?:string})=>Promise<void>;
  onReportPeriodChange:(period:ReportPeriod)=>Promise<void>;
  onCreateReview:(input:{learnedToday?:string;blockers?:string;tomorrowFocus?:string})=>Promise<void>;
  onLogout:()=>void;
}){
  if(view==='work') return <WorkView
    tasks={tasks}
    projects={projects}
    report={report}
    reportPeriod={reportPeriod}
    error={error}
    onCreateTask={onCreateTask}
    onAdvanceTask={onAdvanceTask}
    onCreateProject={onCreateProject}
    onReportPeriodChange={onReportPeriodChange}
  />;

  if(view==='learning') return <LearningView
    learning={learning}
    report={report}
    reportPeriod={reportPeriod}
    error={error}
    onCreateLearningItem={onCreateLearningItem}
    onLogLearningSession={onLogLearningSession}
    onReportPeriodChange={onReportPeriodChange}
  />;

  if(view==='review') return <DailyReviewView reviews={reviews} error={error} onCreateReview={onCreateReview}/>;
  return <SettingsView username={username} onLogout={onLogout}/>;
}

function Shell({title,subtitle,icon:Icon,children}:{title:string;subtitle:string;icon:any;children:React.ReactNode}){
  return <main className="min-h-screen md:pl-[244px]">
    <div className="mx-auto max-w-[1500px] px-5 pb-12 pt-20 md:px-8 md:pt-7 xl:px-10">
      <header className="mb-8">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.05] text-violet-300"><Icon size={18}/></div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-[30px]">{title}</h1>
        <p className="mt-2 text-xs muted">{subtitle}</p>
      </header>
      {children}
    </div>
  </main>;
}

function WorkView({
  tasks,projects,report,reportPeriod,error,onCreateTask,onAdvanceTask,onCreateProject,onReportPeriodChange,
}:{
  tasks:ApiTask[];
  projects:ApiProject[];
  report:ApiReport|null;
  reportPeriod:ReportPeriod;
  error:string|null;
  onCreateTask:(input:{title:string;description?:string;priority:TaskPriority;category:TaskCategory;projectId?:string;status?:TaskStatus})=>Promise<void>;
  onAdvanceTask:(task:ApiTask)=>Promise<void>;
  onCreateProject:(input:{name:string;description?:string})=>Promise<void>;
  onReportPeriodChange:(period:ReportPeriod)=>Promise<void>;
}){
  const [savingTask,setSavingTask]=useState(false);
  const [savingProject,setSavingProject]=useState(false);
  const openTasks=tasks.filter(task=>task.status!=='done').length;

  async function submitTask(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const formElement=e.currentTarget;
    const form=new FormData(formElement);
    setSavingTask(true);
    try{
      await onCreateTask({
        title:String(form.get('title')||'').trim(),
        description:String(form.get('description')||'').trim()||undefined,
        category:String(form.get('category')||'Other') as TaskCategory,
        priority:'medium',
        status:String(form.get('status')||'todo') as TaskStatus,
        projectId:String(form.get('projectId')||'')||undefined,
      });
      formElement.reset();
    }finally{setSavingTask(false)}
  }

  async function submitProject(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const formElement=e.currentTarget;
    const form=new FormData(formElement);
    setSavingProject(true);
    try{
      await onCreateProject({
        name:String(form.get('name')||'').trim(),
        description:String(form.get('description')||'').trim()||undefined,
      });
      formElement.reset();
    }finally{setSavingProject(false)}
  }

  return <Shell title="Work" subtitle="Log daily work, keep long-running tasks open, and review weekly or monthly output." icon={Briefcase}>
    {error&&<ErrorBanner message={error}/>}

    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <form onSubmit={submitTask} className="card p-5">
        <div className="mb-4 flex items-center gap-2"><Plus size={16} className="text-violet-300"/><h2 className="font-medium">Log a work task</h2></div>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="title" required className="input md:col-span-2" placeholder="What are you working on?"/>
          <select name="category" defaultValue="Other" className="input">{taskCategories.map(category=><option key={category} value={category}>{category}</option>)}</select>
          <select name="projectId" className="input"><option value="">No project</option>{projects.map(project=><option key={project._id} value={project._id}>{project.name}</option>)}</select>
          <select name="status" defaultValue="done" className="input"><option value="done">Done now</option><option value="in-progress">In progress</option><option value="todo">Todo</option></select>
          <textarea name="description" className="input min-h-20 resize-y md:col-span-2" placeholder="Optional note or result"/>
        </div>
        <button disabled={savingTask} className="mt-3 w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-medium disabled:opacity-50">{savingTask?'Saving...':'Save task'}</button>
      </form>

      <form onSubmit={submitProject} className="card p-5">
        <div className="mb-4 flex items-center gap-2"><FolderKanban size={16} className="text-cyan-300"/><h2 className="font-medium">New project</h2></div>
        <div className="space-y-3">
          <input name="name" required className="input" placeholder="Project name"/>
          <textarea name="description" className="input min-h-24 resize-y" placeholder="Optional description"/>
          <button disabled={savingProject} className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-medium disabled:opacity-50">{savingProject?'Saving...':'Create project'}</button>
        </div>
      </form>
    </section>

    <section className="mt-4 grid gap-3 sm:grid-cols-3">
      <Metric label="Open tasks" value={openTasks}/>
      <Metric label={reportPeriod==='week'?'Completed this week':'Completed this month'} value={report?.work.completed??0}/>
      <Metric label="vs previous period" value={signedPercent(report?.work.changePercent??0)}/>
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <div className="card p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><h2 className="font-medium">Completed tasks</h2><p className="mt-1 text-xs muted">Daily completion trend</p></div>
          <PeriodSwitch value={reportPeriod} onChange={onReportPeriodChange}/>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(report?.work.daily||[]).map(item=>({...item,label:item.date.slice(5)}))}>
              <CartesianGrid vertical={false} stroke="#ffffff0b"/>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#8d8c98'}}/>
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#8d8c98'}} width={24}/>
              <Tooltip contentStyle={{background:'#15151d',border:'1px solid #ffffff12',borderRadius:12,fontSize:12}}/>
              <Bar dataKey="count" fill="#8b6cff" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-medium">Category breakdown</h2>
        <p className="mt-1 text-xs muted">Completed tasks by work type</p>
        <div className="mt-5 space-y-4">{report?.work.categories.length?report.work.categories.map(item=>{
          const max=Math.max(...report.work.categories.map(category=>category.count),1);
          return <div key={item.name}><div className="mb-2 flex justify-between text-xs"><span>{item.name}</span><span className="muted">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-cyan-400" style={{width:`${Math.round(item.count/max*100)}%`}}/></div></div>;
        }):<Empty text="Complete some tasks to see category analytics."/>}</div>
      </div>
    </section>

    <section className="mt-4 card p-5">
      <h2 className="font-medium">Automatic summary</h2>
      <p className="mt-3 text-sm leading-7 text-[#c8c7d0]">{report?.work.summary||'No report data yet.'}</p>
    </section>

    <section className="mt-4 card overflow-hidden">
      <div className="border-b border-white/[.06] p-5"><h2 className="font-medium">All tasks</h2><p className="mt-1 text-xs muted">{tasks.length} recorded tasks</p></div>
      <div>{tasks.length?tasks.map(task=><div key={task._id} className="flex items-center gap-3 border-b border-white/[.045] px-5 py-4 last:border-0">
        <button onClick={()=>onAdvanceTask(task)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${task.status==='done'?'border-emerald-400/30 bg-emerald-500/10 text-emerald-300':'border-white/10 bg-white/[.025] muted'}`} title="Advance status">{task.status==='done'?<Check size={15}/>:<CheckCircle2 size={15}/>}</button>
        <div className="min-w-0 flex-1"><p className={`truncate text-sm font-medium ${task.status==='done'?'text-[#777681] line-through':''}`}>{task.title}</p><p className="mt-1 truncate text-xs muted">{task.category||'Other'} · {task.description||'No note'}</p></div>
        <div className="text-right"><p className="text-[10px] uppercase tracking-wide muted">{task.priority}</p><p className="mt-1 text-[10px] text-violet-300">{task.status}</p></div>
      </div>):<div className="p-5"><Empty text="No tasks yet."/></div>}</div>
    </section>
  </Shell>;
}

function LearningView({
  learning,report,reportPeriod,error,onCreateLearningItem,onLogLearningSession,onReportPeriodChange,
}:{
  learning:ApiLearningItem[];
  report:ApiReport|null;
  reportPeriod:ReportPeriod;
  error:string|null;
  onCreateLearningItem:(input:{title:string;type:'course'|'book';description?:string;totalHours?:number;totalPages?:number})=>Promise<void>;
  onLogLearningSession:(item:ApiLearningItem,input:{durationHours?:number;pagesRead?:number;note?:string})=>Promise<void>;
  onReportPeriodChange:(period:ReportPeriod)=>Promise<void>;
}){
  const [goalType,setGoalType]=useState<'course'|'book'>('course');
  const [selectedId,setSelectedId]=useState('');
  const [savingGoal,setSavingGoal]=useState(false);
  const [savingSession,setSavingSession]=useState(false);

  const selected=useMemo(()=>learning.find(item=>item._id===selectedId)||learning[0],[learning,selectedId]);

  async function submitGoal(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const formElement=e.currentTarget;
    const form=new FormData(formElement);
    setSavingGoal(true);
    try{
      await onCreateLearningItem({
        title:String(form.get('title')||'').trim(),
        description:String(form.get('description')||'').trim()||undefined,
        type:goalType,
        totalHours:goalType==='course'?Number(form.get('totalHours')||0):0,
        totalPages:goalType==='book'?Number(form.get('totalPages')||0):0,
      });
      formElement.reset();
    }finally{setSavingGoal(false)}
  }

  async function submitSession(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!selected)return;
    const formElement=e.currentTarget;
    const form=new FormData(formElement);
    setSavingSession(true);
    try{
      await onLogLearningSession(selected,{
        durationHours:Number(form.get('durationHours')||0),
        pagesRead:Number(form.get('pagesRead')||0),
        note:String(form.get('note')||'').trim()||undefined,
      });
      formElement.reset();
    }finally{setSavingSession(false)}
  }

  return <Shell title="Learning" subtitle="Create a course or book goal, log today's study session, and watch the trend build automatically." icon={BookOpen}>
    {error&&<ErrorBanner message={error}/>}

    <section className="grid gap-4 xl:grid-cols-2">
      <form onSubmit={submitGoal} className="card p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-medium">New learning goal</h2><p className="mt-1 text-xs muted">Course by hours, book by pages</p></div><div className="flex rounded-xl bg-white/[.04] p-1"><button type="button" onClick={()=>setGoalType('course')} className={`rounded-lg px-3 py-2 text-xs ${goalType==='course'?'bg-white text-black':'muted'}`}>Course</button><button type="button" onClick={()=>setGoalType('book')} className={`rounded-lg px-3 py-2 text-xs ${goalType==='book'?'bg-white text-black':'muted'}`}>Book</button></div></div>
        <div className="space-y-3">
          <input name="title" required className="input" placeholder={goalType==='course'?'Course title':'Book title'}/>
          {goalType==='course'
            ? <input name="totalHours" required min="0.1" step="0.1" type="number" className="input" placeholder="Total hours, e.g. 50"/>
            : <input name="totalPages" required min="1" step="1" type="number" className="input" placeholder="Total pages, e.g. 450"/>}
          <textarea name="description" className="input min-h-20 resize-y" placeholder="Optional note"/>
          <button disabled={savingGoal} className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-medium disabled:opacity-50">{savingGoal?'Saving...':'Start goal'}</button>
        </div>
      </form>

      <form onSubmit={submitSession} className="card p-5">
        <div className="mb-4"><h2 className="font-medium">Log today's study</h2><p className="mt-1 text-xs muted">One quick session at a time</p></div>
        <div className="space-y-3">
          <select value={selected?._id||''} onChange={e=>setSelectedId(e.target.value)} className="input" disabled={!learning.length}>
            {learning.length?learning.map(item=><option key={item._id} value={item._id}>{item.title} · {item.type}</option>):<option value="">Create a learning goal first</option>}
          </select>
          {selected?.type==='course'&&<input name="durationHours" required min="0.1" step="0.1" type="number" className="input" placeholder="Hours studied today, e.g. 2"/>}
          {selected?.type==='book'&&<>
            <input name="pagesRead" required min="1" step="1" type="number" className="input" placeholder="Pages read today, e.g. 35"/>
            <input name="durationHours" min="0" step="0.1" type="number" className="input" placeholder="Optional study hours, e.g. 1.5"/>
          </>}
          <textarea name="note" className="input min-h-20 resize-y" placeholder="Optional session note"/>
          <button disabled={savingSession||!selected} className="w-full rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-medium text-violet-200 disabled:opacity-50">{savingSession?'Saving...':'Log session'}</button>
        </div>
      </form>
    </section>

    <section className="mt-4 grid gap-3 sm:grid-cols-4">
      <Metric label={reportPeriod==='week'?'Study hours this week':'Study hours this month'} value={(report?.learning.hours??0).toFixed(1)}/>
      <Metric label={reportPeriod==='week'?'Pages this week':'Pages this month'} value={report?.learning.pages??0}/>
      <Metric label="Study streak" value={`${report?.learning.streak??0} days`}/>
      <Metric label="vs previous hours" value={signedPercent(report?.learning.hoursChangePercent??0)}/>
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-2">
      <div className="card p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><h2 className="font-medium">Study hours trend</h2><p className="mt-1 text-xs muted">Hours studied per day</p></div>
          <PeriodSwitch value={reportPeriod} onChange={onReportPeriodChange}/>
        </div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(report?.learning.daily||[]).map(item=>({...item,label:item.date.slice(5)}))}>
              <defs><linearGradient id="studyArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22c7b8" stopOpacity={.35}/><stop offset="1" stopColor="#22c7b8" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#ffffff0b"/>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#8d8c98'}}/>
              <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#8d8c98'}} width={28}/>
              <Tooltip contentStyle={{background:'#15151d',border:'1px solid #ffffff12',borderRadius:12,fontSize:12}}/>
              <Area type="monotone" dataKey="hours" stroke="#22c7b8" strokeWidth={2.5} fill="url(#studyArea)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-5"><h2 className="font-medium">Pages read trend</h2><p className="mt-1 text-xs muted">Book pages logged per day</p></div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(report?.learning.daily||[]).map(item=>({...item,label:item.date.slice(5)}))}>
              <CartesianGrid vertical={false} stroke="#ffffff0b"/>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#8d8c98'}}/>
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#8d8c98'}} width={30}/>
              <Tooltip contentStyle={{background:'#15151d',border:'1px solid #ffffff12',borderRadius:12,fontSize:12}}/>
              <Bar dataKey="pages" fill="#8b6cff" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>

    <section className="mt-4 card p-5">
      <div className="flex items-start gap-3"><Flame size={18} className="mt-0.5 text-orange-300"/><div><h2 className="font-medium">Automatic learning summary</h2><p className="mt-2 text-sm leading-7 text-[#c8c7d0]">{report?.learning.summary||'No learning activity logged yet.'}</p></div></div>
    </section>

    <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {learning.length?learning.map(item=>{
        const primaryDone=item.type==='course'?item.completedHours:item.completedPages;
        const primaryTotal=item.type==='course'?item.totalHours:item.totalPages;
        const unit=item.type==='course'?'hours':'pages';
        const pct=primaryTotal?Math.min(100,Math.round(primaryDone/primaryTotal*100)):0;
        return <article key={item._id} className="card p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-violet-300">{item.type}</p></div><span className="pill text-[10px] muted">{item.status}</span></div>
          <p className="mt-4 min-h-8 text-xs muted">{item.description||'No description'}</p>
          <div className="mt-5"><div className="mb-2 flex justify-between text-xs"><span>{primaryDone.toFixed(item.type==='course'?1:0)} / {primaryTotal.toFixed(item.type==='course'?1:0)} {unit}</span><span className="muted">{pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-violet-500" style={{width:`${pct}%`}}/></div></div>
          {item.type==='book'&&item.completedHours>0&&<p className="mt-3 text-[11px] muted">{item.completedHours.toFixed(1)} total reading hours logged</p>}
        </article>;
      }):<div className="card p-5"><Empty text="No learning goals yet."/></div>}
    </section>
  </Shell>;
}

function DailyReviewView({reviews,error,onCreateReview}:{reviews:ApiReview[];error:string|null;onCreateReview:(input:{learnedToday?:string;blockers?:string;tomorrowFocus?:string})=>Promise<void>}){
  const [saving,setSaving]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const formElement=e.currentTarget;
    const form=new FormData(formElement);
    setSaving(true);
    try{
      await onCreateReview({
        learnedToday:String(form.get('learnedToday')||'').trim()||undefined,
        blockers:String(form.get('blockers')||'').trim()||undefined,
        tomorrowFocus:String(form.get('tomorrowFocus')||'').trim()||undefined,
      });
      formElement.reset();
    }finally{setSaving(false)}
  }

  return <Shell title="Daily review" subtitle="Capture what you learned, blockers, and tomorrow's focus." icon={CalendarDays}>
    {error&&<ErrorBanner message={error}/>}
    <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <form onSubmit={submit} className="card p-5">
        <h2 className="font-medium">New review</h2>
        <div className="mt-4 space-y-3">
          <textarea name="learnedToday" className="input min-h-28 resize-y" placeholder="What did you learn today?"/>
          <textarea name="blockers" className="input min-h-24 resize-y" placeholder="Any blockers?"/>
          <textarea name="tomorrowFocus" className="input min-h-24 resize-y" placeholder="What is tomorrow's focus?"/>
          <button disabled={saving} className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-medium disabled:opacity-50">{saving?'Saving...':'Save daily review'}</button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="border-b border-white/[.06] p-5"><h2 className="font-medium">Review history</h2><p className="mt-1 text-xs muted">{reviews.length} entries</p></div>
        <div>{reviews.length?reviews.map(review=><article key={review._id} className="border-b border-white/[.045] p-5 last:border-0">
          <div className="mb-3 flex items-center gap-2 text-xs muted"><Clock3 size={13}/>{String(review.date||review.createdAt).slice(0,10)}</div>
          {review.learnedToday&&<ReviewField label="Learned" value={review.learnedToday}/>}
          {review.blockers&&<ReviewField label="Blockers" value={review.blockers}/>}
          {review.tomorrowFocus&&<ReviewField label="Tomorrow" value={review.tomorrowFocus}/>}
        </article>):<div className="p-5"><Empty text="No daily reviews yet."/></div>}</div>
      </div>
    </section>
  </Shell>;
}

function SettingsView({username,onLogout}:{username:string;onLogout:()=>void}){
  return <Shell title="Settings" subtitle="Current local workspace configuration." icon={SettingsIcon}>
    <section className="card max-w-2xl p-5">
      <div className="flex items-center justify-between gap-4 border-b border-white/[.06] pb-5"><div><p className="text-sm font-medium">Signed in as</p><p className="mt-1 text-xs muted">{username}</p></div><span className="pill text-[10px] text-emerald-300">API connected</span></div>
      <div className="py-5"><p className="text-sm font-medium">Backend connection</p><p className="mt-1 text-xs muted">Requests are proxied through Next.js to the Express API.</p></div>
      <button onClick={onLogout} className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200"><LogOut size={16}/>Log out</button>
    </section>
  </Shell>;
}

function PeriodSwitch({value,onChange}:{value:ReportPeriod;onChange:(period:ReportPeriod)=>Promise<void>}){
  return <div className="flex rounded-xl bg-white/[.04] p-1">
    <button onClick={()=>void onChange('week')} className={`rounded-lg px-3 py-2 text-xs ${value==='week'?'bg-white text-black':'muted'}`}>Week</button>
    <button onClick={()=>void onChange('month')} className={`rounded-lg px-3 py-2 text-xs ${value==='month'?'bg-white text-black':'muted'}`}>Month</button>
  </div>;
}

function signedPercent(value:number){return `${value>0?'+':''}${value}%`}
function Metric({label,value}:{label:string;value:string|number}){return <div className="card p-5"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs muted">{label}</p></div>}
function Empty({text}:{text:string}){return <p className="text-xs muted">{text}</p>}
function ErrorBanner({message}:{message:string}){return <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{message}</div>}
function ReviewField({label,value}:{label:string;value:string}){return <div className="mb-3 last:mb-0"><p className="text-[10px] uppercase tracking-wide text-violet-300">{label}</p><p className="mt-1 text-xs leading-relaxed text-[#c5c4cc]">{value}</p></div>}
