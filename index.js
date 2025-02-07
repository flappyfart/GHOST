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

// Use a more detailed character set for better gradients
const ASCII_CHARS = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

// Helper functions
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Apply Sobel edge detection
function applySobelEdgeDetection(gray, width, height) {
  const edges = new Array(width * height).fill(0);
  const threshold = 30; // Adjust threshold for edge sensitivity

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Get surrounding pixels
      const tl = gray[(y - 1) * width + (x - 1)];
      const t  = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + (x + 1)];
      const l  = gray[y * width + (x - 1)];
      const r  = gray[y * width + (x + 1)];
      const bl = gray[(y + 1) * width + (x - 1)];
      const b  = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + (x + 1)];

      // Sobel kernels
      const gx = -tl + tr - 2 * l + 2 * r - bl + br;
      const gy = -tl - 2 * t - tr + bl + 2 * b + br;

      // Calculate gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[idx] = magnitude > threshold ? magnitude : 0;
    }
  }
  return edges;
}

async function generateAsciiArtImage(imageUrl, width = 150) {
  try {
    const image = await loadImage(imageUrl);
    const height = Math.round((image.height / image.width) * width * 0.5);
    
    // First canvas for processing the image
    const processCanvas = createCanvas(width, height);
    const processCtx = processCanvas.getContext('2d');
    processCtx.drawImage(image, 0, 0, width, height);
    
    const imageData = processCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Convert to grayscale and apply contrast
    const grayscale = new Array(width * height);
    const contrastFactor = 1.5;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Convert to grayscale with proper weights
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Apply contrast
      gray = clamp(((gray - 128) * contrastFactor) + 128, 0, 255);
      
      grayscale[i / 4] = gray;
    }
    
    // Apply edge detection
    const edges = applySobelEdgeDetection(grayscale, width, height);
    
    // Create ASCII art
    let asciiChars = [];
    for (let y = 0; y < height; y++) {
      let row = [];
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const edgeValue = edges[idx];
        const grayValue = grayscale[idx];
        
        // Combine edge and intensity information
        const value = Math.max(edgeValue, grayValue);
        const charIndex = Math.floor((value / 255) * (ASCII_CHARS.length - 1));
        row.push(ASCII_CHARS[charIndex]);
      }
      asciiChars.push(row);
    }
    
    // Create final image canvas
    const charWidth = 8;
    const charHeight = 12;
    const padding = 20;
    const finalCanvas = createCanvas(
      width * charWidth + padding * 2,
      height * charHeight + padding * 2
    );
    const ctx = finalCanvas.getContext('2d');
    
    // Set background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    
    // Set text properties
    ctx.font = `${charHeight}px "Courier New"`;
    ctx.fillStyle = '#00FF00';
    ctx.textBaseline = 'top';
    
    // Draw ASCII characters
    asciiChars.forEach((row, y) => {
      const lineY = y * charHeight + padding;
      row.forEach((char, x) => {
        const charX = x * charWidth + padding;
        ctx.fillText(char, charX, lineY);
      });
    });
    
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