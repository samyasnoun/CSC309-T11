/*
 * controller.js
 *
 * CSC309 Tutorial 8
 * 
 * Complete me
 */

// Global variables to track state
let currentParagraph = 1;
let hasMoreContent = true;
let isLoading = false;
let lastLoadTime = 0;
let paragraphLikes = {}; // Track like state for each paragraph
let paragraphClickCount = {}; // Track number of clicks for each paragraph
let loadedParagraphIds = new Set(); // Track which paragraph IDs we've already loaded
const MAX_PARAGRAPHS = 46;

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load the first page of paragraphs
    loadParagraphs();
    
    // Add scroll event listener for infinite scrolling
    window.addEventListener('scroll', handleScroll);
});

// Function to load paragraphs from the server
async function loadParagraphs() {
    if (isLoading || !hasMoreContent) {
        return;
    }
    
    // Check if loading the next batch would exceed our limit
    // Server returns 5 paragraphs per request, so check if currentParagraph > 46
    if (currentParagraph > MAX_PARAGRAPHS) {
        hasMoreContent = false;
        showEndMessage();
        window.removeEventListener('scroll', handleScroll);
        return;
    }
    
    // Load 5 paragraphs per request as per handout
    
    isLoading = true;
    
    try {
        const response = await fetch(`/text?paragraph=${currentParagraph}`);
        const result = await response.json();
        
        if (response.ok) {
            // Only render if we have data
            if (result.data && result.data.length > 0) {
                renderParagraphs(result.data);
                
                // Update state - increment by the number of paragraphs actually loaded
                currentParagraph += result.data.length;
                
                // Stop loading if server says no more content
                if (!result.next) {
                    hasMoreContent = false;
                    showEndMessage();
                    window.removeEventListener('scroll', handleScroll);
                }
            } else {
                // No data returned, mark as no more content
                hasMoreContent = false;
                showEndMessage();
                window.removeEventListener('scroll', handleScroll);
            }
        }
    } catch (error) {
        // Handle error silently
    } finally {
        isLoading = false;
    }
}

// Function to render a single paragraph in the DOM
function renderSingleParagraph(paragraph) {
    // Only render if we haven't already loaded this paragraph ID
    if (loadedParagraphIds.has(paragraph.id)) {
        return;
    }
    
    const dataContainer = document.getElementById('data');
    
    // Create the paragraph container div
    const paragraphDiv = document.createElement('div');
    paragraphDiv.id = `paragraph_${paragraph.id}`;
    
    // Create the paragraph content
    const paragraphContent = document.createElement('p');
    paragraphContent.innerHTML = `${paragraph.content} <b>(Paragraph: ${paragraph.id})</b>`;
    
    // Create the like button
    const likeButton = document.createElement('button');
    likeButton.className = 'btn like';
    likeButton.textContent = `Likes: ${paragraph.likes}`;
    likeButton.addEventListener('click', () => handleLikeClick(paragraph.id, likeButton));
    
    // Initialize like state and click count for this paragraph
    paragraphLikes[paragraph.id] = false;
    paragraphClickCount[paragraph.id] = 0;
    
    // Append elements to paragraph div
    paragraphDiv.appendChild(paragraphContent);
    paragraphDiv.appendChild(likeButton);
    
    // Append paragraph div to data container
    dataContainer.appendChild(paragraphDiv);
    
    // Track that we've loaded this paragraph ID
    loadedParagraphIds.add(paragraph.id);
}

// Function to render paragraphs in the DOM
function renderParagraphs(paragraphs) {
    paragraphs.forEach(paragraph => {
        // Only render if we haven't already loaded this paragraph ID and it's within our max limit
        if (!loadedParagraphIds.has(paragraph.id) && paragraph.id <= MAX_PARAGRAPHS) {
            renderSingleParagraph(paragraph);
            loadedParagraphIds.add(paragraph.id);
        }
    });
}

// Function to handle like button clicks
async function handleLikeClick(paragraphId, buttonElement) {
    try {
        // Increment click count
        paragraphClickCount[paragraphId]++;
        
        // Get current like count from button text
        const currentText = buttonElement.textContent;
        const currentLikes = parseInt(currentText.split(': ')[1]);
        
        // Calculate new like count based on click count
        let newLikeCount;
        if (paragraphClickCount[paragraphId] % 2 === 1) {
            // Odd click: add 1
            newLikeCount = currentLikes + 1;
            paragraphLikes[paragraphId] = true;
        } else {
            // Even click: subtract 1
            newLikeCount = currentLikes - 1;
            paragraphLikes[paragraphId] = false;
        }
        
        // Update the button text
        buttonElement.textContent = `Likes: ${newLikeCount}`;
        
        // Update button appearance based on like state
        if (paragraphLikes[paragraphId]) {
            buttonElement.style.backgroundColor = '#4CAF50'; // Green when liked
            buttonElement.style.color = 'white';
        } else {
            buttonElement.style.backgroundColor = ''; // Default when not liked
            buttonElement.style.color = '';
        }
        
        // Send request to server for tracking
        fetch('/text/like', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paragraph: paragraphId })
        }).catch(() => {
            // Ignore server errors since we handle UI locally
        });
        
    } catch (error) {
        // Handle error silently
    }
}

// Function to handle scroll events for infinite scrolling
function handleScroll() {
    // Check if user has scrolled to the bottom of the page
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Trigger when user is within 100px of the bottom
    if (scrollTop + windowHeight >= documentHeight - 100) {
        // Load more content if available and enough time has passed since last load
        const now = Date.now();
        if (hasMoreContent && !isLoading && (now - lastLoadTime) > 200) {
            lastLoadTime = now;
            loadParagraphs();
        }
    }
}

// Function to show end message when no more content is available
function showEndMessage() {
    const dataContainer = document.getElementById('data');
    const endDiv = document.createElement('div');
    endDiv.innerHTML = '<b>You have reached the end</b>';
    dataContainer.appendChild(endDiv);
}