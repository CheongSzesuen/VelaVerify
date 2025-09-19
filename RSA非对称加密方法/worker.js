// 内置卡密哈希列表（仅存储 SHA-256 哈希值）
const cardHashList = [
//填入你自己的卡密的哈希值列表，格式如下。
  "bf9c40b23a87421c5a49553885ab7e033a3415cba2e73365b4898fd72b2252ac",
  "2cfcfb0a6de06e75dc82b38051dfb2834aed58dd9599730b6de098d763ecdfe2",
  "f5c8cedd412a8062b05a9eb8e0a820168bb4a32fb27a775d4a2dc632d919cfcc",
  "75d07b2c9aa225c12a5c646097aab853cc9822f28550e41ed03280b401435d8c",
  "d055bf76413a4e5db267bcec43f5fdfe36f9629fb6e5dadc4c56c0c05b0e5be9"
];
// RSA 私钥（PEM 格式）
const RSA_PRIVATE_KEY = `填入你自己的私钥`;

// KV 命名空间（确保在 Cloudflare Workers Dashboard 中绑定变量名为 cards_used 的命名空间）
const CARDS_USED = cards_used;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '填入你的前端的域名',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: '请使用 POST 方法请求',
      code: 405
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { mode, cardText, cardHash, deviceId } = body;

    // 模式一：验证卡密（Step 1）—— 仅需 cardText 和 cardHash
    if (mode === 'verify-card') {
      if (!cardText || !cardHash) {
        return new Response(JSON.stringify({
          error: '缺少必要参数：cardText 或 cardHash',
          code: 400
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 检查卡密是否在允许列表中
      const isValidCard = cardHashList.includes(cardHash);

      if (!isValidCard) {
        // 卡密无效：返回锁定时间（指数退避由前端控制，这里只标记）
        return new Response(JSON.stringify({
          error: '卡密无效或未授权',
          code: 403,
          lockSeconds: 0,           // 不锁定服务端，前端根据失败次数计算
          isCardInvalid: true,      // 卡密不存在
          isCardUsed: false         // 不是已使用
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 检查是否已被使用（KV 查询）
      const usedRecord = await CARDS_USED.get(cardText);
      if (usedRecord !== null) {
        // 卡密已使用
        return new Response(JSON.stringify({
          error: '该卡密已被使用过',
          code: 409,
          lockSeconds: 30,          // 固定锁定30秒
          isCardInvalid: false,
          isCardUsed: true           // 关键标识：卡密已用
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 验证通过，返回成功（无需签名）
      return new Response(JSON.stringify({
        success: true,
        message: '卡密验证通过，可继续输入设备ID',
        cardHash: cardHash
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 模式二：生成签名（Step 2）—— 需要 cardText 和 deviceId
    if (mode === 'generate-signature') {
      if (!cardText || !deviceId) {
        return new Response(JSON.stringify({
          error: '缺少必要参数：cardText 或 deviceId',
          code: 400
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 校验设备ID格式（32位十六进制）
      if (!/^[0-9a-fA-F]{32}$/.test(deviceId)) {
        return new Response(JSON.stringify({
          error: '设备ID格式不正确，请输入32位十六进制字符串',
          code: 400
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 构建待签名字符串：卡密原文:设备ID
      const dataToSign = `${deviceId}:${cardText}`;

      // 签名
      const signature = await signData(dataToSign);

      // 最终数据包格式：设备ID:卡密原文:签名:包名
      const resultPacket = `${deviceId}:${cardText}:${signature}:cn.waijade.fishing`;

      // 🔒 计算卡密的 SHA-256 哈希值（用于存储和双重校验）
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(cardText));
      const cardHashForStorage = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // 双重校验：前端传入的 cardHash 是否等于内置的哈希值
      if (cardHash !== cardHashForStorage) {
        return new Response(JSON.stringify({
          error: '前端提供的卡密哈希与计算值不匹配，可能被篡改',
          code: 400
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const now = new Date();
      const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 加8小时
      const timestamp = beijingTime.toISOString().replace(/\.\d{3}Z$/, '+08:00'); // 替换 Z 为 +08:00
      // 关键修改：使用原始卡密作为 KV 键名，值为包含哈希、时间、激活码的对象
      const record = {
        cardHash: cardHashForStorage,     // 存储哈希值
        timestamp: new Date().toISOString(), // 激活时间
        resultPacket: resultPacket        // 最终数据包
      };

      // 写入 KV：键 = cardText（原始卡密），值 = JSON 字符串
      await CARDS_USED.put(cardText, JSON.stringify(record));

      // 返回成功响应
      return new Response(JSON.stringify({
        success: true,
        resultPacket: resultPacket,
        dataToSign: dataToSign,
        cardHash: cardHashForStorage,
        signatureLength: signature.length,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 未知模式
    return new Response(JSON.stringify({
      error: '无效的 mode 参数。请使用 "verify-card" 或 "generate-signature"',
      code: 400
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Worker 错误:', error);
    return new Response(JSON.stringify({
      error: '处理请求时出错: ' + error.message,
      code: 500
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 使用RSA-SHA256签名数据
async function signData(data) {
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(RSA_PRIVATE_KEY),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" }
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(data)
  );

  return arrayBufferToBase64(signature);
}

// PEM转ArrayBuffer
function pemToArrayBuffer(pem) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.replace(pemHeader, "").replace(pemFooter, "").replace(/\s+/g, '');
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// ArrayBuffer转Base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
