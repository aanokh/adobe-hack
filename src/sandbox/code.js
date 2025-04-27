import addOnSandboxSdk from "add-on-sdk-document-sandbox"
import { editor, constants } from "express-document-sdk"

// Get the document sandbox runtime.
const { runtime } = addOnSandboxSdk.instance

// Store quiz data for later access
let storedQuizData = null;
let pageToQuestionMap = [];

function wrapText(text, maxCharsPerLine = 70) {
  const words = text.split(' ');
  let wrappedText = '';
  let line = '';

  for (const word of words) {
    if ((line + word).length > maxCharsPerLine) {
      wrappedText += line.trim() + '\n';
      line = '';
    }
    line += word + ' ';
  }
  wrappedText += line.trim(); // Add the last line
  return wrappedText;
}

function start() {
  // Helper function to create an in-document notification
  const createDocumentNotification = (message, isError = false) => {
    try {
      // Create a container for the notification
      const container = editor.createRectangle()
      container.width = 600
      container.height = 100

      // Position in center of viewport
      container.translation = {
        x: 300,
        y: 100,
      }

      // Define the background color here to fix the reference error
      const bgColor = { red: 0.49, green: 0.36, blue: 0.96, alpha: 0.2 };
      container.fill = editor.makeColorFill(bgColor)

      // Add text
      const textNode = editor.createText()
      textNode.fullContent.text = message

      // Style the text
      textNode.fullContent.applyCharacterStyles(
        {
          fontSize: 24,
          fontWeight: "bold",
          color: { red: 1, green: 1, blue: 1, alpha: 1 },
        },
        { start: 0, length: message.length },
      )

      // Set text to auto-height layout for wrapping
      textNode.layout = {
        type: constants.TextType.autoHeight,
        width: 550 // Slightly less than container width to provide margin
      }

      textNode.textAlignment = constants.TextAlignment.center

      // Position text in center of container
      textNode.translation = {
        x: 25, // Left margin
        y: 20, // Top margin
      }

      // Append directly to the current artboard
      const docRoot = editor.documentRoot;
      const currentPage = docRoot.pages.item(docRoot.pages.length - 1); // Last page created
      const artboard = currentPage.artboards.first;

      artboard.children.append(container);
      artboard.children.append(textNode);

      // Set a timeout to remove the notification after 5 seconds
      setTimeout(() => {
        try {
          insertionParent.children.remove(container)
          insertionParent.children.remove(textNode)
        } catch (e) {
          console.error("Error removing notification:", e)
        }
      }, 5000)

      return { container, textNode }
    } catch (error) {
      console.error("Error creating notification:", error)
      return null
    }
  }

  // APIs to be exposed to the UI runtime
  const sandboxApi = {
    // Display a message in the document
    displayServerMessage: (message) => {
      try {
        console.log("In displayServerMessage with:", message)

        // Create a text element using the fullContent API
        const textNode = editor.createText()

        // Ensure message isn't null or undefined
        const safeMessage = message || "Upload successful!"

        // Set text content using fullContent property
        textNode.fullContent.text = safeMessage

        // Apply a 24-point font size to the entire string
        textNode.fullContent.applyCharacterStyles({ fontSize: 24 }, { start: 0, length: safeMessage.length })

        // Set the text to auto-wrap with a specified width
        textNode.layout = {
          type: constants.TextType.autoHeight,
          width: 600 // Set a fixed width for text wrapping
        }

        // Set the textAlignment property for left alignment
        textNode.textAlignment = constants.TextAlignment.left

        // Position text in the document
        const docRoot = editor.documentRoot;
        const currentPage = docRoot.pages.item(docRoot.pages.length - 1);
        const artboard = currentPage.artboards.first;

        artboard.children.append(textNode);

        console.log("Text added with fullContent API and auto-wrap enabled")
        return textNode
      } catch (error) {
        console.error("Error displaying message:", error)
        return null
      }
    },

    // Create flashcards on individual pages
    createFlashcards: async (flashcards) => {
      try {
        console.log("Creating flashcards:", JSON.stringify(flashcards))

        if (!Array.isArray(flashcards)) {
          console.error("Invalid flashcards data:", flashcards)
          createDocumentNotification("Error: Invalid flashcards data format", true)
          return { success: false, error: "Flashcards data is not an array" }
        }

        // First, log that we're generating flashcards (removed notification)
        console.log("Generating flashcards...")

        // Define page size
        const pageSize = { width: 1200, height: 800 }

        // Get document root
        const docRoot = editor.documentRoot
        console.log("Document root:", docRoot)

        // Create a page for each flashcard
        const createPageForFlashcard = (index, totalCount) => {
          try {
            console.log(`Creating page ${index + 1} of ${totalCount}`)

            // Create page with specific size
            const newPage = docRoot.pages.addPage(pageSize)
            console.log("New page created:", newPage)

            return newPage
          } catch (error) {
            console.error("Error creating page:", error)
            return null
          }
        }

        // Create text for flashcard content
        const createFlashcardContent = (page, flashcard, index) => {
          console.log(`Creating content for flashcard ${index + 1}:`, flashcard)

          // Get the first artboard from the page
          const artboard = page.artboards.first
          console.log("Using artboard:", artboard)

          // Create background rectangle
          const bgRect = editor.createRectangle()
          bgRect.width = artboard.width
          bgRect.height = artboard.height
          bgRect.translation = { x: 0, y: 0 }

          // Use a light purple color for the background (matching our UI)
          const bgColor = { red: 0.97, green: 0.95, blue: 1.0, alpha: 1 }
          bgRect.fill = editor.makeColorFill(bgColor)

          // Add to artboard first (so it's in the background)
          artboard.children.append(bgRect)

          // Create a header rectangle
          const headerRect = editor.createRectangle()
          headerRect.width = artboard.width
          headerRect.height = 80
          headerRect.translation = { x: 0, y: 0 }

          // Use a purple color for the header (matching our UI)
          const headerColor = { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 }
          headerRect.fill = editor.makeColorFill(headerColor)

          // Add header to artboard
          artboard.children.append(headerRect)

          // Create header text
          const headerText = editor.createText()
          headerText.fullContent.text = "Adobe Academy Flashcard"

          // Style header text
          headerText.fullContent.applyCharacterStyles(
            {
              fontSize: 32,
              fontWeight: "bold",
              color: { red: 1, green: 1, blue: 1, alpha: 1 },
            },
            { start: 0, length: headerText.fullContent.text.length },
          )

          // Position header text
          headerText.translation = { x: 245, y: headerRect.height / 1.5 }

          // Add header text to artboard
          artboard.children.append(headerText)

          const rawQuestion = `Question ${index + 1}:\n${flashcard.question}`;
          const wrappedQuestion = wrapText(rawQuestion, 60);

          const questionText = editor.createText();
          questionText.fullContent.text = wrappedQuestion;

          // Apply styling to question title part
          questionText.fullContent.applyCharacterStyles(
            { fontSize: 32, fontWeight: "bold", color: { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 } },
            { start: 0, length: `Question ${index + 1}:`.length },
          );

          // Apply styling to the rest of the question
          questionText.fullContent.applyCharacterStyles(
            { fontSize: 28, color: { red: 0.2, green: 0.2, blue: 0.2, alpha: 1 } },
            { start: `Question ${index + 1}:`.length, length: wrappedQuestion.length - `Question ${index + 1}:`.length },
          );

          // Set alignment
          questionText.textAlignment = constants.TextAlignment.left

          // Position question below header
          questionText.translation = { x: 50, y: 150 }

          const rawAnswer = `Answer:\n${flashcard.answer}`;
          const wrappedAnswer = wrapText(rawAnswer, 60); // Use the same wrapText function

          const answerText = editor.createText();
          answerText.fullContent.text = wrappedAnswer;

          // Apply styling to "Answer:" part
          answerText.fullContent.applyCharacterStyles(
            { fontSize: 32, fontWeight: "bold", color: { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 } },
            { start: 0, length: `Answer:`.length },
          );

          // Apply styling to the rest of the answer
          answerText.fullContent.applyCharacterStyles(
            { fontSize: 28, color: { red: 0.2, green: 0.2, blue: 0.2, alpha: 1 } },
            { start: `Answer:`.length, length: wrappedAnswer.length - `Answer:`.length },
          );

          // ❌ REMOVE this, no more layout
          // answerText.layout = {...}

          // ✅ Set alignment and translation normally
          answerText.textAlignment = constants.TextAlignment.left;
          answerText.translation = { x: 50, y: 370 };

          // Add to artboard
          artboard.children.append(questionText)
          artboard.children.append(answerText)

          // Set the answer text opacity to 0 to hide it initially
          answerText.opacity = 0

          console.log("Added question and answer texts to artboard with text wrapping enabled")
          console.log("Answer text opacity set to 0")

          return { questionText, answerText }

        }

        // Create navigation elements on the page
        const createNavigation = (page, index, totalCount) => {
          try {
            console.log(`Creating navigation for flashcard ${index + 1} of ${totalCount}`)

            // Get the artboard
            const artboard = page.artboards.first

            // Create a colored rectangle at the bottom for navigation controls
            const navRect = editor.createRectangle()
            navRect.width = artboard.width
            navRect.height = 100

            // Position at bottom of artboard
            navRect.translation = {
              x: 0,
              y: artboard.height - navRect.height,
            }

            // Give it a purple color (matching our UI)
            const navColor = { red: 0.49, green: 0.36, blue: 0.96, alpha: 0.2 }
            navRect.fill = editor.makeColorFill(navColor)

            // Add counter text
            const counterText = editor.createText()
            counterText.fullContent.text = `Flashcard ${index + 1} of ${totalCount}`
            counterText.fullContent.applyCharacterStyles(
              {
                fontSize: 24,
                fontWeight: "bold",
                color: { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 },
              },
              { start: 0, length: counterText.fullContent.text.length },
            )
            counterText.textAlignment = constants.TextAlignment.center

            // Position counter text
            counterText.translation = {
              x: 150,
              y: artboard.height - 40,
            }

            // Add to artboard
            artboard.children.append(navRect)
            artboard.children.append(counterText)

            console.log("Added navigation elements to artboard")
          } catch (error) {
            console.error("Error creating navigation:", error)
          }
        }

        // Create pages for each flashcard
        const createdPages = []

        console.log(`Processing ${flashcards.length} flashcards`)
        for (let i = 0; i < flashcards.length; i++) {
          // Add a maximum limit for safety
          if (i >= 20) {
            console.log("Reached maximum flashcard limit (20)")
            break
          }

          console.log(`Creating flashcard ${i + 1}/${flashcards.length}`)
          const page = createPageForFlashcard(i, flashcards.length)

          if (page) {
            const content = createFlashcardContent(page, flashcards[i], i)
            createNavigation(page, i, flashcards.length)
            createdPages.push(page)
            console.log(`Completed flashcard ${i + 1}/${flashcards.length}`)
          }
        }

        // Display a success message
        console.log(`Created ${createdPages.length} flashcard pages`)

        // Jump to the first flashcard page
        if (createdPages.length > 0) {
          console.log("First flashcard created successfully")
          // Removed bringIntoView call that was causing errors

          // Show success message in console only
          console.log(`Successfully created ${createdPages.length} flashcards!`)
        } else {
          // Log error if no pages were created
          console.log("Failed to create any flashcards")
        }

        return {
          success: true,
          pageCount: createdPages.length,
          message: `Created ${createdPages.length} flashcards`,
        }
      } catch (error) {
        console.error("Error in createFlashcards:", error)
        // Log error to console instead of showing a notification
        console.error(`Error creating flashcards: ${error.message}`)
        return { success: false, error: error.message }
      }
    },

    // Generate a single slide from slide data
    generateSingleSlide: async (slide, index, totalCount) => {
      try {
        console.log(`Generating slide ${index + 1} of ${totalCount}:`, slide.title);

        // Define page size
        const pageSize = { width: 1200, height: 800 };

        // Get document root
        const docRoot = editor.documentRoot;

        // Create page for the slide
        try {
          console.log(`Creating slide page ${index + 1} of ${totalCount}`);

          // Create page with specific size
          const newPage = docRoot.pages.addPage(pageSize);
          console.log("New slide page created:", newPage);

          if (!newPage) {
            throw new Error("Failed to create slide page");
          }

          // Get the first artboard from the page
          const artboard = newPage.artboards.first;
          console.log("Using artboard:", artboard);

          // Create background rectangle
          const bgRect = editor.createRectangle();
          bgRect.width = artboard.width;
          bgRect.height = artboard.height;
          bgRect.translation = { x: 0, y: 0 };

          // Use a light purple color for the background
          const bgColor = { red: 0.97, green: 0.95, blue: 1.0, alpha: 1 };
          bgRect.fill = editor.makeColorFill(bgColor);

          // Add to artboard first (so it's in the background)
          artboard.children.append(bgRect);

          // Create a header rectangle
          const headerRect = editor.createRectangle();
          headerRect.width = artboard.width;
          headerRect.height = 80;
          headerRect.translation = { x: 0, y: 0 };

          // Use a purple color for the header
          const headerColor = { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 };
          headerRect.fill = editor.makeColorFill(headerColor);

          // Add header to artboard
          artboard.children.append(headerRect);

          // Create header text with slide title
          const headerText = editor.createText();
          headerText.fullContent.text = slide.title || `Slide ${index + 1}`;

          // Style header text
          headerText.fullContent.applyCharacterStyles(
            {
              fontSize: 32,
              fontWeight: "bold",
              color: { red: 1, green: 1, blue: 1, alpha: 1 },
            },
            { start: 0, length: headerText.fullContent.text.length },
          );

          // Position header text
          headerText.translation = { x: 500, y: headerRect.height / 1.5 };
          headerText.textAlignment = constants.TextAlignment.center;

          // Add header text to artboard
          artboard.children.append(headerText);

          // Define text and image positioning based on whether an image exists
          let contentTextWidth, contentTextX;

          if (slide.image) {
            console.log("Slide has image URL:", slide.image);
            // If image exists, position text in bottom left (using half the width)
            contentTextWidth = Math.floor(artboard.width / 2) - 70; // Half width minus margin
            contentTextX = 50; // Left margin

            // The image will be added by the UI side using renderLatexImage in the top right
            // We don't need to change vertical position as the UI handles image placement
          } else {
            // If no image, text gets full width
            contentTextWidth = artboard.width - 100; // Full width minus margins
            contentTextX = 50; // Left margin
          }

          // Prepare and wrap the content text
          const rawContent = slide.content || "";
          const wrappedContent = wrapText(rawContent, 70); // Use the same wrapText function, maybe 70 chars for slides

          const contentText = editor.createText();
          contentText.fullContent.text = wrappedContent;

          // Apply styling to content
          contentText.fullContent.applyCharacterStyles(
            {
              fontSize: 20,
              color: { red: 0.2, green: 0.2, blue: 0.2, alpha: 1 },
            },
            { start: 0, length: wrappedContent.length }
          );

          // ❌ REMOVE THIS:
          // contentText.layout = { type: ..., width: ... };

          // ✅ Set textAlignment and translation only
          contentText.textAlignment = constants.TextAlignment.left;

          // Position text - if image exists, position it in bottom left
          const contentYPosition = slide.image ?
            Math.floor(artboard.height / 2) + 20 :
            headerRect.height + 40;

          contentText.translation = { x: contentTextX, y: contentYPosition };

          // Add to artboard
          artboard.children.append(contentText);

          // Create navigation footer
          const navRect = editor.createRectangle();
          navRect.width = artboard.width;
          navRect.height = 60;
          navRect.translation = { x: 0, y: artboard.height - 60 };

          // Use a light purple color for the footer
          const navColor = { red: 0.49, green: 0.36, blue: 0.96, alpha: 0.2 };
          navRect.fill = editor.makeColorFill(navColor);

          // Add counter text
          const navText = editor.createText();
          navText.fullContent.text = `Slide ${index + 1} of ${totalCount}`;

          // Style navigation text
          navText.fullContent.applyCharacterStyles(
            {
              fontSize: 24,
              fontWeight: "bold",
              color: { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 },
            },
            { start: 0, length: navText.fullContent.text.length },
          );

          navText.textAlignment = constants.TextAlignment.center;

          // Position navigation text
          navText.translation = { x: artboard.width / 2, y: artboard.height - 35 };

          // Add to artboard
          artboard.children.append(navRect);
          artboard.children.append(navText);

          console.log(`Completed slide ${index + 1}`);

          return {
            success: true,
            pageId: newPage.id
          };
        } catch (error) {
          console.error("Error creating slide page:", error);
          return {
            success: false,
            error: error.message
          };
        }
      } catch (error) {
        console.error(`Error generating slide ${index + 1}:`, error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    // Maintain backward compatibility by implementing the full slides generation function
    generateSlides: async (slidesData) => {
      try {
        console.log("Generate slides request received, but we'll use the single slide approach instead");

        if (!slidesData || !Array.isArray(slidesData.slides) || slidesData.slides.length === 0) {
          console.error("Invalid slides data format:", slidesData);
          return { success: false, error: "Slides data is not in the expected format" };
        }

        // This just returns success since the actual work will be done in the UI
        // by calling generateSingleSlide for each slide
        return {
          success: true,
          pageCount: slidesData.slides.length,
          message: `Ready to create ${slidesData.slides.length} slides`,
        };
      } catch (error) {
        console.error("Error in generateSlides:", error);
        return { success: false, error: error.message };
      }
    },

    // Generate quiz with questions and answers
    generateQuiz: async (quizData) => {
      try {
        console.log("Generate quiz request received:", JSON.stringify(quizData));

        if (!Array.isArray(quizData.problems)) {
          console.error("Invalid quiz data format:", quizData);
          // Removed notification call to fix error
          return { success: false, error: "Quiz data is not in the expected format" };
        }

        // Store the quiz data for later access
        storedQuizData = quizData;
        // Reset the page to question mapping
        pageToQuestionMap = [];

        // Log start of quiz generation instead of showing notification
        console.log("Generating quiz questions...");

        // Define page size (same as flashcards)
        const pageSize = { width: 1200, height: 800 };

        // Get document root
        const docRoot = editor.documentRoot;
        console.log("Document root:", docRoot);

        // Create a page for each quiz question
        const createPageForQuestion = (index, totalCount) => {
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

        // Create quiz question content (similar to flashcard content but adapted for quiz)
        const createQuizContent = (page, questionData, index) => {
          console.log(`Creating content for quiz question ${index + 1}:`, questionData);

          // Get the first artboard from the page
          const artboard = page.artboards.first;
          console.log("Using artboard:", artboard);

          // Create background rectangle
          const bgRect = editor.createRectangle();
          bgRect.width = artboard.width;
          bgRect.height = artboard.height;
          bgRect.translation = { x: 0, y: 0 };

          // Use a light purple color for the background (matching our UI)
          const bgColor = { red: 0.97, green: 0.95, blue: 1.0, alpha: 1 };
          bgRect.fill = editor.makeColorFill(bgColor);

          // Add to artboard first (so it's in the background)
          artboard.children.append(bgRect);

          // Create a header rectangle
          const headerRect = editor.createRectangle();
          headerRect.width = artboard.width;
          headerRect.height = 80;
          headerRect.translation = { x: 0, y: 0 };

          // Use a purple color for the header (matching our UI)
          const headerColor = { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 };
          headerRect.fill = editor.makeColorFill(headerColor);

          // Add header to artboard
          artboard.children.append(headerRect);

          // Create header text
          const headerText = editor.createText();
          headerText.fullContent.text = quizData.title || "Adobe Academy Quiz";

          // Style header text
          headerText.fullContent.applyCharacterStyles(
            {
              fontSize: 32,
              fontWeight: "bold",
              color: { red: 1, green: 1, blue: 1, alpha: 1 },
            },
            { start: 0, length: headerText.fullContent.text.length },
          );

          // Position header text
          headerText.translation = { x: 500, y: headerRect.height / 1.5 };

          // Add header text to artboard
          artboard.children.append(headerText);

          const rawQuestion = `Question ${index + 1}: ${questionData.title}`;
          const wrappedQuestion = wrapText(rawQuestion, 60); // 60 chars per line

          const questionText = editor.createText();
          questionText.fullContent.text = wrappedQuestion;

          // Style the "Question X:" part
          questionText.fullContent.applyCharacterStyles(
            { fontSize: 32, fontWeight: "bold", color: { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 } },
            { start: 0, length: `Question ${index + 1}:`.length },
          );

          // Style the rest of the question
          questionText.fullContent.applyCharacterStyles(
            { fontSize: 28, color: { red: 0.2, green: 0.2, blue: 0.2, alpha: 1 } },
            { start: `Question ${index + 1}:`.length, length: wrappedQuestion.length - `Question ${index + 1}:`.length },
          );

          // ❌ REMOVE
          // questionText.layout = {...}

          // ✅ Instead, manually wrapped text has natural newlines.

          questionText.textAlignment = constants.TextAlignment.left;
          questionText.translation = { x: 50, y: 150 };

          artboard.children.append(questionText);

          return { questionText };
        };

        // Create navigation elements on the page
        const createNavigation = (page, index, totalCount) => {
          try {
            console.log(`Creating navigation for quiz question ${index + 1} of ${totalCount}`);

            // Get the artboard
            const artboard = page.artboards.first;

            // Create a colored rectangle at the bottom for navigation controls
            const navRect = editor.createRectangle();
            navRect.width = artboard.width;
            navRect.height = 100;

            // Position at bottom of artboard
            navRect.translation = {
              x: 0,
              y: artboard.height - navRect.height,
            };

            // Give it a purple color (matching our UI)
            const navColor = { red: 0.49, green: 0.36, blue: 0.96, alpha: 0.2 };
            navRect.fill = editor.makeColorFill(navColor);

            // Add counter text
            const counterText = editor.createText();
            counterText.fullContent.text = `Quiz Question ${index + 1} of ${totalCount}`;
            counterText.fullContent.applyCharacterStyles(
              {
                fontSize: 24,
                fontWeight: "bold",
                color: { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 },
              },
              { start: 0, length: counterText.fullContent.text.length },
            );
            counterText.textAlignment = constants.TextAlignment.center;

            // Position counter text
            counterText.translation = {
              x: 150,
              y: artboard.height - 40,
            };

            // Add to artboard
            artboard.children.append(navRect);
            artboard.children.append(counterText);

            console.log("Added navigation elements to artboard");
          } catch (error) {
            console.error("Error creating navigation:", error);
          }
        };

        // Create pages for each quiz question
        const createdPages = [];

        console.log(`Processing ${quizData.problems.length} quiz questions`);
        for (let i = 0; i < quizData.problems.length; i++) {
          // Add a maximum limit for safety
          if (i >= 20) {
            console.log("Reached maximum quiz question limit (20)");
            break;
          }

          console.log(`Creating quiz question ${i + 1}/${quizData.problems.length}`);
          const page = createPageForQuestion(i, quizData.problems.length);

          if (page) {
            const content = createQuizContent(page, quizData.problems[i], i);
            createNavigation(page, i, quizData.problems.length);
            createdPages.push(page);

            // Store mapping between page ID and question index
            // This will let us look up which question is on which page later
            // Also store the actual page number for more robust tracking
            pageToQuestionMap.push({
              pageId: page.id,
              pageNumber: page.pageNumber, // Store actual page number in document
              questionIndex: i,
              problem: quizData.problems[i]
            });

            console.log(`Completed quiz question ${i + 1}/${quizData.problems.length}`);
          }
        }

        // Display a success message
        console.log(`Created ${createdPages.length} quiz question pages`);

        // Jump to the first quiz page
        if (createdPages.length > 0) {
          console.log("Created quiz pages successfully");
          // Removed bringIntoView to fix the error

          // Return success without notifications
        } else {
          console.log("Failed to create any quiz pages");
          // Skip error notification
        }

        return {
          success: true,
          pageCount: createdPages.length,
          message: `Created ${createdPages.length} quiz questions`,
        };
      } catch (error) {
        console.error("Error in generateQuiz:", error);
        // Don't show error notification to avoid errors
        return { success: false, error: error.message };
      }
    },

    // Generate study guide based on backend data
    generateStudyGuide: async (studyGuideData) => {
      try {
        console.log("Generate study guide request received:", JSON.stringify(studyGuideData));

        if (!studyGuideData || !studyGuideData.title || !Array.isArray(studyGuideData.topics)) {
          console.error("Invalid study guide data format:", studyGuideData);
          return { success: false, error: "Study guide data is not in the expected format" };
        }

        // Define page size (same as other features)
        const pageSize = { width: 1200, height: 800 };

        // Get document root
        const docRoot = editor.documentRoot;
        console.log("Document root:", docRoot);

        // Create a new page for the study guide
        let studyGuidePage;
        try {
          console.log("Creating study guide page");
          studyGuidePage = docRoot.pages.addPage(pageSize);
          console.log("Study guide page created:", studyGuidePage);
        } catch (error) {
          console.error("Error creating study guide page:", error);
          return { success: false, error: "Failed to create study guide page" };
        }

        // Get the artboard
        const artboard = studyGuidePage.artboards.first;
        console.log("Using artboard:", artboard);

        // Create background
        const bgRect = editor.createRectangle();
        bgRect.width = artboard.width;
        bgRect.height = artboard.height;
        bgRect.translation = { x: 0, y: 0 };

        // Use a light purple color for the background (matching other features)
        const bgColor = { red: 0.97, green: 0.95, blue: 1.0, alpha: 1 };
        bgRect.fill = editor.makeColorFill(bgColor);

        // Add to artboard
        artboard.children.append(bgRect);

        // Create a header rectangle
        const headerRect = editor.createRectangle();
        headerRect.width = artboard.width;
        headerRect.height = 80;
        headerRect.translation = { x: 0, y: 0 };

        // Use a purple color for the header (matching other features)
        const headerColor = { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 };
        headerRect.fill = editor.makeColorFill(headerColor);

        // Add header to artboard
        artboard.children.append(headerRect);

        // Create header text
        const headerText = editor.createText();
        headerText.fullContent.text = studyGuideData.title || "Adobe Academy Study Guide";

        // Style header text
        headerText.fullContent.applyCharacterStyles(
          {
            fontSize: 30,
            fontWeight: "bold",
            color: { red: 1, green: 1, blue: 1, alpha: 1 },
          },
          { start: 0, length: headerText.fullContent.text.length },
        );

        // Center the header text
        headerText.textAlignment = constants.TextAlignment.center;

        // Position header text
        headerText.translation = { x: 500, y: headerRect.height / 1.5 };

        // Add header text to artboard
        artboard.children.append(headerText);

        // Create a content area (no container with border, just text)
        const contentText = editor.createText();

        // Build the full raw content text
        let rawFullContent = "";
        let currentPosition = 0;
        const styleRanges = [];

        // Add each topic with its bullets
        studyGuideData.topics.forEach((topic, index) => {
          const topicTitle = `${index + 1}. ${topic.title}\n`;
          rawFullContent += topicTitle;

          styleRanges.push({
            start: currentPosition,
            length: topicTitle.length,
            style: {
              fontSize: 24,
              fontWeight: "bold",
              color: { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 }
            }
          });

          currentPosition += topicTitle.length;

          if (Array.isArray(topic.bullets)) {
            topic.bullets.forEach(bullet => {
              const bulletPoint = `  • ${bullet}\n`;
              rawFullContent += bulletPoint;

              styleRanges.push({
                start: currentPosition,
                length: bulletPoint.length,
                style: {
                  fontSize: 18,
                  color: { red: 0.2, green: 0.2, blue: 0.2, alpha: 1 }
                }
              });

              currentPosition += bulletPoint.length;
            });
          }

          rawFullContent += "\n";
          currentPosition += 1;
        });

        // ✅ Manually wrap the text instead of using layout
        const wrappedContent = wrapText(rawFullContent, 140); // wrap every ~70 characters

        // Set the wrapped text content
        contentText.fullContent.text = wrappedContent;

        // Apply a base font size to the entire wrapped content
        contentText.fullContent.applyCharacterStyles(
          { fontSize: 18 },
          { start: 0, length: wrappedContent.length }
        );

        // Re-apply style ranges for topics and bullet points
        styleRanges.forEach(range => {
          contentText.fullContent.applyCharacterStyles(
            range.style,
            { start: range.start, length: range.length }
          );
        });

        // ❌ REMOVE layout completely (no experimental API)
        // Set text alignment and position normally
        contentText.textAlignment = constants.TextAlignment.left;
        contentText.translation = {
          x: 40,
          y: headerRect.height + 20
        };

        // ✅ Add to artboard
        artboard.children.append(contentText);


        // Return success without trying to bring page into view
        return {
          success: true,
          message: "Study guide created successfully"
        };
      } catch (error) {
        console.error("Error in generateStudyGuide:", error);
        return { success: false, error: error.message };
      }
    },

    // Get quiz data for the current page
    getCurrentQuizQuestion: async () => {
      try {
        console.log("Getting quiz question data for current page");

        if (!storedQuizData) {
          console.log("No quiz data is stored");
          return { success: false, error: "No quiz data available" };
        }

        // Get the current page
        const docRoot = editor.documentRoot;
        const currentPage = docRoot.pages.item(docRoot.pages.length - 1); // Latest page
        if (!currentPage) {
          console.log("No current page found");
          return { success: false, error: "No current page available" };
        }

        // Try to find the question data corresponding to the current page ID first
        let questionData = pageToQuestionMap.find(item => item.pageId === currentPage.id);

        // If not found by ID, try to find by page number
        if (!questionData && currentPage.pageNumber) {
          questionData = pageToQuestionMap.find(item => item.pageNumber === currentPage.pageNumber);
          console.log("Found question by page number:", currentPage.pageNumber);
        }

        if (!questionData) {
          console.log("No question found for current page (ID:", currentPage.id, ", Number:", currentPage.pageNumber, ")");
          return { success: false, error: "No question found for this page" };
        }

        console.log("Found question data for current page:", questionData);
        return {
          success: true,
          questionData: questionData.problem,
          pageIndex: questionData.questionIndex
        };
      } catch (error) {
        console.error("Error getting current quiz question data:", error);
        return { success: false, error: error.message };
      }
    },

    // Update the page mapping to handle cases where page IDs or page numbers have changed
    updateQuizPageMapping: async () => {
      try {
        console.log("Updating quiz page mapping");

        if (!storedQuizData || !Array.isArray(pageToQuestionMap) || pageToQuestionMap.length === 0) {
          console.log("No quiz data or mapping to update");
          return { success: false, error: "No quiz data available" };
        }

        // Get all pages in the document
        const docRoot = editor.documentRoot;
        if (!docRoot || !docRoot.pages) {
          console.log("Cannot access document pages");
          return { success: false, error: "Cannot access document pages" };
        }

        const updatedMapping = [];
        let pagesUpdated = 0;

        // For each page in the document, check if it contains a quiz question
        for (let i = 0; i < docRoot.pages.length; i++) {
          const page = docRoot.pages.item(i);

          // Look through all children of the first artboard for quiz question text
          if (page.artboards && page.artboards.first) {
            const artboard = page.artboards.first;

            for (const node of artboard.allChildren) {
              // Look for text nodes containing "Question X:"
              if (node.type === constants.SceneNodeType.text &&
                node.fullContent &&
                node.fullContent.text &&
                node.fullContent.text.includes("Question")) {

                const text = node.fullContent.text;
                // Try to extract the question number
                const match = text.match(/Question (\d+):/);

                if (match && match[1]) {
                  const questionNum = parseInt(match[1], 10) - 1; // Convert to 0-based index

                  if (questionNum >= 0 && questionNum < storedQuizData.problems.length) {
                    // Found a question, update the mapping
                    updatedMapping.push({
                      pageId: page.id,
                      pageNumber: page.pageNumber,
                      questionIndex: questionNum,
                      problem: storedQuizData.problems[questionNum]
                    });

                    pagesUpdated++;
                    break; // Found the question for this page, move to next page
                  }
                }
              }
            }
          }
        }

        // Update the mapping if we found any pages
        if (updatedMapping.length > 0) {
          pageToQuestionMap = updatedMapping;
          console.log(`Updated mapping for ${pagesUpdated} quiz question pages`);
          return {
            success: true,
            message: `Updated mapping for ${pagesUpdated} quiz question pages`,
            mappingCount: pagesUpdated
          };
        } else {
          console.log("No quiz questions found in document");
          return { success: false, error: "No quiz questions found in document" };
        }
      } catch (error) {
        console.error("Error updating quiz page mapping:", error);
        return { success: false, error: error.message };
      }
    },

    // Get all quiz data
    getAllQuizData: async () => {
      try {
        console.log("Getting all stored quiz data");

        if (!storedQuizData) {
          console.log("No quiz data is stored");
          return { success: false, error: "No quiz data available" };
        }

        return {
          success: true,
          quizData: storedQuizData,
          pageMapping: pageToQuestionMap
        };
      } catch (error) {
        console.error("Error getting quiz data:", error);
        return { success: false, error: error.message };
      }
    },

    getQuizQuestionData: async (pageId) => {
      try {
        console.log("Getting quiz question data for page:", pageId);

        if (!storedQuizData) {
          console.log("No quiz data is stored");
          return { success: false, error: "No quiz data available" };
        }

        // If pageId is a number, assume it's a page number, otherwise treat as page ID
        let questionData;

        if (typeof pageId === 'number') {
          // Look up by page number
          questionData = pageToQuestionMap.find(item => item.pageNumber === pageId);
          console.log("Looking up question by page number:", pageId);
        } else {
          // Look up by page ID
          questionData = pageToQuestionMap.find(item => item.pageId === pageId);
          console.log("Looking up question by page ID:", pageId);
        }

        if (!questionData) {
          console.log("No question found for given page identifier:", pageId);
          return { success: false, error: "No question found for this page" };
        }

        console.log("Found question data:", questionData);
        return {
          success: true,
          questionData: questionData.problem
        };
      } catch (error) {
        console.error("Error getting quiz question data:", error);
        return { success: false, error: error.message };
      }
    },

    // Show answer for flashcards by setting opacity to 1
    showAnswer: async () => {
      try {
        console.log("Show answer function called");

        // Get the current page
        const docRoot = editor.documentRoot;
        const page = docRoot.pages.item(docRoot.pages.length - 1); // Latest page
        let foundAnswerNode = false;

        // Iterate every artboard on the page…
        for (const artboard of page.artboards) {
          // …and every node on that artboard
          for (const node of artboard.allChildren) {
            // Look for text nodes…
            if (node.type === constants.SceneNodeType.text) {
              const text = node.fullContent?.text;
              // …whose text includes "Answer:"
              if (text && text.includes("Answer:")) {
                node.opacity = 1;
                console.log("Revealed:", node);
                foundAnswerNode = true;
              }
            }
          }
        }

        if (!foundAnswerNode) {
          console.log("No answer nodes found on current page");
        }

        return { success: true, message: "Answer revealed" };
      } catch (error) {
        console.error("Error in showAnswer:", error);
        return { success: false, error: error.message };
      }
    },
  }

  // Add getCurrentPageId function to get the current page ID for polling
  sandboxApi.getCurrentPageId = async () => {
    try {
      // Get the current page
      const docRoot = editor.documentRoot;
      const currentPage = docRoot.pages.item(docRoot.pages.length - 1); // Latest page
      if (!currentPage) {
        console.log("No current page found");
        return null;
      }

      // Return the page ID
      return currentPage.id;
    } catch (error) {
      console.error("Error getting current page ID:", error);
      return null;
    }
  };

  // Add function to get text content from a node by ID
  sandboxApi.getOutlineText = async (nodeId, pageId) => {
    try {
      console.log("Getting outline text content for node:", nodeId, "on page:", pageId);

      // First try to find the page
      const docRoot = editor.documentRoot;
      if (!docRoot || !docRoot.pages) {
        console.error("Cannot access document pages");
        return { success: false, error: "Cannot access document pages" };
      }

      // Find the page by ID
      let targetPage = null;
      for (let i = 0; i < docRoot.pages.length; i++) {
        const page = docRoot.pages.item(i);
        if (page.id === pageId) {
          targetPage = page;
          break;
        }
      }

      if (!targetPage) {
        console.error("Could not find page with ID:", pageId);
        return { success: false, error: "Page not found" };
      }

      console.log("Found page:", targetPage);

      // Search for the node on the artboard
      let textNode = null;
      const artboard = targetPage.artboards.first;

      if (!artboard) {
        console.error("Could not find artboard on page");
        return { success: false, error: "Artboard not found" };
      }

      // Search through all children
      for (const node of artboard.allChildren) {
        if (node.id === nodeId) {
          textNode = node;
          break;
        }
      }

      if (!textNode) {
        console.error("Could not find text node with ID:", nodeId);
        return { success: false, error: "Text node not found" };
      }

      if (textNode.type !== constants.SceneNodeType.text) {
        console.error("Node is not a text node:", textNode);
        return { success: false, error: "Node is not a text node" };
      }

      // Get the raw text content without any parsing
      const textContent = textNode.fullContent.text;
      console.log("Found outline text content:", textContent);

      return {
        success: true,
        textContent: textContent
      };
    } catch (error) {
      console.error("Error getting outline text:", error);
      return { success: false, error: error.message };
    }
  };

  // Add function to generate outline and render it to a text node on a new page
  sandboxApi.generateOutline = async (outlineData) => {
    try {
      console.log("Generate outline request received:", JSON.stringify(outlineData));

      if (!outlineData || !Array.isArray(outlineData.titles)) {
        console.error("Invalid outline data format:", outlineData);
        return { success: false, error: "Outline data is not in the expected format" };
      }

      try {
        // Define page size (same as other features)
        const pageSize = { width: 1200, height: 800 };

        // Get document root
        const docRoot = editor.documentRoot;
        console.log("Document root:", docRoot);

        // Create a new page for the outline
        console.log("Creating new page for outline");
        const newPage = docRoot.pages.addPage(pageSize);
        console.log("New page created:", newPage);

        // Get the first artboard from the page
        const artboard = newPage.artboards.first;
        console.log("Using artboard:", artboard);

        // Create background rectangle
        const bgRect = editor.createRectangle();
        bgRect.width = artboard.width;
        bgRect.height = artboard.height;
        bgRect.translation = { x: 0, y: 0 };

        // Use a light purple color for the background (matching other features)
        const bgColor = { red: 0.97, green: 0.95, blue: 1.0, alpha: 1 };
        bgRect.fill = editor.makeColorFill(bgColor);

        // Add to artboard first (so it's in the background)
        artboard.children.append(bgRect);

        // Create a header rectangle
        const headerRect = editor.createRectangle();
        headerRect.width = artboard.width;
        headerRect.height = 80;
        headerRect.translation = { x: 0, y: 0 };

        // Use a purple color for the header (matching our UI)
        const headerColor = { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 };
        headerRect.fill = editor.makeColorFill(headerColor);

        // Add header to artboard
        artboard.children.append(headerRect);

        // Create header text
        const headerText = editor.createText();
        headerText.fullContent.text = "Presentation Outline";

        // Style header text
        headerText.fullContent.applyCharacterStyles(
          {
            fontSize: 32,
            fontWeight: "bold",
            color: { red: 1, green: 1, blue: 1, alpha: 1 },
          },
          { start: 0, length: headerText.fullContent.text.length },
        );

        // Position header text
        headerText.translation = { x: 500, y: headerRect.height / 1.5 };
        headerText.textAlignment = constants.TextAlignment.center;

        // Add header text to artboard
        artboard.children.append(headerText);

        // Create the outline text node
        console.log("Creating outline text node");
        const textNode = editor.createText();

        // Build the full content with bullet points
        let rawFullContent = "";

        outlineData.titles.forEach((title) => {
          rawFullContent += `• ${title}\n\n`;
        });

        const wrappedContent = wrapText(rawFullContent, 70);

        // Set the text content
        textNode.fullContent.text = wrappedContent;

        // Apply basic styling
        textNode.fullContent.applyCharacterStyles(
          {
            fontSize: 24,
            color: { red: 0.2, green: 0.2, blue: 0.2, alpha: 1 },
          },
          { start: 0, length: wrappedContent.length }
        );

        // ❌ REMOVE:
        // textNode.layout = {...};

        // ✅ Keep
        textNode.textAlignment = constants.TextAlignment.left;
        textNode.translation = { x: 50, y: headerRect.height + 40 };

        // Add to artboard
        artboard.children.append(textNode);

        // Create a footer with a friendly message
        const footerText = editor.createText();
        const footerRawText = "This outline can be used to generate presentation slides. Click 'Generate Slides' to continue.";
        const wrappedFooter = wrapText(footerRawText, 70);

        footerText.fullContent.text = wrappedFooter;

        // Style footer text
        footerText.fullContent.applyCharacterStyles(
          {
            fontSize: 16,
            fontStyle: "italic",
            color: { red: 0.4, green: 0.4, blue: 0.4, alpha: 1 },
          },
          { start: 0, length: wrappedFooter.length }
        );

        // ❌ REMOVE:
        // footerText.layout = {...};

        // ✅ Keep
        footerText.textAlignment = constants.TextAlignment.center;
        footerText.translation = { x: 100, y: artboard.height - 50 };


        // Add footer to artboard
        artboard.children.append(footerText);

        // Skip trying to bring the page into view as it's broken
        console.log("Outline page created successfully with text node ID:", textNode.id);

        // Return success with the node ID for future reference
        return {
          success: true,
          textNodeId: textNode.id,
          pageId: newPage.id,
          message: "Outline created successfully on new page"
        };
      } catch (nodeError) {
        console.error("Error creating outline page:", nodeError);
        throw nodeError;
      }
    } catch (error) {
      console.error("Error in generateOutline:", error);
      return { success: false, error: error.message };
    }
  };

  // Expose `sandboxApi` to the UI runtime.
  runtime.exposeApi(sandboxApi)
}

start()

// This file would contain functions that interact with the Adobe document
// For example, functions to create slides, insert content, etc.

/**
 * Creates a new slide in the presentation
 * @param {Object} options - Options for the new slide
 * @returns {Object} The created slide
 */
function createSlide(options) {
  // This would use Adobe's SDK to create a slide
  console.log("Creating slide with options:", options)
  return { id: "slide-" + Date.now() }
}

/**
 * Inserts text into a slide
 * @param {Object} slide - The slide to insert text into
 * @param {string} text - The text to insert
 * @param {Object} options - Options for the text (position, style, etc.)
 */
function insertText(slide, text, options) {
  // This would use Adobe's SDK to insert text
  console.log("Inserting text into slide:", slide.id, text, options)
}

/**
 * Inserts an image into a slide
 * @param {Object} slide - The slide to insert the image into
 * @param {File} imageFile - The image file to insert
 * @param {Object} options - Options for the image (position, size, etc.)
 */
function insertImage(slide, imageFile, options) {
  // This would use Adobe's SDK to insert an image
  console.log("Inserting image into slide:", slide.id, imageFile.name, options)
}

/**
 * Generates slides based on a text prompt
 * @param {string} prompt - The text prompt describing the slides to generate
 * @param {Array} referenceFiles - Reference files to use for content
 * @param {string} style - The style to apply to the slides
 * @returns {Promise<Array>} A promise that resolves to an array of created slides
 */
function generateSlidesFromPrompt(prompt, referenceFiles, style) {
  // This would use AI to generate slides based on the prompt
  console.log("Generating slides from prompt:", prompt)
  console.log(
    "Reference files:",
    referenceFiles.map((f) => f.name),
  )
  console.log("Style:", style)

  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      const slides = [
        createSlide({ title: "Generated Slide 1" }),
        createSlide({ title: "Generated Slide 2" }),
        createSlide({ title: "Generated Slide 3" }),
      ]
      resolve(slides)
    }, 2000)
  })
}

/**
 * Converts speech to text
 * @returns {Promise<string>} A promise that resolves to the transcribed text
 */
function speechToText() {
  // This would use the Web Speech API or Adobe's SDK for speech recognition
  console.log("Converting speech to text")

  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      resolve("This is the transcribed text from speech.")
    }, 3000)
  })
}

// Export functions for use in iframe.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createSlide,
    insertText,
    insertImage,
    generateSlidesFromPrompt,
    speechToText,
  }
}
