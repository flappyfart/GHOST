require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createCanvas, loadImage } = require('canvas');

// Initialize the bot with polling
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Add error handling for bot initialization
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// ASCII art characters from dark to light
const ASCII_CHARS = '@%#*+=-:. ';

async function imageToAscii(imageUrl, width = 50) {
  try {
    const image = await loadImage(imageUrl);
    const height = Math.round((image.height / image.width) * width * 0.5);
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    
    let asciiArt = '';
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const avg = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
        const charIndex = Math.floor((avg / 255) * (ASCII_CHARS.length - 1));
        asciiArt += ASCII_CHARS[charIndex];
      }
      asciiArt += '\n';
    }
    
    return asciiArt;
  } catch (error) {
    console.error('Error generating ASCII art:', error);
    throw error;
  }
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
  console.log('Received /start command from:', msg.chat.id);
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to ASCII Art Bot! 🎨\n\nSend me an image, and I will convert it into ASCII art.');
});

// Handle incoming images
bot.on('photo', async (msg) => {
  console.log('Received photo from:', msg.chat.id);
  const chatId = msg.chat.id;
  
  try {
    // Send "processing" message
    const processingMsg = await bot.sendMessage(chatId, 'Processing your image... Please wait.');
    
    // Get the file ID of the largest photo size
    const photoId = msg.photo[msg.photo.length - 1].file_id;
    console.log('Processing photo with ID:', photoId);
    
    // Get file path
    const file = await bot.getFile(photoId);
    const filePath = file.file_path;
    
    // Get the image URL
    const imageUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    
    // Generate ASCII art
    const asciiArt = await imageToAscii(imageUrl);
    
    // Send the ASCII art in a monospace font
    await bot.sendMessage(chatId, `\`\`\`\n${asciiArt}\`\`\``, {
      parse_mode: 'Markdown'
    });
    
    // Delete the processing message
    await bot.deleteMessage(chatId, processingMsg.message_id);
    
  } catch (error) {
    console.error('Error processing image:', error);
    bot.sendMessage(chatId, 'Sorry, there was an error processing your image. Please try again.');
  }
});

// Log when bot is running
console.log('Bot is starting...');
bot.getMe().then((botInfo) => {
  console.log('Bot is running as:', botInfo.username);
}).catch((error) => {
  console.error('Error getting bot info:', error);
});