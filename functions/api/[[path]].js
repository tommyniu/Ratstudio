export async function onRequestGet({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const ADMIN_UIDS = [1];

  try {
    const url = new URL(request.url);
    const act = url.searchParams.get("act");
    const uid = url.searchParams.get("uid");
    const title = url.searchParams.get("title");
    const content = url.searchParams.get("content");

    let db = await env.CHAT_DB.get("db").then(r=>r?JSON.parse(r):{
      users:[],msgs:[],nextUID:3,posts:[],postIdCounter:1
    });

    if(!db.posts) db.posts = [];
    if(!db.postIdCounter) db.postIdCounter = 1;

    let admin = db.users.find(u => u.user === "Ratstudio");
    if(!admin) db.users.unshift({uid:1,user:"Ratstudio",pwd:"LTC505666"});
    else admin.uid = 1;

    // ==============================
    // ✅ 发帖时间 → 固定北京时间，不偏移
    // ==============================
    if (act === "createPost") {
      const userObj = db.users.find(u => u.uid == uid);
      if(!userObj) return new Response("error", {headers:corsHeaders});
      if(!title || !content) return new Response("error", {headers:corsHeaders});

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const second = String(now.getSeconds()).padStart(2, '0');
      const time = `${year}/${month}/${day} ${hour}:${minute}:${second}`;

      db.posts.push({
        postId: db.postIdCounter++,
        uid: Number(uid),
        user: userObj.user,
        title,
        content,
        time,
        like: 0
      });

      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (act === "posts") {
      return new Response(JSON.stringify(db.posts), {
        headers: { ...corsHeaders, "Content-Type":"application/json" }
      });
    }

    if (act === "like") {
      const postId = url.searchParams.get("postId");
      const p = db.posts.find(x=>x.postId==postId);
      if(p) p.like++;
      await env.CHAT_DB.put("db", JSON.stringify(db));
      return new Response("ok", { headers: corsHeaders });
    }

    if (url.pathname === "/api/login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const f = db.users.find(x=>x.user===user&&x.pwd===pwd);
      return new Response(f?String(f.uid):"",{headers:corsHeaders});
    }

    if (url.pathname === "/api/reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if(db.users.some(x=>x.user===user)) return new Response("no",{headers:corsHeaders});
      db.users.push({uid:db.nextUID++,user,pwd});
      await env.CHAT_DB.put("db",JSON.stringify(db));
      return new Response("ok",{headers:corsHeaders});
    }

    if (url.pathname === "/api/send") {
      const msg = url.searchParams.get("msg");
      const u = db.users.find(x=>x.uid==uid);
      if(!u) return new Response("no",{headers:corsHeaders});
      db.msgs.push({uid:u.uid,user:u.user,msg,isAdmin:ADMIN_UIDS.includes(Number(uid))});
      await env.CHAT_DB.put("db",JSON.stringify(db));
      return new Response("ok",{headers:corsHeaders});
    }

    if (url.pathname === "/api/msg") {
      return new Response(JSON.stringify(db.msgs||[]),{
        headers:{...corsHeaders,"Content-Type":"application/json"}
      });
    }

    if (url.pathname === "/api/clear") {
      if(!ADMIN_UIDS.includes(Number(uid))) return new Response("no",{headers:corsHeaders});
      db.msgs = [];
      await env.CHAT_DB.put("db",JSON.stringify(db));
      return new Response("ok",{headers:corsHeaders});
    }

    return new Response("ok",{headers:corsHeaders});

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
