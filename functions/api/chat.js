export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");

  // 读取数据
  async function get() {
    const data = await env.CHAT_DB.get("chat_data");
    return data ? JSON.parse(data) : { users: [], msgs: [], nextUID: 1 };
  }

  // 保存数据
  async function save(d) {
    await env.CHAT_DB.put("chat_data", JSON.stringify(d));
  }

  const data = await get();

  // ============= 登录 =============
  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const u = data.users.find(i => i.user === user && i.pwd === pwd);
    if (u) return Response.json({ ok: true, uid: u.uid });
    return Response.json({ ok: false });
  }

  // ============= 注册（自动分配 UID） =============
  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (data.users.some(i => i.user === user)) {
      return Response.json({ ok: false });
    }
    const uid = data.nextUID;
    data.nextUID++;
    data.users.push({ uid, user, pwd });
    await save(data);
    return Response.json({ ok: true, uid });
  }

  // ============= 消息列表 =============
  if (act === "list") {
    return Response.json(data.msgs);
  }

  // ============= 发送消息（带 UID） =============
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

  // ============= 清空全部（管理员） =============
  if (act === "clear") {
    const uid = parseInt(url.searchParams.get("uid"));
    const user = data.users.find(i => i.uid === uid);
    if (!user || user.user !== "Ratstudio") {
      return Response.json({ ok: false, msg: "无权限" });
    }
    data.msgs = [];
    await save(data);
    return Response.json({ ok: true });
  }

  // ============= 撤回单条（管理员） =============
  if (act === "delete") {
    const uid = parseInt(url.searchParams.get("uid"));
    const index = parseInt(url.searchParams.get("index"));
    const admin = data.users.find(i => i.uid === uid);
    if (!admin || admin.user !== "Ratstudio") {
      return Response.json({ ok: false });
    }
    if (index >= 0 && index < data.msgs.length) {
      data.msgs.splice(index, 1);
      await save(data);
    }
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false });
}
