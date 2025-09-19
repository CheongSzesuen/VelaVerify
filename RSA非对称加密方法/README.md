# RSA非对称加密方法
#### 作者：[OrPudding](https://github.com/OrPudding) & [WaiJade](https://github.com/CheongSzesuen)
## 原理
利用**RSA非对称加密**方法，只在手环上保存可以自由分享的公钥，私钥存储在后端（可用CloudFlare Worker）中。用户通过扫描手环显示出来的二维码，自动跳转你的验证网站，并携带用户的设备ID，输入在爱发电购买快应用后自动返回的12位卡密，跳转网站的携带的设备ID会自动填入设备ID栏，在点击验证后验证卡密的哈希值是否存在（购买确认）如果是错误卡密，后端会返回错误，由前端进行禁用验证功能（时间为指数增加），再确认KV明明空间里是否有此卡密，确认是否已经使用过，若使用过同样返回错误，然后由前端禁用固定的30s。未使用过则使用后端对传来的数据（`设备ID:卡密明文`）签名，最后返回数据包，格式如`设备ID:卡密明文:签名数据:快应用包名`，用户复制后在AstroBox插件`Vela快应用验证`输入数据包，插件会根据数据包最后的快应用包名自动发送到对应的应用，手环接收到数据会先保存**原始数据**，使用公钥验证签名合法性，并确认设备ID和手环ID是否对应。后面的验证都会从文件中获取上一次接收到的**原始数据**，然后重新验证。不存储验证状态，保证安全。
## 如何使用到你的项目
### 关键数据部分
#### RSA密钥对
##### 使用在线工具生成
[RSA密钥对生成](https://uutool.cn/rsa-generate/)，选择`2048位`和`PKCS#8`
##### 使用OpenSSL生成
~~传统派这一块~~
```bash
# AI太好用了你知道吗
```
>在测试阶段随意使用密钥对。运用到生产环境的时候**务必保密**。
#### 卡密生成
##### 1.进入`卡密生成Python工具`文件夹
##### 2.编辑数据
```python
# ==================== 配置区 ====================
CARD_COUNT = 8000         # 生成 8000 条卡密
CARD_LENGTH = 12          # 每条卡密 12 位，不要修改这个值
CHARACTERS = string.ascii_uppercase + string.digits  # A-Z 和 0-9
STATUS = False            # 所有状态设为 false（notUsed）
```
>建议根据需要修改`CARD_COUNT`的值，不修改其他，尤其是12位。
##### 3.运行工具
在此目录选择从控制台/命令行打开。此python不需要任何附加库。
```bash
python CardsTool.py
```
然后会输出
```bash
[WaiJade@WaiJade 卡密生成Python工具]$ python '/home/WaiJade/文档/GitHub/VelaVerify-gh/RSA非对称加密方法/卡密生成Python工具/CardsTool.py' 
正在生成卡密...
已生成 8000 条卡密

已导出 JS 文件: cards.js
已导出 CSV 文件: cards.csv
已导出 TXT 文件: cards.txt
已导出纯卡密文件: cards_only.txt

=== 前5条卡密预览 ===
1. 卡密: O9LG58DCE27A | 哈希: bf9c40b23a87421c...
2. 卡密: HRY0EI5W08WS | 哈希: 2cfcfb0a6de06e75...
3. 卡密: 7M1P59NVYKG5 | 哈希: f5c8cedd412a8062...
4. 卡密: WXCYHQHLGJVD | 哈希: 75d07b2c9aa225c1...
5. 卡密: C1DREF6AFH80 | 哈希: d055bf76413a4e5d...

```
##### 4.生成文件说明
运行后会生成文件，此文件夹会变成如下。
```bash
.
├── cards.csv
├── cards.js
├── cards_only.txt
├── CardsTool.py
└── cards.txt
```
- cards.js
这些数据将会在下面的[Worker后端搭建](#验证网站后端)中用到
```js
const cardHashList = [
  "bf9c40b23a87421c5a49553885ab7e033a3415cba2e73365b4898fd72b2252ac",
  "2cfcfb0a6de06e75dc82b38051dfb2834aed58dd9599730b6de098d763ecdfe2",
  "f5c8cedd412a8062b05a9eb8e0a820168bb4a32fb27a775d4a2dc632d919cfcc",
  "75d07b2c9aa225c12a5c646097aab853cc9822f28550e41ed03280b401435d8c",
  "d055bf76413a4e5db267bcec43f5fdfe36f9629fb6e5dadc4c56c0c05b0e5be9"
  ];
```

<div align="center">
	<br>
	<br>
    <picture>
      <source media="(prefers-color-scheme: light)" srcset="/image/cards-review/cards.js/light.png">
      <source media="(prefers-color-scheme: dark)" srcset="/image/cards-review/cards.js/dark.png">
      <img src="/images/cards-review/cards.js/light.png" alt="文件预览图" width="1000">
    </picture>
	<br>
	<br>
</div>

- cards_only.txt
这些数据将会在下面的`爱发电的添加自动随机回复`中用到，将此文件的所有数据复制到框中保存。
```txt
O9LG58DCE27A
HRY0EI5W08WS
7M1P59NVYKG5
WXCYHQHLGJVD
C1DREF6AFH80
```

<div align="center">
	<br>
	<br>
    <picture>
      <source media="(prefers-color-scheme: light)" srcset="/image/cards-review/cards_only.txt/light.png">
      <source media="(prefers-color-scheme: dark)" srcset="/image/cards-review/cards_only.txt/dark.png">
      <img src="/images/cards-review/cards_only.txt/light.png" alt="文件预览图" width="1000">
    </picture>
	<br>
	<br>
</div>

- cards.txt
好像没什么用
```txt
卡密: O9LG58DCE27A
哈希: bf9c40b23a87421c5a49553885ab7e033a3415cba2e73365b4898fd72b2252ac
状态: notUsed
------------------------------------------------------------
卡密: HRY0EI5W08WS
哈希: 2cfcfb0a6de06e75dc82b38051dfb2834aed58dd9599730b6de098d763ecdfe2
状态: notUsed
------------------------------------------------------------
卡密: 7M1P59NVYKG5
哈希: f5c8cedd412a8062b05a9eb8e0a820168bb4a32fb27a775d4a2dc632d919cfcc
状态: notUsed
------------------------------------------------------------
卡密: WXCYHQHLGJVD
哈希: 75d07b2c9aa225c12a5c646097aab853cc9822f28550e41ed03280b401435d8c
状态: notUsed
------------------------------------------------------------
卡密: C1DREF6AFH80
哈希: d055bf76413a4e5db267bcec43f5fdfe36f9629fb6e5dadc4c56c0c05b0e5be9
状态: notUsed
------------------------------------------------------------
```

<div align="center">
	<br>
	<br>
    <picture>
      <source media="(prefers-color-scheme: light)" srcset="/image/cards-review/cards.txt/light.png">
      <source media="(prefers-color-scheme: dark)" srcset="/image/cards-review/cards.txt/dark.png">
      <img src="/images/cards-review/cards.txt/light.png" alt="文件预览图" width="1000">
    </picture>
	<br>
	<br>
</div>

- cards.csv
可以直接用Excel打开（UTF-8，逗号分割）。但是好像用不上。
```csv
﻿卡密,哈希值,使用状态
O9LG58DCE27A,bf9c40b23a87421c5a49553885ab7e033a3415cba2e73365b4898fd72b2252ac,notUsed
HRY0EI5W08WS,2cfcfb0a6de06e75dc82b38051dfb2834aed58dd9599730b6de098d763ecdfe2,notUsed
7M1P59NVYKG5,f5c8cedd412a8062b05a9eb8e0a820168bb4a32fb27a775d4a2dc632d919cfcc,notUsed
WXCYHQHLGJVD,75d07b2c9aa225c12a5c646097aab853cc9822f28550e41ed03280b401435d8c,notUsed
C1DREF6AFH80,d055bf76413a4e5db267bcec43f5fdfe36f9629fb6e5dadc4c56c0c05b0e5be9,notUsed
```

<div align="center">
	<br>
	<br>
    <picture>
      <source media="(prefers-color-scheme: light)" srcset="/image/cards-review/cards.csv/light.png">
      <source media="(prefers-color-scheme: dark)" srcset="/image/cards-review/cards.csv/dark.png">
      <img src="/images/cards-review/cards.csv/light.png" alt="文件预览图" width="1000">
    </picture>
	<br>
	<br>
</div>

![cards.csv用excel打开的样子](/image/cards-review/cards-csv-excel.png)

### 快应用部分
1. 从仓库文件夹`RSA非对称加密方法`中复制`verify.ux`文件到你的项目的pages/verify/中。
2. 在`verify.ux`中填入你自己的公钥。
```js
// 内置公钥
rsaPublicKey: `填入你自己的公钥`,
```
3. 然后根据你原本的首页，修改url跳转页面名称和延迟跳转时间。
```js
// 验证通过后自动跳转到index页面
setTimeout(() => {
  router.replace({ uri: '/pages/index' })
}, 0)
```
>这个0是延迟跳转时间，单位毫秒。默认为0毫秒。实际效果是验证要花不到一秒，所以建议设置为0毫秒。
4.配置项目

1）在`src/manifest.json`中添加页面和功能声明

```json
"features": [
    {"name": "system.router"}
    {"name": "system.file"}
    {"name": "system.prompt"}
    {"name": "system.device"},
    {"name": "system.crypto"},
    {"name": "system.interconnect"},
    {"name": "system.app"} 
],

```
2）加入此页面
```json
"pages/verify":{"component": "verify"},
```
3）权限声明
```json
"permissions": [{"name": "hapjs.permission.DEVICE_INFO"}]
```
5.在发版的时候将文件夹里的`app.ux`替换到你的项目。
### 验证网站前端
我提供[我的验证网站](https://verify.waijade.cn)的代码，我使用的是Vue框架，使用Vue Bits组件库。

### 验证网站后端
#### 1.创建Worker
在Cloudflare的控制台侧栏里打开`计算（Worker）`，点击`创建`，点击`从Hello World开始!`，修改你的worker名称，比如：`veirfy`，然后点击`部署`，点击`编辑代码`，然后把左侧已有的代码全部删除，然后将文件夹里的`worker.js`复制进去。
#### 2.修改`worker.js`数据
##### 1)把刚才生成的`cards.js`的内容替换到这里
```js
// 内置卡密哈希列表（仅存储 SHA-256 哈希值）
const cardHashList = [
//填入你自己的卡密的哈希值列表，格式如下。
  "bf9c40b23a87421c5a49553885ab7e033a3415cba2e73365b4898fd72b2252ac",
  "2cfcfb0a6de06e75dc82b38051dfb2834aed58dd9599730b6de098d763ecdfe2",
  "f5c8cedd412a8062b05a9eb8e0a820168bb4a32fb27a775d4a2dc632d919cfcc",
  "75d07b2c9aa225c12a5c646097aab853cc9822f28550e41ed03280b401435d8c",
  "d055bf76413a4e5db267bcec43f5fdfe36f9629fb6e5dadc4c56c0c05b0e5be9"
];
```
##### 2)把你的前端的域名填在这里
```js
async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '填入你的前端的网址',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
```
包含协议，比如`https://verify.waijade.cn`，开发阶段可以将这里填为`*`，等前端一旦部署完成必须马上改为你前端的网址，防止被爆刷worker。
##### 3)把生成的RSA密钥的密钥部分替换到这里
```js
// RSA 私钥（PEM 格式）
const RSA_PRIVATE_KEY = `填入你自己的私钥`;
```
>包含PEM的头和尾，如：`-----BEGIN PRIVATE KEY-----`和`-----END PRIVATE KEY-----`
#### 3.创建KV存储空间
KV命名空间是用来做`已经使用过的卡密数据库`的，用来防止卡密被重复使用。在侧栏里打开`存储和数据库`右侧的倒三角，点击`KV`，点击`Create Instance`，`输入命名空间的名字`（需要你自己能看出来这是干什么的KV，这个名字无要求）。
#### 4.绑定KV存储空间到Worker
进入你的worker项目，进入`绑定`，`添加绑定`，`KV命名空间`，`添加绑定`，`变量名称`输入`cards_used`。
#### 5.点击部署
### 注意事项
#### 数据格式
- PEM格式的PKCS#8私钥（2048位）
- PEM格式的公钥（2048位）
- RSA-SHA256加密和验证，使用SHA-256作为哈希算法
- 签名输出​​：Base64编码的字符串
#### `app.ux`相关
- Aiot IDE在调试的时候如果`app.ux`已经替换会导致资源占用严重，不知道问题是什么，但是建议在调试的时候把`app.ux`文件恢复到原始内容。发版的时候别忘了替换回来。
- 不直接在页面写interconnect的接口是因为页面有这个接口会导致IDE调试白屏，但是在实机中是正常的。如果你觉得直接写入验证页面比较好，可以不用替换`app.ux`。
#### 页面适配
适配了圆屏、胶囊屏和矩形屏。
![多屏适配图片](/image/multi-screens.png)
> 实际使用可以将打开详情部分以及后面的部分删掉，不影响。
#### `verify.ux`相关
由于便于在没有唯一ID的设备调试，内部有自动回退的部分，在无法获取到ID的时候会用模拟器的固定ID，在应用的时候应该删去退回部分。

#### 手动签名Python工具说明
##### 第一步：修改文件中的密钥对
```python
# 您的私钥和公钥
private_key_pem = """填自己的私钥"""
public_key_pem = """填自己的公钥"""

```
##### 第二步：运行Python工具
进入`手动签名Python工具`的文件夹，把这个文件夹在命令行打开
```bash
# 1. 创建虚拟环境
python -m venv venv

# 2. 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 可能需要的步骤：升级pip
python -m pip install --upgrade pip

# 3. 安装依赖
pip install -r requirements.txt

# 4. 运行工具
python tool.py
```
运行效果如下

示例的`d4cd0dabcf4caa22ad92fab40844c786`这是模拟器的ID，实际内容是NA。
```bash
(venv) [WaiJade@WaiJade verify]$ python '/home/WaiJade/下载/verify/tool.py' 
请输入设备ID（例如：d4cd0dabcf4caa22ad92fab40844c786）：设备ID

设备ID: 设备ID
激活码: 随机6位激活码
签名数据: 设备ID:随机6位激活码
签名结果 (RSA-SHA256): 一串很长的结果
签名长度: 长度
验证结果: 成功
```
发送给用户的数据应该形如`设备ID:随机6位激活码:签名结果`
#### 插件说明
我开发了AstroBox的插件部分，目前不知道安卓开发是否可以完成类似功能，且通用。

[插件开源地址](https://github.com/CheongSzesuen/VelaVerify-AstroBox-Plugin)，现在可以前往AstroBox的插件市场下载插件『Vela快应用验证』，即可使用插件。

![插件界面截图](/image/VelaVerify-Plugin-interface.png)

此插件为通用插件，使用时只需要把网站返回的数据包填入然后发送即可。
## 适用范围
此项目受限于Vela JS接口的密码算法(crypto)、设备信息(device)、设备通信(interconnect)接口。
|设备型号|支持状态|备注|
|---|---|---|
|小米手环10|支持||
|小米手环9 Pro|支持||
|小米手环9|不支持|不支持设备ID查询|
|小米手环8 Pro|不支持|不支持设备ID查询和密码接口|
|小米手环8|不支持|系统不支持|
|小米手环7及更老机型|不支持|非Xiaomi Vela系统|
|小米Watch S4系列|支持||
|小米Watch S3系列|支持||
|小米Watch S2系列及更老机型|不支持|协议版本不支持|
|小米Watch S1 Pro|不支持|密码接口不支持|
|红米Watch5|支持||
|红米Watch4|不支持|密码接口不支持|
|红米手环系列/小米手环Active系列|不支持||

**一些数据可能有错误**，如果你遇到支持情况与表格不一致，请联系我。
## 许可证
MIT License
