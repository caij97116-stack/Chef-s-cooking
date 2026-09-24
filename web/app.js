const $ = (id) => document.getElementById(id);

const ORDER = ["feed", "read", "belief", "black", "compose", "test", "export"];

const DEFAULT_PASSAGE =
  "在这个快节奏的时代，我们常常被生活的洪流裹挟着前行。值得注意的是，真正的成长往往发生在那些不经意的瞬间。不禁让人感叹，时间的流逝是如此悄无声息。阳光透过窗户洒进来，宛如一层薄纱，映入眼帘的，是一抹淡淡的温暖。";

const STORE_KEY = "wfd_state";
const CONFIG_KEY = "wfd_config";

const state = {
  config: { baseUrl: "", apiKey: "", model: "", temperature: 0.7 },
  feed: { source: "mine", genre: "narration", name: "", corpus: "" },
  read1: null,
  beliefs: [],
  read2: null,
  blacklist: [],
  draft: null,
  block: "",
  test: { passage: DEFAULT_PASSAGE, rewrite: "", verdict: "" },
  play: { mode: "none" },
  cache: {},
  stats: { calls: 0, tokens: 0 },
  ui: { fabPos: null, panelPos: null, panelOpen: false }
};

let activeController = null;
let cancelled = false;

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function saveConfig() {
  state.config = {
    baseUrl: $("baseUrl").value.trim(),
    apiKey: $("apiKey").value.trim(),
    model: $("model").value.trim(),
    temperature: Number($("temperature").value)
  };
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
  } catch (e) {}
  saveState();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(state, parsed);
      state.config = Object.assign({ baseUrl: "", apiKey: "", model: "", temperature: 0.7 }, parsed.config || {});
      state.ui = Object.assign({ fabPos: null, panelPos: null, panelOpen: false }, parsed.ui || {});
      state.stats = Object.assign({ calls: 0, tokens: 0 }, parsed.stats || {});
      state.cache = parsed.cache || {};
    }
  } catch (e) {}
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) state.config = Object.assign(state.config, JSON.parse(raw));
  } catch (e) {}
}

function setStep(activeIdx, unlockIdx = activeIdx) {
  ORDER.forEach((key, i) => {
    const panel = $("step-" + key);
    if (panel) panel.classList.toggle("locked", i > unlockIdx);
    const li = document.querySelector('.stepper li[data-step="' + key + '"]');
    if (li) {
      li.classList.toggle("active", i === activeIdx);
      li.classList.toggle("done", i < activeIdx);
    }
  });
}

function setStatus(id, text, kind = "") {
  const el = $(id);
  if (!el) return;
  el.className = "status " + kind;
  el.textContent = text || "";
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hashKey(value) {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function renderStats() {
  const txt = "已调用 " + state.stats.calls + " 次" + (state.stats.tokens ? " · " + state.stats.tokens + " tok" : "");
  if ($("wfd-stats")) $("wfd-stats").textContent = txt;
}

function feedInputs() {
  return {
    source: $("source").value,
    genre: $("genre").value,
    name: $("name").value.trim(),
    corpus: $("corpus").value.trim()
  };
}

async function callLLM(messages, signal) {
  const { baseUrl, apiKey, model, temperature } = state.config;
  if (!baseUrl || !apiKey || !model) throw new Error("先在“API 设置”里填好 Base URL / Key / 模型");
  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey
    },
    body: JSON.stringify({ model, messages, temperature: Number(temperature) || 0.7 }),
    signal
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error("HTTP " + res.status + " · " + t.slice(0, 180));
  }
  const data = await res.json();
  const tokens = data && data.usage && (data.usage.total_tokens || data.usage.totalTokenCount);
  state.stats.calls += 1;
  if (tokens) state.stats.tokens += Number(tokens) || 0;
  renderStats();
  saveState();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
}

async function runModel(messages) {
  if (cancelled) throw new Error("已停止");
  activeController = new AbortController();
  try {
    return await callLLM(messages, activeController.signal);
  } finally {
    activeController = null;
  }
}

function stopRun() {
  cancelled = true;
  if (activeController) activeController.abort();
  setStatus("status-read", "已请求停止。");
}

async function cachedRun(stage, key, producer, force) {
  if (!force && state.cache[stage] && state.cache[stage].key === key) {
    return { data: state.cache[stage].data, cached: true };
  }
  const data = await producer();
  state.cache[stage] = { key, data };
  saveState();
  return { data, cached: false };
}

