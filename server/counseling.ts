import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type {Express,Response} from 'express';
import {z} from 'zod';
import {auth,AuthRequest} from './auth';
import {
  AuditLog,
  CounselorAssignment,
  CounselorReview,
  CounselingFeedback,
  MockExam,
  RecurringStudyRule,
  StudentDailyMetric,
  StudentProfile,
  StudyTask,
  TaskSubmission,
  User,
  WeeklyPlan,
} from './models';

const tracks=['math','experimental'] as const;
const grades=['10','11','12','comprehensive'] as const;
const activityTypes=['study','educational-test','timed-test','review','summary','remediation','video-class','exam'] as const;
const submissionStatuses=['not-started','in-progress','done','partial','skipped'] as const;
const dateString=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Use YYYY-MM-DD');

const studentInput=z.object({
  username:z.string().trim().min(3).max(40).transform(value=>value.toLowerCase()),
  displayName:z.string().trim().min(2).max(100),
  track:z.enum(tracks),
  grade:z.enum(grades),
});

const planInput=z.object({
  studentId:z.string().min(1),
  weekStart:dateString,
  copyFromPlanId:z.string().min(1).optional(),
});

const taskObject=z.object({
  dayIndex:z.number().int().min(0).max(6),
  track:z.enum(tracks),
  grade:z.enum(grades),
  subject:z.string().trim().min(1).max(80),
  book:z.string().trim().max(120).optional().default(''),
  chapter:z.string().trim().min(1).max(120),
  topic:z.string().trim().max(160).optional().default(''),
  activityType:z.enum(activityTypes),
  plannedMinutes:z.number().int().min(0).max(1440).default(0),
  plannedTests:z.number().int().min(0).max(5000).default(0),
  plannedPages:z.number().int().min(0).max(5000).default(0),
  description:z.string().trim().max(3000).optional().default(''),
  order:z.number().int().min(0).max(500).default(0),
});
const taskBase=taskObject.refine(value=>value.plannedMinutes>0||value.plannedTests>0||value.plannedPages>0,{
  message:'At least one planned target is required',
});

const taskPatch=z.object({
  dayIndex:z.number().int().min(0).max(6).optional(),
  track:z.enum(tracks).optional(),
  grade:z.enum(grades).optional(),
  subject:z.string().trim().min(1).max(80).optional(),
  book:z.string().trim().max(120).optional(),
  chapter:z.string().trim().min(1).max(120).optional(),
  topic:z.string().trim().max(160).optional(),
  activityType:z.enum(activityTypes).optional(),
  plannedMinutes:z.number().int().min(0).max(1440).optional(),
  plannedTests:z.number().int().min(0).max(5000).optional(),
  plannedPages:z.number().int().min(0).max(5000).optional(),
  description:z.string().trim().max(3000).optional(),
  order:z.number().int().min(0).max(500).optional(),
});

const recurringInput=taskObject.omit({dayIndex:true,order:true}).and(z.object({
  daysOfWeek:z.array(z.number().int().min(0).max(6)).min(1).max(7),
  startsOn:dateString,
  endsOn:dateString.optional().default(''),
}));

const submissionInput=z.object({
  status:z.enum(submissionStatuses),
  actualMinutes:z.number().int().min(0).max(1440).default(0),
  testsAttempted:z.number().int().min(0).max(5000).default(0),
  correctAnswers:z.number().int().min(0).max(5000).default(0),
  wrongAnswers:z.number().int().min(0).max(5000).default(0),
  unanswered:z.number().int().min(0).max(5000).default(0),
  pagesRead:z.number().int().min(0).max(5000).default(0),
  studentNote:z.string().trim().max(3000).optional().default(''),
  skippedReason:z.string().trim().max(1000).optional().default(''),
}).superRefine((value,ctx)=>{
  const answerTotal=value.correctAnswers+value.wrongAnswers+value.unanswered;
  if(answerTotal!==value.testsAttempted){
    ctx.addIssue({code:z.ZodIssueCode.custom,path:['testsAttempted'],message:'Correct + wrong + unanswered must equal tests attempted'});
  }
  if(value.status==='skipped'&&!value.skippedReason){
    ctx.addIssue({code:z.ZodIssueCode.custom,path:['skippedReason'],message:'Skipped reason is required'});
  }
});

const feedbackInput=z.object({
  studentId:z.string().min(1),
  targetType:z.enum(['task','day','week']),
  targetId:z.string().min(1).optional(),
  date:dateString.optional(),
  weekStart:dateString.optional(),
  text:z.string().trim().min(2).max(4000),
}).superRefine((value,ctx)=>{
  if(value.targetType==='task'&&!value.targetId) ctx.addIssue({code:z.ZodIssueCode.custom,path:['targetId'],message:'Task target is required'});
  if(value.targetType==='day'&&!value.date) ctx.addIssue({code:z.ZodIssueCode.custom,path:['date'],message:'Date is required'});
  if(value.targetType==='week'&&!value.weekStart) ctx.addIssue({code:z.ZodIssueCode.custom,path:['weekStart'],message:'Week start is required'});
});

const examInput=z.object({
  examName:z.string().trim().min(2).max(160),
  provider:z.string().trim().max(100).optional().default(''),
  date:dateString,
  rank:z.number().int().min(0).default(0),
  regionalRank:z.number().int().min(0).default(0),
  score:z.number().min(0).default(0),
  subjects:z.array(z.object({
    subject:z.string().trim().min(1).max(80),
    correct:z.number().int().min(0).default(0),
    wrong:z.number().int().min(0).default(0),
    unanswered:z.number().int().min(0).default(0),
    percentage:z.number().min(-100).max(100).default(0),
  })).default([]),
});

