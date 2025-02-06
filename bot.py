from telegram import Update
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext
from PIL import Image
import numpy as np
import os

# 🔥 Replace with your BotFather token
TOKEN = "YOUR_NEW_BOT_TOKEN"

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

    # Convert to ASCII
    ascii_art = image_to_ascii(file_path)

    # Send the ASCII art back
    update.message.reply_text(f"```\n{ascii_art}\n```", parse_mode="MarkdownV2")

    # Cleanup
    os.remove(file_path)

# Start command
def start(update: Update, context: CallbackContext):
    update.message.reply_text("📸 Send me an image, and I'll convert it into ASCII art!")

# Main function
def main():
    updater = Updater(TOKEN, use_context=True)
    dp = updater.dispatcher

    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(MessageHandler(Filters.photo, handle_image))

    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()