import hashlib
import random
import string
import csv

# ==================== 配置区 ====================
CARD_COUNT = 8000         # 生成 8000 条卡密
CARD_LENGTH = 12          # 每条卡密 12 位
CHARACTERS = string.ascii_uppercase + string.digits  # A-Z 和 0-9
STATUS = False            # 所有状态设为 false（notUsed）

# ==================== 生成卡密列表 ====================
cards = []
print("正在生成卡密...")

for _ in range(CARD_COUNT):
    card = ''.join(random.choice(CHARACTERS) for _ in range(CARD_LENGTH))
    hash_value = hashlib.sha256(card.encode('utf-8')).hexdigest()
    cards.append({
        'card': card,
        'hash': hash_value,
        'Used': STATUS
    })

print(f"已生成 {len(cards)} 条卡密\n")

# ==================== 导出 JS 文件（前端使用）—— 纯哈希值数组 =====================
js_filename = "cards.js"
with open(js_filename, 'w', encoding='utf-8') as f:
    f.write("// 内置卡密哈希列表（仅存储 SHA-256 哈希值）\n")
    f.write("const cardHashList = [\n")
    
    for i, card in enumerate(cards):
        comma = "," if i < len(cards) - 1 else ""  # 最后一项不加逗号
        f.write(f'  "{card["hash"]}"{comma}\n')  # 只写哈希字符串，无对象，无 Used
    
    f.write("];\n")

print(f"已导出 JS 文件: {js_filename}")

# ==================== 导出 CSV 文件（管理员备份）====================
csv_filename = "cards.csv"
with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.writer(f)
    writer.writerow(["卡密", "哈希值", "使用状态"])
    for card in cards:
        status_str = "已使用" if card['Used'] else "notUsed"
        writer.writerow([card['card'], card['hash'], status_str])

print(f"已导出 CSV 文件: {csv_filename}")

# ==================== 导出 TXT 文件（人工查看）====================
txt_filename = "cards.txt"
with open(txt_filename, 'w', encoding='utf-8') as f:
    for card in cards:
        status_str = "已使用" if card['Used'] else "notUsed"
        f.write(f"卡密: {card['card']}\n")
        f.write(f"哈希: {card['hash']}\n")
        f.write(f"状态: {status_str}\n")
        f.write("-" * 60 + "\n")

print(f"已导出 TXT 文件: {txt_filename}")

# ==================== 新增：导出纯卡密列表（一行一个）====================
cards_only_filename = "cards_only.txt"
with open(cards_only_filename, 'w', encoding='utf-8') as f:
    for card in cards:
        f.write(card['card'] + '\n')  # 每行一个卡密，无空行、无额外内容

print(f"已导出纯卡密文件: {cards_only_filename}")

# ==================== 控制台预览前5条 =====================
print("\n=== 前5条卡密预览 ===")
for i, card in enumerate(cards[:5]):
    print(f"{i+1}. 卡密: {card['card']} | 哈希: {card['hash'][:16]}...")
