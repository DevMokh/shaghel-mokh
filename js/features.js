// js/features.js — يشتغل بعد main.js
// بيستخدم window.xxx بدل imports عشان مفيش circular dependencies
//
// ملاحظة: الملف ده كان فيه 5 أنظمة (مهام يومية، تخصيص أفاتار، إشعارات ذكية،
// إحصائيات تفصيلية، تورنمنت أسبوعي). تم حذف الأربعة التانية نهائياً بقرار صريح
// لأنها كانت مكررة أو متعارضة مع كود شغال فعلياً في الملفات التانية:
//   - المهام اليومية: موجودة وشغالة في main.js/ui.js (showDailyTasksModal) بأسماء حقول مختلفة.
//   - الإحصائيات التفصيلية: موجودة وأكمل في ui.js (renderStats/switchStatsTab/renderStatsCharts).
//   - التورنمنت الأسبوعي: موجود وشغال في challenges.js (renderTournamentScreen) وكان
//     استيراد نسخة هنا هيعمل override لـ window.registerTournament و window.getWeekId الشغالين.
//   - الإشعارات الذكية: نسخة مكررة من دالة محلية في main.js، مفيش حاجة بتستخدمها.
// الباقي: تخصيص الأفاتار (أيقونات + لون خلفية) — وهو فعلياً مش مكرر، والتطبيق
// مكنش فيه طريقة لتغيير شكل الأفاتار الأساسي (كان فيه إطارات بس من data.js).

// ══ تخصيص الأفاتار (أيقونة + لون خلفية) ════════════════════════
export const AVATAR_BG_COLORS = [
  {id:'gold',  color:'#fbbf24',label:'ذهبي',  cost:0},
  {id:'red',   color:'#ef4444',label:'أحمر',  cost:0},
  {id:'blue',  color:'#3b82f6',label:'أزرق',  cost:0},
  {id:'green', color:'#22c55e',label:'أخضر', cost:0},
  {id:'purple',color:'#8b5cf6',label:'بنفسجي',cost:200},
  {id:'pink',  color:'#ec4899',label:'وردي',  cost:200},
  {id:'cyan',  color:'#06b6d4',label:'سماوي', cost:200},
  {id:'orange',color:'#f97316',label:'برتقالي',cost:200},
  {id:'dark',  color:'#1e1b4b',label:'غامق',  cost:300},
  {id:'galaxy',color:'linear-gradient(135deg,#667eea,#764ba2)',label:'مجرة',cost:500},
  {id:'sunset',color:'linear-gradient(135deg,#f093fb,#f5576c)',label:'غروب',cost:500},
  {id:'ocean', color:'linear-gradient(135deg,#4facfe,#00f2fe)',label:'محيط', cost:500},
];

// أيقونات Font Awesome بدل الإموجي — أوضح وأثبت على كل الأجهزة
export const AVATAR_ICONS = [
  {id:'brain', icon:'fa-brain'},
  {id:'fire',  icon:'fa-fire'},
  {id:'star',  icon:'fa-star'},
  {id:'crown', icon:'fa-crown'},
  {id:'rocket',icon:'fa-rocket'},
  {id:'gem',   icon:'fa-gem'},
  {id:'dragon',icon:'fa-dragon'},
  {id:'feather',icon:'fa-feather-pointed'},
  {id:'ninja', icon:'fa-user-ninja'},
  {id:'wizard',icon:'fa-hat-wizard'},
  {id:'knight',icon:'fa-chess-knight'},
  {id:'bot',   icon:'fa-robot'},
];

const _bgStyle = (id, sz) => {
  const b = AVATAR_BG_COLORS.find(c => c.id === id);
  return `width:${sz}px;height:${sz}px;border-radius:${Math.round(sz*.3)}px;background:${b?.color||'#fbbf24'};display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.3);`;
};

export function openAvatarCustomizer() {
  window.openModal?.('avatar');
  renderAvatarCustomizer();
}
window.openAvatarCustomizer = openAvatarCustomizer;

export function closeAvatarCustomizer() {
  window.closeModal?.('avatar');
}
window.closeAvatarCustomizer = closeAvatarCustomizer;

