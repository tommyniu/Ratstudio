export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // 管理员UID白名单，后续加管理员直接在数组里加数字
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

    // 强制管理员账号固定信息
    let admin = db.users.find(u => u.user === "Ratstudio");
    if (admin) {
      admin.uid = 1;
      admin.pwd = "LTC505666";
    } else {
      db.users.unshift({ uid: 1, user: "Ratstudio", pwd: "LTC505666" });
    }

    let test = db.users.find(u => u.user === "RsTest");
    if (test) test.uid = 2;

    db.nextUID = 3;

    // 论坛发帖
    if (act === "createPost") {
      const userObj = db.users.find(u => u.uid == uid);
      if (!userObj || !title || !content)
        return new Response("no", { headers: corsHeaders });

      const now = new Date();
      const time = now.toLocaleString();

      db.posts.push({
        postId: db.postIdCounter++,
        uid: userObj.uid,
        user: userObj.user,
        title,
        content,
        time,
        like: 0
      });

      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 获取帖子列表
    if (act === "posts") {
      return new Response(JSON.stringify(db.posts || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 帖子点赞
    if (act === "like") {
      const p = db.posts.find(x => x.postId == postId);
      if (p) p.like++;
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 登录
    if (path === "/api/login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const f = db.users.find(x => x.user === user && x.pwd === pwd);
      return new Response(f ? String(f.uid) : "", { headers: corsHeaders });
    }

    // 注册
    if (path === "/api/reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if (db.users.some(x => x.user === user))
        return new Response("no", { headers: corsHeaders });
      const nu = db.nextUID++;
      db.users.push({ uid: nu, user, pwd });
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 发消息
    if (path === "/api/send") {
      const msg = url.searchParams.get("msg");
      const u = db.users.find(x => x.uid == uid);
      if (!u || !msg)
        return new Response("no", { headers: corsHeaders });
      db.msgs.push({ 
        uid: u.uid, 
        user: u.user, 
        msg,
        isAdmin: ADMIN_UIDS.includes(Number(u.uid))
      });
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 获取消息列表
    if (path === "/api/msg") {
      return new Response(JSON.stringify(db.msgs || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 清空消息 仅管理员可操作
    if (path === "/api/clear") {
      if (!ADMIN_UIDS.includes(Number(uid))) 
        return new Response("no", { headers: corsHeaders });
      db.msgs = [];
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 撤回最后一条 仅管理员可操作
    if (path === "/api/delete") {
      if (!ADMIN_UIDS.includes(Number(uid)))
        return new Response("no", { headers: corsHeaders });
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
