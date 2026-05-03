export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");

  async function get() {
    const data = await env.CHAT_DB.get("chat_data");
    let parsed = data ? JSON.parse(data) : { users: [], msgs: [], nextUID: 2 };

    // 1. 强制：Ratstudio 固定 UID = 1
    let adminExist = false;
    for (let u of parsed.users) {
      if (u.user === "Ratstudio") {
        u.uid = 1;
        adminExist = true;
      }
    }

    // 不存在就自动创建管理员账号
    if (!adminExist) {
      parsed.users.unshift({ uid: 1, user: "Ratstudio", pwd: "123456" });
    }

    // 2. 其他用户禁止占用UID=1，全部从2开始排
    let newId = 2;
    for (let u of parsed.users) {
      if (u.user === "Ratstudio") continue;
      if (u.uid === 1 || !u.uid || isNaN(u.uid)) {
        u.uid = newId++;
      }
    }

    parsed.nextUID = newId;
    await env.CHAT_DB.put("chat_data", JSON.stringify(parsed));
    return parsed;
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

  // 消息列表兜底
  if (act === "list") {
    const safeMsgs = data.msgs.map(m => ({
      ...m,
      uid: m.uid || 0
    }));
    return Response.json(safeMsgs);
  }

  // 发消息
  if (act === "send") {
    const user = url.searchParams.get("user");
    const msg = url.searchParams.get("msg");
    const u = data.users.find(i => i.user === user);
    if (!u) return Response.json({ ok: false });
    data.msgs.push({ uid: u.uid, user, msg, time: Date.now() });
    if (data.msgs.length > 200) data.msgs = data.msgs.slice(-200);
    await save(data);
    return Response.json({ ok: true });
  }

  // 清空管理员校验
  if (act === "clear") {
    const uid = parseInt(url.searchParams.get("uid")||"0");
    const admin = data.users.find(x=>x.uid===uid && x.user==="Ratstudio");
    if(!admin) return Response.json({ok:false});
    data.msgs = [];
    await save(data);
    return Response.json({ok:true});
  }

  // 撤回
  if (act === "delete") {
    const uid = parseInt(url.searchParams.get("uid")||"0");
    const admin = data.users.find(x=>x.uid===uid && x.user==="Ratstudio");
    if(!admin) return Response.json({ok:false});
    if(data.msgs.length) data.msgs.pop();
    await save(data);
    return Response.json({ok:true});
  }

  return Response.json({ ok: false });
}