function extractJSON(text) {
  let s = String(text == null ? "" : text).trim();
  if (!s) throw new Error("模型没有返回内容，请重试或检查 API");
  s = s.replace(/```[a-zA-Z]*\s*/g, "").replace(/```/g, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    return JSON.parse(s);
  } catch (e) {
    const trailing = s.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(trailing);
    } catch (e2) {
      const quoted = trailing.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
      return JSON.parse(quoted);
    }
  }
}

function row(label, value, layer) {
  const btn = layer
    ? ' <button class="refresh ghost" type="button" data-layer="' + esc(layer) + '">重蒸</button>'
    : "";
  return '<div class="row"><b>' + esc(label) + "</b> " + esc(value) + btn + "</div>";
}

function renderRead1(data, resetBeliefs = true) {
  const parts = [];
  const s = data.syntax || {};
  const o = data.object || {};
  const at = data.attitude || {};
  parts.push(row("句法", [s.vocab, s.sentence, s.rhythm, s.punctuation, s.register].filter(Boolean).join("；"), "syntax"));
  parts.push(row("对象", [o.writes, o.notWrites, o.listener].filter(Boolean).join("；"), "object"));
  parts.push(row("态度", [at.tragedy, at.comedy, at.intimacy, at.failure, at.time].filter(Boolean).join("；"), "attitude"));
  parts.push(row("修辞", (data.rhetoric || []).join("；"), "rhetoric"));
  if (state.draft) {
    parts.push(row("参考草稿", state.draft.draft || ""));
    parts.push(row("拿不准", (state.draft.uncertain || []).join("；")));
  }
  $("read-output").innerHTML = parts.join("");

  if (resetBeliefs) {
    state.beliefs = (data.beliefs || []).map((b) => ({
      belief: b.belief || "",
      evidence: b.evidence || "",
      counter: b.counter || "",
      on: true
    }));
    renderBeliefs();
  }
}

function renderBeliefs() {
  $("belief-list").innerHTML = state.beliefs
    .map(
      (b, i) =>
        '<div class="card' + (b.on ? "" : " off") + '" data-i="' + i + '">' +
        '<input type="checkbox" class="b-on"' + (b.on ? " checked" : "") + ">" +
        '<div class="body"><input type="text" class="b-text" value="' + esc(b.belief) + '">' +
        '<div class="meta">依据：<span class="ev">' + esc(b.evidence) + "</span> · 反例：" + esc(b.counter) + "</div>" +
        "</div></div>"
    )
    .join("");

  $("belief-list").querySelectorAll(".card").forEach((card) => {
    const i = Number(card.dataset.i);
    card.querySelector(".b-on").addEventListener("change", (e) => {
      state.beliefs[i].on = e.target.checked;
      card.classList.toggle("off", !e.target.checked);
      saveState();
    });
    card.querySelector(".b-text").addEventListener("input", (e) => {
      state.beliefs[i].belief = e.target.value;
      saveState();
    });
  });
}

function collectBeliefs() {
  return state.beliefs.filter((b) => b.on && b.belief.trim()).map((b) => "- " + b.belief.trim()).join("\n");
}

function renderRead2(data) {
  const parts = [];
  parts.push(row("核心信念", data.belief_core || ""));
  parts.push(row("历史定位", data.position || ""));
  parts.push(row("跟邻居的界", data.neighbor_diff || ""));
  $("position-output").innerHTML = parts.join("");

  state.blacklist = (data.blacklist || []).map((t) => ({ text: t, on: true }));
  renderBlacklist();
}

function renderBlacklist() {
  $("blacklist-list").innerHTML = state.blacklist
    .map(
      (b, i) =>
        '<div class="card' + (b.on ? "" : " off") + '" data-i="' + i + '">' +
        '<input type="checkbox" class="k-on"' + (b.on ? " checked" : "") + ">" +
        '<div class="body"><input type="text" class="k-text" value="' + esc(b.text) + '"></div></div>'
    )
    .join("");
  $("blacklist-list").querySelectorAll(".card").forEach((card) => {
    const i = Number(card.dataset.i);
    card.querySelector(".k-on").addEventListener("change", (e) => {
      state.blacklist[i].on = e.target.checked;
      card.classList.toggle("off", !e.target.checked);
      saveState();
    });
    card.querySelector(".k-text").addEventListener("input", (e) => {
      state.blacklist[i].text = e.target.value;
      saveState();
    });
  });
}

function collectBlacklist() {
  return state.blacklist.filter((b) => b.on && b.text.trim()).map((b) => b.text.trim());
}

