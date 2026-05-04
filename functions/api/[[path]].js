export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const ADMIN_UIDS = [1];

  try {
    const url = new URL(request.url);
    const act = url.searchParams.get("act");
    const uid = url.searchParams.get("uid");
    const targetId = url.searchParams.get("targetId");

    let db = await env.CHAT_DB.get("db").then(r => r ? JSON.parse(r) : {
      users: [], msgs: [], nextUID: 3, posts: [], postIdCounter: 1
    });

    if (!db.msgs) db.msgs = [];
    if (!db.posts) db.posts = [];

    // 管理员固定
    let admin = db.users.find(u => u.user === "Ratstudio");
    if (!admin) db.users.unshift({ uid: 1, user: "Ratstudio", pwd: "LTC505666" });

    // ==============================================
    // ✅ 精准删除消息（管理员可删任何人，用户只能删自己）
    // ==============================================
    if (act === "deleteMsg") {
      const isAdmin = ADMIN_UIDS.includes(Number(uid));
      const idx = Number(targetId);

      if (isNaN(idx) || idx < 0 || idx >= db.msgs.length)
        return new Response("no", { headers: corsHeaders });

      const msg = db.msgs[idx];
      if (!isAdmin && msg.uid != uid)
        return new Response("no", { headers: corsHeaders });

      db.msgs.splice(idx, 1);
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ==============================================
    // ✅ 精准删除帖子（管理员可删任何人，用户只能删自己）
    // ==============================================
    if (act === "deletePost") {
      const isAdmin = ADMIN_UIDS.includes(Number(uid));
      const postId = Number(targetId);
      const idx = db.posts.findIndex(p => p.postId === postId);

      if (idx === -1) return new Response("no", { headers: corsHeaders });

      const post = db.posts[idx];
      if (!isAdmin && post.uid != uid)
        return new Response("no", { headers: corsHeaders });

      db.posts.splice(idx, 1);
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ====================
    // 发帖
    // ====================
    if (act === "createPost") {
      const title = url.searchParams.get("title");
      const content = url.searchParams.get("content");
      const userObj = db.users.find(u => u.uid == uid);
      if (!userObj || !title || !content) return new Response("error", { headers: corsHeaders });

      const now = new Date();
      const time = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,0)}/${String(now.getDate()).padStart(2,0)} ${String(now.getHours()).padStart(2,0)}:${String(now.getMinutes()).padStart(2,0)}:${String(now.getSeconds()).padStart(2,0)}`;

      db.posts.push({
        postId: db.postIdCounter++,
        uid: Number(uid),
        user: userObj.user,
        title, content, time, like: 0
      });
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "posts")
      return new Response(JSON.stringify(db.posts), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (act === "like") {
      const p = db.posts.find(x => x.postId == url.searchParams.get("postId"));
      if (p) p.like++;
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ====================
    // 登录/注册/发消息
    // ====================
    if (url.pathname === "/api/login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const f = db.users.find(x => x.user === user && x.pwd === pwd);
      return new Response(f ? String(f.uid) : "", { headers: corsHeaders });
    }

    if (url.pathname === "/api/reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if (db.users.some(x => x.user === user)) return new Response("no", { headers: corsHeaders });
      db.users.push({ uid: db.nextUID++, user, pwd });
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (url.pathname === "/api/send") {
      const msg = url.searchParams.get("msg");
      const u = db.users.find(x => x.uid == uid);
      if (!u || !msg) return new Response("no", { headers: corsHeaders });
      db.msgs.push({ uid: u.uid, user: u.user, msg, isAdmin: u.uid == 1 });
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (url.pathname === "/api/msg")
      return new Response(JSON.stringify(db.msgs || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response("ok", { headers: corsHeaders });

  } catch (e) {
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
