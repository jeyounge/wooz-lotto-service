import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import '../App.css'; // Inherit global styles (pretendard, colors)

export default function InquiryPage() {
    const form = useRef();
    const navigate = useNavigate();
    const [status, setStatus] = useState('idle');

    const sendEmail = (e) => {
        e.preventDefault();
        setStatus('sending');

        // Add Service Name to subject
        const currentSubject = form.current.subject.value;
        form.current.subject.value = `[Lotto Z] ${currentSubject}`;

        emailjs.sendForm('service_2vjma3d', 'template_eozapdl', form.current, 'cZQf4Tev6rhPpsGcI')
            .then((result) => {
                setStatus('success');
                form.current.reset();
            }, (error) => {
                console.log(error.text);
                setStatus('error');
            });
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#eee', padding: '20px', fontFamily: 'Pretendard, sans-serif' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                    <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '10px', marginRight: '10px' }}>
                        ←
                    </button>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #fff 0%, #aaa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        1:1 문의센터
                    </h1>
                </div>

                {status === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ width: '60px', height: '60px', background: 'rgba(0, 242, 96, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#00f260', fontSize: '1.5rem' }}>
                            ✓
                        </div>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>문의가 정상적으로 접수되었습니다.</h2>
                        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '30px' }}>
                            검토 후 입력하신 이메일로<br/>빠르게 답변 드리겠습니다.
                        </p>
                        <button 
                            onClick={() => setStatus('idle')}
                            style={{ width: '100%', padding: '15px', borderRadius: '12px', background: '#333', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            추가 문의하기
                        </button>
                    </div>
                ) : (
                    <form ref={form} onSubmit={sendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ padding: '15px', background: 'rgba(5, 117, 230, 0.1)', border: '1px solid rgba(5, 117, 230, 0.3)', borderRadius: '12px', fontSize: '0.9rem', color: '#aabbee', lineHeight: '1.5' }}>
                            💡 <strong>Lotto Z</strong>를 이용해주셔서 감사합니다.<br/>
                            서비스 제안, 오류 신고 등 어떤 의견이든 환영합니다.
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#888' }}>문의 유형</label>
                            <select name="category" required style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#222', border: '1px solid #444', color: '#fff', outline: 'none' }}>
                                <option value="제휴문의">🤝 제휴/협업 문의</option>
                                <option value="오류신고">🛠 서비스 오류 신고</option>
                                <option value="기능제안">✨ 새로운 기능 제안</option>
                                <option value="기타">💬 기타</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#888' }}>이메일</label>
                            <input 
                                type="email" 
                                name="user_email" 
                                placeholder="답변 받을 이메일 주소"
                                required 
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#222', border: '1px solid #444', color: '#fff', outline: 'none' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#888' }}>제목</label>
                            <input 
                                type="text" 
                                name="subject" 
                                placeholder="제목을 입력하세요"
                                required 
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#222', border: '1px solid #444', color: '#fff', outline: 'none' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#888' }}>내용</label>
                            <textarea 
                                name="message" 
                                rows="5"
                                placeholder="문의 내용을 상세히 적어주세요."
                                required 
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#222', border: '1px solid #444', color: '#fff', outline: 'none', resize: 'none' }}
                            ></textarea>
                        </div>

                        <button 
                            type="submit" 
                            disabled={status === 'sending'}
                            style={{ 
                                width: '100%', 
                                padding: '16px', 
                                borderRadius: '12px', 
                                background: status === 'sending' ? '#444' : 'linear-gradient(135deg, #0575e6, #021b79)', 
                                color: '#fff', 
                                border: 'none', 
                                cursor: status === 'sending' ? 'not-allowed' : 'pointer', 
                                fontWeight: 'bold', 
                                fontSize: '1rem',
                                marginTop: '10px',
                                boxShadow: '0 4px 15px rgba(5, 117, 230, 0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {status === 'sending' ? '전송 중...' : '문의하기'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
