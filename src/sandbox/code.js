import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { editor } from "express-document-sdk";

// Get the document sandbox runtime.
const { runtime } = addOnSandboxSdk.instance;

function start() {
    // APIs to be exposed to the UI runtime
    // i.e., to the `index.html` file of this add-on.
    const sandboxApi = {
        createRectangle: () => {
            const rectangle = editor.createRectangle();

            // Define rectangle dimensions.
            rectangle.width = 240;
            rectangle.height = 180;

            // Define rectangle position.
            rectangle.translation = { x: 10, y: 10 };

            // Define rectangle color.
            const color = { red: 0.32, green: 0.34, blue: 0.89, alpha: 1 };

            // Fill the rectangle with the color.
            const rectangleFill = editor.makeColorFill(color);
            rectangle.fill = rectangleFill;

            // Add the rectangle to the document.
            const insertionParent = editor.context.insertionParent;
            insertionParent.children.append(rectangle);
        },
        
        createGreenRectangle: () => {
            const rectangle = editor.createRectangle();

            // Define rectangle dimensions.
            rectangle.width = 240;
            rectangle.height = 180;

            // Define rectangle position.
            rectangle.translation = { x: 10, y: 10 };

            // Define rectangle color (green).
            const color = { red: 0.15, green: 0.68, blue: 0.38, alpha: 1 };

            // Fill the rectangle with the green color.
            const rectangleFill = editor.makeColorFill(color);
            rectangle.fill = rectangleFill;

            // Add the rectangle to the document.
            const insertionParent = editor.context.insertionParent;
            insertionParent.children.append(rectangle);
        },
        
        createRedRectangle: () => {
            const rectangle = editor.createRectangle();

            // Define rectangle dimensions.
            rectangle.width = 240;
            rectangle.height = 180;

            // Define rectangle position.
            rectangle.translation = { x: 10, y: 10 };

            // Define rectangle color (red).
            const color = { red: 0.86, green: 0.21, blue: 0.27, alpha: 1 };

            // Fill the rectangle with the red color.
            const rectangleFill = editor.makeColorFill(color);
            rectangle.fill = rectangleFill;

            // Add the rectangle to the document.
            const insertionParent = editor.context.insertionParent;
            insertionParent.children.append(rectangle);
        },
        
        displayServerMessage: (message) => {
            try {
                // Create a rectangle to serve as an upload notification banner
                const banner = editor.createRectangle();
                banner.width = 300;
                banner.height = 40;
                banner.fill = editor.makeColorFill({ red: 0.95, green: 0.95, blue: 0.95, alpha: 0.9 });
                banner.cornerRadius = 4;
                banner.stroke = editor.makeColorStroke({ red: 0.8, green: 0.8, blue: 0.8, alpha: 1 }, 1);
                
                // Create a text element
                const text = editor.createText();
                
                // Set text content (shorter message)
                if (message.length > 50) {
                    message = message.substring(0, 47) + "...";
                }
                text.text = message;
                
                // Apply very small text size (Adobe SDK specific)
                // The fontSize is in points, try a very small value
                text.fontSize = 8;
                
                // Get insertion parent
                const insertionParent = editor.context.insertionParent;
                
                // Get document dimensions
                const docWidth = insertionParent.width || 800;
                const docHeight = insertionParent.height || 600;
                
                // Position banner at the bottom of the document
                banner.translation = { 
                    x: docWidth / 2 - banner.width / 2, 
                    y: docHeight - 50 
                };
                
                // Position text in the center of the banner
                text.translation = { 
                    x: banner.translation.x + 10, // Left-aligned with a small margin
                    y: banner.translation.y + banner.height / 2 - 5 // Vertically centered
                };
                
                // Add elements to the document
                insertionParent.children.append(banner);
                insertionParent.children.append(text);
                
                return { text, banner };
            } catch (error) {
                console.error("Error displaying message:", error);
                return null;
            }
        }
    };

    // Expose `sandboxApi` to the UI runtime.
    runtime.exposeApi(sandboxApi);
}

start();
