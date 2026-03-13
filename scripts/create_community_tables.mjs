// Supabase에 커뮤니티 테이블 생성
// Usage: node scripts/create_community_tables.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim()))
);

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

// Test connection by checking if community_posts already exists
const { data, error } = await supabase.from('community_posts').select('id').limit(1);

if (error && error.code === '42P01') {
  console.log('❌ community_posts 테이블이 없습니다.');
  console.log('\n👉 Supabase 대시보드 > SQL Editor 에서 아래 SQL을 실행하세요:');
  console.log('\n' + fs.readFileSync('./scripts/create_community_tables.sql', 'utf-8'));
} else if (error) {
  console.log('❌ 연결 오류:', error.message);
} else {
  console.log('✅ community_posts 테이블이 이미 존재합니다! 게시판 사용 가능합니다.');
}
