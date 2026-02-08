import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        
        // Manual Profile Creation (Reliable backup for Trigger)
        if (data?.user) {
            const { error: profileError } = await supabase

                .from('profiles')
                .upsert(
                    [{ id: data.user.id, nickname: nickname }], 
                    { onConflict: 'id' } // If ID exists, update nickname
                );
            
            if (profileError) {
                console.error('Profile creation failed:', profileError);
                alert('프로필 생성 실패 오류: ' + profileError.message);
            } else {
                console.log('Profile created successfully');
                if (onLoginSuccess) {
                    // Small delay to ensure DB propagation
                    setTimeout(() => onLoginSuccess(), 500);
                }
            }
        }

        alert('회원가입 성공! 자동 로그인됩니다.')
      } else {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        // onLogin will be handled by onAuthStateChange in App
      }
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container" style={{ padding: '20px', border: '1px solid #333', borderRadius: '12px', background: '#1a1a1a', maxWidth: '300px', margin: '0 auto 20px' }}>
      <h3 style={{ color: '#fff', marginTop: 0 }}>{isSignUp ? '회원가입' : '로그인'}</h3>
      <p style={{ color: '#888', fontSize: '12px' }}>로그인하면 예측 기록이 영구 저장됩니다.</p>
      
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#333', color: 'white' }}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#333', color: 'white' }}
        />
        
        {isSignUp && (
          <input
            type="text"
            placeholder="닉네임 (2글자 이상)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required // Required only for signup
            minLength={2}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#333', color: 'white' }}
          />
        )}

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '12px', 
            borderRadius: '8px', 
            border: 'none', 
            background: 'linear-gradient(135deg, #00f260 0%, #0575e6 100%)', 
            color: 'white', 
            fontWeight: 'bold',
            cursor: loading ? 'wait' : 'pointer'
          }}
        >
          {loading ? '처리 중...' : (isSignUp ? '가입하기' : '로그인')}
        </button>
      </form>

      <button 
        onClick={() => setIsSignUp(!isSignUp)}
        style={{ marginTop: '10px', background: 'transparent', border: 'none', color: '#aaa', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px' }}
      >
        {isSignUp ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 회원가입'}
      </button>
    </div>
  )
}
