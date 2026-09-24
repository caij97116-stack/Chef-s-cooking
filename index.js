import * as Prompts from './prompts.js';

const MODULE_NAME = 'style-distiller';
const DEFAULT_PASSAGE =
  '在这个快节奏的时代，我们常常被生活的洪流裹挟着前行。值得注意的是，真正的成长往往发生在那些不经意的瞬间。不禁让人感叹，时间的流逝是如此悄无声息。阳光透过窗户洒进来，宛如一层薄纱，映入眼帘的，是一抹淡淡的温暖。';

const defaultSettings = Object.freeze({
  mode: 'st',
  baseUrl: '',
  rememberKey: true,
  model: '',
  temperature: 0.7,
  source: 'mine',
  genre: 'narration',
  name: '',
  corpus: '',
  read1: null,
  beliefs: [],
  read2: null,
  blacklist: [],
  draft: null,
  block: '',
  passage: DEFAULT_PASSAGE,
  rewrite: '',
  verdict: '',
  playMode: 'none',
  thrifty: true,
  showFab: true,
  fabPos: null,
  panelPos: null,
  panelOpen: false,
  cache: {},
  stats: { calls: 0, tokens: 0, saved: 0 }
});

const settingsTpl = `
<div id="sd_root" class="sd-root inline-drawer">
  <div class="inline-drawer-toggle inline-drawer-header">
    <b>大厨烹饪处</b>
    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
  </div>
  <div class="inline-drawer-content">
    <div class="sd-note">采料、慢炖、出锅：语料进，文风块出。文风块可填进预设的一条 prompt，或世界书的一条 entry。</div>
    <label class="sd-check"><input id="sd_showfab" type="checkbox"> <span>在页面上显示悬浮球（可拖动，点开就是大厨烹饪处）</span></label>
    <div class="sd-note">工具本体是页面右下角那个圆形悬浮球，点它展开面板。本会话已调用模型 <b id="sd_stats_root">0 次</b>。</div>
    <div class="sd-note">省 API：同样的输入只用调一次；面板里默认开着「省流」，七遍读只花一次调用；面板顶部会显示命中缓存省下的次数。</div>
  </div>
</div>`;

const fabTpl = `<div class="sd-fab" id="sd_fab" title="大厨烹饪处" style="position:fixed;right:18px;bottom:120px;width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:grab;z-index:2147483001;color:#1b1e24;background:#c8a45c;box-shadow:0 6px 20px rgba(0,0,0,.45);"><i class="fa-solid fa-utensils"></i></div>`;

