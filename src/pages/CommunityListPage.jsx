import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function CommunityListPage({ session, userProfile }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('community_posts')
      .select('id, title, nickname, created_at, view_count')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);
    setPosts(data || []);
    setLoading(false);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', padding: '80px 20px 40px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Back Button */}
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '16px', padding: 0 }}
        >
          ← 홈으로 돌아가기
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 6px' }}>💬 자유게시판</h1>
            <p style={{ color: '#888', fontSize: '0.88rem', margin: 0 }}>로또 얘기, 구매 인증, 뭐든 자유롭게!</p>
          </div>
          {session ? (
            <button
              onClick={() => navigate('/community/write')}
              style={{ background: 'linear-gradient(135deg, #0575e6, #00f260)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ✏️ 글쓰기
            </button>
          ) : (
            <span style={{ color: '#888', fontSize: '0.85rem' }}>로그인 후 글쓰기 가능</span>
          )}
        </div>

        {/* Post list */}
        <div style={{ background: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#555' }}>불러오는 중...</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#555' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📭</div>
              <p>아직 게시글이 없어요. 첫 번째 글을 작성해보세요!</p>
            </div>
          ) : (
            posts.map((post, idx) => (
              <div
                key={post.id}
                onClick={() => navigate(`/community/${post.id}`)}
                style={{
                  padding: '16px 20px',
                  borderBottom: idx < posts.length - 1 ? '1px solid #222' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#222'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '6px', color: '#eee' }}>
                  {post.title}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#666' }}>
                  <span>✍️ {post.nickname}</span>
                  <span>👁 {post.view_count}</span>
                  <span style={{ marginLeft: 'auto' }}>{formatDate(post.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
