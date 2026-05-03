export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const url = new URL(request.url);
    const act = url.searchParams.get("act");

    async function getDB() {
      const val = await env.CHAT_DB.get("data");
      if (!val) {
        return {
          users: [],
          msgs: [],
          posts: [],
          nextUID: 2,
          nextPostId: 1
        };
      }
      return JSON.parse(val);
    }

    async function setDB(db) {
      await env.CHAT_DB.put("data", JSON.stringify(db));
    }

    const db = await getDB();

    if (act === "reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if (!user || !pwd) return new Response("err", { headers: corsHeaders });
      const exist = db.users.find(i => i.user === user);
      if (exist) return new Response("exist", { headers: corsHeaders });
      db.users.push({ uid: db.nextUID++, user, pwd });
      await setDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const u = db.users.find(i => i.user === user && i.pwd === pwd);
      return new Response(u ? u.uid + "" : "", { headers: corsHeaders });
    }

    if (act === "send") {
      const uid = url.searchParams.get("uid");
      const msg = url.searchParams.get("msg");
      const u = db.users.find(i => i.uid == uid);
      if (!u || !msg) return new Response("err", { headers: corsHeaders });
      db.msgs.push({ uid: u.uid, user: u.user, msg });
      await setDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "msg") {
      return new Response(JSON.stringify(db.msgs || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (act === "clear") {
      const admin = db.users.find(i => i.uid == url.searchParams.get("uid") && i.user === "Ratstudio");
      if (!admin) return new Response("no", { headers: corsHeaders });
      db.msgs = [];
      await setDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "delete") {
      const admin = db.users.find(i => i.uid == url.searchParams.get("uid") && i.user === "Ratstudio");
      if (!admin) return new Response("no", { headers: corsHeaders });
      if (db.msgs.length > 0) db.msgs.pop();
      await setDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "posts") {
      return new Response(JSON.stringify(db.posts || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (act === "createPost") {
      const uid = url.searchParams.get("uid");
      const title = url.searchParams.get("title");
      const content = url.searchParams.get("content");
      const u = db.users.find(i => i.uid == uid);
      if (!u || !title || !content) return new Response("err", { headers: corsHeaders });
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
      await setDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "like") {
      const uid = url.searchParams.get("uid");
      const pid = parseInt(url.searchParams.get("postId"));
      const p = db.posts.find(i => i.postId === pid);
      if (!p || !uid) return new Response("err", { headers: corsHeaders });
      if (!p.liked) p.liked = [];
      if (p.liked.includes(uid)) return new Response("repeat", { headers: corsHeaders });
      p.like++;
      p.liked.push(uid);
      await setDB(db);
      return new Response("ok", { headers: corsHeaders });
    }

    return new Response("ok", { headers: corsHeaders });

  } catch (e) {
    return new Response("err", {
      headers: { "Access-Control-Allow-Origin": "*" }
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