const panelTpl = `
<div class="sd-panel" id="sd_panel" style="position:fixed;z-index:2147483001;width:min(420px,92vw);max-height:82vh;display:none;flex-direction:column;overflow:hidden;border-radius:14px;color:#eeeeee;background:#1b1e24;border:1px solid rgba(255,255,255,.18);box-shadow:0 12px 40px rgba(0,0,0,.45);">
  <div class="sd-panel-head" id="sd_panel_head">
    <span>大厨烹饪处 <span class="sd-stat" id="sd_stats">已调用 0 次</span></span>
    <span class="sd-head-right">
      <i class="fa-solid fa-stop sd-panel-stop" id="sd_stop" title="停止本次生成"></i>
      <i class="fa-solid fa-xmark sd-panel-close" id="sd_panel_close" title="收起"></i>
    </span>
  </div>
  <div class="sd-panel-body">
    <div class="sd-sec">
      <div class="sd-sec-title">生成方式</div>
      <label class="sd-field"><span>用哪个模型</span>
        <select id="sd_mode">
          <option value="st">当前酒馆连接的模型</option>
          <option value="custom">自定义站子 / 模型</option>
        </select>
      </label>
      <div id="sd_modecustom">
        <label class="sd-field"><span>Base URL</span>
          <input id="sd_baseurl" type="text" placeholder="https://api.example.com/v1">
        </label>
        <label class="sd-field"><span>API Key</span>
          <input id="sd_apikey" type="password" placeholder="sk-...">
        </label>
        <label class="sd-check"><input id="sd_rememberkey" type="checkbox"> <span>记住 Key（存在本机；关掉则只在本次会话有效）</span></label>
        <label class="sd-field"><span>模型</span>
          <div class="sd-inline">
            <input id="sd_model" type="text" list="sd_modellist" placeholder="deepseek-chat">
            <datalist id="sd_modellist"></datalist>
            <button id="sd_pull" class="menu_button">拉取模型</button>
          </div>
        </label>
        <label class="sd-field"><span>温度 <b id="sd_tempval">0.7</b></span>
          <input id="sd_temp" type="range" min="0" max="1.5" step="0.1">
        </label>
        <div class="sd-actions"><span id="sd_status0" class="sd-status"></span></div>
      </div>
    </div>

    <div class="sd-sec">
      <div class="sd-sec-title">喂料</div>
      <div class="sd-grid2">
        <label class="sd-field"><span>来源</span>
          <select id="sd_source">
            <option value="mine">我的文字（只出条目，等你点）</option>
            <option value="reference">参考文字（另出可贴草稿 + 拿不准清单）</option>
          </select>
        </label>
        <label class="sd-field"><span>体裁</span>
          <select id="sd_genre">
            <option value="narration">叙事</option>
            <option value="dialogue">对白</option>
            <option value="interior">内心</option>
            <option value="action">动作</option>
          </select>
        </label>
      </div>
      <label class="sd-field"><span>名字</span>
        <input id="sd_name" type="text" placeholder="例如：冷硬短句 · 身体叙事">
      </label>
      <label class="sd-field"><span>语料</span>
        <textarea id="sd_corpus" rows="6" placeholder="同一体裁的原文，段落之间空一行。"></textarea>
        <span id="sd_corpus_stat" class="sd-corpus-stat"></span>
      </label>
      <label class="sd-check"><input id="sd_thrifty" type="checkbox"> <span>省流：六遍读合并成一次调用（少花一半调用，分析略粗）</span></label>
      <div class="sd-actions">
        <button id="sd_read1" class="menu_button">开始六遍读</button>
        <span id="sd_status1" class="sd-status"></span>
      </div>
    </div>

    <div class="sd-sec">
      <div class="sd-sec-title">前三遍读<span class="sd-hint">点某一层的「重蒸」只重读那一层</span></div>
      <div id="sd_readout" class="sd-readout"></div>
    </div>

    <div class="sd-sec">
      <div class="sd-sec-title">卡点·信念<span class="sd-hint">选 / 驳 / 修，没有你确认不进下一步</span></div>
      <div id="sd_beliefs" class="sd-cards"></div>
      <div class="sd-actions">
        <button id="sd_read2" class="menu_button">确认信念，读后三遍</button>
        <span id="sd_status2" class="sd-status"></span>
      </div>
    </div>

    <div class="sd-sec">
      <div class="sd-sec-title">卡点·反例<span class="sd-hint">至少 6 条，最锋利的由你补</span></div>
      <div id="sd_position" class="sd-readout"></div>
      <div id="sd_blacklist" class="sd-cards"></div>
      <div class="sd-inline">
        <input id="sd_blackadd" type="text" placeholder="她打死也不会写的那一句">
        <button id="sd_blackaddbtn" class="menu_button">加</button>
      </div>
      <div class="sd-actions">
        <button id="sd_compose" class="menu_button">压成文风块</button>
        <span id="sd_status3" class="sd-status"></span>
      </div>
    </div>

    <div class="sd-sec">
      <div class="sd-sec-title">文风块<span class="sd-hint">可手改</span></div>
      <textarea id="sd_block" rows="10" placeholder="文风块会出现在这里。"></textarea>
    </div>

    <div class="sd-sec">
      <div class="sd-sec-title">测试门<span class="sd-hint">默认 AI 腔让它改写，你判像不像</span></div>
      <div class="sd-grid2">
        <label class="sd-field"><span>默认 AI 腔</span><textarea id="sd_passage" rows="5"></textarea></label>
        <label class="sd-field"><span>改写结果</span><textarea id="sd_rewrite" rows="5"></textarea></label>
      </div>
      <div class="sd-actions">
        <button id="sd_dorewrite" class="menu_button">用文风改写</button>
        <button id="sd_like" class="menu_button">像</button>
        <button id="sd_unlike" class="menu_button">不像</button>
        <span id="sd_status4" class="sd-status"></span>
      </div>
    </div>

    <div class="sd-sec">
      <div class="sd-sec-title">拿走</div>
      <label class="sd-field"><span>玩法备注（可选，不并入文风）</span>
        <select id="sd_play">
          <option value="none">不写</option>
          <option value="shell">只演他人（不替 {{user}} 发言）</option>
          <option value="polish">润色代述（按文风润色 {{user}} 的输入）</option>
          <option value="actor">全权代演（AI 完整扮演 {{user}}）</option>
        </select>
      </label>
      <div class="sd-actions">
        <button id="sd_copy" class="menu_button">复制文风块</button>
        <button id="sd_dljson" class="menu_button">下载 JSON</button>
        <span id="sd_status5" class="sd-status"></span>
      </div>
    </div>
  </div>
</div>`;

function ctx() {
  return SillyTavern.getContext();
}

function settings() {
  const { extensionSettings } = ctx();
  if (!extensionSettings[MODULE_NAME]) {
    extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
  }
  const s = extensionSettings[MODULE_NAME];
  for (const key of Object.keys(defaultSettings)) {
    if (!Object.hasOwn(s, key)) s[key] = structuredClone(defaultSettings[key]);
  }
  if (!s.stats) s.stats = { calls: 0, tokens: 0, saved: 0 };
  if (s.stats.saved == null) s.stats.saved = 0;
  if (!s.cache) s.cache = {};
  return s;
}

function save() {
  ctx().saveSettingsDebounced();
}

const APIKEY_STORE = 'sd_api_key';
let sessionKey = '';

function readStoredKey() {
  try {
    return localStorage.getItem(APIKEY_STORE) || '';
  } catch (e) {
    return '';
  }
}

function storeKey(v) {
  try {
    localStorage.setItem(APIKEY_STORE, v);
  } catch (e) {}
}

function clearStoredKey() {
  try {
    localStorage.removeItem(APIKEY_STORE);
  } catch (e) {}
}

function getApiKey() {
  if (settings().rememberKey) return sessionKey || readStoredKey();
  return sessionKey;
}

function setApiKey(v) {
  sessionKey = v;
  if (settings().rememberKey) storeKey(v);
}

function migrateKey() {
  const s = settings();
  if (typeof s.apiKey === 'string' && s.apiKey) {
    sessionKey = s.apiKey;
    storeKey(s.apiKey);
  }
  if (Object.hasOwn(s, 'apiKey')) delete s.apiKey;
}

