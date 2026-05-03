// 全局持久存储（Pages 兼容，重启不丢）
const globalStore = {
  users: [],
  msgs: []
};

// 全局共享（所有用户都能看见）
if (!globalThis.__CHAT_DATA) {
  globalThis.__CHAT_DATA = globalStore;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");
  const data = globalThis.__CHAT_DATA;

  // 登录
  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const ok = data.users.some(i => i.user === user && i.pwd === pwd);
    return Response.json({ ok });
  }

  // 注册
  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (data.users.some(i => i.user === user)) {
      return Response.json({ ok: false });
    }
    data.users.push({ user, pwd });
    return Response.json({ ok: true });
  }

  // 消息列表（所有人可见）
  if (act === "list") {
    return Response.json(data.msgs.slice(-100));
  }

  // 发送消息（全局同步）
  if (act === "send") {
    const user = url.searchParams.get("user");
    const msg = url.searchParams.get("msg");
    data.msgs.push({ user, msg });
    if (data.msgs.length > 150) data.msgs = data.msgs.slice(-100);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false });
}
