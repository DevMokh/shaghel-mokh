#!/usr/bin/env node
// check.js — فحص شامل قبل أي رفع لـ GitHub
// ════════════════════════════════════════════════════════════════
// بيكتشف نفس نوع الأخطاء اللي كسرت التطبيق قبل كده:
//   1) أخطاء صيغة (Syntax) في أي ملف JS
//   2) استيراد دالة من ملف مش بيصدّرها فعليًا (الباج اللي كسر كل الأزرار)
//   3) زرار في الـ HTML بينده دالة مش متعرّفة في أي ملف JS
//
// طريقة التشغيل (من جذر المشروع، بجانب index.html و مجلد js/):
//   node check.js
//
// لو طبع ❌ في الآخر → فيه مشكلة لازم تتصلح قبل ما ترفع.
// لو طبع ✅ في الآخر → الكود سليم وجاهز للرفع.
// ════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT   = process.cwd();
const JS_DIR = path.join(ROOT, 'js');

let errorCount = 0;

function fail(msg) { console.log(`❌ ${msg}`); errorCount++; }
function ok(msg)   { console.log(`✅ ${msg}`); }
function info(msg) { console.log(`\n${msg}`); }

if (!fs.existsSync(JS_DIR)) {
  console.error(`❌ مجلد js/ غير موجود هنا: ${JS_DIR}`);
  console.error('   شغّل السكريبت من جذر المشروع (نفس مكان index.html).');
  process.exit(1);
}

const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js'));

// ══════════════════════════════════════════════════════════════════
// 1) فحص الصيغة (Syntax) — أي خطأ هنا بيوقف الملف كله بصمت في المتصفح
//    (بنعمل نسخة مؤقتة بامتداد .mjs عشان نضمن إن Node يفحصها كـ ES Module
//     دايمًا، مهما كانت إعدادات المشروع — التجربة العادية مش مضمونة 100%)
// ══════════════════════════════════════════════════════════════════
info('📐 فحص الصيغة (Syntax)...');
let syntaxIssues = 0;
const os = require('os');
for (const file of jsFiles) {
  const fp = path.join(JS_DIR, file);
  const tmp = path.join(os.tmpdir(), `check_${Date.now()}_${file.replace(/\.js$/, '.mjs')}`);
  try {
    fs.copyFileSync(fp, tmp);
    execSync(`node --check "${tmp}"`, { stdio: 'pipe' });
  } catch (e) {
    syntaxIssues++;
    const detail = (e.stderr || e.stdout || '').toString()
      .replace(tmp, `js/${file}`)
      .split('\n').slice(0, 4).join('\n   ');
    fail(`خطأ صيغة في js/${file}:\n   ${detail}`);
  } finally {
    try { fs.unlinkSync(tmp); } catch (e) {}
  }
}
if (syntaxIssues === 0) ok('كل ملفات js/ سليمة الصيغة');

// ══════════════════════════════════════════════════════════════════
// 2) فحص تطابق import/export
//    (ده بالظبط الباج اللي كسر كل أزرار التطبيق قبل كده —
//     دالة مستوردة من ملف مش مُصدَّرة منه فعليًا)
// ══════════════════════════════════════════════════════════════════
info('🔗 فحص تطابق import/export...');

const exportsMap = {};
for (const file of jsFiles) {
  const src = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|var)\s+([a-zA-Z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+class\s+([a-zA-Z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) names.add(name);
    }
  }
  exportsMap[file] = names;
}

let importIssues = 0;
for (const file of jsFiles) {
  const src = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/([a-zA-Z0-9_.]+)['"]/g)) {
    const target = m[2];
    if (!exportsMap[target]) {
      fail(`js/${file} بيستورد من ملف غير موجود: ./${target}`);
      importIssues++;
      continue;
    }
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name && !exportsMap[target].has(name)) {
        fail(`js/${file} بيستورد '${name}' من ./${target} — لكنها غير مُصدَّرة هناك (export)`);
        importIssues++;
      }
    }
  }
}
if (importIssues === 0) ok('كل الـ imports بترجع لأسماء export موجودة فعليًا');

// ملاحظة: السكريبت ده مش بيفحص dynamic imports (زي import('./modes.js'))
// أو export default، لأن المشروع مش بيستخدمهم حاليًا.

// ══════════════════════════════════════════════════════════════════
// 3) فحص ربط أزرار onclick في HTML بدوال موجودة فعليًا على window
// ══════════════════════════════════════════════════════════════════
info('🖱️  فحص ربط الأزرار (onclick) بـ window...');

const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const calledFns = new Set();
for (const file of htmlFiles) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const m of src.matchAll(/on\w+="([^"]*)"/g)) {
    for (const fn of m[1].matchAll(/window\.([a-zA-Z_$][\w$]*)\s*\(/g)) {
      calledFns.add(fn[1]);
    }
  }
}

const boundFns = new Set();
for (const file of jsFiles) {
  const src = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
  for (const m of src.matchAll(/window\.([a-zA-Z_$][\w$]*)\s*=/g)) {
    boundFns.add(m[1]);
  }
}

let bindingIssues = 0;
for (const fn of calledFns) {
  if (!boundFns.has(fn)) {
    fail(`فيه onclick بينده window.${fn}() لكنها غير معرّفة في أي ملف js/`);
    bindingIssues++;
  }
}
if (bindingIssues === 0) ok('كل الأزرار مربوطة بدوال موجودة فعليًا');

// ══════════════════════════════════════════════════════════════════
// الخلاصة
// ══════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(50));
if (errorCount > 0) {
  console.log(`❌ فيه ${errorCount} مشكلة لازم تتصلح قبل الرفع على GitHub.`);
  process.exit(1);
} else {
  console.log('✅ كل الفحوصات نظيفة — الكود جاهز للرفع.');
  process.exit(0);
}

