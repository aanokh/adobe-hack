import addOnUISdk from "https://new.express.adobe.com/static/add-on-sdk/sdk.js"

addOnUISdk.ready.then(async () => {
  console.log("addOnUISdk is ready for use.")

  // Get the UI runtime.
  const { runtime } = addOnUISdk.instance

  // Get the proxy object, which is required
  // to call the APIs defined in the Document Sandbox runtime
  // i.e., in the `code.js` file of this add-on.
  const sandboxProxy = await runtime.apiProxy("documentSandbox")

  // Initialize variable to track the last page ID
  let lastPageId = null;

  // Helper function to shuffle an array
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  // Store the correct answer index for the current question
  let currentCorrectAnswerIndex = -1;
  
  async function onPageChanged(newId) {
    console.log("Page switched to:", newId);
    const quizData = await sandboxProxy.getCurrentQuizQuestion();
    
    // Reset any previous answer states
    const answerButtons = [
      document.getElementById('quiz-answer-a'),
      document.getElementById('quiz-answer-b'),
      document.getElementById('quiz-answer-c'),
      document.getElementById('quiz-answer-d')
    ];
    
    answerButtons.forEach(btn => {
      if (btn) {
        btn.classList.remove('selected', 'correct', 'incorrect');
        btn.removeAttribute('data-is-correct');
      }
    });

    if (quizData && quizData.success && quizData.questionData) {
      console.log("Current page quiz answers:", {
        correct: quizData.questionData.correct_answer,
        wrong1: quizData.questionData.wrong_answer_1,
        wrong2: quizData.questionData.wrong_answer_2,
        wrong3: quizData.questionData.wrong_answer_3
      });
      
      // Get the answers container and show it
      const answersContainer = document.getElementById('quiz-answers-container');
      if (answersContainer) {
        answersContainer.classList.remove('hidden');
      }
      
      // If there's a problem URL, render the LaTeX image
      if (quizData.questionData.problem && quizData.questionData.problem.startsWith('http')) {
        console.log("Rendering LaTeX image from URL:", quizData.questionData.problem);
        
        // Check if we have a quiz-image container
        let imageContainer = document.getElementById('quiz-image-container');
        
        // If not, create one
        if (!imageContainer) {
          imageContainer = document.createElement('div');
          imageContainer.id = 'quiz-image-container';
          imageContainer.style.textAlign = 'center';
          imageContainer.style.margin = '1.5rem 0';
          imageContainer.style.padding = '1rem';
          imageContainer.style.backgroundColor = '#f9fafb';
          imageContainer.style.borderRadius = '0.5rem';
          imageContainer.style.minHeight = '120px'; // Ensure there's enough space
          
          // Insert it before the answers container
          if (answersContainer.parentNode) {
            answersContainer.parentNode.insertBefore(imageContainer, answersContainer);
          }
        }
        
        // Clear any previous content
        imageContainer.innerHTML = '';
        
        // Create and add an image element
        const img = document.createElement('img');
        img.src = quizData.questionData.problem;
        img.alt = 'LaTeX equation';
        img.style.width = '90%'; // Large but not full width
        img.style.height = 'auto';
        img.style.maxHeight = 'none'; // No height restriction
        img.style.margin = '20px 0'; // Add generous vertical spacing
        
        imageContainer.appendChild(img);
        
        // Also try to render the image in the document using our function
        try {
          await renderLatexImage(quizData.questionData.problem);
        } catch (err) {
          console.error("Failed to render LaTeX image in document:", err);
        }
      }
      
      // Create an array of answers with their correctness
      const answers = [
        { content: quizData.questionData.correct_answer, isCorrect: true },
        { content: quizData.questionData.wrong_answer_1, isCorrect: false },
        { content: quizData.questionData.wrong_answer_2, isCorrect: false },
        { content: quizData.questionData.wrong_answer_3, isCorrect: false }
      ];
      
      // Shuffle the answers
      const shuffledAnswers = shuffleArray(answers);
      
      // Update the answer buttons with the shuffled answers
      for (let i = 0; i < answerButtons.length; i++) {
        const button = answerButtons[i];
        if (button && i < shuffledAnswers.length) {
          // Clear any previous content
          button.innerHTML = '';
          
          const answerContent = shuffledAnswers[i].content;
          
          // Check if the answer content is a URL (for LaTeX images)
          if (typeof answerContent === 'string' && answerContent.startsWith('http')) {
            // Create an image element for the LaTeX
            const img = document.createElement('img');
            img.src = answerContent;
            img.alt = `Option ${String.fromCharCode(65 + i)}`; // A, B, C, D
            img.style.width = '95%'; // Almost full width
            img.style.height = 'auto';
            img.style.maxHeight = 'none'; // No height restriction
            img.style.margin = '8px 0'; // Add vertical spacing
            
            // Add the image to the button
            button.appendChild(img);
          } else {
            // Regular text answer
            button.textContent = answerContent;
          }
          
          button.setAttribute('data-is-correct', shuffledAnswers[i].isCorrect);
          
          // Store the index of the correct answer
          if (shuffledAnswers[i].isCorrect) {
            currentCorrectAnswerIndex = i;
          }
        }
      }
    } else {
      console.log("No quiz data available for current page");
      
      // Hide the answers container if no quiz data
      const answersContainer = document.getElementById('quiz-answers-container');
      if (answersContainer) {
        answersContainer.classList.add('hidden');
      }
      
      // Hide the image container if it exists
      const imageContainer = document.getElementById('quiz-image-container');
      if (imageContainer) {
        imageContainer.classList.add('hidden');
      }
    }
  }
  
  // Start polling for page changes and quiz data
  window.setInterval(async () => {
    try {
      const currentId = await sandboxProxy.getCurrentPageId();
      
      if (currentId !== lastPageId) {
        lastPageId = currentId;
        await onPageChanged(currentId);
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, 500);

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
    const showAnswerButton = document.getElementById("show-answer-button")
    const fileName = document.getElementById("file-name")
    const uploadContainer = document.getElementById("upload-container")

    let selectedFile = null

    // Set up show answer button
    if (showAnswerButton) {
      showAnswerButton.addEventListener("click", () => {
        animateButtonClick(showAnswerButton)
        showAnswer()
      })
    }

    // Function to show answer by setting opacity to 1
    async function showAnswer() {
      console.log("Show answer button clicked")
      try {
        // Call the sandbox function to show the answer
        const result = await sandboxProxy.showAnswer()
        console.log("Show answer result:", result)
      } catch (error) {
        console.error("Error showing answer:", error)
      }
    }

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

  function setupQuizzes() {
    // Setup quiz answer button event listeners
    const setupQuizAnswerButtons = () => {
      const answerButtons = [
        document.getElementById('quiz-answer-a'),
        document.getElementById('quiz-answer-b'),
        document.getElementById('quiz-answer-c'),
        document.getElementById('quiz-answer-d')
      ];
      
      // Add click event to each button
      answerButtons.forEach((button, index) => {
        if (button) {
          button.addEventListener('click', () => {
            // If user already selected an answer, don't allow changes
            if (answerButtons.some(btn => btn && (btn.classList.contains('correct') || btn.classList.contains('incorrect')))) {
              return;
            }
            
            // Remove selection from all buttons
            answerButtons.forEach(btn => {
              if (btn) btn.classList.remove('selected');
            });
            
            // Add selection to clicked button
            button.classList.add('selected');
            
            // Check if answer is correct
            const isCorrect = button.getAttribute('data-is-correct') === 'true';
            
            // Show feedback
            if (isCorrect) {
              button.classList.add('correct');
              
              // Create feedback container
              const feedbackContainer = document.createElement('div');
              feedbackContainer.className = 'feedback-container';
              
              // Success feedback
              const feedbackText = document.createElement('div');
              feedbackText.className = 'feedback-text correct';
              feedbackText.textContent = '✓ Correct!';
              feedbackContainer.appendChild(feedbackText);
              
              // Add feedback container to button
              button.appendChild(feedbackContainer);
              
              // Remove the feedback text after 3 seconds
              setTimeout(() => {
                if (feedbackContainer && feedbackContainer.parentNode) {
                  feedbackContainer.parentNode.removeChild(feedbackContainer);
                }
              }, 3000);
            } else {
              button.classList.add('incorrect');
              
              // Create feedback container
              const feedbackContainer = document.createElement('div');
              feedbackContainer.className = 'feedback-container';
              
              // Error feedback
              const feedbackText = document.createElement('div');
              feedbackText.className = 'feedback-text incorrect';
              feedbackText.textContent = '✗ Incorrect';
              feedbackContainer.appendChild(feedbackText);
              
              // Add feedback container to button
              button.appendChild(feedbackContainer);
              
              // Highlight the correct answer
              if (currentCorrectAnswerIndex >= 0 && currentCorrectAnswerIndex < answerButtons.length) {
                const correctButton = answerButtons[currentCorrectAnswerIndex];
                if (correctButton) {
                  correctButton.classList.add('correct');
                  
                  // Create feedback container for correct answer
                  const correctFeedbackContainer = document.createElement('div');
                  correctFeedbackContainer.className = 'feedback-container';
                  
                  // Show correct answer feedback
                  const correctFeedback = document.createElement('div');
                  correctFeedback.className = 'feedback-text correct';
                  correctFeedback.textContent = '✓ Correct Answer';
                  correctFeedbackContainer.appendChild(correctFeedback);
                  
                  // Add feedback container to correct button
                  correctButton.appendChild(correctFeedbackContainer);
                  
                  // Remove the feedback containers after 3 seconds
                  setTimeout(() => {
                    if (feedbackContainer && feedbackContainer.parentNode) {
                      feedbackContainer.parentNode.removeChild(feedbackContainer);
                    }
                    if (correctFeedbackContainer && correctFeedbackContainer.parentNode) {
                      correctFeedbackContainer.parentNode.removeChild(correctFeedbackContainer);
                    }
                  }, 3000);
                }
              }
            }
          });
        }
      });
    };
    
    setupQuizAnswerButtons();
    const fileInput = document.getElementById("quizzes-file-input");
    const fileName = document.getElementById("quizzes-file-name");
    const generateQuizButton = document.getElementById("generate-quiz-button");
    const uploadContainer = document.getElementById("quizzes-upload-container");

    let selectedFile = null;

    // Handle file selection
    if (fileInput) {
      fileInput.addEventListener("change", (event) => {
        selectedFile = event.target.files[0];
        if (selectedFile && fileName) {
          fileName.textContent = `Selected: ${selectedFile.name}`;
          generateQuizButton.style.display = "block"; // optional if you want to hide button initially
        }
      });
    }

    // Handle drag and drop
    if (uploadContainer) {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, preventDefaults, false);
      });

      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      ["dragenter", "dragover"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, highlight, false);
      });

      ["dragleave", "drop"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, unhighlight, false);
      });

      function highlight() {
        uploadContainer.style.borderColor = "#a78bfa";
        uploadContainer.style.backgroundColor = "rgba(167, 139, 250, 0.1)";
      }

      function unhighlight() {
        uploadContainer.style.borderColor = "#e5e7eb";
        uploadContainer.style.backgroundColor = "";
      }

      uploadContainer.addEventListener("drop", handleDrop, false);

      function handleDrop(e) {
        const dt = e.dataTransfer;
        selectedFile = dt.files[0];
        if (selectedFile && fileName) {
          fileName.textContent = `Selected: ${selectedFile.name}`;
          generateQuizButton.style.display = "block";
        }
      }
    }

    // Handle "Generate Quiz" button click
    if (generateQuizButton) {
      generateQuizButton.addEventListener("click", async () => {
        animateButtonClick(generateQuizButton);
        console.log("Generating quiz...");

        if (!selectedFile) {
          console.error("No file selected for quiz generation.");
          return;
        }

        try {
          generateQuizButton.disabled = true;
          generateQuizButton.textContent = "Uploading...";
          
          // Hide answer buttons when starting a new quiz
          document.getElementById('quiz-answers-container').classList.add('hidden');

          const formData = new FormData();
          formData.append("file", selectedFile);

          const promptInput = document.getElementById("quizzes-prompt");
          console.log("PROMPT INPUT! PROMPT INPUT! ");
          console.log(promptInput)
          const promptText = promptInput ? promptInput.value : "";

          formData.append("description", JSON.stringify({
            prompt: promptText || "Generate a quiz from this file",
          }));

          const response = await fetch("https://wufhalwuhlwauhflu.online/generate-quiz", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const responseData = await response.json();
            console.log("Quiz data received:", responseData);

            if (fileName) {
              fileName.textContent = "Quiz data received. Creating quiz pages...";
              fileName.style.color = "green";
            }
            
            if (responseData && responseData.problems && responseData.problems.length > 0) {
              console.log("Received quiz problems:", JSON.stringify(responseData.problems));
              
              // Call the sandbox function to create quiz pages
              const result = await sandboxProxy.generateQuiz(responseData);
              console.log("Quiz creation result:", result);
              
              if (result.success && fileName) {
                fileName.textContent = `Created ${result.pageCount} quiz questions successfully!`;
                
                // Show the answer buttons
                document.getElementById('quiz-answers-container').classList.remove('hidden');
              }
            } else {
              console.log("No quiz problems received");
              if (fileName) {
                fileName.textContent = "No quiz questions could be generated from this document.";
                fileName.style.color = "red";
              }
            }
          } else {
            throw new Error(`Server responded with status ${response.status}`);
          }
        } catch (error) {
          console.error("Failed to generate quiz:", error);
          if (fileName) {
            fileName.textContent = "Quiz generation failed: " + error.message;
            fileName.style.color = "red";
          }
        } finally {
          generateQuizButton.disabled = false;
          generateQuizButton.textContent = "Generate Quiz";
        }
      });
    }
  }

  function setupStudyGuide() {
    const fileInput = document.getElementById("studyguide-file-input");
    const fileName = document.getElementById("studyguide-file-name");
    const generateStudyGuideButton = document.getElementById("generate-studyguide-button");
    const uploadContainer = document.getElementById("studyguide-upload-container");

    let selectedFile = null;

    // Handle file selection
    if (fileInput) {
      fileInput.addEventListener("change", (event) => {
        selectedFile = event.target.files[0];
        if (selectedFile && fileName) {
          fileName.textContent = `Selected: ${selectedFile.name}`;
          generateStudyGuideButton.style.display = "block";
        }
      });
    }

    // Handle drag and drop
    if (uploadContainer) {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, preventDefaults, false);
      });

      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      ["dragenter", "dragover"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, highlight, false);
      });

      ["dragleave", "drop"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, unhighlight, false);
      });

      function highlight() {
        uploadContainer.style.borderColor = "#a78bfa";
        uploadContainer.style.backgroundColor = "rgba(167, 139, 250, 0.1)";
      }

      function unhighlight() {
        uploadContainer.style.borderColor = "#e5e7eb";
        uploadContainer.style.backgroundColor = "";
      }

      uploadContainer.addEventListener("drop", handleDrop, false);

      function handleDrop(e) {
        const dt = e.dataTransfer;
        selectedFile = dt.files[0];
        if (selectedFile && fileName) {
          fileName.textContent = `Selected: ${selectedFile.name}`;
          generateStudyGuideButton.style.display = "block";
        }
      }
    }

    // Handle "Generate Study Guide" button click
    if (generateStudyGuideButton) {
      generateStudyGuideButton.addEventListener("click", async () => {
        animateButtonClick(generateStudyGuideButton);
        console.log("Generating study guide...");

        if (!selectedFile) {
          console.error("No file selected for study guide generation.");
          return;
        }

        try {
          generateStudyGuideButton.disabled = true;
          generateStudyGuideButton.textContent = "Uploading...";

          const formData = new FormData();
          formData.append("file", selectedFile);

          const promptInput = document.getElementById("studyguide-prompt");
          const promptText = promptInput ? promptInput.value : "";

          formData.append("description", JSON.stringify({
            prompt: promptText || "Generate a study guide from this file",
          }));

          const response = await fetch("https://wufhalwuhlwauhflu.online/generate-studyguide", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const responseData = await response.json();
            console.log("Study guide data received:", responseData);

            if (fileName) {
              fileName.textContent = "Processing study guide data...";
              fileName.style.color = "green";
            }
            
            // Check if we have the expected data format
            if (responseData && responseData.title && Array.isArray(responseData.topics)) {
              // Call the sandbox function to create the study guide
              try {
                const result = await sandboxProxy.generateStudyGuide(responseData);
                console.log("Study guide creation result:", result);
                
                if (result.success) {
                  if (fileName) {
                    fileName.textContent = "Study guide created successfully!";
                    fileName.style.color = "green";
                  }
                } else {
                  throw new Error(result.error || "Failed to create study guide");
                }
              } catch (sandboxError) {
                console.error("Error in sandbox function:", sandboxError);
                if (fileName) {
                  fileName.textContent = "Error creating study guide: " + (sandboxError.message || "Unknown error");
                  fileName.style.color = "red";
                }
              }
            } else {
              console.error("Invalid study guide data format:", responseData);
              if (fileName) {
                fileName.textContent = "Invalid study guide data received from server";
                fileName.style.color = "red";
              }
            }
          } else {
            throw new Error(`Server responded with status ${response.status}`);
          }
        } catch (error) {
          console.error("Failed to generate study guide:", error);
          if (fileName) {
            fileName.textContent = "Study guide generation failed: " + error.message;
            fileName.style.color = "red";
          }
        } finally {
          generateStudyGuideButton.disabled = false;
          generateStudyGuideButton.textContent = "Generate Study Guide";
        }
      });
    }
  }

  function setupSlides() {
    const fileInput = document.getElementById("slides-file-input");
    const fileName = document.getElementById("slides-file-name");
    const generateSlidesButton = document.getElementById("generate-slides-button");
    const uploadContainer = document.getElementById("slides-upload-container");

    let selectedFile = null;
    let textNodeId = null; // Store the text node ID for later reference
    let outlinePageId = null; // Store the page ID for later reference

    // Handle file selection
    if (fileInput) {
      fileInput.addEventListener("change", (event) => {
        selectedFile = event.target.files[0];
        if (selectedFile && fileName) {
          fileName.textContent = `Selected: ${selectedFile.name}`;
          generateSlidesButton.style.display = "block";
        }
      });
    }

    // Handle drag and drop
    if (uploadContainer) {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, preventDefaults, false);
      });

      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      ["dragenter", "dragover"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, highlight, false);
      });

      ["dragleave", "drop"].forEach((eventName) => {
        uploadContainer.addEventListener(eventName, unhighlight, false);
      });

      function highlight() {
        uploadContainer.style.borderColor = "#a78bfa";
        uploadContainer.style.backgroundColor = "rgba(167, 139, 250, 0.1)";
      }

      function unhighlight() {
        uploadContainer.style.borderColor = "#e5e7eb";
        uploadContainer.style.backgroundColor = "";
      }

      uploadContainer.addEventListener("drop", handleDrop, false);

      function handleDrop(e) {
        const dt = e.dataTransfer;
        selectedFile = dt.files[0];
        if (selectedFile && fileName) {
          fileName.textContent = `Selected: ${selectedFile.name}`;
          generateSlidesButton.style.display = "block";
        }
      }
    }

    // Handle Generate button click (initially "Generate Outline", later "Generate Slides")
    if (generateSlidesButton) {
      // Set initial button text to "Generate Outline"
      generateSlidesButton.textContent = "Generate Outline";
      
      generateSlidesButton.addEventListener("click", async () => {
        animateButtonClick(generateSlidesButton);
        
        // Check if we're generating outline or slides based on button text
        const isGeneratingOutline = generateSlidesButton.textContent === "Generate Outline";
        
        console.log(isGeneratingOutline ? "Generating outline..." : "Generating slides...");

        if (!selectedFile) {
          console.error("No file selected.");
          return;
        }

        try {
          generateSlidesButton.disabled = true;
          generateSlidesButton.textContent = "Uploading...";

          const formData = new FormData();
          formData.append("file", selectedFile);

          const promptInput = document.getElementById("slides-prompt");
          const promptText = promptInput ? promptInput.value : "";

          formData.append("description", JSON.stringify({
            prompt: promptText || "Generate outline from this file",
          }));

          if (isGeneratingOutline) {
            // Call the generate-outline endpoint
            const response = await fetch("https://wufhalwuhlwauhflu.online/generate-outline", {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const outlineData = await response.json();
              console.log("Outline data received:", outlineData);

              if (fileName) {
                fileName.textContent = "Outline received successfully!";
                fileName.style.color = "green";
              }
              
              // Call the sandbox function to generate the outline in the document
              const result = await sandboxProxy.generateOutline(outlineData);
              console.log("Outline creation result:", result);
              
              if (result.success) {
                // Store the text node ID and page ID for later use
                textNodeId = result.textNodeId;
                outlinePageId = result.pageId;
                
                // Change button text to "Generate Slides" for next step
                generateSlidesButton.textContent = "Generate Slides";
                
                if (fileName) {
                  fileName.textContent = "Outline created successfully! Click 'Generate Slides' to continue.";
                }
              } else {
                throw new Error(result.error || "Failed to create outline");
              }
            } else {
              throw new Error(`Server responded with status ${response.status}`);
            }
          } else {
            // Now we're generating slides using the outline
            console.log("Generating slides from outline. Using text node ID:", textNodeId, "and page ID:", outlinePageId);
            
            try {
              // First, get the outline text content from the text node
              const outlineResult = await sandboxProxy.getOutlineText(textNodeId, outlinePageId);
              
              if (!outlineResult.success) {
                throw new Error(outlineResult.error || "Failed to get outline text");
              }
              
              console.log("Retrieved outline text:", outlineResult.textContent);
              
              // Now call the backend to generate slides with the outline
              const formData = new FormData();
              formData.append("file", selectedFile);
              
              const promptInput = document.getElementById("slides-prompt");
              const promptText = promptInput ? promptInput.value : "";
              
              // Add the outline text to the description JSON
              formData.append("description", JSON.stringify({
                prompt: promptText || "Generate slides from this outline",
                outline: outlineResult.textContent  // Add the outline text here
              }));
              
              // Update UI
              generateSlidesButton.textContent = "Generating...";
              
              // Call the generate-slidedeck backend endpoint
              const response = await fetch("https://wufhalwuhlwauhflu.online/generate-slidedeck", {
                method: "POST",
                body: formData,
              });
              
              if (response.ok) {
                const responseData = await response.json();
                console.log("Slides data received:", responseData);
                
                if (fileName) {
                  fileName.textContent = "Generating slides in document...";
                  fileName.style.color = "green";
                }
                
                // Rather than create all slides at once and then add images,
                // we'll create each slide and add its image immediately if it has one
                const allSlides = responseData.slides || [];
                let totalCreatedSlides = 0;
                
                // Process slides one by one
                for (let i = 0; i < allSlides.length; i++) {
                  const slide = allSlides[i];
                  
                  // Create a single slide
                  const singleSlideResult = await sandboxProxy.generateSingleSlide(slide, i, allSlides.length);
                  console.log(`Created slide ${i+1}:`, singleSlideResult);
                  
                  if (singleSlideResult.success) {
                    totalCreatedSlides++;
                    
                    // If the slide has an image, render it right now while we're still on this page
                    if (slide.image) {
                      console.log(`Rendering image for slide ${i+1}:`, slide.image);
                      try {
                        await renderLatexImage(slide.image);
                      } catch (imgError) {
                        console.error("Error rendering slide image:", imgError);
                      }
                    }
                  }
                }
                
                const slidesResult = {
                  success: totalCreatedSlides > 0,
                  pageCount: totalCreatedSlides,
                  message: `Created ${totalCreatedSlides} slides`
                };
                console.log("Slides creation result:", slidesResult);
                
                if (slidesResult.success) {
                  if (fileName) {
                    fileName.textContent = `Created ${slidesResult.pageCount} slides successfully!`;
                  }
                } else {
                  throw new Error(slidesResult.error || "Failed to create slides");
                }
              } else {
                throw new Error(`Server responded with status ${response.status}`);
              }
            } catch (error) {
              console.error("Error generating slides:", error);
              if (fileName) {
                fileName.textContent = "Slide generation error: " + error.message;
                fileName.style.color = "red";
              }
            } finally {
              generateSlidesButton.textContent = "Generate Slides";
            }
          }
        } catch (error) {
          console.error("Operation failed:", error);
          if (fileName) {
            fileName.textContent = "Operation failed: " + error.message;
            fileName.style.color = "red";
          }
        } finally {
          generateSlidesButton.disabled = false;
          // Don't reset button text here as we want to preserve the state change from "Generate Outline" to "Generate Slides"
        }
      });
    }
  }

  // Buttons are now permanently visible, so no need for a toggle function
  
  // Function to render LaTeX image in the document
  async function renderLatexImage(latexImageUrl) {
    try {
      // STEP 1: Use the provided LaTeX rendered image URL
      const svgUrl = latexImageUrl;
      
      // STEP 2: Fetch the SVG as a Blob
      const response = await fetch(svgUrl, { mode: "cors" });
      const blob = await response.blob();
      
      // STEP 3: Insert into Adobe Express document
      await addOnUISdk.app.document.addImage(blob, {
        title: "LaTeX Equation",
        author: "StudyGenius",
      });
      
      console.log("LaTeX image inserted into the canvas successfully!");
      return true;
    } catch (error) {
      console.error("Error inserting LaTeX image:", error);
      return false;
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