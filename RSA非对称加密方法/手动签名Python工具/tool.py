# rsa_sign.py
import hashlib
import base64
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256
from Crypto.PublicKey import RSA
import random
import string

# 您的私钥和公钥
private_key_pem = """填自己的私钥"""

public_key_pem = """填自己的公钥"""

def generate_device_id():
    return 'DEV-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def generate_activation_code():
    charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(random.choices(charset, k=6))

def sign_data(data, private_key_pem):
    # 将数据转换为字节
    data_bytes = data.encode('utf-8')
    
    # 创建哈希对象
    hash_obj = SHA256.new(data_bytes)
    
    # 加载私钥
    private_key = RSA.import_key(private_key_pem)
    
    # 创建签名对象
    signer = pkcs1_15.new(private_key)
    
    # 签名
    signature = signer.sign(hash_obj)
    
    # 返回Base64编码的签名
    return base64.b64encode(signature).decode('utf-8')

def verify_signature(data, signature, public_key_pem):
    try:
        # 将数据转换为字节
        data_bytes = data.encode('utf-8')
        
        # 将签名从Base64解码
        signature_bytes = base64.b64decode(signature)
        
        # 创建哈希对象
        hash_obj = SHA256.new(data_bytes)
        
        # 加载公钥
        public_key = RSA.import_key(public_key_pem)
        
        # 创建验证对象
        verifier = pkcs1_15.new(public_key)
        
        # 验证签名
        verifier.verify(hash_obj, signature_bytes)
        return True
    except (ValueError, TypeError):
        return False

# 主流程
def main():
    # 用户输入设备ID
    device_id = input("请输入设备ID（例如：d4cd0dabcf4caa22ad92fab40844c786）：").strip()

    # 简单校验设备ID格式（32位十六进制字符串）
    if len(device_id) != 32 or not all(c in '0123456789abcdefABCDEF' for c in device_id):
        print("❌ 设备ID格式不正确，请输入32位十六进制字符串。")
        return

    # 生成激活码
    activation_code = generate_activation_code()
    
    print(f'\n设备ID: {device_id}')
    print(f'激活码: {activation_code}')
    
    # 构建签名数据
    data_to_sign = f'{device_id}:{activation_code}'
    print(f'签名数据: {data_to_sign}')
    
    # 签名
    signature = sign_data(data_to_sign, private_key_pem)
    print(f'签名结果 (RSA-SHA256): {signature}')
    print(f'签名长度: {len(signature)}')
    
    # 验证
    is_valid = verify_signature(data_to_sign, signature, public_key_pem)
    print(f'验证结果: {"成功" if is_valid else "失败"}')
if __name__ == '__main__':
    main()
