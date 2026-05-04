export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const url = new URL(request.url);
    const path = url.pathname;

    let db;
    try {
      const stored = await env.CHAT_DB.get("db");
      db = stored ? JSON.parse(stored) : { users: [], msgs: [], nextUID: 2 };
    } catch (e) {
      db = { users: [], msgs: [], nextUID: 2 };
    }

    // 自动修正 nextUID：取最大已有UID +1，防止重复
    if (db.users.length > 0) {
      let maxUid = Math.max(...db.users.map(u => u.uid));
      db.nextUID = maxUid + 1;
    } else {
      db.nextUID = 2;
    }

    // 登录
    if (path === "/api/login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const found = db.users.find(u => u.user === user && u.pwd === pwd);
      return new Response(found ? String(found.uid) : "", { headers: corsHeaders });
    }

    // 注册：新用户永远用 nextUID，从2递增，绝不占用UID1
    if (path === "/api/reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if (db.users.some(u => u.user === user)) {
        return new Response("no", { headers: corsHeaders });
      }
      const newUid = db.nextUID++;
      db.users.push({ uid: newUid, user, pwd });
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 发消息
    if (path === "/api/send") {
      const uid = url.searchParams.get("uid");
      const msg = url.searchParams.get("msg");
      const user = db.users.find(u => u.uid == uid);
      if (!user || !msg) return new Response("no", { headers: corsHeaders });
      db.msgs.push({ uid: user.uid, user: user.user, msg });
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 获取消息
    if (path === "/api/msg") {
      return new Response(JSON.stringify(db.msgs || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 清空消息：只允许 UID=1 且用户名是Ratstudio
    if (path === "/api/clear") {
      const uid = url.searchParams.get("uid");
      const admin = db.users.find(u => u.uid == 1 && u.user === "Ratstudio");
      if (!admin) return new Response("no", { headers: corsHeaders });
      db.msgs = [];
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 撤回最后一条
    if (path === "/api/delete") {
      const uid = url.searchParams.get("uid");
      const admin = db.users.find(u => u.uid == 1 && u.user === "Ratstudio");
      if (!admin) return new Response("no", { headers: corsHeaders });
      if (db.msgs.length > 0) db.msgs.pop();
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    return new Response("ok", { headers: corsHeaders });

  } catch (err) {
    return new Response("error", { headers: corsHeaders });
  }
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
