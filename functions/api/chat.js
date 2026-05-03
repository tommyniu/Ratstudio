export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");

  async function get() {
    const data = await env.CHAT_DB.get("chat_data");
    let parsed = data ? JSON.parse(data) : { users: [], msgs: [], nextUID: 3 };

    // ========== 强制规则 ==========
    // 1. Ratstudio 强制固定 UID=1
    let hasAdmin = false;
    parsed.users.forEach(u => {
      if (u.user === "Ratstudio") {
        u.uid = 1;
        hasAdmin = true;
      }
    });

    // 如果没有管理员，自动创建 Ratstudio 占位
    if (!hasAdmin) {
      parsed.users.push({ uid: 1, user: "Ratstudio", pwd: "123456" });
    }

    // 2. 把所有其他 uid=1 的用户，重新分配从2开始顺延
    let newId = 2;
    parsed.users.forEach(u => {
      // 跳过管理员固定1
      if (u.user === "Ratstudio") return;
      // 凡是UID异常、UID=1的，全部重新编号
      if (!u.uid || isNaN(u.uid) || u.uid === 1) {
        u.uid = newId++;
      }
    });

    // 修正 nextUID 保证后续注册不重复
    parsed.nextUID = newId;

    // 保存修复后数据
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
    if (u) return Response.json({ ok: true, uid: u.uid });
    return Response.json({ ok: false });
  }

  // 注册
  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (data.users.some(i => i.user === user)) {
      return Response.json({ ok: false });
    }
    // 普通用户从当前nextUID拿号
    const uid = data.nextUID;
    data.nextUID += 1;
    data.users.push({ uid, user, pwd });
    await save(data);
    return Response.json({ ok: true, uid });
  }

  // 消息列表 兜底UID
  if (act === "list") {
    const safeMsgs = data.msgs.map(m => ({
      ...m,
      uid: m.uid || 2
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

  // 管理员清空
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

  // 管理员撤回最后一条
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
