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

import './App.css'

function App() {
  // --- Auth State ---
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)

  // --- State: Official Past Draws (Global Data) ---
  const [pastDraws, setPastDraws] = useState(() => {
    console.warn("Forcibly wiping local cache to normalize state");
    localStorage.removeItem('officialDrawsCache_v3');

    // Sort and return only the static base data.
    // The real DB sync will happen immediately in the useEffect below.
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
      // 1. First, try to sync recent rounds from DB (source of truth)
      try {
        const { data: dbRounds, error: dbErr } = await supabase
          .from('lotto_history')
          .select('drw_no, drw_no_date, numbers, bonus, first_win_amnt, first_przwner_co, second_win_amnt, second_przwner_co, third_win_amnt, third_przwner_co, fourth_win_amnt, fourth_przwner_co, fifth_win_amnt, fifth_przwner_co')
          .order('drw_no', { ascending: false })
          .limit(5);

        if (!dbErr && dbRounds && dbRounds.length > 0) {
          // Convert snake_case DB fields to camelCase for frontend
          const mappedRounds = dbRounds.map(r => ({
            drwNo: r.drw_no,
            drwNoDate: r.drw_no_date,
            numbers: r.numbers,
            bonus: r.bonus,
            firstWinamnt: r.first_win_amnt,
            firstPrzwnerCo: r.first_przwner_co,
            secondWinamnt: r.second_win_amnt,
            secondPrzwnerCo: r.second_przwner_co,
            thirdWinamnt: r.third_win_amnt,
            thirdPrzwnerCo: r.third_przwner_co,
            fourthWinamnt: r.fourth_win_amnt,
            fourthPrzwnerCo: r.fourth_przwner_co,
            fifthWinamnt: r.fifth_win_amnt,
            fifthPrzwnerCo: r.fifth_przwner_co,
          }));

          setPastDraws(prev => {
            const dbHighest = Math.max(...mappedRounds.map(r => r.drwNo));
            const prevHighest = prev.length > 0 ? Math.max(...prev.map(r => r.drwNo)) : 0;

            // CRITICAL MOBILE CACHE FIX: DB is source of truth.
            // If DB knows about a newer round than our local state (localStorage),
            // BURN the local cache and rebuild from scratch.
            if (dbHighest > prevHighest) {
              console.warn(`[Sync] Stale cache detected. DB: ${dbHighest} > Local: ${prevHighest}. Wiping local storage.`);
              localStorage.removeItem('officialDrawsCache_v3');

              const dbIds = new Set(mappedRounds.map(d => d.drwNo));
              const filteredInitial = initialLottoHistory.filter(d => !dbIds.has(d.drwNo));
              return [...mappedRounds, ...filteredInitial].sort((a, b) => b.drwNo - a.drwNo);
            }

            // Normal Merge
            const dbIds = new Set(mappedRounds.map(d => d.drwNo));
            const filtered = prev.filter(d => !dbIds.has(d.drwNo));
            const merged = [...mappedRounds, ...filtered].sort((a, b) => b.drwNo - a.drwNo);

            // ALWAYS update the offline cache so we don't start stale next time
            localStorage.setItem('officialDrawsCache_v3', JSON.stringify(merged));

            return merged;
          });

          console.log('[DB] Synced recent rounds from lotto_history:', mappedRounds.map(r => r.drwNo));
        }
      } catch (e) {
        console.warn('[DB] Could not fetch lotto_history:', e);
      }

      // 2. Check if new round is available from scraping
      const currentLatestDraw = pastDraws.length > 0 ? pastDraws[0].drwNo : 0;
      const neededRound = LottoService.checkUpdateNeeded(currentLatestDraw);

      if (neededRound) {
        console.log(`Getting update for round ${neededRound}...`);
        const newDrawRecord = await LottoService.fetchRound(neededRound);

        if (newDrawRecord) {
          setPastDraws(prev => {
            const updated = [newDrawRecord, ...prev].sort((a, b) => b.drwNo - a.drwNo);

            const existingCache = localStorage.getItem('officialDrawsCache_v3');
            const cacheArr = existingCache ? JSON.parse(existingCache) : [];

            if (!cacheArr.find(d => d.drwNo === newDrawRecord.drwNo)) {
              const newCache = [newDrawRecord, ...cacheArr];
              localStorage.setItem('officialDrawsCache_v3', JSON.stringify(newCache));
            }
            return updated;
          });
          console.log(`Round ${newDrawRecord.drwNo} updated!`);

          // SYNC to DB
          try {
            const dbPayload = {
              drw_no: newDrawRecord.drwNo,
              drw_no_date: newDrawRecord.drwNoDate,
              numbers: newDrawRecord.numbers,
              bonus: newDrawRecord.bonus,
              first_win_amnt: newDrawRecord.firstWinamnt,
              first_przwner_co: newDrawRecord.firstPrzwnerCo,
              second_win_amnt: newDrawRecord.secondWinamnt,
              second_przwner_co: newDrawRecord.secondPrzwnerCo,
              third_win_amnt: newDrawRecord.thirdWinamnt,
              third_przwner_co: newDrawRecord.thirdPrzwnerCo,
              fourth_win_amnt: newDrawRecord.fourthWinamnt,
              fourth_przwner_co: newDrawRecord.fourthPrzwnerCo,
              fifth_win_amnt: newDrawRecord.fifthWinamnt,
              fifth_przwner_co: newDrawRecord.fifthPrzwnerCo,
              total_sell_amnt: newDrawRecord.totalSellAmnt,
              first_how: newDrawRecord.firstHow,
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

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
