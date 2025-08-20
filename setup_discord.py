"""
Discord Bot Setup Helper for AuraQuant
Helps configure Discord bot with correct permissions
"""

import webbrowser
import sys
import os
sys.path.append('backend')
from core.vault import APIVault

def setup_discord_bot():
    print("\n" + "="*60)
    print(" AuraQuant Discord Bot Setup Helper")
    print("="*60)
    
    print("\n📋 Required Discord Permissions:")
    print("-" * 40)
    
    permissions = {
        "View Channels": 1024,
        "Send Messages": 2048,
        "Manage Messages": 8192,
        "Embed Links": 16384,
        "Attach Files": 32768,
        "Read Message History": 65536,
        "Mention Everyone": 131072,
        "Use External Emojis": 262144,
        "Add Reactions": 64,
        "Create Public Threads": 8388608,
        "Send Messages in Threads": 33554432,
    }
    
    total = 0
    for perm, value in permissions.items():
        print(f"✅ {perm}: {value}")
        total += value
    
    print(f"\n📊 Total Permission Value: {total}")
    print("(Use this number in Discord Developer Portal)")
    
    # Get bot details
    print("\n" + "="*60)
    print(" Enter Your Bot Details")
    print("="*60)
    
    client_id = input("\n1. Enter your Bot's Application ID: ").strip()
    
    if not client_id:
        print("❌ Application ID is required!")
        return
    
    # Generate invite URL
    permission_int = 379968  # Our calculated permissions
    invite_url = f"https://discord.com/api/oauth2/authorize?client_id={client_id}&permissions={permission_int}&scope=bot%20applications.commands"
    
    print("\n✅ Bot Invite URL Generated!")
    print("-" * 60)
    print(invite_url)
    print("-" * 60)
    
    # Open in browser
    open_browser = input("\nOpen this URL in your browser? (y/n): ").strip().lower()
    if open_browser == 'y':
        webbrowser.open(invite_url)
        print("✅ Opened in browser!")
    
    # Now get the bot token
    print("\n" + "="*60)
    print(" Configure Bot Token")
    print("="*60)
    
    print("\n📝 To get your bot token:")
    print("1. Go to https://discord.com/developers/applications")
    print("2. Select your application")
    print("3. Go to 'Bot' section")
    print("4. Click 'Reset Token' if needed")
    print("5. Copy the token")
    
    bot_token = input("\n2. Enter your Bot Token: ").strip()
    
    if not bot_token:
        print("❌ Bot token is required!")
        return
    
    # Get server and channel info
    print("\n" + "="*60)
    print(" Configure Server & Channels")
    print("="*60)
    
    print("\n📝 To get Discord IDs:")
    print("1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)")
    print("2. Right-click on server/channel → Copy ID")
    
    guild_id = input("\n3. Enter your Discord Server ID: ").strip()
    
    print("\n📢 Channel IDs (optional - press Enter to skip):")
    alerts_channel = input("   Alerts Channel ID: ").strip()
    trades_channel = input("   Trades Channel ID: ").strip()
    logs_channel = input("   Logs Channel ID: ").strip()
    
    # Save to vault
    print("\n" + "="*60)
    print(" Saving Configuration")
    print("="*60)
    
    save_to_vault = input("\nSave to API Vault? (y/n): ").strip().lower()
    
    if save_to_vault == 'y':
        # Initialize vault
        vault = APIVault()
        
        # Prepare credentials
        credentials = {
            'bot_token': bot_token,
            'guild_id': guild_id,
            'channel_ids': {
                'alerts': alerts_channel,
                'trades': trades_channel,
                'logs': logs_channel
            },
            'webhook_urls': []
        }
        
        # Store in vault
        success = vault.store_api_key(
            'discord',
            credentials,
            category='social_media',
            notes='Discord bot configuration for AuraQuant'
        )
        
        if success:
            print("✅ Discord configuration saved to vault!")
        else:
            print("❌ Failed to save configuration")
    
    # Test connection
    print("\n" + "="*60)
    print(" Test Bot Connection")
    print("="*60)
    
    test = input("\nTest bot connection? (y/n): ").strip().lower()
    
    if test == 'y':
        print("\nTesting connection...")
        try:
            import discord
            import asyncio
            
            intents = discord.Intents.default()
            intents.message_content = True
            client = discord.Client(intents=intents)
            
            @client.event
            async def on_ready():
                print(f"✅ Successfully connected as {client.user}")
                print(f"✅ Bot is in {len(client.guilds)} server(s)")
                await client.close()
            
            client.run(bot_token)
            
        except ImportError:
            print("❌ discord.py not installed. Run: pip install discord.py")
        except discord.LoginFailure:
            print("❌ Invalid bot token!")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "="*60)
    print(" Setup Complete!")
    print("="*60)
    print("\n✅ Your Discord bot is configured!")
    print("\n📚 Next steps:")
    print("1. Make sure bot is in your server")
    print("2. Set up channel permissions if needed")
    print("3. Start the bot with: python backend/integrations/discord_bot.py")
    print("\n💡 Bot Commands:")
    print("  !aq status - Show bot status")
    print("  !aq start - Start trading")
    print("  !aq stop - Stop trading")
    print("  !aq help - Show all commands")

if __name__ == "__main__":
    try:
        setup_discord_bot()
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user")
    except Exception as e:
        print(f"\n❌ Setup error: {e}")
