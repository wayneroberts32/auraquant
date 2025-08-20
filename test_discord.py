"""
Test Discord Bot Connection
Channel ID: 1407369896089616635
"""

import discord
from discord.ext import commands
import asyncio
import os
from datetime import datetime

# Your Discord Channel ID
CHANNEL_ID = 1407369896089616635

async def test_bot():
    """Test Discord bot connection and send test message"""
    
    # Get bot token from environment or input
    token = os.getenv('DISCORD_BOT_TOKEN')
    if not token:
        token = input("Enter your Discord bot token: ").strip()
    
    if not token:
        print("❌ No token provided!")
        return
    
    print(f"\n🔄 Connecting to Discord...")
    print(f"📍 Target Channel ID: {CHANNEL_ID}")
    
    # Setup bot
    intents = discord.Intents.default()
    intents.message_content = True
    intents.guilds = True
    
    bot = commands.Bot(command_prefix='!', intents=intents)
    
    @bot.event
    async def on_ready():
        print(f"✅ Bot connected as: {bot.user}")
        print(f"📊 Bot ID: {bot.user.id}")
        
        # Get the channel
        channel = bot.get_channel(CHANNEL_ID)
        
        if channel:
            print(f"✅ Found channel: #{channel.name}")
            
            # Send test message
            embed = discord.Embed(
                title="🚀 AuraQuant Bot Connected!",
                description="Successfully connected to Discord channel",
                color=0x00FF00,
                timestamp=datetime.now()
            )
            
            embed.add_field(name="Channel ID", value=str(CHANNEL_ID), inline=True)
            embed.add_field(name="Bot Name", value=str(bot.user), inline=True)
            embed.add_field(name="Status", value="✅ Online", inline=True)
            
            embed.set_footer(text="AuraQuant Trading Bot V∞")
            
            try:
                await channel.send(embed=embed)
                print("✅ Test message sent successfully!")
                
                # Send additional info
                info_embed = discord.Embed(
                    title="📋 Bot Information",
                    color=0x3498DB,
                    timestamp=datetime.now()
                )
                
                info_embed.add_field(
                    name="Commands Prefix",
                    value="`!aq` for bot commands",
                    inline=False
                )
                
                info_embed.add_field(
                    name="Available Commands",
                    value="""
                    `!aq status` - Show bot status
                    `!aq positions` - Show open positions
                    `!aq performance` - Show performance
                    `!aq help` - Show all commands
                    """,
                    inline=False
                )
                
                info_embed.add_field(
                    name="Alert Types",
                    value="""
                    🟢 Trade Executions
                    💰 Profit/Loss Alerts
                    ⚠️ Risk Warnings
                    📈 Market Updates
                    🚨 Emergency Alerts
                    """,
                    inline=False
                )
                
                await channel.send(embed=info_embed)
                
            except discord.Forbidden:
                print("❌ Bot doesn't have permission to send messages in this channel!")
            except Exception as e:
                print(f"❌ Error sending message: {e}")
        else:
            print(f"❌ Could not find channel with ID: {CHANNEL_ID}")
            print("\nAvailable channels:")
            
            # List all channels the bot can see
            for guild in bot.guilds:
                print(f"\n📍 Server: {guild.name}")
                for channel in guild.text_channels:
                    print(f"   #{channel.name} (ID: {channel.id})")
        
        # Wait a bit then disconnect
        await asyncio.sleep(5)
        await bot.close()
    
    @bot.event
    async def on_error(event, *args, **kwargs):
        print(f"❌ Bot error in {event}: {args}")
    
    try:
        await bot.start(token)
    except discord.LoginFailure:
        print("❌ Failed to login! Check your bot token.")
    except Exception as e:
        print(f"❌ Connection error: {e}")

def main():
    """Main function"""
    print("="*60)
    print(" AuraQuant Discord Bot Test")
    print(f" Channel ID: {CHANNEL_ID}")
    print("="*60)
    
    print("\nThis will test your Discord bot connection and send a test message.")
    print("\nMake sure:")
    print("1. Your bot is added to the server")
    print("2. Bot has permissions in the channel")
    print("3. Channel ID is correct")
    
    proceed = input("\nReady to test? (y/n): ").strip().lower()
    
    if proceed == 'y':
        try:
            asyncio.run(test_bot())
        except KeyboardInterrupt:
            print("\n\n⚠️ Test cancelled by user")
    else:
        print("Test cancelled.")

if __name__ == "__main__":
    main()
