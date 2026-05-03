export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");

  // ============== 强制重置所有 UID ==============
  async function getAndResetUID() {
    const data = await env.CHAT_DB.get("chat_data");
    let parsed = data ? JSON.parse(data) : { users: [], msgs: [], nextUID: 2 };

    // 取出所有用户
    const allUsers = [...parsed.users];
    parsed.users = [];

    // 1. 管理员 Ratstudio = UID 1
    let admin = allUsers.find(u => u.user === "Ratstudio");
    if (admin) {
      parsed.users.push({ uid: 1, user: "Ratstudio", pwd: admin.pwd });
    } else {
      parsed.users.push({ uid: 1, user: "Ratstudio", pwd: "123456" });
    }

    // 2. 其他用户 从 2 开始重新编号
    let newUID = 2;
    for (let u of allUsers) {
      if (u.user === "Ratstudio") continue;
      parsed.users.push({ uid: newUID++, user: u.user, pwd: u.pwd });
    }

    parsed.nextUID = newUID;
    await env.CHAT_DB.put("chat_data", JSON.stringify(parsed));
    return parsed;
  }

  const data = await getAndResetUID();
  async function save(d) { await env.CHAT_DB.put("chat_data", JSON.stringify(d)); }

  // 登录
  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const u = data.users.find(i => i.user === user && i.pwd === pwd);
    return u ? Response.json({ ok: true, uid: u.uid }) : Response.json({ ok: false });
  }

  // 注册
  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (data.users.some(i => i.user === user)) return Response.json({ ok: false });
    const uid = data.nextUID++;
    data.users.push({ uid, user, pwd });
    await save(data);
    return Response.json({ ok: true, uid });
  }

  // 消息列表
  if (act === "list") {
    return Response.json(data.msgs || []);
  }

  // 发送消息
  if (act === "send") {
    const user = url.searchParams.get("user");
    const msg = url.searchParams.get("msg");
    const u = data.users.find(i => i.user === user);
    if (!u) return Response.json({ ok: false });

    data.msgs.push({ uid: u.uid, user: u.user, msg, time: Date.now() });
    if (data.msgs.length > 200) data.msgs = data.msgs.slice(-200);
    await save(data);
    return Response.json({ ok: true });
  }

  // 清空
  if (act === "clear") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = data.users.find(x => x.uid === uid && x.user === "Ratstudio");
    if (!admin) return Response.json({ ok: false });
    data.msgs = [];
    await save(data);
    return Response.json({ ok: true });
  }

  // 撤回最后一条
  if (act === "delete") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = data.users.find(x => x.uid === uid && x.user === "Ratstudio");
    if (!admin) return Response.json({ ok: false });
    if (data.msgs.length > 0) data.msgs.pop();
    await save(data);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false });
}
