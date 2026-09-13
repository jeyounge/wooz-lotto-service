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

    // Minimal markdown renderer for articles: ## headings, paragraphs, - and 1. lists, > quotes, | tables |, **bold**.
    // (The previous version split on a literal backslash-n, so every article rendered as one paragraph.)
    const renderInline = (text, keyPrefix) =>
        text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
            part.startsWith('**') && part.endsWith('**') && part.length > 4
                ? <strong key={keyPrefix + '-' + i} style={{ color: '#fff' }}>{part.slice(2, -2)}</strong>
                : part
        );

    const renderContent = (text) => {
        const lines = text.split(/\r?\n/);
        const blocks = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('# ')) continue;

            if (line.startsWith('|')) {
                const rows = [];
                const startIndex = i;
                while (i < lines.length && lines[i].trim().startsWith('|')) {
                    const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
                    if (!cells.every(c => /^:?-{3,}:?$/.test(c))) rows.push(cells);
                    i++;
                }
                i--;
                const [head = [], ...body] = rows;
                blocks.push(
                    <div key={'t' + startIndex} style={{ overflowX: 'auto', margin: '0 0 20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ddd', fontSize: '0.95rem' }}>
                            <thead>
                                <tr>{head.map((c, j) => <th key={j} style={{ borderBottom: '1px solid #555', padding: '8px', textAlign: 'left', color: '#aaa' }}>{renderInline(c, startIndex + 'h' + j)}</th>)}</tr>
                            </thead>
                            <tbody>
                                {body.map((r, k) => (
                                    <tr key={k}>{r.map((c, j) => <td key={j} style={{ borderBottom: '1px solid #2a2a2a', padding: '8px' }}>{renderInline(c, startIndex + '-' + k + '-' + j)}</td>)}</tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            } else if (line.startsWith('## ')) {
                blocks.push(<h3 key={i} style={{ color: '#ffd700', fontSize: '1.3rem', marginTop: '30px', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>{line.slice(3)}</h3>);
            } else if (line.startsWith('- ') || /^\d+\.\s/.test(line)) {
                const isBullet = line.startsWith('- ');
                blocks.push(<li key={i} style={{ color: '#ccc', marginLeft: '20px', marginBottom: '8px', lineHeight: '1.7', listStyle: isBullet ? 'disc' : 'none' }}>{renderInline(isBullet ? line.slice(2) : line, i)}</li>);
            } else if (line.startsWith('> ')) {
                blocks.push(<blockquote key={i} style={{ margin: '0 0 20px', padding: '12px 16px', borderLeft: '3px solid #00f260', background: 'rgba(0, 242, 96, 0.06)', color: '#ddd', lineHeight: '1.7' }}>{renderInline(line.slice(2), i)}</blockquote>);
            } else {
                blocks.push(<p key={i} style={{ color: '#ddd', fontSize: '1.05rem', lineHeight: '1.8', margin: '0 0 15px 0', wordBreak: 'keep-all' }}>{renderInline(line, i)}</p>);
            }
        }
        return blocks;
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
                        🎯 비인기 조합 만들러 가기
                    </button>
                </div>

            </main>
        </div>
    );
}
