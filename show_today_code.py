import hashlib
import hmac
from datetime import datetime
import pytz


def generate_daily_code(date_string, secret_salt):
    """Generate today's 16-character verification code"""
    message = f"{date_string}_{secret_salt}"
    
    hash_object = hmac.new(
        secret_salt.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    )
    
    hash_bytes = hash_object.digest()
    
    uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    lowercase = "abcdefghijklmnopqrstuvwxyz"
    numbers = "0123456789"
    symbols = "!@#$%&*+-="
    all_chars = uppercase + lowercase + numbers + symbols
    
    code = ""
    for i in range(16):
        char_index = hash_bytes[i % len(hash_bytes)] % len(all_chars)
        code += all_chars[char_index]
    
    # Ensure diversity
    if not any(c in uppercase for c in code):
        code = uppercase[hash_bytes[0] % len(uppercase)] + code[1:]
    if not any(c in lowercase for c in code):
        code = code[0] + lowercase[hash_bytes[1] % len(lowercase)] + code[2:]
    if not any(c in numbers for c in code):
        code = code[:2] + numbers[hash_bytes[2] % len(numbers)] + code[3:]
    if not any(c in symbols for c in code):
        code = code[:3] + symbols[hash_bytes[3] % len(symbols)] + code[4:]
    
    return code[:16]


def main():
    # IMPORTANT: Use the SAME secret salt as in your Cloudflare Worker!
    SECRET_SALT = "Sk2024#Lx7Mq9Pv3Zt8Xw1Bn6Cr4Fy5Gh2Jk0Nl3"

    print("=" * 60)
    print("🔐 TODAY'S VERIFICATION CODE (IST)")
    print("=" * 60)

    try:
        ist = pytz.timezone('Asia/Kolkata')
        current_date = datetime.now(ist)
        date_string = current_date.strftime("%Y%m%d")

        code = generate_daily_code(date_string, SECRET_SALT)

        if code:
            print(f"📅 Date (IST): {current_date.strftime('%A, %B %d, %Y')}")
            print(f"🕒 Time (IST): {current_date.strftime('%I:%M:%S %p')}")
            print(f"📊 Date Format: {date_string}")
            print("-" * 60)
            print(f"🔑 TODAY'S VERIFICATION CODE:")
            print(f"")
            print(f"   {code}")
            print(f"")
            print("-" * 60)
            print("ℹ️  INFO:")
            print("   • Code length: 16 characters")
            print("   • Valid until: Midnight IST")
            print("   • Changes: Daily at 12:00 AM IST")
            print("   • Contains: Letters, Numbers, Symbols")
            print("-" * 60)
            
            # Character breakdown
            uppercase = sum(1 for c in code if c.isupper())
            lowercase = sum(1 for c in code if c.islower())
            numbers = sum(1 for c in code if c.isdigit())
            symbols = sum(1 for c in code if c in "!@#$%&*+-=")
            
            print("📈 Code Analysis:")
            print(f"   • Uppercase: {uppercase}")
            print(f"   • Lowercase: {lowercase}")
            print(f"   • Numbers: {numbers}")
            print(f"   • Symbols: {symbols}")
            print("-" * 60)
            print("✅ Copy this code and use it in your extension")
            
        else:
            print("❌ Error generating code!")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print("Make sure you have 'pytz' installed: pip install pytz")

    print("\n" + "=" * 60)
    input("Press Enter to exit...")


if __name__ == "__main__":
    main()
