export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // 管理员 UID 列表
  const ADMIN_UIDS = [1];

  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const act = url.searchParams.get("act");
    const uid = url.searchParams.get("uid");
    const postId = url.searchParams.get("postId");
    const title = url.searchParams.get("title");
    const content = url.searchParams.get("content");

    let db;
    try {
      const stored = await env.CHAT_DB.get("db");
      db = stored ? JSON.parse(stored) : {
        users: [], msgs: [], nextUID: 3,
        posts: [], postIdCounter: 1
      };
    } catch (e) {
      db = {
        users: [], msgs: [], nextUID: 3,
        posts: [], postIdCounter: 1
      };
    }

    // 强制管理员账号
    let admin = db.users.find(u => u.user === "Ratstudio");
    if (admin) {
      admin.uid = 1;
      admin.pwd = "LTC505666";
    } else {
      db.users.unshift({ uid: 1, user: "Ratstudio", pwd: "LTC505666" });
    }

    // 修复 UID 冲突
    let testUser = db.users.find(u => u.user === "RsTest");
    if (testUser) testUser.uid = 2;
    db.nextUID = 3;

    // ==============================
    // 论坛功能（完全修复发帖）
    // ==============================
    if (act === "createPost") {
      const userObj = db.users.find(x => x.uid == uid);
      if (!userObj || !title || !content) return new Response("no", { headers: corsHeaders });

      const now = new Date();
      const time = now.toLocaleString();

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
    }

    if (act === "posts") {
      return new Response(JSON.stringify(db.posts || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (act === "like") {
      const post = db.posts.find(x => x.postId == postId);
      if (post) post.like++;
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ==============================
    // 聊天功能
    // ==============================
    if (path === "/api/login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const f = db.users.find(x => x.user === user && x.pwd === pwd);
      return new Response(f ? String(f.uid) : "", { headers: corsHeaders });
    }

    if (path === "/api/reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if (db.users.some(x => x.user === user)) return new Response("no", { headers: corsHeaders });
      const nu = db.nextUID++;
      db.users.push({ uid: nu, user, pwd });
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (path === "/api/send") {
      const msg = url.searchParams.get("msg");
      const u = db.users.find(x => x.uid == uid);
      if (!u || !msg) return new Response("no", { headers: corsHeaders });
      db.msgs.push({
        uid: u.uid,
        user: u.user,
        msg,
        isAdmin: ADMIN_UIDS.includes(Number(u.uid))
      });
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (path === "/api/msg") {
      return new Response(JSON.stringify(db.msgs || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (path === "/api/clear") {
      if (!ADMIN_UIDS.includes(Number(uid))) return new Response("no", { headers: corsHeaders });
      db.msgs = [];
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (path === "/api/delete") {
      if (!ADMIN_UIDS.includes(Number(uid))) return new Response("no", { headers: corsHeaders });
      if (db.msgs.length) db.msgs.pop();
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