function el(id) {
  return document.getElementById(id);
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setStatus(id, text, kind) {
  const node = el(id);
  if (!node) return;
  node.className = 'sd-status' + (kind ? ' sd-' + kind : '');
  node.textContent = text || '';
}

function parseJSON(text) {
  let s = String(text == null ? '' : text).trim();
  if (!s) throw new Error('模型没有返回内容，请重试或检查 API');
  s = s.replace(/```[a-zA-Z]*\s*/g, '').replace(/```/g, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    return JSON.parse(s);
  } catch (e) {
    const trailing = s.replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(trailing);
    } catch (e2) {
      const quoted = trailing.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
      return JSON.parse(quoted);
    }
  }
}

function hashKey(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function bumpStats(tokens) {
  const s = settings();
  s.stats.calls += 1;
  if (tokens) s.stats.tokens += tokens;
  renderStats();
  save();
}

function renderStats() {
  const s = settings();
  let txt = '已调用 ' + s.stats.calls + ' 次';
  if (s.stats.saved) txt += ' · 省 ' + s.stats.saved + ' 次';
  if (s.stats.tokens) txt += ' · ' + s.stats.tokens + ' tok';
  if (el('sd_stats')) el('sd_stats').textContent = txt;
  if (el('sd_stats_root')) el('sd_stats_root').textContent = s.stats.calls + ' 次' + (s.stats.saved ? '（省 ' + s.stats.saved + ' 次）' : '');
}

function estimateTokens(text) {
  const cjk = (String(text).match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
  const other = Math.max(0, String(text).length - cjk);
  return Math.round(cjk * 0.9 + other / 4);
}

function renderCorpusStat() {
  const node = el('sd_corpus_stat');
  if (!node) return;
  const text = (el('sd_corpus') && el('sd_corpus').value) || '';
  if (!text.trim()) {
    node.className = 'sd-corpus-stat';
    node.textContent = '还没贴语料。';
    return;
  }
  const chars = text.replace(/\s/g, '').length;
  const tokens = estimateTokens(text);
  const paras = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  let msg = '约 ' + chars + ' 字 · 约 ' + tokens + ' token · ' + paras + ' 段';
  let kind = '';
  if (tokens > 16000) {
    msg += ' · 很长，强烈建议分几批喂，否则容易爆上下文也费钱';
    kind = 'over';
  } else if (tokens > 8000) {
    msg += ' · 偏长，可考虑分批';
    kind = 'warn';
  }
  node.className = 'sd-corpus-stat' + (kind ? ' sd-corpus-' + kind : '');
  node.textContent = msg;
}

async function generateRawViaST(messages) {
  const { generateRaw } = ctx();
  if (typeof generateRaw !== 'function') {
    throw new Error('当前 SillyTavern 不支持 generateRaw，请升级或检查 API 连接');
  }
  const systemPrompt = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const prompt = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));
  const result = await generateRaw({ systemPrompt, prompt });
  return String(result == null ? '' : result);
}

async function generateViaCustom(messages, signal) {
  const s = settings();
  const key = getApiKey();
  if (!s.baseUrl || !key || !s.model) {
    throw new Error('先填好自定义站子的 Base URL / Key / 模型');
  }
  const url = s.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ model: s.model, messages, temperature: Number(s.temperature) || 0.7 }),
    signal
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error('HTTP ' + res.status + ' · ' + t.slice(0, 180));
  }
  const data = await res.json();
  const tokens = data && data.usage && (data.usage.total_tokens || data.usage.totalTokenCount);
  if (tokens) {
    const st = settings();
    st.stats.tokens += Number(tokens) || 0;
  }
  const msg = data.choices && data.choices[0] && data.choices[0].message;
  return (msg && msg.content) || '';
}

let activeController = null;
let cancelled = false;
let busy = false;

function lockOr(statusId) {
  if (busy) {
    setStatus(statusId, '还有一步在跑，等它结束。', 'error');
    return false;
  }
  busy = true;
  return true;
}

async function callModel(messages) {
  if (cancelled) throw new Error('已停止');
  if (settings().mode === 'custom') {
    activeController = new AbortController();
    try {
      const out = await generateViaCustom(messages, activeController.signal);
      bumpStats();
      return out;
    } finally {
      activeController = null;
    }
  }
  const out = await generateRawViaST(messages);
  if (cancelled) throw new Error('已停止');
  bumpStats();
  return out;
}

function stopRun() {
  cancelled = true;
  if (activeController) activeController.abort();
  setStatus('sd_status1', '已请求停止。');
}

const CACHE_LIMIT = 5;

function cacheList(stage) {
  const s = settings();
  const cur = s.cache[stage];
  if (!Array.isArray(cur)) {
    s.cache[stage] = cur && cur.key ? [cur] : [];
  }
  return s.cache[stage];
}

function pushCache(stage, key, data) {
  const list = cacheList(stage);
  const i = list.findIndex((e) => e && e.key === key);
  if (i >= 0) list.splice(i, 1);
  list.unshift({ key, data });
  if (list.length > CACHE_LIMIT) list.length = CACHE_LIMIT;
}

async function cachedRun(stage, inputKey, producer, force) {
  const list = cacheList(stage);
  if (!force) {
    const i = list.findIndex((e) => e && e.key === inputKey);
    if (i >= 0) {
      const hit = list[i];
      if (i > 0) {
        list.splice(i, 1);
        list.unshift(hit);
      }
      const s = settings();
      s.stats.saved += 1;
      renderStats();
      save();
      return { data: hit.data, cached: true };
    }
  }
  const data = await producer();
  pushCache(stage, inputKey, data);
  save();
  return { data, cached: false };
}

