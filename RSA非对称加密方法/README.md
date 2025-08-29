# RSA非对称加密方法。
#### 作者：Orpudding & WaiJade
## 原理
利用RSA**非对称加密**方法，只在手环上保存可以自由分享的公钥，用户返回设备唯一ID后由开发者使用工具签名数据，并由AstroBox插件使用interconnect发送签名后的数据，手环接收到数据再使用密码接口验证签名。一次验证成功后，后面的验证都会从文件中获取上一次接收到的**原始数据**，然后重新验证。不存储验证状态，保证安全。
## 如何使用到你的项目
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
//这个0是延迟跳转时间，单位毫秒。默认为0毫秒。实际效果是验证要花不到一秒，所以建议设置为0毫秒。
```
4.在manifest.json中要加入权限
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
加入此页面
```json
"pages/verify":{"component": "verify"},
```
权限声明
```json
"permissions": [{"name": "hapjs.permission.DEVICE_INFO"}]
```
5.在发版的时候需要替换`app.ux`中的内容。
### 注意事项
#### 数据格式
- PEM格式的PKCS#8私钥（2048位）
- PEM格式的公钥（2048位）
- RSA-SHA256加密和验证，使用SHA-256作为哈希算法
- 签名输出​​：Base64编码的字符串
- Aiot IDE在调试的时候如果`app.ux`已经替换会导致资源占用严重，不知道问题是什么，但是建议在调试的时候把`app.ux`文件恢复到原始内容。发版的时候别忘了替换回来。
- 不直接在页面写interconnect的接口是因为页面有这个接口会导致IDE调试白屏，但是在实机中是正常的。如果你觉得直接写入验证页面比较好，可以不用替换`app.ux`。但是要把app页面的内容适配到验证页面。
#### 公私钥生成工具
##### 使用 OpenSSL 命令行生成 RSA 密钥对(比较麻烦)
你需要保证你的设备上有OpenSSL

```bash
自行ai，但要确保格式是上方声明的。
```

##### 使用在线工具生成
[RSA密钥对生成](https://uutool.cn/rsa-generate/)，选择2048位和PKCS#8
#### Python工具说明
进入python工具的文件夹，把这个文件夹在命令行打开
```
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
签名长度: 344
验证结果: 成功
```
发送给用户的数据应该形如`设备ID:随机6位激活码:签名结果`
#### 插件说明
我开发了AstroBox的插件部分，由于安卓开发从来没玩过，放弃软件方式。而且软件需要两边签名相同，所以无法做到通用。
[插件开源地址](https://github.com/CheongSzesuen/VelaVerify-AstroBox-Plugin)，目前AstroBox插件仓库尚未通过我的pr，所以你需要前往release页面下载最新版的abp后缀的文件。将abp拖入AstroBox即可使用插件。

![插件截图](/image/VelaVerify-Plugin-interface.png)

此插件为通用插件，使用时需要在第一行写入你的快应用包名，第二行粘贴数据。

第一行的包名也就是你的项目文件夹`src/manifest.json`的`"package": "moe.waijade.velaverify"`。

第二行需要粘贴开发者签名后的数据，`设备ID:随机6位激活码:签名结果`。然后在手环上打开对应包名的软件，点击发送激活数据。手环会自动保存传来的数据，用于下一次的本地验证。验证通过后会自动跳转你设定的首页。
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