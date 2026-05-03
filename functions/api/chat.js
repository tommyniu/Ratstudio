export async function onRequestGet(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const url = new URL(request.url);
    const act = url.searchParams.get("act");

    async function getDB() {
      const data = await env.CHAT_DB.get("data");
      return data ? JSON.parse(data) : {
        users: [], msgs: [], posts: [], nextUID: 2, nextPostId: 1
      };
    }

    async function saveDB(db) {
      await env.CHAT_DB.put("data", JSON.stringify(db));
    }

    const db = await getDB();

    // 注册
    if (act === "reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const exist = db.users.some(u => u.user === user);
      if (exist) return new Response("exist", { headers: corsHeaders });
      db.users.push({ uid: db.nextUID++, user, pwd });
      await saveDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    // 登录
    if (act === "login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const u = db.users.find(x => x.user === user && x.pwd === pwd);
      return new Response(u ? String(u.uid) : "", { headers: corsHeaders });
    }

    // 发送消息
    if (act === "send") {
      const uid = url.searchParams.get("uid");
      const msg = url.searchParams.get("msg");
      const u = db.users.find(x => x.uid == uid);
      if (!u) return new Response("err", { headers: corsHeaders });
      db.msgs.push({ uid: u.uid, user: u.user, msg });
      if (db.msgs.length > 200) db.msgs = db.msgs.slice(-200);
      await saveDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    // 获取消息
    if (act === "msg") {
      return new Response(JSON.stringify(db.msgs), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 清空
    if (act === "clear") {
      const uid = url.searchParams.get("uid");
      const admin = db.users.find(x => x.uid == uid && x.user === "Ratstudio");
      if (!admin) return new Response("no", { headers: corsHeaders });
      db.msgs = [];
      await saveDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    // 删除最后一条
    if (act === "delete") {
      const uid = url.searchParams.get("uid");
      const admin = db.users.find(x => x.uid == uid && x.user === "Ratstudio");
      if (!admin) return new Response("no", { headers: corsHeaders });
      if (db.msgs.length > 0) db.msgs.pop();
      await saveDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    // 帖子列表
    if (act === "posts") {
      return new Response(JSON.stringify(db.posts), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 发帖
    if (act === "createPost") {
      const uid = url.searchParams.get("uid");
      const title = url.searchParams.get("title");
      const content = url.searchParams.get("content");
      const u = db.users.find(x => x.uid == uid);
      if (!u) return new Response("err", { headers: corsHeaders });
      db.posts.push({
        postId: db.nextPostId++,
        uid: u.uid,
        user: u.user,
        title,
        content,
        time: new Date().toLocaleString(),
        like: 0,
        liked: []
      });
      await saveDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    // 点赞
    if (act === "like") {
      const uid = url.searchParams.get("uid");
      const postId = parseInt(url.searchParams.get("postId"));
      const post = db.posts.find(x => x.postId === postId);
      if (!post) return new Response("err", { headers: corsHeaders });
      if (!post.liked) post.liked = [];
      if (post.liked.includes(uid)) return new Response("repeat", { headers: corsHeaders });
      post.like++;
      post.liked.push(uid);
      await saveDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    return new Response("ok", { headers: corsHeaders });

  } catch (err) {
    return new Response("err", { headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
