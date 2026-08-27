'use client';

import {FormEvent,useCallback,useEffect,useMemo,useState} from 'react';
import {
  Bar,BarChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis,
  Area,AreaChart,
} from 'recharts';
import {
  BarChart3,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Edit3,
  GraduationCap,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  counselingApi,
  CounselingFeedback,
  CounselingMe,
  CounselingMeta,
  CounselingReport,
  CounselingReportPeriod,
  CounselingStudentProfile,
  StudyActivityType,
  StudySubmissionStatus,
  StudyTask,
  StudentGrade,
  StudentTrack,
  WeeklyPlan,
} from '@/lib/counseling-api';

const dayLabels=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const statusLabels:Record<StudySubmissionStatus,string>={
  'not-started':'شروع نشده',
  'in-progress':'در حال انجام',
  done:'انجام شده',
  partial:'نیمه‌کاره',
  skipped:'انجام نشده',
};

export function CounselingWorkspace({token,username}:{token:string;username:string}){
  const [me,setMe]=useState<CounselingMe|null>(null);
  const [meta,setMeta]=useState<CounselingMeta|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);
    setError(null);
    try{
      const [nextMe,nextMeta]=await Promise.all([counselingApi.me(token),counselingApi.meta()]);
      setMe(nextMe);
      setMeta(nextMeta);
    }catch(err){
      setError(err instanceof Error?err.message:'خطا در بارگذاری فضای مشاوره');
    }finally{setLoading(false)}
  },[token]);

  useEffect(()=>{void load()},[load]);

  if(loading) return <CounselingShell title="Counseling" subtitle="در حال بارگذاری فضای مشاوره..."><LoadingPanel/></CounselingShell>;
  if(error||!me||!meta) return <CounselingShell title="Counseling" subtitle="فضای برنامه‌ریزی و گزارش تحصیلی"><ErrorPanel message={error||'اطلاعات کاربر در دسترس نیست'} onRetry={load}/></CounselingShell>;

  if(me.roles.includes('admin')) return <AdminPanel token={token} me={me}/>;
  if(me.roles.includes('counselor')) return <CounselorPanel token={token} me={me} meta={meta}/>;
  if(me.roles.includes('student')) return <StudentPanel token={token} me={me} meta={meta}/>;

  return <CounselingShell title="Counseling" subtitle="یک فضای مستقل برای مدیریت برنامه و عملکرد دانش‌آموزان">
    <section className="card mx-auto max-w-3xl p-6 md:p-8" dir="rtl">
      <div className="flex items-start gap-4">
        <span className="icon-shell h-12 w-12 shrink-0 text-violet-300"><GraduationCap size={21}/></span>
        <div className="flex-1">
          <p className="section-kicker">Counseling workspace</p>
          <h2 className="text-xl font-semibold tracking-tight">فضای مشاوره هنوز برای {username} فعال نشده</h2>
          <p className="mt-3 text-sm leading-7 muted">برای تست MVP می‌توانی همین حساب را به نقش مشاور ارتقا بدهی. در نسخه production می‌توان self-enrollment را با ENV غیرفعال کرد.</p>
          <button
            onClick={async()=>{try{await counselingApi.activateCounselor(token);await load()}catch(err){setError(err instanceof Error?err.message:'فعال‌سازی ناموفق بود')}}}
            className="btn-primary mt-5"
          ><ShieldCheck size={16}/>فعال‌سازی پنل مشاور</button>
        </div>
      </div>
    </section>
  </CounselingShell>;
}

function scrollToPanel(id:string){
  document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
}

function CounselingQuickNav({items}:{items:{id:string;label:string}[]}){
  return <div className="counseling-quicknav" dir="rtl">
    {items.map(item=><button key={item.id} type="button" onClick={()=>scrollToPanel(item.id)}>{item.label}</button>)}
  </div>;
}

function CounselorStartGuide({hasStudent,hasPlan,published}:{hasStudent:boolean;hasPlan:boolean;published:boolean}){
  const next=!hasStudent
    ?'اول یک دانش‌آموز بساز یا از فهرست انتخاب کن.'
    :!hasPlan
      ?'دانش‌آموز انتخاب شده؛ حالا برنامه این هفته را بساز.'
      :!published
        ?'چند تسک به برنامه اضافه کن و در پایان برنامه را منتشر کن.'
        :'برنامه منتشر شده؛ از اینجا به بعد گزارش دانش‌آموز و بازخورد را بررسی کن.';
  const steps=[
    ['۱','دانش‌آموز','دانش‌آموز را بساز یا انتخاب کن.'],
    ['۲','برنامه هفته','برای شنبه تا جمعه برنامه بساز یا هفته قبل را کپی کن.'],
    ['۳','تسک‌ها','برای هر روز درس، فصل، زمان و تعداد تست را مشخص کن.'],
    ['۴','گزارش و بازخورد','بعد از ثبت عملکرد دانش‌آموز، گزارش را ببین و بازخورد بده.'],
  ];
  return <section className="counseling-guide card-static mb-4 p-5 md:p-6" dir="rtl">
    <p className="text-[11px] font-semibold text-violet-300">راهنمای کار</p>
    <h2 className="mt-1 text-lg font-semibold">از اینجا شروع کن</h2>
    <p className="mt-2 rounded-xl border border-violet-400/10 bg-violet-500/[.05] px-3 py-2 text-sm leading-7">{next}</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map(([number,title,description])=><div key={number} className="counseling-guide-step">
        <span className="counseling-guide-number">{number}</span>
        <div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-[11px] leading-6 muted">{description}</p></div>
      </div>)}
    </div>
  </section>;
}

function StudentStartGuide({hasPlan,todayTasks}:{hasPlan:boolean;todayTasks:number}){
  const next=!hasPlan
    ?'هنوز برنامه‌ای از طرف مشاور منتشر نشده است.'
    :todayTasks
      ?`امروز ${todayTasks} تسک داری. اول آن‌ها را انجام بده و نتیجه واقعی را داخل هر تسک ثبت کن.`
      :'برای امروز تسکی ثبت نشده؛ می‌توانی برنامه بقیه هفته یا گزارش‌ها را ببینی.';
  return <section className="counseling-guide card-static mb-4 p-5 md:p-6" dir="rtl">
    <p className="text-[11px] font-semibold text-violet-300">راهنمای امروز</p>
    <h2 className="mt-1 text-lg font-semibold">الان باید چه کار کنم؟</h2>
    <p className="mt-2 text-sm leading-7 muted">{next}</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <div className="counseling-guide-step"><span className="counseling-guide-number">۱</span><div><p className="text-sm font-medium">برنامه را ببین</p><p className="mt-1 text-[11px] leading-6 muted">تسک‌های امروز و هدف هر درس را بررسی کن.</p></div></div>
      <div className="counseling-guide-step"><span className="counseling-guide-number">۲</span><div><p className="text-sm font-medium">عملکرد واقعی را ثبت کن</p><p className="mt-1 text-[11px] leading-6 muted">زمان، تست و نتیجه واقعی را بعد از انجام کار وارد کن.</p></div></div>
      <div className="counseling-guide-step"><span className="counseling-guide-number">۳</span><div><p className="text-sm font-medium">گزارش و بازخورد را ببین</p><p className="mt-1 text-[11px] leading-6 muted">روند پیشرفت و پیام‌های مشاور را بررسی کن.</p></div></div>
    </div>
  </section>;
}

