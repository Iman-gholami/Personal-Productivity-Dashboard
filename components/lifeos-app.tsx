'use client';
import {FormEvent,useCallback,useEffect,useState} from 'react';
import {Command,ShieldCheck,Sparkles} from 'lucide-react';
import {
  api,
  ApiError,
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
import {Sidebar,WorkspaceView} from './sidebar';
import {Dashboard,nextStatus} from './dashboard';
import {WorkspaceViews} from './workspace-views';
import {CounselingWorkspace} from './counseling-workspace';
import {counselingApi} from '@/lib/counseling-api';

const TOKEN_KEY='lifeos_token';
const USER_KEY='lifeos_username';

export function LifeOSApp(){
  const [token,setToken]=useState<string|null>(null);
  const [username,setUsername]=useState('');
  const [ready,setReady]=useState(false);
  const [activeView,setActiveView]=useState<WorkspaceView>('overview');
  const [tasks,setTasks]=useState<ApiTask[]>([]);
  const [projects,setProjects]=useState<ApiProject[]>([]);
  const [learning,setLearning]=useState<ApiLearningItem[]>([]);
  const [reviews,setReviews]=useState<ApiReview[]>([]);
  const [report,setReport]=useState<ApiReport|null>(null);
  const [reportPeriod,setReportPeriod]=useState<ReportPeriod>('week');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    setToken(localStorage.getItem(TOKEN_KEY));
    setUsername(localStorage.getItem(USER_KEY)||'');
    setReady(true);
  },[]);

  const logout=useCallback(()=>{
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setTasks([]);
    setProjects([]);
    setLearning([]);
    setReviews([]);
    setReport(null);
    setActiveView('overview');
    setError(null);
  },[]);

  const load=useCallback(async(currentToken:string,period:ReportPeriod='week')=>{
    setLoading(true);
    setError(null);
    try{
      const [nextTasks,nextProjects,nextLearning,nextReviews,nextReport]=await Promise.all([
        api.listTasks(currentToken),
        api.listProjects(currentToken),
        api.listLearning(currentToken),
        api.listReviews(currentToken),
        api.getReport(currentToken,period),
      ]);
      setTasks(nextTasks);
      setProjects(nextProjects);
      setLearning(nextLearning);
      setReviews(nextReviews);
      setReport(nextReport);
      setReportPeriod(period);
    }catch(err){
      if(err instanceof ApiError&&err.status===401){
        logout();
        return;
      }
      setError(err instanceof Error?err.message:'Unable to load workspace data');
    }finally{
      setLoading(false);
    }
  },[logout]);

  useEffect(()=>{if(token)void load(token,'week')},[token,load]);

  function saveSession(nextToken:string,nextUsername:string){
    localStorage.setItem(TOKEN_KEY,nextToken);
    localStorage.setItem(USER_KEY,nextUsername);
    setUsername(nextUsername);
    setToken(nextToken);
  }

  if(!ready) return null;
  if(!token) return <AuthScreen onAuthenticated={saveSession}/>;

  async function createTask(input:{
    title:string;
    description?:string;
    priority:TaskPriority;
    category:TaskCategory;
    projectId?:string;
    status?:TaskStatus;
  }){
    if(!token)return;
    try{
      const created=await api.createTask(token,input);
      setTasks(current=>[created,...current]);
      setError(null);
      if(created.status==='done') await refreshReport();
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to create task');
      throw err;
    }
  }

  async function advanceTask(task:ApiTask){
    if(!token)return;
    try{
      const updated=await api.updateTask(token,task._id,{status:nextStatus[task.status]});
      setTasks(current=>current.map(item=>item._id===updated._id?updated:item));
      setError(null);
      await refreshReport();
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to update task');
    }
  }

  async function deleteTask(task:ApiTask){
    if(!token)return;
    try{
      await api.deleteTask(token,task._id);
      setTasks(current=>current.filter(item=>item._id!==task._id));
      setError(null);
      await refreshReport();
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to delete task');
      throw err;
    }
  }

  async function createProject(input:{name:string;description?:string}){
    if(!token)return;
    try{
      const created=await api.createProject(token,input);
      setProjects(current=>[created,...current]);
      setError(null);
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to create project');
      throw err;
    }
  }

  async function createLearningItem(input:{
    title:string;
    type:'course'|'book';
    description?:string;
    totalHours?:number;
    totalPages?:number;
  }){
    if(!token)return;
    try{
      const created=await api.createLearningItem(token,input);
      setLearning(current=>[created,...current]);
      setError(null);
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to create learning goal');
      throw err;
    }
  }

  async function logLearningSession(
    item:ApiLearningItem,
    input:{durationHours?:number;pagesRead?:number;note?:string},
  ){
    if(!token)return;
    try{
      const result=await api.logLearningSession(token,item._id,input);
      setLearning(current=>current.map(existing=>existing._id===result.item._id?result.item:existing));
      setError(null);
      await refreshReport();
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to log learning session');
      throw err;
    }
  }

  async function createReview(input:{learnedToday?:string;blockers?:string;tomorrowFocus?:string}){
    if(!token)return;
    try{
      const created=await api.createReview(token,input);
      setReviews(current=>[created,...current]);
      setError(null);
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to save daily review');
      throw err;
    }
  }

  async function refreshReport(period:ReportPeriod=reportPeriod){
    if(!token)return;
    try{
      const next=await api.getReport(token,period);
      setReport(next);
      setReportPeriod(period);
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to load reports');
    }
  }

  return <>
    <Sidebar
      username={username||'User'}
      taskCount={tasks.length}
      activeView={activeView}
      onNavigate={setActiveView}
    />
    {activeView==='overview'
      ? <Dashboard
          username={username||'User'}
          tasks={tasks}
          projects={projects}
          learning={learning}
          report={report}
          loading={loading}
          error={error}
          onCreateTask={input=>createTask({...input,category:'Other'})}
          onAdvanceTask={advanceTask}
          onLogout={logout}
        />
      : activeView==='counseling'
      ? <CounselingWorkspace token={token} username={username||'User'}/>
      : <WorkspaceViews
          view={activeView}
          username={username||'User'}
          tasks={tasks}
          projects={projects}
          learning={learning}
          reviews={reviews}
          report={report}
          reportPeriod={reportPeriod}
          error={error}
          onCreateTask={createTask}
          onAdvanceTask={advanceTask}
          onDeleteTask={deleteTask}
          onCreateProject={createProject}
          onCreateLearningItem={createLearningItem}
          onLogLearningSession={logLearningSession}
          onReportPeriodChange={refreshReport}
          onCreateReview={createReview}
          onLogout={logout}
        />
    }
  </>;
}

