# 技刊 TechMag · 上手与测试检验指南

> 给第一次拿到这个项目的人。照着做，15 分钟内能从零跑起来，并逐项验证每个功能。
>
> 项目分两部分：**前端**（`blog2/`）和**后端**（`techmag-api/`），是两个独立的目录、各自有 `package.json`。

---

## 一、环境准备（一次性）

| 工具 | 要求 | 怎么查 |
|---|---|---|
| Node.js | **18 以上**（推荐 20 LTS） | `node -v` |
| MongoDB | 本地 `127.0.0.1:27017`，或 Atlas 连接串 | `mongod --version` |
| npm | 随 Node 自带 | `npm -v` |

⚠️ **MongoDB 最容易卡住新手**：后端必须连得上数据库才能启动。`MONGODB_URI` 默认指向本机 `127.0.0.1:27017`。
- 本机没装 Mongo：装一个社区版并启动 `mongod`，或者去 MongoDB Atlas 免费申请一个连接串，填进后端的 `.env`。
- 不确定连没连上：后端启动日志里 `db: connected` 才是真通了。

⚠️ **Node 版本低于 18，前端会直接崩溃**：Vite 6 要求 Node `>=18`。如果终端里是 Node 16，起前端会报
`crypto$2.getRandomValues is not a function`——因为 Node 16 的 `globalThis.crypto.getRandomValues` 不存在（Node 19+ 才有）。
- 先查：`node -v`。若是 `v16.x`，必须切到 18 以上。
- 切换方法（本机已带受管 Node 22）：
  - **Git Bash / WSL**：`export PATH="/c/Users/shensicheng/.workbuddy-ai/binaries/node/versions/22.22.2-6:$PATH"`
  - **PowerShell**：`$env:PATH = "C:\Users\shensicheng\.workbuddy-ai\binaries\node\versions\22.22.2-6;" + $env:PATH`
  - 若装了 nvm：直接 `nvm use`（仓库根目录已放 `.nvmrc`，内容为 `22`）。
- 后端对 Node 版本不挑，16 也能跑；只有**前端**受这条限制。

---

## 二、启动后端（`techmag-api/`）

```bash
cd techmag-api
npm install                # 装依赖（第一次较慢）
cp .env.example .env       # 如果没有 .env（.env 已被 git 忽略，不入库）
npm run dev                # 启动，默认 8080 端口（端口在 .env 里用 PORT 改）
```

启动后再开一个终端，初始化**演示数据**（文章、专栏、一个作者账号）：

```bash
npm run seed
```

验证后端活着：

```bash
curl http://127.0.0.1:8080/api/v1/health
# 期望：{"code":0,"message":"ok","data":{"status":"ok","db":"connected",...}}
```

`db` 字段必须是 `connected`，不是它说明数据库没连上，前端会一直降级。

---

## 三、启动前端（`blog2/`）

```bash
cd blog2
npm install
cp .env.example .env       # 端口配置在这里（VITE_API_PORT=8080）
npm run dev                # 启动，默认 5173 端口
```

打开浏览器访问 **http://127.0.0.1:5173**（注意是 `127.0.0.1`，不是 `localhost`，原因见下方「常见问题」）。

看到一页**米白纸质感的杂志风博客**首页，就算前后端对接成功了。

---

## 四、前后端是怎么接上的（新手必读，否则排错会懵）

前端代码里**没有任何跨域配置**，也不写后端地址。原因是开发时用 **Vite 代理**：

- 前端请求 `/api/v1/...`
- Vite 把这些请求**偷偷转发**到后端端口（见 `vite.config.ts` 的 `proxy`，默认 `http://127.0.0.1:8080`）
- 这对浏览器来说是「同源」的，所以没有 CORS 问题
- 封面图路径 `/uploads/covers/...` **也要代理**，否则图片 404 走降级占位

> 一句话：**你只需要保证后端、前端都跑着，剩下的代理帮你搞定。**

### 端口在哪里改（两个地方，必须一致）

| 位置 | 变量 | 默认值 |
|---|---|---|
| `techmag-api/.env` | `PORT` | `8080` |
| `blog2/.env` | `VITE_API_PORT` | `8080` |