async function pullModels() {
  const s = settings();
  s.baseUrl = el('sd_baseurl').value.trim();
  setApiKey(el('sd_apikey').value.trim());
  save();
  if (!s.baseUrl) {
    setStatus('sd_status0', '先填 Base URL。', 'error');
    return;
  }
  setStatus('sd_status0', '拉取中…');
  el('sd_pull').disabled = true;
  try {
    const url = s.baseUrl.replace(/\/+$/, '') + '/models';
    const key = getApiKey();
    const res = await fetch(url, { headers: key ? { Authorization: 'Bearer ' + key } : {} });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const list = (data.data || data.models || [])
      .map((m) => m.id || m.name || m.model)
      .filter(Boolean);
    if (!list.length) throw new Error('没拿到模型列表');
    el('sd_modellist').innerHTML = list.map((id) => '<option value="' + esc(id) + '"></option>').join('');
    setStatus('sd_status0', '拉到 ' + list.length + ' 个模型，点模型框选。', 'ok');
  } catch (e) {
    setStatus('sd_status0', String(e.message || e), 'error');
  } finally {
    el('sd_pull').disabled = false;
  }
}

function updateMode() {
  const s = settings();
  el('sd_mode').value = s.mode;
  el('sd_modecustom').style.display = s.mode === 'custom' ? '' : 'none';
}

function readoutRow(label, value, layer) {
  const btn = layer
    ? ' <button class="sd-refresh menu_button" data-layer="' + esc(layer) + '" title="只重蒸这一层">重蒸</button>'
    : '';
  return '<div class="sd-row"><b>' + esc(label) + '</b> ' + esc(value) + btn + '</div>';
}

function renderReadout(target, data) {
  const parts = [];
  if (data.syntax) {
    const s = data.syntax;
    parts.push(readoutRow('句法', [s.vocab, s.sentence, s.rhythm, s.punctuation, s.register].filter(Boolean).join('；'), 'syntax'));
  }
  if (data.object) {
    const o = data.object;
    parts.push(readoutRow('对象', [o.writes, o.notWrites, o.listener].filter(Boolean).join('；'), 'object'));
  }
  if (data.attitude) {
    const a = data.attitude;
    parts.push(readoutRow('态度', [a.tragedy, a.comedy, a.intimacy, a.failure, a.time].filter(Boolean).join('；'), 'attitude'));
  }
  if (data.rhetoric) parts.push(readoutRow('修辞', (data.rhetoric || []).join('；'), 'rhetoric'));
  if (data.belief_core) parts.push(readoutRow('核心信念', data.belief_core));
  if (data.position) parts.push(readoutRow('历史定位', data.position));
  if (data.neighbor_diff) parts.push(readoutRow('跟邻居的界', data.neighbor_diff));
  if (data.draft) {
    parts.push(readoutRow('参考草稿', data.draft.draft || ''));
    parts.push(readoutRow('拿不准', (data.draft.uncertain || []).join('；')));
  }
  if (target) target.innerHTML = parts.join('') || '<div class="sd-row sd-muted">没有结果。</div>';
}

function renderBeliefs() {
  const s = settings();
  const target = el('sd_beliefs');
  if (!target) return;
  target.innerHTML = (s.beliefs || [])
    .map(
      (b, i) =>
        '<div class="sd-card' + (b.on ? '' : ' sd-off') + '" data-i="' + i + '">' +
        '<input type="checkbox" class="sd-bon"' + (b.on ? ' checked' : '') + '>' +
        '<div class="sd-cardbody"><input type="text" class="sd-btext" value="' + esc(b.belief) + '">' +
        '<div class="sd-meta">依据：<span class="sd-ev">' + esc(b.evidence) + '</span> · 反例：' + esc(b.counter) + '</div>' +
        '</div></div>'
    )
    .join('');

  target.querySelectorAll('.sd-card').forEach((card) => {
    const i = Number(card.dataset.i);
    card.querySelector('.sd-bon').addEventListener('change', (e) => {
      settings().beliefs[i].on = e.target.checked;
      card.classList.toggle('sd-off', !e.target.checked);
      save();
    });
    card.querySelector('.sd-btext').addEventListener('input', (e) => {
      settings().beliefs[i].belief = e.target.value;
      save();
    });
  });
}

const BLACKLIST_KINDS = ['手法', '情绪', '用词', '其他'];
const BLACKLIST_ALIASES = { 手法: '手法', 技巧: '手法', 情绪: '情绪', 情感: '情绪', 用词: '用词', 词汇: '用词', 词: '用词', 其他: '其他' };

function normalizeBlacklistKind(kind, text) {
  const k = String(kind || '').trim();
  if (BLACKLIST_ALIASES[k]) return BLACKLIST_ALIASES[k];
  const t = String(text || '');
  if (t && t.length <= 8 && !/[，。！？；：,.!?;:]/.test(t)) return '用词';
  return '其他';
}

function mapBlacklist(list) {
  const seen = new Set();
  const out = [];
  (list || []).forEach((item) => {
    const text = String(typeof item === 'string' ? item : (item && item.text) || '').trim();
    if (!text) return;
    const key = text.replace(/\s+/g, '');
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ text, kind: normalizeBlacklistKind(typeof item === 'string' ? '' : item.kind, text), on: true });
  });
  return out;
}

