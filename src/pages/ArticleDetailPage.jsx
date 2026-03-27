import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articles } from '../data/articles';
import '../App.css';

export default function ArticleDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const article = articles.find(a => a.id === parseInt(id));

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    if (!article) {
        return (
            <div className="home-layout" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
                <h2 style={{ color: '#fff' }}>칼럼을 찾을 수 없습니다.</h2>
                <button onClick={() => navigate('/articles')} className="btn-predict-outline" style={{ marginTop: '20px' }}>
                    목록으로 돌아가기
                </button>
            </div>
        );
    }

    // A simple markdown to HTML parser for our articles
    const renderContent = (text) => {
        return text.split('\\n').map((line, index) => {
            if (line.startsWith('## ')) {
                return <h3 key={index} style={{ color: '#ffd700', fontSize: '1.3rem', marginTop: '30px', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>{line.replace('## ', '')}</h3>;
            } else if (line.startsWith('# ')) {
                return null; // Will use title instead
            } else if (line.trim() === '') {
                return <br key={index} />;
            } else if (line.startsWith('- ')) {
                return <li key={index} style={{ color: '#ccc', marginLeft: '20px', marginBottom: '8px', lineHeight: '1.7' }}>{line.replace('- ', '')}</li>;
            } else {
                return <p key={index} style={{ color: '#ddd', fontSize: '1.05rem', lineHeight: '1.8', margin: '0 0 15px 0', wordBreak: 'keep-all' }}>{line}</p>;
            }
        });
    };

    return (
        <div className="home-layout" style={{ minHeight: '100vh', flexDirection: 'column', alignItems: 'center' }}>
            <main className="main-board" style={{ maxWidth: '800px', width: '100%', margin: '40px auto', background: '#1c1c1c', padding: '40px', borderRadius: '16px', border: '1px solid #333' }}>

                <button onClick={() => navigate('/articles')} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', marginBottom: '30px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    &larr; 칼럼 목록으로
                </button>

                <article className="fade-in">
                    <header style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                            <span style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid rgba(255,77,77,0.3)' }}>
                                {article.category}
                            </span>
                            <span style={{ color: '#888', fontSize: '0.9rem' }}>{article.date}</span>
                        </div>
                        <h1 style={{ color: '#fff', fontSize: '2.2rem', lineHeight: '1.3', margin: 0, wordBreak: 'keep-all' }}>
                            {article.title}
                        </h1>
                    </header>

                    <div className="article-body" style={{ color: '#ddd' }}>
                        {renderContent(article.content)}
                    </div>
                </article>

                <div style={{ marginTop: '60px', paddingTop: '30px', borderTop: '1px solid #333', textAlign: 'center' }}>
                    <p style={{ color: '#888', marginBottom: '20px', fontSize: '0.9rem' }}>유익한 정보가 되셨나요? 로또 Z 시스템을 직접 체험해보세요.</p>
                    <button onClick={() => navigate('/')} className="btn-predict-outline" style={{ padding: '15px 30px', fontSize: '1.1rem', backgroundColor: 'rgba(5, 117, 230, 0.1)' }}>
                        🚀 AI 로또 번호 예측하러 가기
                    </button>
                </div>

            </main>
        </div>
    );
}
