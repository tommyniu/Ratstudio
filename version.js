// 版本配置中心 —— 只在这里修改，全站自动同步
const VERSION_CONFIG = {
  current: "V1.3.4",          // 当前最新版本
  date: "2026.5.4",          // 版本日期
  history: [
    { ver: "V1.3.4", desc: "修复论坛发帖问题，接口统一兼容，稳定性优化", date: "2026.5.4" },
    { ver: "V1.3.3", desc: "多管理员 UID 支持，管理员标签自动识别", date: "2026.5.4" },
    { ver: "V1.3.2", desc: "正式新增完整论坛功能，包含发帖、列表、详情、点赞", date: "2026.5.3" },
    { ver: "V1.3.1", desc: "重制版添加新页面，修复BUG，稳定性优化", date: "2026.5.3" },
    { ver: "V1.3.0", desc: "全部转移，基于cloudflare重新开发", date: "2026.5.3" },
    { ver: "V1.2.3", desc: "新增开发规划页面，全菜单统一", date: "未知" },
    { ver: "V1.2.2", desc: "全页面UI统一，修复头像/UID布局，滚动优化", date: "未知" },
    { ver: "V1.2.1", desc: "修复消息显示、清空功能、数据持久化", date: "未知" },
    { ver: "V1.2.0", desc: "新增论坛系统、发帖按钮、点赞功能、三页面独立切换", date: "未知" },
    { ver: "V1.1.4", desc: "管理员标识、清空消息", date: "未知" },
    { ver: "V1.1.3", desc: "自动登录、圆角统一", date: "未知" },
    { ver: "V1.0.1~V1.1.2", desc: "完善UI、修复布局、独立日志页面", date: "未知" },
    { ver: "V1.0.0", desc: "基础聊天、注册登录系统", date: "2026.4.1" }
  ]
};

// 自动给所有页面设置版本号
window.onload = function () {
  let versionElements = document.querySelectorAll(".version-text");
  versionElements.forEach(el => {
    el.innerText = VERSION_CONFIG.current;
  });
};
