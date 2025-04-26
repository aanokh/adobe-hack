import addOnUISdk from "https://new.express.adobe.com/static/add-on-sdk/sdk.js"

addOnUISdk.ready.then(async () => {
  console.log("addOnUISdk is ready for use.")

  // Get the UI runtime.
  const { runtime } = addOnUISdk.instance

  // Get the proxy object, which is required
  // to call the APIs defined in the Document Sandbox runtime
  // i.e., in the `code.js` file of this add-on.
  const sandboxProxy = await runtime.apiProxy("documentSandbox")

  // Set up animation for button click
  const animateButtonClick = (button) => {
    button.style.transform = "scale(0.95)"
    setTimeout(() => {
      button.style.transform = ""
    }, 150)
  }

  // Navigation
  function setupNavigation() {
    // Menu navigation
    const menuItems = document.querySelectorAll(".menu-item")
    menuItems.forEach((item) => {
      item.addEventListener("click", () => {
        const targetPage = item.getAttribute("data-page")
        navigateToPage(targetPage)
      })
    })

    // Back buttons
    const backButtons = document.querySelectorAll(".back-button")
    backButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetPage = button.getAttribute("data-page")
        navigateToPage(targetPage)
      })
    })
  }

  function navigateToPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll(".page")
    pages.forEach((page) => {
      page.classList.remove("active")
    })

    // Show target page
    const targetPage = document.getElementById(pageId)
    if (targetPage) {
      targetPage.classList.add("active")
    }
  }

  // Style buttons
  function setupStyleButtons() {
    const styleButtons = document.querySelectorAll(".style-button")
    styleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Remove active class from all buttons
        styleButtons.forEach((btn) => btn.classList.remove("active"))
        // Add active class to clicked button
        button.classList.add("active")
      })
    })
  }

  // Mic button
  function setupMicButton() {
    const micButton = document.getElementById("mic-button")
    if (micButton) {
      micButton.addEventListener("click", () => {
        micButton.classList.toggle("recording")
      })
    }
  }

  // File upload functionality for flashcards (using existing code)
  function setupFlashcards() {
    const fileInput = document.getElementById("file-input")
    const fileSelectButton = document.getElementById("file-select-button")
    const uploadButton = document.getElementById("upload-button")
    const fileName = document.getElementById("file-name")
    const uploadContainer = document.getElementById("upload-container")

    let selectedFile = null

    // Handle file selection via button
    if (fileSelectButton && fileInput) {
      fileSelectButton.addEventListener("click", () => {
        fileInput.click()
      })
    }

    // Update UI when file is selected
    if (fileInput && fileName && uploadButton) {
      fileInput.addEventListener("change", (event) => {
        selectedFile = event.target.files[0]
        if (selectedFile) {
          fileName.textContent = `Selected: ${selectedFile.name}`
          uploadButton.style.display = "block"
        }
      })
    }

    // Handle drag and drop
    if (uploadContainer) {
      ;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, preventDefaults, false)
      })

      function preventDefaults(e) {
        e.preventDefault()
        e.stopPropagation()
      }
      ;["dragenter", "dragover"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, highlight, false)
      })
        ;["dragleave", "drop"].forEach((eventName) => {
          uploadContainer.addEventListener(eventName, unhighlight, false)
        })

      function highlight() {
        uploadContainer.style.borderColor = "#a78bfa"
        uploadContainer.style.backgroundColor = "rgba(167, 139, 250, 0.1)"
      }

      function unhighlight() {
        uploadContainer.style.borderColor = "#e5e7eb"
        uploadContainer.style.backgroundColor = ""
      }

      uploadContainer.addEventListener("drop", handleDrop, false)

      function handleDrop(e) {
        const dt = e.dataTransfer
        selectedFile = dt.files[0]
        if (selectedFile && fileName && uploadButton) {
          fileName.textContent = `Selected: ${selectedFile.name}`
          uploadButton.style.display = "block"
        }
      }
    }

    // Handle file upload to backend
    if (uploadButton) {
      uploadButton.addEventListener("click", async () => {
        if (!selectedFile) {
          return
        }

        try {
          animateButtonClick(uploadButton)
          uploadButton.disabled = true
          uploadButton.textContent = "Uploading..."

          const formData = new FormData()
          formData.append("file", selectedFile)

          try {
            // Create description with a prompt field
            const description = JSON.stringify({
              prompt: "Generate flashcards from this document",
            })

            // Update formData with the description
            formData.append("description", description)

            // Call the generate-flashcards endpoint
            const response = await fetch("https://wufhalwuhlwauhflu.online/generate-flashcards", {
              method: "POST",
              body: formData,
            })

            if (response.ok) {
              // Parse the JSON response from the server
              const responseData = await response.json()

              // Display upload success message
              if (fileName) {
                fileName.textContent = "Flashcards generated successfully!"
                fileName.style.color = "green"
              }

              // Display the full API response in the UI for debugging
              console.log("Full API response:", JSON.stringify(responseData, null, 2))

              if (fileName) {
                fileName.textContent = "Response received. Processing flashcards..."
              }

              if (responseData.flashcards && responseData.flashcards.length > 0) {
                console.log("Received flashcards:", JSON.stringify(responseData.flashcards))
                // Create flashcards in the document
                const result = await sandboxProxy.createFlashcards(responseData.flashcards)
                console.log("Flashcard creation result:", result)

                if (result.success && fileName) {
                  fileName.textContent = `Created ${result.pageCount} flashcards successfully!`
                }
              } else {
                console.log("No flashcards received")
                await sandboxProxy.displayServerMessage("No flashcards could be generated from this document.")
              }

              setTimeout(() => {
                if (fileName) {
                  fileName.textContent = ""
                  fileName.style.color = "#444"
                }
                if (uploadButton) {
                  uploadButton.style.display = "none"
                }
                if (fileInput) {
                  fileInput.value = ""
                }
                selectedFile = null
              }, 5000)
            } else {
              throw new Error(`Server responded with ${response.status}`)
            }
          } catch (error) {
            console.error(error)
            throw error
          }
        } catch (error) {
          console.error(error)
          if (fileName) {
            fileName.textContent = "Upload failed: " + error.message
            fileName.style.color = "red"
          }
        } finally {
          if (uploadButton) {
            uploadButton.disabled = false
            uploadButton.textContent = "Generate Flashcards"
          }
        }
      })
    }
  }

  // File upload functionality for other sections
  function setupFileUpload(containerId, fileInputId, filesListId) {
    const uploadContainer = document.getElementById(containerId)
    const fileInput = document.getElementById(fileInputId)
    const filesList = document.getElementById(filesListId)

    if (!uploadContainer || !fileInput) return

    const uploadedFiles = []

    // Handle file selection
    fileInput.addEventListener("change", (event) => {
      const files = Array.from(event.target.files)
      files.forEach((file) => {
        uploadedFiles.push(file)
      })
      updateFilesList()
    })

      // Drag and drop
      ;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, preventDefaults, false)
      })

    function preventDefaults(e) {
      e.preventDefault()
      e.stopPropagation()
    }
    ;["dragenter", "dragover"].forEach((eventName) => {
      uploadContainer.addEventListener(eventName, highlight, false)
    })
      ;["dragleave", "drop"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, unhighlight, false)
      })

    function highlight() {
      uploadContainer.classList.add("drag-over")
    }

    function unhighlight() {
      uploadContainer.classList.remove("drag-over")
    }

    uploadContainer.addEventListener("drop", handleDrop, false)

    function handleDrop(e) {
      const dt = e.dataTransfer
      const files = Array.from(dt.files)
      files.forEach((file) => {
        uploadedFiles.push(file)
      })
      updateFilesList()
    }

    function updateFilesList() {
      if (!filesList) return

      filesList.innerHTML = ""

      uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement("div")
        fileItem.className = "file-item"

        const fileInfo = document.createElement("div")
        fileInfo.className = "file-info"

        const fileIconContainer = document.createElement("div")
        fileIconContainer.className = "file-icon-container"

        const fileIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        fileIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg")
        fileIcon.setAttribute("width", "16")
        fileIcon.setAttribute("height", "16")
        fileIcon.setAttribute("viewBox", "0 0 24 24")
        fileIcon.setAttribute("fill", "none")
        fileIcon.setAttribute("stroke", "currentColor")
        fileIcon.setAttribute("stroke-width", "2")
        fileIcon.setAttribute("stroke-linecap", "round")
        fileIcon.setAttribute("stroke-linejoin", "round")
        fileIcon.className = "file-icon"

        // Different icon based on file type
        if (file.type.includes("image")) {
          fileIcon.innerHTML =
            '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'
        } else {
          fileIcon.innerHTML =
            '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>'
        }

        fileIconContainer.appendChild(fileIcon)

        const fileName = document.createElement("span")
        fileName.className = "file-name"
        fileName.textContent = file.name

        fileInfo.appendChild(fileIconContainer)
        fileInfo.appendChild(fileName)

        const removeButton = document.createElement("button")
        removeButton.className = "remove-file"
        removeButton.setAttribute("data-index", index)

        const removeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        removeIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg")
        removeIcon.setAttribute("width", "16")
        removeIcon.setAttribute("height", "16")
        removeIcon.setAttribute("viewBox", "0 0 24 24")
        removeIcon.setAttribute("fill", "none")
        removeIcon.setAttribute("stroke", "currentColor")
        removeIcon.setAttribute("stroke-width", "2")
        removeIcon.setAttribute("stroke-linecap", "round")
        removeIcon.setAttribute("stroke-linejoin", "round")
        removeIcon.innerHTML = '<path d="M18 6 6 18M6 6l12 12"/>'

        removeButton.appendChild(removeIcon)
        removeButton.addEventListener("click", function () {
          const index = Number.parseInt(this.getAttribute("data-index"))
          uploadedFiles.splice(index, 1)
          updateFilesList()
        })

        fileItem.appendChild(fileInfo)
        fileItem.appendChild(removeButton)

        filesList.appendChild(fileItem)
      })
    }
  }

  // Quizzes functionality
  function setupQuizzes() {
    const generateQuizButton = document.getElementById("generate-quiz-button")

    if (generateQuizButton) {
      generateQuizButton.addEventListener("click", () => {
        animateButtonClick(generateQuizButton)
        // In a real implementation, this would generate a quiz
        console.log("Generating quiz...")
      })
    }
  }

  // Study Guide functionality
  function setupStudyGuide() {
    const generateStudyGuideButton = document.getElementById("generate-studyguide-button")

    if (generateStudyGuideButton) {
      generateStudyGuideButton.addEventListener("click", () => {
        animateButtonClick(generateStudyGuideButton)
        // In a real implementation, this would generate a study guide
        console.log("Generating study guide...")
      })
    }
  }

  // Slides functionality
  function setupSlides() {
    const generateSlidesButton = document.getElementById("generate-slides-button")

    if (generateSlidesButton) {
      generateSlidesButton.addEventListener("click", () => {
        animateButtonClick(generateSlidesButton)
        // In a real implementation, this would generate slides
        console.log("Generating slides...")
      })
    }
  }

  // Initialize all functionality
  function init() {
    setupNavigation()
    setupStyleButtons()
    setupMicButton()
    setupFlashcards()
    setupFileUpload("slides-upload-container", "slides-file-input", "slides-files-list")
    setupFileUpload("quizzes-upload-container", "quizzes-file-input", "quizzes-files-list")
    setupFileUpload("studyguide-upload-container", "studyguide-file-input", "studyguide-files-list")
    setupQuizzes()
    setupStudyGuide()
    setupSlides()
  }

  // Run initialization
  init()
})