function renderBlacklist() {
  const s = settings();
  const target = el('sd_blacklist');
  if (!target) return;
  const list = s.blacklist || [];
  if (!list.length) {
    target.innerHTML = '';
    return;
  }
  const groups = new Map();
  list.forEach((b, i) => {
    const kind = BLACKLIST_KINDS.includes(b.kind) ? b.kind : '其他';
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push({ b, i });
  });
  target.innerHTML = BLACKLIST_KINDS.filter((k) => groups.has(k))
    .map((k) => {
      const items = groups
        .get(k)
        .map(
          ({ b, i }) =>
            '<div class="sd-card' + (b.on ? '' : ' sd-off') + '" data-i="' + i + '">' +
            '<input type="checkbox" class="sd-kon"' + (b.on ? ' checked' : '') + '>' +
            '<div class="sd-cardbody"><input type="text" class="sd-ktext" value="' + esc(b.text) + '"></div></div>'
        )
        .join('');
      return (
        '<div class="sd-kgroup"><div class="sd-kgroup-title">' + esc(k) +
        ' <span class="sd-hint">' + groups.get(k).length + ' 条</span></div>' + items + '</div>'
      );
    })
    .join('');

  target.querySelectorAll('.sd-card').forEach((card) => {
    const i = Number(card.dataset.i);
    card.querySelector('.sd-kon').addEventListener('change', (e) => {
      settings().blacklist[i].on = e.target.checked;
      card.classList.toggle('sd-off', !e.target.checked);
      save();
    });
    card.querySelector('.sd-ktext').addEventListener('input', (e) => {
      settings().blacklist[i].text = e.target.value;
      save();
    });
  });
}

function selectedBeliefs() {
  return (settings().beliefs || [])
    .filter((b) => b.on && b.belief.trim())
    .map((b) => '- ' + b.belief.trim())
    .join('\n');
}

function selectedBlacklist() {
  return (settings().blacklist || []).filter((b) => b.on && b.text.trim()).map((b) => b.text.trim());
}

async function runRead1(force) {
  const s = settings();
  s.source = el('sd_source').value;
  s.genre = el('sd_genre').value;
  s.name = el('sd_name').value.trim();
  s.corpus = el('sd_corpus').value.trim();
  save();
  if (!s.corpus) {
    setStatus('sd_status1', '先贴语料。', 'error');
    return;
  }
  if (!lockOr('sd_status1')) return;
  cancelled = false;
  setStatus('sd_status1', s.thrifty ? '七遍一起读…' : '读前三遍…');
  el('sd_read1').disabled = true;
  try {
    const thrifty = !!s.thrifty;
    const key = hashKey(thrifty ? { all: true, corpus: s.corpus, genre: s.genre } : { corpus: s.corpus, genre: s.genre });
    const { data, cached } = await cachedRun(
      thrifty ? 'readall' : 'read1',
      key,
      async () =>
        parseJSON(
          await callModel(
            thrifty
              ? Prompts.readAll({ corpus: s.corpus, genre: s.genre })
              : Prompts.read1({ corpus: s.corpus, genre: s.genre })
          )
        ),
      force
    );
    s.read1 = {
      syntax: data.syntax,
      object: data.object,
      attitude: data.attitude,
      rhetoric: data.rhetoric,
      samples: data.samples,
      beliefs: data.beliefs,
      draft: data.draft
    };
    s.draft = data.draft || null;
    s.beliefs = (data.beliefs || []).map((b) => ({
      belief: b.belief || '',
      evidence: b.evidence || '',
      counter: b.counter || '',
      on: true
    }));
    const shownDraft = s.source === 'reference' ? s.draft : null;
    renderReadout(el('sd_readout'), Object.assign({}, s.read1, { draft: shownDraft }));
    renderBeliefs();
    if (thrifty) {
      s.read2 = {
        position: data.position || '',
        neighbor_diff: data.neighbor_diff || '',
        blacklist: data.blacklist || [],
        belief_core: data.belief_core || ''
      };
      s.blacklist = mapBlacklist(data.blacklist);
      pushCache('read2', hashKey({ corpus: s.corpus, genre: s.genre, beliefs: selectedBeliefs() }), s.read2);
      renderReadout(el('sd_position'), s.read2);
      renderBlacklist();
      setStatus('sd_status1', cached ? '省流结果命中缓存，未再调用 API。' : '七遍一次读完，信念确认一下就能成块。', 'ok');
    } else {
      setStatus('sd_status1', cached ? '输入没变，用上次结果，未再调用 API。' : '前三遍读完了，去确认信念。', 'ok');
    }
    save();
  } catch (e) {
    setStatus('sd_status1', String(e.message || e), 'error');
  } finally {
    el('sd_read1').disabled = false;
    busy = false;
  }
}

async function runRefineLayer(layer) {
  const s = settings();
  if (!s.read1 || !s.corpus) {
    setStatus('sd_status1', '先读前三遍。', 'error');
    return;
  }
  if (!lockOr('sd_status1')) return;
  cancelled = false;
  setStatus('sd_status1', '重蒸「' + (Prompts.LAYERS[layer] || layer) + '」…');
  try {
    const current = s.read1[layer];
    const out = await callModel(Prompts.refineLayer({ layer, current, corpus: s.corpus, genre: s.genre }));
    const parsed = parseJSON(out);
    if (parsed && parsed.value !== undefined) {
      s.read1[layer] = parsed.value;
      renderReadout(el('sd_readout'), Object.assign({}, s.read1, { draft: s.source === 'reference' ? s.draft : null }));
      setStatus('sd_status1', '「' + (Prompts.LAYERS[layer] || layer) + '」重蒸好了。', 'ok');
      save();
    } else {
      setStatus('sd_status1', '重蒸返回格式不对，再试一次。', 'error');
    }
  } catch (e) {
    setStatus('sd_status1', String(e.message || e), 'error');
  } finally {
    busy = false;
  }
}

