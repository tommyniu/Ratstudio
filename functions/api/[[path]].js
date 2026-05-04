export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    const url = new URL(request.url);
    const act = url.searchParams.get("act") || "";
    const uid = url.searchParams.get("uid") || "";
    const postId = url.searchParams.get("postId") || "";
    const title = url.searchParams.get("title") || "";
    const content = url.searchParams.get("content") || "";

    // 1. 读取或初始化数据库（绝不崩溃）
    let db;
    try {
      const raw = await env.CHAT_DB.get("db");
      db = raw ? JSON.parse(raw) : null;
    } catch (e) {
      db = null;
    }
    if (!db || typeof db !== "object") {
      db = {
        users: [],
        msgs: [],
        nextUID: 3,
        posts: [],
        postIdCounter: 1
      };
    }

    // 2. 固定管理员（强制存在）
    if (!Array.isArray(db.users)) db.users = [];
    let admin = db.users.find(u => u.user === "Ratstudio");
    if (!admin) {
      db.users.unshift({ uid: 1, user: "Ratstudio", pwd: "LTC505666" });
    } else {
      admin.uid = 1;
      admin.pwd = "LTC505666";
    }

    // 3. 确保 Test 用户
    let test = db.users.find(u => u.user === "RsTest");
    if (test) test.uid = 2;
    db.nextUID = 3;

    // ========== 论坛核心（重点：绝不抛错） ==========
    if (act === "createPost") {
      try {
        const userObj = db.users.find(u => u.uid == uid);
        if (!userObj || !title || !content) {
          return new Response("no", { headers: corsHeaders });
        }

        const time = new Date().toLocaleString();
        db.posts.push({
          postId: db.postIdCounter++,
          uid: Number(uid),
          user: userObj.user,
          title,
          content,
          time,
          like: 0
        });

        await env.CHAT_DB.put("db", JSON.stringify(db));
        return new Response("ok", { headers: corsHeaders });
      } catch (e) {
        console.error("createPost err:", e);
        return new Response("no", { headers: corsHeaders });
      }
    }

    if (act === "posts") {
      return new Response(JSON.stringify(db.posts || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (act === "like") {
      try {
        const p = db.posts.find(x => x.postId == postId);
        if (p) p.like++;
        await env.CHAT_DB.put("db", JSON.stringify(db));
        return new Response("ok", { headers: corsHeaders });
      } catch (e) {
        return new Response("no", { headers: corsHeaders });
      }
    }

    // ========== 聊天/登录（保持不变） ==========
    if (url.pathname === "/api/login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const f = db.users.find(x => x.user === user && x.pwd === pwd);
      return new Response(f ? String(f.uid) : "", { headers: corsHeaders });
    }

    if (url.pathname === "/api/reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if (db.users.some(x => x.user === user))
        return new Response("no", { headers: corsHeaders });
      const nu = db.nextUID++;
      db.users.push({ uid: nu, user, pwd });
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (url.pathname === "/api/send") {
      const msg = url.searchParams.get("msg");
      const u = db.users.find(x => x.uid == uid);
      if (!u || !msg) return new Response("no", { headers: corsHeaders });
      db.msgs.push({
        uid: u.uid,
        user: u.user,
        msg,
        isAdmin: u.uid === 1
      });
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (url.pathname === "/api/msg") {
      return new Response(JSON.stringify(db.msgs || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/api/clear") {
      if (uid !== "1") return new Response("no", { headers: corsHeaders });
      db.msgs = [];
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (url.pathname === "/api/delete") {
      if (uid !== "1") return new Response("no", { headers: corsHeaders });
      if (db.msgs.length) db.msgs.pop();
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 其他请求返回ok
    return new Response("ok", { headers: corsHeaders });

  } catch (finalErr) {
    // 最外层绝对不返回"error"，只返回"no"
    console.error("FATAL:", finalErr);
    return new Response("no", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
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
