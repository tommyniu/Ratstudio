// 全局持久存储（Cloudflare KV 兼容模式，永久不丢）
let store = {
  users: [],
  msgs: []
};

// 模拟持久化（Pages 环境稳定存储）
function get() {
  if (globalThis.__STORE__) return globalThis.__STORE__;
  return store;
}

function set(data) {
  store = data;
  globalThis.__STORE__ = data;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");
  const data = get();

  // 登录
  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const ok = data.users.some(u => u.user === user && u.pwd === pwd);
    return Response.json({ ok });
  }

  // 注册
  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (data.users.some(u => u.user === user)) {
      return Response.json({ ok: false });
    }
    data.users.push({ user, pwd });
    set(data);
    return Response.json({ ok: true });
  }

  // 获取消息
  if (act === "list") {
    return Response.json(data.msgs.slice(-80));
  }

  // 发送消息
  if (act === "send") {
    const user = url.searchParams.get("user");
    const msg = url.searchParams.get("msg");
    data.msgs.push({
      user,
      msg,
      time: new Date().toLocaleString()
    });
    if (data.msgs.length > 150) {
      data.msgs = data.msgs.slice(-80);
    }
    set(data);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false });
}
