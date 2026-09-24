import * as Prompts from './prompts.js';

const MODULE_NAME = 'style-distiller';
const DEFAULT_PASSAGE =
  '在这个快节奏的时代，我们常常被生活的洪流裹挟着前行。值得注意的是，真正的成长往往发生在那些不经意的瞬间。不禁让人感叹，时间的流逝是如此悄无声息。阳光透过窗户洒进来，宛如一层薄纱，映入眼帘的，是一抹淡淡的温暖。';

const defaultSettings = Object.freeze({
  mode: 'st',
  baseUrl: '',
  rememberKey: true,
  stream: false,
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
  uncertain: [],
  block: '',
  passage: DEFAULT_PASSAGE,
  rewrite: '',
  verdict: '',
  playMode: 'none',
  thrifty: true,
  styles: [],
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
    <div class="sd-note">打开方式：点输入框右侧的「魔法棒」按钮，在菜单里选<b>大厨烹饪处</b>。本会话已调用模型 <b id="sd_stats_root">0 次</b>。</div>
    <div class="sd-note">省 API：同样的输入只用调一次；面板里默认开着「省流」，七遍读只花一次调用；面板顶部会显示命中缓存省下的次数。</div>
  </div>
</div>`;

const menuItemTpl = `<div id="sd_menuitem" class="list-group-item flex-container flexGap5 interactable" tabindex="0" role="button" title="大厨烹饪处"><div class="fa-solid fa-utensils extensionsMenuExtensionButton" aria-hidden="true"></div><span>大厨烹饪处</span></div>`;

const backdropTpl = `<div id="sd_backdrop" style="position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.5);display:none;"></div>`;

const panelTpl = `
<div class="sd-panel" id="sd_panel" style="position:fixed;z-index:2147483647;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,92vw);max-height:86vh;display:none;flex-direction:column;overflow:hidden;border-radius:14px;color:#eeeeee;background:#1b1e24;border:1px solid rgba(255,255,255,.18);box-shadow:0 12px 40px rgba(0,0,0,.45);">
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
        <label class="sd-check"><input id="sd_stream" type="checkbox"> <span>流式输出（只对自定义站子生效；边收边显示）</span></label>
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
      <div class="sd-inline">
        <button id="sd_takecard" class="menu_button">取角色卡</button>
        <button id="sd_takechat" class="menu_button">取聊天</button>
        <span id="sd_takestatus" class="sd-status"></span>
      </div>
      <div class="sd-actions">
        <button id="sd_read1" class="menu_button">开始六遍读</button>
        <span id="sd_status1" class="sd-status"></span>
      </div>
    </div>

    <div class="sd-sec">
      <div class="sd-sec-title">前三遍读<span class="sd-hint">点某一层的「重蒸」只重读那一层</span></div>
      <div id="sd_readout" class="sd-readout"></div>
    </div>

    <div class="sd-sec" id="sd_uncertain_wrap" style="display:none">
      <div class="sd-sec-title">卡点·拿不准<span class="sd-hint">模型不敢定的，你定夺后再成块</span></div>
      <div id="sd_uncertain" class="sd-cards"></div>
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
        <button id="sd_unlike" class="menu_button" title="判为不像会自动回炉重修文风块">不像（差就差到你满意）</button>
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
      <div class="sd-inline">
        <input id="sd_stylename" type="text" placeholder="存档名（默认用文风名）">
        <button id="sd_stylesave" class="menu_button">存为存档</button>
      </div>
      <div class="sd-inline">
        <select id="sd_stylelist"></select>
        <button id="sd_styleload" class="menu_button">载入</button>
        <button id="sd_styleover" class="menu_button">覆盖</button>
        <button id="sd_styledel" class="menu_button">删除</button>
      </div>
      <div id="sd_stylestatus" class="sd-status"></div>
      <div class="sd-actions">
        <button id="sd_copy" class="menu_button">复制文风块</button>
        <button id="sd_dljson" class="menu_button">下载 JSON</button>
        <button id="sd_import" class="menu_button">导入 JSON</button>
        <input id="sd_importfile" type="file" accept=".json,application/json" style="display:none">
        <span id="sd_status5" class="sd-status"></span>
      </div>
      <div class="sd-inline">
        <select id="sd_wilist"></select>
        <input id="sd_winame" type="text" placeholder="或填新世界书名">
        <button id="sd_wiexport" class="menu_button">导出世界书</button>
        <button id="sd_wisave" class="menu_button">写入世界书</button>
      </div>
      <div id="sd_wistatus" class="sd-status"></div>
    </div>
  </div>
</div>`;

function ctx() {
  // 1.16+：优先官方入口；兼容部分打包/代理环境
  if (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function') {
    return SillyTavern.getContext();
  }
  if (typeof window !== 'undefined' && window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
    return window.SillyTavern.getContext();
  }
  throw new Error('SillyTavern.getContext 不可用，请确认酒馆版本 ≥ 1.16 且扩展已启用');
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

async function generateViaCustomStream(messages, signal, onDelta) {
  const s = settings();
  const key = getApiKey();
  if (!s.baseUrl || !key || !s.model) {
    throw new Error('先填好自定义站子的 Base URL / Key / 模型');
  }
  const url = s.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ model: s.model, messages, temperature: Number(s.temperature) || 0.7, stream: true, stream_options: { include_usage: true } }),
    signal
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error('HTTP ' + res.status + ' · ' + t.slice(0, 180));
  }
  if (!res.body || typeof res.body.getReader !== 'function') {
    return generateViaCustom(messages, signal);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let out = '';
  let tokens = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let obj = null;
      try {
        obj = JSON.parse(payload);
      } catch (e) {
        continue;
      }
      const delta = obj.choices && obj.choices[0] && obj.choices[0].delta ? obj.choices[0].delta.content : '';
      if (delta) {
        out += delta;
        if (onDelta) onDelta(out);
      }
      if (obj.usage && (obj.usage.total_tokens || obj.usage.totalTokenCount)) {
        tokens = obj.usage.total_tokens || obj.usage.totalTokenCount;
      }
    }
  }
  if (tokens) settings().stats.tokens += Number(tokens) || 0;
  return out;
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

async function callModel(messages, onDelta) {
  if (cancelled) throw new Error('已停止');
  if (settings().mode === 'custom') {
    activeController = new AbortController();
    try {
      let out;
      if (settings().stream && typeof onDelta === 'function') {
        try {
          out = await generateViaCustomStream(messages, activeController.signal, onDelta);
        } catch (e) {
          if (cancelled) throw e;
          if (typeof onDelta === 'function') onDelta('');
          out = await generateViaCustom(messages, activeController.signal);
        }
      } else {
        out = await generateViaCustom(messages, activeController.signal);
      }
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

function renderUncertain() {
  const s = settings();
  const wrap = el('sd_uncertain_wrap');
  const target = el('sd_uncertain');
  if (!wrap || !target) return;
  const list = s.uncertain || [];
  wrap.style.display = list.length ? '' : 'none';
  target.innerHTML = list
    .map(
      (u, i) =>
        '<div class="sd-card" data-i="' + i + '">' +
        '<div class="sd-cardbody">' +
        '<div class="sd-meta">拿不准：' + esc(u.q) + '</div>' +
        '<input type="text" class="sd-utext" placeholder="你定：……" value="' + esc(u.ruling || '') + '">' +
        '</div></div>'
    )
    .join('');
  target.querySelectorAll('.sd-card').forEach((card) => {
    const i = Number(card.dataset.i);
    card.querySelector('.sd-utext').addEventListener('input', (e) => {
      settings().uncertain[i].ruling = e.target.value;
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

function selectedRulings() {
  return (settings().uncertain || [])
    .filter((u) => u.ruling && u.ruling.trim())
    .map((u) => '- ' + String(u.q).trim() + ' → ' + u.ruling.trim())
    .join('\n');
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
    s.uncertain = (s.source === 'reference' && data.draft && Array.isArray(data.draft.uncertain) ? data.draft.uncertain : []).map((q) => ({
      q: String(q),
      ruling: ''
    }));
    const shownDraft = s.source === 'reference' ? s.draft : null;
    renderReadout(el('sd_readout'), Object.assign({}, s.read1, { draft: shownDraft }));
    renderBeliefs();
    renderUncertain();
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
    const rulings = selectedRulings();
    const key = hashKey({ name: s.name, genre: s.genre, read1: s.read1, read2: s.read2, samples, blacklist: selectedBlacklist(), rulings });
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
              blacklist: selectedBlacklist(),
              rulings
            }),
            (chunk) => {
              el('sd_block').value = chunk;
            }
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
      async () =>
        (
          await callModel(Prompts.rewrite({ block: s.block, passage }), (chunk) => {
            el('sd_rewrite').value = chunk;
          })
        ).trim(),
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

async function runRework(force) {
  const s = settings();
  s.block = el('sd_block').value.trim();
  const passage = el('sd_passage').value.trim();
  const bad = (s.rewrite || el('sd_rewrite').value || '').trim();
  if (!s.block) {
    setStatus('sd_status4', '文风块是空的，先成块。', 'error');
    return;
  }
  if (!passage || !bad) {
    setStatus('sd_status4', '先跑一次改写再判像不像。', 'error');
    return;
  }
  if (!lockOr('sd_status4')) return;
  cancelled = false;
  setStatus('sd_status4', '不像，回炉重修…');
  el('sd_unlike').disabled = true;
  try {
    const key = hashKey({ stage: 'rework', block: s.block, passage, bad });
    const { data } = await cachedRun(
      'rework',
      key,
      async () =>
        (
          await callModel(Prompts.rework({ block: s.block, passage, badRewrite: bad }), (chunk) => {
            el('sd_block').value = chunk;
          })
        ).trim(),
      true
    );
    s.block = data;
    el('sd_block').value = s.block;
    setStatus('sd_status4', '回炉好了，再拿一段测。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_status4', String(e.message || e), 'error');
  } finally {
    el('sd_unlike').disabled = false;
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
    uncertain: s.uncertain || [],
    test: { passage: s.passage, rewrite: s.rewrite, verdict: s.verdict },
    play: { mode: s.playMode },
    thrifty: !!s.thrifty,
    stats: s.stats
  };
}

const STYLE_LIMIT = 50;

function styleLabel(it) {
  const d = new Date(it.savedAt || Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  return it.name + '（' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '）';
}

function currentSnapshot() {
  const s = settings();
  return {
    name: s.name,
    source: s.source,
    genre: s.genre,
    read1: s.read1,
    beliefs: s.beliefs,
    read2: s.read2,
    blacklist: s.blacklist,
    draft: s.draft,
    uncertain: s.uncertain,
    block: el('sd_block').value,
    passage: s.passage,
    rewrite: s.rewrite,
    verdict: s.verdict,
    playMode: s.playMode
  };
}

function applySnapshot(data) {
  const s = settings();
  s.name = data.name || '';
  s.source = data.source || 'mine';
  s.genre = data.genre || 'narration';
  s.read1 = data.read1 || null;
  s.beliefs = data.beliefs || [];
  s.read2 = data.read2 || null;
  s.blacklist = data.blacklist || [];
  s.draft = data.draft || null;
  s.uncertain = data.uncertain || [];
  s.block = data.block || '';
  s.passage = data.passage || DEFAULT_PASSAGE;
  s.rewrite = data.rewrite || '';
  s.verdict = data.verdict || '';
  s.playMode = data.playMode || 'none';
  restoreLayer();
  save();
}

function normalizeBeliefs(list) {
  return (list || []).map((b) =>
    typeof b === 'string'
      ? { belief: b, evidence: '', counter: '', on: true }
      : { belief: b.belief || '', evidence: b.evidence || '', counter: b.counter || '', on: b.on !== false }
  );
}

function snapshotFromJSON(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const read1 = raw.pool || raw.k1 || (raw.syntax ? raw : null);
  const read2 = raw.read2 || raw.k2 || null;
  if (!read1 && !read2 && !raw.block) return null;
  const draft = raw.draft || (read1 && read1.draft) || null;
  const test = raw.test || {};
  const play = raw.play || {};
  return {
    name: raw.name || '',
    source: raw.source || 'mine',
    genre: raw.genre || 'narration',
    read1: read1 || null,
    beliefs: normalizeBeliefs(raw.beliefs || (read1 && read1.beliefs)),
    read2: read2,
    blacklist: mapBlacklist(raw.blacklist || (read2 && read2.blacklist)),
    draft: draft,
    uncertain: (raw.uncertain || (draft && draft.uncertain) || []).map((u) =>
      typeof u === 'string' ? { q: u, ruling: '' } : { q: u.q || '', ruling: u.ruling || '' }
    ),
    block: raw.block || '',
    passage: test.passage || DEFAULT_PASSAGE,
    rewrite: test.rewrite || '',
    verdict: test.verdict || '',
    playMode: play.mode || 'none'
  };
}

function buildLorebookEntry(name, content, uid) {
  return {
    uid,
    key: [name],
    keysecondary: [],
    comment: name,
    content,
    constant: true,
    vectorized: false,
    selective: false,
    selectiveLogic: 0,
    addMemo: true,
    order: 100,
    position: 0,
    disable: false,
    excludeRecursion: false,
    preventRecursion: false,
    delayUntilRecursion: false,
    probability: 100,
    useProbability: true,
    depth: 4,
    group: '',
    groupOverride: false,
    groupWeight: 100,
    scanDepth: null,
    caseSensitive: null,
    matchWholeWords: null,
    useGroupScoring: null,
    automationId: '',
    role: null,
    sticky: 0,
    cooldown: 0,
    delay: 0,
    displayIndex: uid
  };
}

function buildLorebook(name, content) {
  return { name, entries: { 0: buildLorebookEntry(name, content, 0) } };
}

function renderWiList() {
  const sel = el('sd_wilist');
  if (!sel) return;
  let names = [];
  try {
    const c = SillyTavern.getContext();
    names = c && typeof c.getWorldInfoNames === 'function' ? c.getWorldInfoNames() : [];
  } catch (e) {
    names = [];
  }
  sel.innerHTML = names.length
    ? names.map((n) => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('')
    : '<option value="">（没有已有世界书）</option>';
}

function renderStyles(selectedId) {
  const sel = el('sd_stylelist');
  if (!sel) return;
  const list = settings().styles || [];
  if (!list.length) {
    sel.innerHTML = '<option value="">（还没有存档）</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  const keep = (selectedId !== undefined ? selectedId : sel.value) || '';
  sel.innerHTML = list.map((it) => '<option value="' + it.id + '">' + esc(styleLabel(it)) + '</option>').join('');
  if (keep && list.some((it) => it.id === keep)) sel.value = keep;
}

function applyPanel() {
  const s = settings();
  const p = el('sd_panel');
  const b = el('sd_backdrop');
  if (!p) return;
  if (!s.panelOpen) {
    p.style.display = 'none';
    if (b) b.style.display = 'none';
    return;
  }
  p.style.display = 'flex';
  p.style.left = '50%';
  p.style.top = '50%';
  p.style.transform = 'translate(-50%,-50%)';
  if (b) b.style.display = 'block';
}

function setVal(id, value, prop) {
  const node = el(id);
  if (!node) return;
  if (prop === 'checked') node.checked = !!value;
  else if (prop === 'text') node.textContent = value == null ? '' : String(value);
  else node.value = value == null ? '' : value;
}

function restoreLayer() {
  const s = settings();
  if (s.rememberKey && !sessionKey) sessionKey = readStoredKey();
  setVal('sd_baseurl', s.baseUrl || '');
  setVal('sd_apikey', getApiKey());
  setVal('sd_rememberkey', !!s.rememberKey, 'checked');
  setVal('sd_stream', !!s.stream, 'checked');
  setVal('sd_model', s.model || '');
  setVal('sd_temp', s.temperature != null ? s.temperature : 0.7);
  const tempNode = el('sd_temp');
  setVal('sd_tempval', tempNode ? tempNode.value : '0.7', 'text');
  try { updateMode(); } catch (e) { console.warn('[大厨烹饪处] updateMode', e); }
  setVal('sd_source', s.source || 'mine');
  setVal('sd_genre', s.genre || 'narration');
  setVal('sd_thrifty', s.thrifty !== false, 'checked');
  setVal('sd_name', s.name || '');
  setVal('sd_corpus', s.corpus || '');
  try { renderCorpusStat(); } catch (e) { console.warn('[大厨烹饪处] renderCorpusStat', e); }
  setVal('sd_passage', s.passage || DEFAULT_PASSAGE);
  setVal('sd_rewrite', s.rewrite || '');
  setVal('sd_block', s.block || '');
  setVal('sd_play', s.playMode || 'none');
  try {
    if (s.read1) renderReadout(el('sd_readout'), Object.assign({}, s.read1, { draft: s.source === 'reference' ? s.draft : null }));
  } catch (e) { console.warn('[大厨烹饪处] renderReadout1', e); }
  try { if (s.beliefs && s.beliefs.length) renderBeliefs(); } catch (e) { console.warn('[大厨烹饪处] renderBeliefs', e); }
  try { if (s.read2) renderReadout(el('sd_position'), s.read2); } catch (e) { console.warn('[大厨烹饪处] renderReadout2', e); }
  try { if (s.blacklist && s.blacklist.length) renderBlacklist(); } catch (e) { console.warn('[大厨烹饪处] renderBlacklist', e); }
  try { renderUncertain(); } catch (e) { console.warn('[大厨烹饪处] renderUncertain', e); }
  try { renderStyles(); } catch (e) { console.warn('[大厨烹饪处] renderStyles', e); }
  try { renderWiList(); } catch (e) { console.warn('[大厨烹饪处] renderWiList', e); }
  try { renderStats(); } catch (e) { console.warn('[大厨烹饪处] renderStats', e); }
}

function restoreSettings() {
  renderStats();
}

function togglePanel() {
  const s = settings();
  s.panelOpen = !s.panelOpen;
  save();
  applyPanel();
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
  el('sd_stream').addEventListener('change', (e) => { settings().stream = e.target.checked; save(); });
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

  function applyTakenCorpus(text, note) {
    settings().corpus = text;
    el('sd_corpus').value = text;
    renderCorpusStat();
    save();
    setStatus('sd_takestatus', note, 'ok');
  }

  el('sd_takecard').addEventListener('click', () => {
    const c = SillyTavern.getContext();
    let f = null;
    try {
      if (typeof c.getCharacterCardFields === 'function') f = c.getCharacterCardFields();
      if (!f && c.characters && c.characters[c.characterId]) {
        const ch = c.characters[c.characterId];
        f = { description: ch.description, personality: ch.personality, scenario: ch.scenario, mesExamples: ch.mes_example };
      }
    } catch (e) {
      f = null;
    }
    if (!f) {
      setStatus('sd_takestatus', '拿不到当前角色卡。', 'error');
      return;
    }
    const parts = [f.description, f.personality, f.scenario, f.mesExamples || f.mes_example || f.exampleMessages]
      .map((x) => String(x || '').trim())
      .filter(Boolean);
    const text = parts.join('\n\n').trim();
    if (!text) {
      setStatus('sd_takestatus', '角色卡里没有可用文字。', 'error');
      return;
    }
    applyTakenCorpus(text, '已取角色卡语料（' + text.length + ' 字），可再增删。');
  });

  el('sd_takechat').addEventListener('click', () => {
    const c = SillyTavern.getContext();
    const chat = Array.isArray(c.chat) ? c.chat : [];
    const msgs = chat.filter((m) => m && !m.is_user && typeof m.mes === 'string' && m.mes.trim()).map((m) => m.mes.trim());
    const text = msgs.join('\n\n').trim();
    if (!text) {
      setStatus('sd_takestatus', '当前聊天里没有角色发言。', 'error');
      return;
    }
    applyTakenCorpus(text, '已取 ' + msgs.length + ' 条角色发言（' + text.length + ' 字），可再增删。');
  });
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
    save();
    runRework();
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

  el('sd_import').addEventListener('click', () => el('sd_importfile').click());
  el('sd_importfile').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const snap = snapshotFromJSON(raw);
      if (!snap) throw new Error('看不懂这个文件');
      applySnapshot(snap);
      setStatus('sd_status5', '已导入并铺回面板。', 'ok');
    } catch (err) {
      setStatus('sd_status5', '导入失败：' + String(err.message || err), 'error');
    }
  });

  el('sd_wiexport').addEventListener('click', () => {
    const s = settings();
    const block = el('sd_block').value.trim();
    if (!block) {
      setStatus('sd_wistatus', '文风块是空的，先成块。', 'error');
      return;
    }
    const name = s.name.trim() || '文风';
    download(slug() + '-worldinfo.json', JSON.stringify(buildLorebook(name, block), null, 2));
    setStatus('sd_wistatus', '世界书 JSON 已下载，用「世界信息」的导入加载。', 'ok');
  });

  el('sd_wisave').addEventListener('click', async () => {
    const c = SillyTavern.getContext();
    if (typeof c.loadWorldInfo !== 'function' || typeof c.saveWorldInfo !== 'function') {
      setStatus('sd_wistatus', '这本酒馆版本没有世界书写入接口，请改用「导出世界书」。', 'error');
      return;
    }
    const s = settings();
    const block = el('sd_block').value.trim();
    if (!block) {
      setStatus('sd_wistatus', '文风块是空的，先成块。', 'error');
      return;
    }
    const pick = el('sd_wilist').value || '';
    const name = el('sd_winame').value.trim() || pick || s.name.trim() || '文风';
    const key = s.name.trim() || name;
    if (!window.confirm('把文风块作为一条常驻 entry 写入世界书「' + name + '」？\n触发关键词：' + key)) return;
    try {
      const data = (await c.loadWorldInfo(name)) || { entries: {} };
      if (!data.entries) data.entries = {};
      const uids = Object.keys(data.entries)
        .map((k) => Number(data.entries[k] && data.entries[k].uid != null ? data.entries[k].uid : k))
        .filter((n) => Number.isFinite(n));
      const uid = uids.length ? Math.max(...uids) + 1 : 0;
      data.entries[uid] = buildLorebookEntry(key, block, uid);
      await c.saveWorldInfo(name, data, true);
      if (typeof c.reloadWorldInfoEditor === 'function') c.reloadWorldInfoEditor(name);
      renderWiList();
      setStatus('sd_wistatus', '已写入「' + name + '」，去「世界信息」看看。', 'ok');
    } catch (e) {
      setStatus('sd_wistatus', '写入失败：' + String(e.message || e), 'error');
    }
  });

  el('sd_stylesave').addEventListener('click', () => {
    const s = settings();
    if ((s.styles || []).length >= STYLE_LIMIT) {
      setStatus('sd_stylestatus', '存档满了（' + STYLE_LIMIT + ' 份），先删几份。', 'error');
      return;
    }
    const name = el('sd_stylename').value.trim() || s.name.trim() || '未命名文风';
    const item = { id: 'st_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), schema: 1, name, savedAt: Date.now(), data: currentSnapshot() };
    s.styles = (s.styles || []).concat([item]);
    renderStyles(item.id);
    setStatus('sd_stylestatus', '已存为「' + name + '」。', 'ok');
    save();
  });

  el('sd_styleload').addEventListener('click', () => {
    const id = el('sd_stylelist').value;
    const item = (settings().styles || []).find((it) => it.id === id);
    if (!item) {
      setStatus('sd_stylestatus', '先选一份存档。', 'error');
      return;
    }
    applySnapshot(item.data);
    renderStyles(id);
    setStatus('sd_stylestatus', '已载入「' + item.name + '」。', 'ok');
  });

  el('sd_styleover').addEventListener('click', () => {
    const item = (settings().styles || []).find((it) => it.id === el('sd_stylelist').value);
    if (!item) {
      setStatus('sd_stylestatus', '先选一份存档。', 'error');
      return;
    }
    item.data = currentSnapshot();
    item.savedAt = Date.now();
    renderStyles(item.id);
    setStatus('sd_stylestatus', '已用当前内容覆盖「' + item.name + '」。', 'ok');
    save();
  });

  el('sd_styledel').addEventListener('click', () => {
    const s = settings();
    const item = (s.styles || []).find((it) => it.id === el('sd_stylelist').value);
    if (!item) {
      setStatus('sd_stylestatus', '先选一份存档。', 'error');
      return;
    }
    if (!window.confirm('删除存档「' + item.name + '」？删了就找不回。')) return;
    s.styles = (s.styles || []).filter((it) => it.id !== item.id);
    renderStyles('');
    setStatus('sd_stylestatus', '已删除。', 'ok');
    save();
  });

  el('sd_panel_close').addEventListener('click', () => {
    settings().panelOpen = false;
    save();
    applyPanel();
  });
  el('sd_stop').addEventListener('click', stopRun);

  const backdrop = el('sd_backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      settings().panelOpen = false;
      save();
      applyPanel();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el('sd_panel') && el('sd_panel').style.display !== 'none') {
      settings().panelOpen = false;
      save();
      applyPanel();
    }
  });
}

function bindSettings() {
  // 设置抽屉只展示说明，无开关需要绑定
}

let menuMounted = false;
let layerMounted = false;
let layerBound = false;
let settingsMounted = false;
let hooked = false;
let bootTimer = null;
let bootTries = 0;

function ensureLayerDom() {
  if (!document.body) return false;

  // 清掉旧版的悬浮球与全屏图层（升级后不再需要）
  ['sd_fab', 'sd_layer'].forEach((id) => {
    const node = el(id);
    if (node && node.parentNode) node.parentNode.removeChild(node);
  });

  if (!el('sd_backdrop')) {
    const wrap = document.createElement('div');
    wrap.innerHTML = backdropTpl;
    document.body.appendChild(wrap.firstElementChild);
  }
  if (!el('sd_panel')) {
    const wrap = document.createElement('div');
    wrap.innerHTML = panelTpl.trim();
    document.body.appendChild(wrap.firstElementChild);
  }
  return !!el('sd_panel');
}

function mountLayer() {
  if (!document.body) return false;
  try {
    if (!ensureLayerDom()) return false;
  } catch (e) {
    console.error('[大厨烹饪处] 创建面板失败', e);
    return false;
  }

  try {
    applyPanel();
  } catch (e) {
    console.warn('[大厨烹饪处] applyPanel 失败', e);
  }

  if (!layerBound) {
    try {
      restoreLayer();
    } catch (e) {
      console.error('[大厨烹饪处] restoreLayer 失败（面板仍可打开）', e);
    }
    try {
      bindLayer();
      layerBound = true;
    } catch (e) {
      console.error('[大厨烹饪处] bindLayer 失败', e);
      layerBound = false;
    }
  }

  layerMounted = !!el('sd_panel');
  if (layerMounted) console.log('[大厨烹饪处] 面板已挂载（从魔法棒菜单打开）');
  return layerMounted;
}

function menuHost() {
  return (
    document.getElementById('extensionsMenu') ||
    document.getElementById('extensions_menu') ||
    null
  );
}

function bindMenuItem() {
  const item = el('sd_menuitem');
  if (!item || item.dataset.sdBound === '1') return;
  item.dataset.sdBound = '1';
  const open = (e) => {
    if (e) e.preventDefault();
    togglePanel();
  };
  item.addEventListener('click', open);
}

function mountMenu() {
  if (!el('sd_menuitem')) {
    const host = menuHost();
    if (!host) return false;
    host.insertAdjacentHTML('beforeend', menuItemTpl);
  }
  bindMenuItem();
  menuMounted = !!el('sd_menuitem');
  return menuMounted;
}

function settingsHost() {
  return (
    document.getElementById('extensions_settings2') ||
    document.getElementById('extensions_settings') ||
    null
  );
}

function mountSettings() {
  if (settingsMounted && el('sd_root')) return true;
  if (!el('sd_root')) {
    const host = settingsHost();
    if (!host) return false;
    host.insertAdjacentHTML('beforeend', settingsTpl);
  }
  try {
    restoreSettings();
    bindSettings();
    settingsMounted = true;
  } catch (e) {
    console.error('[大厨烹饪处] 挂载设置项失败', e);
    settingsMounted = !!el('sd_root');
  }
  return settingsMounted;
}

function addUI() {
  try {
    mountLayer();
  } catch (e) {
    console.error('[大厨烹饪处] 挂载面板失败', e);
    layerMounted = false;
    layerBound = false;
  }
  try {
    mountMenu();
  } catch (e) {
    console.error('[大厨烹饪处] 挂载菜单项失败', e);
  }
  try {
    mountSettings();
  } catch (e) {
    console.error('[大厨烹饪处] 挂载设置项失败', e);
  }
  bootTries += 1;
  if (layerMounted && menuMounted && settingsMounted && bootTimer) {
    clearInterval(bootTimer);
    bootTimer = null;
  } else if (bootTries > 300 && bootTimer) {
    clearInterval(bootTimer);
    bootTimer = null;
  }
}

function bindAppEvents() {
  try {
    const c = ctx();
    const es = c.eventSource;
    // 1.16+ 同时存在 event_types / eventTypes
    const et = c.event_types || c.eventTypes || {};
    if (!es || typeof es.on !== 'function') return false;
    const ready = et.APP_READY || 'app_ready';
    const inited = et.APP_INITIALIZED || 'app_initialized';
    const firstLoad = et.EXTENSIONS_FIRST_LOAD || 'extensions_first_load';
    es.on(ready, addUI);
    if (inited) es.on(inited, addUI);
    if (firstLoad) es.on(firstLoad, addUI);
    return true;
  } catch (e) {
    console.warn('[大厨烹饪处] 事件挂钩失败，改用轮询', e);
    return false;
  }
}

function startBootstrap() {
  if (hooked) {
    addUI();
    return;
  }
  hooked = true;
  console.log('[大厨烹饪处] bootstrap 开始', {
    readyState: typeof document !== 'undefined' ? document.readyState : 'n/a',
    hasST: typeof SillyTavern !== 'undefined',
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  });
  try {
    migrateKey();
  } catch (e) {
    console.error('[大厨烹饪处] 迁移 Key 失败', e);
  }
  bindAppEvents();
  addUI();
  if (!bootTimer) bootTimer = setInterval(addUI, 500);
  // 保险：菜单容器可能要等顶栏渲染完，2.5 秒后再补一次
  setTimeout(() => {
    try {
      mountMenu();
      mountLayer();
    } catch (e) {
      console.warn('[大厨烹饪处] 延迟挂载失败', e);
    }
  }, 2500);
}

export function onActivate() {
  startBootstrap();
}

export function onEnable() {
  const root = el('sd_root');
  if (root) root.style.display = '';
  startBootstrap();
  try {
    mountMenu();
    mountLayer();
    applyPanel();
  } catch (e) {
    console.error('[大厨烹饪处] onEnable 应用 UI 失败', e);
  }
}

export function onDisable() {
  const root = el('sd_root');
  if (root) root.style.display = 'none';
  const panel = el('sd_panel');
  if (panel) panel.style.display = 'none';
  const backdrop = el('sd_backdrop');
  if (backdrop) backdrop.style.display = 'none';
  const item = el('sd_menuitem');
  if (item && item.parentNode) item.parentNode.removeChild(item);
  menuMounted = false;
}

// 兼容 1.16+：扩展脚本往往在 DOMContentLoaded 之后才注入，
// 只监听 DOMContentLoaded 永远不会触发；必须立刻/在 ready 时启动。
function scheduleBootstrap() {
  try {
    startBootstrap();
  } catch (e) {
    console.error('[大厨烹饪处] 首次 bootstrap 失败，将重试', e);
    setTimeout(() => {
      try { startBootstrap(); } catch (e2) {
        console.error('[大厨烹饪处] bootstrap 重试仍失败', e2);
      }
    }, 500);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleBootstrap);
  } else {
    // 已经 interactive / complete：立刻挂（1.16/1.17/1.18 常见路径）
    scheduleBootstrap();
  }
}
if (typeof jQuery !== 'undefined') {
  jQuery(scheduleBootstrap);
}

