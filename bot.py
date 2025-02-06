from telegram import Update, ParseMode
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext
from PIL import Image
import numpy as np
import os

# Get token from environment variable
TOKEN = os.getenv('BOT_TOKEN')

# ASCII Characters used for ASCII Art
ASCII_CHARS = "@%#*+=-:. "

# Function to convert image to ASCII
def image_to_ascii(image_path, width=100):
    image = Image.open(image_path).convert("L")  # Convert to grayscale
    aspect_ratio = image.height / image.width
    new_height = int(width * aspect_ratio * 0.55)  # Adjust aspect ratio
    image = image.resize((width, new_height))

    # Convert image to numpy array
    pixels = np.array(image)
    ascii_image = [[ASCII_CHARS[pixel // 32] for pixel in row] for row in pixels]

    # Convert array to ASCII string
    ascii_str = "\n".join("".join(row) for row in ascii_image)
    return ascii_str

# Function to handle images
def handle_image(update: Update, context: CallbackContext):
    photo = update.message.photo[-1]  # Get highest resolution image
    file = context.bot.get_file(photo.file_id)
    file_path = "image.jpg"
    file.download(file_path)

    try:
        # Convert to ASCII
        ascii_art = image_to_ascii(file_path)
        # Send the ASCII art back
        update.message.reply_text(f"```\n{ascii_art}\n```", parse_mode=ParseMode.MARKDOWN_V2)
    except Exception as e:
        update.message.reply_text("Sorry, there was an error processing your image. Please try again.")
    finally:
        # Cleanup
        if os.path.exists(file_path):
            os.remove(file_path)

# Command handlers
def start(update: Update, context: CallbackContext):
    welcome_message = (
        "👋 Welcome to ASCII Art Bot!\n\n"
        "I can convert your images into ASCII art. Here are my commands:\n\n"
        "/start - Show this welcome message\n"
        "/help - Show help information\n"
        "/about - Learn more about this bot\n"
        "/settings - View current settings\n\n"
        "Simply send me any image and I'll convert it to ASCII art! 🎨"
    )
    update.message.reply_text(welcome_message)

def help_command(update: Update, context: CallbackContext):
    help_text = (
        "🤖 *ASCII Art Bot Help*\n\n"
        "*How to use:*\n"
        "1. Send any image to the bot\n"
        "2. Wait for the bot to process it\n"
        "3. Receive your ASCII art!\n\n"
        "*Available Commands:*\n"
        "/start - Start the bot\n"
        "/help - Show this help message\n"
        "/about - About this bot\n"
        "/settings - View current settings\n\n"
        "*Tips:*\n"
        "• Images with good contrast work best\n"
        "• The output is best viewed with a monospace font\n"
        "• Try different types of images to see what works best!"
    )
    update.message.reply_text(help_text, parse_mode=ParseMode.MARKDOWN)

def about_command(update: Update, context: CallbackContext):
    about_text = (
        "ℹ️ *About ASCII Art Bot*\n\n"
        "This bot converts your images into ASCII art using characters like @, #, *, etc.\n\n"
        "ASCII art is a graphic design technique that creates images using text characters.\n\n"
        "Created with ❤️ using Python and the python-telegram-bot library."
    )
    update.message.reply_text(about_text, parse_mode=ParseMode.MARKDOWN)

def settings_command(update: Update, context: CallbackContext):
    settings_text = (
        "⚙️ *Current Settings*\n\n"
        "• Output Width: 100 characters\n"
        "• Characters Used: @%#*+=-:. \n"
        "• Color Mode: Grayscale\n\n"
        "Note: Settings customization will be available in future updates!"
    )
    update.message.reply_text(settings_text, parse_mode=ParseMode.MARKDOWN)

# Main function
def main():
    if not TOKEN:
        raise ValueError("No BOT_TOKEN provided in environment variables!")
        
    updater = Updater(TOKEN, use_context=True)
    dp = updater.dispatcher

    # Add command handlers
    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CommandHandler("help", help_command))
    dp.add_handler(CommandHandler("about", about_command))
    dp.add_handler(CommandHandler("settings", settings_command))
    dp.add_handler(MessageHandler(Filters.photo, handle_image))

    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()