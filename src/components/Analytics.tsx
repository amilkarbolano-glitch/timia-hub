import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar
} from 'recharts';
import { Download, TrendingUp } from 'lucide-react';

const phaseData = [
  { name: 'Setup', value: 100 },
  { name: 'Ingest', value: 90 },
  { name: 'Process', value: 65 },
  { name: 'Refine', value: 40 },
  { name: 'Deploy', value: 10 },
];

const velocityData = [
  { day: 'Mon', velocity: 120 },
  { day: 'Tue', velocity: 110 },
  { day: 'Wed', velocity: 130 },
  { day: 'Thu', velocity: 80 },
  { day: 'Fri', velocity: 150 },
  { day: 'Sat', velocity: 180 },
  { day: 'Sun', velocity: 200 },
];

const tasks = [
  { name: 'Data Normalization Pipeline', phase: 'Processing', progress: 85, status: 'In Progress', owner: 'JD', ownerName: 'John Doe' },
  { name: 'Large Batch Ingestion Module', phase: 'Ingestion', progress: 100, status: 'Done', owner: 'AS', ownerName: 'Alice S.' },
  { name: 'Metadata Validation Check', phase: 'Processing', progress: 30, status: 'In Progress', owner: 'MK', ownerName: 'Mike K.' },
  { name: 'Security Audit & Encryption', phase: 'Refine', progress: 0, status: 'To Do', owner: '?', ownerName: 'Unassigned' },
];

export default function Analytics() {
  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Real Progress Analytics</h1>
          <p className="text-slate-500">Live completion tracking across all Timia project phases</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/30 hover:brightness-110 transition-all">
          <Download size={18} />
          Export Report
        </button>
      </div>

      {/* Overall Progress */}
      <div className="p-8 bg-white border border-primary/10 rounded-2xl shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Overall Project Completion</h3>
            <p className="text-sm text-slate-500">42 of 62 total tasks completed across all phases</p>
          </div>
          <div className="text-right">
            <span className="text-5xl font-black text-primary">68%</span>
          </div>
        </div>
        <div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
          <div className="h-full bg-primary rounded-full relative" style={{ width: '68%' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20"></div>
          </div>
        </div>
        <div className="flex justify-between mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Kickoff</span>
          <span>Planning</span>
          <span>Ingestion</span>
          <span>Processing</span>
          <span>Deployment</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 bg-white border border-primary/10 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold">Phase Completion %</h3>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">Update: Live</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#ff0000" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-white border border-primary/10 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold">Velocity Trend</h3>
            <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
              <TrendingUp size={14} />
              +12% vs last week
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData}>
                <defs>
                  <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff0000" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ff0000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="velocity" 
                  stroke="#ff0000" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorVelocity)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Task Table */}
      <div className="bg-white border border-primary/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-primary/5 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">Active Phase: Processing</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs font-bold rounded-lg border border-primary/20 text-slate-600 hover:bg-primary/5">All</button>
            <button className="px-3 py-1 text-xs font-bold rounded-lg bg-primary text-white">In Progress</button>
            <button className="px-3 py-1 text-xs font-bold rounded-lg border border-primary/20 text-slate-600 hover:bg-primary/5">To Do</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-primary/5 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Task Name</th>
                <th className="px-6 py-4">Phase</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {tasks.map((task, i) => (
                <tr key={i} className="hover:bg-primary/[0.02] transition-colors">
                  <td className="px-6 py-4 font-semibold text-sm">{task.name}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      task.phase === 'Processing' ? 'bg-amber-100 text-amber-700' : 
                      task.phase === 'Ingestion' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {task.phase}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${task.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${task.progress}%` }}></div>
                      </div>
                      <span className="text-xs font-bold">{task.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${
                      task.status === 'Done' ? 'text-emerald-600' : 
                      task.status === 'In Progress' ? 'text-primary' : 'text-slate-400'
                    }`}>
                      {task.status === 'In Progress' && <span className="size-2 rounded-full bg-primary animate-pulse"></span>}
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {task.owner}
                      </div>
                      <span className="text-xs font-medium">{task.ownerName}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-primary/5 flex justify-center">
          <button className="text-sm font-bold text-primary hover:underline">View all 62 tasks</button>
        </div>
      </div>
    </div>
  );
}
