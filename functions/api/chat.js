// 真正永久存储 = KV
// 所有人可见 + 重启不丢 + 永久保存用户和消息

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");

  // 读取数据
  async function get() {
    const data = await env.CHAT_DB.get("chat_data");
    return data ? JSON.parse(data) : { users: [], msgs: [] };
  }

  // 保存数据
  async function save(d) {
    await env.CHAT_DB.put("chat_data", JSON.stringify(d));
  }

  const data = await get();

  // ========== 登录 ==========
  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const ok = data.users.some(u => u.user === user && u.pwd === pwd);
    return Response.json({ ok });
  }

  // ========== 注册（保存到 KV） ==========
  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (data.users.some(u => u.user === user)) {
      return Response.json({ ok: false });
    }
    data.users.push({ user, pwd });
    await save(data);
    return Response.json({ ok: true });
  }

  // ========== 消息列表 ==========
  if (act === "list") {
    return Response.json(data.msgs.slice(-120));
  }

  // ========== 发送消息（保存到 KV） ==========
  if (act === "send") {
    const user = url.searchParams.get("user");
    const msg = url.searchParams.get("msg");
    data.msgs.push({ user, msg });
    if (data.msgs.length > 150) data.msgs = data.msgs.slice(-120);
    await save(data);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false });
}
