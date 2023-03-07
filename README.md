# Feishu ChatGPT

> 根据 https://github.com/anota/express-feishu-chatgpt 、 https://github.com/bestony/ChatGPT-Feishu 再次优化

## 本地调试
### `npm` / `pnpm` / `yarn` 安装依赖
1. 建议全局安装`pm2` `pnpm i -g pm2@latest`
2. `processes.json` 修改`APPID` 、 `App Secret` 、 `BOTNAME` 、 `OpenAI API Key`
3. 因为是本地跑服务，飞书是联网工具，所以需要端口转发和内网穿透的工具，建议使用ngrok(https://ngrok.com/download)
4. `pm2 start processes.json` 启动服务，`pm2 logs` 查看日志，pm2命令自行查询，这里用到的就几个(`start`, `stop`, `del`, `logs`)
5. 启动服务后，`status`字段 = `online`，说明服务启动成功, `pm2 logs` 最后一行显示`"Example app listening on port 9000"`
6. 使用`ngrok`命令，`ngrok http 9000`，显示`Session Status: online`，说明启动成功，将 `Forwarding` 的域名复制到浏览器打开，返回配置成功说明域名可用，然后添加到飞书开放平台事件订阅的请求地址里


## 私有服务器部署方式
0. 服务器安装`Nodejs`
1. 建议全局安装`pm2` `pnpm i -g pm2@latest`
2. `processes.json` 修改`APPID` 、 `App Secret` 、 `BOTNAME` 、 `OpenAI API Key`
4. `pm2 start processes.json` 启动服务，`pm2 logs` 查看日志，pm2命令自行查询，这里用到的就几个(`start`, `stop`, `del`, `logs`)
5. 启动服务后，`status`字段 = `online`，说明服务启动成功, `pm2 logs` 最后一行显示`"Example app listening on port 9000"`
6. 使用公网IP+端口，复制`{http://公网IP:端口}`到浏览器打开，返回配置成功，添加到飞书开放平台事件订阅的请求地址里
7. 使用`ngrok`或者`Nginx`端口转发和域名解析都可以，服务器和控制台记得放行出入站端口

## Q&A
1. Axios TLS报错 - (国内服务器已经基本墙了，有条件的自己考虑其它办法)
