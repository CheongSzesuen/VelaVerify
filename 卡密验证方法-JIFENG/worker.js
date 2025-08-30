// 定义属性描述符辅助函数
var __defProp = Object.defineProperty;
// 为函数设置名称的辅助函数
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
// 主要的 Worker 处理模块
var index_default = {
  // 处理所有传入的请求
  async fetch(request, env) {
    // 解析请求 URL
    const url = new URL(request.url);
    // 获取请求路径
    const path = url.pathname;
    
    // 处理 OPTIONS 预检请求（CORS）
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }
    
    // 路由分发：卡密验证接口。需要和前端中的接口的路径一致。
    if (path === "/verify-card" && request.method === "POST") {
      // 激活码生成接口，需要和前端中的接口的路径一致。
      return handleVerifyCard(request, env);
    } else if (path === "/generate-activation-code" && request.method === "POST") {
      // 处理生成激活码请求
      return handleGenerateActivationCode(request);
    }
    
    // 404 未找到处理
    return addCorsHeaders(new Response("Not Found", { status: 404 }));
  }
};

// 处理 OPTIONS 预检请求，设置 CORS 头
function handleOptions(request) {
  const headers = {
    "Access-Control-Allow-Origin": "*",           // 修改为你自己要用的域名
    "Access-Control-Allow-Methods": "POST, OPTIONS", // 允许的 HTTP 方法
    "Access-Control-Allow-Headers": "Content-Type",  // 允许的请求头
    "Access-Control-Max-Age": "86400"             // 预检请求缓存时间（24小时）
  };
  return new Response(null, { headers });
}

// 为响应添加 CORS 头的辅助函数
__name(handleOptions, "handleOptions");
function addCorsHeaders(response) {
  console.log("添加 CORS 头到响应");
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
}
__name(addCorsHeaders, "addCorsHeaders");

// 处理卡密验证请求的核心函数
async function handleVerifyCard(request, env) {
  try {
    // 解析请求体中的卡密数据
    const { cardCode } = await request.json();
    
    // 验证卡密是否存在
    if (!cardCode) {
      return addCorsHeaders(new Response(JSON.stringify({ valid: false, message: "卡密不能为空" }), {
        headers: { "Content-Type": "application/json" }
      }));
    }
    
    // 检查每日使用限制
    if (await checkDailyLimit(env)) {
      return addCorsHeaders(new Response(JSON.stringify({ valid: false, message: "今日验证次数已达上限" }), {
        headers: { "Content-Type": "application/json" }
      }));
    }
    
    // 计算卡密的 SHA-256 哈希值
    const cardHash = await calculateSHA256(cardCode);
    // 验证卡密哈希是否有效
    const verifyResult = await verifyCardHash(cardHash, env);
    
    // 如果验证通过，标记卡密为已使用并记录验证次数
    if (verifyResult.valid) {
      await markCardAsUsed(cardHash, env);  // 标记卡密已使用
      await recordVerifyCount(env);         // 记录验证次数
    }
    
    // 返回验证结果
    return addCorsHeaders(new Response(JSON.stringify(verifyResult), {
      headers: { "Content-Type": "application/json" }
    }));
  } catch (error) {
    console.error("验证卡密异常:", error);
    return addCorsHeaders(new Response(JSON.stringify({ valid: false, message: "服务器内部错误" }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    }));
  }
}
__name(handleVerifyCard, "handleVerifyCard");

// 处理生成激活码请求的函数
async function handleGenerateActivationCode(request) {
  try {
    // 解析请求体中的设备码
    const { deviceCode } = await request.json();
    
    // 验证设备码格式（必须是5位数字）
    if (!deviceCode || deviceCode.length !== 5 || !/^\d{5}$/.test(deviceCode)) {
      return addCorsHeaders(new Response(JSON.stringify({ valid: false, message: "设备码格式错误" }), {
        headers: { "Content-Type": "application/json" }
      }));
    }
    
    // 生成激活码
    const { activationCode } = generateCode(deviceCode);
    return addCorsHeaders(new Response(JSON.stringify({ activationCode, valid: true }), {
      headers: { "Content-Type": "application/json" }
    }));
  } catch (error) {
    console.error("生成激活码异常:", error);
    return addCorsHeaders(new Response(JSON.stringify({ valid: false, message: "服务器处理失败，请重试" }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    }));
  }
}
__name(handleGenerateActivationCode, "handleGenerateActivationCode");