async function runRead2(force) {
  const s = settings();
  const beliefs = selectedBeliefs();
  if (!beliefs) {
    setStatus('sd_status2', '至少留一条信念。', 'error');
    return;
  }
  if (!lockOr('sd_status2')) return;
  cancelled = false;
  setStatus('sd_status2', '读后三遍…');
  el('sd_read2').disabled = true;
  try {
    const key = hashKey({ corpus: s.corpus, genre: s.genre, beliefs });
    const { data, cached } = await cachedRun(
      'read2',
      key,
      async () => parseJSON(await callModel(Prompts.read2({ corpus: s.corpus, genre: s.genre, beliefs }))),
      force
    );
    s.read2 = data;
    s.blacklist = mapBlacklist(data.blacklist);
    renderReadout(el('sd_position'), data);
    renderBlacklist();
    setStatus('sd_status2', cached ? '输入没变，用上次结果，未再调用 API。' : '后三遍读完了，去补最锋利的反例。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_status2', String(e.message || e), 'error');
  } finally {
    el('sd_read2').disabled = false;
    busy = false;
  }
}

async function runCompose(force) {
  const s = settings();
  if (!s.read1 || !s.read2) {
    setStatus('sd_status3', '先把六遍读完。', 'error');
    return;
  }
  if (!lockOr('sd_status3')) return;
  cancelled = false;
  setStatus('sd_status3', '压成块…');
  el('sd_compose').disabled = true;
  try {
    const samples = s.read1.samples || [];
    const key = hashKey({ name: s.name, genre: s.genre, read1: s.read1, read2: s.read2, samples, blacklist: selectedBlacklist() });
    const { data, cached } = await cachedRun(
      'compose',
      key,
      async () =>
        (
          await callModel(
            Prompts.compose({
              name: s.name,
              genre: s.genre,
              read1: s.read1,
              read2: s.read2,
              samples,
              blacklist: selectedBlacklist()
            })
          )
        ).trim(),
      force
    );
    s.block = data;
    el('sd_block').value = s.block;
    setStatus('sd_status3', cached ? '输入没变，用上次结果，未再调用 API。' : '成块了。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_status3', String(e.message || e), 'error');
  } finally {
    el('sd_compose').disabled = false;
    busy = false;
  }
}

async function runRewrite(force) {
  const s = settings();
  s.block = el('sd_block').value.trim();
  const passage = el('sd_passage').value.trim();
  if (!s.block) {
    setStatus('sd_status4', '文风块是空的。', 'error');
    return;
  }
  if (!passage) {
    setStatus('sd_status4', '先贴一段默认 AI 腔。', 'error');
    return;
  }
  if (!lockOr('sd_status4')) return;
  cancelled = false;
  setStatus('sd_status4', '改写中…');
  el('sd_dorewrite').disabled = true;
  try {
    const key = hashKey({ block: s.block, passage });
    const { data, cached } = await cachedRun(
      'rewrite',
      key,
      async () => (await callModel(Prompts.rewrite({ block: s.block, passage }))).trim(),
      force
    );
    s.passage = passage;
    s.rewrite = data;
    el('sd_rewrite').value = s.rewrite;
    setStatus('sd_status4', cached ? '输入没变，用上次结果，未再调用 API。' : '判一下像不像。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_status4', String(e.message || e), 'error');
  } finally {
    el('sd_dorewrite').disabled = false;
    busy = false;
  }
}

function slug() {
  const n = (settings().name || '文风').trim();
  return n.replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 40) || '文风';
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function buildJSON() {
  const s = settings();
  return {
    name: s.name,
    source: s.source,
    genre: s.genre,
    belief_core: s.read2 ? s.read2.belief_core : '',
    neighbor_diff: s.read2 ? s.read2.neighbor_diff : '',
    syntax: s.read1 ? s.read1.syntax : null,
    rhetoric: s.read1 ? s.read1.rhetoric : null,
    samples: s.read1 ? s.read1.samples || [] : [],
    blacklist: selectedBlacklist(),
    block: el('sd_block').value,
    pool: s.read1 || null,
    read2: s.read2 || null,
    draft: s.draft || null,
    test: { passage: s.passage, rewrite: s.rewrite, verdict: s.verdict },
    play: { mode: s.playMode },
    thrifty: !!s.thrifty,
    stats: s.stats
  };
}

function clampPos(pos, w, h) {
  if (!pos) return pos;
  return {
    x: Math.max(0, Math.min(window.innerWidth - (w || 0), pos.x)),
    y: Math.max(0, Math.min(window.innerHeight - (h || 0), pos.y))
  };
}

function applyFab() {
  const s = settings();
  const f = el('sd_fab');
  if (!f) return;
  f.style.display = s.showFab ? 'flex' : 'none';
  if (s.fabPos) {
    const p = clampPos(s.fabPos, f.offsetWidth || 52, f.offsetHeight || 52);
    f.style.left = p.x + 'px';
    f.style.top = p.y + 'px';
    f.style.right = 'auto';
    f.style.bottom = 'auto';
  }
}

