'use client';
import {FormEvent,useCallback,useEffect,useState} from 'react';
import {Command} from 'lucide-react';
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
          loading={loading}
          error={error}
          onCreateTask={input=>createTask({...input,category:'Other'})}
          onAdvanceTask={advanceTask}
          onLogout={logout}
        />
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
  const [mode,setMode]=useState<'login'|'register'>('login');
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);
    setError(null);
    try{
      const form=new FormData(e.currentTarget);
      const normalizedUsername=String(form.get('username')||'').trim().toLowerCase();
      const submittedPassword=String(form.get('password')||'');
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

  return <main className="grid min-h-screen place-items-center px-5">
    <div className="card w-full max-w-md p-7">
      <div className="mb-7 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700"><Command size={20}/></div>
        <div><h1 className="font-semibold">LifeOS</h1><p className="text-xs muted">Connect to your local API</p></div>
      </div>
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-white/[.04] p-1">
        <button onClick={()=>setMode('login')} className={`rounded-lg px-3 py-2 text-xs ${mode==='login'?'bg-white text-black':'muted'}`}>Login</button>
        <button onClick={()=>setMode('register')} className={`rounded-lg px-3 py-2 text-xs ${mode==='register'?'bg-white text-black':'muted'}`}>Register</button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input name="username" required minLength={3} maxLength={40} className="input" placeholder="Username" autoComplete="username" defaultValue={username}/>
        <input name="password" required minLength={8} maxLength={100} type="password" className="input" placeholder="Password" autoComplete={mode==='login'?'current-password':'new-password'} defaultValue={password}/>
        {error&&<p className="text-xs text-rose-300">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-medium disabled:opacity-50">{busy?'Working...':mode==='login'?'Login':'Create account'}</button>
      </form>
      <p className="mt-4 text-[11px] muted">API: proxied through this Next.js app</p>
    </div>
  </main>;
}
