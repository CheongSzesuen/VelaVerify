# 卡密验证方法
#### 作者：[JIFENG](https://github.com/jfgege)（[米坛链接](https://www.bandbbs.cn/members/232075/)）
## 原理
在手环中根据环境信息计算出一个足够随机的字符串，作为`设备码`，然后使用`页面1`将`设备码`展示出来（可以使用二维码），根据`设备码`利用算法算出`激活码`，保存下来。用户购买后开发者会返回提前预置的`卡密`，用户根据卡密，在网站中输入`卡密`，网站后端根据存有的预置卡密，确认其是否购买。确认购买再使用后端的另一个`数据库`，检测此卡密是否使用过，如果未使用过，计算出与手环相同的`激活码`，将激活码显示给用户，然后再在`已经使用过的卡密数据库`中加入此使用过的卡密，用户在手环中输入`激活码`，手环确认一致后保存激活状态。
## 如何使用到你的项目
### 使用的平台和工具
- ~~大善人~~CloudFlare
  - Workers
  - KV命名空间
- 热铁盒或类似的部署前端页面的平台。
- NEO的输入法组件
### 使用方法
#### 前端页面
##### 最佳实践
使用自己的域名（可选）+Vercel部署+GitHub私库存放代码（可选）
##### JIFENG方法
JIFENG方法：使用热铁盒（免费）+ CloudFlare Workers + CloudFlare KV命名空间 + Clarity（可选）
###### 1.注册[热铁盒账号并使用网页托管功能](https://host-intro.retiehe.com/)
###### 2.使用ai生成类似此验证项目下的`index.html`
建议加入输入错误卡密需要等待五分钟或者更长时间，防止Worker额度被爆刷。

优先对手机的响应式做优化，大多用户都是用手机的。

###### 3.注册[CloudFlare账号](https://dash.cloudflare.com/)
###### 4.进入Workers和pages部分
###### 5.创建一个Worker

参考本方案文件夹下的`worker.js`，但是需要修改部分内容。

  **1）修改允许访问的域名**
```js
// 处理 OPTIONS 预检请求，设置 CORS 头
function handleOptions(request) {
  const headers = {
    "Access-Control-Allow-Origin": "https://你的域名",           // 修改为你自己要用的域名
    "Access-Control-Allow-Methods": "POST, OPTIONS", // 允许的 HTTP 方法
    "Access-Control-Allow-Headers": "Content-Type",  // 允许的请求头
    "Access-Control-Max-Age": "86400"             // 预检请求缓存时间（24小时）
  };
  return new Response(null, { headers });
}
```
  **2）修改核心算法**
  
worker内的算法要和手环软件内的算法一致，且足够复杂，防止用户根据多个验证结果反推激活码。
###### 7.创建一个KV命名空间
`存储和数据库`，`KV`，`Create Instance`，`输入命名空间的名字，需要你自己能看出来这是干什么的KV`
###### 6.绑定一个KV命名空间到Worker
KV命名空间是用来做`已经使用过的卡密数据库`的，用来防止卡密被重复使用。进入你的worker项目，进入`绑定`，`添加绑定`，`KV命名空间`，`添加绑定`，`变量名称`输入命名空间的名字，建议为默认的KV。如果使用其他名字，看下一行。然后绑定刚才添加的`KV命名空间`。

你可以使用全局替换，把worker代码里面的`env.KV`替换为`env.你绑定的变量名`
###### 7.在前端代码中的位置加入自己的worker。
需要注意目前这个前端代码是JIFENG的项目，你需要修改为自己的风格，但是script可以保持不变。script和后端的js已经对应了。

但是你仍然可以根据自己的项目修改以下的前端代码部分。
1）修改clarity id，用于~~视奸~~，观察用户的点击等，让网站做得更符合人性。
```html
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "修改为自己的clarity id");
</script>
```
2）修改和后端连接的时候的url接口。
`/verify-card`和`/generate-activation-code`需要和worker后端保持一致
```js
// 路由分发：卡密验证接口。需要和前端中的接口的路径一致。
    if (path === "/verify-card" && request.method === "POST") {
      // 激活码生成接口，需要和前端中的接口的路径一致。
      return handleVerifyCard(request, env);
    } else if (path === "/generate-activation-code" && request.method === "POST") {
      // 处理生成激活码请求
      return handleGenerateActivationCode(request);
    }
```
### 注意事项
Worker的额度是免费的，但是有使用次数限制。每天只有十万免费请求，但是这是完全够用的。
## 适用范围
无限制。
