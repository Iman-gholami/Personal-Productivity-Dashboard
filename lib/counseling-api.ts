export type CounselingRole='personal'|'counselor'|'student'|'admin';
export type StudentTrack='math'|'experimental';
export type StudentGrade='10'|'11'|'12'|'comprehensive';
export type StudyActivityType='study'|'educational-test'|'timed-test'|'review'|'summary'|'remediation'|'video-class'|'exam';
export type StudySubmissionStatus='not-started'|'in-progress'|'done'|'partial'|'skipped';
export type CounselingReportPeriod='day'|'week'|'month';

export interface CounselingMe{
  userId:string;
  username:string;
  roles:CounselingRole[];
  student?:CounselingStudentProfile|null;
  assignment?:any;
}

export interface CounselingStudentProfile{
  _id:string;
  userId:string;
  username?:string;
  displayName:string;
  track:StudentTrack;
  grade:StudentGrade;
  status:'pending'|'active'|'inactive';
  counselorId?:string;
  activationExpiresAt?:string;
}

export interface CounselingMeta{
  tracks:{value:StudentTrack;label:string}[];
  grades:{value:StudentGrade;label:string}[];
  subjects:Record<StudentTrack,string[]>;
  activityTypes:{value:StudyActivityType;label:string}[];
}

export interface WeeklyPlan{
  _id:string;
  studentId:string;
  counselorId:string;
  weekStart:string;
  weekEnd:string;
  status:'draft'|'published'|'archived';
  version:number;
  copiedFromPlanId?:string|null;
  publishedAt?:string|null;
  createdAt:string;
  updatedAt:string;
}

export interface StudySubmission{
  _id:string;
  taskId:string;
  studentId:string;
  status:StudySubmissionStatus;
  actualMinutes:number;
  testsAttempted:number;
  correctAnswers:number;
  wrongAnswers:number;
  unanswered:number;
  pagesRead:number;
  studentNote?:string;
  skippedReason?:string;
  submittedAt:string;
}

export interface StudyTask{
  _id:string;
  planId:string;
  studentId:string;
  counselorId:string;
  date:string;
  dayIndex:number;
  track:StudentTrack;
  grade:StudentGrade;
  subject:string;
  book?:string;
  chapter:string;
  topic?:string;
  activityType:StudyActivityType;
  plannedMinutes:number;
  plannedTests:number;
  plannedPages:number;
  description?:string;
  order:number;
  archived:boolean;
  submission?:StudySubmission|null;
}

export interface CounselingFeedback{
  _id:string;
  counselorId:string;
  studentId:string;
  targetType:'task'|'day'|'week';
  targetId?:string|null;
  date?:string;
  weekStart?:string;
  text:string;
  createdAt:string;
}

export interface CounselingReport{
  period:CounselingReportPeriod;
  range:{start:string;end:string};
  metrics:{
    plannedMinutes:number;
    actualMinutes:number;
    plannedTests:number;
    attemptedTests:number;
    correct:number;
    wrong:number;
    unanswered:number;
    plannedTasks:number;
    completedTasks:number;
    partialTasks:number;
    skippedTasks:number;
    completionRate:number;
    accuracy:number;
    completionChange:number;
    studyMinutesChange:number;
    testsChange:number;
    accuracyChange:number;
  };
  previous:any;
  daily:{
    date:string;
    actualMinutes:number;
    plannedMinutes:number;
    attemptedTests:number;
    plannedTests:number;
    completionRate:number;
    accuracy:number;
  }[];
  subjects:{
    subject:string;
    plannedMinutes:number;
    actualMinutes:number;
    plannedTests:number;
    attemptedTests:number;
    correct:number;
    wrong:number;
    unanswered:number;
    completionRate:number;
    accuracy:number;
  }[];
  feedback:CounselingFeedback[];
  exams:any[];
  summary:string;
}

class CounselingApiError extends Error{
  status:number;
  constructor(status:number,message:string){
    super(message);
    this.status=status;
  }
}

const base='/backend/counseling';

async function request<T>(path:string,options:RequestInit={},token?:string):Promise<T>{
  const response=await fetch(base+path,{
    ...options,
    headers:{
      'Content-Type':'application/json',
      ...(token?{Authorization:`Bearer ${token}`}:{}),
      ...(options.headers||{}),
    },
  });
  if(!response.ok){
    const data=await response.json().catch(()=>({}));
    throw new CounselingApiError(response.status,data.error||'Counseling request failed');
  }
  if(response.status===204) return undefined as T;
  return response.json();
}