export function registerCounselingRoutes(app:Express){
  app.get('/api/counseling/meta',(_req,res)=>res.json({
    tracks:[
      {value:'experimental',label:'تجربی'},
      {value:'math',label:'ریاضی'},
    ],
    grades:[
      {value:'10',label:'دهم'},
      {value:'11',label:'یازدهم'},
      {value:'12',label:'دوازدهم'},
      {value:'comprehensive',label:'جامع'},
    ],
    subjects:{
      experimental:['زیست','فیزیک','شیمی','ریاضی','دینی','زبان','ادبیات','زمین','عربی'],
      math:['ریاضی','فیزیک','شیمی','دینی','زبان','ادبیات','عربی'],
    },
    activityTypes:[
      {value:'study',label:'مطالعه'},
      {value:'educational-test',label:'تست آموزشی'},
      {value:'timed-test',label:'تست زمان‌دار'},
      {value:'review',label:'مرور'},
      {value:'summary',label:'جمع‌بندی'},
      {value:'remediation',label:'رفع اشکال'},
      {value:'video-class',label:'ویدئو / کلاس'},
      {value:'exam',label:'آزمون'},
    ],
  }));

  app.post('/api/counseling/student/activate',async(req,res,next)=>{
    try{
      const body=z.object({
        username:z.string().trim().min(3).max(40).transform(value=>value.toLowerCase()),
        activationCode:z.string().trim().min(10).max(200),
        password:z.string().min(8).max(100),
      }).parse(req.body);
      const user=await User.findOne({username:body.username});
      if(!user) return res.status(404).json({error:'Student account not found'});
      const profile=await StudentProfile.findOne({userId:user._id,status:'pending'});
      if(!profile||!profile.activationTokenHash||!profile.activationExpiresAt){
        return res.status(400).json({error:'Activation is not available'});
      }
      if(profile.activationExpiresAt.getTime()<Date.now()) return res.status(400).json({error:'Activation code expired'});
      if(hashToken(body.activationCode)!==profile.activationTokenHash) return res.status(400).json({error:'Invalid activation code'});
      user.passwordHash=await bcrypt.hash(body.password,12);
      user.roles=Array.from(new Set([...(user.roles||[]),'student']));
      profile.status='active';
      profile.activationTokenHash=undefined;
      profile.activationExpiresAt=undefined;
      await Promise.all([user.save(),profile.save()]);
      res.json({ok:true});
    }catch(error){next(error)}
  });

  app.get('/api/counseling/me',auth,async(req:AuthRequest,res,next)=>{
    try{
      const user=await User.findById(req.userId).select('username roles');
      if(!user) return res.status(404).json({error:'User not found'});
      const roles=normalizedRoles(user);
      const student=roles.includes('student')?await StudentProfile.findOne({userId:user._id}).lean():null;
      const assignment=student?await CounselorAssignment.findOne({studentId:user._id,status:'active'}).populate('counselorId','username').lean():null;
      res.json({userId:String(user._id),username:user.username,roles,student,assignment});
    }catch(error){next(error)}
  });

  app.post('/api/counseling/counselor/activate',auth,async(req:AuthRequest,res,next)=>{
    try{
      if(process.env.COUNSELOR_SELF_ENROLLMENT==='false') return res.status(403).json({error:'Counselor self-enrollment is disabled'});
      const user=await User.findById(req.userId);
      if(!user) return res.status(404).json({error:'User not found'});
      user.roles=Array.from(new Set([...normalizedRoles(user),'counselor']));
      await user.save();
      await logAudit(req.userId!,'counselor.activate','User',user._id,null,{roles:user.roles});
      res.json({roles:user.roles});
    }catch(error){next(error)}
  });

  app.post('/api/counseling/admin/bootstrap',auth,async(req:AuthRequest,res,next)=>{
    try{
      const secret=z.object({secret:z.string().min(1)}).parse(req.body).secret;
      if(!process.env.ADMIN_BOOTSTRAP_SECRET||secret!==process.env.ADMIN_BOOTSTRAP_SECRET){
        return res.status(403).json({error:'Invalid bootstrap secret'});
      }
      const user=await User.findById(req.userId);
      if(!user) return res.status(404).json({error:'User not found'});
      user.roles=Array.from(new Set([...normalizedRoles(user),'admin']));
      await user.save();
      res.json({roles:user.roles});
    }catch(error){next(error)}
  });

  app.get('/api/counseling/students',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['counselor','admin']);
      if(!role) return;
      const assignments=role==='admin'
        ? await CounselorAssignment.find({status:'active'}).lean()
        : await CounselorAssignment.find({counselorId:req.userId,status:'active'}).lean();
      const ids=assignments.map(item=>item.studentId);
      const [profiles,users]=await Promise.all([
        StudentProfile.find({userId:{$in:ids}}).lean(),
        User.find({_id:{$in:ids}}).select('username roles').lean(),
      ]);
      const userMap=new Map(users.map(user=>[String(user._id),user]));
      const assignmentMap=new Map(assignments.map(item=>[String(item.studentId),item]));
      res.json(profiles.map(profile=>({
        ...profile,
        username:userMap.get(String(profile.userId))?.username||'',
        counselorId:assignmentMap.get(String(profile.userId))?.counselorId,
      })));
    }catch(error){next(error)}
  });

  app.post('/api/counseling/students',auth,async(req:AuthRequest,res,next)=>{
    let createdUser:any=null;
    try{
      const role=await authorize(req,res,['counselor','admin']);
      if(!role) return;
      const body=studentInput.parse(req.body);
      const counselorId=role==='admin'&&req.body.counselorId?String(req.body.counselorId):req.userId!;
      if(role==='admin'){
        const counselor=await User.findById(counselorId);
        if(!counselor||!normalizedRoles(counselor).includes('counselor')) return res.status(400).json({error:'Counselor is invalid'});
      }
      const activationCode=crypto.randomBytes(24).toString('hex');
      createdUser=await User.create({
        username:body.username,
        passwordHash:await bcrypt.hash(crypto.randomBytes(32).toString('hex'),12),
        roles:['student'],
      });
      const profile=await StudentProfile.create({
        userId:createdUser._id,
        displayName:body.displayName,
        track:body.track,
        grade:body.grade,
        status:'pending',
        activationTokenHash:hashToken(activationCode),
        activationExpiresAt:new Date(Date.now()+7*24*60*60*1000),
      });
      await CounselorAssignment.create({
        counselorId,
        studentId:createdUser._id,
        status:'active',
      });
      await logAudit(req.userId!,'student.create','StudentProfile',profile._id,null,{
        studentId:createdUser._id,
        counselorId,
        track:body.track,
        grade:body.grade,
      });
      res.status(201).json({
        ...profile.toJSON(),
        username:createdUser.username,
        activationCode,
        activationExpiresAt:profile.activationExpiresAt,
      });
    }catch(error){
      if(createdUser?._id){
        await Promise.allSettled([
          StudentProfile.deleteMany({userId:createdUser._id}),
          CounselorAssignment.deleteMany({studentId:createdUser._id}),
          User.deleteOne({_id:createdUser._id}),
        ]);
      }
      next(error);
    }
  });

  app.delete('/api/counseling/students/:studentId',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['counselor','admin']);
      if(!role) return;
      const studentId=String(req.params.studentId);
      const profile=await StudentProfile.findOne({userId:studentId});
      if(!profile||profile.status==='inactive') return res.status(404).json({error:'Student not found'});

      const assignment=await CounselorAssignment.findOne({studentId,status:'active'});
      if(!assignment) return res.status(404).json({error:'Active student assignment not found'});
      if(role==='counselor'&&String(assignment.counselorId)!==req.userId){
        return res.status(403).json({error:'Student is not assigned to this counselor'});
      }

      const user=await User.findById(studentId);
      if(!user) return res.status(404).json({error:'Student user not found'});

      const before={
        profile:profile.toJSON(),
        assignment:assignment.toJSON(),
        username:user.username,
      };

      profile.status='inactive';
      profile.activationTokenHash=undefined;
      profile.activationExpiresAt=undefined;

      assignment.status='ended';
      assignment.endedAt=new Date();

      const previousUsername=String(user.username);
      user.username=`deleted-${studentId}-${Date.now()}`;
      user.roles=normalizedRoles(user).filter(item=>item!=='student');
      if(!user.roles.length) user.roles=['personal'];

      await Promise.all([profile.save(),assignment.save(),user.save()]);
      await logAudit(req.userId!,'student.remove','StudentProfile',profile._id,before,{
        studentId,
        previousUsername,
        status:'inactive',
      });

      res.json({ok:true,studentId,previousUsername});
    }catch(error){next(error)}
  });

  app.get('/api/counseling/plans',auth,async(req:AuthRequest,res,next)=>{
    try{
      const studentId=await resolveStudentAccess(req,res,String(req.query.studentId||''));
      if(!studentId) return;
      const filter:any={studentId};
      const viewer=await User.findById(req.userId).select('roles');
      if(normalizedRoles(viewer).includes('student')) filter.status='published';
      if(req.query.weekStart) filter.weekStart=dateString.parse(String(req.query.weekStart));
      if(normalizedQuery(req.query.includeArchived)!=='true'&&!filter.status) filter.status={$ne:'archived'};
      const plans=await WeeklyPlan.find(filter).sort({weekStart:-1,version:-1}).limit(24).lean();
      res.json(plans);
    }catch(error){next(error)}
  });

  app.post('/api/counseling/plans',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['counselor','admin']);
      if(!role) return;
      const body=planInput.parse(req.body);
      const counselorId=await resolveCounselorForStudent(req,res,body.studentId,role);
      if(!counselorId) return;
      const weekStart=toSaturday(body.weekStart);
      const existing=await WeeklyPlan.findOne({studentId:body.studentId,weekStart,status:{$ne:'archived'}});
      if(existing) return res.status(409).json({error:'A plan already exists for this week'});
      const source=body.copyFromPlanId
        ? await WeeklyPlan.findOne({_id:body.copyFromPlanId,studentId:body.studentId})
        : null;
      if(body.copyFromPlanId&&!source) return res.status(404).json({error:'Source plan not found'});
      const plan=await WeeklyPlan.create({
        studentId:body.studentId,
        counselorId,
        weekStart,
        weekEnd:addDays(weekStart,6),
        status:'draft',
        version:1,
        copiedFromPlanId:body.copyFromPlanId||null,
      });
      if(source){
        const sourceTasks=await StudyTask.find({planId:source._id,archived:false}).lean();
        if(sourceTasks.length){
          await StudyTask.insertMany(sourceTasks.map(task=>({
            planId:plan._id,
            studentId:plan.studentId,
            counselorId,
            date:addDays(weekStart,task.dayIndex),
            dayIndex:task.dayIndex,
            track:task.track,
            grade:task.grade,
            subject:task.subject,
            book:task.book,
            chapter:task.chapter,
            topic:task.topic,
            activityType:task.activityType,
            plannedMinutes:task.plannedMinutes,
            plannedTests:task.plannedTests,
            plannedPages:task.plannedPages,
            description:task.description,
            order:task.order,
            archived:false,
          })));
        }
      }
      if(!source) await materializeRecurringRules(body.studentId,counselorId,plan);
      await Promise.all(Array.from({length:7},(_,dayIndex)=>recomputeDailyMetric(body.studentId,addDays(weekStart,dayIndex))));
      await logAudit(req.userId!,'plan.create','WeeklyPlan',plan._id,null,plan.toJSON());
      res.status(201).json(plan);
    }catch(error){next(error)}
  });

  app.patch('/api/counseling/plans/:id',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['counselor','admin']);
      if(!role) return;
      const body=z.object({status:z.enum(['draft','published','archived'])}).parse(req.body);
      const plan=await WeeklyPlan.findById(req.params.id);
      if(!plan) return res.status(404).json({error:'Plan not found'});
      const counselorId=await resolveCounselorForStudent(req,res,String(plan.studentId),role);
      if(!counselorId) return;
      const before=plan.toJSON();
      if(plan.status==='archived'&&body.status!=='archived') return res.status(400).json({error:'Archived plans cannot be reopened'});
      plan.status=body.status;
      if(body.status==='published') plan.publishedAt=new Date();
      if(before.status==='published'&&body.status!=='archived') plan.version=Number(plan.version||1)+1;
      await plan.save();
      if(body.status==='archived'){
        await StudyTask.updateMany({planId:plan._id},{$set:{archived:true}});
      }
      await Promise.all(Array.from({length:7},(_,dayIndex)=>recomputeDailyMetric(String(plan.studentId),addDays(plan.weekStart,dayIndex))));
      await logAudit(req.userId!,'plan.status','WeeklyPlan',plan._id,before,plan.toJSON());
      res.json(plan);
    }catch(error){next(error)}
  });

  app.get('/api/counseling/plans/:id/tasks',auth,async(req:AuthRequest,res,next)=>{
    try{
      const plan=await WeeklyPlan.findById(req.params.id).lean();
      if(!plan) return res.status(404).json({error:'Plan not found'});
      const studentId=await resolveStudentAccess(req,res,String(plan.studentId));
      if(!studentId) return;
      const viewer=await User.findById(req.userId).select('roles');
      if(normalizedRoles(viewer).includes('student')&&plan.status!=='published') return res.status(403).json({error:'Plan is not published'});
      const tasks=await StudyTask.find({planId:plan._id,archived:false}).sort({dayIndex:1,order:1,createdAt:1}).lean();
      const submissions=await TaskSubmission.find({taskId:{$in:tasks.map(task=>task._id)}}).lean();
      const submissionMap=new Map(submissions.map(item=>[String(item.taskId),item]));
      res.json(tasks.map(task=>({...task,submission:submissionMap.get(String(task._id))||null})));
    }catch(error){next(error)}
  });

  app.post('/api/counseling/plans/:id/tasks',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['counselor','admin']);
      if(!role) return;
      const body=taskBase.parse(req.body);
      const plan=await WeeklyPlan.findById(req.params.id);
      if(!plan||plan.status==='archived') return res.status(404).json({error:'Active plan not found'});
      const counselorId=await resolveCounselorForStudent(req,res,String(plan.studentId),role);
      if(!counselorId) return;
      const task=await StudyTask.create({
        ...body,
        planId:plan._id,
        studentId:plan.studentId,
        counselorId,
        date:addDays(plan.weekStart,body.dayIndex),
      });
      if(plan.status==='published'){
        plan.version=Number(plan.version||1)+1;
        await plan.save();
      }
      await recomputeDailyMetric(String(plan.studentId),task.date);
      await logAudit(req.userId!,'studyTask.create','StudyTask',task._id,null,task.toJSON());
      res.status(201).json(task);
    }catch(error){next(error)}
  });

  app.patch('/api/counseling/tasks/:id',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['counselor','admin']);
      if(!role) return;
      const changes=taskPatch.parse(req.body);
      const task=await StudyTask.findById(req.params.id);
      if(!task||task.archived) return res.status(404).json({error:'Task not found'});
      const counselorId=await resolveCounselorForStudent(req,res,String(task.studentId),role);
      if(!counselorId) return;
      const before=task.toJSON();
      Object.assign(task,changes);
      const plan=await WeeklyPlan.findById(task.planId);
      if(changes.dayIndex!==undefined&&plan) task.date=addDays(plan.weekStart,changes.dayIndex);
      await task.save();
      if(plan?.status==='published'){
        plan.version=Number(plan.version||1)+1;
        await plan.save();
      }
      await Promise.all([
        recomputeDailyMetric(String(task.studentId),before.date),
        recomputeDailyMetric(String(task.studentId),task.date),
      ]);
      await logAudit(req.userId!,'studyTask.update','StudyTask',task._id,before,task.toJSON());
      res.json(task);
    }catch(error){next(error)}
  });

  app.delete('/api/counseling/tasks/:id',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['counselor','admin']);
      if(!role) return;
      const task=await StudyTask.findById(req.params.id);
      if(!task||task.archived) return res.status(404).json({error:'Task not found'});
      const counselorId=await resolveCounselorForStudent(req,res,String(task.studentId),role);
      if(!counselorId) return;
      const before=task.toJSON();
      task.archived=true;
      await task.save();
      const plan=await WeeklyPlan.findById(task.planId);
      if(plan?.status==='published'){
        plan.version=Number(plan.version||1)+1;
        await plan.save();
      }
      await recomputeDailyMetric(String(task.studentId),task.date);
      await logAudit(req.userId!,'studyTask.archive','StudyTask',task._id,before,task.toJSON());
      res.status(204).end();
    }catch(error){next(error)}
  });

  app.get('/api/counseling/recurring-rules',auth,async(req:AuthRequest,res,next)=>{
    try{
      const studentId=await resolveStudentAccess(req,res,String(req.query.studentId||''));
      if(!studentId) return;
      res.json(await RecurringStudyRule.find({studentId,active:true}).sort({createdAt:-1}).lean());
    }catch(error){next(error)}
  });

  app.post('/api/counseling/recurring-rules',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['counselor','admin']);
      if(!role) return;
      const studentId=z.string().min(1).parse(req.body.studentId);
      const body=recurringInput.parse(req.body);
      const counselorId=await resolveCounselorForStudent(req,res,studentId,role);
      if(!counselorId) return;
      const rule=await RecurringStudyRule.create({...body,studentId,counselorId,active:true});
      res.status(201).json(rule);
    }catch(error){next(error)}
  });

  app.put('/api/counseling/tasks/:id/submission',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['student','admin']);
      if(!role) return;
      const body=submissionInput.parse(req.body);
      const task=await StudyTask.findById(req.params.id);
      if(!task||task.archived) return res.status(404).json({error:'Task not found'});
      if(role==='student'&&String(task.studentId)!==req.userId) return res.status(403).json({error:'Forbidden'});
      if(role==='student'){
        const plan=await WeeklyPlan.findById(task.planId).select('status');
        if(!plan||plan.status!=='published') return res.status(403).json({error:'Plan is not published'});
      }
      const submission=await TaskSubmission.findOneAndUpdate(
        {taskId:task._id},
        {$set:{...body,studentId:task.studentId,submittedAt:new Date()}},
        {new:true,upsert:true,runValidators:true,setDefaultsOnInsert:true},
      );
      await recomputeDailyMetric(String(task.studentId),task.date);
      await logAudit(req.userId!,'submission.upsert','TaskSubmission',submission._id,null,submission.toJSON());
      res.json(submission);
    }catch(error){next(error)}
  });

  app.get('/api/counseling/feedback',auth,async(req:AuthRequest,res,next)=>{
    try{
      const studentId=await resolveStudentAccess(req,res,String(req.query.studentId||''));
      if(!studentId) return;
      res.json(await CounselingFeedback.find({studentId}).sort({createdAt:-1}).limit(200).lean());
    }catch(error){next(error)}
  });

  app.post('/api/counseling/feedback',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['counselor','admin']);
      if(!role) return;
      const body=feedbackInput.parse(req.body);
      const counselorId=await resolveCounselorForStudent(req,res,body.studentId,role);
      if(!counselorId) return;
      if(body.targetType==='task'){
        const target=await StudyTask.findOne({_id:body.targetId,studentId:body.studentId,archived:false}).select('_id');
        if(!target) return res.status(400).json({error:'Feedback task does not belong to this student'});
      }
      const feedback=await CounselingFeedback.create({
        counselorId,
        studentId:body.studentId,
        targetType:body.targetType,
        targetId:body.targetId||null,
        date:body.date||'',
        weekStart:body.weekStart||'',
        text:body.text,
      });
      res.status(201).json(feedback);
    }catch(error){next(error)}
  });

  app.get('/api/counseling/exams',auth,async(req:AuthRequest,res,next)=>{
    try{
      const studentId=await resolveStudentAccess(req,res,String(req.query.studentId||''));
      if(!studentId) return;
      res.json(await MockExam.find({studentId}).sort({date:-1}).limit(60).lean());
    }catch(error){next(error)}
  });

  app.post('/api/counseling/exams',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['student','admin']);
      if(!role) return;
      const body=examInput.parse(req.body);
      const studentId=role==='student'?req.userId!:z.string().min(1).parse(req.body.studentId);
      const assignment=await CounselorAssignment.findOne({studentId,status:'active'});
      if(!assignment) return res.status(400).json({error:'Student has no active counselor'});
      const exam=await MockExam.create({...body,studentId,counselorId:assignment.counselorId});
      res.status(201).json(exam);
    }catch(error){next(error)}
  });

  app.get('/api/counseling/reports',auth,async(req:AuthRequest,res,next)=>{
    try{
      const studentId=await resolveStudentAccess(req,res,String(req.query.studentId||''));
      if(!studentId) return;
      const period=req.query.period==='month'?'month':req.query.period==='day'?'day':'week';
      const anchor=dateString.catch(todayDate()).parse(String(req.query.anchor||todayDate()));
      res.json(await buildReport(studentId,period,anchor));
    }catch(error){next(error)}
  });

  app.get('/api/counseling/admin/counselors',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['admin']);
      if(!role) return;
      const counselors=await User.find({roles:'counselor'}).select('username roles createdAt').lean();
      const ids=counselors.map(item=>item._id);
      const counts=await CounselorAssignment.aggregate([
        {$match:{counselorId:{$in:ids},status:'active'}},
        {$group:{_id:'$counselorId',students:{$sum:1}}},
      ]);
      const countMap=new Map(counts.map(item=>[String(item._id),item.students]));
      res.json(counselors.map(item=>({...item,studentCount:countMap.get(String(item._id))||0})));
    }catch(error){next(error)}
  });

  app.get('/api/counseling/counselor-reviews',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['counselor','admin']);
      if(!role) return;
      const counselorId=role==='counselor'?req.userId!:String(req.query.counselorId||'');
      if(!counselorId) return res.status(400).json({error:'counselorId is required'});
      res.json(await CounselorReview.find({counselorId}).sort({createdAt:-1}).limit(100).lean());
    }catch(error){next(error)}
  });

  app.post('/api/counseling/admin/counselor-reviews',auth,async(req:AuthRequest,res,next)=>{
    try{
      const role=await authorize(req,res,['admin']);
      if(!role) return;
      const body=z.object({
        counselorId:z.string().min(1),
        text:z.string().trim().min(2).max(4000),
      }).parse(req.body);
      const review=await CounselorReview.create({adminId:req.userId,counselorId:body.counselorId,text:body.text});
      res.status(201).json(review);
    }catch(error){next(error)}
  });
}

