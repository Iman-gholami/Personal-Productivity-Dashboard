import {Schema,model,models} from 'mongoose';

const owned={userId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true}};

export const User=models.User||model('User',new Schema({
  username:{type:String,required:true,unique:true,trim:true,lowercase:true},
  passwordHash:{type:String,required:true},
  roles:{type:[String],enum:['personal','counselor','student','admin'],default:['personal'],index:true},
},{timestamps:true}));

export const Project=models.Project||model('Project',new Schema({
  ...owned,
  name:{type:String,required:true,trim:true},
  description:String,
  status:{type:String,enum:['active','paused','completed'],default:'active'},
},{timestamps:true}));

export const Category=models.Category||model('Category',new Schema({
  ...owned,
  name:{type:String,required:true,trim:true},
  color:{type:String,default:'#8b6cff'},
  description:String,
},{timestamps:true}));

export const Task=models.Task||model('Task',new Schema({
  ...owned,
  title:{type:String,required:true,trim:true},
  description:String,
  projectId:{type:Schema.Types.ObjectId,ref:'Project'},
  category:{type:String,enum:['Splunk','Security','Automation','DevOps','Meeting','Support','Other'],default:'Other',index:true},
  categoryId:{type:Schema.Types.ObjectId,ref:'Category'},
  status:{type:String,enum:['todo','in-progress','done'],default:'todo',index:true},
  priority:{type:String,enum:['low','medium','high'],default:'medium'},
  startedAt:{type:Date,default:Date.now,index:true},
  completedAt:{type:Date,default:null,index:true},
},{timestamps:true}));

export const LearningItem=models.LearningItem||model('LearningItem',new Schema({
  ...owned,
  title:{type:String,required:true,trim:true},
  type:{type:String,enum:['course','book'],required:true,index:true},
  description:String,
  totalHours:{type:Number,min:0,default:0},
  completedHours:{type:Number,min:0,default:0},
  totalPages:{type:Number,min:0,default:0},
  completedPages:{type:Number,min:0,default:0},
  startDate:{type:Date,default:Date.now},
  status:{type:String,enum:['not-started','in-progress','completed'],default:'not-started'},
},{timestamps:true,toJSON:{virtuals:true}}));

export const LearningSession=models.LearningSession||model('LearningSession',new Schema({
  ...owned,
  learningItemId:{type:Schema.Types.ObjectId,ref:'LearningItem',required:true,index:true},
  durationHours:{type:Number,min:0,default:0},
  pagesRead:{type:Number,min:0,default:0},
  note:String,
  date:{type:Date,default:Date.now,index:true},
},{timestamps:true}));

export const DailyReview=models.DailyReview||model('DailyReview',new Schema({
  ...owned,
  completedTasks:String,
  learnedToday:String,
  blockers:String,
  tomorrowFocus:String,
  date:{type:Date,default:Date.now,index:true},
},{timestamps:true}));


const trackValues=['math','experimental'] as const;
const gradeValues=['10','11','12','comprehensive'] as const;
const activityValues=['study','educational-test','timed-test','review','summary','remediation','video-class','exam'] as const;

const studentProfileSchema=new Schema({
  userId:{type:Schema.Types.ObjectId,ref:'User',required:true,unique:true,index:true},
  displayName:{type:String,required:true,trim:true},
  track:{type:String,enum:trackValues,required:true,index:true},
  grade:{type:String,enum:gradeValues,required:true,index:true},
  status:{type:String,enum:['pending','active','inactive'],default:'pending',index:true},
  activationTokenHash:String,
  activationExpiresAt:Date,
},{timestamps:true});
export const StudentProfile=models.StudentProfile||model('StudentProfile',studentProfileSchema);

const counselorAssignmentSchema=new Schema({
  counselorId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  studentId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  status:{type:String,enum:['active','ended'],default:'active',index:true},
  startedAt:{type:Date,default:Date.now},
  endedAt:{type:Date,default:null},
},{timestamps:true});
counselorAssignmentSchema.index(
  {studentId:1,status:1},
  {unique:true,partialFilterExpression:{status:'active'}},
);
export const CounselorAssignment=models.CounselorAssignment||model('CounselorAssignment',counselorAssignmentSchema);

const weeklyPlanSchema=new Schema({
  studentId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  counselorId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  weekStart:{type:String,required:true,index:true},
  weekEnd:{type:String,required:true},
  status:{type:String,enum:['draft','published','archived'],default:'draft',index:true},
  version:{type:Number,min:1,default:1},
  copiedFromPlanId:{type:Schema.Types.ObjectId,ref:'WeeklyPlan',default:null},
  publishedAt:{type:Date,default:null},
},{timestamps:true});
weeklyPlanSchema.index({studentId:1,weekStart:1,version:1},{unique:true});
export const WeeklyPlan=models.WeeklyPlan||model('WeeklyPlan',weeklyPlanSchema);

