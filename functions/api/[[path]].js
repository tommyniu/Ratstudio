export async function onRequestGet(context) {
  return handleRequest(context.request, context.env);
}
export async function onRequestPost(context) {
  return handleRequest(context.request, context.env);
}
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function handleRequest(request, env) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const url = new URL(request.url);
    const act = url.searchParams.get("act");
    const uid = url.searchParams.get("uid");

    let db = await env.CHAT_DB.get("db").then(r => r ? JSON.parse(r) : {
      users: [], msgs: [], nextUID: 2, posts: [], postIdCounter: 1, comments: []
    });

    // 真实图片上传到 Cloudflare Images
    if (url.pathname === "/api/upload") {
      const formData = await request.formData();
      const file = formData.get("img");
      if (!file) return new Response("no file", { status: 400 });

      const accountId = "YOUR_CF_ACCOUNT_ID";
      const apiToken = "YOUR_CF_IMAGES_TOKEN";

      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiToken}` },
        body: formData
      });

      const data = await res.json();
      if (!data.success) return new Response(JSON.stringify({ error: data }), { status: 500 });

      return new Response(JSON.stringify({
        url: data.result.variants[0]
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (act === "createPost") {
      const title = url.searchParams.get("title");
      const content = url.searchParams.get("content");
      const imgs = url.searchParams.get("imgs");
      const user = db.users.find(u => u.uid == uid);
      if (!user || !title) return new Response("error", { headers: corsHeaders });

      db.posts.push({
        postId: db.postIdCounter++,
        uid: Number(uid),
        user: user.user,
        title, content,
        imgs: imgs || "[]",
        time: new Date().toLocaleString(),
        like: 0,
        likedBy: []
      });

      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "posts") {
      return new Response(JSON.stringify(db.posts), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 防重复点赞 + 立即生效
    if (act === "like") {
      const pid = url.searchParams.get("postId");
      const p = db.posts.find(x => x.postId == pid);
      if (!p) return new Response("no", { headers: corsHeaders });

      if (!p.likedBy) p.likedBy = [];
      if (p.likedBy.includes(uid)) return new Response("already", { headers: corsHeaders });

      p.like++;
      p.likedBy.push(uid);
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "deletePost") {
      const pid = url.searchParams.get("postId");
      const isAdmin = uid == 1;
      const post = db.posts.find(p => p.postId == pid);
      if (!post || (!isAdmin && post.uid != uid)) return new Response("no", { headers: corsHeaders });

      db.posts = db.posts.filter(p => p.postId != pid);
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "comments") {
      return new Response(JSON.stringify(db.comments), { headers: corsHeaders });
    }

    return new Response("ok", { headers: corsHeaders });

  } catch (e) {
    return new Response("err:" + e, { headers: corsHeaders });
  }
}
