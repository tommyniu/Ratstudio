const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static('public'));

const db = { users: [], posts: [], comments: [] };
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
if (!fs.existsSync('./db.json')) fs.writeFileSync('./db.json', JSON.stringify(db));
Object.assign(db, JSON.parse(fs.readFileSync('./db.json', 'utf8')));

function saveDB() { fs.writeFileSync('./db.json', JSON.stringify(db, null, 2)); }
function genUID() { return Date.now().toString().slice(-6); }
function nowTime() { return new Date().toLocaleString(); }

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, './uploads'),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('img'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

app.get('/api/reg', (req, res) => {
  const { user, pwd } = req.query;
  if (db.users.find(u => u.user === user)) return res.send('exists');
  const uid = genUID();
  db.users.push({ user, pwd, uid });
  saveDB();
  res.send(`uid:${uid}`);
});

app.get('/api/login', (req, res) => {
  const { user, pwd } = req.query;
  const u = db.users.find(x => x.user === user && x.pwd === pwd);
  res.send(u ? u.uid : 'fail');
});

app.get('/api', (req, res) => {
  const { act, uid, postId, cid } = req.query;

  if (act === 'posts') return res.json(db.posts);
  if (act === 'comments') return res.json(db.comments);

  if (act === 'createPost') {
    const { title, content, imgs } = req.query;
    const user = db.users.find(u => u.uid === uid)?.user || '匿名';
    db.posts.push({
      postId: Date.now(), uid, user,
      title: decodeURIComponent(title),
      content: decodeURIComponent(content),
      imgs: decodeURIComponent(imgs),
      time: nowTime(), like: 0, top: 0, good: 0
    });
    saveDB();
    return res.send('ok');
  }

  if (act === 'deletePost') {
    db.posts = db.posts.filter(p => p.postId != postId);
    db.comments = db.comments.filter(c => c.postId != postId);
    saveDB();
    return res.send('ok');
  }

  if (act === 'like') {
    const p = db.posts.find(x => x.postId == postId);
    if (p) p.like++;
    saveDB();
    return res.send('ok');
  }

  if (act === 'createComment') {
    const { postId, text } = req.query;
    const user = db.users.find(u => u.uid === uid)?.user || '匿名';
    db.comments.push({
      cid: Date.now(), postId, uid, user,
      text: decodeURIComponent(text),
      time: nowTime(), like: 0
    });
    saveDB();
    return res.send('ok');
  }

  if (act === 'deleteComment') {
    db.comments = db.comments.filter(x => x.cid != cid);
    saveDB();
    return res.send('ok');
  }

  if (act === 'likeComment') {
    const c = db.comments.find(x => x.cid == cid);
    if (c) c.like++;
    saveDB();
    return res.send('ok');
  }

  res.send('ok');
});

app.get('/api/msg', (_, res) => res.json([]));
app.get('/api/send', (_, res) => res.send('ok'));

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
