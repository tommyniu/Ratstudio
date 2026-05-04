export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const url = new URL(request.url);
  const path = url.pathname;

  // 初始化数据库
  const getDB = async () => {
    const raw = await env.CHAT_DB.get("chat_data");
    return raw ? JSON.parse(raw) : { users: [], msgs: [], nextUID: 2 };
  };

  const saveDB = async (db) => {
    await env.CHAT_DB.put("chat_data", JSON.stringify(db));
  };

  const db = await getDB();

  // 1. 登录
  if (path === "/api/login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const foundUser = db.users.find(u => u.user === user && u.pwd === pwd);
    return new Response(foundUser ? String(foundUser.uid) : "", { headers: corsHeaders });
  }

  // 2. 注册
  if (path === "/api/reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (db.users.some(u => u.user === user)) {
      return new Response("no", { headers: corsHeaders });
    }
    const newUID = db.nextUID++;
    db.users.push({ uid: newUID, user, pwd });
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

  // 3. 发送消息
  if (path === "/api/send") {
    const uid = url.searchParams.get("uid");
    const msg = url.searchParams.get("msg");
    const userObj = db.users.find(u => u.uid == uid);
    if (!userObj || !msg) {
      return new Response("no", { headers: corsHeaders });
    }
    db.msgs.push({ uid: userObj.uid, user: userObj.user, msg });
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

  // 4. 获取消息列表
  if (path === "/api/msg") {
    return new Response(JSON.stringify(db.msgs || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // 5. 清空消息（管理员）
  if (path === "/api/clear") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = db.users.find(u => u.uid === uid && u.user === "Ratstudio");
    if (!admin) return new Response("no", { headers: corsHeaders });
    db.msgs = [];
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

  // 6. 撤回最后一条（管理员）
  if (path === "/api/delete") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = db.users.find(u => u.uid === uid && u.user === "Ratstudio");
    if (!admin) return new Response("no", { headers: corsHeaders });
    if (db.msgs.length > 0) db.msgs.pop();
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

  // 兜底
  return new Response("ok", { headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
