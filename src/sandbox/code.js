import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { editor, constants } from "express-document-sdk";

// Get the document sandbox runtime.
const { runtime } = addOnSandboxSdk.instance;

function start() {
    // Helper function to create an in-document notification
    const createDocumentNotification = (message, isError = false) => {
        try {
            // Create a container for the notification
            const container = editor.createRectangle();
            container.width = 600;
            container.height = 100;
            
            // Position in center of viewport
            container.translation = { 
                x: 300, 
                y: 100 
            };
            
            // Set colors based on message type
            const bgColor = isError 
                ? { red: 0.98, green: 0.2, blue: 0.2, alpha: 0.9 }  // Error: red
                : { red: 0.2, green: 0.8, blue: 0.2, alpha: 0.9 };  // Success: green
                
            container.fill = editor.makeColorFill(bgColor);
            
            // Add text
            const textNode = editor.createText();
            textNode.fullContent.text = message;
            
            // Style the text
            textNode.fullContent.applyCharacterStyles(
                { 
                    fontSize: 24, 
                    fontWeight: 'bold',
                    color: { red: 1, green: 1, blue: 1, alpha: 1 } 
                },
                { start: 0, length: message.length }
            );
            
            textNode.textAlignment = constants.TextAlignment.center;
            
            // Position text in center of container
            textNode.translation = { 
                x: container.width / 2 - (message.length * 5), 
                y: container.height / 2 - 10 
            };
            
            // Add to document
            const insertionParent = editor.context.insertionParent;
            insertionParent.children.append(container);
            insertionParent.children.append(textNode);
            
            return { container, textNode };
        } catch (error) {
            console.error("Error creating notification:", error);
            return null;
        }
    };
    
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
        },
        
        // Create flashcards on individual pages
        createFlashcards: async (flashcards) => {
            try {
                console.log("Creating flashcards:", JSON.stringify(flashcards));
                
                if (!Array.isArray(flashcards)) {
                    console.error("Invalid flashcards data:", flashcards);
                    createDocumentNotification("Error: Invalid flashcards data format", true);
                    return { success: false, error: "Flashcards data is not an array" };
                }
                
                // First, show a message that we're generating flashcards
                createDocumentNotification("Generating flashcards...", false);
                
                // Define page size
                const pageSize = { width: 1200, height: 800 };
                
                // Get document root
                const docRoot = editor.documentRoot;
                console.log("Document root:", docRoot);
                
                // Create a page for each flashcard
                const createPageForFlashcard = (index, totalCount) => {
                    try {
                        console.log(`Creating page ${index + 1} of ${totalCount}`);
                        
                        // Create page with specific size
                        const newPage = docRoot.pages.addPage(pageSize);
                        console.log("New page created:", newPage);
                        
                        return newPage;
                    } catch (error) {
                        console.error("Error creating page:", error);
                        return null;
                    }
                };
                
                // Create text for flashcard content
                const createFlashcardContent = (page, flashcard, index) => {
                    try {
                        console.log(`Creating content for flashcard ${index + 1}:`, flashcard);
                        
                        // Get the first artboard from the page
                        const artboard = page.artboards.first;
                        console.log("Using artboard:", artboard);
                        
                        // Create background rectangle
                        const bgRect = editor.createRectangle();
                        bgRect.width = artboard.width;
                        bgRect.height = artboard.height;
                        bgRect.translation = { x: 0, y: 0 };
                        
                        // Use a light color for the background
                        const bgColor = { red: 0.98, green: 0.98, blue: 1.0, alpha: 1 };
                        bgRect.fill = editor.makeColorFill(bgColor);
                        
                        // Add to artboard first (so it's in the background)
                        artboard.children.append(bgRect);
                        
                        // Create the question text
                        const questionText = editor.createText();
                        questionText.fullContent.text = `Question ${index + 1}:\n${flashcard.question}`;
                        
                        // Apply styling to question
                        questionText.fullContent.applyCharacterStyles(
                            { fontSize: 32, fontWeight: 'bold' },
                            { start: 0, length: `Question ${index + 1}:`.length }
                        );
                        
                        questionText.fullContent.applyCharacterStyles(
                            { fontSize: 28 },
                            { start: `Question ${index + 1}:`.length, length: flashcard.question.length + 1 }
                        );
                        
                        // Set alignment
                        questionText.textAlignment = constants.TextAlignment.left;
                        
                        // Position question at top of page
                        questionText.translation = { x: 50, y: 80 };
                        
                        // Create the answer text
                        const answerText = editor.createText();
                        answerText.fullContent.text = `Answer:\n${flashcard.answer}`;
                        
                        // Apply styling to answer
                        answerText.fullContent.applyCharacterStyles(
                            { fontSize: 32, fontWeight: 'bold' },
                            { start: 0, length: `Answer:`.length }
                        );
                        
                        answerText.fullContent.applyCharacterStyles(
                            { fontSize: 28 },
                            { start: `Answer:`.length, length: flashcard.answer.length + 1 }
                        );
                        
                        // Set alignment
                        answerText.textAlignment = constants.TextAlignment.left;
                        
                        // Position answer below question
                        answerText.translation = { x: 50, y: 220 };
                        
                        // Add to artboard
                        artboard.children.append(questionText);
                        artboard.children.append(answerText);
                        
                        console.log("Added question and answer texts to artboard");
                        
                        return { questionText, answerText };
                    } catch (error) {
                        console.error("Error creating flashcard content:", error);
                        return null;
                    }
                };
                
                // Create navigation elements on the page
                const createNavigation = (page, index, totalCount) => {
                    try {
                        console.log(`Creating navigation for flashcard ${index + 1} of ${totalCount}`);
                        
                        // Get the artboard
                        const artboard = page.artboards.first;
                        
                        // Create a colored rectangle at the bottom for navigation controls
                        const navRect = editor.createRectangle();
                        navRect.width = artboard.width;
                        navRect.height = 100;
                        
                        // Position at bottom of artboard
                        navRect.translation = { 
                            x: 0,
                            y: artboard.height - navRect.height
                        };
                        
                        // Give it a blue color
                        const navColor = { red: 0.2, green: 0.4, blue: 0.8, alpha: 0.3 };
                        navRect.fill = editor.makeColorFill(navColor);
                        
                        // Add counter text
                        const counterText = editor.createText();
                        counterText.fullContent.text = `Flashcard ${index + 1} of ${totalCount}`;
                        counterText.fullContent.applyCharacterStyles(
                            { fontSize: 24, fontWeight: 'bold', color: { red: 1, green: 1, blue: 1, alpha: 1 } },
                            { start: 0, length: counterText.fullContent.text.length }
                        );
                        counterText.textAlignment = constants.TextAlignment.center;
                        
                        // Position counter text
                        counterText.translation = {
                            x: artboard.width / 2 - 100,
                            y: artboard.height - 60
                        };
                        
                        // Add to artboard
                        artboard.children.append(navRect);
                        artboard.children.append(counterText);
                        
                        console.log("Added navigation elements to artboard");
                    } catch (error) {
                        console.error("Error creating navigation:", error);
                    }
                };
                
                // Create pages for each flashcard
                const createdPages = [];
                
                console.log(`Processing ${flashcards.length} flashcards`);
                for (let i = 0; i < flashcards.length; i++) {
                    // Add a maximum limit for safety
                    if (i >= 20) {
                        console.log("Reached maximum flashcard limit (20)");
                        break;
                    }
                    
                    console.log(`Creating flashcard ${i+1}/${flashcards.length}`);
                    const page = createPageForFlashcard(i, flashcards.length);
                    
                    if (page) {
                        const content = createFlashcardContent(page, flashcards[i], i);
                        createNavigation(page, i, flashcards.length);
                        createdPages.push(page);
                        console.log(`Completed flashcard ${i+1}/${flashcards.length}`);
                    }
                }
                
                // Display a success message
                console.log(`Created ${createdPages.length} flashcard pages`);
                
                // Jump to the first flashcard page
                if (createdPages.length > 0) {
                    console.log("Bringing first flashcard into view");
                    editor.viewport.bringIntoView(createdPages[0].artboards.first);
                    
                    // Show success message
                    createDocumentNotification(`Successfully created ${createdPages.length} flashcards!`, false);
                } else {
                    // Show error if no pages were created
                    createDocumentNotification("Failed to create any flashcards", true);
                }
                
                return { 
                    success: true, 
                    pageCount: createdPages.length,
                    message: `Created ${createdPages.length} flashcards`
                };
            } catch (error) {
                console.error("Error in createFlashcards:", error);
                // Show error message in document
                createDocumentNotification(`Error: ${error.message}`, true);
                return { success: false, error: error.message };
            }
        }
    };

    // Expose `sandboxApi` to the UI runtime.
    runtime.exposeApi(sandboxApi);
}

start();
