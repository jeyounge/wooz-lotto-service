import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { LottoService } from './utils/LottoService'
import initialLottoHistory from './data/lottoHistory.json'
import { ResultProcessor } from './utils/ResultProcessor'

// Pages
import Home from './pages/Home'
import MyPage from './pages/MyPage'

import './App.css'

function App() {
  // --- Auth State ---
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)

  // --- State: Official Past Draws (Global Data) ---
  const [pastDraws, setPastDraws] = useState(() => {
     // 1. Check Cache
     const cached = localStorage.getItem('officialDrawsCache');
     const cachedDraws = cached ? JSON.parse(cached) : [];
     // 2. Merge
     const cachedIds = new Set(cachedDraws.map(d => d.drwNo));
     const filteredInitial = initialLottoHistory.filter(d => !cachedIds.has(d.drwNo));
     // 3. Sort
     return [...cachedDraws, ...filteredInitial].sort((a,b) => b.drwNo - a.drwNo);
  });

  // --- Auth Effect ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', userId)
      .single()
    
    if (data) {
        setUserProfile(data)
    } else {
        // Heal: Create if missing
        // Use email username as default nickname since we don't have the original input
        const user = (await supabase.auth.getUser()).data.user;
        const defaultNick = user?.email?.split('@')[0] || 'User';
        
        const { error: insertErr } = await supabase
            .from('profiles')
            .insert([{ id: userId, nickname: defaultNick }]);
        
        if (!insertErr) {
            setUserProfile({ nickname: defaultNick });
            console.log('Profile auto-created for existing user.');
        } else {
            console.error('Failed to auto-create profile:', insertErr);
        }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    alert('로그아웃 되었습니다.')
  }



  // --- Auto-Update Official Draws ---
  useEffect(() => {
      const checkForUpdates = async () => {
          const currentLatestDraw = pastDraws.length > 0 ? pastDraws[0].drwNo : 0;
          const neededRound = LottoService.checkUpdateNeeded(currentLatestDraw);

          if (neededRound) {
              console.log(`Getting update for round ${neededRound}...`);
              const newDrawRecord = await LottoService.fetchRound(neededRound);
              
              if (newDrawRecord) {
                  setPastDraws(prev => {
                      const updated = [newDrawRecord, ...prev].sort((a,b) => b.drwNo - a.drwNo);
                      
                      const existingCache = localStorage.getItem('officialDrawsCache');
                      const cacheArr = existingCache ? JSON.parse(existingCache) : [];
                      
                      if (!cacheArr.find(d => d.drwNo === newDrawRecord.drwNo)) {
                          const newCache = [newDrawRecord, ...cacheArr];
                          localStorage.setItem('officialDrawsCache', JSON.stringify(newCache));
                      }
                      return updated;
                  });
                  console.log(`Round ${newDrawRecord.drwNo} updated!`);
              }
          }

          // Background Job: Process pending results for crowd-sourced updates
          // Run slightly delayed to not block UI hydration
          setTimeout(() => {
             ResultProcessor.processPending(supabase);
          }, 3000);
      };
      checkForUpdates();
  }, []);

  return (
    <BrowserRouter>
      <div className="app-container" style={{ display: 'block' /* Reset flex for router outlet */ }}>
        <Routes>
          <Route path="/" element={
            <Home 
              session={session}
              userProfile={userProfile}
              pastDraws={pastDraws}
              handleLogout={handleLogout}
            />
          } />
          
          <Route path="/mypage" element={
            <MyPage 
               session={session}
               pastDraws={pastDraws}
               handleLogout={handleLogout}
            />
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
