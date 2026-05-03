export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");

  async function get() {
    const data = await env.CHAT_DB.get("chat_data");
    return data ? JSON.parse(data) : { users: [], msgs: [], nextUID: 1 };
  }

  async function save(d) {
    await env.CHAT_DB.put("chat_data", JSON.stringify(d));
  }

  const data = await get();

  // 登录
  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const u = data.users.find(i => i.user === user && i.pwd === pwd);
    if (u) return Response.json({ ok: true, uid: u.uid });
    return Response.json({ ok: false });
  }

  // 注册（自动分配UID）
  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (data.users.some(i => i.user === user)) {
      return Response.json({ ok: false });
    }
    const uid = data.nextUID;
    data.nextUID += 1;
    data.users.push({ uid, user, pwd });
    await save(data);
    return Response.json({ ok: true, uid });
  }

  // 消息列表
  if (act === "list") {
    return Response.json(data.msgs);
  }

  // 发送消息
  if (act === "send") {
    const user = url.searchParams.get("user");
    const msg = url.searchParams.get("msg");
    const u = data.users.find(i => i.user === user);
    if (!u) return Response.json({ ok: false });

    data.msgs.push({
      uid: u.uid,
      user: u.user,
      msg,
      time: Date.now()
    });
    if (data.msgs.length > 200) data.msgs = data.msgs.slice(-200);
    await save(data);
    return Response.json({ ok: true });
  }

  // 清空全部（管理员 Ratstudio）
  if (act === "clear") {
    const uid = parseInt(url.searchParams.get("uid") || "0");
    const admin = data.users.find(i => i.uid === uid);
    if (!admin || admin.user !== "Ratstudio") {
      return Response.json({ ok: false });
    }
    data.msgs = [];
    await save(data);
    return Response.json({ ok: true });
  }

  // 撤回单条（最后一条）
  if (act === "delete") {
    const uid = parseInt(url.searchParams.get("uid") || "0");
    const admin = data.users.find(i => i.uid === uid);
    if (!admin || admin.user !== "Ratstudio") {
      return Response.json({ ok: false });
    }
    if (data.msgs.length > 0) data.msgs.pop();
    await save(data);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false });
}
