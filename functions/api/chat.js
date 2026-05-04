export async function onRequestGet({ request, env }) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // 初始化数据库
    const getDB = async () => {
      const d = await env.CHAT_DB.get("db");
      return d ? JSON.parse(d) : { users: [], msgs: [], nextUID: 1 };
    };

    const saveDB = async (db) => {
      await env.CHAT_DB.put("db", JSON.stringify(db));
    };

    const db = await getDB();

    // ================= 登录 =================
    if (path === "/api/login") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      const u = db.users.find(x => x.user === user && x.pwd === pwd);
      return new Response(u ? String(u.uid) : "", { headers: cors });
    }

    // ================= 注册 =================
    if (path === "/api/reg") {
      const user = url.searchParams.get("user");
      const pwd = url.searchParams.get("pwd");
      if (db.users.some(x => x.user === user)) {
        return new Response("no", { headers: cors });
      }
      const uid = db.nextUID++;
      db.users.push({ uid, user, pwd });
      await saveDB(db);
      return new Response("ok", { headers: cors });
    }

    // ================= 发送消息 =================
    if (path === "/api/send") {
      const uid = url.searchParams.get("uid");
      const msg = url.searchParams.get("msg");
      const u = db.users.find(x => x.uid == uid);
      if (!u || !msg) return new Response("no", { headers: cors });

      db.msgs.push({
        uid: u.uid,
        user: u.user,
        msg: msg
      });
      await saveDB(db);
      return new Response("ok", { headers: cors });
    }

    // ================= 获取消息 =================
    if (path === "/api/msg") {
      return new Response(JSON.stringify(db.msgs || []), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // ================= 清空（管理员）=================
    if (path === "/api/clear") {
      const admin = db.users.find(x => x.user === "Ratstudio");
      if (!admin) return new Response("no", { headers: cors });
      db.msgs = [];
      await saveDB(db);
      return new Response("ok", { headers: cors });
    }

    // ================= 撤回（管理员）=================
    if (path === "/api/delete") {
      const admin = db.users.find(x => x.user === "Ratstudio");
      if (!admin) return new Response("no", { headers: cors });
      if (db.msgs.length > 0) db.msgs.pop();
      await saveDB(db);
      return new Response("ok", { headers: cors });
    }

    return new Response("ok", { headers: cors });

  } catch (e) {
    return new Response("err", { headers: cors });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
