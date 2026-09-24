import * as Prompts from './prompts.js';

const MODULE_NAME = 'style-distiller';
const DEFAULT_PASSAGE =
  '在这个快节奏的时代，我们常常被生活的洪流裹挟着前行。值得注意的是，真正的成长往往发生在那些不经意的瞬间。不禁让人感叹，时间的流逝是如此悄无声息。阳光透过窗户洒进来，宛如一层薄纱，映入眼帘的，是一抹淡淡的温暖。';

const defaultSettings = Object.freeze({
  mode: 'st',
  baseUrl: '',
  apiKey: '',
  model: '',
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
  showFab: true,
  fabPos: null,
  panelPos: null,
  panelOpen: false
});

const settingsTpl = `
<div class="sd-root inline-drawer">
  <div class="inline-drawer-toggle inline-drawer-header">
    <b>大厨烹饪处 · 文风蒸馏</b>
    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
  </div>
  <div class="inline-drawer-content">
    <div class="sd-note">采料、慢炖、出锅：语料进，文风块出。文风块可填进预设的一条 prompt，或世界书的一条 entry。</div>
    <label class="sd-check"><input id="sd_showfab" type="checkbox"> <span>显示悬浮球（可拖动，点开就是大厨烹饪处）</span></label>
    <div class="sd-actions">
      <button id="sd_open" class="menu_button">打开大厨烹饪处</button>
    </div>
  </div>
</div>`;

const fabTpl = `<div class="sd-fab" id="sd_fab" title="大厨烹饪处"><i class="fa-solid fa-utensils"></i></div>`;

