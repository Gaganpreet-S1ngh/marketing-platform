// Function to detect MIME type from base64 data
function detectMimeType(base64String) {
  // Remove data URL prefix if present
  const base64Data = base64String.startsWith("data:")
    ? base64String.split(",")[1]
    : base64String;

  // Convert first few bytes to check file signature
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const signature = buffer.toString("hex", 0, 4).toUpperCase();

    // Common image file signatures
    if (signature.startsWith("FFD8FF")) return "image/jpeg";
    if (signature.startsWith("89504E47")) return "image/png";
    if (signature.startsWith("47494638")) return "image/gif";
    if (signature.startsWith("52494646")) return "image/webp";
    if (signature.startsWith("424D")) return "image/bmp";
    if (signature.startsWith("49492A00") || signature.startsWith("4D4D002A"))
      return "image/tiff";

    // If data URL has mime type, extract it
    if (base64String.startsWith("data:")) {
      const mimeMatch = base64String.match(/data:([^;]+);/);
      if (mimeMatch) return mimeMatch[1];
    }

    // Default fallback
    return "image/jpeg";
  } catch (error) {
    return "image/jpeg";
  }
}

// Function to generate filename from URL
function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();
    return filename || "image.jpg";
  } catch (error) {
    return "image.jpg";
  }
}

// Function to generate filename from MIME type
function generateFilename(mimeType, index) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
  };

  const ext = extensions[mimeType] || "jpg";
  return `image_${index}_${Date.now()}.${ext}`;
}

// Function to check if string is base64
function isBase64(str) {
  if (str.startsWith("data:")) return true;

  try {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str) && str.length % 4 === 0 && str.length > 0;
  } catch {
    return false;
  }
}

// Function to extract base64 data from data URL
function extractBase64Data(dataUrl) {
  const base64Index = dataUrl.indexOf(",");
  if (base64Index !== -1) {
    return dataUrl.substring(base64Index + 1);
  }
  return dataUrl;
}

// Main function to convert array to Multer-like format
function convertToMulterFormat(imageArray) {
  const result: any = [];

  imageArray.forEach((item, index) => {
    if (isBase64(item)) {
      try {
        // Extract base64 data
        const base64Data = extractBase64Data(item);
        const buffer = Buffer.from(base64Data, "base64");
        const mimeType = detectMimeType(item);
        const originalname = generateFilename(mimeType, index);

        result.push({
          originalname: originalname,
          buffer: buffer,
          size: buffer.length,
          mimetype: mimeType,
          source: "base64",
          originalIndex: index,
        });
      } catch (error: any) {
        console.error(
          `Error converting base64 at index ${index}:`,
          error.message,
        );
        // Skip invalid base64
      }
    } else {
      // For URLs, we can't create a buffer without downloading
      // But we can create a placeholder structure
      const originalname = getFilenameFromUrl(item);
      const mimeType = originalname.includes(".png")
        ? "image/png"
        : originalname.includes(".gif")
          ? "image/gif"
          : originalname.includes(".webp")
            ? "image/webp"
            : "image/jpeg";

      result.push({
        originalname: originalname,
        buffer: null, // Will need to be downloaded separately
        size: 0, // Unknown until downloaded
        mimetype: mimeType,
        source: "url",
        url: item,
        originalIndex: index,
      });
    }
  });

  return result;
}

// Alternative function that only processes base64 (ignores URLs)
function convertBase64OnlyToMulterFormat(imageArray) {
  const result: any = [];

  imageArray.forEach((item, index) => {
    if (isBase64(item)) {
      try {
        const base64Data = extractBase64Data(item);
        const buffer = Buffer.from(base64Data, "base64");
        const mimeType = detectMimeType(item);
        const originalname = generateFilename(mimeType, index);

        result.push({
          originalname: originalname,
          buffer: buffer,
          size: buffer.length,
          mimetype: mimeType,
        });
      } catch (error: any) {
        console.error(
          `Error converting base64 at index ${index}:`,
          error.message,
        );
      }
    }
    // Skip URLs completely
  });

  return result;
}
