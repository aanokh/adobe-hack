import addOnUISdk from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";

addOnUISdk.ready.then(async () => {
    console.log("addOnUISdk is ready for use.");

    // Get the UI runtime.
    const { runtime } = addOnUISdk.instance;

    // Get the proxy object, which is required
    // to call the APIs defined in the Document Sandbox runtime
    // i.e., in the `code.js` file of this add-on.
    const sandboxProxy = await runtime.apiProxy("documentSandbox");

    // Set up animation for button click
    const animateButtonClick = (button) => {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    };

    // Blue rectangle button
    const createRectangleButton = document.getElementById("createRectangle");
    createRectangleButton.addEventListener("click", async event => {
        animateButtonClick(event.currentTarget);
        await sandboxProxy.createRectangle();
    });

    // Green rectangle button
    const createGreenRectangleButton = document.getElementById("createGreenRectangle");
    createGreenRectangleButton.addEventListener("click", async event => {
        animateButtonClick(event.currentTarget);
        await sandboxProxy.createGreenRectangle();
    });

    // Red rectangle button
    const createRedRectangleButton = document.getElementById("createRedRectangle");
    createRedRectangleButton.addEventListener("click", async event => {
        animateButtonClick(event.currentTarget);
        await sandboxProxy.createRedRectangle();
    });

    // Enable the buttons only when:
    // 1. `addOnUISdk` is ready,
    // 2. `sandboxProxy` is available, and
    // 3. `click` event listeners are registered.
    createRectangleButton.disabled = false;
    createGreenRectangleButton.disabled = false;
    createRedRectangleButton.disabled = false;

    // File upload functionality
    const fileInput = document.getElementById('file-input');
    const fileSelectButton = document.getElementById('file-select-button');
    const uploadButton = document.getElementById('upload-button');
    const fileName = document.getElementById('file-name');
    const uploadContainer = document.getElementById('upload-container');
    
    let selectedFile = null;

    // Handle file selection via button
    fileSelectButton.addEventListener('click', () => {
        fileInput.click();
    });

    // Update UI when file is selected
    fileInput.addEventListener('change', (event) => {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            fileName.textContent = `Selected: ${selectedFile.name}`;
            uploadButton.style.display = 'block';
        }
    });

    // Handle drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        uploadContainer.style.borderColor = '#2196f3';
        uploadContainer.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
    }

    function unhighlight() {
        uploadContainer.style.borderColor = '#ccc';
        uploadContainer.style.backgroundColor = '';
    }

    uploadContainer.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        selectedFile = dt.files[0];
        if (selectedFile) {
            fileName.textContent = `Selected: ${selectedFile.name}`;
            uploadButton.style.display = 'block';
        }
    }

    // Handle file upload to backend
    uploadButton.addEventListener('click', async () => {
        if (!selectedFile) {
            return;
        }

        try {
            animateButtonClick(uploadButton);
            uploadButton.disabled = true;
            uploadButton.textContent = 'Uploading...';

            const formData = new FormData();
            formData.append('file', selectedFile);

            try {
                const response = await fetch('https://wufhalwuhlwauhflu.online/upload-syllabus', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    // Parse the JSON response from the server
                    const responseData = await response.json();
                    
                    // Display upload success message
                    fileName.textContent = 'Upload successful!';
                    fileName.style.color = 'green';
                    
                    // Create a text element to display the response message
                    try {
                        await sandboxProxy.displayServerMessage(responseData.message || "Upload successful!");
                    } catch (displayError) {
                        console.error("Display error:", displayError);
                    }
                    
                    setTimeout(() => {
                        fileName.textContent = '';
                        fileName.style.color = '#444';
                        uploadButton.style.display = 'none';
                        fileInput.value = '';
                        selectedFile = null;
                    }, 5000);
                } else {
                    throw new Error(`Server responded with ${response.status}`);
                }
            } catch (error) {
                console.error(error);
                throw error;
            }
        } catch (error) {
            console.error(error);
            fileName.textContent = 'Upload failed: ' + error.message;
            fileName.style.color = 'red';
        } finally {
            uploadButton.disabled = false;
            uploadButton.textContent = 'Upload File';
        }
    });
});
