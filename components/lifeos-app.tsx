'use client';
import {FormEvent,useCallback,useEffect,useState} from 'react';
import {Command} from 'lucide-react';
import {api,ApiError,ApiLearningItem,ApiProject,ApiTask,TaskPriority} from '@/lib/api';
import {Sidebar} from './sidebar';
import {Dashboard,nextStatus} from './dashboard';

const TOKEN_KEY='lifeos_token';
const USER_KEY='lifeos_username';

export function LifeOSApp(){
  const [token,setToken]=useState<string|null>(null);
  const [username,setUsername]=useState('');
  const [ready,setReady]=useState(false);
  const [tasks,setTasks]=useState<ApiTask[]>([]);
  const [projects,setProjects]=useState<ApiProject[]>([]);
  const [learning,setLearning]=useState<ApiLearningItem[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{setToken(localStorage.getItem(TOKEN_KEY));setUsername(localStorage.getItem(USER_KEY)||'');setReady(true)},[]);

  const logout=useCallback(()=>{localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);setToken(null);setTasks([]);setProjects([]);setLearning([]);setError(null)},[]);

  const load=useCallback(async(currentToken:string)=>{
    setLoading(true);setError(null);
    try{
      const [nextTasks,nextProjects,nextLearning]=await Promise.all([
        api.listTasks(currentToken),api.listProjects(currentToken),api.listLearning(currentToken)
      ]);
      setTasks(nextTasks);setProjects(nextProjects);setLearning(nextLearning);
    }catch(err){
      if(err instanceof ApiError&&err.status===401){logout();return}
      setError(err instanceof Error?err.message:'Unable to load dashboard data');
    }finally{setLoading(false)}
  },[logout]);

  useEffect(()=>{if(token)void load(token)},[token,load]);

  function saveSession(nextToken:string,nextUsername:string){
    localStorage.setItem(TOKEN_KEY,nextToken);localStorage.setItem(USER_KEY,nextUsername);
    setUsername(nextUsername);setToken(nextToken);
  }

  if(!ready) return null;
  if(!token) return <AuthScreen onAuthenticated={saveSession}/>;

  async function createTask(input:{title:string;description?:string;priority:TaskPriority}){
    if(!token)return;
    try{const created=await api.createTask(token,input);setTasks(current=>[created,...current]);setError(null)}
    catch(err){setError(err instanceof Error?err.message:'Unable to create task');throw err}
  }

  async function advanceTask(task:ApiTask){
    if(!token)return;
    try{const updated=await api.updateTask(token,task._id,{status:nextStatus[task.status]});setTasks(current=>current.map(item=>item._id===updated._id?updated:item));setError(null)}
    catch(err){setError(err instanceof Error?err.message:'Unable to update task')}
  }

  return <><Sidebar username={username||'User'} taskCount={tasks.length}/><Dashboard username={username||'User'} tasks={tasks} projects={projects} learning={learning} loading={loading} error={error} onCreateTask={createTask} onAdvanceTask={advanceTask} onLogout={logout}/></>
}

function AuthScreen({onAuthenticated}:{onAuthenticated:(token:string,username:string)=>void}){
  const [mode,setMode]=useState<'login'|'register'>('login');
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setError(null);
    try{
      const normalizedUsername=username.trim().toLowerCase();
      const result=mode==='login'?await api.login(normalizedUsername,password):await api.register(normalizedUsername,password);
      onAuthenticated(result.token,username.trim().toLowerCase());
    }catch(err){setError(err instanceof Error?err.message:'Authentication failed')}
    finally{setBusy(false)}
  }

  return <main className="grid min-h-screen place-items-center px-5"><div className="card w-full max-w-md p-7"><div className="mb-7 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700"><Command size={20}/></div><div><h1 className="font-semibold">LifeOS</h1><p className="text-xs muted">Connect to your local API</p></div></div><div className="mb-5 grid grid-cols-2 rounded-xl bg-white/[.04] p-1"><button onClick={()=>setMode('login')} className={`rounded-lg px-3 py-2 text-xs ${mode==='login'?'bg-white text-black':'muted'}`}>Login</button><button onClick={()=>setMode('register')} className={`rounded-lg px-3 py-2 text-xs ${mode==='register'?'bg-white text-black':'muted'}`}>Register</button></div><form onSubmit={submit} className="space-y-3"><input required minLength={3} maxLength={40} className="input" placeholder="Username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)}/><input required minLength={8} maxLength={100} type="password" className="input" placeholder="Password" autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p className="text-xs text-rose-300">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-medium disabled:opacity-50">{busy?'Working...':mode==='login'?'Login':'Create account'}</button></form><p className="mt-4 text-[11px] muted">API: proxied through this Next.js app</p></div></main>
}