const panelTpl = `
<div class="sd-panel" id="sd_panel">
  <div class="sd-panel-head" id="sd_panel_head">
    <span>大厨烹饪处 · 文风蒸馏</span>
    <i class="fa-solid fa-xmark sd-panel-close" id="sd_panel_close"></i>
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
        <label class="sd-field"><span>模型</span>
          <div class="sd-inline">
            <input id="sd_model" type="text" list="sd_modellist" placeholder="deepseek-chat">
            <datalist id="sd_modellist"></datalist>
            <button id="sd_pull" class="menu_button">拉取模型</button>
          </div>
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
      </label>
      <div class="sd-actions">
        <button id="sd_read1" class="menu_button">开始六遍读</button>
        <span id="sd_status1" class="sd-status"></span>
      </div>
    </div>

    <div class="sd-sec">
      <div class="sd-sec-title">前三遍读</div>
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
    if (!Object.hasOwn(s, key)) s[key] = defaultSettings[key];
  }
  return s;
}

function save() {
  ctx().saveSettingsDebounced();
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
  let s = String(text || '').trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
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

async function generateViaCustom(messages) {
  const s = settings();
  if (!s.baseUrl || !s.apiKey || !s.model) {
    throw new Error('先填好自定义站子的 Base URL / Key / 模型');
  }
  const url = s.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.apiKey },
    body: JSON.stringify({ model: s.model, messages, temperature: 0.7 })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error('HTTP ' + res.status + ' · ' + t.slice(0, 180));
  }
  const data = await res.json();
  const msg = data.choices && data.choices[0] && data.choices[0].message;
  return (msg && msg.content) || '';
}

async function generate(messages) {
  return settings().mode === 'custom' ? generateViaCustom(messages) : generateRawViaST(messages);
}

async function pullModels() {
  const s = settings();
  s.baseUrl = el('sd_baseurl').value.trim();
  s.apiKey = el('sd_apikey').value.trim();
  save();
  if (!s.baseUrl) {
    setStatus('sd_status0', '先填 Base URL。', 'error');
    return;
  }
  setStatus('sd_status0', '拉取中…');
  el('sd_pull').disabled = true;
  try {
    const url = s.baseUrl.replace(/\/+$/, '') + '/models';
    const res = await fetch(url, { headers: s.apiKey ? { Authorization: 'Bearer ' + s.apiKey } : {} });
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

function readoutRow(label, value) {
  return '<div class="sd-row"><b>' + esc(label) + '</b> ' + esc(value) + '</div>';
}

function renderReadout(target, data) {
  const parts = [];
  if (data.syntax) {
    const s = data.syntax;
    parts.push(readoutRow('句法', [s.vocab, s.sentence, s.rhythm, s.punctuation, s.register].filter(Boolean).join('；')));
  }
  if (data.object) {
    const o = data.object;
    parts.push(readoutRow('对象', [o.writes, o.notWrites, o.listener].filter(Boolean).join('；')));
  }
  if (data.attitude) {
    const a = data.attitude;
    parts.push(readoutRow('态度', [a.tragedy, a.comedy, a.intimacy, a.failure, a.time].filter(Boolean).join('；')));
  }
  if (data.rhetoric) parts.push(readoutRow('修辞', (data.rhetoric || []).join('；')));
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

function renderBlacklist() {
  const s = settings();
  const target = el('sd_blacklist');
  if (!target) return;
  target.innerHTML = (s.blacklist || [])
    .map(
      (b, i) =>
        '<div class="sd-card' + (b.on ? '' : ' sd-off') + '" data-i="' + i + '">' +
        '<input type="checkbox" class="sd-kon"' + (b.on ? ' checked' : '') + '>' +
        '<div class="sd-cardbody"><input type="text" class="sd-ktext" value="' + esc(b.text) + '"></div></div>'
    )
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

async function runRead1() {
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
  setStatus('sd_status1', '读前三遍…');
  el('sd_read1').disabled = true;
  try {
    const data = parseJSON(await generate(Prompts.read1({ corpus: s.corpus, genre: s.genre })));
    s.read1 = data;
    s.beliefs = (data.beliefs || []).map((b) => ({
      belief: b.belief || '',
      evidence: b.evidence || '',
      counter: b.counter || '',
      on: true
    }));
    if (s.source === 'reference') {
      try {
        s.draft = parseJSON(await generate(Prompts.draftReference({ corpus: s.corpus, genre: s.genre })));
      } catch (e) {
        s.draft = null;
      }
    } else {
      s.draft = null;
    }
    renderReadout(el('sd_readout'), Object.assign({}, data, { draft: s.draft }));
    renderBeliefs();
    setStatus('sd_status1', '前三遍读完了，去确认信念。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_status1', String(e.message || e), 'error');
  } finally {
    el('sd_read1').disabled = false;
  }
}

async function runRead2() {
  const s = settings();
  const beliefs = selectedBeliefs();
  if (!beliefs) {
    setStatus('sd_status2', '至少留一条信念。', 'error');
    return;
  }
  setStatus('sd_status2', '读后三遍…');
  el('sd_read2').disabled = true;
  try {
    const data = parseJSON(await generate(Prompts.read2({ corpus: s.corpus, genre: s.genre, beliefs })));
    s.read2 = data;
    s.blacklist = (data.blacklist || []).map((t) => ({ text: t, on: true }));
    renderReadout(el('sd_position'), data);
    renderBlacklist();
    setStatus('sd_status2', '后三遍读完了，去补最锋利的反例。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_status2', String(e.message || e), 'error');
  } finally {
    el('sd_read2').disabled = false;
  }
}

async function runCompose() {
  const s = settings();
  if (!s.read1 || !s.read2) {
    setStatus('sd_status3', '先把六遍读完。', 'error');
    return;
  }
  setStatus('sd_status3', '压成块…');
  el('sd_compose').disabled = true;
  try {
    const out = await generate(
      Prompts.compose({
        name: s.name,
        genre: s.genre,
        read1: s.read1,
        read2: s.read2,
        blacklist: selectedBlacklist(),
        corpus: s.corpus
      })
    );
    s.block = out.trim();
    el('sd_block').value = s.block;
    setStatus('sd_status3', '成块了。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_status3', String(e.message || e), 'error');
  } finally {
    el('sd_compose').disabled = false;
  }
}

async function runRewrite() {
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
  setStatus('sd_status4', '改写中…');
  el('sd_dorewrite').disabled = true;
  try {
    const out = await generate(Prompts.rewrite({ block: s.block, passage }));
    s.passage = passage;
    s.rewrite = out.trim();
    el('sd_rewrite').value = s.rewrite;
    setStatus('sd_status4', '判一下像不像。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_status4', String(e.message || e), 'error');
  } finally {
    el('sd_dorewrite').disabled = false;
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
    blacklist: selectedBlacklist(),
    block: el('sd_block').value,
    pool: s.read1 || null,
    read2: s.read2 || null,
    test: { passage: s.passage, rewrite: s.rewrite, verdict: s.verdict },
    play: { mode: s.playMode }
  };
}

function applyFab() {
  const s = settings();
  const f = el('sd_fab');
  if (!f) return;
  f.style.display = s.showFab ? 'flex' : 'none';
  if (s.fabPos) {
    f.style.left = s.fabPos.x + 'px';
    f.style.top = s.fabPos.y + 'px';
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
    p.style.left = s.panelPos.x + 'px';
    p.style.top = s.panelPos.y + 'px';
    p.style.right = 'auto';
  } else {
    const w = Math.min(420, window.innerWidth * 0.92);
    p.style.left = Math.max(8, (window.innerWidth - w) / 2) + 'px';
    p.style.top = '70px';
    p.style.right = 'auto';
  }
}

function restore() {
  const s = settings();
  el('sd_baseurl').value = s.baseUrl || '';
  el('sd_apikey').value = s.apiKey || '';
  el('sd_model').value = s.model || '';
  updateMode();
  el('sd_source').value = s.source;
  el('sd_genre').value = s.genre;
  el('sd_name').value = s.name;
  el('sd_corpus').value = s.corpus;
  el('sd_passage').value = s.passage || DEFAULT_PASSAGE;
  el('sd_rewrite').value = s.rewrite || '';
  el('sd_block').value = s.block || '';
  el('sd_play').value = s.playMode || 'none';
  el('sd_showfab').checked = !!s.showFab;
  if (s.read1) renderReadout(el('sd_readout'), Object.assign({}, s.read1, { draft: s.draft }));
  if (s.beliefs && s.beliefs.length) renderBeliefs();
  if (s.read2) renderReadout(el('sd_position'), s.read2);
  if (s.blacklist && s.blacklist.length) renderBlacklist();
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
    if (e.target.closest('.sd-panel-close')) return;
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

function bind() {
  el('sd_read1').addEventListener('click', runRead1);
  el('sd_read2').addEventListener('click', runRead2);
  el('sd_compose').addEventListener('click', runCompose);
  el('sd_dorewrite').addEventListener('click', runRewrite);

  el('sd_mode').addEventListener('change', (e) => { settings().mode = e.target.value; save(); updateMode(); });
  el('sd_baseurl').addEventListener('input', (e) => { settings().baseUrl = e.target.value.trim(); save(); });
  el('sd_apikey').addEventListener('input', (e) => { settings().apiKey = e.target.value.trim(); save(); });
  el('sd_model').addEventListener('input', (e) => { settings().model = e.target.value.trim(); save(); });
  el('sd_pull').addEventListener('click', pullModels);

  el('sd_source').addEventListener('change', (e) => { settings().source = e.target.value; save(); });
  el('sd_genre').addEventListener('change', (e) => { settings().genre = e.target.value; save(); });
  el('sd_name').addEventListener('input', (e) => { settings().name = e.target.value; save(); });
  el('sd_corpus').addEventListener('input', (e) => { settings().corpus = e.target.value; save(); });
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
    setStatus('sd_status4', '不像。点名漂的那层，回去只重蒸那层。', 'error');
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

  el('sd_showfab').addEventListener('change', (e) => {
    settings().showFab = e.target.checked;
    save();
    applyFab();
  });
  el('sd_open').addEventListener('click', () => {
    settings().panelOpen = true;
    save();
    applyPanel();
  });
  el('sd_panel_close').addEventListener('click', () => {
    settings().panelOpen = false;
    save();
    applyPanel();
  });

  makeFab(el('sd_fab'));
  makePanelDrag(el('sd_panel_head'), el('sd_panel'), (pos) => {
    settings().panelPos = pos;
    save();
  });
}

function addUI() {
  if (el('sd_panel')) return;
  const host = document.getElementById('extensions_settings2');
  if (!host) {
    setTimeout(addUI, 500);
    return;
  }
  host.insertAdjacentHTML('beforeend', settingsTpl);
  document.body.insertAdjacentHTML('beforeend', fabTpl);
  document.body.insertAdjacentHTML('beforeend', panelTpl);
  restore();
  bind();
  applyFab();
  applyPanel();
}

export function onActivate() {
  const { eventSource, event_types } = ctx();
  eventSource.on(event_types.APP_READY, addUI);
}

export function onEnable() {
  const root = document.querySelector('.sd-root');
  if (root) root.style.display = '';
  applyFab();
}

export function onDisable() {
  const root = document.querySelector('.sd-root');
  if (root) root.style.display = 'none';
  const f = el('sd_fab');
  if (f) f.style.display = 'none';
  const p = el('sd_panel');
  if (p) p.style.display = 'none';
}

jQuery(() => {
  try {
    if (typeof SillyTavern !== 'undefined') {
      const { eventSource, event_types } = SillyTavern.getContext();
      eventSource.on(event_types.APP_READY, addUI);
    }
  } catch (e) {
    console.error('[style-distiller] init failed', e);
  }
});