// 卡密哈希列表，需要修改为你自己预置的卡密哈希值
var cardHashList = [
  // { hash: "真实卡密哈希值1" },
  // { hash: "真实卡密哈希值2" }
];

// 验证卡密哈希是否有效的函数
async function verifyCardHash(inputHash, env) {
  try {
    // 从 KV 中获取已使用的卡密哈希列表
    const usedHashes = await env.KV.get("usedCardHashes", { type: "json" }) || [];
    
    // 检查卡密是否已被使用
    if (usedHashes.includes(inputHash)) {
      return { valid: false, message: "该卡密已被使用" };
    }
    
    // 在预设列表中查找卡密哈希
    const foundCard = cardHashList.find((card) => card.hash === inputHash);
    if (foundCard) {
      return { valid: true, message: "验证通过" };
    }
    
    // 卡密无效
    return { valid: false, message: "无效卡密" };
  } catch (error) {
    console.error("验证哈希异常:", error);
    return { valid: false, message: "服务器内部错误" };
  }
}
__name(verifyCardHash, "verifyCardHash");

// 标记卡密为已使用的函数
async function markCardAsUsed(cardHash, env) {
  try {
    // 获取已使用的卡密哈希列表
    const usedHashes = await env.KV.get("usedCardHashes", { type: "json" }) || [];
    
    // 如果该卡密未被标记为已使用，则添加到列表中
    if (!usedHashes.includes(cardHash)) {
      usedHashes.push(cardHash);
      await env.KV.put("usedCardHashes", JSON.stringify(usedHashes));
    }
  } catch (error) {
    console.error("标记卡密异常:", error);
  }
}
__name(markCardAsUsed, "markCardAsUsed");

// 检查每日使用限制的函数
async function checkDailyLimit(env) {
  try {
    // 获取当前日期（ISO格式）
    const today = new Date().toISOString().split("T")[0];
    // 获取验证记录
    const verifyRecord = await env.KV.get("verifyRecord", { type: "json" }) || {};
    
    // 检查今日验证次数是否超过限制（10万次）此项不用更改，因为CloudFlare的免费计划每天最多只能调用100000次
    return verifyRecord[today] && verifyRecord[today] >= 100000;
  } catch (error) {
    console.error("检查每日限制异常:", error);
    return false; // 出错时允许继续验证
  }
}
__name(checkDailyLimit, "checkDailyLimit");

// 记录验证次数的函数
async function recordVerifyCount(env) {
  try {
    // 获取当前日期
    const today = new Date().toISOString().split("T")[0];
    // 获取验证记录
    const verifyRecord = await env.KV.get("verifyRecord", { type: "json" }) || {};
    
    // 增加今日验证次数
    verifyRecord[today] = (verifyRecord[today] || 0) + 1;
    await env.KV.put("verifyRecord", JSON.stringify(verifyRecord));
    
    return verifyRecord[today];
  } catch (error) {
    console.error("记录验证次数异常:", error);
    return 0;
  }
}
__name(recordVerifyCount, "recordVerifyCount");

// 生成激活码的核心算法函数
function generateCode(randomNum) {
  // 将输入数字转换为10位字符串，不足补0
  const str = String(randomNum).padStart(10, "0").slice(0, 10);
  // 将字符串分割为数字数组
  const d = str.split("").map(Number);
  
  // 调试信息对象
  const debugInfo = {
    steps: "",
    process: ""
  };

  // TODO: 这里需要实现具体的激活码生成算法，这里必须更改。
  // 示例算法（需要根据实际需求调整）：
  let code = d.reduce((sum, digit, i) => sum + digit * Math.pow(10, 9 - i), 0);
  
  // 确保生成的激活码至少为5位数
  if (code < 10000) {
    code += 10000;
    debugInfo.process += `因code < 10000，故code += 10000，最终code = ${code}`;
  }
  
  return { activationCode: code, debugInfo };
}
__name(generateCode, "generateCode");

// 计算 SHA-256 哈希值的函数
async function calculateSHA256(message) {
  // 创建文本编码器
  const encoder = new TextEncoder();
  // 将消息编码为字节数组
  const data = encoder.encode(message);
  // 计算 SHA-256 哈希
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  // 将哈希缓冲区转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
__name(calculateSHA256, "calculateSHA256");

// 导出默认模块
export {
  index_default as default
};
//# sourceMappingURL=index.js.map