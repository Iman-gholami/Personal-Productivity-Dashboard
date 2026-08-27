'use client';
import {Area,Bar,CartesianGrid,ComposedChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';

export function ActivityChart({
  work,
  learning,
}:{
  work:{date:string;count:number}[];
  learning:{date:string;hours:number;pages:number}[];
}){
  const learningByDate=new Map(learning.map(item=>[item.date,item]));
  const data=work.map(item=>{
    const study=learningByDate.get(item.date);
    return {
      day:item.date.slice(5),
      completedTasks:item.count,
      studyHours:study?.hours||0,
    };
  });

  return <ResponsiveContainer width="100%" height={230}>
    <ComposedChart data={data} margin={{top:18,right:4,left:-18,bottom:0}}>
      <defs>
        <linearGradient id="studyHoursArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a7cff" stopOpacity={.34}/>
          <stop offset=".75" stopColor="#7b63ff" stopOpacity={.045}/>
          <stop offset="1" stopColor="#7b63ff" stopOpacity={0}/>
        </linearGradient>
        <linearGradient id="completedTaskBars" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#35d6c7" stopOpacity={.46}/>
          <stop offset="1" stopColor="#35d6c7" stopOpacity={.08}/>
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="#ffffff0a" strokeDasharray="3 5"/>
      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#707482',fontSize:10}} dy={8}/>
      <YAxis yAxisId="hours" hide domain={[0,'auto']}/>
      <YAxis yAxisId="tasks" hide orientation="right" allowDecimals={false}/>
      <Tooltip
        cursor={{stroke:'#ffffff10',strokeWidth:1}}
        contentStyle={{background:'rgba(13,15,22,.96)',border:'1px solid #ffffff12',borderRadius:14,fontSize:11,boxShadow:'0 18px 50px rgba(0,0,0,.35)'}}
        labelStyle={{color:'#d5d7df',marginBottom:6}}
        formatter={(value,name)=>[
          name==='studyHours'?Number(value).toFixed(1)+' h':value,
          name==='studyHours'?'Study hours':'Completed tasks',
        ]}
      />
      <Bar yAxisId="tasks" dataKey="completedTasks" fill="url(#completedTaskBars)" radius={[5,5,2,2]} barSize={16}/>
      <Area yAxisId="hours" type="monotone" dataKey="studyHours" stroke="#9a7cff" strokeWidth={2.4} fill="url(#studyHoursArea)" dot={false} activeDot={{r:4,fill:'#b19cff',stroke:'#0b0d13',strokeWidth:2}}/>
    </ComposedChart>
  </ResponsiveContainer>;
}