async function runRead1(force) {
  const feed = feedInputs();
  if (!feed.corpus) {
    setStatus("status-read", "先贴语料。", "error");
    return;
  }
  state.feed = feed;
  state.draft = null;
  cancelled = false;
  setStatus("status-read", "读前三遍…");
  $("btn-read").disabled = true;
  try {
    const withDraft = feed.source === "reference";
    const key = hashKey({ corpus: feed.corpus, genre: feed.genre, withDraft });
    const out = await cachedRun("read1", key, () => runModel(Prompts.read1(Object.assign({}, feed, { withDraft }))), force);
    const data = extractJSON(out.data);
    state.read1 = data;
    state.draft = withDraft && data.draft ? data.draft : null;
    renderRead1(data);
    setStatus("status-read", out.cached ? "输入没变，用上次结果，未再调用 API。" : "前三遍读完了。去“卡点·信念”确认。", "ok");
    setStep(1, 2);
    saveState();
  } catch (e) {
    setStatus("status-read", String(e.message || e), "error");
  } finally {
    $("btn-read").disabled = false;
  }
}

async function runRefineLayer(layer) {
  if (!state.read1) {
    setStatus("status-read", "先读前三遍。", "error");
    return;
  }
  const feed = state.feed || feedInputs();
  cancelled = false;
  setStatus("status-read", "重蒸「" + (Prompts.LAYERS[layer] || layer) + "」…");
  try {
    const out = await runModel(
      Prompts.refineLayer({ layer, current: state.read1[layer], corpus: feed.corpus, genre: feed.genre })
    );
    const parsed = extractJSON(out);
    if (parsed && parsed.value !== undefined) {
      state.read1[layer] = parsed.value;
      renderRead1(state.read1, false);
      setStatus("status-read", "「" + (Prompts.LAYERS[layer] || layer) + "」重蒸好了。", "ok");
      saveState();
    } else {
      setStatus("status-read", "重蒸返回格式不对，再试一次。", "error");
    }
  } catch (e) {
    setStatus("status-read", String(e.message || e), "error");
  }
}

async function runRead2(force) {
  const beliefs = collectBeliefs();
  if (!beliefs) {
    setStatus("status-belief", "至少留一条信念。", "error");
    return;
  }
  const feed = feedInputs();
  cancelled = false;
  setStatus("status-belief", "读后三遍…");
  $("btn-read2").disabled = true;
  try {
    const key = hashKey({ corpus: feed.corpus, genre: feed.genre, beliefs });
    const out = await cachedRun("read2", key, () => runModel(Prompts.read2(Object.assign({}, feed, { beliefs }))), force);
    const data = extractJSON(out.data);
    state.read2 = data;
    renderRead2(data);
    setStatus("status-belief", out.cached ? "输入没变，用上次结果，未再调用 API。" : "后三遍读完了。去“卡点·反例”补那条最锋利的。", "ok");
    setStep(3, 3);
    saveState();
  } catch (e) {
    setStatus("status-belief", String(e.message || e), "error");
  } finally {
    $("btn-read2").disabled = false;
  }
}

async function runCompose(force) {
  if (!state.read1 || !state.read2) {
    setStatus("status-black", "先把六遍读完。", "error");
    return;
  }
  const feed = state.feed || feedInputs();
  const samples = state.read1.samples || [];
  cancelled = false;
  setStatus("status-black", "压成块…");
  $("btn-compose").disabled = true;
  try {
    const key = hashKey({ name: feed.name, genre: feed.genre, read1: state.read1, read2: state.read2, samples, blacklist: collectBlacklist() });
    const out = await cachedRun(
      "compose",
      key,
      async () =>
        (
          await runModel(
            Prompts.compose({
              name: feed.name,
              genre: feed.genre,
              read1: state.read1,
              read2: state.read2,
              samples,
              blacklist: collectBlacklist()
            })
          )
        ).trim(),
      force
    );
    state.block = out.data;
    $("block").value = state.block;
    setStatus("status-black", out.cached ? "输入没变，用上次结果，未再调用 API。" : "成块了。", "ok");
    setStep(4, 5);
    saveState();
  } catch (e) {
    setStatus("status-black", String(e.message || e), "error");
  } finally {
    $("btn-compose").disabled = false;
  }
}

