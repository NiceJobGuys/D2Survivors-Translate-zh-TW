// D2 Survivors 繁體中文 patch.
// usage: node patch.mjs [gameDir]          patch (re-run after every game update)
//        node patch.mjs --restore [gameDir] put the original app.asar back
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const modDir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const restore = args[0] === "--restore";
const gameDir = (restore ? args[1] : args[0]) ?? "D:\\Games\\D2 Survivors";
const asarPath = path.join(gameDir, "resources", "app.asar");
const backupPath = path.join(modDir, "backup", "app.asar");
const workDir = path.join(modDir, "work");
const ZH_FILE = "zh-TW.js";

const asar = (...a) => execFileSync("npx", ["--yes", "@electron/asar@3", ...a], { stdio: "inherit", shell: true });
const q = p => `"${p}"`;

if (restore) {
  fs.copyFileSync(backupPath, asarPath);
  console.log("已還原原版 app.asar");
  process.exit(0);
}

// Start from a pristine asar: back up a fresh one, or reuse the backup if this one is already patched.
fs.rmSync(workDir, { recursive: true, force: true });
asar("extract", q(asarPath), q(workDir));
const assets = path.join(workDir, "desktop", "dist", "web", "assets");
if (fs.existsSync(path.join(assets, ZH_FILE))) {
  if (!fs.existsSync(backupPath)) throw Error("遊戲已被 patch 過，但找不到 backup\\app.asar");
  fs.rmSync(workDir, { recursive: true, force: true });
  asar("extract", q(backupPath), q(workDir));
} else {
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(asarPath, backupPath);
}

const files = fs.readdirSync(assets);
const find = re => {
  const hit = files.filter(f => re.test(f));
  if (hit.length !== 1) throw Error(`找不到唯一的 ${re}：${hit.join(", ")}`);
  return path.join(assets, hit[0]);
};
// Replace exactly one match, so a game update that changes the code fails loudly instead of half-patching.
const patch = (file, re, fn, label) => {
  const src = fs.readFileSync(file, "utf8");
  const m = src.match(new RegExp(re.source, re.flags.replace("g", "") ));
  const count = (src.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) ?? []).length;
  if (count !== 1) throw Error(`patch「${label}」在 ${path.basename(file)} 比對到 ${count} 處（應為 1），遊戲程式可能已改版`);
  fs.writeFileSync(file, src.replace(m[0], () => fn(...m)));
  console.log(`  ✓ ${label}`);
};

const CJK = "U+2E80-2FDF, U+3000-303F, U+3100-312F, U+3190-31BF, U+3400-4DBF, U+4E00-9FFF, U+F900-FAFF, U+FE30-FE4F, U+FF00-FFEF";
const jhengHei = 'local("Microsoft JhengHei Bold"), local("MicrosoftJhengHeiBold"), local("微軟正黑體 Bold"), local("Microsoft JhengHei"), local("MicrosoftJhengHeiRegular")';

console.log("套用程式修改：");
const lang = find(/^lang-[\w-]+\.js$/);
patch(lang, /\{en:`ENGLISH`,ko:`한국어`\}/, m => m.replace("}", ",zh:`繁體中文`}"), "語言選單加入繁體中文");
patch(lang, /(\w)===`en`\|\|\1===`ko`\?\1:(\w)\.some\((\w)=>\/\^ko\\b\/i\.test\(\3\)\)\?`ko`:`en`/,
  (m, e, t, x) => `${e}===\`en\`||${e}===\`ko\`||${e}===\`zh\`?${e}:${t}.some(${x}=>/^zh\\b/i.test(${x}))?\`zh\`:${t}.some(${x}=>/^ko\\b/i.test(${x}))?\`ko\`:\`en\``,
  "記住／偵測中文語言設定");
