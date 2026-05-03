export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");

  async function get() {
    const data = await env.CHAT_DB.get("chat_data");
    const parsed = data ? JSON.parse(data) : { users: [], msgs: [], nextUID: 1 };
    // 旧用户自动补UID
    let needSave = false;
    parsed.users.forEach(u => {
      if (!u.uid || isNaN(u.uid)) {
        u.uid = parsed.nextUID++;
        needSave = true;
      }
    });
    if (needSave) await env.CHAT_DB.put("chat_data", JSON.stringify(parsed));
    return parsed;
  }

  async function save(d) {
    await env.CHAT_DB.put("chat_data", JSON.stringify(d));
  }

  const data = await get();

  // 登录（兜底返回UID）
  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const u = data.users.find(i => i.user === user && i.pwd === pwd);
    if (u) return Response.json({ ok: true, uid: u.uid || 0 });
    return Response.json({ ok: false });
  }

  // 注册
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

  // 消息列表（兼容旧消息无uid）
  if (act === "list") {
    const safeMsgs = data.msgs.map(m => ({
      ...m,
      uid: m.uid || 0
    }));
    return Response.json(safeMsgs);
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

  // 清空（管理员）
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

  // 撤回
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
