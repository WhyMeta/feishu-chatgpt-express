const lark = require("@larksuiteoapi/node-sdk");
const axios = require("axios");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const port = 9000;
const sqlite3 = require("sqlite3").verbose();
const sqlite = require("sqlite");
const path = require("path"); // 引入路径处理模块
const dbName = path.join(__dirname, "data.db");
const tableName = "t_event";
const MsgTable = "t_msg"

// 如果你不想配置环境变量，或环境变量不生效，则可以把结果填写在每一行最后的 "" 内部
const FEISHU_APP_ID = process.env.APPID || ""; // 飞书的应用 ID
const FEISHU_APP_SECRET = process.env.SECRET || ""; // 飞书的应用的 Secret
const FEISHU_BOTNAME = process.env.BOTNAME || ""; // 飞书机器人的名字
const OPENAI_KEY = process.env.KEY || ""; // OpenAI 的 Key
// const OPENAI_MODEL = process.env.MODEL || "text-davinci-003"; // 使用的模型，是针对一般自然语言处理任务设计的，例如文本生成、文本分类、情感分析、文本补全等
const OPENAI_MODEL = process.env.MODEL || "gpt-3.5-turbo"; // 最有能力的GPT-3.5模型，并为聊天进行了优化，成本是text-davinci-003的1/10。将随着我们最新的模型迭代而更新。
const OPENAI_MAX_TOKEN = process.env.MAX_TOKEN || 1024; // 最大 token 的值

const client = new lark.Client({
  appId: FEISHU_APP_ID,
  appSecret: FEISHU_APP_SECRET,
  disableTokenCache: false,
});

const db = new sqlite3.Database(dbName);

