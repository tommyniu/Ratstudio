let msgs = [];
const MAX_LEN = 80;

export async function onRequestGet() {
  return new Response(JSON.stringify(msgs), {
    headers: { "Content-Type":"application/json" }
  });
}

export async function onRequestPost({request}) {
  let data = await request.json();
  msgs.push({
    user: data.user || "游客",
    msg: data.msg || ""
  });
  if(msgs.length > MAX_LEN) msgs = msgs.slice(-40);
  return new Response(JSON.stringify({ok:true}));
}
