// js/friendChallenges.js — تحدي مباشر بين الأصدقاء (غير متزامن، مش محتاج الاتنين أونلاين)
import { db, APP_ID } from './firebase.js';
import { showToast } from './helpers.js';
import {
  where,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// أسئلة احتياطية لو فشل الجلب من Firestore
const FALLBACK_FC = [
  { t:"ما هي عاصمة فرنسا؟", a:["باريس","ليون","مارسيليا","نيس"], c:0, x:"باريس هي عاصمة فرنسا." },
  { t:"كم عدد لاعبي الفريق في كرة القدم؟", a:["11","10","12","9"], c:0, x:"11 لاعبًا لكل فريق." },
  { t:"ما هو أقرب كوكب إلى الشمس؟", a:["عطارد","الزهرة","الأرض","المريخ"], c:0, x:"عطارد أقرب الكواكب للشمس." },
  { t:"ما هو الرمز الكيميائي للذهب؟", a:["Au","Ag","Gd","Go"], c:0, x:"الرمز الكيميائي للذهب هو Au." },
  { t:"من بنى الهرم الأكبر في الجيزة؟", a:["خوفو","خفرع","منقرع","زوسر"], c:0, x:"الملك خوفو بنى الهرم الأكبر." },
  { t:"ما هي أطول سورة في القرآن الكريم؟", a:["البقرة","آل عمران","النساء","المائدة"], c:0, x:"سورة البقرة أطول سورة في القرآن." },
  { t:"ما هي أعلى قمة جبلية في العالم؟", a:["إفرست","كليمنجارو","إلبروس","ماكينلي"], c:0, x:"قمة إفرست أعلى قمة في العالم." },
  { t:"كم حاصل ضرب 7 في 8؟", a:["56","54","64","49"], c:0, x:"7×8=56." },
  { t:"من أول إنسان مشى على سطح القمر؟", a:["نيل أرمسترونغ","يوري غاغارين","باز ألدرين","جون غلين"], c:0, x:"نيل أرمسترونغ أول من مشى على القمر." },
  { t:"ما هي عاصمة اليابان؟", a:["طوكيو","أوساكا","كيوتو","يوكوهاما"], c:0, x:"طوكيو عاصمة اليابان." },
];

// ══════════════════════════════════════════════════════════════════
// فتح/إغلاق مودال تأكيد تحدي صديق
// ══════════════════════════════════════════════════════════════════
export function openChallengeFriendModal(uid) {
  if (!window.currentUser) { showToast('❌ يجب تسجيل الدخول'); return; }
  const friend = (window.gameData?.friends || []).find(f => f.uid === uid);
  const username = friend?.username || 'صديقك';
  const m = document.getElementById('modal-challenge-friend');
  if (!m) return;
  m.dataset.uid = uid;
  m.dataset.username = username;
  const nameEl = document.getElementById('cf-friend-name');
  if (nameEl) nameEl.innerText = username;
  m.style.display = 'flex';
}
window.openChallengeFriendModal = openChallengeFriendModal;

export function closeChallengeFriendModal() {
  const m = document.getElementById('modal-challenge-friend');
  if (m) m.style.display = 'none';
}
window.closeChallengeFriendModal = closeChallengeFriendModal;

// ══════════════════════════════════════════════════════════════════
// إنشاء وإرسال تحدي لصديق — يبدأ اللعب فورًا للمُتحدي
// ══════════════════════════════════════════════════════════════════
export async function sendFriendChallenge() {
  const m = document.getElementById('modal-challenge-friend');
  if (!m) return;
  const toUid = m.dataset.uid, toName = m.dataset.username;
  if (!window.currentUser) { showToast('❌ يجب تسجيل الدخول'); return; }
  if (toUid === window.currentUser.uid) { showToast('❌ مينفعش تتحدى نفسك!'); return; }

  showToast('⏳ جاري تحضير التحدي...');
  let pool = [];
  try { pool = (await window.fetchQuestions?.('عام', 'عام')) || []; } catch (e) {}
  const qs = (pool.length >= 5 ? pool : FALLBACK_FC).sort(() => 0.5 - Math.random()).slice(0, 10);

  const id = `${window.currentUser.uid}_${Date.now()}`;
  const data = {
    id,
    fromUid: window.currentUser.uid, fromName: window.gameData?.username || 'لاعب',
    toUid, toName,
    questions: qs,
    fromScore: null, fromDone: false,
    toScore: null, toDone: false,
    status: 'pending',
    ts: Date.now(),
  };

  try {
    await window.db_set?.(`artifacts/${APP_ID}/public/data/friend_challenges/${id}`, data, false);
  } catch (e) {
    showToast('❌ فشل إنشاء التحدي — تحقق من الاتصال');
    return;
  }

  closeChallengeFriendModal();
  window.isFriendChallenge   = true;
  window._friendChallengeId  = id;
  window._friendChallengeRole = 'from';
  window.startQuiz?.(`تحدي ضد ${toName}`, 'عام', false, false, false, qs);
}
window.sendFriendChallenge = sendFriendChallenge;

// ══════════════════════════════════════════════════════════════════
// لعب تحدي وصلني من صديق (أو إعادة محاولة نادرة لتحدي أرسلته)
// ══════════════════════════════════════════════════════════════════
export async function playPendingChallenge(id, role) {
  try {
    const snap = await window.db_get?.(`artifacts/${APP_ID}/public/data/friend_challenges/${id}`);
    if (!snap || !snap.exists()) { showToast('❌ التحدي غير موجود'); return; }
    const d = snap.data();
    window.closeModal?.('friend-challenges');
    window.isFriendChallenge    = true;
    window._friendChallengeId   = id;
    window._friendChallengeRole = role;
    const opponentName = role === 'from' ? d.toName : d.fromName;
    window.startQuiz?.(`تحدي ضد ${opponentName}`, 'عام', false, false, false, d.questions);
  } catch (e) { showToast('❌ خطأ في تحميل التحدي'); }
}
window.playPendingChallenge = playPendingChallenge;

// ══════════════════════════════════════════════════════════════════
// عرض قائمة "تحدياتي" (مرسلة + مستلمة + مكتملة)
// ══════════════════════════════════════════════════════════════════
function updateChallengeBadge(count) {
  const badge = document.getElementById('challenges-notif-dot');
  if (badge) badge.classList.toggle('show', count > 0);
}

function _stateBox(emoji, text) {
  return `<div style="text-align:center;padding:40px 16px;color:var(--text2)">
    <div style="font-size:40px;margin-bottom:12px">${emoji}</div>
    <div style="font-size:13px;font-weight:700">${text}</div>
  </div>`;
}

export async function loadMyChallenges() {
  const list = document.getElementById('friend-challenges-list');
  if (!list) return;
  if (!window.currentUser) { list.innerHTML = ''; return; }

  list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text2);font-weight:700;font-size:13px">جاري التحميل...</div>`;

  try {
    const myUid = window.currentUser.uid;
    const base  = `artifacts/${APP_ID}/public/data/friend_challenges`;
    const [sentSnap, receivedSnap] = await Promise.all([
      window.db_query?.(base, where('fromUid', '==', myUid)),
      window.db_query?.(base, where('toUid', '==', myUid)),
    ]);

    const all = [];
    sentSnap?.forEach(d => all.push({ ...d.data(), role: 'from' }));
    receivedSnap?.forEach(d => all.push({ ...d.data(), role: 'to' }));
    all.sort((a, b) => b.ts - a.ts);

    if (!all.length) {
      list.innerHTML = _stateBox('🎯', 'مفيش تحديات لسه — اتحدى صحابك من قائمة الأصدقاء!');
      updateChallengeBadge(0);
      return;
    }

    let pendingCount = 0;
    const cardStyle = `background:var(--card);border:1px solid rgba(255,255,255,.06);border-radius:18px;padding:14px 16px;margin-bottom:10px`;

    list.innerHTML = all.map(c => {
      const myDone  = c.role === 'from' ? c.fromDone  : c.toDone;
      const myScore = c.role === 'from' ? c.fromScore : c.toScore;
      const oppDone  = c.role === 'from' ? c.toDone   : c.fromDone;
      const oppScore = c.role === 'from' ? c.toScore  : c.fromScore;
      const oppName  = c.role === 'from' ? c.toName   : c.fromName;

      if (!myDone) {
        pendingCount++;
        return `<div style="${cardStyle};cursor:pointer" onclick="window.playPendingChallenge('${c.id}','${c.role}')">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <i class="fas fa-bolt" style="color:var(--accent)"></i>
            <span style="font-weight:900;font-size:14px;color:#fff">تحدي من ${oppName}</span>
          </div>
          <div style="font-size:12px;color:var(--text2)">اضغط للعب الآن</div>
        </div>`;
      }
      if (!oppDone) {
        return `<div style="${cardStyle}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <i class="fas fa-hourglass-half" style="color:var(--text2)"></i>
            <span style="font-weight:900;font-size:14px;color:#fff">بانتظار ${oppName}</span>
          </div>
          <div style="font-size:12px;color:var(--text2)">نتيجتك: ${myScore}/10 — في انتظار رد صاحبك</div>
        </div>`;
      }
      const won  = myScore > oppScore;
      const tied = myScore === oppScore;
      const resultText  = tied ? '🤝 تعادل!' : (won ? '🏆 فزت!' : '😅 خسرت');
      const resultColor = tied ? 'var(--text2)' : (won ? '#22c55e' : '#ef4444');
      return `<div style="${cardStyle}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:900;font-size:14px;color:#fff">ضد ${oppName}</span>
          <span style="font-size:11px;font-weight:900;color:${resultColor};background:rgba(255,255,255,.06);padding:3px 10px;border-radius:12px">${resultText}</span>
        </div>
        <div style="font-size:12px;color:var(--text2)">${myScore}/10 مقابل ${oppScore}/10</div>
      </div>`;
    }).join('');

    updateChallengeBadge(pendingCount);
  } catch (e) {
    list.innerHTML = _stateBox('⚠️', 'حصل خطأ في تحميل التحديات');
  }
}
window.loadMyChallenges = loadMyChallenges;

export function showMyChallengesModal() {
  window.openModal?.('friend-challenges');
  loadMyChallenges();
}
window.showMyChallengesModal = showMyChallengesModal;

// فحص أولي بسيط للتحديات المعلقة (لشارة الإشعار) عند تحميل التطبيق
export async function checkPendingChallengesBadge() {
  if (!window.currentUser) return;
  try {
    const base = `artifacts/${APP_ID}/public/data/friend_challenges`;
    const snap = await window.db_query?.(base, where('toUid', '==', window.currentUser.uid), where('toDone', '==', false));
    updateChallengeBadge(snap?.size || 0);
  } catch (e) {}
}
window.checkPendingChallengesBadge = checkPendingChallengesBadge;