patch(lang, /if\((\w+)\(\)!==`ko`\)return;document\.documentElement\.lang=`ko`;let\[(\w+)\]=await Promise\.all\(\[(\w+)\(\(\)=>import\((`\.\/ko-[\w-]+\.js`)\)/,
  (m, N, e, i, ko) => `let __l=${N}();if(__l!==\`ko\`&&__l!==\`zh\`)return;document.documentElement.lang=__l===\`zh\`?\`zh-Hant\`:\`ko\`;let[${e}]=await Promise.all([${i}(()=>(__l===\`zh\`?import(\`./${ZH_FILE}\`):import(${ko}))`,
  "載入中文字典");
// "Label: value" is rejoined with an ASCII colon; official zh labels already end in "：", which doubled it.
patch(lang, /return`\$\{(\w)\.replace\(\/:\?\\s\*\$\/,`:`\)\} \$\{(\w)\}`/,
  (m, t, r) => `return/[：]\\s*$/.test(${t})?\`\${${t}.trim()}\${${r}}\`:\`\${${t}.replace(/:?\\s*$/,\`:\`)} \${${r}}\``,
  "標籤冒號不重複");
const fontSrc = fs.readFileSync(lang, "utf8");
const [, T, E] = fontSrc.match(/\[\[(\w+),`kodia\.woff2`\],\[(\w+),`irisl\.woff2`\]\]/) ?? [];
const N = fontSrc.match(/let __l=(\w+)\(\)/)?.[1];
if (!T || !N) throw Error("找不到字型或語言函式名稱，遊戲程式可能已改版");
// In zh, the Korean font slots (used by the bitmap text fallback and the CSS title stack) point at a CJK system font.
patch(lang, /async function (\w+)\(\)\{if\(typeof FontFace>`u`\)return;let (\w+)=async\(\w+,\w+\)=>\{try\{return document\.fonts\.add\(await new FontFace\(\w+,`url\(\$\{\w+\}\)`,\{unicodeRange:`[^`]+`\}\)\.load\(\)\),!0\}catch\{return!1\}\};(\w+)=/,
  (m, B, add, O) => m.replace(`if(typeof FontFace>\`u\`)return;`,
    `if(typeof FontFace>\`u\`)return;if(${N}()===\`zh\`){let z=async(n,w)=>{try{return document.fonts.add(await new FontFace(n,\`${jhengHei}\`,{unicodeRange:\`${CJK}\`,weight:w}).load()),!0}catch{return!1}};${O}=(await Promise.all([z(${T},\`normal\`),z(${E},\`bold\`)])).every(Boolean);${O}||console.warn(\`Microsoft JhengHei not found: CJK falls back to the default font\`);return}`),
  "中文字型（微軟正黑體）");

const keep = find(/^keepSave-[\w-]+\.js$/);
patch(keep, /return (\w)>=44032&&\1<=55203\|\|/,
  (m, t) => `return ${t}>=11904&&${t}<=12591||${t}>=12688&&${t}<=12735||${t}>=13312&&${t}<=40959||${t}>=63744&&${t}<=64255||${t}>=65072&&${t}<=65103||${t}>=65280&&${t}<=65519||${t}>=44032&&${t}<=55203||`,
  "點陣字型改用中文字型畫中文字");
// Original splits lines only at spaces; CJK has none, so also break between CJK characters (keeping punctuation attached).
patch(keep, /wrapLines\(e,t\)\{let n=\[\];for\(let r of e\.split\(`\n`\)\)\{let e=``;for\(let i of r\.split\(` `\)\)\{let r=e\?`\$\{e\} \$\{i\}`:i;e&&this\.measure\(r\)>t\?\(n\.push\(e\.endsWith\(` ·`\)\?e\.slice\(0,-2\):e\),e=i===`·`\?``:i\):e=r\}\(e\|\|!r\)&&n\.push\(e\)\}return n\}/,
  () => "wrapLines(e,t){let n=[],u=/[（「『《〈【]*[\\u2E80-\\u9FFF\\uF900-\\uFAFF][，。、：；！？）」』》〉】…％]*|[^\\u2E80-\\u9FFF\\uF900-\\uFAFF]+/gu;for(let r of e.split(`\n`)){let e=``;for(let w of r.split(` `))(w.match(u)??[w]).forEach((i,j)=>{let r=e?j?e+i:`${e} ${i}`:i;e&&this.measure(r)>t?(n.push(e.endsWith(` ·`)?e.slice(0,-2):e),e=i===`·`?``:i):e=r});(e||!r)&&n.push(e)}return n}",
  "中文自動換行");

const transfer = find(/^saveTransfer-[\w-]+\.js$/);
// The feedback endpoint only accepts en/ko.
patch(transfer, /lang:(\w+)\(\)/, (m, h) => `lang:${h}()===\`zh\`?\`en\`:${h}()`, "回報問題時語言欄位相容");

// Build the zh dictionary module: keep only entries whose {n} slots match the key's #/* count.
const koFile = find(/^ko-[\w-]+\.js$/);
const ko = (await import(pathToFileURL(koFile).href)).default;
const zh = JSON.parse(fs.readFileSync(path.join(modDir, "zh-TW.json"), "utf8"));
const slots = s => [...s.matchAll(/\{(\d+)\}/g)].map(m => +m[1]).sort().join(",");
const out = {}, missing = [], bad = [];
for (const key of Object.keys(ko)) {
  const v = zh[key];
  if (!v) { missing.push(key); continue; }
  const n = (key.match(/[#*]/g) ?? []).length;
  if (slots(v) !== slots(ko[key]) && slots(v) !== [...Array(n).keys()].join(",")) { bad.push(key); continue; }
  out[key] = v;
}
const extra = JSON.parse(fs.readFileSync(path.join(modDir, "zh-TW.extra.json"), "utf8"));
for (const [key, v] of Object.entries(extra)) {
  if (key.startsWith("_")) continue;
  const n = (key.match(/[#*]/g) ?? []).length;
  if (slots(v) !== [...Array(n).keys()].join(",")) throw Error(`zh-TW.extra.json 佔位符不符：${key}`);
  out[key] = v;
}
fs.writeFileSync(path.join(assets, ZH_FILE), `var e=${JSON.stringify(out)};export{e as default};\n`);
fs.writeFileSync(path.join(modDir, "untranslated.txt"), [...missing, ...bad].join("\n") + "\n");
console.log(`字典：${Object.keys(ko).length - missing.length - bad.length} / ${Object.keys(ko).length} 條已翻譯（另有 ${Object.keys(extra).length - 1} 條補充），未翻 ${missing.length}，佔位符不符 ${bad.length}（清單見 untranslated.txt）`);

const packed = path.join(modDir, "app.asar.new");
asar("pack", q(workDir), q(packed));
try {
  fs.copyFileSync(packed, asarPath);
} catch (err) {
  throw Error(`寫入 ${asarPath} 失敗，請先關閉遊戲再執行：${err.message}`);
} finally {
  fs.rmSync(packed, { force: true });
  fs.rmSync(workDir, { recursive: true, force: true });
}
console.log("完成。進遊戲後在 OPTIONS 的 LANGUAGE 切到「繁體中文」。");
