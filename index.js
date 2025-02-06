require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');

// Initialize the bot with polling
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Add error handling for bot initialization
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Use simpler characters for better visual clarity
const ASCII_CHARS = '@#*+=:-. ';

async function generateAsciiArtImage(imageUrl, width = 60) {
  try {
    const image = await loadImage(imageUrl);
    const height = Math.round((image.height / image.width) * width * 0.5);
    
    // First canvas for processing the image
    const processCanvas = createCanvas(width, height);
    const processCtx = processCanvas.getContext('2d');
    
    processCtx.drawImage(image, 0, 0, width, height);
    const imageData = processCtx.getImageData(0, 0, width, height);
    
    // Generate ASCII characters
    let asciiChars = [];
    for (let y = 0; y < height; y++) {
      let row = [];
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const brightness = (0.299 * imageData.data[idx] + 
                          0.587 * imageData.data[idx + 1] + 
                          0.114 * imageData.data[idx + 2]) / 255;
        const charIndex = Math.floor(brightness * (ASCII_CHARS.length - 1));
        row.push(ASCII_CHARS[charIndex]);
      }
      asciiChars.push(row);
    }
    
    // Create final image canvas
    const fontSize = 20;
    const padding = 40;
    const finalCanvas = createCanvas(
      width * fontSize * 0.6 + padding * 2,
      height * fontSize + padding * 2
    );
    const ctx = finalCanvas.getContext('2d');
    
    // Set background
    ctx.fillStyle = '#1E1E1E';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    
    // Set text properties
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = '#E9967A'; // Coral color similar to your example
    ctx.textBaseline = 'top';
    
    // Draw ASCII characters
    asciiChars.forEach((row, y) => {
      row.forEach((char, x) => {
        ctx.fillText(
          char,
          x * fontSize * 0.6 + padding,
          y * fontSize + padding
        );
      });
    });
    
    // Save canvas to buffer
    return finalCanvas.toBuffer('image/png');
  } catch (error) {
    console.error('Error generating ASCII art:', error);
    throw error;
  }
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
  console.log('Received /start command from:', msg.chat.id);
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to ASCII Art Bot! 🎨\n\nSend me an image, and I will convert it into stylized ASCII art.');
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
    
    // Generate ASCII art as PNG
    const asciiArtBuffer = await generateAsciiArtImage(imageUrl);
    
    // Send the image
    await bot.sendPhoto(chatId, asciiArtBuffer, {
      caption: 'Here\'s your ASCII art! 🎨'
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