import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { editor, constants } from "express-document-sdk";

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
                console.log("In displayServerMessage with:", message);
                
                // Create a text element using the fullContent API
                const textNode = editor.createText();
                
                // Ensure message isn't null or undefined
                const safeMessage = message || "Upload successful!";
                
                // Set text content using fullContent property
                textNode.fullContent.text = safeMessage;
                
                // Apply a 24-point font size to the entire string
                textNode.fullContent.applyCharacterStyles(
                  { fontSize: 24 },
                  { start: 0, length: safeMessage.length }
                );
                
                // Set the textAlignment property for left alignment
                textNode.textAlignment = constants.TextAlignment.left;
                
                // Position text in the document
                const insertionParent = editor.context.insertionParent;
                textNode.translation = { x: 20, y: 40 };
                
                // Add to document
                insertionParent.children.append(textNode);
                
                console.log("Text added with fullContent API and font size 24");
                return textNode;
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
