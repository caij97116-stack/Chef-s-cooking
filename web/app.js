const $ = (id) => document.getElementById(id);

const ORDER = ["feed", "read", "belief", "black", "compose", "test", "export"];

const DEFAULT_PASSAGE =
  "在这个快节奏的时代，我们常常被生活的洪流裹挟着前行。值得注意的是，真正的成长往往发生在那些不经意的瞬间。不禁让人感叹，时间的流逝是如此悄无声息。阳光透过窗户洒进来，宛如一层薄纱，映入眼帘的，是一抹淡淡的温暖。";

const state = {
  config: { baseUrl: "", apiKey: "", model: "" },
  feed: null,
  read1: null,
  beliefs: [],
  read2: null,
  blacklist: [],
  draft: null,
  block: "",
  test: { passage: DEFAULT_PASSAGE, rewrite: "", verdict: "" },
  play: { mode: "none", text: "" }
};

const GENRE = { narration: "叙事", dialogue: "对白", interior: "内心", action: "动作" };

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

function loadConfig() {
  try {
    const raw = localStorage.getItem("wfd_config");
    if (raw) state.config = Object.assign(state.config, JSON.parse(raw));
  } catch (e) {}
  $("baseUrl").value = state.config.baseUrl || "";
  $("apiKey").value = state.config.apiKey || "";
  $("model").value = state.config.model || "";
}

function saveConfig() {
  state.config = {
    baseUrl: $("baseUrl").value.trim(),
    apiKey: $("apiKey").value.trim(),
    model: $("model").value.trim()
  };
  localStorage.setItem("wfd_config", JSON.stringify(state.config));
}

async function callLLM(messages) {
  const { baseUrl, apiKey, model } = state.config;
  if (!baseUrl || !apiKey || !model) throw new Error("先在“API 设置”里填好 Base URL / Key / 模型");
  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error("HTTP " + res.status + " · " + t.slice(0, 180));
  }
  const data = await res.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
}

function extractJSON(text) {
  let s = String(text || "").trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

function row(label, value) {
  return '<div class="row"><b>' + esc(label) + '</b> ' + esc(value) + "</div>";
}

function renderRead1(data) {
  const parts = [];
  const s = data.syntax || {};
  const o = data.object || {};
  const at = data.attitude || {};
  parts.push(row("句法", [s.vocab, s.sentence, s.rhythm, s.punctuation, s.register].filter(Boolean).join("；")));
  parts.push(row("对象", [o.writes, o.notWrites, o.listener].filter(Boolean).join("；")));
  parts.push(row("态度", [at.tragedy, at.comedy, at.intimacy, at.failure, at.time].filter(Boolean).join("；")));
  parts.push(row("修辞", (data.rhetoric || []).join("；")));
  if (state.draft) {
    parts.push(row("参考草稿", state.draft.draft || ""));
    parts.push(row("拿不准", (state.draft.uncertain || []).join("；")));
  }
  $("read-output").innerHTML = parts.join("");

  state.beliefs = (data.beliefs || []).map((b) => ({
    belief: b.belief || "",
    evidence: b.evidence || "",
    counter: b.counter || "",
    on: true
  }));
  renderBeliefs();
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
    });
    card.querySelector(".b-text").addEventListener("input", (e) => {
      state.beliefs[i].belief = e.target.value;
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
    });
    card.querySelector(".k-text").addEventListener("input", (e) => {
      state.blacklist[i].text = e.target.value;
    });
  });
}

function collectBlacklist() {
  return state.blacklist.filter((b) => b.on && b.text.trim()).map((b) => b.text.trim());
}

function feedInputs() {
  return {
    source: $("source").value,
    genre: $("genre").value,
    name: $("name").value.trim(),
    corpus: $("corpus").value.trim()
  };
}