**两边必须一样。** 不一致时的症状很有迷惑性：页面能开、样式正常，但所有接口都失败，
控制台刷 `http proxy error: connect ECONNREFUSED 127.0.0.1:<端口>`——看起来像"后端挂了"，
其实是代理在打一个没人监听的端口。改端口时两边一起改。

---

## 五、功能验收清单（逐项点一遍）

打开 http://127.0.0.1:5173，对照检查：

- [ ] **首页**：顶部刊头 + 一篇精选大图 + 专栏条 + 文章卡片流
- [ ] **文章详情**：点任意卡片进详情，正文 Markdown 渲染正常（标题、代码块、引用）
- [ ] **注册**：点「注册」，填用户名/邮箱/密码，提交后自动登录
- [ ] **登录/登出**：用下面这个**已建好的作者账号**可直接登录
- [ ] **写文章**：作者登录后右上角出现「写稿」→ 编辑器能写、能传封面、能发布 → 回首页能看到新文章
- [ ] **搜索**：点导航栏的放大镜 → 进 `/search` → 输入关键词（如 `CSS`、`字体`）→ 实时出结果
- [ ] **加载更多**：首页滚到底点「加载更多」，文章追加
- [ ] **优雅降级**：**停掉后端**，刷新前端 → 页面不白屏，显示本地演示数据 + 提示（验证「后端挂了也不崩」）

> 测试用作者账号（执行过 `npm run seed` 后可用）：
> 邮箱 `editor@techmag.dev`，密码 `Techmag@2025`，角色 author。

---

## 六、自动化测试（给会敲命令的人）

后端有一套接口验收测试，覆盖认证、权限、上传、分页、搜索等：

```bash
cd techmag-api
npm run test:api        # 期望：通过 60 项，失败 0 项
npm run audit:messages  # 校验所有表单错误文案都是中文（期望 0 处英文）
```

前端目前**没有自动化测试**（这是已知短板，见末节）。

---

## 七、常见问题排查

| 现象 | 原因 | 解决 |
|---|---|---|
| 前端白屏，控制台 `Failed to load module` | 直接用 `file://` 双击打开，或用了 Live Server | 必须用 `npm run dev` 或 `npm run preview` |
| 文章列表一直显示「本地演示数据」 | 后端没起，或没连上 Mongo | 先 `curl /health` 看 `db` 是不是 `connected` |
| CORS 报错（跨域） | 用 `localhost:5173` 打开，但代理/配置按 `127.0.0.1` | **统一用 `127.0.0.1:5173` 打开页面** |
| `EADDRINUSE` 端口被占 | 5173 或 8080 已有进程 | 关掉旧进程，或 Vite 会自动换到 5174 |
| 前端起不来：`crypto$2.getRandomValues is not a function` | 终端 Node 是 16（Vite 6 要 18+） | `node -v` 确认；按「环境准备」切到 18+ |
| 前端能开但所有接口 404 / 一直降级 | 代理打的端口和后端实际监听的端口不一致 | 两边端口改成一样：`techmag-api/.env` 的 `PORT` 与 `blog2/.env` 的 `VITE_API_PORT` |
| 封面图裂开变占位 | 没执行 `npm run seed`，或上传目录无写权限 | 执行 seed；检查后端 `uploads/` 目录可写 |

---

## 八、项目完成度与已知问题（给想改代码的人）

**完成度**：功能层面已闭环——首页、详情、注册/登录/登出、编辑器、上传、搜索、分页、归档、错误降级全部可用；后端带 60 项接口测试 + 中文文案审计；配套《学习手册》24 章。

**已知待修（不影响运行，但体验上有瑕疵）**：

1. **首页返回丢位置**：在首页翻了几页「加载更多」再点进文章，点浏览器后退会回到顶部——因为首页每次挂载都从第 1 页重新拉数据，没缓存列表进度。（修法：模块级缓存或 `<KeepAlive>`）
2. **前端无自动化测试**：后端有 60 项、前端 0 项，不对称。三个纯函数模块（`utils/markdown.ts`、`api/adapters.ts`、`composables/useSearch.ts`）最适合先补。
3. **搜索用正则匹配**：数据量小没问题；量大要换成 MongoDB text index 或 ES + 中文分词（后端 `article.service.js` 注释里已标注这条）。

> 以上都不影响「本地能跑、能演示」，属于锦上添花，按优先级往后排即可。
