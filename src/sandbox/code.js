import addOnSandboxSdk from "add-on-sdk-document-sandbox"
import { editor, constants } from "express-document-sdk"

// Get the document sandbox runtime.
const { runtime } = addOnSandboxSdk.instance

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

      textNode.textAlignment = constants.TextAlignment.center

      // Position text in center of container
      textNode.translation = {
        x: container.width / 2 - message.length * 5,
        y: container.height / 2 - 10,
      }

      // Add to document
      const insertionParent = editor.context.insertionParent
      insertionParent.children.append(container)
      insertionParent.children.append(textNode)

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

        // Set the textAlignment property for left alignment
        textNode.textAlignment = constants.TextAlignment.left

        // Position text in the document
        const insertionParent = editor.context.insertionParent
        textNode.translation = { x: 20, y: 40 }

        // Add to document
        insertionParent.children.append(textNode)

        console.log("Text added with fullContent API and font size 24")
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

        // First, show a message that we're generating flashcards
        createDocumentNotification("Generating flashcards...", false)

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
          headerText.fullContent.text = "StudyGenius Flashcard"

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
          headerText.translation = { x: 30, y: 50 }

          // Add header text to artboard
          artboard.children.append(headerText)

          // Create the question text
          const questionText = editor.createText()
          questionText.fullContent.text = `Question ${index + 1}:\n${flashcard.question}`

          // Apply styling to question
          questionText.fullContent.applyCharacterStyles(
            { fontSize: 32, fontWeight: "bold", color: { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 } },
            { start: 0, length: `Question ${index + 1}:`.length },
          )

          questionText.fullContent.applyCharacterStyles(
            { fontSize: 28, color: { red: 0.2, green: 0.2, blue: 0.2, alpha: 1 } },
            { start: `Question ${index + 1}:`.length, length: flashcard.question.length + 1 },
          )

          // Set alignment
          questionText.textAlignment = constants.TextAlignment.left

          // Position question below header
          questionText.translation = { x: 50, y: 120 }

          // Create the answer text
          const answerText = editor.createText()
          answerText.fullContent.text = `Answer:\n${flashcard.answer}`

          // Apply styling to answer
          answerText.fullContent.applyCharacterStyles(
            { fontSize: 32, fontWeight: "bold", color: { red: 0.49, green: 0.36, blue: 0.96, alpha: 1 } },
            { start: 0, length: `Answer:`.length },
          )

          answerText.fullContent.applyCharacterStyles(
            { fontSize: 28, color: { red: 0.2, green: 0.2, blue: 0.2, alpha: 1 } },
            { start: `Answer:`.length, length: flashcard.answer.length + 1 },
          )

          // Set alignment
          answerText.textAlignment = constants.TextAlignment.left

          // Position answer below question
          answerText.translation = { x: 50, y: 300 }

          // Add to artboard
          artboard.children.append(questionText)
          artboard.children.append(answerText)

          console.log("Added question and answer texts to artboard")

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
              x: artboard.width / 2 - 100,
              y: artboard.height - 60,
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
          console.log("Bringing first flashcard into view")
          editor.viewport.bringIntoView(createdPages[0].artboards.first)

          // Show success message
          createDocumentNotification(`Successfully created ${createdPages.length} flashcards!`, false)
        } else {
          // Show error if no pages were created
          createDocumentNotification("Failed to create any flashcards", true)
        }

        return {
          success: true,
          pageCount: createdPages.length,
          message: `Created ${createdPages.length} flashcards`,
        }
      } catch (error) {
        console.error("Error in createFlashcards:", error)
        // Show error message in document
        createDocumentNotification(`Error: ${error.message}`, true)
        return { success: false, error: error.message }
      }
    },

    // Generate slides (placeholder for future implementation)
    generateSlides: async (prompt, style) => {
      try {
        console.log("Generate slides request received:", prompt, style)
        createDocumentNotification("Slide generation coming soon!", false)
        return { success: true, message: "Slide generation coming soon!" }
      } catch (error) {
        console.error("Error in generateSlides:", error)
        return { success: false, error: error.message }
      }
    },

    // Generate quiz (placeholder for future implementation)
    generateQuiz: async (prompt) => {
      try {
        console.log("Generate quiz request received:", prompt)
        createDocumentNotification("Quiz generation coming soon!", false)
        return { success: true, message: "Quiz generation coming soon!" }
      } catch (error) {
        console.error("Error in generateQuiz:", error)
        return { success: false, error: error.message }
      }
    },

    // Generate study guide (placeholder for future implementation)
    generateStudyGuide: async (prompt) => {
      try {
        console.log("Generate study guide request received:", prompt)
        createDocumentNotification("Study guide generation coming soon!", false)
        return { success: true, message: "Study guide generation coming soon!" }
      } catch (error) {
        console.error("Error in generateStudyGuide:", error)
        return { success: false, error: error.message }
      }
    },
  }

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
