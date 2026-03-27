import React from 'react';
import { useNavigate } from 'react-router-dom';
import { articles } from '../data/articles';
import '../App.css'; // Assuming we reuse some global styles

export default function ArticlesPage() {
    const navigate = useNavigate();

    return (
        <div className="home-layout" style={{ minHeight: '100vh', flexDirection: 'column', alignItems: 'center' }}>
            <main className="main-board" style={{ maxWidth: '800px', width: '100%', margin: '40px auto' }}>
                <header className="main-header" style={{ marginBottom: '30px', textAlign: 'center' }}>
                    <h1 className="glow-title" style={{ fontSize: '2.5rem' }}>로또/AI 분석 칼럼</h1>
                    <p style={{ color: '#aaa', marginTop: '10px' }}>
                        Z-Labs 데이터 사이언스 팀이 제공하는 심층 분석 리포트와 확률 통계 가이드입니다.
                        단순한 운을 넘어 데이터의 흐름을 읽으세요.
                    </p>
                </header>

                <div className="articles-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {articles.map((article) => (
                        <article
                            key={article.id}
                            onClick={() => navigate('/articles/' + article.id)}
                            className="article-card fade-in"
                            style={{
                                background: '#1e1e1e',
                                border: '1px solid #333',
                                borderRadius: '12px',
                                padding: '25px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff4d4d'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ color: '#ff4d4d', fontSize: '0.85rem', fontWeight: 'bold' }}>{article.category}</span>
                                <span style={{ color: '#666', fontSize: '0.85rem' }}>{article.date}</span>
                            </div>
                            <h2 style={{ color: '#fff', fontSize: '1.3rem', margin: '0 0 15px 0', lineHeight: '1.4' }}>
                                {article.title}
                            </h2>
                            <p style={{ color: '#999', fontSize: '0.95rem', margin: 0, lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {article.content.replace(/#/g, '').substring(0, 150)}...
                            </p>
                            <div style={{ marginTop: '20px', color: '#0575e6', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                리포트 전문 읽기 &rarr;
                            </div>
                        </article>
                    ))}
                </div>

                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <button onClick={() => navigate('/')} className="btn-predict-outline" style={{ padding: '10px 20px', fontSize: '1rem' }}>
                        홈으로 돌아가기
                    </button>
                </div>
            </main>
        </div>
    );
}