async function runRewrite(force) {
  state.block = $("block").value.trim();
  const passage = $("passage").value.trim();
  if (!state.block) {
    setStatus("status-test", "文风块是空的。", "error");
    return;
  }
  if (!passage) {
    setStatus("status-test", "先贴一段默认 AI 腔。", "error");
    return;
  }
  cancelled = false;
  setStatus("status-test", "改写中…");
  $("btn-rewrite").disabled = true;
  try {
    const key = hashKey({ block: state.block, passage });
    const out = await cachedRun("rewrite", key, async () => (await runModel(Prompts.rewrite({ block: state.block, passage }))).trim(), force);
    state.test.passage = passage;
    state.test.rewrite = out.data;
    $("rewrite").value = state.test.rewrite;
    setStatus("status-test", out.cached ? "输入没变，用上次结果，未再调用 API。" : "判一下像不像。", "ok");
    setStep(5, 6);
    saveState();
  } catch (e) {
    setStatus("status-test", String(e.message || e), "error");
  } finally {
    $("btn-rewrite").disabled = false;
  }
}

function setVerdict(v) {
  state.test.verdict = v;
  setStatus("status-test", v === "like" ? "像，可以拿走了。" : "不像。点某一层的「重蒸」，只重蒸漂的那层。", v === "like" ? "ok" : "error");
  if (v === "like") setStep(6, 6);
  saveState();
}

function buildJSON() {
  return {
    name: state.feed ? state.feed.name : "",
    source: state.feed ? state.feed.source : "",
    genre: state.feed ? state.feed.genre : "",
    belief_core: state.read2 ? state.read2.belief_core : "",
    neighbor_diff: state.read2 ? state.read2.neighbor_diff : "",
    syntax: state.read1 ? state.read1.syntax : null,
    rhetoric: state.read1 ? state.read1.rhetoric : null,
    samples: state.read1 ? state.read1.samples || [] : [],
    blacklist: collectBlacklist(),
    block: $("block").value,
    pool: state.read1 || null,
    read2: state.read2 || null,
    draft: state.draft || null,
    test: state.test,
    play: state.play
  };
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function slug() {
  const n = (state.feed && state.feed.name) || "文风";
  return n.replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 40) || "文风";
}

function clampPos(pos, w, h) {
  if (!pos) return pos;
  return {
    x: Math.max(0, Math.min(window.innerWidth - (w || 0), pos.x)),
    y: Math.max(0, Math.min(window.innerHeight - (h || 0), pos.y))
  };
}

function applyFab() {
  const fab = $("wfd-fab");
  if (!fab) return;
  if (state.ui.fabPos) {
    const p = clampPos(state.ui.fabPos, fab.offsetWidth || 54, fab.offsetHeight || 54);
    fab.style.left = p.x + "px";
    fab.style.top = p.y + "px";
    fab.style.right = "auto";
    fab.style.bottom = "auto";
  }
}

function applyPanel() {
  const panel = $("wfd-panel");
  if (!panel) return;
  if (!state.ui.panelOpen) {
    panel.classList.remove("open");
    return;
  }
  panel.classList.add("open");
  if (state.ui.panelPos) {
    const p = clampPos(state.ui.panelPos, panel.offsetWidth || 460, 60);
    panel.style.left = p.x + "px";
    panel.style.top = p.y + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }
}

function drag(el, onStart, onMove, onEnd) {
  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = rect.left;
    const origY = rect.top;
    let moved = false;
    onStart && onStart();
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      onMove(origX + dx, origY + dy);
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      onEnd && onEnd(moved);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  });
}

function setFabPos(x, y) {
  const fab = $("wfd-fab");
  const cx = Math.max(0, Math.min(window.innerWidth - fab.offsetWidth, x));
  const cy = Math.max(0, Math.min(window.innerHeight - fab.offsetHeight, y));
  fab.style.left = cx + "px";
  fab.style.top = cy + "px";
  fab.style.right = "auto";
  fab.style.bottom = "auto";
  state.ui.fabPos = { x: cx, y: cy };
}

function setPanelPos(x, y) {
  const panel = $("wfd-panel");
  const cx = Math.max(0, Math.min(window.innerWidth - 80, x));
  const cy = Math.max(0, Math.min(window.innerHeight - 44, y));
  panel.style.left = cx + "px";
  panel.style.top = cy + "px";
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  state.ui.panelPos = { x: cx, y: cy };
}

function restoreStep() {
  if (state.test && state.test.verdict === "like") setStep(6, 6);
  else if (state.block) setStep(4, 5);
  else if (state.read2) setStep(3, 3);
  else if (state.read1) setStep(1, 2);
  else setStep(0, 0);
}

