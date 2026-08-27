'use client';
import {Area,Bar,CartesianGrid,ComposedChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {weekly} from '@/lib/data';

export function ActivityChart(){
  return <ResponsiveContainer width="100%" height={230}>
    <ComposedChart data={weekly} margin={{top:18,right:4,left:-18,bottom:0}}>
      <defs>
        <linearGradient id="focus" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a7cff" stopOpacity={.34}/>
          <stop offset=".75" stopColor="#7b63ff" stopOpacity={.045}/>
          <stop offset="1" stopColor="#7b63ff" stopOpacity={0}/>
        </linearGradient>
        <linearGradient id="taskBars" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#35d6c7" stopOpacity={.38}/>
          <stop offset="1" stopColor="#35d6c7" stopOpacity={.06}/>
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="#ffffff0a" strokeDasharray="3 5"/>
      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#707482',fontSize:10}} dy={8}/>
      <YAxis yAxisId="focus" hide domain={[0,'auto']}/>
      <YAxis yAxisId="tasks" hide orientation="right"/>
      <Tooltip cursor={{stroke:'#ffffff10',strokeWidth:1}} contentStyle={{background:'rgba(13,15,22,.96)',border:'1px solid #ffffff12',borderRadius:14,fontSize:11,boxShadow:'0 18px 50px rgba(0,0,0,.35)'}} labelStyle={{color:'#d5d7df',marginBottom:6}}/>
      <Bar yAxisId="tasks" dataKey="tasks" fill="url(#taskBars)" radius={[5,5,2,2]} barSize={16}/>
      <Area yAxisId="focus" type="monotone" dataKey="focus" stroke="#9a7cff" strokeWidth={2.4} fill="url(#focus)" dot={false} activeDot={{r:4,fill:'#b19cff',stroke:'#0b0d13',strokeWidth:2}}/>
    </ComposedChart>
  </ResponsiveContainer>;
}