function normalizedRoles(user:any):string[]{
  const roles=Array.isArray(user?.roles)&&user.roles.length?user.roles:['personal'];
  return roles.map(String);
}

async function authorize(req:AuthRequest,res:Response,allowed:string[]){
  const user=await User.findById(req.userId).select('roles');
  if(!user){
    res.status(401).json({error:'User not found'});
    return null;
  }
  const role=normalizedRoles(user).find(item=>allowed.includes(item));
  if(!role){
    res.status(403).json({error:'Insufficient role'});
    return null;
  }
  return role;
}

async function resolveStudentAccess(req:AuthRequest,res:Response,requested:string){
  const user=await User.findById(req.userId).select('roles');
  if(!user){
    res.status(401).json({error:'User not found'});
    return null;
  }
  const roles=normalizedRoles(user);
  if(roles.includes('admin')){
    if(!requested){
      res.status(400).json({error:'studentId is required'});
      return null;
    }
    return requested;
  }
  if(roles.includes('student')){
    if(requested&&requested!==req.userId){
      res.status(403).json({error:'Forbidden'});
      return null;
    }
    return req.userId!;
  }
  if(roles.includes('counselor')){
    if(!requested){
      res.status(400).json({error:'studentId is required'});
      return null;
    }
    const assignment=await CounselorAssignment.findOne({studentId:requested,counselorId:req.userId,status:'active'});
    if(!assignment){
      res.status(403).json({error:'Student is not assigned to this counselor'});
      return null;
    }
    return requested;
  }
  res.status(403).json({error:'Counseling access is not enabled'});
  return null;
}