function restore() {
  $("baseUrl").value = state.config.baseUrl || "";
  $("apiKey").value = state.config.apiKey || "";
  $("model").value = state.config.model || "";
  $("temperature").value = state.config.temperature != null ? state.config.temperature : 0.7;
  $("tempval").textContent = String($("temperature").value);

  $("source").value = state.feed.source || "mine";
  $("genre").value = state.feed.genre || "narration";
  $("name").value = state.feed.name || "";
  $("corpus").value = state.feed.corpus || "";
  $("passage").value = (state.test && state.test.passage) || DEFAULT_PASSAGE;
  $("rewrite").value = (state.test && state.test.rewrite) || "";
  $("block").value = state.block || "";
  $("play-mode").value = (state.play && state.play.mode) || "none";

  if (state.read1) renderRead1(state.read1, false);
  if (state.beliefs && state.beliefs.length) renderBeliefs();
  if (state.read2) renderRead2(state.read2);
  if (state.blacklist && state.blacklist.length) renderBlacklist();

  renderStats();
  applyFab();
  applyPanel();
  restoreStep();
}

function bind() {
  document.querySelectorAll(".open-config").forEach((b) => {
    b.addEventListener("click", () => $("config").showModal());
  });
  $("save-config").addEventListener("click", () => {
    saveConfig();
    setStatus("status-read", "API 设置已存。", "ok");
  });
  $("temperature").addEventListener("input", (e) => {
    $("tempval").textContent = String(e.target.value);
  });

  $("btn-read").addEventListener("click", () => runRead1(false));
  $("btn-read-force").addEventListener("click", () => runRead1(true));
  $("btn-read2").addEventListener("click", () => runRead2(false));
  $("btn-compose").addEventListener("click", () => runCompose(false));

  $("read-output").addEventListener("click", (e) => {
    const btn = e.target.closest(".refresh");
    if (btn) runRefineLayer(btn.dataset.layer);
  });

  $("btn-black-add").addEventListener("click", () => {
    const v = $("black-add").value.trim();
    if (!v) return;
    state.blacklist.push({ text: v, on: true });
    $("black-add").value = "";
    renderBlacklist();
    saveState();
  });

  $("block").addEventListener("input", (e) => {
    state.block = e.target.value;
    saveState();
  });

  $("btn-test").addEventListener("click", () => setStep(5, 5));
  $("btn-rewrite").addEventListener("click", () => runRewrite(false));
  $("verdict-like").addEventListener("click", () => setVerdict("like"));
  $("verdict-unlike").addEventListener("click", () => setVerdict("unlike"));

  $("play-mode").addEventListener("change", (e) => {
    state.play.mode = e.target.value;
    saveState();
  });

  ["source", "genre", "name", "corpus"].forEach((id) => {
    $(id).addEventListener("input", () => {
      state.feed = feedInputs();
      saveState();
    });
    $(id).addEventListener("change", () => {
      state.feed = feedInputs();
      saveState();
    });
  });

  $("copy-block").addEventListener("click", async () => {
    const text = $("block").value;
    try {
      await navigator.clipboard.writeText(text);
      setStatus("status-export", "文风块已复制。", "ok");
    } catch (e) {
      setStatus("status-export", "复制失败，请手动选中。", "error");
    }
  });

  $("download-json").addEventListener("click", () => {
    download(slug() + ".json", JSON.stringify(buildJSON(), null, 2));
    setStatus("status-export", "JSON 已下载。", "ok");
  });

  $("download-pool").addEventListener("click", () => {
    download(slug() + "-pool.json", JSON.stringify({ k1: state.read1, k2: state.read2, draft: state.draft }, null, 2));
    setStatus("status-export", "蒸馏池已下载。", "ok");
  });

  $("wfd-close").addEventListener("click", () => {
    state.ui.panelOpen = false;
    saveState();
    applyPanel();
  });
  $("wfd-stop").addEventListener("click", stopRun);

  drag(
    $("wfd-fab"),
    null,
    (x, y) => setFabPos(x, y),
    (moved) => {
      if (!moved) {
        state.ui.panelOpen = !state.ui.panelOpen;
        applyPanel();
      }
      saveState();
    }
  );

  drag(
    $("wfd-panel-head"),
    null,
    (x, y) => setPanelPos(x, y),
    () => saveState()
  );

  window.addEventListener("resize", () => {
    applyFab();
    applyPanel();
  });
}

loadState();
restore();
bind();
