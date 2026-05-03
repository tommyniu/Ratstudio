export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");

  // ============= 只读取数据，不重置！不重建！=============
  async function getData() {
    const data = await env.CHAT_DB.get("chat_data");
    return data ? JSON.parse(data) : { users: [], msgs: [], nextUID: 2 };
  }

  const data = await getData();
  async function save(d) {
    await env.CHAT_DB.put("chat_data", JSON.stringify(d));
  }

  // 登录
  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const u = data.users.find(i => i.user === user && i.pwd === pwd);
    if (u) {
      return new Response(u.uid.toString());
    } else {
      return new Response("");
    }
  }

  // 注册
  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (data.users.some(i => i.user === user)) {
      return new Response("exist");
    }
    const uid = data.nextUID++;
    data.users.push({ uid, user, pwd });
    await save(data);
    return new Response("ok");
  }

  // 消息列表
  if (act === "msg") {
    return Response.json(data.msgs || []);
  }

  // 发送消息
  if (act === "send") {
    const uid = url.searchParams.get("uid");
    const msg = url.searchParams.get("msg");
    const u = data.users.find(i => i.uid == uid);
    if (!u || !msg) return new Response("no");

    data.msgs.push({
      uid: u.uid,
      user: u.user,
      msg,
      time: Date.now()
    });
    if (data.msgs.length > 200) data.msgs = data.msgs.slice(-200);
    await save(data);
    return new Response("ok");
  }

  // 清空（管理员）
  if (act === "clear") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = data.users.find(x => x.uid === uid && x.user === "Ratstudio");
    if (!admin) return new Response("no");
    data.msgs = [];
    await save(data);
    return new Response("ok");
  }

  // 删除最后一条（管理员）
  if (act === "delete") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = data.users.find(x => x.uid === uid && x.user === "Ratstudio");
    if (!admin) return new Response("no");
    if (data.msgs.length > 0) data.msgs.pop();
    await save(data);
    return new Response("ok");
  }

  return new Response("invalid");
}