function applyPanel() {
  const s = settings();
  const p = el('sd_panel');
  if (!p) return;
  if (!s.panelOpen) {
    p.style.display = 'none';
    return;
  }
  p.style.display = 'flex';
  if (s.panelPos) {
    const width = p.offsetWidth || Math.min(420, window.innerWidth * 0.92);
    const p2 = clampPos(s.panelPos, width, 60);
    p.style.left = p2.x + 'px';
    p.style.top = p2.y + 'px';
    p.style.right = 'auto';
    p.style.bottom = 'auto';
  } else {
    const w = Math.min(420, window.innerWidth * 0.92);
    p.style.left = Math.max(8, (window.innerWidth - w) / 2) + 'px';
    p.style.top = '70px';
    p.style.right = 'auto';
    p.style.bottom = 'auto';
  }
}

function applyLayer() {
  const layer = el('sd_layer');
  if (!layer) return;
  const s = settings();
  layer.style.display = s.showFab || s.panelOpen ? '' : 'none';
}

function restoreLayer() {
  const s = settings();
  if (s.rememberKey && !sessionKey) sessionKey = readStoredKey();
  el('sd_baseurl').value = s.baseUrl || '';
  el('sd_apikey').value = getApiKey();
  el('sd_rememberkey').checked = !!s.rememberKey;
  el('sd_model').value = s.model || '';
  el('sd_temp').value = s.temperature != null ? s.temperature : 0.7;
  el('sd_tempval').textContent = String(el('sd_temp').value);
  updateMode();
  el('sd_source').value = s.source;
  el('sd_genre').value = s.genre;
  el('sd_thrifty').checked = !!s.thrifty;
  el('sd_name').value = s.name;
  el('sd_corpus').value = s.corpus;
  renderCorpusStat();
  el('sd_passage').value = s.passage || DEFAULT_PASSAGE;
  el('sd_rewrite').value = s.rewrite || '';
  el('sd_block').value = s.block || '';
  el('sd_play').value = s.playMode || 'none';
  if (s.read1) renderReadout(el('sd_readout'), Object.assign({}, s.read1, { draft: s.source === 'reference' ? s.draft : null }));
  if (s.beliefs && s.beliefs.length) renderBeliefs();
  if (s.read2) renderReadout(el('sd_position'), s.read2);
  if (s.blacklist && s.blacklist.length) renderBlacklist();
  renderStats();
}

function restoreSettings() {
  const s = settings();
  if (el('sd_showfab')) el('sd_showfab').checked = !!s.showFab;
  renderStats();
}

function makeFab(fab) {
  fab.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = fab.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = rect.left;
    const origY = rect.top;
    let moved = false;
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      fab.style.left = Math.max(0, Math.min(window.innerWidth - fab.offsetWidth, origX + dx)) + 'px';
      fab.style.top = Math.max(0, Math.min(window.innerHeight - fab.offsetHeight, origY + dy)) + 'px';
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const r = fab.getBoundingClientRect();
      const s = settings();
      s.fabPos = { x: r.left, y: r.top };
      if (!moved) {
        s.panelOpen = !s.panelOpen;
        save();
        applyPanel();
        applyLayer();
      } else {
        save();
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });
}

function makePanelDrag(handle, target, savePos) {
  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.sd-panel-close') || e.target.closest('.sd-panel-stop')) return;
    const rect = target.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = rect.left;
    const origY = rect.top;
    const move = (ev) => {
      const x = Math.max(0, Math.min(window.innerWidth - 60, origX + ev.clientX - startX));
      const y = Math.max(0, Math.min(window.innerHeight - 44, origY + ev.clientY - startY));
      target.style.left = x + 'px';
      target.style.top = y + 'px';
      target.style.right = 'auto';
      target.style.bottom = 'auto';
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const r = target.getBoundingClientRect();
      savePos({ x: r.left, y: r.top });
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });
}

function forceFromEvent(e) {
  return !!(e && e.shiftKey);
}

