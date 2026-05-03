// functions/api/chat.js
export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const act = url.searchParams.get("act");

  async function getDB() {
    const raw = await env.CHAT_DB.get("site_data");
    if (!raw) return { users: [], msgs: [], posts: [], nextUID: 2, nextPostId: 1 };
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { users: [], msgs: [], posts: [], nextUID: 2, nextPostId: 1 };
    }
  }

  async function saveDB(db) {
    await env.CHAT_DB.put("site_data", JSON.stringify(db));
  }

  const db = await getDB();

  // 注册
  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const exist = db.users.some(x => x.user === user);
    if (exist) return new Response("exist", { headers: corsHeaders });
    db.users.push({ uid: db.nextUID++, user, pwd });
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

  // 登录
  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const item = db.users.find(x => x.user === user && x.pwd === pwd);
    return new Response(item ? String(item.uid) : "", { headers: corsHeaders });
  }

  // 获取消息
  if (act === "msg") {
    return new Response(JSON.stringify(db.msgs), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
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

  // 清空/撤回/帖子/点赞 这些接口和之前保持一致，直接复制进来就行
  if (act === "clear") {
    const uid = url.searchParams.get("uid");
    const admin = db.users.find(x => x.uid == uid && x.user === "Ratstudio");
    if (!admin) return new Response("no", { headers: corsHeaders });
    db.msgs = [];
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

  if (act === "delete") {
    const uid = url.searchParams.get("uid");
    const admin = db.users.find(x => x.uid == uid && x.user === "Ratstudio");
    if (!admin) return new Response("no", { headers: corsHeaders });
    if (db.msgs.length) db.msgs.pop();
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

  if (act === "posts") {
    return new Response(JSON.stringify(db.posts), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (act === "createPost") {
    const uid = url.searchParams.get("uid");
    const title = url.searchParams.get("title");
    const content = url.searchParams.get("content");
    const u = db.users.find(x => x.uid == uid);
    if (!u) return new Response("err", { headers: corsHeaders });
    db.posts.push({
      postId: db.nextPostId++, uid: u.uid, user: u.user, title, content,
      time: new Date().toLocaleString(), like: 0, liked: []
    });
    await saveDB(db);
    return new Response("ok", { headers: corsHeaders });
  }

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
}