function CounselorPanel({token,me,meta}:{token:string;me:CounselingMe;meta:CounselingMeta}){
  const [students,setStudents]=useState<CounselingStudentProfile[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [plans,setPlans]=useState<WeeklyPlan[]>([]);
  const [selectedPlanId,setSelectedPlanId]=useState('');
  const [tasks,setTasks]=useState<StudyTask[]>([]);
  const [report,setReport]=useState<CounselingReport|null>(null);
  const [feedback,setFeedback]=useState<CounselingFeedback[]>([]);
  const [weekStart,setWeekStart]=useState(currentSaturday());
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [activation,setActivation]=useState<{username:string;code:string}|null>(null);
  const [editingTask,setEditingTask]=useState<StudyTask|null>(null);
  const [reportPeriod,setReportPeriod]=useState<CounselingReportPeriod>('week');
  const [feedbackTarget,setFeedbackTarget]=useState<'task'|'day'|'week'>('week');
  const [adminReviews,setAdminReviews]=useState<any[]>([]);

  const selectedStudent=students.find(item=>item.userId===selectedId)||null;
  const selectedPlan=plans.find(item=>item._id===selectedPlanId)||null;
  const previousPlan=plans.find(item=>item.weekStart<weekStart);

  const loadStudents=useCallback(async()=>{
    try{
      const items=await counselingApi.listStudents(token);
      setStudents(items);
      setSelectedId(current=>current||items[0]?.userId||'');
    }catch(err){setError(err instanceof Error?err.message:'خطا در دریافت دانش‌آموزان')}
  },[token]);

  const loadStudentWorkspace=useCallback(async(studentId:string)=>{
    if(!studentId){setPlans([]);setTasks([]);setReport(null);return}
    try{
      const [nextPlans,nextReport,nextFeedback]=await Promise.all([
        counselingApi.listPlans(token,studentId),
        counselingApi.getReport(token,{studentId,period:reportPeriod,anchor:reportPeriod==='day'?todayDateClient():weekStart}),
        counselingApi.listFeedback(token,studentId),
      ]);
      setPlans(nextPlans);
      setReport(nextReport);
      setFeedback(nextFeedback);
      const currentPlan=nextPlans.find(item=>item.weekStart===weekStart)||nextPlans[0]||null;
      setSelectedPlanId(currentPlan?._id||'');
      setTasks(currentPlan?await counselingApi.listPlanTasks(token,currentPlan._id):[]);
    }catch(err){setError(err instanceof Error?err.message:'خطا در بارگذاری برنامه دانش‌آموز')}
  },[token,weekStart,reportPeriod]);

  useEffect(()=>{void loadStudents();void counselingApi.listCounselorReviews(token).then(setAdminReviews).catch(()=>{})},[loadStudents,token]);
  useEffect(()=>{void loadStudentWorkspace(selectedId)},[selectedId,weekStart,loadStudentWorkspace]);

  async function reloadCurrent(){
    await loadStudents();
    await loadStudentWorkspace(selectedId);
  }

  async function switchPlan(planId:string){
    setSelectedPlanId(planId);
    setTasks(planId?await counselingApi.listPlanTasks(token,planId):[]);
  }

  async function createStudent(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget;
    const data=new FormData(form);
    setBusy(true);setError(null);
    try{
      const created=await counselingApi.createStudent(token,{
        username:String(data.get('username')||'').trim().toLowerCase(),
        displayName:String(data.get('displayName')||'').trim(),
        track:String(data.get('track')||'experimental') as StudentTrack,
        grade:String(data.get('grade')||'12') as StudentGrade,
      });
      setActivation({username:created.username||'',code:created.activationCode});
      form.reset();
      await loadStudents();
      setSelectedId(created.userId);
    }catch(err){setError(err instanceof Error?err.message:'ساخت دانش‌آموز ناموفق بود')}
    finally{setBusy(false)}
  }

  async function removeStudent(student:CounselingStudentProfile){
    const ok=confirm(`دانش‌آموز «${student.displayName}» با نام کاربری ${student.username} از لیست فعال حذف شود؟ سوابق برنامه و گزارش‌ها نگه داشته می‌شوند.`);
    if(!ok)return;
    setBusy(true);setError(null);
    try{
      await counselingApi.deleteStudent(token,student.userId);
      if(selectedId===student.userId){
        setSelectedId('');
        setPlans([]);
        setSelectedPlanId('');
        setTasks([]);
        setReport(null);
        setFeedback([]);
      }
      setActivation(current=>current?.username===student.username?null:current);
      await loadStudents();
    }catch(err){setError(err instanceof Error?err.message:'حذف دانش‌آموز ناموفق بود')}
    finally{setBusy(false)}
  }

  async function createPlan(copyFrom?:string){
    if(!selectedId)return;
    setBusy(true);setError(null);
    try{
      const plan=await counselingApi.createPlan(token,{studentId:selectedId,weekStart,copyFromPlanId:copyFrom});
      await loadStudentWorkspace(selectedId);
      setSelectedPlanId(plan._id);
      setTasks(await counselingApi.listPlanTasks(token,plan._id));
    }catch(err){setError(err instanceof Error?err.message:'ساخت برنامه ناموفق بود')}
    finally{setBusy(false)}
  }

  async function saveTask(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!selectedPlan||!selectedStudent)return;
    const form=e.currentTarget;
    const data=new FormData(form);
    const input={
      dayIndex:Number(data.get('dayIndex')||0),
      track:String(data.get('track')||selectedStudent.track) as StudentTrack,
      grade:String(data.get('grade')||selectedStudent.grade) as StudentGrade,
      subject:String(data.get('subject')||'').trim(),
      book:String(data.get('book')||'').trim(),
      chapter:String(data.get('chapter')||'').trim(),
      topic:String(data.get('topic')||'').trim(),
      activityType:String(data.get('activityType')||'study') as StudyActivityType,
      plannedMinutes:Number(data.get('plannedMinutes')||0),
      plannedTests:Number(data.get('plannedTests')||0),
      plannedPages:Number(data.get('plannedPages')||0),
      description:String(data.get('description')||'').trim(),
      order:Number(data.get('order')||0),
    };
    setBusy(true);setError(null);
    try{
      if(editingTask){
        await counselingApi.updateTask(token,editingTask._id,input);
      }else{
        await counselingApi.createTask(token,selectedPlan._id,input);
        if(data.get('recurring')==='on'){
          await counselingApi.createRecurringRule(token,{
            studentId:selectedId,
            daysOfWeek:[input.dayIndex],
            startsOn:weekStart,
            endsOn:'',
            track:input.track,
            grade:input.grade,
            subject:input.subject,
            book:input.book,
            chapter:input.chapter,
            topic:input.topic,
            activityType:input.activityType,
            plannedMinutes:input.plannedMinutes,
            plannedTests:input.plannedTests,
            plannedPages:input.plannedPages,
            description:input.description,
          });
        }
      }
      setEditingTask(null);
      form.reset();
      await loadStudentWorkspace(selectedId);
    }catch(err){setError(err instanceof Error?err.message:'ذخیره تسک ناموفق بود')}
    finally{setBusy(false)}
  }

  async function publishPlan(){
    if(!selectedPlan)return;
    setBusy(true);
    try{
      await counselingApi.updatePlanStatus(token,selectedPlan._id,'published');
      await loadStudentWorkspace(selectedId);
    }catch(err){setError(err instanceof Error?err.message:'انتشار برنامه ناموفق بود')}
    finally{setBusy(false)}
  }

  async function removeTask(task:StudyTask){
    if(!confirm('این تسک از برنامه آرشیو شود؟'))return;
    try{
      await counselingApi.deleteTask(token,task._id);
      await loadStudentWorkspace(selectedId);
    }catch(err){setError(err instanceof Error?err.message:'حذف تسک ناموفق بود')}
  }

  async function submitFeedback(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!selectedId)return;
    const form=e.currentTarget;
    const data=new FormData(form);
    const text=String(data.get('text')||'').trim();
    if(!text)return;
    try{
      const targetType=String(data.get('targetType')||'week') as 'task'|'day'|'week';
      await counselingApi.createFeedback(token,{
        studentId:selectedId,
        targetType,
        weekStart:targetType==='week'?weekStart:undefined,
        date:targetType==='day'?String(data.get('date')||''):undefined,
        targetId:targetType==='task'?String(data.get('targetId')||''):undefined,
        text,
      });
      form.reset();
      setFeedback(await counselingApi.listFeedback(token,selectedId));
    }catch(err){setError(err instanceof Error?err.message:'ثبت بازخورد ناموفق بود')}
  }

  const subjects=selectedStudent?meta.subjects[selectedStudent.track]:meta.subjects.experimental;

  return <CounselingShell title="پنل مشاور" subtitle="برنامه‌ریزی هفتگی، گزارش عملکرد و بازخورد دانش‌آموز" badge={me.username}>
    <div dir="rtl">
      {error&&<InlineError message={error}/>}
      <CounselingQuickNav items={[
        {id:'counseling-students',label:'دانش‌آموزها'},
        {id:'counseling-plan',label:'برنامه هفته'},
        {id:'counseling-report',label:'گزارش'},
        {id:'counseling-feedback',label:'بازخورد'},
      ]}/>
      <CounselorStartGuide hasStudent={Boolean(selectedStudent)} hasPlan={Boolean(selectedPlan)} published={selectedPlan?.status==='published'}/>
      <section id="counseling-students" className="grid scroll-mt-24 gap-4 xl:grid-cols-[1fr_1.5fr]">
        <form onSubmit={createStudent} className="card p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><p className="section-kicker">Students</p><h2 className="panel-heading">ایجاد دانش‌آموز</h2><p className="panel-subtitle">حساب دانش‌آموز با کد فعال‌سازی یک‌بارمصرف ساخته می‌شود.</p></div>
            <span className="icon-shell text-cyan-300"><UserPlus size={17}/></span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2"><span className="text-[10px] font-semibold text-[#8b8f9c]">نام و نام خانوادگی</span><input name="displayName" className="input" required placeholder="مثلاً علی احمدی"/></label>
            <label className="space-y-2"><span className="text-[10px] font-semibold text-[#8b8f9c]">نام کاربری برای ورود</span><input name="username" className="input" required placeholder="مثلاً ali.ahmadi" autoCapitalize="none" autoCorrect="off"/></label>
            <select name="track" className="input" defaultValue="experimental">{meta.tracks.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select name="grade" className="input" defaultValue="12">{meta.grades.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </div>
          <button disabled={busy} className="btn-primary mt-3 w-full">ساخت دانش‌آموز</button>
          {activation&&<div className="mt-4 rounded-[15px] border border-emerald-400/15 bg-emerald-400/[.06] p-4 text-xs leading-6">
            <p className="font-medium text-emerald-200">اطلاعات فعال‌سازی دانش‌آموز</p>
            <p className="mt-2">نام کاربری برای ورود: <strong className="text-white">{activation.username}</strong></p>
            <p className="mt-2 text-[10px] muted">کد فعال‌سازی:</p>
            <code className="mt-1 block break-all rounded-lg bg-black/25 p-2 text-left text-[11px] text-cyan-200">{activation.code}</code>
            <p className="mt-2 muted">در صفحه ورود، تب Student را بزند و دقیقاً همین نام کاربری + همین کد را وارد کند.</p>
          </div>}
        </form>

        <div className="card p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><p className="section-kicker">Roster</p><h2 className="panel-heading">دانش‌آموزان من</h2><p className="panel-subtitle">{students.length} دانش‌آموز فعال یا در انتظار فعال‌سازی</p></div>
            <span className="icon-shell text-violet-300"><Users size={17}/></span>
          </div>
          {students.length?<div className="grid gap-2 sm:grid-cols-2">{students.map(student=><div key={student.userId} className={`relative rounded-[15px] border p-4 transition ${selectedId===student.userId?'border-violet-400/25 bg-violet-500/[.08]':'border-white/[.06] bg-white/[.02] hover:bg-white/[.04]'}`}>
            <button type="button" onClick={()=>setSelectedId(student.userId)} className="w-full pr-10 text-right">
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{student.displayName}</p><span className={`pill text-[9px] ${student.status==='active'?'text-emerald-300':'text-amber-300'}`}>{student.status}</span></div>
              <p className="mt-2 text-[11px] muted"><span className="text-[#b0b3bd]">Username:</span> {student.username} · {trackLabel(student.track)} · {gradeLabel(student.grade)}</p>
            </button>
            <button type="button" onClick={()=>void removeStudent(student)} disabled={busy} className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-rose-400/10 text-rose-300/70 transition hover:bg-rose-500/[.08] hover:text-rose-200" title="حذف دانش‌آموز"><Trash2 size={14}/></button>
          </div>)}</div>:<EmptyState text="هنوز دانش‌آموزی ایجاد نشده است."/>}
        </div>
      </section>

      {selectedStudent&&<>
        <section id="counseling-plan" className="mt-4 scroll-mt-24 card p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="section-kicker">Weekly plan</p><h2 className="panel-heading">برنامه هفتگی {selectedStudent.displayName}</h2><p className="panel-subtitle">هر هفته از شنبه شروع می‌شود و برنامه می‌تواند قبل یا بعد از انتشار اصلاح شود.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={weekStart} onChange={e=>setWeekStart(toSaturdayClient(e.target.value))} className="input w-auto"/>
              {!plans.some(item=>item.weekStart===weekStart)&&<button onClick={()=>void createPlan()} disabled={busy} className="btn-primary"><Plus size={15}/>برنامه جدید</button>}
              {!plans.some(item=>item.weekStart===weekStart)&&previousPlan&&<button onClick={()=>void createPlan(previousPlan._id)} disabled={busy} className="btn-secondary"><Copy size={15}/>کپی هفته قبل</button>}
            </div>
          </div>

          {plans.length>0&&<div className="mt-5 flex flex-wrap gap-2">{plans.slice(0,8).map(plan=><button key={plan._id} onClick={()=>void switchPlan(plan._id)} className={`rounded-xl border px-3 py-2 text-xs transition ${selectedPlanId===plan._id?'border-cyan-400/20 bg-cyan-400/[.07] text-cyan-100':'border-white/[.06] text-[#868a97] hover:text-white'}`}>{plan.weekStart} · {plan.status} · v{plan.version}</button>)}</div>}

          {selectedPlan&&<div className="mt-5 flex items-center justify-between rounded-[15px] border border-white/[.055] bg-black/15 p-4">
            <div><p className="text-sm font-medium">{selectedPlan.weekStart} تا {selectedPlan.weekEnd}</p><p className="mt-1 text-[11px] muted">وضعیت: {selectedPlan.status} · نسخه {selectedPlan.version}</p></div>
            {selectedPlan.status!=='published'&&<button onClick={()=>void publishPlan()} className="btn-primary"><Send size={15}/>انتشار برای دانش‌آموز</button>}
          </div>}
        </section>

        {selectedPlan&&<section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
          <form key={editingTask?._id||selectedPlan._id} onSubmit={saveTask} className="card p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div><p className="section-kicker">{editingTask?'Edit task':'Plan item'}</p><h2 className="panel-heading">{editingTask?'ویرایش تسک':'افزودن تسک به برنامه'}</h2><p className="panel-subtitle">درس، پایه، فصل، مبحث و هدف‌های کمی برنامه را ثبت کن.</p></div>
              <span className="icon-shell text-violet-300">{editingTask?<Edit3 size={16}/>:<Plus size={16}/>}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="dayIndex" className="input" defaultValue={editingTask?.dayIndex??0}>{dayLabels.map((day,index)=><option value={index} key={day}>{day}</option>)}</select>
              <select name="subject" className="input" required defaultValue={editingTask?.subject||subjects[0]}>{subjects.map(subject=><option key={subject}>{subject}</option>)}</select>
              <select name="track" className="input" defaultValue={editingTask?.track||selectedStudent.track}>{meta.tracks.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select>
              <select name="grade" className="input" defaultValue={editingTask?.grade||selectedStudent.grade}>{meta.grades.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select>
              <input name="book" className="input" placeholder="کتاب، مثلاً زیست‌شناسی ۳" defaultValue={editingTask?.book||''}/>
              <input name="chapter" required className="input" placeholder="فصل / درس، مثلاً فصل ۱" defaultValue={editingTask?.chapter||''}/>
              <input name="topic" className="input sm:col-span-2" placeholder="مبحث / گفتار دقیق (اختیاری)" defaultValue={editingTask?.topic||''}/>
              <select name="activityType" className="input" defaultValue={editingTask?.activityType||'study'}>{meta.activityTypes.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select>
              <input name="plannedMinutes" type="number" min="0" className="input" placeholder="زمان پیشنهادی (دقیقه)" defaultValue={editingTask?.plannedMinutes||0}/>
              <input name="plannedTests" type="number" min="0" className="input" placeholder="تعداد تست" defaultValue={editingTask?.plannedTests||0}/>
              <input name="plannedPages" type="number" min="0" className="input" placeholder="تعداد صفحه" defaultValue={editingTask?.plannedPages||0}/>
              <input name="order" type="number" min="0" className="input" placeholder="ترتیب" defaultValue={editingTask?.order||0}/>
              <textarea name="description" className="input min-h-24 resize-y sm:col-span-2" placeholder="توضیحات اضافه برای دانش‌آموز" defaultValue={editingTask?.description||''}/>
            </div>
            {!editingTask&&<label className="mt-3 flex items-center gap-2 rounded-xl border border-white/[.05] bg-white/[.02] p-3 text-xs muted"><input type="checkbox" name="recurring"/>این تسک در همین روز هفته به‌صورت تکرارشونده ایجاد شود</label>}
            <div className="mt-3 flex gap-2">
              <button disabled={busy} className="btn-primary flex-1">{editingTask?'ذخیره تغییرات':'افزودن به برنامه'}</button>
              {editingTask&&<button type="button" onClick={()=>setEditingTask(null)} className="btn-secondary">انصراف</button>}
            </div>
          </form>

          <div className="card overflow-hidden">
            <div className="border-b border-white/[.055] p-5 md:px-6"><p className="section-kicker">Schedule</p><h2 className="panel-heading">تسک‌های هفته</h2><p className="panel-subtitle">{tasks.length} آیتم برنامه‌ریزی‌شده</p></div>
            {tasks.length?<div className="divide-y divide-white/[.04]">{dayLabels.map((day,index)=>{
              const dayTasks=tasks.filter(task=>task.dayIndex===index);
              if(!dayTasks.length)return null;
              return <div key={day} className="p-5 md:px-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-300/80">{day}</p>
                <div className="space-y-2">{dayTasks.map(task=><div key={task._id} className="group rounded-[14px] border border-white/[.055] bg-white/[.018] p-4 transition hover:bg-white/[.03]">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{task.subject} · {task.chapter}</p><span className="pill text-[9px] text-violet-200">{activityLabel(meta,task.activityType)}</span></div>
                    <p className="mt-2 text-[11px] leading-5 muted">{task.book||'بدون نام کتاب'}{task.topic?' · '+task.topic:''}</p>
                    <p className="mt-2 text-[11px] text-[#9a9daa]">{task.plannedMinutes?task.plannedMinutes+' دقیقه ':''}{task.plannedTests?' · '+task.plannedTests+' تست':''}{task.plannedPages?' · '+task.plannedPages+' صفحه':''}</p>
                    {task.description&&<p className="mt-2 text-xs leading-6 text-[#b8bac4]">{task.description}</p>}</div>
                    <div className="flex gap-1"><button onClick={()=>setEditingTask(task)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/[.07] text-[#898d99] hover:text-white" title="ویرایش"><Edit3 size={14}/></button><button onClick={()=>void removeTask(task)} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-400/10 text-rose-300/70 hover:bg-rose-500/[.08]" title="حذف"><Trash2 size={14}/></button></div>
                  </div>
                </div>)}</div>
              </div>;
            })}</div>:<div className="p-6"><EmptyState text="هنوز تسکی برای این برنامه ثبت نشده است."/></div>}
          </div>
        </section>}

        <div id="counseling-report" className="scroll-mt-24">
          <ReportPeriodControls value={reportPeriod} onChange={setReportPeriod}/>
          <ReportSection report={report} title="تحلیل عملکرد دانش‌آموز"/>
        </div>

        <section id="counseling-feedback" className="mt-4 grid scroll-mt-24 gap-4 xl:grid-cols-[1fr_1.4fr]">
          <form onSubmit={submitFeedback} className="card p-5 md:p-6">
            <div className="mb-4"><p className="section-kicker">Feedback</p><h2 className="panel-heading">بازخورد هفتگی مشاور</h2><p className="panel-subtitle">این متن مستقیماً در پنل دانش‌آموز نمایش داده می‌شود.</p></div>
            <div className="grid gap-3">
              <select name="targetType" value={feedbackTarget} onChange={e=>setFeedbackTarget(e.target.value as 'task'|'day'|'week')} className="input">
                <option value="week">بازخورد هفتگی</option>
                <option value="day">بازخورد روزانه</option>
                <option value="task">بازخورد روی تسک</option>
              </select>
              {feedbackTarget==='day'&&<input name="date" type="date" required className="input" defaultValue={weekStart}/>}
              {feedbackTarget==='task'&&<select name="targetId" required className="input"><option value="">انتخاب تسک</option>{tasks.map(task=><option key={task._id} value={task._id}>{dayLabels[task.dayIndex]} · {task.subject} · {task.chapter}</option>)}</select>}
              <textarea name="text" required className="input min-h-32 resize-y" placeholder="تحلیل و توصیه مشاور..."/>
            </div>
            <button className="btn-primary mt-3 w-full"><MessageSquare size={15}/>ثبت بازخورد</button>
          </form>
          <div className="card overflow-hidden">
            <div className="border-b border-white/[.055] p-5"><h2 className="panel-heading">بازخوردهای اخیر</h2></div>
            {feedback.length?<div className="divide-y divide-white/[.04]">{feedback.slice(0,8).map(item=><div key={item._id} className="p-5"><div className="flex items-center justify-between text-[10px] muted"><span>{item.targetType}</span><span>{item.createdAt.slice(0,10)}</span></div><p className="mt-2 text-sm leading-7 text-[#c5c7d0]">{item.text}</p></div>)}</div>:<div className="p-5"><EmptyState text="بازخوردی ثبت نشده است."/></div>}
          </div>
        </section>

        {adminReviews.length>0&&<section className="mt-4 card overflow-hidden">
          <div className="border-b border-white/[.055] p-5 md:px-6"><p className="section-kicker">Admin feedback</p><h2 className="panel-heading">بازخورد ادمین برای من</h2></div>
          <div className="divide-y divide-white/[.04]">{adminReviews.slice(0,8).map(item=><div key={item._id} className="p-5 md:px-6"><p className="text-[10px] muted">{String(item.createdAt||'').slice(0,10)}</p><p className="mt-2 text-sm leading-7 text-[#c5c7d0]">{item.text}</p></div>)}</div>
        </section>}
      </>}
    </div>
  </CounselingShell>;
}

function StudentPanel({token,me,meta}:{token:string;me:CounselingMe;meta:CounselingMeta}){
  const [plans,setPlans]=useState<WeeklyPlan[]>([]);
  const [plan,setPlan]=useState<WeeklyPlan|null>(null);
  const [tasks,setTasks]=useState<StudyTask[]>([]);
  const [report,setReport]=useState<CounselingReport|null>(null);
  const [feedback,setFeedback]=useState<CounselingFeedback[]>([]);
  const [exams,setExams]=useState<any[]>([]);
  const [reportPeriod,setReportPeriod]=useState<CounselingReportPeriod>('week');
  const [error,setError]=useState<string|null>(null);
  const weekStart=currentSaturday();

  const load=useCallback(async()=>{
    try{
      const [nextPlans,nextReport,nextFeedback,nextExams]=await Promise.all([
        counselingApi.listPlans(token,undefined),
        counselingApi.getReport(token,{period:reportPeriod,anchor:reportPeriod==='day'?todayDateClient():weekStart}),
        counselingApi.listFeedback(token),
        counselingApi.listExams(token),
      ]);
      setPlans(nextPlans);
      setReport(nextReport);
      setFeedback(nextFeedback);
      setExams(nextExams);
      const current=nextPlans.find(item=>item.weekStart===weekStart)||nextPlans[0]||null;
      setPlan(current);
      setTasks(current?await counselingApi.listPlanTasks(token,current._id):[]);
    }catch(err){setError(err instanceof Error?err.message:'خطا در بارگذاری پنل دانش‌آموز')}
  },[token,weekStart,reportPeriod]);

  useEffect(()=>{void load()},[load]);

  const todayIndex=(new Date().getDay()+1)%7;
  const todayTasks=tasks.filter(task=>task.dayIndex===todayIndex);

  return <CounselingShell title="پنل دانش‌آموز" subtitle="برنامه مشاور، ثبت گزارش واقعی و روند پیشرفت" badge={me.student?.displayName||me.username}>
    <div dir="rtl">
      {error&&<InlineError message={error}/>}
      <CounselingQuickNav items={[
        {id:'student-week',label:'برنامه هفته'},
        {id:'student-tasks',label:'ثبت گزارش'},
        {id:'student-report',label:'تحلیل عملکرد'},
        {id:'student-exams',label:'آزمون‌ها'},
        {id:'student-feedback',label:'بازخورد مشاور'},
      ]}/>
      <StudentStartGuide hasPlan={Boolean(plan)} todayTasks={todayTasks.length}/>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniMetric label="اجرای برنامه" value={(report?.metrics.completionRate??0)+'%'}/>
        <MiniMetric label="مطالعه این هفته" value={minutesLabel(report?.metrics.actualMinutes??0)}/>
        <MiniMetric label="تست ثبت‌شده" value={report?.metrics.attemptedTests??0}/>
        <MiniMetric label="دقت تست" value={(report?.metrics.accuracy??0)+'%'}/>
      </section>

      <section id="student-week" className="mt-4 scroll-mt-24 card p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="section-kicker">This week</p><h2 className="panel-heading">برنامه هفته</h2><p className="panel-subtitle">{plan?plan.weekStart+' تا '+plan.weekEnd:'برنامه منتشرشده‌ای برای این هفته وجود ندارد.'}</p></div>
          <span className="icon-shell text-cyan-300"><CalendarRange size={17}/></span>
        </div>
        {plans.length>1&&<div className="mt-4 flex flex-wrap gap-2">{plans.slice(0,8).map(item=><button key={item._id} onClick={async()=>{setPlan(item);setTasks(await counselingApi.listPlanTasks(token,item._id))}} className={`rounded-xl border px-3 py-2 text-xs ${plan?._id===item._id?'border-violet-400/25 bg-violet-500/[.08]':'border-white/[.06] muted'}`}>{item.weekStart}</button>)}</div>}
      </section>

      <section id="student-tasks" className="mt-4 grid scroll-mt-24 gap-4">
        {plan&&dayLabels.map((day,index)=>{
          const items=tasks.filter(task=>task.dayIndex===index);
          if(!items.length)return null;
          return <div key={day} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[.055] p-5 md:px-6"><div><p className="section-kicker">{day}</p><h2 className="panel-heading">{items.length} تسک</h2></div><ClipboardCheck size={17} className="text-violet-300"/></div>
            <div className="grid gap-3 p-4 lg:grid-cols-2 md:p-5">{items.map(task=><StudentTaskCard key={task._id} token={token} task={task} meta={meta} onSaved={load}/>)}</div>
          </div>;
        })}
        {!plan&&<div className="card p-6"><EmptyState text="مشاور هنوز برنامه‌ای منتشر نکرده است."/></div>}
      </section>

      <div id="student-report" className="scroll-mt-24">
        <ReportPeriodControls value={reportPeriod} onChange={setReportPeriod}/>
        <ReportSection report={report} title="تحلیل عملکرد من"/>
      </div>

      <div id="student-exams" className="scroll-mt-24">
        <MockExamSection token={token} meta={meta} track={me.student?.track||'experimental'} exams={exams} onSaved={load}/>
      </div>

      <section id="student-feedback" className="mt-4 scroll-mt-24 card overflow-hidden">
        <div className="border-b border-white/[.055] p-5 md:px-6"><p className="section-kicker">Counselor feedback</p><h2 className="panel-heading">بازخورد مشاور</h2></div>
        {feedback.length?<div className="divide-y divide-white/[.04]">{feedback.slice(0,10).map(item=><div key={item._id} className="p-5 md:px-6"><div className="flex items-center justify-between text-[10px] muted"><span>{item.targetType==='week'?'بازخورد هفتگی':item.targetType==='day'?'بازخورد روزانه':'بازخورد تسک'}</span><span>{item.createdAt.slice(0,10)}</span></div><p className="mt-2 text-sm leading-7 text-[#c6c8d1]">{item.text}</p></div>)}</div>:<div className="p-5"><EmptyState text="هنوز بازخوردی ثبت نشده است."/></div>}
      </section>
    </div>
  </CounselingShell>;
}

function StudentTaskCard({token,task,meta,onSaved}:{token:string;task:StudyTask;meta:CounselingMeta;onSaved:()=>Promise<void>}){
  const existing=task.submission;
  const [status,setStatus]=useState<StudySubmissionStatus>(existing?.status||'not-started');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState<string|null>(null);

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const data=new FormData(e.currentTarget);
    setSaving(true);setError(null);
    try{
      await counselingApi.saveSubmission(token,task._id,{
        status,
        actualMinutes:Number(data.get('actualMinutes')||0),
        testsAttempted:Number(data.get('testsAttempted')||0),
        correctAnswers:Number(data.get('correctAnswers')||0),
        wrongAnswers:Number(data.get('wrongAnswers')||0),
        unanswered:Number(data.get('unanswered')||0),
        pagesRead:Number(data.get('pagesRead')||0),
        studentNote:String(data.get('studentNote')||'').trim(),
        skippedReason:String(data.get('skippedReason')||'').trim(),
      });
      await onSaved();
    }catch(err){setError(err instanceof Error?err.message:'ثبت گزارش ناموفق بود')}
    finally{setSaving(false)}
  }

  return <form onSubmit={save} className="rounded-[17px] border border-white/[.065] bg-white/[.018] p-4">
    <div className="flex items-start justify-between gap-3">
      <div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{task.subject} · {task.chapter}</p><span className="pill text-[9px] text-violet-200">{activityLabel(meta,task.activityType)}</span></div><p className="mt-2 text-[11px] muted">{task.book||'—'}{task.topic?' · '+task.topic:''}</p></div>
      <CheckCircle2 size={17} className={existing?.status==='done'?'text-emerald-300':'text-[#5f6370]'}/>
    </div>
    <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#9699a6]"><span className="pill">{task.plannedMinutes} دقیقه</span>{task.plannedTests>0&&<span className="pill">{task.plannedTests} تست</span>}{task.plannedPages>0&&<span className="pill">{task.plannedPages} صفحه</span>}</div>
    {task.description&&<p className="mt-3 rounded-xl border border-white/[.04] bg-black/15 p-3 text-xs leading-6 text-[#b8bac4]">{task.description}</p>}

    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <select value={status} onChange={e=>setStatus(e.target.value as StudySubmissionStatus)} className="input sm:col-span-2">{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <input name="actualMinutes" type="number" min="0" className="input" placeholder="زمان واقعی (دقیقه)" defaultValue={existing?.actualMinutes||0}/>
      {task.plannedPages>0&&<input name="pagesRead" type="number" min="0" className="input" placeholder="صفحات خوانده‌شده" defaultValue={existing?.pagesRead||0}/>}
      {task.plannedTests>0&&<>
        <input name="testsAttempted" type="number" min="0" className="input" placeholder="تعداد تست انجام‌شده" defaultValue={existing?.testsAttempted||0}/>
        <input name="correctAnswers" type="number" min="0" className="input" placeholder="صحیح" defaultValue={existing?.correctAnswers||0}/>
        <input name="wrongAnswers" type="number" min="0" className="input" placeholder="غلط" defaultValue={existing?.wrongAnswers||0}/>
        <input name="unanswered" type="number" min="0" className="input" placeholder="نزده" defaultValue={existing?.unanswered||0}/>
      </>}
      {task.plannedPages<=0&&<input type="hidden" name="pagesRead" value="0"/>}
      {task.plannedTests<=0&&<><input type="hidden" name="testsAttempted" value="0"/><input type="hidden" name="correctAnswers" value="0"/><input type="hidden" name="wrongAnswers" value="0"/><input type="hidden" name="unanswered" value="0"/></>}
      <textarea name="studentNote" className="input min-h-20 resize-y sm:col-span-2" placeholder="توضیح گزارش کار، مشکل یا نکته..." defaultValue={existing?.studentNote||''}/>
      {status==='skipped'&&<textarea name="skippedReason" required className="input min-h-20 resize-y border-amber-400/20 sm:col-span-2" placeholder="دلیل انجام نشدن این تسک (اجباری)" defaultValue={existing?.skippedReason||''}/>}
      {status!=='skipped'&&<input type="hidden" name="skippedReason" value=""/>}
    </div>
    {error&&<p className="mt-2 text-xs text-rose-300">{error}</p>}
    <button disabled={saving} className="btn-primary mt-3 w-full">{saving?'در حال ثبت...':'ثبت گزارش این تسک'}</button>
  </form>;
}

function AdminPanel({token,me}:{token:string;me:CounselingMe}){
  const [counselors,setCounselors]=useState<any[]>([]);
  const [students,setStudents]=useState<CounselingStudentProfile[]>([]);
  const [error,setError]=useState<string|null>(null);

  const load=useCallback(async()=>{
    try{
      const [nextCounselors,nextStudents]=await Promise.all([counselingApi.listCounselors(token),counselingApi.listStudents(token)]);
      setCounselors(nextCounselors);setStudents(nextStudents);
    }catch(err){setError(err instanceof Error?err.message:'خطا در بارگذاری پنل ادمین')}
  },[token]);

  useEffect(()=>{void load()},[load]);

  async function sendReview(counselorId:string,text:string){
    if(!text.trim())return;
    try{await counselingApi.createCounselorReview(token,{counselorId,text:text.trim()});alert('بازخورد ثبت شد')}
    catch(err){setError(err instanceof Error?err.message:'ثبت بازخورد ناموفق بود')}
  }

  return <CounselingShell title="پنل ادمین مشاوره" subtitle="نمای کلی مشاورها، دانش‌آموزها و کنترل کیفیت" badge={me.username}>
    <div dir="rtl">
      {error&&<InlineError message={error}/>}
      <section className="grid gap-3 sm:grid-cols-3"><MiniMetric label="مشاور" value={counselors.length}/><MiniMetric label="دانش‌آموز" value={students.length}/><MiniMetric label="دانش‌آموز فعال" value={students.filter(item=>item.status==='active').length}/></section>
      <section className="mt-4 card overflow-hidden">
        <div className="border-b border-white/[.055] p-5 md:px-6"><p className="section-kicker">Quality control</p><h2 className="panel-heading">مشاورها</h2></div>
        {counselors.length?<div className="divide-y divide-white/[.04]">{counselors.map(item=><AdminCounselorRow key={item._id} counselor={item} onSubmit={sendReview}/>)}</div>:<div className="p-5"><EmptyState text="مشاوری وجود ندارد."/></div>}
      </section>
      <section className="mt-4 card overflow-hidden">
        <div className="border-b border-white/[.055] p-5 md:px-6"><p className="section-kicker">Students</p><h2 className="panel-heading">همه دانش‌آموزها</h2></div>
        {students.length?<div className="grid gap-2 p-5 sm:grid-cols-2 xl:grid-cols-3">{students.map(student=><div key={student.userId} className="rounded-[14px] border border-white/[.055] bg-white/[.018] p-4"><div className="flex justify-between gap-3"><p className="text-sm font-medium">{student.displayName}</p><span className="pill text-[9px]">{student.status}</span></div><p className="mt-2 text-[11px] muted">{student.username} · {trackLabel(student.track)} · {gradeLabel(student.grade)}</p></div>)}</div>:<div className="p-5"><EmptyState text="دانش‌آموزی وجود ندارد."/></div>}
      </section>
    </div>
  </CounselingShell>;
}

function AdminCounselorRow({counselor,onSubmit}:{counselor:any;onSubmit:(id:string,text:string)=>Promise<void>}){
  const [text,setText]=useState('');
  return <div className="grid gap-3 p-5 md:grid-cols-[1fr_1.4fr_auto] md:items-center md:px-6">
    <div><p className="text-sm font-medium">{counselor.username}</p><p className="mt-1 text-xs muted">{counselor.studentCount} دانش‌آموز فعال</p></div>
    <textarea value={text} onChange={e=>setText(e.target.value)} className="input min-h-16 resize-y" placeholder="بازخورد ادمین برای مشاور..."/>
    <button onClick={async()=>{await onSubmit(String(counselor._id),text);setText('')}} className="btn-secondary">ثبت بازخورد</button>
  </div>;
}

function ReportPeriodControls({value,onChange}:{value:CounselingReportPeriod;onChange:(value:CounselingReportPeriod)=>void}){
  return <div className="mt-4 flex justify-end" dir="rtl">
    <div className="flex rounded-[13px] border border-white/[.06] bg-black/20 p-1">
      {([
        ['day','روزانه'],
        ['week','هفتگی'],
        ['month','ماهانه'],
      ] as [CounselingReportPeriod,string][]).map(([period,label])=><button key={period} onClick={()=>onChange(period)} className={`rounded-[10px] px-4 py-2 text-xs font-medium transition ${value===period?'bg-white/[.09] text-white':'text-[#777b88] hover:text-white'}`}>{label}</button>)}
    </div>
  </div>;
}

type ExamSubjectRow={subject:string;correct:number;wrong:number;unanswered:number;percentage:number};

function MockExamSection({
  token,meta,track,exams,onSaved,
}:{
  token:string;
  meta:CounselingMeta;
  track:StudentTrack;
  exams:any[];
  onSaved:()=>Promise<void>;
}){
  const subjects=meta.subjects[track]||meta.subjects.experimental;
  const [rows,setRows]=useState<ExamSubjectRow[]>([{subject:subjects[0]||'',correct:0,wrong:0,unanswered:0,percentage:0}]);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState<string|null>(null);

  function updateRow(index:number,patch:Partial<ExamSubjectRow>){
    setRows(current=>current.map((row,rowIndex)=>rowIndex===index?{...row,...patch}:row));
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget;
    const data=new FormData(form);
    setSaving(true);setError(null);
    try{
      await counselingApi.createExam(token,{
        examName:String(data.get('examName')||'').trim(),
        provider:String(data.get('provider')||'').trim(),
        date:String(data.get('date')||todayDateClient()),
        rank:Number(data.get('rank')||0),
        regionalRank:Number(data.get('regionalRank')||0),
        score:Number(data.get('score')||0),
        subjects:rows.filter(row=>row.subject).map(row=>({
          subject:row.subject,
          correct:Number(row.correct||0),
          wrong:Number(row.wrong||0),
          unanswered:Number(row.unanswered||0),
          percentage:Number(row.percentage||0),
        })),
      });
      form.reset();
      setRows([{subject:subjects[0]||'',correct:0,wrong:0,unanswered:0,percentage:0}]);
      await onSaved();
    }catch(err){setError(err instanceof Error?err.message:'ثبت آزمون ناموفق بود')}
    finally{setSaving(false)}
  }

  return <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.35fr]" dir="rtl">
    <form onSubmit={submit} className="card p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><p className="section-kicker">Mock exam</p><h2 className="panel-heading">ثبت آزمون آزمایشی</h2><p className="panel-subtitle">رتبه، تراز و نتیجه درس‌ها را برای تحلیل روند ثبت کن.</p></div>
        <span className="icon-shell text-cyan-300"><Target size={17}/></span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="examName" required className="input sm:col-span-2" placeholder="نام آزمون، مثلاً قلم‌چی ۵ شهریور"/>
        <input name="provider" className="input" placeholder="مؤسسه"/>
        <input name="date" type="date" required defaultValue={todayDateClient()} className="input"/>
        <input name="score" type="number" min="0" step="0.01" className="input" placeholder="تراز"/>
        <input name="rank" type="number" min="0" className="input" placeholder="رتبه"/>
        <input name="regionalRank" type="number" min="0" className="input sm:col-span-2" placeholder="رتبه منطقه (اختیاری)"/>
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between"><p className="text-xs font-medium">نتیجه درس‌ها</p><button type="button" onClick={()=>setRows(current=>[...current,{subject:subjects[0]||'',correct:0,wrong:0,unanswered:0,percentage:0}])} className="btn-secondary px-3 py-2 text-xs"><Plus size={13}/>درس</button></div>
        {rows.map((row,index)=><div key={index} className="grid gap-2 rounded-[14px] border border-white/[.05] bg-white/[.018] p-3 sm:grid-cols-5">
          <select className="input sm:col-span-2" value={row.subject} onChange={e=>updateRow(index,{subject:e.target.value})}>{subjects.map(subject=><option key={subject}>{subject}</option>)}</select>
          <input className="input" type="number" min="0" placeholder="صحیح" value={row.correct} onChange={e=>updateRow(index,{correct:Number(e.target.value)})}/>
          <input className="input" type="number" min="0" placeholder="غلط" value={row.wrong} onChange={e=>updateRow(index,{wrong:Number(e.target.value)})}/>
          <div className="flex gap-2 sm:col-span-5">
            <input className="input" type="number" min="0" placeholder="نزده" value={row.unanswered} onChange={e=>updateRow(index,{unanswered:Number(e.target.value)})}/>
            <input className="input" type="number" min="-100" max="100" step="0.01" placeholder="درصد" value={row.percentage} onChange={e=>updateRow(index,{percentage:Number(e.target.value)})}/>
            {rows.length>1&&<button type="button" onClick={()=>setRows(current=>current.filter((_,rowIndex)=>rowIndex!==index))} className="grid w-11 shrink-0 place-items-center rounded-xl border border-rose-400/10 text-rose-300"><Trash2 size={14}/></button>}
          </div>
        </div>)}
      </div>
      {error&&<p className="mt-3 text-xs text-rose-300">{error}</p>}
      <button disabled={saving} className="btn-primary mt-4 w-full">{saving?'در حال ثبت...':'ثبت نتیجه آزمون'}</button>
    </form>

    <div className="card p-5 md:p-6">
      <div className="mb-5"><p className="section-kicker">Exam trend</p><h2 className="panel-heading">روند آزمون‌ها</h2><p className="panel-subtitle">{exams.length} آزمون ثبت‌شده</p></div>
      {exams.length?<><div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={exams.slice().reverse().slice(-12).map(item=>({date:String(item.date).slice(5),score:Number(item.score||0)}))}>
            <CartesianGrid vertical={false} stroke="#ffffff0b"/>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#7f8290'}}/>
            <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#7f8290'}} width={42}/>
            <Tooltip contentStyle={{background:'#10131b',border:'1px solid #ffffff12',borderRadius:12,fontSize:11}}/>
            <Bar dataKey="score" fill="#35d6c7" radius={[6,6,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">{exams.slice(0,5).map(item=><div key={item._id} className="flex items-center justify-between rounded-xl border border-white/[.045] bg-white/[.015] px-3 py-2.5 text-xs"><div><p className="font-medium">{item.examName}</p><p className="mt-1 text-[10px] muted">{item.date} · {item.provider||'بدون مؤسسه'}</p></div><div className="text-left"><p className="text-cyan-200">تراز {item.score||0}</p><p className="mt-1 text-[10px] muted">رتبه {item.rank||0}</p></div></div>)}</div></>:<EmptyState text="هنوز آزمونی ثبت نشده است."/>}
    </div>
  </section>;
}

function ReportSection({report,title}:{report:CounselingReport|null;title:string}){
  if(!report)return <section className="mt-4 card p-5"><EmptyState text="گزارشی برای این بازه آماده نیست."/></section>;
  return <section className="mt-4 space-y-4" dir="rtl">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MiniMetric label="اجرای برنامه" value={report.metrics.completionRate+'%'}/>
      <MiniMetric label="زمان مطالعه" value={minutesLabel(report.metrics.actualMinutes)}/>
      <MiniMetric label="تست" value={report.metrics.attemptedTests}/>
      <MiniMetric label="دقت" value={report.metrics.accuracy+'%'}/>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
      <div className="card p-5 md:p-6">
        <div className="mb-4"><p className="section-kicker">Trend</p><h2 className="panel-heading">{title}</h2><p className="panel-subtitle">مطالعه واقعی و درصد اجرای برنامه در طول بازه</p></div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report.daily.map(item=>({...item,label:item.date.slice(5),hours:Number((item.actualMinutes/60).toFixed(2))}))}>
              <defs><linearGradient id="counselStudy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b6cff" stopOpacity={.32}/><stop offset="1" stopColor="#8b6cff" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#ffffff0b"/>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#7f8290'}}/>
              <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#7f8290'}} width={28}/>
              <Tooltip contentStyle={{background:'#10131b',border:'1px solid #ffffff12',borderRadius:12,fontSize:11}}/>
              <Area type="monotone" dataKey="hours" stroke="#9a7cff" fill="url(#counselStudy)" strokeWidth={2.3}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card p-5 md:p-6">
        <div className="mb-4"><p className="section-kicker">Subjects</p><h2 className="panel-heading">عملکرد درس‌ها</h2><p className="panel-subtitle">درصد اجرای برنامه به تفکیک درس</p></div>
        <div className="space-y-4">{report.subjects.length?report.subjects.slice(0,9).map(item=><div key={item.subject}><div className="mb-2 flex items-center justify-between text-xs"><span>{item.subject}</span><span className="text-violet-200">{item.completionRate}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.055]"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{width:Math.min(100,item.completionRate)+'%'}}/></div><div className="mt-1 flex justify-between text-[9px] muted"><span>{minutesLabel(item.actualMinutes)}</span><span>{item.attemptedTests} تست · دقت {item.accuracy}%</span></div></div>):<EmptyState text="داده درسی وجود ندارد."/>}</div>
      </div>
    </div>
    <div className="card p-5 md:p-6"><div className="flex items-start gap-3"><span className="icon-shell h-9 w-9 text-cyan-300"><BarChart3 size={15}/></span><div><p className="section-kicker">System analysis</p><h2 className="panel-heading">خلاصه محاسباتی</h2><p className="mt-2 text-sm leading-7 text-[#c0c3cc]">{report.summary}</p><p className="mt-2 text-[10px] muted">این متن از داده‌های واقعی گزارش ساخته می‌شود و AI نیست.</p></div></div></div>
  </section>;
}

function CounselingShell({title,subtitle,badge,children}:{title:string;subtitle:string;badge?:string;children:React.ReactNode}){
  return <main className="min-h-screen md:pl-[252px]">
    <div className="mx-auto max-w-[1500px] px-5 pb-14 pt-20 md:px-8 md:pt-8 xl:px-10">
      <header className="animate-in relative mb-7 overflow-hidden rounded-[24px] border border-white/[.06] bg-gradient-to-br from-violet-500/[.06] via-white/[.018] to-cyan-400/[.025] px-5 py-5 md:px-6">
        <div className="pointer-events-none absolute -right-14 -top-24 h-56 w-56 rounded-full bg-violet-500/[.11] blur-3xl"/>
        <div className="relative flex items-center gap-4">
          <span className="icon-shell h-11 w-11 text-violet-300"><GraduationCap size={19}/></span>
          <div className="min-w-0 flex-1"><p className="section-kicker">Counseling</p><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>
          {badge&&<span className="pill hidden text-[10px] text-cyan-200 sm:inline-flex">{badge}</span>}
        </div>
      </header>
      {children}
    </div>
  </main>;
}

function MiniMetric({label,value}:{label:string;value:string|number}){
  return <div className="metric-card"><div className="mb-4 h-1 w-8 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 opacity-70"/><p className="metric-value">{value}</p><p className="mt-1 text-xs muted">{label}</p></div>;
}

function LoadingPanel(){return <div className="card flex items-center gap-3 p-6"><RefreshCw size={17} className="animate-spin text-violet-300"/><p className="text-sm muted">در حال بارگذاری...</p></div>}
function ErrorPanel({message,onRetry}:{message:string;onRetry:()=>void}){return <div className="card p-6" dir="rtl"><p className="text-sm text-rose-200">{message}</p><button onClick={onRetry} className="btn-secondary mt-4"><RefreshCw size={15}/>تلاش دوباره</button></div>}
function InlineError({message}:{message:string}){return <div className="mb-4 rounded-[15px] border border-rose-400/15 bg-rose-500/[.07] px-4 py-3 text-xs text-rose-200">{message}</div>}
function EmptyState({text}:{text:string}){return <p className="text-xs leading-6 muted">{text}</p>}

function trackLabel(track:StudentTrack){return track==='experimental'?'تجربی':'ریاضی'}
function gradeLabel(grade:StudentGrade){return grade==='10'?'دهم':grade==='11'?'یازدهم':grade==='12'?'دوازدهم':'جامع'}
function activityLabel(meta:CounselingMeta,value:StudyActivityType){return meta.activityTypes.find(item=>item.value===value)?.label||value}
function minutesLabel(minutes:number){const h=Math.floor(minutes/60);const m=minutes%60;return h?m?`${h}س ${m}د`:`${h} ساعت`:`${m} دقیقه`}

function todayDateClient(){return new Date().toISOString().slice(0,10)}

function currentSaturday(){
  return toSaturdayClient(todayDateClient());
}

function toSaturdayClient(value:string){
  if(!value)return currentSaturdayFallback();
  const date=new Date(value+'T00:00:00Z');
  const diff=(date.getUTCDay()+1)%7;
  date.setUTCDate(date.getUTCDate()-diff);
  return date.toISOString().slice(0,10);
}

function currentSaturdayFallback(){
  const date=new Date();
  const diff=(date.getDay()+1)%7;
  date.setDate(date.getDate()-diff);
  return date.toISOString().slice(0,10);
}
