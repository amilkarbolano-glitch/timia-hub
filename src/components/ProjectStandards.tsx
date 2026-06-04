import React from 'react';
import { Plus, Edit2, Trash2, Link as LinkIcon, Book, Scale, ChevronLeft, ChevronRight } from 'lucide-react';

const standards = [
  {
    name: 'Source Schema Validation',
    description: 'Automated check for incoming schema drift',
    complexity: 5,
    association: 'Documentation Link',
    icon: <LinkIcon size={16} />
  },
  {
    name: 'Connection Testing',
    description: 'Smoke test for endpoint reachability',
    complexity: 3,
    association: 'None Required',
    icon: null
  },
  {
    name: 'Metadata Extraction',
    description: 'Capturing source catalog information',
    complexity: 8,
    association: 'Data Dictionary',
    icon: <Book size={16} />
  },
  {
    name: 'Quality Check Suite',
    description: 'Pre-defined SQL integrity validations',
    complexity: 12,
    association: 'Validation Rules',
    icon: <Scale size={16} />
  }
];

export default function ProjectStandards() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Project Standards</h2>
          <p className="text-slate-500">Configure default tasks and requirements for each pipeline stage.</p>
        </div>
        <button className="flex items-center gap-2 px-6 h-11 bg-primary text-white rounded-lg font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <Plus size={20} />
          Add New Standard
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button className="px-6 py-4 text-sm font-bold text-primary border-b-2 border-primary whitespace-nowrap">
          Data Ingestion
        </button>
        <button className="px-6 py-4 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap">
          Data Processing
        </button>
        <button className="px-6 py-4 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap">
          Data Archival
        </button>
        <button className="px-6 py-4 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap">
          Validation Layer
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-900 uppercase tracking-wider">Task Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-900 uppercase tracking-wider">Base Complexity</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-900 uppercase tracking-wider">Required Association</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-900 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {standards.map((std, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900">{std.name}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{std.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {std.complexity} Points
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {std.icon ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600 italic">
                        {std.icon}
                        {std.association}
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 uppercase">{std.association}</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-3">
                      <button className="text-slate-400 hover:text-primary transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button className="text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Showing 4 tasks for Data Ingestion</span>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded hover:bg-slate-200 disabled:opacity-50" disabled>
              <ChevronLeft size={18} />
            </button>
            <button className="p-2 rounded hover:bg-slate-200">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-xl">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Avg. Complexity</h3>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-slate-900">7.0</span>
            <span className="text-sm font-bold text-primary mb-1">pts/task</span>
          </div>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-xl">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Requirements Coverage</h3>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-slate-900">75%</span>
            <span className="text-sm font-bold text-emerald-500 mb-1">High</span>
          </div>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-xl">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Last Updated</h3>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-slate-900">Oct 24</span>
            <span className="text-sm font-medium text-slate-500 mb-1">by Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
