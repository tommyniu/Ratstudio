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

    // 从 KV 永久读取
    const getDB = async () => {
      const data = await env.CHAT_DB.get("db");
      if (!data) {
        return {
          users: [],
          msgs: [],
          posts: [],
          nextUID: 1000,
          nextPostId: 1,
        };
      }
      return JSON.parse(data);
    };

    // 写入 KV 永久保存
    const saveDB = async (db) => {
      await env.CHAT_DB.put("db", JSON.stringify(db));
    };

    const db = await getDB();

    // 注册
    if (act === "reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if (!user || !pwd) return new Response("err", { headers: corsHeaders });
      const exist = db.users.find(x => x.user === user);
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
      return new Response(u ? u.uid + "" : "", { headers: corsHeaders });
    }

    // 发送消息（永久保存）
    if (act === "send") {
      const uid = url.searchParams.get("uid");
      const msg = url.searchParams.get("msg");
      const u = db.users.find(x => x.uid == uid);
      if (!u || !msg) return new Response("err", { headers: corsHeaders });
      db.msgs.push({ uid: u.uid, user: u.user, msg, time: new Date().toLocaleString() });
      if (db.msgs.length > 500) db.msgs = db.msgs.slice(-500);
      await saveDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    // 获取消息（永久读取）
    if (act === "msg") {
      return new Response(JSON.stringify(db.msgs || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 帖子列表
    if (act === "posts") {
      return new Response(JSON.stringify(db.posts || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 发布帖子（永久存）
    if (act === "createPost") {
      const uid = url.searchParams.get("uid");
      const title = url.searchParams.get("title");
      const content = url.searchParams.get("content");
      const u = db.users.find(x => x.uid == uid);
      if (!u || !title || !content) return new Response("err", { headers: corsHeaders });
      db.posts.push({
        postId: db.nextPostId++,
        uid: u.uid,
        user: u.user,
        title,
        content,
        time: new Date().toLocaleString(),
        like: 0,
        liked: [],
      });
      await saveDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    // 点赞
    if (act === "like") {
      const uid = url.searchParams.get("uid");
      const pid = parseInt(url.searchParams.get("postId"));
      const p = db.posts.find(x => x.postId === pid);
      if (!p || !uid) return new Response("err", { headers: corsHeaders });
      if (!p.liked) p.liked = [];
      if (p.liked.includes(uid)) return new Response("repeat", { headers: corsHeaders });
      p.like++;
      p.liked.push(uid);
      await saveDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    // 管理员清空
    if (act === "clear") {
      const admin = db.users.find(x => x.uid == url.searchParams.get("uid") && x.user === "Ratstudio");
      if (!admin) return new Response("no", { headers: corsHeaders });
      db.msgs = [];
      await saveDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    // 管理员撤回
    if (act === "delete") {
      const admin = db.users.find(x => x.uid == url.searchParams.get("uid") && x.user === "Ratstudio");
      if (!admin) return new Response("no", { headers: corsHeaders });
      if (db.msgs.length > 0) db.msgs.pop();
      await saveDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    return new Response("err:" + e, { headers: corsHeaders });
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