export function renderAvatarCustomizer() {
  const body = document.getElementById('avatar-body');
  if (!body) return;
  const d = window.gameData || {};
  const bg = d.avatarBg || 'gold', ic = d.avatarIcon || 'brain';
  const iconClass = AVATAR_ICONS.find(i => i.id === ic)?.icon || 'fa-brain';
  body.innerHTML = `
    <div style="display:flex;justify-content:center;margin-bottom:18px">
      <div id="av-preview" style="${_bgStyle(bg,88)}">
        <i id="av-icon" class="fas ${iconClass}" style="font-size:36px;color:#000"></i></div>
    </div>
    <div style="font-size:11px;font-weight:900;color:var(--text2);text-transform:uppercase;
      letter-spacing:.08em;margin-bottom:10px">الأيقونة</div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:18px">
      ${AVATAR_ICONS.map(i => `<div onclick="window.selectAvatarIcon('${i.id}')" id="avic-${i.id}"
        style="aspect-ratio:1;border-radius:14px;background:${ic===i.id?'rgba(251,191,36,.18)':'rgba(255,255,255,.06)'};
          border:2px solid ${ic===i.id?'var(--accent)':'transparent'};display:flex;align-items:center;
          justify-content:center;font-size:18px;cursor:pointer;transition:.15s;color:${ic===i.id?'var(--accent)':'#fff'}">
          <i class="fas ${i.icon}"></i></div>`).join('')}
    </div>
    <div style="font-size:11px;font-weight:900;color:var(--text2);text-transform:uppercase;
      letter-spacing:.08em;margin-bottom:10px">لون الخلفية</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px">
      ${AVATAR_BG_COLORS.map(c => `<div onclick="window.selectAvatarBg('${c.id}')" id="avbg-${c.id}"
        style="padding:8px 4px;border-radius:12px;background:rgba(255,255,255,.04);
          border:2px solid ${bg===c.id?'var(--accent)':'transparent'};cursor:pointer;text-align:center">
        <div style="width:32px;height:32px;border-radius:10px;margin:0 auto 4px;background:${c.color}"></div>
        <div style="font-size:9px;font-weight:700;color:${bg===c.id?'var(--accent)':'var(--text2)'}">${c.label}</div>
        ${c.cost?`<div style="font-size:8px;color:#fbbf24">💰${c.cost}</div>`:''}</div>`).join('')}
    </div>
    <button onclick="window.saveAvatar()" style="width:100%;padding:15px;background:var(--grad);color:#000;
      font-weight:900;border-radius:22px;font-size:15px;border:none;
      border-bottom:3px solid rgba(0,0,0,.2);cursor:pointer">💾 حفظ الأفاتار</button>`;
}
window.renderAvatarCustomizer = renderAvatarCustomizer;

export function selectAvatarIcon(id) {
  window._pendingIcon = id;
  const i = AVATAR_ICONS.find(x => x.id === id);
  const iconEl = document.getElementById('av-icon');
  if (iconEl) iconEl.className = `fas ${i?.icon || 'fa-brain'}`;
  document.querySelectorAll('[id^="avic-"]').forEach(el => {
    el.style.background = 'rgba(255,255,255,.06)';
    el.style.borderColor = 'transparent';
    el.style.color = '#fff';
  });
  const s = document.getElementById(`avic-${id}`);
  if (s) { s.style.background = 'rgba(251,191,36,.18)'; s.style.borderColor = 'var(--accent)'; s.style.color = 'var(--accent)'; }
}
window.selectAvatarIcon = selectAvatarIcon;

export function selectAvatarBg(id) {
  const c = AVATAR_BG_COLORS.find(x => x.id === id);
  if (!c) return;
  if (c.cost > 0 && (window.gameData?.coins || 0) < c.cost) { window.showToast?.(`❌ تحتاج ${c.cost} عملة`); return; }
  if (c.cost > 0 && window.gameData) window.gameData.coins -= c.cost;
  window._pendingBg = id;
  const p = document.getElementById('av-preview');
  if (p) p.style.cssText = _bgStyle(id, 88);
  document.querySelectorAll('[id^="avbg-"]').forEach(el => el.style.borderColor = 'transparent');
  const s = document.getElementById(`avbg-${id}`);
  if (s) s.style.borderColor = 'var(--accent)';
}
window.selectAvatarBg = selectAvatarBg;

export function saveAvatar() {
  const d = window.gameData;
  if (!d) return;
  if (window._pendingIcon) { d.avatarIcon = window._pendingIcon; delete window._pendingIcon; }
  if (window._pendingBg)   { d.avatarBg   = window._pendingBg;   delete window._pendingBg; }
  window.saveData?.();
  window.updateUI?.();
  closeAvatarCustomizer();
  window.showToast?.('✅ تم حفظ الأفاتار!');
  if (navigator.vibrate) navigator.vibrate([20, 10, 20]);
}
window.saveAvatar = saveAvatar;