async function resolveCounselorForStudent(req:AuthRequest,res:Response,studentId:string,role:string){
  const assignment=await CounselorAssignment.findOne({studentId,status:'active'});
  if(!assignment){
    res.status(404).json({error:'Active counselor assignment not found'});
    return null;
  }
  if(role==='counselor'&&String(assignment.counselorId)!==req.userId){
    res.status(403).json({error:'Student is not assigned to this counselor'});
    return null;
  }
  return String(assignment.counselorId);
}

function hashToken(value:string){
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizedQuery(value:any){
  return String(value??'').toLowerCase();
}

function parseDate(value:string){
  return new Date(value+'T00:00:00.000Z');
}

function formatDate(date:Date){
  return date.toISOString().slice(0,10);
}

function addDays(value:string,days:number){
  const date=parseDate(value);
  date.setUTCDate(date.getUTCDate()+days);
  return formatDate(date);
}

function toSaturday(value:string){
  const date=parseDate(value);
  const diff=(date.getUTCDay()+1)%7;
  date.setUTCDate(date.getUTCDate()-diff);
  return formatDate(date);
}

function todayDate(){
  return formatDate(new Date());
}

async function materializeRecurringRules(studentId:string,counselorId:string,plan:any){
  const rules=await RecurringStudyRule.find({
    studentId,
    counselorId,
    active:true,
    startsOn:{$lte:plan.weekEnd},
    $or:[{endsOn:''},{endsOn:{$gte:plan.weekStart}}],
  }).lean();
  const docs:any[]=[];
  for(const rule of rules){
    for(const dayIndex of rule.daysOfWeek||[]){
      const date=addDays(plan.weekStart,Number(dayIndex));
      if(date<rule.startsOn) continue;
      if(rule.endsOn&&date>rule.endsOn) continue;
      docs.push({
        planId:plan._id,
        studentId,
        counselorId,
        date,
        dayIndex,
        track:rule.track,
        grade:rule.grade,
        subject:rule.subject,
        book:rule.book,
        chapter:rule.chapter,
        topic:rule.topic,
        activityType:rule.activityType,
        plannedMinutes:rule.plannedMinutes,
        plannedTests:rule.plannedTests,
        plannedPages:rule.plannedPages,
        description:rule.description,
        order:100,
        archived:false,
        recurringRuleId:rule._id,
      });
    }
  }
  if(docs.length) await StudyTask.insertMany(docs);
}

async function recomputeDailyMetric(studentId:string,date:string){
  const publishedPlans=await WeeklyPlan.find({
    studentId,
    status:'published',
    weekStart:{$lte:date},
    weekEnd:{$gte:date},
  }).select('_id').lean();
  const tasks=await StudyTask.find({
    studentId,
    date,
    archived:false,
    planId:{$in:publishedPlans.map(plan=>plan._id)},
  }).lean();
  const submissions=await TaskSubmission.find({taskId:{$in:tasks.map(task=>task._id)}}).lean();
  const submissionMap=new Map(submissions.map(item=>[String(item.taskId),item]));
  const metric={
    plannedMinutes:0,
    actualMinutes:0,
    plannedTests:0,
    attemptedTests:0,
    correct:0,
    wrong:0,
    unanswered:0,
    plannedTasks:tasks.length,
    completedTasks:0,
    partialTasks:0,
    skippedTasks:0,
    completionRate:0,
    accuracy:0,
    subjectBreakdown:{} as Record<string,any>,
  };
  let completionTotal=0;

  for(const task of tasks){
    const submission:any=submissionMap.get(String(task._id));
    metric.plannedMinutes+=Number(task.plannedMinutes||0);
    metric.plannedTests+=Number(task.plannedTests||0);
    const subject=String(task.subject||'سایر');
    const subjectMetric=metric.subjectBreakdown[subject]||{
      plannedMinutes:0,actualMinutes:0,plannedTests:0,attemptedTests:0,correct:0,wrong:0,unanswered:0,tasks:0,completionTotal:0,
    };
    subjectMetric.plannedMinutes+=Number(task.plannedMinutes||0);
    subjectMetric.plannedTests+=Number(task.plannedTests||0);
    subjectMetric.tasks+=1;

    const completion=taskCompletion(task,submission);
    completionTotal+=completion;
    subjectMetric.completionTotal+=completion;

    if(submission){
      metric.actualMinutes+=Number(submission.actualMinutes||0);
      metric.attemptedTests+=Number(submission.testsAttempted||0);
      metric.correct+=Number(submission.correctAnswers||0);
      metric.wrong+=Number(submission.wrongAnswers||0);
      metric.unanswered+=Number(submission.unanswered||0);
      subjectMetric.actualMinutes+=Number(submission.actualMinutes||0);
      subjectMetric.attemptedTests+=Number(submission.testsAttempted||0);
      subjectMetric.correct+=Number(submission.correctAnswers||0);
      subjectMetric.wrong+=Number(submission.wrongAnswers||0);
      subjectMetric.unanswered+=Number(submission.unanswered||0);
      if(submission.status==='done') metric.completedTasks+=1;
      if(submission.status==='partial') metric.partialTasks+=1;
      if(submission.status==='skipped') metric.skippedTasks+=1;
    }
    metric.subjectBreakdown[subject]=subjectMetric;
  }

  metric.completionRate=tasks.length?round(completionTotal/tasks.length):0;
  metric.accuracy=metric.correct+metric.wrong?round(metric.correct/(metric.correct+metric.wrong)*100):0;
  for(const subject of Object.keys(metric.subjectBreakdown)){
    const item=metric.subjectBreakdown[subject];
    item.completionRate=item.tasks?round(item.completionTotal/item.tasks):0;
    item.accuracy=item.correct+item.wrong?round(item.correct/(item.correct+item.wrong)*100):0;
    delete item.completionTotal;
  }
  await StudentDailyMetric.findOneAndUpdate(
    {studentId,date},
    {$set:{studentId,date,...metric}},
    {upsert:true,new:true,setDefaultsOnInsert:true},
  );
  return metric;
}

function taskCompletion(task:any,submission:any){
  if(!submission||submission.status==='not-started'||submission.status==='skipped') return 0;
  if(submission.status==='done') return 100;
  const ratios:number[]=[];
  if(Number(task.plannedMinutes)>0) ratios.push(Math.min(1,Number(submission.actualMinutes||0)/Number(task.plannedMinutes)));
  if(Number(task.plannedTests)>0) ratios.push(Math.min(1,Number(submission.testsAttempted||0)/Number(task.plannedTests)));
  if(Number(task.plannedPages)>0) ratios.push(Math.min(1,Number(submission.pagesRead||0)/Number(task.plannedPages)));
  if(!ratios.length) return submission.status==='partial'?50:25;
  return round(ratios.reduce((sum,value)=>sum+value,0)/ratios.length*100);
}

async function buildReport(studentId:string,period:'day'|'week'|'month',anchor:string){
  const range=periodRange(period,anchor);
  const previous=previousRange(period,range.start);
  const [currentMetrics,previousMetrics,feedback,exams]=await Promise.all([
    StudentDailyMetric.find({studentId,date:{$gte:range.start,$lte:range.end}}).sort({date:1}).lean(),
    StudentDailyMetric.find({studentId,date:{$gte:previous.start,$lte:previous.end}}).sort({date:1}).lean(),
    CounselingFeedback.find({studentId,createdAt:{$gte:parseDate(range.start),$lt:parseDate(addDays(range.end,1))}}).sort({createdAt:-1}).lean(),
    MockExam.find({studentId,date:{$gte:range.start,$lte:range.end}}).sort({date:1}).lean(),
  ]);
  const current=aggregateMetrics(currentMetrics);
  const prior=aggregateMetrics(previousMetrics);
  const subjects=aggregateSubjects(currentMetrics);
  return {
    period,
    range,
    previousRange:previous,
    metrics:{
      ...current,
      completionChange:round(current.completionRate-prior.completionRate),
      studyMinutesChange:percentChange(current.actualMinutes,prior.actualMinutes),
      testsChange:percentChange(current.attemptedTests,prior.attemptedTests),
      accuracyChange:round(current.accuracy-prior.accuracy),
    },
    previous:prior,
    daily:fillMetricDays(range.start,range.end,currentMetrics),
    subjects,
    feedback,
    exams,
    summary:reportSummary(current,prior,subjects,period),
  };
}

function aggregateMetrics(items:any[]){
  const result:any={
    plannedMinutes:0,actualMinutes:0,plannedTests:0,attemptedTests:0,correct:0,wrong:0,unanswered:0,
    plannedTasks:0,completedTasks:0,partialTasks:0,skippedTasks:0,completionRate:0,accuracy:0,
  };
  for(const item of items){
    for(const key of ['plannedMinutes','actualMinutes','plannedTests','attemptedTests','correct','wrong','unanswered','plannedTasks','completedTasks','partialTasks','skippedTasks']){
      result[key]+=Number(item[key]||0);
    }
  }
  const weighted=items.reduce((sum,item)=>sum+Number(item.completionRate||0)*Number(item.plannedTasks||0),0);
  result.completionRate=result.plannedTasks?round(weighted/result.plannedTasks):0;
  result.accuracy=result.correct+result.wrong?round(result.correct/(result.correct+result.wrong)*100):0;
  return result;
}

function aggregateSubjects(items:any[]){
  const map=new Map<string,any>();
  for(const metric of items){
    const breakdown=metric.subjectBreakdown||{};
    for(const [subject,value] of Object.entries(breakdown) as [string,any][]){
      const current=map.get(subject)||{
        subject,plannedMinutes:0,actualMinutes:0,plannedTests:0,attemptedTests:0,correct:0,wrong:0,unanswered:0,tasks:0,completionWeighted:0,
      };
      current.plannedMinutes+=Number(value.plannedMinutes||0);
      current.actualMinutes+=Number(value.actualMinutes||0);
      current.plannedTests+=Number(value.plannedTests||0);
      current.attemptedTests+=Number(value.attemptedTests||0);
      current.correct+=Number(value.correct||0);
      current.wrong+=Number(value.wrong||0);
      current.unanswered+=Number(value.unanswered||0);
      current.tasks+=Number(value.tasks||0);
      current.completionWeighted+=Number(value.completionRate||0)*Number(value.tasks||0);
      map.set(subject,current);
    }
  }
  return [...map.values()].map(item=>({
    subject:item.subject,
    plannedMinutes:item.plannedMinutes,
    actualMinutes:item.actualMinutes,
    plannedTests:item.plannedTests,
    attemptedTests:item.attemptedTests,
    correct:item.correct,
    wrong:item.wrong,
    unanswered:item.unanswered,
    completionRate:item.tasks?round(item.completionWeighted/item.tasks):0,
    accuracy:item.correct+item.wrong?round(item.correct/(item.correct+item.wrong)*100):0,
  })).sort((a,b)=>b.actualMinutes-a.actualMinutes);
}

function fillMetricDays(start:string,end:string,items:any[]){
  const map=new Map(items.map(item=>[item.date,item]));
  const result:any[]=[];
  for(let date=start;date<=end;date=addDays(date,1)){
    const item:any=map.get(date);
    result.push({
      date,
      actualMinutes:Number(item?.actualMinutes||0),
      plannedMinutes:Number(item?.plannedMinutes||0),
      attemptedTests:Number(item?.attemptedTests||0),
      plannedTests:Number(item?.plannedTests||0),
      completionRate:Number(item?.completionRate||0),
      accuracy:Number(item?.accuracy||0),
    });
  }
  return result;
}

function periodRange(period:'day'|'week'|'month',anchor:string){
  if(period==='day') return {start:anchor,end:anchor};
  if(period==='week'){
    const start=toSaturday(anchor);
    return {start,end:addDays(start,6)};
  }
  const date=parseDate(anchor);
  const start=formatDate(new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1)));
  const end=formatDate(new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)));
  return {start,end};
}

