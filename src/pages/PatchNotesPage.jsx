import { patchNotes, typeConfig } from '../data/patchNotes';
import { useNavigate } from 'react-router-dom';

export default function PatchNotesPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', padding: '80px 20px 40px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '16px', padding: 0 }}>
            ← 홈으로 돌아가기
          </button>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 8px' }}>📋 패치노트</h1>
          <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>로또 Z 업데이트 내역을 투명하게 공개합니다.</p>
        </div>

        {/* Patch list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {patchNotes.map((note) => {
            const cfg = typeConfig[note.type] || typeConfig.feature;
            return (
              <div key={note.version} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#ffd700' }}>{note.version}</span>
                  <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}`, borderRadius: '20px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {cfg.label}
                  </span>
                  <span style={{ color: '#555', fontSize: '0.8rem', marginLeft: 'auto' }}>{note.date}</span>
                </div>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', color: '#fff' }}>{note.title}</h3>
                <ul style={{ margin: 0, padding: '0 0 0 18px', color: '#aaa', fontSize: '0.88rem', lineHeight: '1.8' }}>
                  {note.changes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