const studyTaskSchema=new Schema({
  planId:{type:Schema.Types.ObjectId,ref:'WeeklyPlan',required:true,index:true},
  studentId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  counselorId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  date:{type:String,required:true,index:true},
  dayIndex:{type:Number,min:0,max:6,required:true},
  track:{type:String,enum:trackValues,required:true},
  grade:{type:String,enum:gradeValues,required:true},
  subject:{type:String,required:true,trim:true,index:true},
  book:{type:String,trim:true,default:''},
  chapter:{type:String,required:true,trim:true},
  topic:{type:String,trim:true,default:''},
  activityType:{type:String,enum:activityValues,required:true,index:true},
  plannedMinutes:{type:Number,min:0,default:0},
  plannedTests:{type:Number,min:0,default:0},
  plannedPages:{type:Number,min:0,default:0},
  description:{type:String,trim:true,default:''},
  order:{type:Number,min:0,default:0},
  archived:{type:Boolean,default:false,index:true},
  recurringRuleId:{type:Schema.Types.ObjectId,ref:'RecurringStudyRule',default:null},
},{timestamps:true});
studyTaskSchema.index({planId:1,date:1,order:1});
export const StudyTask=models.StudyTask||model('StudyTask',studyTaskSchema);

const recurringStudyRuleSchema=new Schema({
  counselorId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  studentId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  active:{type:Boolean,default:true,index:true},
  daysOfWeek:{type:[Number],default:[]},
  track:{type:String,enum:trackValues,required:true},
  grade:{type:String,enum:gradeValues,required:true},
  subject:{type:String,required:true,trim:true},
  book:{type:String,trim:true,default:''},
  chapter:{type:String,required:true,trim:true},
  topic:{type:String,trim:true,default:''},
  activityType:{type:String,enum:activityValues,required:true},
  plannedMinutes:{type:Number,min:0,default:0},
  plannedTests:{type:Number,min:0,default:0},
  plannedPages:{type:Number,min:0,default:0},
  description:{type:String,trim:true,default:''},
  startsOn:{type:String,required:true},
  endsOn:{type:String,default:''},
},{timestamps:true});
export const RecurringStudyRule=models.RecurringStudyRule||model('RecurringStudyRule',recurringStudyRuleSchema);

const taskSubmissionSchema=new Schema({
  taskId:{type:Schema.Types.ObjectId,ref:'StudyTask',required:true,unique:true,index:true},
  studentId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  status:{type:String,enum:['not-started','in-progress','done','partial','skipped'],default:'not-started',index:true},
  actualMinutes:{type:Number,min:0,default:0},
  testsAttempted:{type:Number,min:0,default:0},
  correctAnswers:{type:Number,min:0,default:0},
  wrongAnswers:{type:Number,min:0,default:0},
  unanswered:{type:Number,min:0,default:0},
  pagesRead:{type:Number,min:0,default:0},
  studentNote:{type:String,trim:true,default:''},
  skippedReason:{type:String,trim:true,default:''},
  submittedAt:{type:Date,default:Date.now,index:true},
},{timestamps:true});
export const TaskSubmission=models.TaskSubmission||model('TaskSubmission',taskSubmissionSchema);

const counselingFeedbackSchema=new Schema({
  counselorId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  studentId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  targetType:{type:String,enum:['task','day','week'],required:true,index:true},
  targetId:{type:Schema.Types.ObjectId,default:null},
  date:{type:String,default:'',index:true},
  weekStart:{type:String,default:'',index:true},
  text:{type:String,required:true,trim:true},
},{timestamps:true});
export const CounselingFeedback=models.CounselingFeedback||model('CounselingFeedback',counselingFeedbackSchema);

const mockExamSchema=new Schema({
  studentId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  counselorId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  examName:{type:String,required:true,trim:true},
  provider:{type:String,trim:true,default:''},
  date:{type:String,required:true,index:true},
  rank:{type:Number,min:0,default:0},
  regionalRank:{type:Number,min:0,default:0},
  score:{type:Number,min:0,default:0},
  subjects:{type:[new Schema({
    subject:{type:String,required:true,trim:true},
    correct:{type:Number,min:0,default:0},
    wrong:{type:Number,min:0,default:0},
    unanswered:{type:Number,min:0,default:0},
    percentage:{type:Number,min:-100,max:100,default:0},
  },{_id:false})],default:[]},
},{timestamps:true});
export const MockExam=models.MockExam||model('MockExam',mockExamSchema);

const dailyMetricSchema=new Schema({
  studentId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  date:{type:String,required:true,index:true},
  plannedMinutes:{type:Number,default:0},
  actualMinutes:{type:Number,default:0},
  plannedTests:{type:Number,default:0},
  attemptedTests:{type:Number,default:0},
  correct:{type:Number,default:0},
  wrong:{type:Number,default:0},
  unanswered:{type:Number,default:0},
  plannedTasks:{type:Number,default:0},
  completedTasks:{type:Number,default:0},
  partialTasks:{type:Number,default:0},
  skippedTasks:{type:Number,default:0},
  completionRate:{type:Number,default:0},
  accuracy:{type:Number,default:0},
  subjectBreakdown:{type:Schema.Types.Mixed,default:{}},
},{timestamps:true});
dailyMetricSchema.index({studentId:1,date:1},{unique:true});
export const StudentDailyMetric=models.StudentDailyMetric||model('StudentDailyMetric',dailyMetricSchema);

const counselorReviewSchema=new Schema({
  adminId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  counselorId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  text:{type:String,required:true,trim:true},
},{timestamps:true});
export const CounselorReview=models.CounselorReview||model('CounselorReview',counselorReviewSchema);

const auditLogSchema=new Schema({
  actorId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  action:{type:String,required:true,index:true},
  entityType:{type:String,required:true,index:true},
  entityId:{type:Schema.Types.ObjectId,default:null,index:true},
  before:{type:Schema.Types.Mixed,default:null},
  after:{type:Schema.Types.Mixed,default:null},
},{timestamps:true});
export const AuditLog=models.AuditLog||model('AuditLog',auditLogSchema);