export const counselingApi={
  meta:()=>request<CounselingMeta>('/meta'),
  me:(token:string)=>request<CounselingMe>('/me',{},token),
  activateCounselor:(token:string)=>request<{roles:CounselingRole[]}>('/counselor/activate',{method:'POST',body:'{}'},token),
  activateStudent:(input:{username:string;activationCode:string;password:string})=>
    request<{ok:true}>('/student/activate',{method:'POST',body:JSON.stringify(input)}),
  listStudents:(token:string)=>request<CounselingStudentProfile[]>('/students',{},token),
  createStudent:(token:string,input:{username:string;displayName:string;track:StudentTrack;grade:StudentGrade})=>
    request<CounselingStudentProfile&{activationCode:string}>('/students',{method:'POST',body:JSON.stringify(input)},token),
  deleteStudent:(token:string,studentId:string)=>
    request<{ok:true;studentId:string;previousUsername:string}>(`/students/${studentId}`,{method:'DELETE'},token),
  regenerateActivationCode:(token:string,studentId:string)=>
    request<{studentId:string;username:string;activationCode:string;activationExpiresAt:string}>(`/students/${studentId}/activation-code`,{method:'POST',body:'{}'},token),
  listPlans:(token:string,studentId?:string,weekStart?:string)=>{
    const params=new URLSearchParams();
    if(studentId) params.set('studentId',studentId);
    if(weekStart) params.set('weekStart',weekStart);
    return request<WeeklyPlan[]>('/plans?'+params.toString(),{},token);
  },
  createPlan:(token:string,input:{studentId:string;weekStart:string;copyFromPlanId?:string})=>
    request<WeeklyPlan>('/plans',{method:'POST',body:JSON.stringify(input)},token),
  updatePlanStatus:(token:string,id:string,status:WeeklyPlan['status'])=>
    request<WeeklyPlan>(`/plans/${id}`,{method:'PATCH',body:JSON.stringify({status})},token),
  listPlanTasks:(token:string,planId:string)=>request<StudyTask[]>(`/plans/${planId}/tasks`,{},token),
  createTask:(token:string,planId:string,input:{
    dayIndex:number;
    track:StudentTrack;
    grade:StudentGrade;
    subject:string;
    book?:string;
    chapter:string;
    topic?:string;
    activityType:StudyActivityType;
    plannedMinutes:number;
    plannedTests:number;
    plannedPages:number;
    description?:string;
    order?:number;
  })=>request<StudyTask>(`/plans/${planId}/tasks`,{method:'POST',body:JSON.stringify(input)},token),
  updateTask:(token:string,id:string,input:Partial<StudyTask>)=>
    request<StudyTask>(`/tasks/${id}`,{method:'PATCH',body:JSON.stringify(input)},token),
  deleteTask:(token:string,id:string)=>request<void>(`/tasks/${id}`,{method:'DELETE'},token),
  createRecurringRule:(token:string,input:any)=>request<any>('/recurring-rules',{method:'POST',body:JSON.stringify(input)},token),
  saveSubmission:(token:string,taskId:string,input:{
    status:StudySubmissionStatus;
    actualMinutes:number;
    testsAttempted:number;
    correctAnswers:number;
    wrongAnswers:number;
    unanswered:number;
    pagesRead:number;
    studentNote?:string;
    skippedReason?:string;
  })=>request<StudySubmission>(`/tasks/${taskId}/submission`,{method:'PUT',body:JSON.stringify(input)},token),
  listFeedback:(token:string,studentId?:string)=>{
    const params=new URLSearchParams();
    if(studentId) params.set('studentId',studentId);
    return request<CounselingFeedback[]>('/feedback?'+params.toString(),{},token);
  },
  createFeedback:(token:string,input:{
    studentId:string;
    targetType:'task'|'day'|'week';
    targetId?:string;
    date?:string;
    weekStart?:string;
    text:string;
  })=>request<CounselingFeedback>('/feedback',{method:'POST',body:JSON.stringify(input)},token),
  getReport:(token:string,input:{studentId?:string;period:CounselingReportPeriod;anchor?:string})=>{
    const params=new URLSearchParams({period:input.period});
    if(input.studentId) params.set('studentId',input.studentId);
    if(input.anchor) params.set('anchor',input.anchor);
    return request<CounselingReport>('/reports?'+params.toString(),{},token);
  },
  listExams:(token:string,studentId?:string)=>{
    const params=new URLSearchParams();
    if(studentId) params.set('studentId',studentId);
    return request<any[]>('/exams?'+params.toString(),{},token);
  },
  createExam:(token:string,input:any)=>request<any>('/exams',{method:'POST',body:JSON.stringify(input)},token),
  listCounselors:(token:string)=>request<any[]>('/admin/counselors',{},token),
  listCounselorReviews:(token:string,counselorId?:string)=>{
    const params=new URLSearchParams();
    if(counselorId) params.set('counselorId',counselorId);
    return request<any[]>('/counselor-reviews?'+params.toString(),{},token);
  },
  createCounselorReview:(token:string,input:{counselorId:string;text:string})=>
    request<any>('/admin/counselor-reviews',{method:'POST',body:JSON.stringify(input)},token),
};

export {CounselingApiError};
