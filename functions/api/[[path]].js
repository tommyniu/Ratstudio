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
      db = stored ? JSON.parse(stored) : { users: [], msgs: [], nextUID: 3 };
    } catch (e) {
      db = { users: [], msgs: [], nextUID: 3 };
    }

    // ====================== 强制锁定 UID ======================
    // 1. Ratstudio 永远 = UID 1
    let admin = db.users.find(u => u.user === "Ratstudio");
    if (admin) admin.uid = 1;

    // 2. RsTest 永远 = UID 2
    let test = db.users.find(u => u.user === "RsTest");
    if (test) test.uid = 2;

    // 3. 新用户从 3 开始
    db.nextUID = 3;
    // ==========================================================

    // 登录
    if (path === "/api/login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const found = db.users.find(u => u.user === user && u.pwd === pwd);
      return new Response(found ? String(found.uid) : "", { headers: corsHeaders });
    }

    // 注册
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

    // 清空（仅 Ratstudio = UID 1）
    if (path === "/api/clear") {
      const adminUser = db.users.find(u => u.uid === 1 && u.user === "Ratstudio");
      if (!adminUser) return new Response("no", { headers: corsHeaders });
      db.msgs = [];
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 撤回
    if (path === "/api/delete") {
      const adminUser = db.users.find(u => u.uid === 1 && u.user === "Ratstudio");
      if (!adminUser) return new Response("no", { headers: corsHeaders });
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
