export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const act = url.searchParams.get("act");

  async function getData() {
    const data = await env.CHAT_DB.get("chat_data");
    return data ? JSON.parse(data) : { 
      users: [], 
      msgs: [], 
      nextUID: 2,
      posts: [],
      nextPostId: 1
    };
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
    return new Response(u ? u.uid.toString() : "");
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

  // 清空消息
  if (act === "clear") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = data.users.find(x => x.uid === uid && x.user === "Ratstudio");
    if (!admin) return new Response("no");
    data.msgs = [];
    await save(data);
    return new Response("ok");
  }

  // 撤回最后一条
  if (act === "delete") {
    const uid = parseInt(url.searchParams.get("uid") || 0);
    const admin = data.users.find(x => x.uid === uid && x.user === "Ratstudio");
    if (!admin) return new Response("no");
    if(data.msgs.length) data.msgs.pop();
    await save(data);
    return new Response("ok");
  }

  // ========== 论坛接口 补全 ==========
  // 获取所有帖子
  if (act === "posts") {
    return Response.json(data.posts || []);
  }

  // 发布帖子
  if (act === "createPost") {
    const uid = url.searchParams.get("uid");
    const user = data.users.find(u => u.uid == uid);
    const title = url.searchParams.get("title");
    const content = url.searchParams.get("content");
    if(!user || !title || !content) return new Response("err");

    const newPost = {
      postId: data.nextPostId++,
      uid: user.uid,
      user: user.user,
      title,
      content,
      time: new Date().toLocaleString(),
      like: 0,
      liked: []
    };
    data.posts.push(newPost);
    await save(data);
    return new Response("ok");
  }

  // 点赞
  if (act === "like") {
    const uid = url.searchParams.get("uid");
    const postId = parseInt(url.searchParams.get("postId"));
    const p = data.posts.find(x => x.postId === postId);
    if(!p) return new Response("err");

    if(p.liked.includes(uid)){
      return new Response("repeat");
    }
    p.like++;
    p.liked.push(uid);
    await save(data);
    return new Response("ok");
  }

  return new Response("no");
}
