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
  source: 'own',
  styleNotes: '',
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
  confirmed1: false,
  confirmed2: false,
  styles: [],
  panelOpen: false,
  activeModule: 'distill',
  opening: {
    source: '',
    styleFrom: 'current',
    scene: 'first',
    sceneCustom: '',
    count: '2',
    length: 'medium',
    personaMode: 'current',
    personaCustom: '',
    worldbooks: [],
    candidates: [],
    picked: -1,
    archive: []
  },
  voice: { corpus: '', entry: '' },
  polish: { description: '', personality: '', scenario: '' },
  lore: { mode: 'card', source: '', query: '', snippets: '', hint: '', count: '3', entries: [] },
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
    <div class="sd-note">打开方式：点输入框右侧的「魔法棒」按钮，在菜单里选<b>大厨烹饪处</b>。面板标题显示本会话调用次数；这里显示累计：<b id="sd_stats_root">累计 0 次</b>。</div>
    <div class="sd-note">省 API：同样的输入只用调一次；面板里默认开着「一次读完」，全部读解只花一次调用；面板顶部会显示命中缓存省下的次数。</div>
  </div>
</div>`;

const menuItemTpl = `<div id="sd_menuitem" class="list-group-item flex-container flexGap5 interactable" tabindex="0" role="button" title="大厨烹饪处"><div class="fa-solid fa-utensils extensionsMenuExtensionButton" aria-hidden="true"></div><span>大厨烹饪处</span></div>`;

const backdropTpl = `<div id="sd_backdrop"></div>`;

const panelTpl = `
<div class="sd-panel" id="sd_panel">
  <div class="sd-panel-head" id="sd_panel_head">
    <span>大厨烹饪处 <span class="sd-stat" id="sd_stats">已调用 0 次</span></span>
    <span class="sd-head-right">
      <i class="fa-solid fa-stop sd-panel-stop" id="sd_stop" title="停止本次生成"></i>
      <i class="fa-solid fa-xmark sd-panel-close" id="sd_panel_close" title="收起"></i>
    </span>
  </div>
  <div class="sd-panel-body">
    <div class="sd-tabs" id="sd_tabs">
      <button class="sd-tab" id="sd_tab_distill" data-mod="distill">🔥 文风蒸馏</button>
      <button class="sd-tab" id="sd_tab_opening" data-mod="opening">🎬 开场白</button>
      <button class="sd-tab" id="sd_tab_remsg" data-mod="remsg">✏️ 楼层改写</button>
      <button class="sd-tab" id="sd_tab_voice" data-mod="voice">🗣 说话腔</button>
      <button class="sd-tab" id="sd_tab_polish" data-mod="polish">✨ 卡片润色</button>
      <button class="sd-tab" id="sd_tab_lore" data-mod="lore">📚 世界书</button>
    </div>

    <div class="sd-page" id="sd_page_distill">
    <div class="sd-steps" id="sd_steps">
      <span class="sd-step" data-s="1">① 喂料</span>
      <span class="sd-step" data-s="2">② 读解</span>
      <span class="sd-step" data-s="3">③ 确认①</span>
      <span class="sd-step" data-s="4">④ 确认②</span>
      <span class="sd-step" data-s="5">⑤ 成块</span>
      <span class="sd-step" data-s="6">⑥ 拿走</span>
    </div>
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

    <div class="sd-sec" data-wiz="1">
      <div class="sd-sec-title">喂料</div>
      <div class="sd-grid2">
        <label class="sd-field"><span>来源</span>
          <select id="sd_source">
            <option value="rule">自己写的文风指令（规则，不是范文）</option>
            <option value="own">自己写的正文</option>
            <option value="ref">别人贴的素材（参考文字）</option>
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
      <label class="sd-field"><span id="sd_corpus_label">语料</span>
        <textarea id="sd_corpus" rows="6" placeholder="同一体裁的原文，段落之间空一行。"></textarea>
        <span id="sd_corpus_stat" class="sd-corpus-stat"></span>
      </label>
      <div id="sd_rulenotes_wrap" style="display:none">
        <label class="sd-field"><span>补充说明 / 可参考的文案</span>
          <textarea id="sd_rulenotes" rows="4" placeholder="可以写这条规则想达到什么效果、举个例子、或贴一段你觉得贴近的文案，不写也可以。"></textarea>
        </label>
      </div>
      <label class="sd-check"><input id="sd_thrifty" type="checkbox"> <span>一次读完（推荐）：全部读解合并成一次调用（少花一半调用，分析略粗）</span></label>
      <div class="sd-inline">
        <button id="sd_takecard" class="menu_button">取角色卡</button>
        <button id="sd_takechat" class="menu_button">取聊天</button>
        <span id="sd_takestatus" class="sd-status"></span>
      </div>
      <div class="sd-actions">
        <button id="sd_read1" class="menu_button sd-primary">开始读解</button>
        <span id="sd_status1" class="sd-status"></span>
      </div>
    </div>

    <div class="sd-sec" data-wiz="2">
      <div class="sd-sec-title">读解<span class="sd-hint">点某一层的「重读」只重读那一层</span></div>
      <div id="sd_readout" class="sd-readout"></div>
    </div>

    <div class="sd-sec" data-wiz="3">
      <div class="sd-sec-title">确认① · 信念与禁忌<span class="sd-hint">勾选 / 改 / 补，点确认才进下一步</span></div>
      <div id="sd_position" class="sd-readout"></div>
      <div id="sd_beliefs" class="sd-cards"></div>
      <div class="sd-sec-title" style="margin-top:8px">禁忌清单<span class="sd-hint">至少 6 条，最锋利的由你补</span></div>
      <div id="sd_blacklist" class="sd-cards"></div>
      <div class="sd-inline">
        <input id="sd_blackadd" type="text" placeholder="她打死也不会写的那一句">
        <button id="sd_blackaddbtn" class="menu_button">加</button>
      </div>
      <div class="sd-actions">
        <button id="sd_confirm1" class="menu_button sd-primary">确认这一步</button>
        <span id="sd_status2" class="sd-status"></span>
      </div>
    </div>

    <div class="sd-sec" data-wiz="4">
      <div class="sd-sec-title">确认② · 拿不准的拍板<span class="sd-hint">填了才按你的决定写进文风块；没有也可以直接润色</span></div>
      <div id="sd_uncertain_wrap">
        <div id="sd_uncertain" class="sd-cards"></div>
      </div>
      <div class="sd-actions">
        <button id="sd_confirm2" class="menu_button sd-primary">确认并润色成块</button>
        <span id="sd_status3" class="sd-status"></span>
      </div>
    </div>

    <div class="sd-sec" data-wiz="5">
      <div class="sd-sec-title">文风块<span class="sd-hint">本地拼草稿后再润色一次；可手改</span></div>
      <textarea id="sd_block" rows="10" placeholder="文风块会出现在这里。"></textarea>
    </div>

    <div class="sd-sec" data-wiz="6">
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
        <input id="sd_stylename" type="text" placeholder="文风存档名（默认用文风名）">
        <button id="sd_stylesave" class="menu_button">存入文风存档</button>
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

    <div class="sd-page" id="sd_page_opening" style="display:none">
      <div class="sd-sec">
        <div class="sd-sec-title">选题源</div>
        <div class="sd-inline">
          <button id="sd_op_takecard" class="menu_button">取角色卡</button>
          <button id="sd_op_takelore" class="menu_button">角色卡 + 勾选的世界书</button>
          <button id="sd_op_booksrefresh" class="menu_button">刷新世界书列表</button>
          <span id="sd_op_takestatus" class="sd-status"></span>
        </div>
        <div id="sd_op_books" class="sd-note">（点「刷新世界书列表」看看有哪些）</div>
        <label class="sd-field"><span>角色素材（描述 / 性格 / 场景 / 示例对白）</span>
          <textarea id="sd_op_source" rows="6" placeholder="点「取角色卡」自动填，也可以自己贴。"></textarea>
        </label>
      </div>
      <div class="sd-sec">
        <div class="sd-sec-title">选文风</div>
        <label class="sd-field"><span>用哪套文风</span>
          <select id="sd_op_style">
            <option value="current">当前面板里的文风块</option>
            <option value="none">不用文风，只写开场白</option>
          </select>
        </label>
      </div>
      <div class="sd-sec">
        <div class="sd-sec-title">选人设</div>
        <label class="sd-field"><span>{{user}} 的人设来源</span>
          <select id="sd_op_persona">
            <option value="current">用我当前用户人设</option>
            <option value="custom">自己写一段简介</option>
          </select>
        </label>
        <div id="sd_op_personacustom_wrap" style="display:none">
          <label class="sd-field"><span>{{user}} 简介</span>
            <textarea id="sd_op_personacustom" rows="3" placeholder="简单几句就行，比如身份/性格/和角色的关系。"></textarea>
          </label>
        </div>
        <div class="sd-note">不管选哪种，正文里都不会直接点出 {{user}} 的具体人设名字。</div>
      </div>
      <div class="sd-sec">
        <div class="sd-sec-title">选场景</div>
        <div class="sd-grid2">
          <label class="sd-field"><span>场景</span>
            <select id="sd_op_scene">
              <option value="first">初次见面</option>
              <option value="known">已经熟识</option>
              <option value="conflict">冲突之中</option>
              <option value="custom">自定义</option>
            </select>
          </label>
          <label class="sd-field"><span>生成几条</span>
            <select id="sd_op_count">
              <option value="2">2 条</option>
              <option value="3">3 条</option>
            </select>
          </label>
        </div>
        <label class="sd-field"><span>字数</span>
          <select id="sd_op_length">
            <option value="short">简短（1-2 句）</option>
            <option value="medium">适中（3-5 句）</option>
            <option value="long">详细（6 句以上）</option>
          </select>
        </label>
        <label class="sd-field" id="sd_op_scenecustom_wrap" style="display:none"><span>一句话描述你想开的场景</span>
          <input id="sd_op_scenecustom" type="text" placeholder="例如：雨夜的便利店，她刚下夜班">
        </label>
        <div class="sd-actions">
          <button id="sd_op_generate" class="menu_button sd-primary">生成开场白</button>
          <span id="sd_op_status" class="sd-status"></span>
        </div>
      </div>
      <div class="sd-sec">
        <div class="sd-sec-title">挑一条</div>
        <div id="sd_op_candidates"></div>
      </div>
      <div class="sd-sec">
        <div class="sd-sec-title">拿走</div>
        <div class="sd-actions">
          <button id="sd_op_copy" class="menu_button">复制选中</button>
          <button id="sd_op_writefirst" class="menu_button">写为第一条开场白</button>
          <button id="sd_op_writealt" class="menu_button">加为备选开场白</button>
        </div>
        <div class="sd-inline">
          <select id="sd_op_archlist"></select>
          <button id="sd_op_archload" class="menu_button">载入</button>
          <button id="sd_op_archdel" class="menu_button">删除</button>
          <button id="sd_op_archsave" class="menu_button">把选中存进存档</button>
        </div>
        <div id="sd_op_wstatus" class="sd-status"></div>
      </div>
    </div>

    <div class="sd-page" id="sd_page_remsg" style="display:none">
      <div class="sd-sec">
        <div class="sd-sec-title">选楼层<span class="sd-hint">只列最近的 AI 发言，点一条选中</span></div>
        <div class="sd-inline">
          <button id="sd_remsg_refresh" class="menu_button">刷新列表</button>
        </div>
        <div id="sd_remsg_list" class="sd-cards"></div>
      </div>
      <div class="sd-sec">
        <div class="sd-sec-title">改写</div>
        <div class="sd-actions">
          <button id="sd_remsg_go" class="menu_button sd-primary">用当前文风块改写</button>
          <span id="sd_remsg_status" class="sd-status"></span>
        </div>
        <label class="sd-field"><span>改写结果（可手改）</span>
          <textarea id="sd_remsg_result" rows="8" placeholder="改写结果会出现在这里。"></textarea>
        </label>
        <div class="sd-actions">
          <button id="sd_remsg_write" class="menu_button sd-primary">写回这一楼</button>
        </div>
      </div>
    </div>

    <div class="sd-page" id="sd_page_voice" style="display:none">
      <div class="sd-sec">
        <div class="sd-sec-title">喂对白<span class="sd-hint">这个角色开口说的话，越多越准</span></div>
        <div class="sd-inline">
          <button id="sd_vc_takedial" class="menu_button">取角色卡示例对白</button>
          <button id="sd_vc_takechat" class="menu_button">取聊天里的角色发言</button>
          <span id="sd_vc_takestatus" class="sd-status"></span>
        </div>
        <label class="sd-field"><span>对白语料</span>
          <textarea id="sd_vc_corpus" rows="6" placeholder="角色的对白，一行一句或分段都行。"></textarea>
        </label>
        <div class="sd-actions">
          <button id="sd_vc_go" class="menu_button sd-primary">蒸馏说话腔</button>
          <span id="sd_vc_status" class="sd-status"></span>
        </div>
      </div>
      <div class="sd-sec">
        <div class="sd-sec-title">说话方式条目<span class="sd-hint">可手改</span></div>
        <textarea id="sd_vc_entry" rows="10" placeholder="蒸馏结果会出现在这里。"></textarea>
        <div class="sd-actions">
          <button id="sd_vc_copy" class="menu_button">复制条目</button>
        </div>
        <div class="sd-inline">
          <select id="sd_vc_wilist"></select>
          <input id="sd_vc_winame" type="text" placeholder="或填新世界书名">
          <button id="sd_vc_wisave" class="menu_button">写入世界书</button>
        </div>
        <div id="sd_vc_wistatus" class="sd-status"></div>
      </div>
    </div>

    <div class="sd-page" id="sd_page_polish" style="display:none">
      <div class="sd-sec">
        <div class="sd-sec-title">取卡片文字</div>
        <div class="sd-inline">
          <button id="sd_pl_takecard" class="menu_button">取角色卡</button>
          <span id="sd_pl_takestatus" class="sd-status"></span>
        </div>
        <label class="sd-field"><span>描述 description</span>
          <textarea id="sd_pl_desc" rows="4" placeholder="角色卡的描述。"></textarea>
        </label>
        <label class="sd-field"><span>性格 personality</span>
          <textarea id="sd_pl_pers" rows="3" placeholder="角色卡的性格。"></textarea>
        </label>
        <label class="sd-field"><span>场景 scenario</span>
          <textarea id="sd_pl_scen" rows="3" placeholder="角色卡的场景。"></textarea>
        </label>
        <div class="sd-actions">
          <button id="sd_pl_go" class="menu_button sd-primary">用当前文风润色</button>
          <span id="sd_pl_status" class="sd-status"></span>
        </div>
      </div>
      <div class="sd-sec">
        <div class="sd-sec-title">写回<span class="sd-hint">写回前会再确认一次</span></div>
        <div class="sd-actions">
          <button id="sd_pl_write" class="menu_button sd-primary">写回角色卡</button>
        </div>
        <div id="sd_pl_wstatus" class="sd-status"></div>
      </div>
    </div>

    <div class="sd-page" id="sd_page_lore" style="display:none">
      <div class="sd-sec">
        <div class="sd-sec-title">世界书补条目<span class="sd-hint">不知道世界书该怎么写的时候用</span></div>
        <label class="sd-field"><span>方式</span>
          <select id="sd_lo_mode">
            <option value="card">根据角色分析</option>
            <option value="search">联网搜索真实资料</option>
          </select>
        </label>
        <div id="sd_lo_card_wrap">
          <div class="sd-inline">
            <button id="sd_lo_takecard" class="menu_button">取角色卡</button>
            <span id="sd_lo_takestatus" class="sd-status"></span>
          </div>
          <label class="sd-field"><span>角色素材</span>
            <textarea id="sd_lo_source" rows="5" placeholder="点「取角色卡」自动填，也可以自己贴。"></textarea>
          </label>
        </div>
        <div id="sd_lo_search_wrap" style="display:none">
          <div class="sd-inline">
            <input id="sd_lo_query" type="text" placeholder="要查的概念/地点/年代，比如：维多利亚时代伦敦贫民窟">
            <button id="sd_lo_search" class="menu_button">搜索</button>
            <span id="sd_lo_searchstatus" class="sd-status"></span>
          </div>
          <div class="sd-note">走的是维基百科的公开接口，不是通用搜索引擎——查真实概念/地点/历史一般够用，查不到冷门或虚构设定。</div>
          <label class="sd-field"><span>查到的资料（可以改删）</span>
            <textarea id="sd_lo_snippets" rows="5" placeholder="点「搜索」自动填。"></textarea>
          </label>
        </div>
        <label class="sd-field"><span>想要的方向（可选）</span>
          <input id="sd_lo_hint" type="text" placeholder="比如：偏重物价和治安，别写地图">
        </label>
        <label class="sd-field"><span>生成几条</span>
          <select id="sd_lo_count">
            <option value="2">2 条</option>
            <option value="3" selected>3 条</option>
            <option value="5">5 条</option>
          </select>
        </label>
        <div class="sd-actions">
          <button id="sd_lo_generate" class="menu_button sd-primary">生成条目</button>
          <span id="sd_lo_status" class="sd-status"></span>
        </div>
      </div>
      <div class="sd-sec">
        <div class="sd-sec-title">挑一下，写进世界书</div>
        <div id="sd_lo_entries"><div class="sd-note">还没有生成结果。</div></div>
        <div class="sd-inline">
          <select id="sd_lo_wilist"></select>
          <input id="sd_lo_winame" type="text" placeholder="或填新世界书名">
          <button id="sd_lo_wisave" class="menu_button sd-primary">把勾选的写进世界书</button>
        </div>
        <div id="sd_lo_wistatus" class="sd-status"></div>
      </div>
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

