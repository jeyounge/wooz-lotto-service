import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { LottoService } from './utils/LottoService'
import initialLottoHistory from './data/lottoHistory.json'
import { ResultProcessor } from './utils/ResultProcessor'

// Pages
import Home from './pages/Home'
import MyPage from './pages/MyPage'
import RoundResult from './pages/RoundResult'
import InquiryPage from './pages/InquiryPage'
import CommunityListPage from './pages/CommunityListPage'
import CommunityWritePage from './pages/CommunityWritePage'
import CommunityDetailPage from './pages/CommunityDetailPage'
import PatchNotesPage from './pages/PatchNotesPage'

import './App.css'

function App() {
  // --- Auth State ---
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)

  // --- State: Official Past Draws (Global Data) ---
  const [pastDraws, setPastDraws] = useState(() => {
    // Rely exclusively on initial base data for immediate render,
    // Database sync will immediately overwrite this with fresh data.
    return [...initialLottoHistory].sort((a, b) => b.drwNo - a.drwNo);
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
      let latestKnownRound = pastDraws.length > 0 ? pastDraws[0].drwNo : 0;
      // 1. First, try to sync recent rounds from DB (source of truth)
      try {
        const { data: dbRounds, error: dbErr } = await supabase
          .from('lotto_history')
          .select('drw_no, drw_date, numbers, bonus, first_win_amnt, first_przwner_co, second_win_amnt, second_przwner_co, third_win_amnt, third_przwner_co, fourth_win_amnt, fourth_przwner_co, fifth_win_amnt, fifth_przwner_co')
          .order('drw_no', { ascending: false })
          .limit(5);

        if (!dbErr && dbRounds && dbRounds.length > 0) {
          const dbHighest = Math.max(...dbRounds.map(r => r.drw_no));
          if (dbHighest > latestKnownRound) {
            latestKnownRound = dbHighest;
          }

          // Convert snake_case DB fields to camelCase for frontend
          const mappedRounds = dbRounds.map(r => ({
            drwNo: r.drw_no,
            drwNoDate: r.drw_date || LottoService.getExpectedDate(r.drw_no),
            numbers: r.numbers,
            bonus: r.bonus,
            firstWinamnt: r.first_win_amnt,
            firstPrzwnerCo: r.first_przwner_co,
            secondWinAmnt: r.second_win_amnt,
            secondPrzwnerCo: r.second_przwner_co,
            thirdWinAmnt: r.third_win_amnt,
            thirdPrzwnerCo: r.third_przwner_co,
            fourthWinAmnt: r.fourth_win_amnt,
            fourthPrzwnerCo: r.fourth_przwner_co,
            fifthWinAmnt: r.fifth_win_amnt,
            fifthPrzwnerCo: r.fifth_przwner_co,
          }));

          setPastDraws(prev => {
            // DB is the single source of truth. Normal Merge with initial data
            const dbIds = new Set(mappedRounds.map(d => d.drwNo));
            const filtered = prev.filter(d => !dbIds.has(d.drwNo));
            const merged = [...mappedRounds, ...filtered].sort((a, b) => b.drwNo - a.drwNo);

            return merged;
          });

          console.log('[DB] Synced recent rounds from lotto_history:', mappedRounds.map(r => r.drwNo));
        }
      } catch (e) {
        console.warn('[DB] Could not fetch lotto_history:', e);
      }

      // 2. Check if new round is available from scraping
      const neededRound = LottoService.checkUpdateNeeded(latestKnownRound, pastDraws);

      if (neededRound) {
        console.log(`Getting update for round ${neededRound}...`);
        const newDrawRecord = await LottoService.fetchRound(neededRound);

        if (newDrawRecord) {
          setPastDraws(prev => {
            const cleanPrev = prev.filter(p => p.drwNo !== newDrawRecord.drwNo);
            const updated = [newDrawRecord, ...cleanPrev].sort((a, b) => b.drwNo - a.drwNo);
            return updated;
          });
          console.log(`Round ${newDrawRecord.drwNo} updated!`);

          // SYNC to DB
          try {
            const dbPayload = {
              drw_no: newDrawRecord.drwNo,
              drw_date: newDrawRecord.drwNoDate,
              numbers: newDrawRecord.numbers,
              bonus: newDrawRecord.bonus,
              first_win_amnt: newDrawRecord.firstWinamnt,
              first_przwner_co: newDrawRecord.firstPrzwnerCo,
              second_win_amnt: newDrawRecord.secondWinAmnt,
              second_przwner_co: newDrawRecord.secondPrzwnerCo,
              third_win_amnt: newDrawRecord.thirdWinAmnt,
              third_przwner_co: newDrawRecord.thirdPrzwnerCo,
              fourth_win_amnt: newDrawRecord.fourthWinAmnt,
              fourth_przwner_co: newDrawRecord.fourthPrzwnerCo,
              fifth_win_amnt: newDrawRecord.fifthWinAmnt,
              fifth_przwner_co: newDrawRecord.fifthPrzwnerCo,
              // total_sell_amnt: newDrawRecord.totalSellAmnt, // Removed
              // first_how: newDrawRecord.firstHow, // Removed
            };

            const { error: dbErr } = await supabase
              .from('lotto_history')
              .upsert(dbPayload, { onConflict: 'drw_no' });

            if (dbErr) console.error('Failed to sync round to DB:', dbErr);
            else console.log('Synced round to DB successfully.');
          } catch (syncErr) {
            console.error('DB Sync Exception:', syncErr);
          }
        }
      }

      // Background Job: Process pending results
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
              refreshProfile={() => session && fetchProfile(session.user.id)}
            />
          } />

          <Route path="/mypage" element={
            <MyPage
              session={session}
              pastDraws={pastDraws}
              handleLogout={handleLogout}
            />
          } />

          <Route path="/results" element={
            <RoundResult pastDraws={pastDraws} />
          } />

          <Route path="/inquiry" element={<InquiryPage />} />

          <Route path="/community" element={<CommunityListPage session={session} userProfile={userProfile} />} />
          <Route path="/community/write" element={<CommunityWritePage session={session} userProfile={userProfile} />} />
          <Route path="/community/:id" element={<CommunityDetailPage session={session} userProfile={userProfile} />} />
          <Route path="/patch-notes" element={<PatchNotesPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
