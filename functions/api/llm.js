// Debug 模式配置
const DEBUG_MODE = true;
const DEBUG_RESPONSE = "祝新的一年，龙马精神，万事如意，身体健康！";

export async function onRequestPost(context) {
  const { request, env } = context;

  // ✅ 限制合法来源
  const allowedOrigins = [
    "https://zi.closeai.moe",
    "http://127.0.0.1:8788",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ];

  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({
      error: "来源不被允许: " + origin
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const { prompt, systemPrompt } = body;

    // 如果开启了 Debug 模式，直接返回模拟响应
    if (DEBUG_MODE) {
      return new Response(JSON.stringify({
        content: DEBUG_RESPONSE,
        usage: { completion_tokens: DEBUG_RESPONSE.length }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const apiRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.8,
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
      error: `API请求失败: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
