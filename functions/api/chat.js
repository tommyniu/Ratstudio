export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");

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

  // 登录
  if (act === "login") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    const u = data.users.find(i => i.user === user && i.pwd === pwd);
    return new Response(u ? String(u.uid) : "");
  }

  // 注册
  if (act === "reg") {
    const user = url.searchParams.get("user");
    const pwd = url.searchParams.get("pwd");
    if (data.users.some(i => i.user === user)) return new Response("exist");
    const uid = data.nextUID++;
    data.users.push({ uid, user, pwd });
    await save(data);
    return new Response("ok");
  }

  // 消息列表
  if (act === "msg") {
    return Response.json(data.msgs || []);
  }

  // 发消息
  if (act === "send") {
    const uid = url.searchParams.get("uid");
    const msg = url.searchParams.get("msg");
    const u = data.users.find(i => i.uid == uid);
    if (!u || !msg) return new Response("no");
    data.msgs.push({ uid: u.uid, user: u.user, msg, time: Date.now() });
    if (data.msgs.length > 200) data.msgs = data.msgs.slice(-200);
    await save(data);
    return new Response("ok");
  }

  // 清空
  if (act === "clear") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = data.users.find(x => x.uid === uid && x.user === "Ratstudio");
    if (!admin) return new Response("no");
    data.msgs = [];
    await save(data);
    return new Response("ok");
  }

  // 删除最后一条
  if (act === "delete") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = data.users.find(x => x.uid === uid && x.user === "Ratstudio");
    if (!admin) return new Response("no");
    if (data.msgs.length > 0) data.msgs.pop();
    await save(data);
    return new Response("ok");
  }

  // 帖子列表
  if (act === "posts") {
    return Response.json(data.posts || []);
  }

  // 发布帖子
  if (act === "createPost") {
    const uid = url.searchParams.get("uid");
    const title = url.searchParams.get("title");
    const content = url.searchParams.get("content");
    const u = data.users.find(i => i.uid == uid);
    if (!u || !title || !content) return new Response("err");
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
    return new Response("ok");
  }

  // 点赞
  if (act === "like") {
    const uid = url.searchParams.get("uid");
    const postId = parseInt(url.searchParams.get("postId"));
    const post = data.posts.find(p => p.postId === postId);
    if (!post) return new Response("err");
    if (!post.liked) post.liked = [];
    if (post.liked.includes(uid)) return new Response("repeat");
    post.like = (post.like || 0) + 1;
    post.liked.push(uid);
    await save(data);
    return new Response("ok");
  }

  // ======================
  // 查看 KV 内容（你要的）
  // ======================
  if (act === "debug") {
    const raw = await env.CHAT_DB.get("chat_data");
    return new Response(JSON.stringify({
      current: data,
      kvRaw: raw
    }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("no");
}
