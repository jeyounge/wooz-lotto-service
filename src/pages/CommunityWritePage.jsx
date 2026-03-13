import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function CommunityWritePage({ session, userProfile }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#888', marginBottom: '16px' }}>로그인 후 글을 작성할 수 있습니다.</p>
          <button onClick={() => navigate('/community')} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!content.trim()) { setError('내용을 입력해주세요.'); return; }
    if (content.trim().length < 5) { setError('내용을 5자 이상 입력해주세요.'); return; }

    setSubmitting(true);
    setError('');

    const { data, error: insertError } = await supabase
      .from('community_posts')
      .insert({
        user_id: session.user.id,
        nickname: userProfile?.nickname || session.user.email?.split('@')[0] || '익명',
        title: title.trim(),
        content: content.trim(),
      })
      .select('id')
      .single();

    setSubmitting(false);
    if (insertError) {
      setError('글 작성 중 오류가 발생했습니다.');
      console.error(insertError);
    } else {
      navigate(`/community/${data.id}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', padding: '80px 20px 40px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '20px', padding: 0 }}>
          ← 게시판으로
        </button>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold', marginBottom: '24px' }}>✏️ 글쓰기</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '14px 16px', color: '#fff', fontSize: '1rem', outline: 'none' }}
          />

          <textarea
            placeholder="내용을 입력하세요 (구매 인증, 번호 분석, 후기 등 자유롭게)"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={12}
            maxLength={2000}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '14px 16px', color: '#fff', fontSize: '0.95rem', outline: 'none', resize: 'vertical', lineHeight: '1.6' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: error ? '#ff6b6b' : '#555', fontSize: '0.85rem' }}>
              {error || `${content.length} / 2000자`}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => navigate('/community')} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ background: 'linear-gradient(135deg, #0575e6, #00f260)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
