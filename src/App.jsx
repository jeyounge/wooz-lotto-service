import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { LottoService } from './utils/LottoService'
import initialLottoHistory from './data/lottoHistory.json'
import { ResultProcessor } from './utils/ResultProcessor'

const JSON_LATEST_ROUND = initialLottoHistory.reduce((m, r) => Math.max(m, r.drwNo), 0)

// Pages
import Home from './pages/Home'
import MyPage from './pages/MyPage'
import RoundResult from './pages/RoundResult'
import InquiryPage from './pages/InquiryPage'
import CommunityListPage from './pages/CommunityListPage'
import CommunityWritePage from './pages/CommunityWritePage'
import CommunityDetailPage from './pages/CommunityDetailPage'
import PatchNotesPage from './pages/PatchNotesPage'
import ArticlesPage from './pages/ArticlesPage'
import ArticleDetailPage from './pages/ArticleDetailPage'
import GuidePage from './pages/GuidePage'
import ToolsPage from './pages/ToolsPage'

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
  // The engine reads the full draw history, so a missing round silently skews it.
  // Pull every DB round newer than the bundled JSON, then fetch any round still missing
  // (the old code fetched only the single "expected" round and left 1228~1235 out).
  useEffect(() => {
    const mergeDraws = (prev, incoming) => {
      if (!incoming.length) return prev;
      const ids = new Set(incoming.map(d => d.drwNo));
      return [...incoming, ...prev.filter(d => !ids.has(d.drwNo))].sort((a, b) => b.drwNo - a.drwNo);
    };

    const syncRoundToDb = async (r) => {
      try {
        const { error } = await supabase.from('lotto_history').upsert({
          drw_no: r.drwNo,
          drw_date: r.drwNoDate,
          numbers: r.numbers,
          bonus: r.bonus,
          first_win_amnt: r.firstWinamnt,
          first_przwner_co: r.firstPrzwnerCo,
          second_win_amnt: r.secondWinAmnt,
          second_przwner_co: r.secondPrzwnerCo,
          third_win_amnt: r.thirdWinAmnt,
          third_przwner_co: r.thirdPrzwnerCo,
          fourth_win_amnt: r.fourthWinAmnt,
          fourth_przwner_co: r.fourthPrzwnerCo,
          fifth_win_amnt: r.fifthWinAmnt,
          fifth_przwner_co: r.fifthPrzwnerCo,
        }, { onConflict: 'drw_no' });
        if (error) console.error('Failed to sync round to DB:', error);
      } catch (err) {
        console.error('DB Sync Exception:', err);
      }
    };

    const checkForUpdates = async () => {
      let working = [...initialLottoHistory];

      // 1. DB rounds newer than the bundled JSON (+ the last few JSON rounds for late prize data)
      try {
        const { data: dbRounds, error: dbErr } = await supabase
          .from('lotto_history')
          .select('drw_no, drw_date, numbers, bonus, first_win_amnt, first_przwner_co, second_win_amnt, second_przwner_co, third_win_amnt, third_przwner_co, fourth_win_amnt, fourth_przwner_co, fifth_win_amnt, fifth_przwner_co')
          .gte('drw_no', JSON_LATEST_ROUND - 4)
          .order('drw_no', { ascending: false })
          .limit(300);

        if (!dbErr && dbRounds && dbRounds.length > 0) {
          const mapped = dbRounds
            .filter(r => Array.isArray(r.numbers) && r.numbers.length === 6)
            .map(r => ({
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
          working = mergeDraws(working, mapped);
          setPastDraws(prev => mergeDraws(prev, mapped));
        }
      } catch (e) {
        console.warn('[DB] Could not fetch lotto_history:', e);
      }

      // 2. Missing rounds: gaps in the last 60 rounds + the newly expected round
      const latestKnownRound = working.reduce((m, r) => Math.max(m, r.drwNo), 0);
      const have = new Set(working.map(r => r.drwNo));
      const wanted = [];
      for (let n = Math.max(1, latestKnownRound - 60); n < latestKnownRound; n++) {
        if (!have.has(n)) wanted.push(n);
      }
      const expectedRound = LottoService.checkUpdateNeeded(latestKnownRound, working);
      if (expectedRound && !wanted.includes(expectedRound)) wanted.push(expectedRound);

      const fetched = [];
      for (const n of wanted.slice(0, 30)) {
        const rec = await LottoService.fetchRound(n);
        if (rec) {
          fetched.push(rec);
          await syncRoundToDb(rec);
        }
      }
      if (fetched.length > 0) setPastDraws(prev => mergeDraws(prev, fetched));

      // Background Job: Process pending results
      setTimeout(() => ResultProcessor.processPending(supabase), 3000);
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

          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/articles/:id" element={<ArticleDetailPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/tools" element={<ToolsPage pastDraws={pastDraws} />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