function bindLayer() {
  el('sd_read1').addEventListener('click', (e) => runRead1(forceFromEvent(e)));
  el('sd_read2').addEventListener('click', (e) => runRead2(forceFromEvent(e)));
  el('sd_compose').addEventListener('click', (e) => runCompose(forceFromEvent(e)));
  el('sd_dorewrite').addEventListener('click', (e) => runRewrite(forceFromEvent(e)));

  el('sd_readout').addEventListener('click', (e) => {
    const btn = e.target.closest('.sd-refresh');
    if (btn) runRefineLayer(btn.dataset.layer);
  });

  el('sd_mode').addEventListener('change', (e) => { settings().mode = e.target.value; save(); updateMode(); });
  el('sd_baseurl').addEventListener('input', (e) => { settings().baseUrl = e.target.value.trim(); save(); });
  el('sd_apikey').addEventListener('input', (e) => { setApiKey(e.target.value.trim()); save(); });
  el('sd_rememberkey').addEventListener('change', (e) => {
    settings().rememberKey = e.target.checked;
    const v = el('sd_apikey').value.trim();
    sessionKey = v;
    if (e.target.checked) storeKey(v);
    else clearStoredKey();
    save();
  });
  el('sd_model').addEventListener('input', (e) => { settings().model = e.target.value.trim(); save(); });
  el('sd_temp').addEventListener('input', (e) => {
    settings().temperature = Number(e.target.value);
    el('sd_tempval').textContent = String(e.target.value);
    save();
  });
  el('sd_pull').addEventListener('click', pullModels);

  el('sd_source').addEventListener('change', (e) => { settings().source = e.target.value; save(); });
  el('sd_genre').addEventListener('change', (e) => { settings().genre = e.target.value; save(); });
  el('sd_thrifty').addEventListener('change', (e) => { settings().thrifty = e.target.checked; save(); });
  el('sd_name').addEventListener('input', (e) => { settings().name = e.target.value; save(); });
  el('sd_corpus').addEventListener('input', (e) => { settings().corpus = e.target.value; save(); renderCorpusStat(); });
  el('sd_passage').addEventListener('input', (e) => { settings().passage = e.target.value; save(); });
  el('sd_block').addEventListener('input', (e) => { settings().block = e.target.value; save(); });
  el('sd_play').addEventListener('change', (e) => { settings().playMode = e.target.value; save(); });

  el('sd_blackaddbtn').addEventListener('click', () => {
    const v = el('sd_blackadd').value.trim();
    if (!v) return;
    settings().blacklist.push({ text: v, on: true });
    el('sd_blackadd').value = '';
    renderBlacklist();
    save();
  });

  el('sd_like').addEventListener('click', () => {
    settings().verdict = 'like';
    setStatus('sd_status4', '像，可以拿走了。', 'ok');
    save();
  });
  el('sd_unlike').addEventListener('click', () => {
    settings().verdict = 'unlike';
    setStatus('sd_status4', '不像。点某一层的「重蒸」，只重蒸漂的那层。', 'error');
    save();
  });

  el('sd_copy').addEventListener('click', async () => {
    const text = el('sd_block').value;
    try {
      await navigator.clipboard.writeText(text);
      setStatus('sd_status5', '文风块已复制。', 'ok');
    } catch (e) {
      setStatus('sd_status5', '复制失败，请手动选中。', 'error');
    }
  });

  el('sd_dljson').addEventListener('click', () => {
    download(slug() + '.json', JSON.stringify(buildJSON(), null, 2));
    setStatus('sd_status5', 'JSON 已下载。', 'ok');
  });

  el('sd_panel_close').addEventListener('click', () => {
    settings().panelOpen = false;
    save();
    applyPanel();
    applyLayer();
  });
  el('sd_stop').addEventListener('click', stopRun);

  makeFab(el('sd_fab'));
  makePanelDrag(el('sd_panel_head'), el('sd_panel'), (pos) => {
    settings().panelPos = pos;
    save();
  });

  window.addEventListener('resize', () => {
    applyFab();
    applyPanel();
  });
}

function bindSettings() {
  const node = el('sd_showfab');
  if (!node) return;
  node.addEventListener('change', (e) => {
    settings().showFab = e.target.checked;
    save();
    applyFab();
    applyPanel();
    applyLayer();
  });
}

let layerMounted = false;
let settingsMounted = false;
let hooked = false;
let bootTimer = null;
let bootTries = 0;

function mountLayer() {
  if (layerMounted) return true;
  if (!document.body) return false;
  if (!el('sd_layer')) {
    const layer = document.createElement('div');
    layer.id = 'sd_layer';
    layer.className = 'sd-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;';
    layer.innerHTML = fabTpl + panelTpl;
    document.body.appendChild(layer);
  }
  layerMounted = true;
  restoreLayer();
  bindLayer();
  applyFab();
  applyPanel();
  applyLayer();
  console.log('[大厨烹饪处] 悬浮球已挂载');
  return true;
}

function settingsHost() {
  return (
    document.getElementById('extensions_settings2') ||
    document.getElementById('extensions_settings') ||
    null
  );
}

function mountSettings() {
  if (settingsMounted) return true;
  if (!el('sd_root')) {
    const host = settingsHost();
    if (!host) return false;
    host.insertAdjacentHTML('beforeend', settingsTpl);
  }
  settingsMounted = true;
  restoreSettings();
  bindSettings();
  return true;
}

function addUI() {
  try {
    mountLayer();
  } catch (e) {
    console.error('[style-distiller] 挂载悬浮球失败', e);
  }
  try {
    mountSettings();
  } catch (e) {
    console.error('[style-distiller] 挂载设置项失败', e);
  }
  bootTries += 1;
  if ((layerMounted && settingsMounted) || bootTries > 150) {
    if (bootTimer) {
      clearInterval(bootTimer);
      bootTimer = null;
    }
  }
}

function startBootstrap() {
  if (hooked) {
    addUI();
    return;
  }
  hooked = true;
  try {
    migrateKey();
  } catch (e) {
    console.error('[大厨烹饪处] 迁移 Key 失败', e);
  }
  try {
    const { eventSource, event_types } = ctx();
    eventSource.on(event_types.APP_READY, addUI);
    if (event_types.APP_INITIALIZED) eventSource.on(event_types.APP_INITIALIZED, addUI);
  } catch (e) {
    console.error('[style-distiller] 事件挂钩失败，改用轮询', e);
  }
  addUI();
  if (!bootTimer) bootTimer = setInterval(addUI, 400);
}

export function onActivate() {
  startBootstrap();
}

export function onEnable() {
  const root = el('sd_root');
  if (root) root.style.display = '';
  startBootstrap();
  applyFab();
  applyPanel();
  applyLayer();
}

export function onDisable() {
  const root = el('sd_root');
  if (root) root.style.display = 'none';
  const layer = el('sd_layer');
  if (layer) layer.style.display = 'none';
}

if (typeof jQuery !== 'undefined') {
  jQuery(() => startBootstrap());
} else if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', startBootstrap);
}

