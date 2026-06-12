import React, { useState } from 'react';
import { X, User, Mail, Shield, Palette, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminStore } from '../lib/adminStore';

const AVATAR_COLORS = [
  '#DC2626', '#0D9488', '#2563EB', '#7C3AED',
  '#D97706', '#059669', '#BE185D', '#0891B2',
];

const ROLE_LABELS: Record<string, string> = {
  pm:           'Project Manager',
  tech_lead:    'Líder Técnico',
  project_lead: 'Líder de Proyecto',
  tech_ref:     'Referente Técnico',
  developer:    'Desarrollador',
};

interface UserProfileProps {
  onClose: () => void;
}

export default function UserProfile({ onClose }: UserProfileProps) {
  const { user } = useAuth();
  const [savedColor, setSavedColor] = useState(() => {
    const overrides = adminStore.getUsers();
    const me = overrides.find(u => u.email === user?.email);
    return me?.avatarColor ?? user?.avatarColor ?? '#DC2626';
  });
  const [color,    setColor]   = useState(savedColor);
  const [saved,    setSaved]   = useState(false);

  if (!user) return null;

  function handleSave() {
    const users = adminStore.getUsers();
    const idx   = users.findIndex(u => u.email === user!.email);
    if (idx >= 0) {
      users[idx] = { ...users[idx], avatarColor: color };
    }
    adminStore.saveUsers(users);
    setSavedColor(color);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  const initials = user.initials ?? user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1200 }}
      />

      {/* Modal */}
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        width:380, background:'#fff', borderRadius:16, boxShadow:'0 24px 60px rgba(0,0,0,0.2)',
        zIndex:1201, overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{ background:'#0f172a', padding:'20px 20px 0', position:'relative' }}>
          <button
            onClick={onClose}
            style={{ position:'absolute', top:12, right:12, background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', padding:4 }}
          >
            <X size={16}/>
          </button>

          {/* Avatar */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingBottom:20 }}>
            <div style={{
              width:72, height:72, borderRadius:'50%', background:color,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:24, fontWeight:700, color:'#fff',
              boxShadow:`0 0 0 3px #0f172a, 0 0 0 5px ${color}60`,
              marginBottom:10, transition:'background .2s',
            }}>
              {initials}
            </div>
            <p style={{ margin:0, fontSize:16, fontWeight:700, color:'#f1f5f9' }}>{user.name}</p>
            <p style={{ margin:'2px 0 0', fontSize:11, color:'#94a3b8' }}>
              {ROLE_LABELS[user.role] ?? user.role}
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 20px 24px' }}>

          {/* Info rows */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
            <InfoRow icon={<Mail size={13}/>}   label="Email"  value={user.email ?? '—'} />
            <InfoRow icon={<Shield size={13}/>} label="Rol"    value={ROLE_LABELS[user.role] ?? user.role} />
            <InfoRow icon={<User size={13}/>}   label="Iniciales" value={initials} />
          </div>

          {/* Color picker */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
              <Palette size={13} color="#64748b"/>
              <span style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Color de avatar</span>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width:32, height:32, borderRadius:'50%', background:c, border:'none', cursor:'pointer',
                    boxShadow: color===c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                    transform: color===c ? 'scale(1.1)' : 'scale(1)',
                    transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center',
                  }}
                >
                  {color===c && <Check size={14} color="#fff" strokeWidth={3}/>}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={color === savedColor}
            style={{
              width:'100%', padding:'10px', borderRadius:9, border:'none', cursor: color===savedColor?'default':'pointer',
              background: saved ? '#059669' : color===savedColor ? '#f1f5f9' : '#0f172a',
              color: saved ? '#fff' : color===savedColor ? '#94a3b8' : '#fff',
              fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              transition:'all .2s',
            }}
          >
            {saved ? <><Check size={14}/> Guardado</> : 'Guardar cambios'}
          </button>

          <p style={{ margin:'12px 0 0', fontSize:10, color:'#94a3b8', textAlign:'center' }}>
            Nombre y email provienen de tu cuenta de acceso
          </p>
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', background:'#f8fafc', borderRadius:8 }}>
      <span style={{ color:'#94a3b8', flexShrink:0 }}>{icon}</span>
      <span style={{ fontSize:11, color:'#94a3b8', width:64, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:12, color:'#374151', fontWeight:500 }}>{value}</span>
    </div>
  );
}