async function runRead1() {
  const feed = feedInputs();
  if (!feed.corpus) {
    setStatus("status-read", "先贴语料。", "error");
    return;
  }
  state.feed = feed;
  state.draft = null;
  setStatus("status-read", "读前三遍…");
  $("btn-read").disabled = true;
  try {
    const out = await callLLM(Prompts.read1(feed));
    const data = extractJSON(out);
    state.read1 = data;
    if (feed.source === "reference") {
      setStatus("status-read", "读前三遍完成，再出参考草稿…");
      try {
        state.draft = extractJSON(await callLLM(Prompts.draftReference(feed)));
      } catch (e) {
        state.draft = null;
      }
    }
    renderRead1(data);
    setStatus("status-read", "前三遍读完了。去“卡点·信念”确认。", "ok");
    setStep(1, 2);
  } catch (e) {
    setStatus("status-read", String(e.message || e), "error");
  } finally {
    $("btn-read").disabled = false;
  }
}

async function runRead2() {
  const beliefs = collectBeliefs();
  if (!beliefs) {
    setStatus("status-belief", "至少留一条信念。", "error");
    return;
  }
  setStatus("status-belief", "读后三遍…");
  $("btn-read2").disabled = true;
  try {
    const out = await callLLM(Prompts.read2(Object.assign({}, state.feed, { beliefs })));
    const data = extractJSON(out);
    state.read2 = data;
    renderRead2(data);
    setStatus("status-belief", "后三遍读完了。去“卡点·反例”补那条最锋利的。", "ok");
    setStep(3, 3);
  } catch (e) {
    setStatus("status-belief", String(e.message || e), "error");
  } finally {
    $("btn-read2").disabled = false;
  }
}

async function runCompose() {
  if (!state.read1 || !state.read2) {
    setStatus("status-black", "先把六遍读完。", "error");
    return;
  }
  setStatus("status-black", "压成块…");
  $("btn-compose").disabled = true;
  try {
    const out = await callLLM(
      Prompts.compose({
        name: state.feed.name,
        genre: state.feed.genre,
        read1: state.read1,
        read2: state.read2,
        blacklist: collectBlacklist(),
        corpus: state.feed.corpus
      })
    );
    state.block = out.trim();
    $("block").value = state.block;
    setStatus("status-black", "成块了。", "ok");
    setStep(4, 5);
  } catch (e) {
    setStatus("status-black", String(e.message || e), "error");
  } finally {
    $("btn-compose").disabled = false;
  }
}

async function runRewrite() {
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
  setStatus("status-test", "改写中…");
  $("btn-rewrite").disabled = true;
  try {
    const out = await callLLM(Prompts.rewrite({ block: state.block, passage }));
    state.test.passage = passage;
    state.test.rewrite = out.trim();
    $("rewrite").value = state.test.rewrite;
    setStatus("status-test", "判一下像不像。", "ok");
    setStep(5, 6);
  } catch (e) {
    setStatus("status-test", String(e.message || e), "error");
  } finally {
    $("btn-rewrite").disabled = false;
  }
}

function setVerdict(v) {
  state.test.verdict = v;
  setStatus("status-test", v === "like" ? "像，可以拿走了。" : "不像。点名漂的那层，回去只重蒸那层。", v === "like" ? "ok" : "error");
  if (v === "like") setStep(6, 6);
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
    blacklist: collectBlacklist(),
    samples: [],
    block: $("block").value,
    pool: state.read1 || null,
    read2: state.read2 || null,
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
  return n.replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 40);
}

function bind() {
  $("open-config").addEventListener("click", () => $("config").showModal());
  $("save-config").addEventListener("click", () => {
    saveConfig();
    setStatus("status-read", "API 设置已存。", "ok");
  });

  $("btn-read").addEventListener("click", runRead1);
  $("btn-read2").addEventListener("click", runRead2);
  $("btn-compose").addEventListener("click", runCompose);

  $("btn-black-add").addEventListener("click", () => {
    const v = $("black-add").value.trim();
    if (!v) return;
    state.blacklist.push({ text: v, on: true });
    $("black-add").value = "";
    renderBlacklist();
  });

  $("block").addEventListener("input", (e) => {
    state.block = e.target.value;
  });

  $("btn-test").addEventListener("click", () => setStep(5, 5));
  $("btn-rewrite").addEventListener("click", runRewrite);
  $("verdict-like").addEventListener("click", () => setVerdict("like"));
  $("verdict-unlike").addEventListener("click", () => setVerdict("unlike"));

  $("play-mode").addEventListener("change", (e) => {
    state.play.mode = e.target.value;
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
}

loadConfig();
$("passage").value = DEFAULT_PASSAGE;
setStep(0);
bind();
