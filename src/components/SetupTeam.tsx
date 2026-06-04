import React, { useState } from 'react';
import { Users, Plus, Trash2, ArrowRight, ArrowLeft, ShieldCheck, Code, Eye, Search, X, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { INITIAL_ROLES } from '../lib/permissions';

interface SetupTeamProps {
  onNext: () => void;
  onBack: () => void;
}

const MOCK_EMPLOYEES = [
  { id: 'emp-1', name: 'Jossone', email: 'byjossone@gmail.com', avatar: 'https://picsum.photos/seed/joss/100/100', role: 'leader' },
  { id: 'emp-2', name: 'Ana García', email: 'ana.garcia@company.com', avatar: 'https://picsum.photos/seed/ana/100/100', role: 'member' },
  { id: 'emp-3', name: 'Carlos Ruiz', email: 'carlos.ruiz@company.com', avatar: 'https://picsum.photos/seed/carlos/100/100', role: 'guest' },
  { id: 'emp-4', name: 'Elena Torres', email: 'elena.torres@company.com', avatar: 'https://picsum.photos/seed/elena/100/100', role: 'member' },
  { id: 'emp-5', name: 'Roberto Gómez', email: 'roberto.gomez@company.com', avatar: 'https://picsum.photos/seed/roberto/100/100', role: 'member' },
  { id: 'emp-6', name: 'Lucía Méndez', email: 'lucia.mendez@company.com', avatar: 'https://picsum.photos/seed/lucia/100/100', role: 'guest' },
];

export default function SetupTeam({ onNext, onBack }: SetupTeamProps) {
  const [team, setTeam] = useState(MOCK_EMPLOYEES.slice(0, 3));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddMember = (employee: any) => {
    if (!team.find(m => m.id === employee.id)) {
      setTeam([...team, employee]);
    }
    setIsModalOpen(false);
    setSearchQuery('');
  };

  const handleRemoveMember = (id: string) => {
    setTeam(team.filter(m => m.id !== id));
  };

  const handleRoleChange = (id: string, newRole: string) => {
    setTeam(team.map(m => m.id === id ? { ...m, role: newRole } : m));
  };

  const filteredEmployees = MOCK_EMPLOYEES.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
          <Users size={32} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Equipo del Proyecto</h1>
        <p className="text-slate-500 text-lg">Asigna roles y responsabilidades para garantizar el éxito del pipeline.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Miembros del Equipo</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary/10 text-primary rounded-lg font-bold text-sm hover:bg-primary/20 transition-all"
          >
            <Plus size={18} />
            Añadir Miembro
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {team.map(member => (
            <MemberRow 
              key={member.id}
              name={member.name} 
              email={member.email} 
              role={member.role} 
              avatar={member.avatar} 
              onRemove={() => handleRemoveMember(member.id)}
              onRoleChange={(newRole: string) => handleRoleChange(member.id, newRole)}
            />
          ))}
          {team.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-400 italic">No hay miembros en el equipo. Añade uno para comenzar.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 flex justify-between items-center">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-6 h-14 text-slate-500 font-bold hover:text-slate-900 transition-all"
        >
          <ArrowLeft size={20} />
          Volver
        </button>
        <button 
          onClick={onNext}
          className="flex items-center gap-2 px-8 h-14 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all group"
        >
          Confirmar Tareas
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Buscar Empleado</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Nombre o correo corporativo..." 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredEmployees.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                      <div className="flex items-center gap-3">
                        <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddMember(emp)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        disabled={team.some(m => m.id === emp.id)}
                      >
                        {team.some(m => m.id === emp.id) ? <ShieldCheck size={18} className="text-emerald-500" /> : <UserPlus size={18} />}
                      </button>
                    </div>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm">No se encontraron empleados.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex justify-end">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MemberRow({ name, email, role, avatar, onRemove, onRoleChange }: any) {
  const currentRole = INITIAL_ROLES.find(r => r.id === role);
  
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
      <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-100" referrerPolicy="no-referrer" />
      <div className="flex-1">
        <p className="font-bold text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">{email}</p>
      </div>
      <div className="flex items-center gap-2">
        <select 
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border-none focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
        >
          {INITIAL_ROLES.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
      <button 
        onClick={onRemove}
        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
