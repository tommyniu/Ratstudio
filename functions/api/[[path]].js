export async function onRequestGet({ request, env }) {
  return handleRequest(request, env);
}

export async function onRequestPost({ request, env }) {
  return handleRequest(request, env);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
}export async function onRequestGet({ request, env }) {
  return handleRequest(request, env);
}

export async function onRequestPost({ request, env }) {
  return handleRequest(request, env);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
}

async function handleRequest(request, env) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const ADMIN_UIDS = [1];
  const MAX_MESSAGES = 200;
  const WRITE_LIMIT = 800;

  function getNowTime() {
    const d = new Date();
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  try {
    const url = new URL(request.url);
    const act = url.searchParams.get("act");
    const uid = url.searchParams.get("uid");
    const postId = url.searchParams.get("postId");

    let writeCountData = await env.CHAT_DB.get("writeCount").then(r => r ? JSON.parse(r) : { count: 0, date: new Date().toDateString() });
    const today = new Date().toDateString();
    if (writeCountData.date !== today) {
      writeCountData = { count: 0, date: today };
    }

    async function safeWrite(key, value) {
      if (writeCountData.count >= WRITE_LIMIT) return false;
      writeCountData.count++;
      await env.CHAT_DB.put("writeCount", JSON.stringify(writeCountData));
      await env.CHAT_DB.put(key, value);
      return true;
    }

    let db = await env.CHAT_DB.get("db").then(r => r ? JSON.parse(r) : {
      users: [], msgs: [], nextUID: 2, posts: [], postIdCounter: 1, comments: []
    });
    if (!db.msgs) db.msgs = [];
    if (!db.posts) db.posts = [];
    if (!db.users) db.users = [];
    if (!db.comments) db.comments = [];

    let admin = db.users.find(u => u.uid === 1);
    if (!admin) {
      db.users.unshift({ uid: 1, user: "Ratstudio", pwd: "LTC505666" });
      await safeWrite("db", JSON.stringify(db));
    }

    // 修复：每次上传都是不同随机图
    if (url.pathname === "/api/upload") {
      const randomId = Math.floor(Math.random() * 100000);
      return new Response(JSON.stringify({
        url: `https://picsum.photos/800/450?r=${randomId}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (act === "createPost") {
      const title = url.searchParams.get("title");
      const content = url.searchParams.get("content");
      const imgs = url.searchParams.get("imgs");
      const user = db.users.find(u => u.uid == uid);
      if (!user || !title || !content) return new Response("error", { headers: corsHeaders });

      db.posts.push({
        postId: db.postIdCounter++,
        uid: Number(uid),
        user: user.user,
        title,
        content,
        imgs: imgs || "[]",
        time: getNowTime(),
        like: 0
      });
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "posts") {
      return new Response(JSON.stringify(db.posts), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (act === "like") {
      const post = db.posts.find(x => x.postId == url.searchParams.get("postId"));
      if (post) post.like++;
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 修复删除帖子：用 postId
    if (act === "deletePost") {
      const isAdmin = ADMIN_UIDS.includes(Number(uid));
      const post = db.posts.find(p => p.postId == Number(postId));
      if (!post) return new Response("no", { headers: corsHeaders });
      if (!isAdmin && post.uid != uid) return new Response("no", { headers: corsHeaders });

      db.posts = db.posts.filter(p => p.postId != Number(postId));
      db.comments = db.comments.filter(c => c.postId != Number(postId));
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

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
        time: getNowTime(),
        like: 0
      });
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "comments") {
      return new Response(JSON.stringify(db.comments), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (act === "likeComment") {
      const cmt = db.comments.find(x => x.cid == url.searchParams.get("cid"));
      if (cmt) cmt.like++;
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "deleteMsg") {
      const idx = Number(url.searchParams.get("targetId"));
      const isAdmin = ADMIN_UIDS.includes(Number(uid));
      const msg = db.msgs[idx];
      if (!msg) return new Response("no", { headers: corsHeaders });
      if (!isAdmin && msg.uid != uid) return new Response("no", { headers: corsHeaders });

      db.msgs.splice(idx, 1);
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (url.pathname === "/api/send") {
      const msg = url.searchParams.get("msg");
      const user = db.users.find(x => x.uid == uid);
      if (!user || !msg) return new Response("no", { headers: corsHeaders });

      db.msgs.push({ uid: user.uid, user: user.user, msg, isAdmin: user.uid == 1, time:getNowTime() });
      if (db.msgs.length > MAX_MESSAGES) db.msgs = db.msgs.slice(-MAX_MESSAGES);

      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (url.pathname === "/api/msg") {
      return new Response(JSON.stringify(db.msgs), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

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
      return new Response(JSON.stringify({ username: u ? u.user : "未知用户" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/api/userStat") {
      const uid = url.searchParams.get("uid");
      const posts = db.posts.filter(p => p.uid == uid);
      const likes = posts.reduce((s, p) => s + (p.like || 0), 0);
      return new Response(JSON.stringify({ post: posts.length, like: likes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("ok", { headers: corsHeaders });

  } catch (e) {
    return new Response("error:"+e, { headers: corsHeaders });
  }
}

async function handleRequest(request, env) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const ADMIN_UIDS = [1];
  const MAX_MESSAGES = 200;
  const WRITE_LIMIT = 800;

  function getNowTime() {
    const d = new Date();
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  try {
    const url = new URL(request.url);
    const act = url.searchParams.get("act");
    const uid = url.searchParams.get("uid");
    const targetId = url.searchParams.get("targetId") || url.searchParams.get("postId");

    let writeCountData = await env.CHAT_DB.get("writeCount").then(r => r ? JSON.parse(r) : { count: 0, date: new Date().toDateString() });
    const today = new Date().toDateString();
    if (writeCountData.date !== today) {
      writeCountData = { count: 0, date: today };
    }

    async function safeWrite(key, value) {
      if (writeCountData.count >= WRITE_LIMIT) return false;
      writeCountData.count++;
      await env.CHAT_DB.put("writeCount", JSON.stringify(writeCountData));
      await env.CHAT_DB.put(key, value);
      return true;
    }

    let db = await env.CHAT_DB.get("db").then(r => r ? JSON.parse(r) : {
      users: [], msgs: [], nextUID: 2, posts: [], postIdCounter: 1, comments: []
    });
    if (!db.msgs) db.msgs = [];
    if (!db.posts) db.posts = [];
    if (!db.users) db.users = [];
    if (!db.comments) db.comments = [];

    let admin = db.users.find(u => u.uid === 1);
    if (!admin) {
      db.users.unshift({ uid: 1, user: "Ratstudio", pwd: "LTC505666" });
      await safeWrite("db", JSON.stringify(db));
    }

    // 🔥 图片上传（支持POST）
    if (url.pathname === "/api/upload") {
      return new Response(JSON.stringify({
        url: "https://picsum.photos/800/450?" + Math.random()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 发帖（支持图片）
    if (act === "createPost") {
      const title = url.searchParams.get("title");
      const content = url.searchParams.get("content");
      const imgs = url.searchParams.get("imgs");
      const user = db.users.find(u => u.uid == uid);
      if (!user || !title || !content) return new Response("error", { headers: corsHeaders });

      db.posts.push({
        postId: db.postIdCounter++,
        uid: Number(uid),
        user: user.user,
        title,
        content,
        imgs: imgs || "[]",
        time: getNowTime(),
        like: 0
      });
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 帖子列表
    if (act === "posts") {
      return new Response(JSON.stringify(db.posts), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 点赞帖子
    if (act === "like") {
      const post = db.posts.find(x => x.postId == url.searchParams.get("postId"));
      if (post) post.like++;
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // ✅ 删除帖子（修复参数）
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

    // 发表评论
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
        time: getNowTime(),
        like: 0
      });
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 评论列表
    if (act === "comments") {
      return new Response(JSON.stringify(db.comments), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 点赞评论
    if (act === "likeComment") {
      const cmt = db.comments.find(x => x.cid == url.searchParams.get("cid"));
      if (cmt) cmt.like++;
      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 撤回消息
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

    // 聊天发送
    if (url.pathname === "/api/send") {
      const msg = url.searchParams.get("msg");
      const user = db.users.find(x => x.uid == uid);
      if (!user || !msg) return new Response("no", { headers: corsHeaders });

      db.msgs.push({ uid: user.uid, user: user.user, msg, isAdmin: user.uid == 1, time:getNowTime() });
      if (db.msgs.length > MAX_MESSAGES) db.msgs = db.msgs.slice(-MAX_MESSAGES);

      await safeWrite("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    // 聊天记录
    if (url.pathname === "/api/msg") {
      return new Response(JSON.stringify(db.msgs), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 登录
    if (url.pathname === "/api/login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const found = db.users.find(x => x.user === user && x.pwd === pwd);
      return new Response(found ? found.uid + "" : "fail", { headers: corsHeaders });
    }

    // 注册
    if (url.pathname === "/api/reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if (db.users.some(x => x.user === user)) return new Response("no", { headers: corsHeaders });
      const newUID = db.nextUID++;
      db.users.push({ uid: newUID, user, pwd });
      await safeWrite("db", JSON.stringify(db));
      return new Response(`uid:${newUID}`, { headers: corsHeaders });
    }

    // 用户信息
    if (url.pathname === "/api/getUser") {
      const u = db.users.find(x => x.uid == url.searchParams.get("uid"));
      return new Response(JSON.stringify({ username: u ? u.user : "未知用户" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 用户统计
    if (url.pathname === "/api/userStat") {
      const uid = url.searchParams.get("uid");
      const posts = db.posts.filter(p => p.uid == uid);
      const likes = posts.reduce((s, p) => s + (p.like || 0), 0);
      return new Response(JSON.stringify({ post: posts.length, like: likes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("ok", { headers: corsHeaders });

  } catch (e) {
    return new Response("error:"+e, { headers: corsHeaders });
  }
}
