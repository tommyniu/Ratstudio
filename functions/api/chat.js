export async function onRequestGet({ request, env }) {
  // 全局 CORS，彻底解决跨域
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const url = new URL(request.url);
  const act = url.searchParams.get("act");

  // 读取数据
  async function getData() {
    const data = await env.CHAT_DB.get("chat_data");
    let parsed = { users: [], msgs: [], posts: [], nextUID: 2, nextPostId: 1 };
    if (data) {
      try {
        const tmp = JSON.parse(data);
        parsed.users = tmp.users || [];
        parsed.msgs = tmp.msgs || [];
        parsed.posts = tmp.posts || [];
        parsed.nextUID = tmp.nextUID || 2;
        parsed.nextPostId = tmp.nextPostId || 1;
      } catch (e) {}
    }
    return parsed;
  }

  const data = await getData();
  async function save(d) {
    await env.CHAT_DB.put("chat_data", JSON.stringify(d));
  }

  // --------------------------
  // 登录
  // --------------------------
  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const u = data.users.find(i => i.user === user && i.pwd === pwd);
    return new Response(u ? String(u.uid) : "", { headers });
  }

  // --------------------------
  // 注册
  // --------------------------
  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (data.users.some(i => i.user === user)) return new Response("exist", { headers });
    const uid = data.nextUID++;
    data.users.push({ uid, user, pwd });
    await save(data);
    return new Response("ok", { headers });
  }

  // --------------------------
  // 消息列表
  // --------------------------
  if (act === "msg") {
    return Response.json(data.msgs || [], { headers });
  }

  // --------------------------
  // 发消息
  // --------------------------
  if (act === "send") {
    const uid = url.searchParams.get("uid");
    const msg = url.searchParams.get("msg");
    const u = data.users.find(i => i.uid == uid);
    if (!u || !msg) return new Response("no", { headers });
    data.msgs.push({ uid: u.uid, user: u.user, msg, time: Date.now() });
    if (data.msgs.length > 200) data.msgs = data.msgs.slice(-200);
    await save(data);
    return new Response("ok", { headers });
  }

  // --------------------------
  // 清空消息
  // --------------------------
  if (act === "clear") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = data.users.find(x => x.uid === uid && x.user === "Ratstudio");
    if (!admin) return new Response("no", { headers });
    data.msgs = [];
    await save(data);
    return new Response("ok", { headers });
  }

  // --------------------------
  // 删除最后一条
  // --------------------------
  if (act === "delete") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = data.users.find(x => x.uid === uid && x.user === "Ratstudio");
    if (!admin) return new Response("no", { headers });
    if (data.msgs.length > 0) data.msgs.pop();
    await save(data);
    return new Response("ok", { headers });
  }

  // --------------------------
  // 帖子列表
  // --------------------------
  if (act === "posts") {
    return Response.json(data.posts || [], { headers });
  }

  // --------------------------
  // 发布帖子
  // --------------------------
  if (act === "createPost") {
    const uid = url.searchParams.get("uid");
    const title = url.searchParams.get("title");
    const content = url.searchParams.get("content");
    const u = data.users.find(i => i.uid == uid);
    if (!u || !title || !content) return new Response("err", { headers });
    data.posts.push({
      postId: data.nextPostId++,
      uid: u.uid,
      user: u.user,
      title,
      content,
      time: new Date().toLocaleString(),
      like: 0,
      liked: []
    });
    await save(data);
    return new Response("ok", { headers });
  }

  // --------------------------
  // 点赞
  // --------------------------
  if (act === "like") {
    const uid = url.searchParams.get("uid");
    const postId = parseInt(url.searchParams.get("postId"));
    const post = data.posts.find(p => p.postId === postId);
    if (!post) return new Response("err", { headers });
    if (!post.liked) post.liked = [];
    if (post.liked.includes(uid)) return new Response("repeat", { headers });
    post.like = (post.like || 0) + 1;
    post.liked.push(uid);
    await save(data);
    return new Response("ok", { headers });
  }

  // --------------------------
  // 调试
  // --------------------------
  if (act === "debug") {
    return new Response(JSON.stringify(data, null, 2), {
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }

  // --------------------------
  // 无接口 → 返回默认信息
  // --------------------------
  return new Response(JSON.stringify({
    error: "no act",
    code: 404,
    tip: "接口正常，使用 ?act=msg / ?act=posts / ?act=debug"
  }, null, 2), {
    headers: { ...headers, "Content-Type": "application/json" }
  });
}
