// 版本配置中心 —— 只在这里修改，全站自动同步
const VERSION_CONFIG = {
  current: "V1.4.0",
  date: "2026.5.4",
  history: [
    { ver: "V1.4.0", desc: "全新升级新版UI界面，修复了各类布局与功能BUG", date: "2026.5.4" },
    { ver: "V1.3.4", desc: "修复论坛发布功能，自动版本同步，解决发帖报错问题", date: "2026.5.4" },
    { ver: "V1.3.3", desc: "多管理员 UID 支持，管理员标签自动识别，优化权限判断", date: "2026.5.4" },
    { ver: "V1.3.2", desc: "正式新增完整论坛功能，包含发帖、列表、详情、点赞，完善论坛交互逻辑", date: "2026.5.3" },
    { ver: "V1.3.1", desc: "重制版添加新页面，修复BUG，稳定性优化，统一页面跳转逻辑", date: "2026.5.3" },
    { ver: "V1.3.0", desc: "全部转移，基于cloudflare重新开发，重构后端接口，提升运行稳定性", date: "2026.5.3" },
    { ver: "V1.2.3", desc: "新增开发规划页面，全菜单统一，优化页面导航跳转体验", date: "未知" },
    { ver: "V1.2.2", desc: "全页面UI统一，修复头像/UID布局，滚动优化，统一圆角和配色风格", date: "未知" },
    { ver: "V1.2.1", desc: "修复消息显示、清空功能、数据持久化，确保聊天记录不丢失", date: "未知" },
    { ver: "V1.2.0", desc: "新增论坛系统、发帖按钮、点赞功能、三页面独立切换，完善页面交互", date: "未知" },
    { ver: "V1.1.4", desc: "管理员标识、清空消息，添加管理员专属操作权限", date: "未知" },
    { ver: "V1.1.3", desc: "自动登录、圆角统一，优化登录体验，统一全站圆角样式", date: "未知" },
    { ver: "V1.0.1~V1.1.2", desc: "完善UI、修复布局、独立日志页面，逐步优化页面细节和交互体验", date: "未知" },
    { ver: "V1.0.0", desc: "基础聊天、注册登录系统，搭建网站基础框架，实现核心登录聊天功能", date: "2026.4.1" }
  ]
};

// 自动加载版本 + 日志（不修改任何渲染逻辑，确保所有简介完整显示）
document.addEventListener('DOMContentLoaded', function () {
  // 自动更新所有页面版本号
  document.querySelectorAll('.version-text').forEach(el => {
    el.innerText = VERSION_CONFIG.current;
  });

  // 自动渲染更新日志（完整显示所有简介，不截断、不删减）
  const logContainer = document.getElementById('historyList');
  if (logContainer) {
    let html = '';
    VERSION_CONFIG.history.forEach(item => {
      html += `
      <div class="item-log">
        <span class="ver">${item.ver}</span> ${item.desc}
        <span class="date">${item.date}</span>
      </div>`;
    });
    logContainer.innerHTML = html;
  }
});
