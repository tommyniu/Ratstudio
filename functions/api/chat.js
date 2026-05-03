import fs from 'fs';
import path from 'path';

const DATA = path.join(process.cwd(), 'data.json');

// 读取文件
function read() {
  try {
    return JSON.parse(fs.readFileSync(DATA, 'utf8'));
  } catch(e) {
    return {users:[], msgs:[]};
  }
}

// 写入文件
function write(d) {
  fs.writeFileSync(DATA, JSON.stringify(d, null, 2));
}

// 用户 / 消息接口
export async function onRequestGet({request}) {
  let url = new URL(request.url);
  let act = url.searchParams.get('act');
  let d = read();

  // 登录
  if(act === 'login'){
    let user = url.searchParams.get('user');
    let pwd = url.searchParams.get('pwd');
    let ok = d.users.some(u=>u.user===user&&u.pwd===pwd);
    return Response.json({ok});
  }

  // 注册
  if(act === 'reg'){
    let user = url.searchParams.get('user');
    let pwd = url.searchParams.get('pwd');
    if(d.users.some(u=>u.user===user)) return Response.json({ok:false});
    d.users.push({user,pwd});
    write(d);
    return Response.json({ok:true});
  }

  // 消息列表
  if(act === 'list'){
    return Response.json(d.msgs.slice(-60));
  }

  // 发消息
  if(act === 'send'){
    let user = url.searchParams.get('user');
    let msg = url.searchParams.get('msg');
    d.msgs.push({user,msg,time:new Date().toLocaleString()});
    if(d.msgs.length>120) d.msgs = d.msgs.slice(-60);
    write(d);
    return Response.json({ok:true});
  }

  return Response.json({ok:false});
}
