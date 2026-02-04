const SYSTEM_PROMPT = '你服务的对象能使用的文字有限，可能不成句子。但你很有耐心，请尽可能理解TA的意图。回复不带列表，不带Markdown。仅用中文回复。没有起手式，直接回复，出其不意。不打招呼！(回复超过50字的部分会被截断)';
const API_PASSWORD = "silicon-truth-collector";

// Debug 模式配置
const DEBUG_MODE = false;
const DEBUG_RESPONSE = "祝新的一年，龙马精神，万事如意，身体健康！";

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. 验证自定义 Header
  const customHeader = request.headers.get("Accept");
  if (customHeader !== "application/x-silicon-truth") {
    return new Response(JSON.stringify({ error: "协议验证失败" }), {
      status: 406,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 2. 限制合法来源
  const allowedOrigins = [
    "https://zi.closeai.moe",
    "http://127.0.0.1:8788",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ];
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({ error: "来源不被允许" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 3. 验证 JSON 格式
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "无效的JSON格式" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { prompt, password } = body;

    // 4. 验证密码
    if (password !== API_PASSWORD) {
      return new Response(JSON.stringify({ error: "鉴权失败" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 5. 限制文本长度 (50字)
    if (!prompt || typeof prompt !== 'string' || prompt.length > 50) {
      return new Response(JSON.stringify({ error: "非法输入：文本过空或超过50字上限" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 如果开启了 Debug 模式，直接返回模拟响应
    if (DEBUG_MODE) {
      return new Response(JSON.stringify({
        content: DEBUG_RESPONSE,
        usage: { completion_tokens: DEBUG_RESPONSE.length }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ];

    const apiRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 1.5,
        max_tokens: 50
      })
    });

    const data = await apiRes.json();

    let content = '';
    if (data.choices && data.choices.length > 0) {
      const choice = data.choices[0];
      content = choice.message?.content || choice.delta?.content || choice.content || '';
    }

    return new Response(JSON.stringify({
      content,
      usage: data.usage || { completion_tokens: 0 }
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: `内部错误: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
