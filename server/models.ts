import {Schema,model,models} from 'mongoose';

const owned={userId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true}};

export const User=models.User||model('User',new Schema({
  username:{type:String,required:true,unique:true,trim:true,lowercase:true},
  passwordHash:{type:String,required:true},
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