function previousRange(period:'day'|'week'|'month',start:string){
  if(period==='day'){
    const previous=addDays(start,-1);
    return {start:previous,end:previous};
  }
  if(period==='week'){
    const previous=addDays(start,-7);
    return {start:previous,end:addDays(previous,6)};
  }
  const date=parseDate(start);
  const previousStart=formatDate(new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-1,1)));
  const previousEnd=formatDate(new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),0)));
  return {start:previousStart,end:previousEnd};
}

function reportSummary(current:any,previous:any,subjects:any[],period:string){
  if(!current.plannedTasks) return 'برای این بازه هنوز برنامه‌ای ثبت نشده است.';
  const best=subjects.slice().sort((a,b)=>b.completionRate-a.completionRate)[0];
  const weak=subjects.slice().sort((a,b)=>a.completionRate-b.completionRate)[0];
  const label=period==='day'?'امروز':period==='week'?'این هفته':'این ماه';
  const parts=[
    `${label} ${current.completionRate}% از برنامه اجرا شده و ${current.actualMinutes} دقیقه مطالعه ثبت شده است.`,
    `${current.attemptedTests} تست با دقت ${current.accuracy}% ثبت شده است.`,
  ];
  if(previous.plannedTasks){
    const direction=current.completionRate>=previous.completionRate?'بهتر':'ضعیف‌تر';
    parts.push(`اجرای برنامه نسبت به بازه قبل ${Math.abs(round(current.completionRate-previous.completionRate))} واحد درصد ${direction} بوده است.`);
  }
  if(best) parts.push(`بهترین اجرای درسی مربوط به ${best.subject} با ${best.completionRate}% بوده است.`);
  if(weak&&best&&weak.subject!==best.subject) parts.push(`کمترین اجرای برنامه مربوط به ${weak.subject} با ${weak.completionRate}% بوده است.`);
  return parts.join(' ');
}

function percentChange(current:number,previous:number){
  if(!previous) return current?100:0;
  return round((current-previous)/previous*100);
}

function round(value:number){
  return Math.round(value*10)/10;
}

async function logAudit(actorId:string,action:string,entityType:string,entityId:any,before:any,after:any){
  await AuditLog.create({actorId,action,entityType,entityId,before,after});
}
