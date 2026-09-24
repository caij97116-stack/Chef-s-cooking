const Prompts = (() => {
  const GENRE = {
    narration: "叙事",
    dialogue: "对白",
    interior: "内心",
    action: "动作"
  };

  const LAYERS = { syntax: "句法", object: "对象", attitude: "态度", rhetoric: "修辞" };

  const label = (genre) => GENRE[genre] || genre;

  const read1 = ({ corpus, genre, withDraft }) => {
    const draftRule = withDraft
      ? `
另外，因为来料是“参考文字”，再顺带给一篇“能贴的草稿”和一份“拿不准清单”。
草稿要像本人写的，但不要照抄句子和人名。
拿不准清单列 3-6 条你不敢确定的地方，让用户来定。`
      : "";
    const draftShape = withDraft ? `,
 "draft":{"draft":"","uncertain":["",""]}` : "";
    return [
      {
        role: "system",
        content: "你是大厨烹饪处。你只做分析、不下最终结论，并且只输出 JSON。"
      },
      {
        role: "user",
        content: `【体裁】${label(genre)}

【语料】
${corpus}

读这段语料的前三遍：
1. 句法层：词汇偏好、句长分布、节奏、标点习惯、语体混合比。
2. 对象层：写谁、不写谁、隐含听众是谁。
3. 态度层：对悲剧/喜剧/历史/亲密/失败/时代的态度。只从她做什么动作判断，不从她自述判断。
4. 修辞习惯：爱用比喻还是列数字，反复出现的 moves。

然后：
- 给 2-3 个“信念候选”——她写作时心里那个不允许自己偏离的东西。每条配 belief（一句话）、evidence（引原句）、counter（她绝不会写的反例）。
- 从语料里剪 2-3 段最能代表她句法的原句，放进 samples，供后面拼文风块时当样本，可把专名换成占位符，句法不要动。${draftRule}

只输出 JSON：
{"syntax":{"vocab":"","sentence":"","rhythm":"","punctuation":"","register":""},
 "object":{"writes":"","notWrites":"","listener":""},
 "attitude":{"tragedy":"","comedy":"","intimacy":"","failure":"","time":""},
 "rhetoric":["",""],
 "samples":["",""],
 "beliefs":[{"belief":"","evidence":"","counter":""}]${draftShape}}`
      }
    ];
  };

  const read2 = ({ corpus, genre, beliefs }) => [
    {
      role: "system",
      content: "你是大厨烹饪处。你只输出 JSON。"
    },
    {
      role: "user",
      content: `【体裁】${label(genre)}

【已确认的信念】
${beliefs}

【语料】
${corpus}

读后三遍：
5. 历史定位：她传承自谁，接续哪条传统，和哪个表面相似的作者在哪里划清界限（通常分在信念层，不在句法层）。
6. 黑名单：她绝不会用的手法、绝不会写的情绪。至少 6 条。
7. 核心信念压缩：一句话。

只输出 JSON：
{"position":"","neighbor_diff":"","blacklist":["","","","","",""],"belief_core":""}`
    }
  ];

  const refineLayer = ({ layer, current, corpus, genre }) => [
    {
      role: "system",
      content: "你是大厨烹饪处。你只输出 JSON。"
    },
    {
      role: "user",
      content: `【体裁】${label(genre)}

【语料】
${corpus}

【这一层现在的结论】
${typeof current === "string" ? current : JSON.stringify(current)}

只重读「${LAYERS[layer] || layer}」这一层，把不满意的地方重写。其他层不动。
只输出 JSON：{"value": <和原来同样形状的这一层结论>}`
    }
  ];

  const compose = ({ name, genre, read1, read2, samples, blacklist }) => {
    const syntax = read1.syntax || {};
    const object = read1.object || {};
    const attitude = read1.attitude || {};
    const picked = (samples && samples.length ? samples : []).join("\n\n");
    return [
      {
        role: "system",
        content: "你是大厨烹饪处。你直接给成品，不解释。"
      },
      {
        role: "user",
        content: `把下面的结论压成一段可以直接填进提示词或世界书的“文风块”。

格式：
# <名字> · <命名>
> 一句话核心信念
信念：……
句法纪律：……
修辞习惯：……
跟邻居的界：……
反例（绝不写）：
- ……
样本：
（下面给了代表原句，若没有就说明“样本缺失”；可把专名换成占位符，句法不要动）

要求：
- 不出现“技法 / 养成 / 层次 / DNA / 蒸馏”这类词。
- 不解释、不寒暄、不加前后缀。
- 反例至少 6 条。
- 名字尊重用户给的：${name || "（未给，你来起）"}

【体裁】${label(genre)}
【核心信念】${read2.belief_core || ""}
【信念候选】${JSON.stringify(read1.beliefs || [], null, 0)}
【句法】${JSON.stringify(syntax)}
【对象】${JSON.stringify(object)}
【态度】${JSON.stringify(attitude)}
【修辞】${JSON.stringify(read1.rhetoric || [])}
【历史定位】${read2.position || ""}
【跟邻居的界】${read2.neighbor_diff || ""}
【黑名单】${JSON.stringify(blacklist || read2.blacklist || [])}

【代表原句（用于拼样本）】
${picked || "（无，请写“样本缺失”）"}`
      }
    ];
  };

  const rewrite = ({ block, passage }) => [
    {
      role: "system",
      content: "你是大厨烹饪处。"
    },
    {
      role: "user",
      content: `这是一段默认 AI 腔的文字：
${passage}

请用下面的文风改写它。只改写法，不改事实与信息。

【文风块】
${block}

只输出改写后的正文，不要解释。`
    }
  ];

  return { read1, read2, refineLayer, compose, rewrite, label, LAYERS };
})();

if (typeof window !== "undefined") window.Prompts = Prompts;
