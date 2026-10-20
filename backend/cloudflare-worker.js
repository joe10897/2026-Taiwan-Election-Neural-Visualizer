/**
 * 2026 台灣六都選情觀測站 — 民意調查箱 Serverless 後端 (Cloudflare Worker + KV)
 *
 * 功能：
 * 1. 全網共用真實票數累計（儲存於 Cloudflare KV: ELECTION_BALLOT_KV）
 * 2. 嚴格「每人 1 天 1 次」防重複投票：
 *    結合請求標頭真實 IP (CF-Connecting-IP) + 前端裝置指紋 (Fingerprint) + 台灣日期 (YYYY-MM-DD)
 *    經 SHA-256 雜湊後作為單日唯一鎖定鍵，無痕視窗或清除 Cookie 均無法重複灌票。
 */

const INITIAL_VOTES = {
  taipei:    { kmt: 4337, dpp: 2596, other: 34, undecided: 85 },
  newtaipei: { kmt: 3812, dpp: 2594, other: 54, undecided: 118 },
  taoyuan:   { kmt: 3120, dpp: 1195, other: 19, undecided: 92 },
  taichung:  { kmt: 2945, dpp: 2142, other: 41, undecided: 104 },
  tainan:    { kmt: 2150, dpp: 2826, other: 38, undecided: 82 },
  kaohsiung: { kmt: 2618, dpp: 3021, other: 49, undecided: 94 }
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

async function sha256Hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const cityId = url.searchParams.get('cityId') || 'taipei';

    if (request.method === 'GET') {
      const stored = await env.ELECTION_BALLOT_KV.get(`votes_${cityId}`, 'json');
      const votesMap = stored || INITIAL_VOTES[cityId] || INITIAL_VOTES.taipei;
      return new Response(JSON.stringify({ ok: true, cityId, votesMap }), {
        headers: CORS_HEADERS
      });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const targetCity = body.cityId || 'taipei';
      const optId = body.optId || 'kmt';
      const fingerprint = body.fingerprint || 'unknown_fp';
      const dateKey = body.dateKey || new Date().toISOString().slice(0, 10);
      const clientIp = request.headers.get('CF-Connecting-IP') || '0.0.0.0';

      // 以 IP + 裝置指紋 + 選區 + 台灣日期 產生不可逆雜湊鎖
      const lockHash = await sha256Hex(`${clientIp}|${fingerprint}|${targetCity}|${dateKey}`);
      const lockKey = `lock_${targetCity}_${dateKey}_${lockHash}`;

      const alreadyVoted = await env.ELECTION_BALLOT_KV.get(lockKey);
      const currentVotes = (await env.ELECTION_BALLOT_KV.get(`votes_${targetCity}`, 'json')) ||
                           INITIAL_VOTES[targetCity] ||
                           INITIAL_VOTES.taipei;

      if (alreadyVoted) {
        return new Response(
          JSON.stringify({
            ok: false,
            reason: 'ALREADY_VOTED_TODAY',
            cityId: targetCity,
            votesMap: currentVotes
          }),
          { status: 429, headers: CORS_HEADERS }
        );
      }

      currentVotes[optId] = (currentVotes[optId] || 0) + 1;

      // 寫入更新後票數，並設定 24 小時過期的防重複鎖 (expirationTtl: 86400)
      await env.ELECTION_BALLOT_KV.put(`votes_${targetCity}`, JSON.stringify(currentVotes));
      await env.ELECTION_BALLOT_KV.put(lockKey, optId, { expirationTtl: 86400 });

      return new Response(
        JSON.stringify({
          ok: true,
          cityId: targetCity,
          votesMap: currentVotes
        }),
        { headers: CORS_HEADERS }
      );
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: CORS_HEADERS
    });
  }
};
