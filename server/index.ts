import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {z} from 'zod';
import {auth,AuthRequest} from './auth';
import {Category,DailyReview,LearningItem,LearningSession,Project,Task,User} from './models';
import {registerCounselingRoutes} from './counseling';

if(!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

const app=express();
app.use(cors());
app.use(express.json({limit:'100kb'}));

const credentials=z.object({
  username:z.string().trim().min(3).max(40),
  password:z.string().min(8).max(100),
});

const taskCategories=['Splunk','Security','Automation','DevOps','Meeting','Support','Other'] as const;
const taskCreate=z.object({
  title:z.string().trim().min(1).max(200),
  description:z.string().trim().max(2000).optional(),
  projectId:z.string().optional(),
  category:z.enum(taskCategories).default('Other'),
  status:z.enum(['todo','in-progress','done']).default('todo'),
  priority:z.enum(['low','medium','high']).default('medium'),
  startedAt:z.coerce.date().optional(),
});
const taskPatch=taskCreate.partial();

const projectInput=z.object({
  name:z.string().trim().min(1).max(120),
  description:z.string().trim().max(1000).optional(),
  status:z.enum(['active','paused','completed']).default('active'),
});
const categoryInput=z.object({
  name:z.string().trim().min(1).max(80),
  color:z.string().trim().max(20).optional(),
  description:z.string().trim().max(500).optional(),
});
const reviewInput=z.object({
  completedTasks:z.string().trim().max(2000).optional(),
  learnedToday:z.string().trim().max(2000).optional(),
  blockers:z.string().trim().max(2000).optional(),
  tomorrowFocus:z.string().trim().max(2000).optional(),
  date:z.coerce.date().optional(),
});

const learningBase=z.object({
  title:z.string().trim().min(1).max(200),
  type:z.enum(['course','book']),
  description:z.string().trim().max(2000).optional(),
  totalHours:z.number().min(0).default(0),
  totalPages:z.number().int().min(0).default(0),
  startDate:z.coerce.date().optional(),
});
const learningInput=learningBase.superRefine((value,ctx)=>{
  if(value.type==='course'&&value.totalHours<=0){
    ctx.addIssue({code:z.ZodIssueCode.custom,path:['totalHours'],message:'Course total hours must be greater than 0'});
  }
  if(value.type==='book'&&value.totalPages<=0){
    ctx.addIssue({code:z.ZodIssueCode.custom,path:['totalPages'],message:'Book total pages must be greater than 0'});
  }
});

const learningSessionInput=z.object({
  durationHours:z.number().min(0).default(0),
  pagesRead:z.number().int().min(0).default(0),
  note:z.string().trim().max(1000).optional(),
  date:z.coerce.date().optional(),
}).refine(value=>value.durationHours>0||value.pagesRead>0,{
  message:'Enter study time or pages read',
});

app.post('/api/auth/register',async(req,res,next)=>{
  try{
    const body=credentials.parse(req.body);
    const user=await User.create({
      username:body.username.toLowerCase(),
      passwordHash:await bcrypt.hash(body.password,12),
    });
    res.status(201).json({
      token:jwt.sign({},process.env.JWT_SECRET!,{subject:String(user._id),expiresIn:'7d'}),
    });
  }catch(error){next(error)}
});

app.post('/api/auth/login',async(req,res,next)=>{
  try{
    const body=credentials.parse(req.body);
    const user=await User.findOne({username:body.username.toLowerCase()});
    if(!user||!await bcrypt.compare(body.password,user.passwordHash)){
      return res.status(401).json({error:'Invalid credentials'});
    }
    res.json({
      token:jwt.sign({},process.env.JWT_SECRET!,{subject:String(user._id),expiresIn:'7d'}),
    });
  }catch(error){next(error)}
});

app.get('/api/tasks',auth,async(req:AuthRequest,res,next)=>{
  try{res.json(await Task.find({userId:req.userId}).sort({createdAt:-1}))}
  catch(error){next(error)}
});

app.post('/api/tasks',auth,async(req:AuthRequest,res,next)=>{
  try{
    const body=taskCreate.parse(req.body);
    const task=await Task.create({
      ...body,
      userId:req.userId,
      completedAt:body.status==='done'?new Date():null,
    });
    res.status(201).json(task);
  }catch(error){next(error)}
});

app.patch('/api/tasks/:id',auth,async(req:AuthRequest,res,next)=>{
  try{
    const changes=taskPatch.parse(req.body);
    const existing=await Task.findOne({_id:req.params.id,userId:req.userId});
    if(!existing) return res.status(404).json({error:'Not found'});

    Object.assign(existing,changes);
    if(changes.status==='done'&&!existing.completedAt) existing.completedAt=new Date();
    if(changes.status&&changes.status!=='done') existing.completedAt=null;
    await existing.save();
    res.json(existing);
  }catch(error){next(error)}
});

app.delete('/api/tasks/:id',auth,async(req:AuthRequest,res,next)=>{
  try{
    const result=await Task.deleteOne({_id:req.params.id,userId:req.userId});
    if(!result.deletedCount) return res.status(404).json({error:'Not found'});
    res.status(204).end();
  }catch(error){next(error)}
});

app.get('/api/projects',auth,async(req:AuthRequest,res,next)=>{
  try{res.json(await Project.find({userId:req.userId}).sort({createdAt:-1}))}
  catch(error){next(error)}
});
app.post('/api/projects',auth,async(req:AuthRequest,res,next)=>{
  try{res.status(201).json(await Project.create({...projectInput.parse(req.body),userId:req.userId}))}
  catch(error){next(error)}
});
app.patch('/api/projects/:id',auth,async(req:AuthRequest,res,next)=>{
  try{
    const item=await Project.findOneAndUpdate(
      {_id:req.params.id,userId:req.userId},
      {$set:projectInput.partial().parse(req.body)},
      {new:true,runValidators:true},
    );
    if(!item) return res.status(404).json({error:'Not found'});
    res.json(item);
  }catch(error){next(error)}
});
app.delete('/api/projects/:id',auth,async(req:AuthRequest,res,next)=>{
  try{
    const result=await Project.deleteOne({_id:req.params.id,userId:req.userId});
    if(!result.deletedCount) return res.status(404).json({error:'Not found'});
    res.status(204).end();
  }catch(error){next(error)}
});

app.get('/api/categories',auth,async(req:AuthRequest,res,next)=>{
  try{res.json(await Category.find({userId:req.userId}).sort({createdAt:-1}))}
  catch(error){next(error)}
});
app.post('/api/categories',auth,async(req:AuthRequest,res,next)=>{
  try{res.status(201).json(await Category.create({...categoryInput.parse(req.body),userId:req.userId}))}
  catch(error){next(error)}
});

app.get('/api/learning',auth,async(req:AuthRequest,res,next)=>{
  try{res.json(await LearningItem.find({userId:req.userId}).sort({createdAt:-1}))}
  catch(error){next(error)}
});

app.post('/api/learning',auth,async(req:AuthRequest,res,next)=>{
  try{
    const body=learningInput.parse(req.body);
    const item=await LearningItem.create({
      ...body,
      userId:req.userId,
      completedHours:0,
      completedPages:0,
      status:'not-started',
    });
    res.status(201).json(item);
  }catch(error){next(error)}
});

app.patch('/api/learning/:id',auth,async(req:AuthRequest,res,next)=>{
  try{
    const changes=learningBase.partial().parse(req.body);
    const item=await LearningItem.findOneAndUpdate(
      {_id:req.params.id,userId:req.userId},
      {$set:changes},
      {new:true,runValidators:true},
    );
    if(!item) return res.status(404).json({error:'Not found'});
    res.json(item);
  }catch(error){next(error)}
});

app.delete('/api/learning/:id',auth,async(req:AuthRequest,res,next)=>{
  try{
    const item=await LearningItem.findOne({_id:req.params.id,userId:req.userId});
    if(!item) return res.status(404).json({error:'Not found'});
    await Promise.all([
      LearningItem.deleteOne({_id:item._id}),
      LearningSession.deleteMany({learningItemId:item._id,userId:req.userId}),
    ]);
    res.status(204).end();
  }catch(error){next(error)}
});

app.get('/api/learning/sessions',auth,async(req:AuthRequest,res,next)=>{
  try{
    const sessions=await LearningSession.find({userId:req.userId}).sort({date:-1}).limit(500);
    res.json(sessions);
  }catch(error){next(error)}
});

app.post('/api/learning/:id/sessions',auth,async(req:AuthRequest,res,next)=>{
  try{
    const body=learningSessionInput.parse(req.body);
    const item=await LearningItem.findOne({_id:req.params.id,userId:req.userId});
    if(!item) return res.status(404).json({error:'Learning item not found'});

    if(item.type==='course'&&body.durationHours<=0){
      return res.status(400).json({error:'Course sessions require durationHours'});
    }
    if(item.type==='book'&&body.pagesRead<=0){
      return res.status(400).json({error:'Book sessions require pagesRead'});
    }

    const session=await LearningSession.create({
      userId:req.userId,
      learningItemId:item._id,
      durationHours:body.durationHours,
      pagesRead:body.pagesRead,
      note:body.note,
      date:body.date||new Date(),
    });

    item.completedHours=Math.min(item.totalHours||Number.MAX_SAFE_INTEGER,item.completedHours+body.durationHours);
    item.completedPages=Math.min(item.totalPages||Number.MAX_SAFE_INTEGER,item.completedPages+body.pagesRead);

    const complete=item.type==='course'
      ? item.totalHours>0&&item.completedHours>=item.totalHours
      : item.totalPages>0&&item.completedPages>=item.totalPages;

    item.status=complete?'completed':'in-progress';
    await item.save();

    const progress=item.type==='course'
      ? Math.round((item.completedHours/item.totalHours)*100)
      : Math.round((item.completedPages/item.totalPages)*100);

    res.status(201).json({session,item,progress});
  }catch(error){next(error)}
});

app.get('/api/reviews',auth,async(req:AuthRequest,res,next)=>{
  try{res.json(await DailyReview.find({userId:req.userId}).sort({date:-1}))}
  catch(error){next(error)}
});
app.post('/api/reviews',auth,async(req:AuthRequest,res,next)=>{
  try{res.status(201).json(await DailyReview.create({...reviewInput.parse(req.body),userId:req.userId}))}
  catch(error){next(error)}
});

app.get('/api/reports',auth,async(req:AuthRequest,res,next)=>{
  try{
    const period=req.query.period==='month'?'month':'week';
    const now=new Date();
    const start=currentPeriodStart(now,period);
    const previousStart=previousPeriodStart(start,period);

    const [doneTasks,sessions,recentSessions]=await Promise.all([
      Task.find({
        userId:req.userId,
        status:'done',
        completedAt:{$gte:previousStart,$lte:now},
      }).lean(),
      LearningSession.find({
        userId:req.userId,
        date:{$gte:previousStart,$lte:now},
      }).lean(),
      LearningSession.find({userId:req.userId}).sort({date:-1}).limit(180).lean(),
    ]);

    const currentTasks=doneTasks.filter(task=>task.completedAt&&new Date(task.completedAt)>=start);
    const previousTasks=doneTasks.filter(task=>task.completedAt&&new Date(task.completedAt)<start);
    const currentSessions=sessions.filter(session=>new Date(session.date)>=start);
    const previousSessions=sessions.filter(session=>new Date(session.date)<start);

    const taskDaily=groupDaily(currentTasks,task=>task.completedAt,()=>1);
    const taskCategories=groupByLabel(currentTasks,task=>task.category||'Other');
    const learningDaily=groupDaily(currentSessions,session=>session.date,session=>({
      hours:Number(session.durationHours||0),
      pages:Number(session.pagesRead||0),
    }));

    const currentHours=currentSessions.reduce((sum,session)=>sum+Number(session.durationHours||0),0);
    const previousHours=previousSessions.reduce((sum,session)=>sum+Number(session.durationHours||0),0);
    const currentPages=currentSessions.reduce((sum,session)=>sum+Number(session.pagesRead||0),0);
    const previousPages=previousSessions.reduce((sum,session)=>sum+Number(session.pagesRead||0),0);

    res.json({
      period,
      range:{start:start.toISOString(),end:now.toISOString()},
      work:{
        completed:currentTasks.length,
        previousCompleted:previousTasks.length,
        changePercent:percentChange(currentTasks.length,previousTasks.length),
        daily:fillTaskDays(start,now,taskDaily),
        categories:taskCategories,
        summary:workSummary(period,currentTasks.length,previousTasks.length,taskCategories),
      },
      learning:{
        hours:Number(currentHours.toFixed(2)),
        previousHours:Number(previousHours.toFixed(2)),
        pages:currentPages,
        previousPages,
        hoursChangePercent:percentChange(currentHours,previousHours),
        pagesChangePercent:percentChange(currentPages,previousPages),
        daily:fillLearningDays(start,now,learningDaily),
        streak:calculateStreak(recentSessions.map(session=>new Date(session.date))),
        summary:learningSummary(period,currentHours,currentPages,previousHours,previousPages),
      },
    });
  }catch(error){next(error)}
});

registerCounselingRoutes(app);

app.get('/api/health',(_req,res)=>res.json({status:'ok'}));

app.use((err:any,_req:any,res:any,_next:any)=>{
  console.error(err);
  if(err instanceof z.ZodError) return res.status(400).json({error:'Validation failed',details:err.flatten()});
  if(err?.code===11000) return res.status(409).json({error:'Already exists'});
  if(err instanceof mongoose.Error.CastError) return res.status(400).json({error:'Invalid id'});
  res.status(500).json({error:'Something went wrong'});
});

mongoose.connect(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/lifeos')
  .then(async()=>{
    await Task.updateMany(
      {status:'done',$or:[{completedAt:null},{completedAt:{$exists:false}}]},
      [{$set:{completedAt:'$updatedAt'}}],
      {updatePipeline:true},
    );
    app.listen(process.env.PORT||4000,()=>console.log('LifeOS API ready'));
  })
  .catch(error=>{console.error(error);process.exit(1)});

function currentPeriodStart(now:Date,period:'week'|'month'){
  const start=new Date(now);
  start.setHours(0,0,0,0);
  if(period==='month'){
    start.setDate(1);
  }else{
    const day=start.getDay();
    const diff=day===0?6:day-1;
    start.setDate(start.getDate()-diff);
  }
  return start;
}

function previousPeriodStart(start:Date,period:'week'|'month'){
  const previous=new Date(start);
  if(period==='month') previous.setMonth(previous.getMonth()-1);
  else previous.setDate(previous.getDate()-7);
  return previous;
}

function dayKey(date:Date|string|undefined|null){
  return date?new Date(date).toISOString().slice(0,10):'';
}

function groupDaily<T>(items:T[],getDate:(item:T)=>any,getValue:(item:T)=>any){
  const map=new Map<string,any>();
  for(const item of items){
    const key=dayKey(getDate(item));
    if(!key) continue;
    const value=getValue(item);
    if(typeof value==='number'){
      map.set(key,(map.get(key)||0)+value);
    }else{
      const current=map.get(key)||{hours:0,pages:0};
      map.set(key,{hours:current.hours+value.hours,pages:current.pages+value.pages});
    }
  }
  return map;
}

function groupByLabel<T>(items:T[],getLabel:(item:T)=>string){
  const counts=new Map<string,number>();
  for(const item of items){
    const label=getLabel(item);
    counts.set(label,(counts.get(label)||0)+1);
  }
  return [...counts.entries()]
    .map(([name,count])=>({name,count}))
    .sort((a,b)=>b.count-a.count);
}

function fillTaskDays(start:Date,end:Date,map:Map<string,number>){
  const result:{date:string,count:number}[]=[];
  const cursor=new Date(start);
  while(cursor<=end){
    const key=dayKey(cursor);
    result.push({date:key,count:map.get(key)||0});
    cursor.setDate(cursor.getDate()+1);
  }
  return result;
}

function fillLearningDays(start:Date,end:Date,map:Map<string,{hours:number;pages:number}>){
  const result:{date:string;hours:number;pages:number}[]=[];
  const cursor=new Date(start);
  while(cursor<=end){
    const key=dayKey(cursor);
    const value=map.get(key)||{hours:0,pages:0};
    result.push({date:key,hours:Number(value.hours.toFixed(2)),pages:value.pages});
    cursor.setDate(cursor.getDate()+1);
  }
  return result;
}

function percentChange(current:number,previous:number){
  if(previous===0) return current===0?0:100;
  return Math.round(((current-previous)/previous)*100);
}

function calculateStreak(dates:Date[]){
  const unique=[...new Set(dates.map(dayKey))].filter(Boolean).sort().reverse();
  if(!unique.length) return 0;

  const today=new Date();
  today.setHours(0,0,0,0);
  const latest=new Date(unique[0]+'T00:00:00Z');
  const dayMs=24*60*60*1000;
  const gap=Math.floor((today.getTime()-latest.getTime())/dayMs);
  if(gap>1) return 0;

  let streak=1;
  let cursor=latest;
  for(let index=1;index<unique.length;index++){
    const previous=new Date(unique[index]+'T00:00:00Z');
    const diff=Math.round((cursor.getTime()-previous.getTime())/dayMs);
    if(diff!==1) break;
    streak++;
    cursor=previous;
  }
  return streak;
}

function workSummary(period:'week'|'month',current:number,previous:number,categories:{name:string;count:number}[]){
  const label=period==='week'?'This week':'This month';
  const top=categories[0];
  const comparison=current===previous?'the same as the previous period':current>previous?`${current-previous} more than the previous period`:`${previous-current} fewer than the previous period`;
  return `${label} you completed ${current} task${current===1?'':'s'}, ${comparison}.${top?` Your top category was ${top.name} with ${top.count} completed task${top.count===1?'':'s'}.`:''}`;
}

function learningSummary(period:'week'|'month',hours:number,pages:number,previousHours:number,previousPages:number){
  const label=period==='week'?'This week':'This month';
  const parts=[`${label} you logged ${hours.toFixed(1)} study hours`];
  if(pages>0) parts.push(`${pages} pages`);
  const previous=previousHours>0?` Previous period: ${previousHours.toFixed(1)} hours${previousPages>0?` and ${previousPages} pages`:''}.`:'';
  return parts.join(' and ')+'.'+previous;
}