async function createTables() {
  const createMsgTablePromise = new Promise((resolve, reject) => {
    db.run(
      // 创建消息表
      `CREATE TABLE IF NOT EXISTS ${MsgTable}(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        question TEXT,
        answer TEXT,
        msgSize INTEGER
      )`,
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });

  const createEventTablePromise = new Promise((resolve, reject) => {
    db.run(
      // 创建event表
      `CREATE TABLE if not exists ${tableName}(
        id INTEGER PRIMARY KEY,
        event_id VARCHAR (40) NOT NULL,
        content TEXT
      )`,
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });

  await createMsgTablePromise;
  await createEventTablePromise;
}

// 在顶层代码中使用 async 函数包装
(async () => {
  await createTables();
})();

// 日志辅助函数，请贡献者使用此函数打印关键日志
function logger(param) {
  console.debug(`[CF]`, param);
}

// 回复消息
async function reply(messageId, openId, content) {
  try {
    return await client.im.message.reply({
      path: {
        message_id: messageId,
      },
      data: {
        content: JSON.stringify({
          text: `<at user_id="${openId}"></at>` + content,
        }),
        msg_type: "text",
      },
    });
  } catch (e) {
    logger("发送给Lark的消息发生错误", e, messageId, content);
  }
}


// 通过 OpenAI API 获取回复
async function getOpenAIReply(prompt) {

  const completion = ({
    model: OPENAI_MODEL,
    messages: prompt
    });
  // console.log("completion: ====>>>> ", completion);

  const config = {
    method: "POST",
    url: "https://api.openai.com/v1/chat/completions",
    headers: {  Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    data: completion,
    timeout: 50000
  };
  // console.log("config: ====>>>> ", config);

  try{
      const response = await axios(config);
      console.log("response: ", response);
      if (response.status === 429) {
        return '问题太多了，我有点眩晕，请稍后再试';
      }
      // 去除多余的换行
      return response.data.choices[0].message.content.replace("\n\n", "");
    
  }catch(e){
     logger(e)
     return "问题太难了 出错了. (uДu〃).";
  }
}

// 自检函数
function doctor() {
  if (FEISHU_APP_ID === "") {
    return {
      code: 1,
      message: {
        zh_CN: "你没有配置飞书应用的 AppID，请检查 & 部署后重试",
        en_US:
          "Here is no FeiSHu APP id, please check & re-Deploy & call again",
      },
    };
  }
  if (!FEISHU_APP_ID.startsWith("cli_")) {
    return {
      code: 1,
      message: {
        zh_CN:
          "你配置的飞书应用的 AppID 是错误的，请检查后重试。飞书应用的 APPID 以 cli_ 开头。",
        en_US:
          "Your FeiShu App ID is Wrong, Please Check and call again. FeiShu APPID must Start with cli",
      },
    };
  }
  if (FEISHU_APP_SECRET === "") {
    return {
      code: 1,
      message: {
        zh_CN: "你没有配置飞书应用的 Secret，请检查 & 部署后重试",
        en_US:
          "Here is no FeiSHu APP Secret, please check & re-Deploy & call again",
      },
    };
  }

  if (FEISHU_BOTNAME === "") {
    return {
      code: 1,
      message: {
        zh_CN: "你没有配置飞书应用的名称，请检查 & 部署后重试",
        en_US:
          "Here is no FeiSHu APP Name, please check & re-Deploy & call again",
      },
    };
  }

  if (OPENAI_KEY === "") {
    return {
      code: 1,
      message: {
        zh_CN: "你没有配置 OpenAI 的 Key，请检查 & 部署后重试",
        en_US: "Here is no OpenAI Key, please check & re-Deploy & call again",
      },
    };
  }

  if (!OPENAI_KEY.startsWith("sk-")) {
    return {
      code: 1,
      message: {
        zh_CN:
          "你配置的 OpenAI Key 是错误的，请检查后重试。飞书应用的 APPID 以 cli_ 开头。",
        en_US:
          "Your OpenAI Key is Wrong, Please Check and call again. FeiShu APPID must Start with cli",
      },
    };
  }
  return {
    code: 0,
    message: {
      zh_CN:
        "✅ 配置成功，接下来你可以在飞书应用当中使用机器人来完成你的工作。",
      en_US:
        "✅ Configuration is correct, you can use this bot in your FeiShu App",
    },
    meta: {
      FEISHU_APP_ID,
      OPENAI_MODEL,
      OPENAI_MAX_TOKEN,
      FEISHU_BOTNAME,
    },
  };
}

app.use(bodyParser.json());

app.get("/", async (req, resp) => {
  const result = doctor();
  resp.json(result);
});

// 保存用户会话
async function saveConversation(sessionId, question, answer) {
  const msgSize = question.length + answer.length
  const result = await new Promise((resolve, reject) => {
    db.run(`INSERT INTO ${MsgTable}(session_id, question, answer, msgSize) VALUES (?,?,?,?)`, [sessionId, question, answer, msgSize], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  if (result) {
    await discardConversation(sessionId);
  }
}

// 如果历史会话记录大于OPENAI_MAX_TOKEN，则从第一条开始抛弃超过限制的对话
async function discardConversation(sessionId) {
  let totalSize = 0;
  const countList = [];
  const historyMsgs = await new Promise((resolve, reject) => {
    db.all(`SELECT id, msgSize FROM ${MsgTable} WHERE session_id = ?`, [sessionId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
  const historyMsgLen = historyMsgs.length;
  for (let i = 0; i < historyMsgLen; i++) {
    const msgId = historyMsgs[i].id;
    totalSize += historyMsgs[i].msgSize;
    countList.push({
      msgId,
      totalSize,
    });
  }
  for (const c of countList) {
    if (c.totalSize > OPENAI_MAX_TOKEN) {
      db.run(`DELETE FROM ${MsgTable} WHERE id = ?`, [c.msgId])
    }
  }
}

// 清除历史会话
async function clearConversation(sessionId) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM ${MsgTable} WHERE session_id = ?`, [sessionId], function (
      err
    ) {
      if (err) {
        console.error(err.message);
        resolve(false);
      }
      resolve(true);
    });
  });
}

// 指令处理
async function cmdProcess(cmdParams) {
  switch (cmdParams && cmdParams.action) {
    case "/help":
      await cmdHelp(cmdParams.messageId);
      break;
    case "/clear":
      await cmdClear(cmdParams.sessionId, cmdParams.messageId);
      break;
    default:
      await cmdHelp(cmdParams.messageId);
      break;
  }
  return { code: 0 }
}

// 帮助指令
async function cmdHelp(messageId, openId) {
  helpText = `ChatGPT 指令使用指南

Usage:
    /clear    清除上下文
    /help     获取更多帮助
  `
  await reply(messageId, openId, helpText);
}

// 清除记忆指令
async function cmdClear(sessionId, messageId, openId) {
  await clearConversation(sessionId)
  await reply(messageId, openId, "✅记忆已清除");
}

// 根据sessionID构造用户会话
async function buildConversation(sessionId, question) {
  let prompt = [];

  const historyMsgs = await new Promise((resolve, reject) => {
    db.all(`SELECT question, answer FROM ${MsgTable} WHERE session_id = ?`, [sessionId], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
  if (historyMsgs != null) {
    // logger("session ID : ", sessionId)
    for (const conversation of historyMsgs) {
      // prompt.push({ role: "system", content: "You are a helpful assistant." })
      prompt.push({ role: "user", content: conversation.question });
      prompt.push({ role: "assistant", content: conversation.answer });
    }
  }

  // 拼接最新 question
  prompt.push({role: "user", content: question});
  return prompt;  
}


app.post("/", async (req, resp, context) => {
  // console.dir(req);
  let params = req.body;
  if (typeof req.params !== "object") {
    const sJson = JSON.stringify(req.body);
    const jsondata = JSON.parse(sJson);
    const buf = new Buffer.from(jsondata);
    const data = buf.toString();
    if (data) {
      // console.log("jsondata", jsondata);
      const json = JSON.parse(data);
      params = json;
      // console.log("json", json);
    } else {
      params = {};
    }
  }
  // console.log("req", req);
  
  const callback = (msg) => {
    resp.setHeader("Content-Type", "application/json");
    msg.challenge = params.challenge;
    resp.json(msg);
  };

  // 如果存在 encrypt 则说明配置了 encrypt key
  if (params.encrypt) {
    logger("开启配置了encrypt key");
    callback({
      code: 1,
      message: {
        zh_CN: "你配置了 Encrypt Key，请关闭该功能。",
        en_US: "You have open Encrypt Key Feature, please close it.",
      },
    });
    return;
  }
  // 处理飞书开放平台的服务端校验
  if (params.type === "url_verification") {
    logger("URL验证通过");
    callback({
      challenge: params.challenge,
    });
    return;
  }
  // 自检查逻辑
  if (!params.hasOwnProperty("header") || context.trigger === "DEBUG") {
    logger("确认自检");
    callback(doctor());
    return;
  }
  // 处理飞书开放平台的事件回调
  if (params.header.event_type === "im.message.receive_v1") {
    let eventId = params.header.event_id;
    let messageId = params.event.message.message_id;
    let chatId = params.event.message.chat_id;
    let senderId = params.event.sender.sender_id.user_id;
    let sessionId = chatId + senderId;
    let openId = params.event.sender.sender_id.open_id;

    // 对于同一个事件，只处理一次
    const count = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) AS count FROM ${tableName} WHERE event_id = ?`, [eventId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
    if (count !== 0) {
      logger("跳过重复事件");
      return { code: 1 };
    }
    await new Promise((resolve, reject) => {
      db.run(`INSERT INTO ${tableName}(event_id) VALUES (?)`, [eventId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });    

    // 私聊直接回复
    if (params.event.message.chat_type === "p2p") {
      // 不是文本消息，不处理
      if (params.event.message.message_type != "text") {
        await reply(messageId, "暂不支持其他类型的提问");
        logger("GPT-3.5 model 不支持该类型提问");
        callback({ code: 0 });
        return;
      }
      // 是文本消息，直接回复
      const userInput = JSON.parse(params.event.message.content);
      return await handleReply(userInput, sessionId, messageId, openId, eventId);
    };

    // 群聊，需要 @ 机器人
    if (params.event.message.chat_type === "group") {
      // 这是日常群沟通，不用管
      if (
        !params.event.message.mentions ||
        params.event.message.mentions.length === 0
      ) {
        logger("不处理未提及的消息");
        callback({ code: 0 });
        return;
      }
      // 没有 mention 机器人，则退出。
      if (params.event.message.mentions[0].name != FEISHU_BOTNAME) {
        logger("机器人名字未在第一次触发");
        callback({ code: 0 });
        return;
      }
      const userInput = JSON.parse(params.event.message.content);
      return await handleReply(userInput, sessionId, messageId, openId, eventId);
    }
  }

  logger("无其他日志返回");
  callback({ code: 2 });
  return;
});

async function handleReply(userInput, sessionId, messageId, openId, eventId) {
  const question = userInput.text.replace("@_user_1", "");
  logger("question: " + question);
  const action = question.trim();
  if (action.startsWith("/")) {
    return await cmdProcess({ action, sessionId, messageId });
  }
  const prompt = await buildConversation(sessionId, question);
  const openaiResponse = await getOpenAIReply(prompt);
  await saveConversation(sessionId, question, openaiResponse)
  await reply(messageId, openId, openaiResponse);
  
  const evt_record = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM ${tableName} WHERE event_id = ?`, [eventId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
  evt_record.content = userInput.text;
  await new Promise((resolve, reject) => {
    db.run(`UPDATE ${tableName} SET content = ? WHERE event_id = ?`, [evt_record.content, eventId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });    
  return { code: 0 };
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