function AuthScreen({onAuthenticated}:{onAuthenticated:(token:string,username:string)=>void}){
  const [mode,setMode]=useState<'login'|'register'|'activate'>('login');
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<string|null>(null);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try{
      const form=new FormData(e.currentTarget);
      const normalizedUsername=String(form.get('username')||'').trim().toLowerCase();
      const submittedPassword=String(form.get('password')||'');
      if(mode==='activate'){
        await counselingApi.activateStudent({
          username:normalizedUsername,
          activationCode:String(form.get('activationCode')||'').trim(),
          password:submittedPassword,
        });
        setUsername(normalizedUsername);
        setPassword('');
        setMode('login');
        setNotice('حساب دانش‌آموز فعال شد. حالا وارد شو.');
        return;
      }
      const result=mode==='login'
        ? await api.login(normalizedUsername,submittedPassword)
        : await api.register(normalizedUsername,submittedPassword);
      setUsername(normalizedUsername);
      setPassword('');
      onAuthenticated(result.token,normalizedUsername);
    }catch(err){
      setError(err instanceof Error?err.message:'Authentication failed');
    }finally{
      setBusy(false);
    }
  }

  return <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
    <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-violet-600/[.13] blur-[120px]"/>
    <div className="pointer-events-none absolute bottom-[-160px] right-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/[.07] blur-[110px]"/>

    <div className="animate-in relative grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/[.075] bg-[#0a0c12]/80 shadow-[0_35px_120px_rgba(0,0,0,.48)] backdrop-blur-2xl md:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-[520px] overflow-hidden border-r border-white/[.055] p-8 md:flex md:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[.10] via-transparent to-cyan-400/[.05]"/>
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)',backgroundSize:'34px 34px'}}/>
        <div className="relative">
          <div className="mb-8 flex items-center gap-3">
            <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-[14px] bg-gradient-to-br from-violet-400 via-violet-600 to-cyan-500 shadow-[0_14px_36px_rgba(109,93,252,.25)]"><Command size={19}/></div>
            <div><p className="font-semibold tracking-[-.025em]">LifeOS</p><p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300/80">Personal command system</p></div>
          </div>
          <p className="section-kicker">Your private workspace</p>
          <h1 className="max-w-sm text-[34px] font-semibold leading-[1.08] tracking-[-.05em]">Turn daily effort into visible momentum.</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#898d9b]">Track work, learning goals and progress in one focused command center.</p>
        </div>
        <div className="relative mt-auto space-y-3">
          <div className="rounded-[16px] border border-white/[.06] bg-white/[.025] p-4">
            <div className="flex items-center gap-2 text-xs font-medium"><Sparkles size={14} className="text-violet-300"/>Work + Learning analytics</div>
            <p className="mt-2 text-[11px] leading-5 text-[#737785]">Weekly and monthly trends stay tied to the activity you actually log.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.15em] text-emerald-300/70"><span className="status-dot"/>API connected</div>
        </div>
      </section>

      <section className="relative p-6 sm:p-8 md:p-9">
        <div className="mb-8 md:hidden">
          <div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-[13px] bg-gradient-to-br from-violet-400 via-violet-600 to-cyan-500"><Command size={18}/></div><div><p className="font-semibold">LifeOS</p><p className="text-[9px] uppercase tracking-[.2em] text-violet-300/80">Personal command</p></div></div>
        </div>
        <div className="mb-7">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[#727684]"><ShieldCheck size={13} className="text-cyan-300"/>Secure session</div>
          <h2 className="text-2xl font-semibold tracking-[-.035em]">{mode==='login'?'Welcome back':mode==='register'?'Create your workspace':'Activate student account'}</h2>
          <p className="mt-2 text-sm text-[#7d8190]">{mode==='login'?'Sign in to continue to your command center.':mode==='register'?'Create an account to start tracking your work and learning.':'Use the activation code provided by your counselor and choose your password.'}</p>
        </div>
        <div className="mb-5 grid grid-cols-3 rounded-[14px] border border-white/[.055] bg-black/20 p-1">
          <button type="button" onClick={()=>{setMode('login');setError(null);setNotice(null)}} className={`rounded-[10px] px-3 py-2.5 text-xs font-medium transition ${mode==='login'?'bg-white/[.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]':'text-[#737785] hover:text-white'}`}>Login</button>
          <button type="button" onClick={()=>{setMode('register');setError(null);setNotice(null)}} className={`rounded-[10px] px-3 py-2.5 text-xs font-medium transition ${mode==='register'?'bg-white/[.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]':'text-[#737785] hover:text-white'}`}>Register</button>
          <button type="button" onClick={()=>{setMode('activate');setError(null);setNotice(null)}} className={`rounded-[10px] px-3 py-2.5 text-xs font-medium transition ${mode==='activate'?'bg-white/[.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]':'text-[#737785] hover:text-white'}`}>Student</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="mb-2 block text-[10px] font-semibold uppercase tracking-[.15em] text-[#747887]">Username</label><input name="username" required minLength={3} maxLength={40} className="input" placeholder="Enter username" autoComplete="username" defaultValue={username}/></div>
          {mode==='activate'&&<div><label className="mb-2 block text-[10px] font-semibold uppercase tracking-[.15em] text-[#747887]">Activation code</label><input name="activationCode" required className="input" placeholder="Paste activation code"/></div>}
          <div><label className="mb-2 block text-[10px] font-semibold uppercase tracking-[.15em] text-[#747887]">Password</label><input name="password" required minLength={8} maxLength={100} type="password" className="input" placeholder={mode==='activate'?'Choose a new password':'Enter password'} autoComplete={mode==='login'?'current-password':'new-password'} defaultValue={password}/></div>
          {notice&&<p className="rounded-[12px] border border-emerald-400/15 bg-emerald-500/[.07] px-3 py-2.5 text-xs text-emerald-200">{notice}</p>}
          {error&&<p className="rounded-[12px] border border-rose-400/15 bg-rose-500/[.07] px-3 py-2.5 text-xs text-rose-200">{error}</p>}
          <button disabled={busy} className="btn-primary mt-1 w-full">{busy?'Working...':mode==='login'?'Enter LifeOS':mode==='register'?'Create account':'Activate student account'}</button>
        </form>
        <div className="mt-6 flex items-center justify-between border-t border-white/[.055] pt-4 text-[10px] text-[#656977]">
          <span>Next.js proxy</span>
          <span className="flex items-center gap-1.5"><span className="status-dot"/>Backend online</span>
        </div>
      </section>
    </div>
  </main>;
}
