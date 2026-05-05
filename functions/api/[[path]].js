export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const ADMIN_UIDS = [1];
  const MAX_MESSAGES = 200;
  const WRITE_LIMIT = 800;

  try {
    const url = new URL(request.url);
    const act = url.searchParams.get("act");
    const uid = url.searchParams.get("uid");
    const targetId = url.searchParams.get("targetId");

    // 每日写入计数
    let writeCountData = await env.CHAT_DB.get("writeCount").then(r => r ? JSON.parse(r) : { count: 0, date: new Date().toDateString() });
    const today = new Date().toDateString();
    if (writeCountData.date !== today) {
      writeCountData = { count: 0, date: today };
    }

    // 安全写入（防超免费限额）
    async function safeWrite(key, value) {
      if (writeCountData.count >= WRITE_LIMIT) return false;
      writeCountData.count++;
      await env.CHAT_DB.put("writeCount", JSON.stringify(writeCountData));
      await env.CHAT_DB.put(key, value);
      return true;
    }

    // 加载数据库
    let db = await env.CHAT_DB.get("db").then(r => r ? JSON.parse(r) : {
      users: [], msgs: [], nextUID: 2, posts: [], postIdCounter: 1, comments: []
    });
    if (!db.msgs) db.msgs = [];
    if (!db.posts) db.posts = [];
    if (!db.users) db.users = [];
    if (!db.comments) db.comments = [];

    // 强制管理员
    let admin = db.users.find(u => u.uid === 1);
    if (!admin) {
      db.users.unshift({ uid: 1, user: "Ratstudio", pwd: "LTC505666" });
      await safeWrite("db", JSON.stringify(db));
    }

    // ==========================================
    // 1. 发帖
    // ==========================================
    if (act === "createPost") {
      const title = url.searchParams.get("title");
      const content = url.searchParams.get("content");
      const user = db.users.find(u => u.uid == uid);
      if (!user || !title || !content) return new Response("error", { headers: corsHeaders });

      const now = new Date();
      const time = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,0)}/${String(now.getDate()).padStart(2,0)} ${String(now.getHours()).padStart(2,0)}:${String(now.getMinutes()).padStart(2,0)}`;

      db.posts.push({
        postId: db.postIdCounter++,
        uid: Number(uid),
        user: user.user,
        title, content, time, like: 0
      });
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ==========================================
    // 2. 帖子列表
    // ==========================================
    if (act === "posts") {
      return new Response(JSON.stringify(db.posts), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==========================================
    // 3. 点赞帖子
    // ==========================================
    if (act === "like") {
      const post = db.posts.find(x => x.postId == url.searchParams.get("postId"));
      if (post) post.like++;
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ==========================================
    // 4. 删除帖子
    // ==========================================
    if (act === "deletePost") {
      const isAdmin = ADMIN_UIDS.includes(Number(uid));
      const post = db.posts.find(p => p.postId == Number(targetId));
      if (!post) return new Response("no", { headers: corsHeaders });
      if (!isAdmin && post.uid != uid) return new Response("no", { headers: corsHeaders });

      db.posts = db.posts.filter(p => p.postId != Number(targetId));
      db.comments = db.comments.filter(c => c.postId != Number(targetId));
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ==========================================
    // 5. 发表评论（存入 KV）
    // ==========================================
    if (act === "createComment") {
      const postId = url.searchParams.get("postId");
      const text = url.searchParams.get("text");
      const user = db.users.find(u => u.uid == uid);
      if (!user || !postId || !text) return new Response("error", { headers: corsHeaders });

      db.comments.push({
        cid: Date.now(),
        postId: Number(postId),
        uid: Number(uid),
        user: user.user,
        text,
        like: 0
      });
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ==========================================
    // 6. 评论列表
    // ==========================================
    if (act === "comments") {
      return new Response(JSON.stringify(db.comments), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==========================================
    // 7. 点赞评论
    // ==========================================
    if (act === "likeComment") {
      const cmt = db.comments.find(x => x.cid == url.searchParams.get("cid"));
      if (cmt) cmt.like++;
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ==========================================
    // 8. 撤回消息
    // ==========================================
    if (act === "deleteMsg") {
      const idx = Number(targetId);
      const isAdmin = ADMIN_UIDS.includes(Number(uid));
      const msg = db.msgs[idx];
      if (!msg) return new Response("no", { headers: corsHeaders });
      if (!isAdmin && msg.uid != uid) return new Response("no", { headers: corsHeaders });

      db.msgs.splice(idx, 1);
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ==========================================
    // 9. 发送聊天消息（自动裁剪）
    // ==========================================
    if (url.pathname === "/api/send") {
      const msg = url.searchParams.get("msg");
      const user = db.users.find(x => x.uid == uid);
      if (!user || !msg) return new Response("no", { headers: corsHeaders });

      db.msgs.push({ uid: user.uid, user: user.user, msg, isAdmin: user.uid == 1 });
      if (db.msgs.length > MAX_MESSAGES) db.msgs = db.msgs.slice(-MAX_MESSAGES);

      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ==========================================
    // 10. 获取聊天记录
    // ==========================================
    if (url.pathname === "/api/msg") {
      return new Response(JSON.stringify(db.msgs), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==========================================
    // 11. 登录 / 注册 / 用户信息
    // ==========================================
    if (url.pathname === "/api/login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const found = db.users.find(x => x.user === user && x.pwd === pwd);
      return new Response(found ? found.uid + "" : "fail", { headers: corsHeaders });
    }

    if (url.pathname === "/api/reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if (db.users.some(x => x.user === user)) return new Response("no", { headers: corsHeaders });
      const newUID = db.nextUID++;
      db.users.push({ uid: newUID, user, pwd });
      await safeWrite("db", JSON.stringify(db));
      return new Response(`uid:${newUID}`, { headers: corsHeaders });
    }

    if (url.pathname === "/api/getUser") {
      const u = db.users.find(x => x.uid == url.searchParams.get("uid"));
      return new Response(JSON.stringify({ username: u ? u.user : "未知用户" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (url.pathname === "/api/userStat") {
      const uid = url.searchParams.get("uid");
      const posts = db.posts.filter(p => p.uid == uid);
      const likes = posts.reduce((s, p) => s + (p.like || 0), 0);
      return new Response(JSON.stringify({ post: posts.length, like: likes }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