function normalizeSource(v) {
  if (v === 'mine') return 'own';
  if (v === 'reference') return 'ref';
  return v === 'rule' || v === 'own' || v === 'ref' ? v : 'own';
}

function settings() {
  const { extensionSettings } = ctx();
  if (!extensionSettings[MODULE_NAME]) {
    extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
  }
  const s = extensionSettings[MODULE_NAME];
  const hadC1 = Object.hasOwn(s, 'confirmed1');
  const hadC2 = Object.hasOwn(s, 'confirmed2');
  for (const key of Object.keys(defaultSettings)) {
    if (!Object.hasOwn(s, key)) s[key] = structuredClone(defaultSettings[key]);
  }
  if (!s.stats) s.stats = { calls: 0, tokens: 0, saved: 0 };
  if (s.stats.saved == null) s.stats.saved = 0;
  if (!s.cache) s.cache = {};
  // 旧版只有 我的文字(mine)/参考文字(reference) 两档，迁移成新的三档
  s.source = normalizeSource(s.source);
  if (s.styleNotes == null) s.styleNotes = '';
  // 旧流程已经有文风块 / 读解结果的，当成两次都确认过，避免升级后向导把拿走藏起来
  if (!hadC1) s.confirmed1 = !!(s.read1 && (s.read2 || (s.block && String(s.block).trim())));
  if (!hadC2) s.confirmed2 = !!(s.block && String(s.block).trim());
  // 旧存档的 opening 对象可能没有这几个新字段，补上默认值
  if (s.opening) {
    if (s.opening.length == null) s.opening.length = 'medium';
    if (s.opening.personaMode == null) s.opening.personaMode = 'current';
    if (s.opening.personaCustom == null) s.opening.personaCustom = '';
    if (!Array.isArray(s.opening.worldbooks)) s.opening.worldbooks = [];
  }
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

let sessionCalls = 0;

function bumpStats(tokens) {
  const s = settings();
  s.stats.calls += 1;
  sessionCalls += 1;
  if (tokens) s.stats.tokens += tokens;
  renderStats();
  save();
}

function renderStats() {
  const s = settings();
  let txt = '本会话 ' + sessionCalls + ' 次 · 累计 ' + s.stats.calls + ' 次';
  if (s.stats.saved) txt += ' · 省 ' + s.stats.saved + ' 次';
  if (s.stats.tokens) txt += ' · ' + s.stats.tokens + ' tok';
  if (el('sd_stats')) el('sd_stats').textContent = txt;
  if (el('sd_stats_root')) el('sd_stats_root').textContent = '累计 ' + s.stats.calls + ' 次' + (s.stats.saved ? '（省 ' + s.stats.saved + ' 次）' : '');
}

function estimateTokens(text) {
  const cjk = (String(text).match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
  const other = Math.max(0, String(text).length - cjk);
  return Math.round(cjk * 0.9 + other / 4);
}

function updateSourceUI() {
  const sel = el('sd_source');
  const src = sel ? sel.value : 'own';
  const label = el('sd_corpus_label');
  const corpus = el('sd_corpus');
  const notesWrap = el('sd_rulenotes_wrap');
  const isRule = src === 'rule';
  if (label) label.textContent = isRule ? '文风指令' : '语料';
  if (corpus) corpus.placeholder = isRule
    ? '写下你对文风的要求/规则，比如：多用短句、避免比喻、第一人称、克制煽情……'
    : '同一体裁的原文，段落之间空一行。';
  if (notesWrap) notesWrap.style.display = isRule ? '' : 'none';
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
// 只锁正在跑的那一步，别的按钮不受影响
const busySteps = new Set();

function lockOr(statusId, step) {
  if (busySteps.has(step)) {
    setStatus(statusId, '这一步还在跑，等它结束。', 'error');
    return false;
  }
  busySteps.add(step);
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

// 每阶段保留的缓存份数。存多了会把酒馆的 settings.json 撑肥，2 份够「改回来还能命中」用
const CACHE_LIMIT = 2;

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
  // 「当前酒馆模型」模式走 generateRaw，接不了中断信号：把「停」置灰并说明
  const stop = el('sd_stop');
  if (stop) {
    const stOnly = s.mode !== 'custom';
    stop.classList.toggle('sd-disabled', stOnly);
    stop.title = stOnly
      ? '「当前酒馆模型」模式下无法中途断开请求；点这里仍会把这轮结果丢弃'
      : '停止本次生成';
  }
}

function readoutRow(label, value, layer) {
  return '<div class="sd-row"><b>' + esc(label) + '</b> ' + esc(value) + '</div>';
}

const LAYER_FIELDS = {
  syntax: [['vocab', '词汇偏好'], ['sentence', '句长分布'], ['rhythm', '节奏'], ['punctuation', '标点习惯'], ['register', '口语/书面比例']],
  object: [['writes', '写谁'], ['notWrites', '不写谁'], ['listener', '隐含听众']],
  attitude: [['tragedy', '对悲剧'], ['comedy', '对喜剧'], ['intimacy', '对亲密'], ['failure', '对失败'], ['time', '对时代']]
};

function layerCard(title, data, fields, layer) {
  const rows = fields
    .filter(([k]) => data[k])
    .map(([k, label]) => '<div class="sd-row"><b>' + esc(label) + '</b> ' + esc(data[k]) + '</div>')
    .join('');
  if (!rows) return '';
  const btn = layer
    ? ' <button class="sd-refresh menu_button" data-layer="' + esc(layer) + '" title="只重读这一层">重读</button>'
    : '';
  return '<div class="sd-layer"><div class="sd-layer-title">' + esc(title) + btn + '</div>' + rows + '</div>';
}

function layerListCard(title, list, layer) {
  const rows = (Array.isArray(list) ? list : [list]).filter(Boolean).map((v) => '<div class="sd-row">' + esc(v) + '</div>').join('');
  if (!rows) return '';
  const btn = layer
    ? ' <button class="sd-refresh menu_button" data-layer="' + esc(layer) + '" title="只重读这一层">重读</button>'
    : '';
  return '<div class="sd-layer"><div class="sd-layer-title">' + esc(title) + btn + '</div>' + rows + '</div>';
}

function renderReadout(target, data) {
  const parts = [];
  if (data.syntax) parts.push(layerCard('句法', data.syntax, LAYER_FIELDS.syntax, 'syntax'));
  if (data.object) parts.push(layerCard('对象', data.object, LAYER_FIELDS.object, 'object'));
  if (data.attitude) parts.push(layerCard('态度', data.attitude, LAYER_FIELDS.attitude, 'attitude'));
  if (data.rhetoric && (Array.isArray(data.rhetoric) ? data.rhetoric.length : data.rhetoric)) {
    parts.push(layerListCard('修辞', data.rhetoric, 'rhetoric'));
  }
  if (data.belief_core) parts.push(readoutRow('核心信念', data.belief_core));
  if (data.position) parts.push(readoutRow('历史定位', data.position));
  if (data.neighbor_diff) parts.push(readoutRow('和相近文风的区别', data.neighbor_diff));
  if (data.draft) {
    parts.push(readoutRow('参考草稿', data.draft.draft || ''));
    if (data.draft.uncertain && data.draft.uncertain.length) {
      parts.push(layerListCard('请你定夺', data.draft.uncertain));
    }
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
  if (!list.length) {
    target.innerHTML = '<div class="sd-note">这一轮没有拿不准的地方，可以直接润色成块。</div>';
    return;
  }
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
  s.source = normalizeSource(el('sd_source').value);
  s.genre = el('sd_genre').value;
  s.name = el('sd_name').value.trim();
  s.corpus = el('sd_corpus').value.trim();
  s.styleNotes = (el('sd_rulenotes') && el('sd_rulenotes').value.trim()) || '';
  save();
  const isRule = s.source === 'rule';
  const deep = s.source === 'own';
  if (!s.corpus) {
    setStatus('sd_status1', isRule ? '先写文风指令。' : '先贴语料。', 'error');
    return;
  }
  if (!lockOr('sd_status1', 'read1')) return;
  cancelled = false;
  setStatus('sd_status1', s.thrifty ? '一次读完…' : '读解中…');
  el('sd_read1').disabled = true;
  try {
    const thrifty = !!s.thrifty;
    const key = hashKey(
      isRule
        ? { rule: true, all: thrifty, instruction: s.corpus, notes: s.styleNotes, genre: s.genre }
        : { all: thrifty, corpus: s.corpus, genre: s.genre, deep }
    );
    const { data, cached } = await cachedRun(
      thrifty ? 'readall' : 'read1',
      key,
      async () =>
        parseJSON(
          await callModel(
            isRule
              ? (thrifty
                  ? Prompts.ruleReadAll({ instruction: s.corpus, notes: s.styleNotes, genre: s.genre })
                  : Prompts.ruleRead1({ instruction: s.corpus, notes: s.styleNotes, genre: s.genre }))
              : (thrifty
                  ? Prompts.readAll({ corpus: s.corpus, genre: s.genre, deep })
                  : Prompts.read1({ corpus: s.corpus, genre: s.genre, deep }))
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
    // 三档现在都可能给"拿不准清单"——模型给了才展示，不再按来源写死。
    s.uncertain = (data.draft && Array.isArray(data.draft.uncertain) ? data.draft.uncertain : []).map((q) => ({
      q: String(q),
      ruling: ''
    }));
    s.confirmed1 = false;
    s.confirmed2 = false;
    renderReadout(el('sd_readout'), Object.assign({}, s.read1, { draft: s.draft }));
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
      setStatus('sd_status1', cached ? '一次读完命中缓存，未再调用 API。去确认①。' : '读解完成，去确认①（信念和禁忌）。', 'ok');
    } else {
      setStatus('sd_status1', cached ? '输入没变，用上次结果，未再调用 API。去确认①。' : '读解完成，去确认①。', 'ok');
    }
    updateWizard();
    save();
  } catch (e) {
    setStatus('sd_status1', String(e.message || e), 'error');
  } finally {
    el('sd_read1').disabled = false;
    busySteps.delete('read1');
  }
}

async function runRefineLayer(layer) {
  const s = settings();
  if (!s.read1 || !s.corpus) {
    setStatus('sd_status1', '先读前三遍。', 'error');
    return;
  }
  if (!lockOr('sd_status1', 'refine')) return;
  cancelled = false;
  setStatus('sd_status1', '重读「' + (Prompts.LAYERS[layer] || layer) + '」…');
  try {
    const current = s.read1[layer];
    const out = await callModel(Prompts.refineLayer({ layer, current, corpus: s.corpus, genre: s.genre }));
    const parsed = parseJSON(out);
    if (parsed && parsed.value !== undefined) {
      s.read1[layer] = parsed.value;
      renderReadout(el('sd_readout'), Object.assign({}, s.read1, { draft: s.draft }));
      setStatus('sd_status1', '「' + (Prompts.LAYERS[layer] || layer) + '」重读好了。', 'ok');
      save();
    } else {
      setStatus('sd_status1', '重读返回格式不对，再试一次。', 'error');
    }
  } catch (e) {
    setStatus('sd_status1', String(e.message || e), 'error');
  } finally {
    busySteps.delete('refine');
  }
}

async function ensureRead2(force) {
  const s = settings();
  if (s.read2 && !force) return s.read2;
  const beliefs = selectedBeliefs();
  if (!beliefs) throw new Error('至少留一条信念。');
  const key = hashKey({ corpus: s.corpus, genre: s.genre, beliefs });
  const { data } = await cachedRun(
    'read2',
    key,
    async () => parseJSON(await callModel(Prompts.read2({ corpus: s.corpus, genre: s.genre, beliefs }))),
    force
  );
  s.read2 = data;
  s.blacklist = mapBlacklist(data.blacklist);
  renderReadout(el('sd_position'), data);
  renderBlacklist();
  return data;
}

async function runConfirm1(force) {
  const s = settings();
  if (!s.read1) {
    setStatus('sd_status2', '先把读解做完。', 'error');
    return;
  }
  if (!selectedBeliefs()) {
    setStatus('sd_status2', '至少留一条信念。', 'error');
    return;
  }
  if (!lockOr('sd_status2', 'confirm1')) return;
  cancelled = false;
  const btn = el('sd_confirm1');
  if (btn) btn.disabled = true;
  try {
    const hadRead2 = !!s.read2 && !force;
    if (!hadRead2) {
      setStatus('sd_status2', '补读后三遍…');
      await ensureRead2(force);
      setStatus('sd_status2', '后三遍读完了，看一眼禁忌再点一次确认。', 'ok');
      updateWizard();
      save();
      return;
    }
    const n = selectedBlacklist().length;
    s.confirmed1 = true;
    s.confirmed2 = false;
    renderUncertain();
    setStatus('sd_status2', n < 6 ? '已确认①。禁忌不到 6 条，下一步也能走，补几条更稳。' : '已确认①，去拍板拿不准的。', 'ok');
    updateWizard();
    save();
  } catch (e) {
    setStatus('sd_status2', String(e.message || e), 'error');
  } finally {
    if (btn) btn.disabled = false;
    busySteps.delete('confirm1');
  }
}

function composeLocally({ name, genre, read1, read2, samples, blacklist, rulings, beliefs }) {
  const syntax = (read1 && read1.syntax) || {};
  const title = `# ${name && name.trim() ? name.trim() : '未命名文风'} · ${Prompts.genreLabel(genre)}`;
  const core = (read2 && read2.belief_core && read2.belief_core.trim()) || '（核心信念缺失，回确认①补）';
  const pickedBeliefs = (beliefs && beliefs.length
    ? beliefs
    : ((read1 && read1.beliefs) || []).map((b) => b && b.belief).filter(Boolean));
  const beliefsLine = pickedBeliefs.join('；') || core;
  const syntaxLine = [syntax.vocab, syntax.sentence, syntax.rhythm, syntax.punctuation, syntax.register].filter(Boolean).join('；') || '（句法信息缺失）';
  const rhetoricLine = ((read1 && read1.rhetoric) || []).filter(Boolean).join('；') || '（无特别记录）';
  const neighborLine = (read2 && read2.neighbor_diff && read2.neighbor_diff.trim()) || '（未记录）';
  const blkSource = blacklist && blacklist.length ? blacklist : ((read2 && read2.blacklist) || []).map((b) => b && b.text).filter(Boolean);
  const blacklistLines = blkSource.length ? blkSource.map((t) => `- ${t}`).join('\n') : '- （禁忌清单为空，回确认①至少补 6 条）';
  const sampleText = samples && samples.length ? samples.join('\n\n') : '样本缺失';
  const rulingsBlock = rulings && rulings.trim() ? `\n\n（拿不准的地方，已按你的决定处理：\n${rulings}）` : '';
  return `${title}
> ${core}
信念：${beliefsLine}
句法纪律：${syntaxLine}
修辞习惯：${rhetoricLine}
跟邻居的界：${neighborLine}
反例（绝不写）：
${blacklistLines}
样本：
${sampleText}${rulingsBlock}`;
}

function buildLocalDraft() {
  const s = settings();
  return composeLocally({
    name: s.name,
    genre: s.genre,
    read1: s.read1,
    read2: s.read2,
    samples: (s.read1 && s.read1.samples) || [],
    blacklist: selectedBlacklist(),
    rulings: selectedRulings(),
    beliefs: (s.beliefs || []).filter((b) => b && b.on && b.belief && String(b.belief).trim()).map((b) => String(b.belief).trim())
  });
}

async function runConfirm2(force) {
  const s = settings();
  if (!s.confirmed1) {
    setStatus('sd_status3', '先点确认①。', 'error');
    return;
  }
  if (!s.read1 || !s.read2) {
    setStatus('sd_status3', '先把读解做完。', 'error');
    return;
  }
  if (!lockOr('sd_status3', 'confirm2')) return;
  cancelled = false;
  const btn = el('sd_confirm2');
  if (btn) btn.disabled = true;
  const draft = buildLocalDraft();
  el('sd_block').value = draft;
  s.block = draft;
  try {
    setStatus('sd_status3', '草稿已拼好，正在润色…');
    const rulings = selectedRulings();
    const key = hashKey({ stage: 'polish', draft, name: s.name, rulings });
    const { data, cached } = await cachedRun(
      'polish',
      key,
      async () =>
        (
          await callModel(Prompts.polishBlock({ draft, name: s.name, rulings }), (chunk) => {
            el('sd_block').value = chunk;
          })
        ).trim(),
      force
    );
    const polished = String(data || '').trim();
    s.block = polished || draft;
    el('sd_block').value = s.block;
    s.confirmed2 = true;
    setStatus('sd_status3', cached ? '润色命中缓存，未再调用 API。可以拿走了。' : '润色好了，可以拿走；不满意就手改。', 'ok');
    updateWizard();
    save();
  } catch (e) {
    s.confirmed2 = true;
    s.block = draft;
    el('sd_block').value = draft;
    setStatus('sd_status3', '润色没成，留下本地草稿。原因：' + String(e.message || e), 'error');
    updateWizard();
    save();
  } finally {
    if (btn) btn.disabled = false;
    busySteps.delete('confirm2');
  }
}

/* ================= 开场白工坊 ================= */

const OPENING_SCENES = {
  first: '初次见面，双方还不认识',
  known: '两人已经熟识',
  conflict: '两人正处于冲突之中'
};
const OPENING_ARCHIVE_LIMIT = 20;

function opSceneLabel() {
  const o = settings().opening;
  if (o.scene === 'custom') return o.sceneCustom.trim() || '自定义场景';
  return OPENING_SCENES[o.scene] || o.scene;
}

function opStyleBlock() {
  const s = settings();
  const from = s.opening.styleFrom;
  if (from === 'none') return '';
  if (!from || from === 'current') {
    const panel = el('sd_block') && el('sd_block').value.trim();
    return panel || String(s.block || '').trim();
  }
  const item = (s.styles || []).find((it) => it.id === from);
  return item && item.data && item.data.block ? String(item.data.block).trim() : '';
}

function cardCorpus() {
  const c = ctx();
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
  if (!f) return null;
  const parts = [f.description, f.personality, f.scenario, f.mesExamples || f.mes_example || f.exampleMessages]
    .map((x) => String(x || '').trim())
    .filter(Boolean);
  const text = parts.join('\n\n').trim();
  return text || null;
}

function opTakeCard() {
  const text = cardCorpus();
  if (!text) {
    setStatus('sd_op_takestatus', '拿不到当前角色卡。', 'error');
    return;
  }
  settings().opening.source = text;
  setVal('sd_op_source', text);
  save();
  setStatus('sd_op_takestatus', '已取角色卡素材（' + text.length + ' 字），可再增删。', 'ok');
}

function opDefaultBookName() {
  try {
    const c = ctx();
    const ch = c.characters && c.characters[c.characterId];
    return (ch && ch.extensions && ch.extensions.world) || '';
  } catch (e) {
    return '';
  }
}

function opAvailableBooks() {
  try {
    const c = ctx();
    if (typeof c.getWorldInfoNames === 'function') return c.getWorldInfoNames() || [];
  } catch (e) {}
  return [];
}

// 列出世界书勾选框：默认勾上角色已挂载的那本，其余可以自由加选。
function renderOpBooks() {
  const wrap = el('sd_op_books');
  if (!wrap) return;
  const s = settings();
  if (!Array.isArray(s.opening.worldbooks)) s.opening.worldbooks = [];
  const names = opAvailableBooks();
  if (!names.length) {
    wrap.innerHTML = '<div class="sd-note">没读到世界书列表（这版酒馆可能不支持列出全部世界书）；点「角色卡 + 勾选的世界书」会退回用角色已挂载的那一本。</div>';
    return;
  }
  if (!s.opening._booksInit) {
    const def = opDefaultBookName();
    if (def && !s.opening.worldbooks.includes(def)) s.opening.worldbooks.push(def);
    s.opening._booksInit = true;
    save();
  }
  wrap.innerHTML = names
    .map(
      (n) =>
        '<label class="sd-check"><input type="checkbox" class="sd-op-book" value="' +
        esc(n) +
        '"' +
        (s.opening.worldbooks.includes(n) ? ' checked' : '') +
        '> <span>' +
        esc(n) +
        '</span></label>'
    )
    .join('');
  wrap.querySelectorAll('.sd-op-book').forEach((cb) => {
    cb.addEventListener('change', () => {
      const cur = settings().opening;
      const set = new Set(cur.worldbooks || []);
      if (cb.checked) set.add(cb.value);
      else set.delete(cb.value);
      cur.worldbooks = Array.from(set);
      save();
    });
  });
}

async function opTakeCardWithLore() {
  const text = cardCorpus();
  if (!text) {
    setStatus('sd_op_takestatus', '拿不到当前角色卡。', 'error');
    return;
  }
  const s = settings();
  const picked = (s.opening.worldbooks || []).filter(Boolean);
  const books = picked.length ? picked : [opDefaultBookName()].filter(Boolean);
  let lore = '';
  try {
    const c = ctx();
    if (typeof c.loadWorldInfo === 'function') {
      const chunks = [];
      for (const name of books) {
        const data = await c.loadWorldInfo(name);
        // “默认开启”的条目：没有被手动关掉(disable)的那些，跟酒馆本身的启用状态一致。
        const entries = Object.values((data && data.entries) || {}).filter((e2) => e2 && e2.content && !e2.disable);
        if (entries.length) chunks.push(entries.map((e2) => String(e2.content).trim()).join('\n\n'));
      }
      lore = chunks.join('\n\n');
    }
  } catch (e) {
    lore = '';
  }
  const full = (text + (lore ? '\n\n' + lore : '')).trim();
  settings().opening.source = full;
  setVal('sd_op_source', full);
  save();
  setStatus(
    'sd_op_takestatus',
    '已取角色卡' + (lore ? ' + ' + books.length + ' 本世界书' : '（勾选的世界书没读到条目）') + '（' + full.length + ' 字）。',
    'ok'
  );
}

// 人设：尝试拿当前用户人设名字+简介；拿不到就返回 null，界面上会提示改用"自己写一段简介"。
function personaCorpus() {
  try {
    const c = ctx();
    const name = c.name1 || '';
    let desc = '';
    if (typeof c.getPersonaDescription === 'function') desc = c.getPersonaDescription() || '';
    else if (c.powerUserSettings && c.powerUserSettings.persona_description) desc = c.powerUserSettings.persona_description;
    else if (c.power_user && c.power_user.persona_description) desc = c.power_user.persona_description;
    else if (c.personas && c.user_avatar && c.personas[c.user_avatar]) desc = c.personas[c.user_avatar];
    const text = [name ? '人设名：' + name : '', desc ? String(desc).trim() : ''].filter(Boolean).join('\n');
    return text || null;
  } catch (e) {
    return null;
  }
}

function opPersonaUI() {
  const wrap = el('sd_op_personacustom_wrap');
  if (wrap) wrap.style.display = settings().opening.personaMode === 'custom' ? '' : 'none';
}

function opPersonaText() {
  const o = settings().opening;
  if (o.personaMode === 'custom') return (o.personaCustom || '').trim();
  return personaCorpus() || '';
}

function opSceneUI() {
  const wrap = el('sd_op_scenecustom_wrap');
  if (wrap) wrap.style.display = settings().opening.scene === 'custom' ? '' : 'none';
}

function renderOpStyleSelect() {
  const sel = el('sd_op_style');
  if (!sel) return;
  const list = settings().styles || [];
  const keep = settings().opening.styleFrom || 'current';
  const arch = list
    .map((it) => '<option value="' + esc(it.id) + '">存档 · ' + esc(it.name) + '</option>')
    .join('');
  sel.innerHTML =
    '<option value="current">当前面板里的文风块</option>' +
    '<option value="none">不用文风，只写开场白</option>' +
    (arch || '<option value="" disabled>（还没有文风存档）</option>');
  const has = keep === 'current' || keep === 'none' || list.some((it) => it.id === keep);
  sel.value = has ? keep : 'current';
}

async function runOpenings(force) {
  const s = settings();
  s.opening.source = (el('sd_op_source') ? el('sd_op_source').value : s.opening.source).trim();
  save();
  if (!s.opening.source) {
    setStatus('sd_op_status', '先取角色素材。', 'error');
    return;
  }
  if (!lockOr('sd_op_status', 'openings')) return;
  cancelled = false;
  setStatus('sd_op_status', '生成中…');
  el('sd_op_generate').disabled = true;
  try {
    const scene = opSceneLabel();
    const count = Number(s.opening.count) || 2;
    const block = opStyleBlock();
    const length = s.opening.length || 'medium';
    const persona = opPersonaText();
    const key = hashKey({ stage: 'openings', source: s.opening.source, scene, count, block, length, persona });
    const { data, cached } = await cachedRun(
      'openings',
      key,
      async () => parseJSON(await callModel(Prompts.openings({ source: s.opening.source, styleBlock: block, scene, count, length, persona }))),
      force
    );
    const list = (Array.isArray(data.openings) ? data.openings : []).map((t) => String(t || '').trim()).filter(Boolean);
    if (!list.length) throw new Error('模型没返回开场白，重试一次。');
    s.opening.candidates = list;
    s.opening.picked = 0;
    renderOpenings();
    setStatus('sd_op_status', cached ? '输入没变，用上次结果，未再调用 API。' : '生成好了，挑一条吧。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_op_status', String(e.message || e), 'error');
  } finally {
    el('sd_op_generate').disabled = false;
    busySteps.delete('openings');
  }
}

async function runOpeningRewrite(i) {
  const s = settings();
  const list = s.opening.candidates || [];
  if (!list[i]) return;
  if (!lockOr('sd_op_status', 'openings')) return;
  cancelled = false;
  setStatus('sd_op_status', '重写第 ' + (i + 1) + ' 条…');
  try {
    const block = opStyleBlock();
    const scene = opSceneLabel();
    const length = s.opening.length || 'medium';
    const persona = opPersonaText();
    const out = await callModel(Prompts.rewriteOpening({ source: s.opening.source, styleBlock: block, scene, old: list[i], length, persona }));
    const parsed = parseJSON(out);
    const text = String(parsed.opening || '').trim();
    if (!text) throw new Error('返回是空的，再试一次。');
    s.opening.candidates[i] = text;
    renderOpenings();
    setStatus('sd_op_status', '第 ' + (i + 1) + ' 条重写好了。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_op_status', String(e.message || e), 'error');
  } finally {
    busySteps.delete('openings');
  }
}

function renderOpenings() {
  const s = settings();
  const target = el('sd_op_candidates');
  if (!target) return;
  const list = s.opening.candidates || [];
  if (!list.length) {
    target.innerHTML = '<div class="sd-note">还没有候选。选好场景点上面的「生成开场白」。</div>';
    return;
  }
  target.innerHTML = list
    .map(
      (t, i) =>
        '<div class="sd-open-cand' + (i === s.opening.picked ? ' sd-picked' : '') + '" data-i="' + i + '">' +
        '<div class="sd-cand-text">' + esc(t) + '</div>' +
        '<div class="sd-cand-actions">' +
        '<button class="menu_button sd-op-rew" data-i="' + i + '">重写这一条</button>' +
        '<button class="menu_button sd-op-use" data-i="' + i + '">就用这条</button>' +
        '<button class="menu_button sd-op-first" data-i="' + i + '">写第一条</button>' +
        '<button class="menu_button sd-op-alt" data-i="' + i + '">加备选</button>' +
        '</div></div>'
    )
    .join('');
  target.querySelectorAll('.sd-open-cand').forEach((card) => {
    const i = Number(card.dataset.i);
    card.querySelector('.sd-op-rew').addEventListener('click', () => runOpeningRewrite(i));
    card.querySelector('.sd-op-use').addEventListener('click', () => {
      settings().opening.picked = i;
      renderOpenings();
      setStatus('sd_op_wstatus', '已选中第 ' + (i + 1) + ' 条，可以去「拿走」。', 'ok');
      save();
    });
    card.querySelector('.sd-op-first').addEventListener('click', () => opWrite('first', i));
    card.querySelector('.sd-op-alt').addEventListener('click', () => opWrite('alt', i));
  });
}

function opPickedText() {
  const o = settings().opening;
  return (o.candidates || [])[o.picked] || '';
}

async function opWrite(mode, i) {
  const c = ctx();
  const o = settings().opening;
  const idx = i != null ? i : o.picked;
  const text = (o.candidates || [])[idx] || '';
  if (!text) {
    setStatus('sd_op_wstatus', '先挑一条开场白。', 'error');
    return;
  }
  const ch = c && c.characters && c.characters[c.characterId];
  if (!ch) {
    setStatus('sd_op_wstatus', '拿不到当前角色卡。', 'error');
    return;
  }
  const where = mode === 'first' ? '第一条开场白（first_mes，会覆盖原来的）' : '备选开场白（alternate_greetings，会追加一条）';
  if (!window.confirm('把选中的开场白写进角色卡「' + ch.name + '」的\n' + where + '？')) return;
  if (mode === 'first') {
    ch.first_mes = text;
  } else {
    if (!Array.isArray(ch.alternate_greetings)) ch.alternate_greetings = [];
    ch.alternate_greetings.push(text);
  }
  try {
    if (typeof c.writeCharacterFields === 'function') {
      await c.writeCharacterFields(ch.name, mode === 'first' ? { first_mes: text } : { alternate_greetings: ch.alternate_greetings });
      setStatus('sd_op_wstatus', '已写进「' + ch.name + '」，切换角色或重开对话就能看到。', 'ok');
    } else {
      setStatus('sd_op_wstatus', '已写入内存；这版酒馆没有直接保存接口，请到角色管理面板点一次「保存」落盘。', 'ok');
    }
  } catch (e) {
    setStatus('sd_op_wstatus', '写入失败：' + String(e.message || e), 'error');
  }
}

function opLabel() {
  const ch = (() => {
    try {
      const c = ctx();
      return (c.characters && c.characters[c.characterId] && c.characters[c.characterId].name) || '';
    } catch (e) {
      return '';
    }
  })();
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (ch ? ch + ' · ' : '') + opSceneLabel() + '（' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '）';
}

function renderOpArch(selectedId) {
  const sel = el('sd_op_archlist');
  if (!sel) return;
  const list = settings().opening.archive || [];
  if (!list.length) {
    sel.innerHTML = '<option value="">（开场白存档是空的）</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  const keep = (selectedId !== undefined ? selectedId : sel.value) || '';
  sel.innerHTML = list.map((it) => '<option value="' + esc(it.id) + '">' + esc(it.name) + '</option>').join('');
  if (keep && list.some((it) => it.id === keep)) sel.value = keep;
}

function opArchiveSave() {
  const s = settings();
  const text = opPickedText();
  if (!text) {
    setStatus('sd_op_wstatus', '先挑一条开场白。', 'error');
    return;
  }
  if ((s.opening.archive || []).length >= OPENING_ARCHIVE_LIMIT) {
    setStatus('sd_op_wstatus', '开场白存档满了（' + OPENING_ARCHIVE_LIMIT + ' 条），先删几条。', 'error');
    return;
  }
  const item = { id: 'op_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: opLabel(), text, savedAt: Date.now() };
  s.opening.archive = (s.opening.archive || []).concat([item]);
  renderOpArch(item.id);
  setStatus('sd_op_wstatus', '已存进开场白存档。', 'ok');
  save();
}

function opArchiveLoad() {
  const item = (settings().opening.archive || []).find((it) => it.id === el('sd_op_archlist').value);
  if (!item) {
    setStatus('sd_op_wstatus', '先选一条存档。', 'error');
    return;
  }
  settings().opening.candidates = [item.text];
  settings().opening.picked = 0;
  renderOpenings();
  setStatus('sd_op_wstatus', '已载入「' + item.name + '」，可以直接复制或写回。', 'ok');
  save();
}

function opArchiveDel() {
  const s = settings();
  const id = el('sd_op_archlist').value;
  const item = (s.opening.archive || []).find((it) => it.id === id);
  if (!item) {
    setStatus('sd_op_wstatus', '先选一条存档。', 'error');
    return;
  }
  if (!window.confirm('删除开场白存档「' + item.name + '」？删了就找不回。')) return;
  s.opening.archive = (s.opening.archive || []).filter((it) => it.id !== item.id);
  renderOpArch('');
  setStatus('sd_op_wstatus', '已删除。', 'ok');
  save();
}

/* ================= 楼层改写 ================= */

let remsgList = [];
let remsgPicked = -1;

function remsgMessages() {
  const c = ctx();
  const chat = Array.isArray(c.chat) ? c.chat : [];
  const out = [];
  chat.forEach((m, i) => {
    if (m && !m.is_user && typeof m.mes === 'string' && m.mes.trim()) {
      out.push({ i, text: m.mes.trim(), name: m.name || '' });
    }
  });
  return out;
}

function renderRemsg() {
  const target = el('sd_remsg_list');
  if (!target) return;
  let list = [];
  try {
    list = remsgMessages().slice(-12).reverse();
  } catch (e) {
    target.innerHTML = '<div class="sd-note">拿不到聊天记录。</div>';
    return;
  }
  remsgList = list;
  if (!list.length) {
    target.innerHTML = '<div class="sd-note">当前聊天里没有角色发言。</div>';
    return;
  }
  target.innerHTML = list
    .map(({ text, name }, k) => {
      const prev = text.length > 80 ? text.slice(0, 80) + '…' : text;
      return (
        '<div class="sd-card' + (k === remsgPicked ? ' sd-picked' : '') + '" data-k="' + k + '">' +
        '<div class="sd-cardbody"><div class="sd-meta">' + esc(name || '角色') + ' · ' + esc(prev) + '</div></div></div>'
      );
    })
    .join('');
  target.querySelectorAll('.sd-card').forEach((card) => {
    card.addEventListener('click', () => {
      remsgPicked = Number(card.dataset.k);
      renderRemsg();
    });
  });
}

async function runRemsg(force) {
  const m = remsgList[remsgPicked];
  if (!m) {
    setStatus('sd_remsg_status', '先在上面点选一层。', 'error');
    return;
  }
  const block = (el('sd_block') && el('sd_block').value.trim()) || String(settings().block || '').trim();
  if (!block) {
    setStatus('sd_remsg_status', '文风块是空的，先去「文风蒸馏」成块，或在存档里载入一套。', 'error');
    return;
  }
  if (!lockOr('sd_remsg_status', 'remsg')) return;
  cancelled = false;
  setStatus('sd_remsg_status', '改写中…');
  el('sd_remsg_go').disabled = true;
  try {
    const key = hashKey({ stage: 'remsg', block, passage: m.text });
    const { data, cached } = await cachedRun(
      'remsg',
      key,
      async () => (await callModel(Prompts.rewrite({ block, passage: m.text }))).trim(),
      force
    );
    setVal('sd_remsg_result', data);
    setStatus('sd_remsg_status', cached ? '输入没变，用上次结果，未再调用 API。' : '改好了，检查一下再写回。', 'ok');
  } catch (e) {
    setStatus('sd_remsg_status', String(e.message || e), 'error');
  } finally {
    el('sd_remsg_go').disabled = false;
    busySteps.delete('remsg');
  }
}

async function remsgWrite() {
  const m = remsgList[remsgPicked];
  const text = (el('sd_remsg_result') ? el('sd_remsg_result').value : '').trim();
  if (!m || !text) {
    setStatus('sd_remsg_status', '先选楼层并改写。', 'error');
    return;
  }
  if (!window.confirm('把改写结果写回第 ' + (m.i + 1) + ' 楼（' + (m.name || '角色') + ' 的发言）？\n原内容会被覆盖，建议先备份聊天。')) return;
  try {
    const c = ctx();
    if (!Array.isArray(c.chat) || !c.chat[m.i]) throw new Error('聊天记录变了，刷新列表重选一次。');
    c.chat[m.i].mes = text;
    if (typeof c.saveChatConditional === 'function') await c.saveChatConditional();
    else if (typeof c.saveChat === 'function') await c.saveChat();
    const node = document.querySelector('[mesid="' + m.i + '"] .mes_text');
    if (node) {
      try {
        if (typeof c.messageFormatting === 'function') {
          node.innerHTML = c.messageFormatting(text, m.name || '', false, false, m.i);
        } else {
          node.textContent = text;
        }
      } catch (e2) {
        node.textContent = text;
      }
    }
    setStatus('sd_remsg_status', '已写回第 ' + (m.i + 1) + ' 楼并保存。', 'ok');
    renderRemsg();
  } catch (e) {
    setStatus('sd_remsg_status', String(e.message || e), 'error');
  }
}

/* ================= 角色说话腔 ================= */

function voiceTakeDialogue() {
  const c = ctx();
  const ch = c && c.characters && c.characters[c.characterId];
  const text = String((ch && (ch.mes_example || ch.mesExamples)) || '').trim();
  if (!text) {
    setStatus('sd_vc_takestatus', '角色卡里没有示例对白，改用「取聊天里的角色发言」。', 'error');
    return;
  }
  settings().voice.corpus = text;
  setVal('sd_vc_corpus', text);
  save();
  setStatus('sd_vc_takestatus', '已取示例对白（' + text.length + ' 字），可再增删。', 'ok');
}

function voiceTakeChat() {
  const c = ctx();
  const chat = Array.isArray(c.chat) ? c.chat : [];
  const msgs = chat.filter((m) => m && !m.is_user && typeof m.mes === 'string' && m.mes.trim()).map((m) => m.mes.trim());
  const text = msgs.join('\n\n').trim();
  if (!text) {
    setStatus('sd_vc_takestatus', '当前聊天里没有角色发言。', 'error');
    return;
  }
  settings().voice.corpus = text;
  setVal('sd_vc_corpus', text);
  save();
  setStatus('sd_vc_takestatus', '已取 ' + msgs.length + ' 条角色发言（' + text.length + ' 字），可再增删。', 'ok');
}

async function runVoice(force) {
  const s = settings();
  s.voice.corpus = (el('sd_vc_corpus') ? el('sd_vc_corpus').value : s.voice.corpus).trim();
  save();
  if (!s.voice.corpus) {
    setStatus('sd_vc_status', '先取对白语料。', 'error');
    return;
  }
  if (!lockOr('sd_vc_status', 'voice')) return;
  cancelled = false;
  setStatus('sd_vc_status', '蒸馏中…');
  el('sd_vc_go').disabled = true;
  try {
    const key = hashKey({ stage: 'voice', corpus: s.voice.corpus });
    const { data, cached } = await cachedRun(
      'voice',
      key,
      async () => parseJSON(await callModel(Prompts.speechStyle({ source: s.voice.corpus }))),
      force
    );
    const entry = String(data.entry || '').trim();
    if (!entry) throw new Error('模型没返回条目，重试一次。');
    s.voice.entry = entry;
    el('sd_vc_entry').value = entry;
    setStatus('sd_vc_status', cached ? '输入没变，用上次结果，未再调用 API。' : '说话腔蒸好了，可手改。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_vc_status', String(e.message || e), 'error');
  } finally {
    el('sd_vc_go').disabled = false;
    busySteps.delete('voice');
  }
}

async function voiceSaveWorldInfo() {
  const c = ctx();
  if (typeof c.loadWorldInfo !== 'function' || typeof c.saveWorldInfo !== 'function') {
    setStatus('sd_vc_wistatus', '这版酒馆没有世界书写入接口，请复制后手动粘贴。', 'error');
    return;
  }
  const entry = (el('sd_vc_entry') ? el('sd_vc_entry').value : settings().voice.entry).trim();
  if (!entry) {
    setStatus('sd_vc_wistatus', '条目是空的，先蒸馏。', 'error');
    return;
  }
  const pick = el('sd_vc_wilist').value || '';
  const name = el('sd_vc_winame').value.trim() || pick || '说话方式';
  let keyName = '说话方式';
  try {
    const ch = c.characters && c.characters[c.characterId];
    if (ch && ch.name) keyName = ch.name + ' · 说话方式';
  } catch (e) {}
  if (!window.confirm('把「说话方式」条目写进世界书「' + name + '」？\n触发关键词：' + keyName)) return;
  try {
    const data = (await c.loadWorldInfo(name)) || { entries: {} };
    if (!data.entries) data.entries = {};
    const uids = Object.keys(data.entries)
      .map((k) => Number(data.entries[k] && data.entries[k].uid != null ? data.entries[k].uid : k))
      .filter((n) => Number.isFinite(n));
    const uid = uids.length ? Math.max(...uids) + 1 : 0;
    data.entries[uid] = buildLorebookEntry(keyName, entry, uid);
    await c.saveWorldInfo(name, data, true);
    if (typeof c.reloadWorldInfoEditor === 'function') c.reloadWorldInfoEditor(name);
    renderWiList();
    setStatus('sd_vc_wistatus', '已写入「' + name + '」，去「世界信息」看看。', 'ok');
  } catch (e) {
    setStatus('sd_vc_wistatus', '写入失败：' + String(e.message || e), 'error');
  }
}

/* ================= 卡片润色 ================= */

const POLISH_FIELDS = [
  ['description', 'sd_pl_desc'],
  ['personality', 'sd_pl_pers'],
  ['scenario', 'sd_pl_scen']
];

function polishTakeCard() {
  const c = ctx();
  const ch = c && c.characters && c.characters[c.characterId];
  if (!ch) {
    setStatus('sd_pl_takestatus', '拿不到当前角色卡。', 'error');
    return;
  }
  const s = settings();
  POLISH_FIELDS.forEach(([key, id]) => {
    const v = String(ch[key] || '');
    s.polish[key] = v;
    setVal(id, v);
  });
  save();
  setStatus('sd_pl_takestatus', '已取「' + ch.name + '」的卡片文字，可再增删。', 'ok');
}

async function runPolish(force) {
  const s = settings();
  const fields = {};
  POLISH_FIELDS.forEach(([key, id]) => {
    s.polish[key] = el(id) ? el(id).value : s.polish[key];
    if (String(s.polish[key] || '').trim()) fields[key] = String(s.polish[key]).trim();
  });
  save();
  if (!Object.keys(fields).length) {
    setStatus('sd_pl_status', '三个字段都是空的，先取角色卡。', 'error');
    return;
  }
  const block = (el('sd_block') && el('sd_block').value.trim()) || String(s.block || '').trim();
  if (!block) {
    setStatus('sd_pl_status', '文风块是空的，先去「文风蒸馏」成块，或在存档里载入一套。', 'error');
    return;
  }
  if (!lockOr('sd_pl_status', 'polish')) return;
  cancelled = false;
  setStatus('sd_pl_status', '润色中…');
  el('sd_pl_go').disabled = true;
  try {
    const key = hashKey({ stage: 'polish', block, fields });
    const { data, cached } = await cachedRun(
      'polish',
      key,
      async () =>
        parseJSON(
          await callModel(
            Prompts.polish({
              styleBlock: block,
              description: fields.description || '',
              personality: fields.personality || '',
              scenario: fields.scenario || ''
            })
          )
        ),
      force
    );
    let applied = 0;
    POLISH_FIELDS.forEach(([fkey, id]) => {
      if (fields[fkey] && data[fkey] != null && String(data[fkey]).trim()) {
        const v = String(data[fkey]).trim();
        s.polish[fkey] = v;
        setVal(id, v);
        applied += 1;
      }
    });
    if (!applied) throw new Error('模型没返回可用的改写，重试一次。');
    setStatus('sd_pl_status', cached ? '输入没变，用上次结果，未再调用 API。' : '润色好了（' + applied + ' 个字段），检查一下再写回。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_pl_status', String(e.message || e), 'error');
  } finally {
    el('sd_pl_go').disabled = false;
    busySteps.delete('polish');
  }
}

async function polishWrite() {
  const c = ctx();
  const s = settings();
  const updates = {};
  POLISH_FIELDS.forEach(([key, id]) => {
    const v = (el(id) ? el(id).value : s.polish[key] || '').trim();
    if (v) updates[key] = v;
  });
  if (!Object.keys(updates).length) {
    setStatus('sd_pl_wstatus', '没有可写回的内容。', 'error');
    return;
  }
  const ch = c && c.characters && c.characters[c.characterId];
  if (!ch) {
    setStatus('sd_pl_wstatus', '拿不到当前角色卡。', 'error');
    return;
  }
  const names = { description: '描述', personality: '性格', scenario: '场景' };
  if (!window.confirm('把润色后的 ' + Object.keys(updates).map((k) => names[k]).join(' / ') + ' 写回角色卡「' + ch.name + '」？\n原文字会被覆盖。')) return;
  Object.keys(updates).forEach((k) => {
    ch[k] = updates[k];
  });
  try {
    if (typeof c.writeCharacterFields === 'function') {
      await c.writeCharacterFields(ch.name, updates);
      setStatus('sd_pl_wstatus', '已写回「' + ch.name + '」。', 'ok');
    } else {
      setStatus('sd_pl_wstatus', '已写入内存；这版酒馆没有直接保存接口，请到角色管理面板点一次「保存」落盘。', 'ok');
    }
  } catch (e) {
    setStatus('sd_pl_wstatus', '写入失败：' + String(e.message || e), 'error');
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
    styleNotes: s.styleNotes,
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
    playMode: s.playMode,
    confirmed1: !!s.confirmed1,
    confirmed2: !!s.confirmed2
  };
}

function applySnapshot(data) {
  const s = settings();
  s.name = data.name || '';
  s.source = normalizeSource(data.source);
  s.styleNotes = data.styleNotes || '';
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
  s.confirmed1 = data.confirmed1 != null ? !!data.confirmed1 : !!(data.read1 && data.read2);
  s.confirmed2 = data.confirmed2 != null ? !!data.confirmed2 : !!(data.block && String(data.block).trim());
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
    source: normalizeSource(raw.source),
    styleNotes: raw.styleNotes || '',
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
    playMode: play.mode || 'none',
    confirmed1: raw.confirmed1 != null ? !!raw.confirmed1 : !!(read1 && read2),
    confirmed2: raw.confirmed2 != null ? !!raw.confirmed2 : !!(raw.block && String(raw.block).trim())
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

/* ================= 世界书补条目 ================= */

function loModeUI() {
  const mode = settings().lore.mode;
  const cardWrap = el('sd_lo_card_wrap');
  const searchWrap = el('sd_lo_search_wrap');
  if (cardWrap) cardWrap.style.display = mode === 'search' ? 'none' : '';
  if (searchWrap) searchWrap.style.display = mode === 'search' ? '' : 'none';
}

function loTakeCard() {
  const text = cardCorpus();
  if (!text) {
    setStatus('sd_lo_takestatus', '拿不到当前角色卡。', 'error');
    return;
  }
  settings().lore.source = text;
  setVal('sd_lo_source', text);
  save();
  setStatus('sd_lo_takestatus', '已取角色卡素材（' + text.length + ' 字）。', 'ok');
}

// 维基百科公开接口，支持跨域(origin=*)调用，不需要额外的搜索引擎 API Key。
// 只能查到维基百科收录的内容，不是通用网页搜索。
async function wikiSearch(query) {
  const q = String(query || '').trim();
  if (!q) throw new Error('先填要查的词。');
  const searchUrl =
    'https://zh.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=3&srsearch=' +
    encodeURIComponent(q);
  const res = await fetch(searchUrl);
  if (!res.ok) throw new Error('检索失败（' + res.status + '）。');
  const data = await res.json();
  const hits = (data && data.query && data.query.search) || [];
  if (!hits.length) throw new Error('没搜到相关词条，换个说法试试。');
  const parts = [];
  for (const hit of hits) {
    try {
      const sumRes = await fetch('https://zh.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(hit.title));
      if (sumRes.ok) {
        const sum = await sumRes.json();
        if (sum && sum.extract) parts.push('【' + hit.title + '】\n' + sum.extract);
      }
    } catch (e) {
      /* 单条摘要失败就跳过，不影响其他条 */
    }
  }
  if (!parts.length) throw new Error('搜到了词条但没拿到摘要，换个说法试试。');
  return parts.join('\n\n');
}

async function runLoreSearch() {
  const s = settings();
  s.lore.query = (el('sd_lo_query') && el('sd_lo_query').value.trim()) || '';
  save();
  if (!s.lore.query) {
    setStatus('sd_lo_searchstatus', '先填要查的词。', 'error');
    return;
  }
  setStatus('sd_lo_searchstatus', '搜索中…');
  el('sd_lo_search').disabled = true;
  try {
    const text = await wikiSearch(s.lore.query);
    s.lore.snippets = text;
    setVal('sd_lo_snippets', text);
    setStatus('sd_lo_searchstatus', '搜到资料了，可以改删后再生成。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_lo_searchstatus', String(e.message || e), 'error');
  } finally {
    el('sd_lo_search').disabled = false;
  }
}

async function runLoreGenerate(force) {
  const s = settings();
  const mode = s.lore.mode;
  s.lore.hint = (el('sd_lo_hint') && el('sd_lo_hint').value.trim()) || '';
  s.lore.count = (el('sd_lo_count') && el('sd_lo_count').value) || '3';
  if (mode === 'search') {
    s.lore.snippets = (el('sd_lo_snippets') && el('sd_lo_snippets').value.trim()) || '';
  } else {
    s.lore.source = (el('sd_lo_source') && el('sd_lo_source').value.trim()) || '';
  }
  save();
  const count = Number(s.lore.count) || 3;
  if (mode === 'search' && !s.lore.snippets) {
    setStatus('sd_lo_status', '先搜索，拿到资料再生成。', 'error');
    return;
  }
  if (mode !== 'search' && !s.lore.source) {
    setStatus('sd_lo_status', '先取角色素材。', 'error');
    return;
  }
  if (!lockOr('sd_lo_status', 'lore')) return;
  cancelled = false;
  setStatus('sd_lo_status', '生成中…');
  el('sd_lo_generate').disabled = true;
  try {
    const key = hashKey({ stage: 'lore', mode, source: s.lore.source, query: s.lore.query, snippets: s.lore.snippets, hint: s.lore.hint, count });
    const { data, cached } = await cachedRun(
      'lore',
      key,
      async () =>
        parseJSON(
          await callModel(
            mode === 'search'
              ? Prompts.loreFromSearch({ query: s.lore.query, snippets: s.lore.snippets, hint: s.lore.hint, count })
              : Prompts.loreFromCard({ source: s.lore.source, hint: s.lore.hint, count })
          )
        ),
      force
    );
    const list = (Array.isArray(data.entries) ? data.entries : [])
      .map((e2) => ({
        key: Array.isArray(e2.key) ? e2.key.map((k) => String(k || '').trim()).filter(Boolean) : [String(e2.key || '').trim()].filter(Boolean),
        content: String(e2.content || '').trim(),
        on: true
      }))
      .filter((e2) => e2.content);
    if (!list.length) throw new Error('模型没返回条目，重试一次。');
    s.lore.entries = list;
    renderLoreEntries();
    setStatus('sd_lo_status', cached ? '输入没变，用上次结果，未再调用 API。' : '生成好了，挑一下要写哪些。', 'ok');
    save();
  } catch (e) {
    setStatus('sd_lo_status', String(e.message || e), 'error');
  } finally {
    el('sd_lo_generate').disabled = false;
    busySteps.delete('lore');
  }
}

function renderLoreEntries() {
  const target = el('sd_lo_entries');
  if (!target) return;
  const list = settings().lore.entries || [];
  if (!list.length) {
    target.innerHTML = '<div class="sd-note">还没有生成结果。</div>';
    return;
  }
  target.innerHTML = list
    .map(
      (e2, i) =>
        '<div class="sd-lore-entry">' +
        '<label class="sd-check"><input type="checkbox" class="sd-lo-on" data-i="' + i + '"' + (e2.on ? ' checked' : '') + '> <span>写入这一条</span></label>' +
        '<label class="sd-field"><span>触发关键词（逗号分隔）</span><input type="text" class="sd-lo-key" data-i="' + i + '" value="' + esc(e2.key.join('，')) + '"></label>' +
        '<label class="sd-field"><span>正文</span><textarea class="sd-lo-content" data-i="' + i + '" rows="4">' + esc(e2.content) + '</textarea></label>' +
        '</div>'
    )
    .join('');
  target.querySelectorAll('.sd-lo-on').forEach((cb) => {
    cb.addEventListener('change', () => {
      settings().lore.entries[Number(cb.dataset.i)].on = cb.checked;
      save();
    });
  });
  target.querySelectorAll('.sd-lo-key').forEach((inp) => {
    inp.addEventListener('input', () => {
      settings().lore.entries[Number(inp.dataset.i)].key = inp.value.split(/[，,]/).map((x) => x.trim()).filter(Boolean);
      save();
    });
  });
  target.querySelectorAll('.sd-lo-content').forEach((ta) => {
    ta.addEventListener('input', () => {
      settings().lore.entries[Number(ta.dataset.i)].content = ta.value;
      save();
    });
  });
}

function buildLoreEntrySelective(keys, content, uid) {
  return {
    uid,
    key: keys && keys.length ? keys : ['条目'],
    keysecondary: [],
    comment: (keys && keys[0]) || '条目',
    content,
    constant: false,
    vectorized: false,
    selective: true,
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
    depth: 4
  };
}

async function loSaveWorldInfo() {
  const c = ctx();
  if (typeof c.loadWorldInfo !== 'function' || typeof c.saveWorldInfo !== 'function') {
    setStatus('sd_lo_wistatus', '这版酒馆没有世界书写入接口，请手动复制粘贴。', 'error');
    return;
  }
  const list = (settings().lore.entries || []).filter((e2) => e2.on && e2.content.trim());
  if (!list.length) {
    setStatus('sd_lo_wistatus', '先勾选至少一条。', 'error');
    return;
  }
  const pick = el('sd_lo_wilist') ? el('sd_lo_wilist').value : '';
  const name = (el('sd_lo_winame') ? el('sd_lo_winame').value.trim() : '') || pick || '世界书补充';
  if (!window.confirm('把勾选的 ' + list.length + ' 条写进世界书「' + name + '」？')) return;
  try {
    const data = (await c.loadWorldInfo(name)) || { entries: {} };
    if (!data.entries) data.entries = {};
    let uid = Object.keys(data.entries)
      .map((k) => Number(data.entries[k] && data.entries[k].uid != null ? data.entries[k].uid : k))
      .filter((n) => Number.isFinite(n))
      .reduce((a, b) => Math.max(a, b), -1);
    for (const e2 of list) {
      uid += 1;
      data.entries[uid] = buildLoreEntrySelective(e2.key, e2.content, uid);
    }
    await c.saveWorldInfo(name, data, true);
    if (typeof c.reloadWorldInfoEditor === 'function') c.reloadWorldInfoEditor(name);
    renderWiList();
    setStatus('sd_lo_wistatus', '已写入「' + name + '」（' + list.length + ' 条），去「世界信息」看看。', 'ok');
  } catch (e) {
    setStatus('sd_lo_wistatus', '写入失败：' + String(e.message || e), 'error');
  }
}

function fillWiSelect(sel) {
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

function renderWiList() {
  fillWiSelect(el('sd_wilist'));
  fillWiSelect(el('sd_vc_wilist'));
  fillWiSelect(el('sd_lo_wilist'));
}

function renderStyles(selectedId) {
  const sel = el('sd_stylelist');
  if (!sel) return;
  const list = settings().styles || [];
  if (!list.length) {
    sel.innerHTML = '<option value="">（还没有文风存档）</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  const keep = (selectedId !== undefined ? selectedId : sel.value) || '';
  sel.innerHTML = list.map((it) => '<option value="' + it.id + '">' + esc(styleLabel(it)) + '</option>').join('');
  if (keep && list.some((it) => it.id === keep)) sel.value = keep;
}

function wizardState() {
  const s = settings();
  const has1 = !!s.read1;
  const c1 = !!s.confirmed1;
  const c2 = !!s.confirmed2;
  const hasBlock = !!(s.block && String(s.block).trim());
  const maxVisible = hasBlock || c2 ? 6 : c1 ? 5 : has1 ? 3 : 1;
  const current = !has1 ? 1 : !c1 ? 3 : !c2 ? 4 : 6;
  return { maxVisible, current };
}

function updateWizard() {
  const { maxVisible, current } = wizardState();
  document.querySelectorAll('#sd_page_distill [data-wiz]').forEach((wrap) => {
    const w = Number(wrap.dataset.wiz);
    if (Number.isFinite(w)) wrap.style.display = w <= maxVisible ? '' : 'none';
  });
  document.querySelectorAll('#sd_steps .sd-step').forEach((st) => {
    const n = Number(st.dataset.s);
    st.classList.toggle('sd-done', n < current);
    st.classList.toggle('sd-cur', n === current);
  });
}

function applyModule() {
  const s = settings();
  const MODS = ['opening', 'remsg', 'voice', 'polish', 'lore'];
  const mod = MODS.includes(s.activeModule) ? s.activeModule : 'distill';
  document.querySelectorAll('#sd_tabs .sd-tab').forEach((t) => {
    t.classList.toggle('sd-on', t.dataset.mod === mod);
  });
  ['distill', ...MODS].forEach((m) => {
    const page = el('sd_page_' + m);
    if (page) page.style.display = m === mod ? '' : 'none';
  });
  if (mod === 'distill') updateWizard();
}

function switchModule(mod) {
  const s = settings();
  const MODS = ['opening', 'remsg', 'voice', 'polish', 'lore'];
  s.activeModule = MODS.includes(mod) ? mod : 'distill';
  save();
  applyModule();
}

function applyPanel() {
  const s = settings();
  const p = el('sd_panel');
  const b = el('sd_backdrop');
  if (!p) return;
  if (!s.panelOpen) {
    p.classList.remove('sd-open');
    p.style.display = 'none';
    if (b) b.style.display = 'none';
    return;
  }
  p.classList.add('sd-open');
  p.style.display = 'flex';
  p.style.visibility = 'visible';
  p.style.opacity = '1';
  p.style.left = '50%';
  p.style.right = 'auto';
  p.style.top = '56px';
  p.style.bottom = 'auto';
  p.style.height = 'auto';
  p.style.maxHeight = 'calc(100vh - 56px - 112px)';
  p.style.transform = 'translateX(-50%)';
  p.style.zIndex = '2147483647';
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
  setVal('sd_source', s.source);
  setVal('sd_rulenotes', s.styleNotes || '');
  try { updateSourceUI(); } catch (e) { console.warn('[大厨烹饪处] updateSourceUI', e); }
  setVal('sd_genre', s.genre || 'narration');
  setVal('sd_thrifty', s.thrifty !== false, 'checked');
  setVal('sd_name', s.name || '');
  setVal('sd_corpus', s.corpus || '');
  try { renderCorpusStat(); } catch (e) { console.warn('[大厨烹饪处] renderCorpusStat', e); }
  setVal('sd_block', s.block || '');
  setVal('sd_play', s.playMode || 'none');
  try {
    if (s.read1) renderReadout(el('sd_readout'), Object.assign({}, s.read1, { draft: s.draft }));
  } catch (e) { console.warn('[大厨烹饪处] renderReadout1', e); }
  try { if (s.beliefs && s.beliefs.length) renderBeliefs(); } catch (e) { console.warn('[大厨烹饪处] renderBeliefs', e); }
  try { if (s.read2) renderReadout(el('sd_position'), s.read2); } catch (e) { console.warn('[大厨烹饪处] renderReadout2', e); }
  try { if (s.blacklist && s.blacklist.length) renderBlacklist(); } catch (e) { console.warn('[大厨烹饪处] renderBlacklist', e); }
  try { renderUncertain(); } catch (e) { console.warn('[大厨烹饪处] renderUncertain', e); }
  try { renderStyles(); } catch (e) { console.warn('[大厨烹饪处] renderStyles', e); }
  try { renderWiList(); } catch (e) { console.warn('[大厨烹饪处] renderWiList', e); }
  try { renderStats(); } catch (e) { console.warn('[大厨烹饪处] renderStats', e); }
  try {
    setVal('sd_op_source', s.opening.source || '');
    setVal('sd_op_style', s.opening.styleFrom || 'current');
    setVal('sd_op_scene', s.opening.scene || 'first');
    setVal('sd_op_count', s.opening.count || '2');
    setVal('sd_op_length', s.opening.length || 'medium');
    setVal('sd_op_persona', s.opening.personaMode || 'current');
    setVal('sd_op_personacustom', s.opening.personaCustom || '');
    setVal('sd_op_scenecustom', s.opening.sceneCustom || '');
  } catch (e) { console.warn('[大厨烹饪处] opening 字段恢复失败', e); }
  try { opSceneUI(); } catch (e) { console.warn('[大厨烹饪处] opSceneUI', e); }
  try { opPersonaUI(); } catch (e) { console.warn('[大厨烹饪处] opPersonaUI', e); }
  try { renderOpBooks(); } catch (e) { console.warn('[大厨烹饪处] renderOpBooks', e); }
  try { renderOpStyleSelect(); } catch (e) { console.warn('[大厨烹饪处] renderOpStyleSelect', e); }
  try { renderOpenings(); } catch (e) { console.warn('[大厨烹饪处] renderOpenings', e); }
  try { renderOpArch(); } catch (e) { console.warn('[大厨烹饪处] renderOpArch', e); }
  try { renderRemsg(); } catch (e) { console.warn('[大厨烹饪处] renderRemsg', e); }
  try {
    setVal('sd_vc_corpus', s.voice.corpus || '');
    setVal('sd_vc_entry', s.voice.entry || '');
  } catch (e) { console.warn('[大厨烹饪处] voice 字段恢复失败', e); }
  try {
    setVal('sd_pl_desc', s.polish.description || '');
    setVal('sd_pl_pers', s.polish.personality || '');
    setVal('sd_pl_scen', s.polish.scenario || '');
  } catch (e) { console.warn('[大厨烹饪处] polish 字段恢复失败', e); }
  try {
    setVal('sd_lo_mode', s.lore.mode || 'card');
    setVal('sd_lo_source', s.lore.source || '');
    setVal('sd_lo_query', s.lore.query || '');
    setVal('sd_lo_snippets', s.lore.snippets || '');
    setVal('sd_lo_hint', s.lore.hint || '');
    setVal('sd_lo_count', s.lore.count || '3');
    loModeUI();
    renderLoreEntries();
  } catch (e) { console.warn('[大厨烹饪处] lore 字段恢复失败', e); }
  try { applyModule(); } catch (e) { console.warn('[大厨烹饪处] applyModule', e); }
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

// 逐个绑定：缺哪个元素只跳过哪个，不再一条 try 包全部、一挂全挂
function bind(id, event, fn) {
  const node = el(id);
  if (!node) {
    console.warn('[大厨烹饪处] 绑定失败，缺元素 #' + id);
    return;
  }
  node.addEventListener(event, fn);
}

function bindLayer() {
  document.querySelectorAll('#sd_tabs .sd-tab').forEach((t) => {
    t.addEventListener('click', () => switchModule(t.dataset.mod));
  });

  bind('sd_read1', 'click', (e) => runRead1(forceFromEvent(e)));
  bind('sd_confirm1', 'click', (e) => runConfirm1(forceFromEvent(e)));
  bind('sd_confirm2', 'click', (e) => runConfirm2(forceFromEvent(e)));

  bind('sd_readout', 'click', (e) => {
    const btn = e.target.closest('.sd-refresh');
    if (btn) runRefineLayer(btn.dataset.layer);
  });

  bind('sd_mode', 'change', (e) => { settings().mode = e.target.value; save(); updateMode(); });
  bind('sd_baseurl', 'input', (e) => { settings().baseUrl = e.target.value.trim(); save(); });
  bind('sd_apikey', 'input', (e) => { setApiKey(e.target.value.trim()); save(); });
  bind('sd_rememberkey', 'change', (e) => {
    settings().rememberKey = e.target.checked;
    const v = el('sd_apikey').value.trim();
    sessionKey = v;
    if (e.target.checked) storeKey(v);
    else clearStoredKey();
    save();
  });
  bind('sd_model', 'input', (e) => { settings().model = e.target.value.trim(); save(); });
  bind('sd_stream', 'change', (e) => { settings().stream = e.target.checked; save(); });
  bind('sd_temp', 'input', (e) => {
    settings().temperature = Number(e.target.value);
    el('sd_tempval').textContent = String(e.target.value);
    save();
  });
  bind('sd_pull', 'click', pullModels);

  bind('sd_source', 'change', (e) => { settings().source = normalizeSource(e.target.value); updateSourceUI(); save(); });
  bind('sd_rulenotes', 'input', (e) => { settings().styleNotes = e.target.value; save(); });
  bind('sd_genre', 'change', (e) => { settings().genre = e.target.value; save(); });
  bind('sd_thrifty', 'change', (e) => { settings().thrifty = e.target.checked; save(); });
  bind('sd_name', 'input', (e) => { settings().name = e.target.value; save(); });
  bind('sd_corpus', 'input', (e) => { settings().corpus = e.target.value; save(); renderCorpusStat(); });

  function applyTakenCorpus(text, note) {
    settings().corpus = text;
    el('sd_corpus').value = text;
    renderCorpusStat();
    save();
    setStatus('sd_takestatus', note, 'ok');
  }

  bind('sd_takecard', 'click', () => {
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

  bind('sd_takechat', 'click', () => {
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
  bind('sd_block', 'input', (e) => { settings().block = e.target.value; save(); });
  bind('sd_play', 'change', (e) => { settings().playMode = e.target.value; save(); });

  bind('sd_blackaddbtn', 'click', () => {
    const v = el('sd_blackadd').value.trim();
    if (!v) return;
    settings().blacklist.push({ text: v, on: true });
    el('sd_blackadd').value = '';
    renderBlacklist();
    save();
  });

  bind('sd_copy', 'click', async () => {
    const text = el('sd_block').value;
    try {
      await navigator.clipboard.writeText(text);
      setStatus('sd_status5', '文风块已复制。', 'ok');
    } catch (e) {
      setStatus('sd_status5', '复制失败，请手动选中。', 'error');
    }
  });

  bind('sd_dljson', 'click', () => {
    download(slug() + '.json', JSON.stringify(buildJSON(), null, 2));
    setStatus('sd_status5', 'JSON 已下载。', 'ok');
  });

  bind('sd_import', 'click', () => el('sd_importfile').click());
  bind('sd_importfile', 'change', async (e) => {
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

  bind('sd_wiexport', 'click', () => {
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

  bind('sd_wisave', 'click', async () => {
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

  bind('sd_stylesave', 'click', () => {
    const s = settings();
    if ((s.styles || []).length >= STYLE_LIMIT) {
      setStatus('sd_stylestatus', '文风存档满了（' + STYLE_LIMIT + ' 份），先删几份。', 'error');
      return;
    }
    const name = el('sd_stylename').value.trim() || s.name.trim() || '未命名文风';
    const item = { id: 'st_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), schema: 1, name, savedAt: Date.now(), data: currentSnapshot() };
    s.styles = (s.styles || []).concat([item]);
    renderStyles(item.id);
    setStatus('sd_stylestatus', '已存为「' + name + '」。', 'ok');
    save();
  });

  bind('sd_styleload', 'click', () => {
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

  bind('sd_styleover', 'click', () => {
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

  bind('sd_styledel', 'click', () => {
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

  /* ---- 开场白工坊 ---- */
  bind('sd_op_takecard', 'click', opTakeCard);
  bind('sd_op_takelore', 'click', opTakeCardWithLore);
  bind('sd_op_booksrefresh', 'click', renderOpBooks);
  bind('sd_op_persona', 'change', (e) => { settings().opening.personaMode = e.target.value; opPersonaUI(); save(); });
  bind('sd_op_personacustom', 'input', (e) => { settings().opening.personaCustom = e.target.value; save(); });
  bind('sd_op_length', 'change', (e) => { settings().opening.length = e.target.value; save(); });
  bind('sd_op_source', 'input', (e) => { settings().opening.source = e.target.value; save(); });
  bind('sd_op_style', 'change', (e) => { settings().opening.styleFrom = e.target.value; save(); });
  bind('sd_op_scene', 'change', (e) => { settings().opening.scene = e.target.value; save(); opSceneUI(); });
  bind('sd_op_scenecustom', 'input', (e) => { settings().opening.sceneCustom = e.target.value; save(); });
  bind('sd_op_count', 'change', (e) => { settings().opening.count = e.target.value; save(); });
  bind('sd_op_generate', 'click', (e) => runOpenings(forceFromEvent(e)));
  bind('sd_op_copy', 'click', async () => {
    const text = opPickedText();
    if (!text) {
      setStatus('sd_op_wstatus', '先挑一条开场白。', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus('sd_op_wstatus', '开场白已复制。', 'ok');
    } catch (err) {
      setStatus('sd_op_wstatus', '复制失败，请在候选里手动选中复制。', 'error');
    }
  });
  bind('sd_op_writefirst', 'click', () => opWrite('first'));
  bind('sd_op_writealt', 'click', () => opWrite('alt'));
  bind('sd_op_archsave', 'click', opArchiveSave);
  bind('sd_op_archload', 'click', opArchiveLoad);
  bind('sd_op_archdel', 'click', opArchiveDel);

  /* ---- 楼层改写 ---- */
  bind('sd_remsg_refresh', 'click', renderRemsg);
  bind('sd_remsg_go', 'click', (e) => runRemsg(forceFromEvent(e)));
  bind('sd_remsg_write', 'click', remsgWrite);

  /* ---- 角色说话腔 ---- */
  bind('sd_vc_takedial', 'click', voiceTakeDialogue);
  bind('sd_vc_takechat', 'click', voiceTakeChat);
  bind('sd_vc_corpus', 'input', (e) => { settings().voice.corpus = e.target.value; save(); });
  bind('sd_vc_go', 'click', (e) => runVoice(forceFromEvent(e)));
  bind('sd_vc_entry', 'input', (e) => { settings().voice.entry = e.target.value; save(); });
  bind('sd_vc_copy', 'click', async () => {
    const text = (el('sd_vc_entry') ? el('sd_vc_entry').value : '').trim();
    if (!text) {
      setStatus('sd_vc_status', '条目是空的，先蒸馏。', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus('sd_vc_status', '条目已复制。', 'ok');
    } catch (err) {
      setStatus('sd_vc_status', '复制失败，请手动选中复制。', 'error');
    }
  });
  bind('sd_vc_wisave', 'click', voiceSaveWorldInfo);

  /* ---- 卡片润色 ---- */
  bind('sd_pl_takecard', 'click', polishTakeCard);
  bind('sd_pl_desc', 'input', (e) => { settings().polish.description = e.target.value; save(); });
  bind('sd_pl_pers', 'input', (e) => { settings().polish.personality = e.target.value; save(); });
  bind('sd_pl_scen', 'input', (e) => { settings().polish.scenario = e.target.value; save(); });
  bind('sd_pl_go', 'click', (e) => runPolish(forceFromEvent(e)));
  bind('sd_pl_write', 'click', polishWrite);

  bind('sd_lo_mode', 'change', (e) => { settings().lore.mode = e.target.value; loModeUI(); save(); });
  bind('sd_lo_takecard', 'click', loTakeCard);
  bind('sd_lo_source', 'input', (e) => { settings().lore.source = e.target.value; save(); });
  bind('sd_lo_query', 'input', (e) => { settings().lore.query = e.target.value; save(); });
  bind('sd_lo_search', 'click', runLoreSearch);
  bind('sd_lo_snippets', 'input', (e) => { settings().lore.snippets = e.target.value; save(); });
  bind('sd_lo_hint', 'input', (e) => { settings().lore.hint = e.target.value; save(); });
  bind('sd_lo_count', 'change', (e) => { settings().lore.count = e.target.value; save(); });
  bind('sd_lo_generate', 'click', (e) => runLoreGenerate(forceFromEvent(e)));
  bind('sd_lo_wisave', 'click', loSaveWorldInfo);

  bind('sd_panel_close', 'click', () => {
    settings().panelOpen = false;
    save();
    applyPanel();
  });
  bind('sd_stop', 'click', stopRun);

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

