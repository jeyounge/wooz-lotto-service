import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function CommunityDetailPage({ session, userProfile }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPost();
    fetchComments();
    incrementView();
  }, [id]);

  const fetchPost = async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();
    setPost(data);
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  const incrementView = async () => {
    await supabase.rpc('increment_view', { post_id: id }).catch(() => {});
    // Fallback: direct update if rpc not set up
    await supabase.from('community_posts').update({ view_count: supabase.raw?.('view_count + 1') }).eq('id', id).catch(() => {});
  };

  const handleDeletePost = async () => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return;
    await supabase.from('community_posts').update({ is_deleted: true }).eq('id', id);
    navigate('/community');
  };

  const handleAddComment = async () => {
    if (!session) { alert('로그인 후 댓글을 작성할 수 있습니다.'); return; }
    if (!commentText.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('community_comments').insert({
      post_id: id,
      user_id: session.user.id,
      nickname: userProfile?.nickname || session.user.email?.split('@')[0] || '익명',
      content: commentText.trim(),
    });

    if (!error) {
      setCommentText('');
      fetchComments();
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    await supabase.from('community_comments').update({ is_deleted: true }).eq('id', commentId);
    fetchComments();
  };

  const formatDate = (iso) => new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>불러오는 중...</div>;
  if (!post) return <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>게시글을 찾을 수 없습니다.</div>;

  const isOwner = session?.user?.id === post.user_id;

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', padding: '80px 20px 60px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '20px', padding: 0 }}>
          ← 게시판으로
        </button>

        {/* Post */}
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 12px' }}>{post.title}</h2>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#666', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #2a2a2a' }}>
            <span>✍️ {post.nickname}</span>
            <span>👁 {post.view_count}</span>
            <span style={{ marginLeft: 'auto' }}>{formatDate(post.created_at)}</span>
            {isOwner && (
              <button onClick={handleDeletePost} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}>삭제</button>
            )}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', color: '#ddd', fontSize: '0.95rem' }}>{post.content}</div>
        </div>

        {/* Comments */}
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', margin: '0 0 16px', color: '#aaa' }}>💬 댓글 {comments.length}개</h3>

          {comments.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>첫 댓글을 남겨보세요!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {comments.map(c => (
                <div key={c.id} style={{ padding: '12px', background: '#111', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.78rem', color: '#666', marginBottom: '6px' }}>
                    <span style={{ color: '#aaa', fontWeight: 'bold' }}>{c.nickname}</span>
                    <span>{formatDate(c.created_at)}</span>
                    {session?.user?.id === c.user_id && (
                      <button onClick={() => handleDeleteComment(c.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>삭제</button>
                    )}
                  </div>
                  <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{c.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <textarea
              placeholder={session ? '댓글을 입력하세요...' : '로그인 후 댓글을 작성할 수 있습니다'}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              disabled={!session}
              rows={2}
              maxLength={500}
              style={{ flex: 1, background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
            />
            <button
              onClick={handleAddComment}
              disabled={submitting || !session || !commentText.trim()}
              style={{ background: 'linear-gradient(135deg, #0575e6, #00f260)', border: 'none', color: '#fff', padding: '0 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: (!session || !commentText.trim()) ? 0.4 : 1, whiteSpace: 'nowrap' }}
            >
              등록
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
