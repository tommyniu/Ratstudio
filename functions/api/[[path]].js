export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const ADMIN_UIDS = [1];
  const MAX_MESSAGES = 200;    // 小技巧2：消息只留200条
  const WRITE_LIMIT = 800;      // 小技巧3：写保护阈值

  try {
    const url = new URL(request.url);
    const act = url.searchParams.get("act");
    const uid = url.searchParams.get("uid");
    const targetId = url.searchParams.get("targetId");

    // 读取每日写入计数
    let writeCountData = await env.CHAT_DB.get("writeCount").then(r => r ? JSON.parse(r) : { count: 0, date: new Date().toDateString() });
    const today = new Date().toDateString();
    if (writeCountData.date !== today) {
      writeCountData = { count: 0, date: today };
    }

    // 写保护
    async function checkAndWrite(key, value) {
      if (writeCountData.count >= WRITE_LIMIT) {
        return new Response("rate_limit", { headers: corsHeaders });
      }
      writeCountData.count++;
      await env.CHAT_DB.put("writeCount", JSON.stringify(writeCountData));
      await env.CHAT_DB.put(key, value);
    }

    let db = await env.CHAT_DB.get("db").then(r => r ? JSON.parse(r) : {
      users: [], msgs: [], nextUID: 2, posts: [], postIdCounter: 1
    });

    if (!db.msgs) db.msgs = [];
    if (!db.posts) db.posts = [];
    if (!db.users) db.users = [];

    let admin = db.users.find(u => u.uid === 1);
    if (!admin) {
      db.users.unshift({ uid: 1, user: "Ratstudio", pwd: "LTC505666" });
    }

    // 撤回消息
    if (act === "deleteMsg") {
      const msgIdx = Number(targetId);
      const userUid = Number(uid);
      if (isNaN(msgIdx) || msgIdx < 0 || msgIdx >= db.msgs.length)
        return new Response("no", { headers: corsHeaders });
      const msg = db.msgs[msgIdx];
      const isAdmin = ADMIN_UIDS.includes(userUid);
      if (!isAdmin && msg.uid !== userUid)
        return new Response("no", { headers: corsHeaders });
      db.msgs.splice(msgIdx, 1);
      await checkAndWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 删除帖子
    if (act === "deletePost") {
      const isAdmin = ADMIN_UIDS.includes(Number(uid));
      const postId = Number(targetId);
      const idx = db.posts.findIndex(p => p.postId === postId);
      if (idx === -1) return new Response("no", { headers: corsHeaders });
      const post = db.posts[idx];
      if (!isAdmin && post.uid != uid)
        return new Response("no", { headers: corsHeaders });
      db.posts.splice(idx, 1);
      await checkAndWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 发帖
    if (act === "createPost") {
      const title = url.searchParams.get("title");
      const content = url.searchParams.get("content");
      const userObj = db.users.find(u => u.uid == uid);
      if (!userObj || !title || !content) return new Response("error", { headers: corsHeaders });
      const now = new Date();
      const time = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,0)}/${String(now.getDate()).padStart(2,0)} ${String(now.getHours()).padStart(2,0)}:${String(now.getMinutes()).padStart(2,0)}`;
      db.posts.push({
        postId: db.postIdCounter++,
        uid: Number(uid),
        user: userObj.user,
        title, content, time, like: 0
      });
      await checkAndWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 帖子列表
    if (act === "posts")
      return new Response(JSON.stringify(db.posts), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // 点赞（防频繁刷）
    if (act === "like") {
      const p = db.posts.find(x => x.postId == url.searchParams.get("postId"));
      if (p) p.like++;
      await checkAndWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 用户信息
    if (url.pathname === "/api/getUser") {
      const targetUid = url.searchParams.get("uid");
      const user = db.users.find(u => u.uid == targetUid);
      return new Response(JSON.stringify({ username: user ? user.user : "未知用户" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 用户统计
    if (url.pathname === "/api/userStat") {
      const targetUid = url.searchParams.get("uid");
      const posts = db.posts.filter(p => p.uid == targetUid);
      const postCount = posts.length;
      const likeCount = posts.reduce((sum, p) => sum + (p.like || 0), 0);
      return new Response(JSON.stringify({ post: postCount, like: likeCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 登录
    if (url.pathname === "/api/login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const found = db.users.find(x => x.user === user && x.pwd === pwd);
      return new Response(found ? String(found.uid) : "fail", { headers: corsHeaders });
    }

    // 注册
    if (url.pathname === "/api/reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if (db.users.some(x => x.user === user)) return new Response("no", { headers: corsHeaders });
      const newUID = db.nextUID++;
      db.users.push({ uid: newUID, user, pwd });
      await checkAndWrite("db", JSON.stringify(db));
      return new Response(`uid:${newUID}`, { headers: corsHeaders });
    }

    // 发消息（自动裁剪 + 批量）
    if (url.pathname === "/api/send") {
      const msg = url.searchParams.get("msg");
      const u = db.users.find(x => x.uid == uid);
      if (!u || !msg) return new Response("no", { headers: corsHeaders });
      db.msgs.push({ uid: u.uid, user: u.user, msg, isAdmin: u.uid == 1 });

      // 小技巧2：自动裁剪消息
      if (db.msgs.length > MAX_MESSAGES) {
        db.msgs = db.msgs.slice(-MAX_MESSAGES);
      }

      await checkAndWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 消息列表
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
