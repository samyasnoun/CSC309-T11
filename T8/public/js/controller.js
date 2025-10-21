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
    
    isLoading = true;
    
    try {
        const response = await fetch(`/text?paragraph=${currentParagraph}`);
        const result = await response.json();
        
        if (response.ok) {
            // Only render if we have data and there's more content expected
            if (result.data && result.data.length > 0) {
                renderParagraphs(result.data);
                
                // Update state
                currentParagraph += result.data.length;
                hasMoreContent = result.next;
                
                // If no more content, show end message
                if (!hasMoreContent) {
                    showEndMessage();
                }
            } else {
                // No data returned, mark as no more content
                hasMoreContent = false;
                showEndMessage();
            }
        } else {
            console.error('Failed to load paragraphs:', result.message);
        }
    } catch (error) {
        console.error('Error loading paragraphs:', error);
    } finally {
        isLoading = false;
    }
}

// Function to render paragraphs in the DOM
function renderParagraphs(paragraphs) {
    const dataContainer = document.getElementById('data');
    
    paragraphs.forEach(paragraph => {
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
        
        // Append elements to paragraph div
        paragraphDiv.appendChild(paragraphContent);
        paragraphDiv.appendChild(likeButton);
        
        // Append paragraph div to data container
        dataContainer.appendChild(paragraphDiv);
    });
}

// Function to handle like button clicks
async function handleLikeClick(paragraphId, buttonElement) {
    try {
        const response = await fetch('/text/like', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paragraph: paragraphId })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Update the button text with new like count
            buttonElement.textContent = `Likes: ${result.data.likes}`;
        } else {
            console.error('Failed to like paragraph:', result.message);
        }
    } catch (error) {
        console.error('Error liking paragraph:', error);
    }
}

// Function to handle scroll events for infinite scrolling
function handleScroll() {
    // Check if user has scrolled to the bottom of the page
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 10) {
        // Load more content if available and enough time has passed since last load
        const now = Date.now();
        if (hasMoreContent && !isLoading && (now - lastLoadTime) > 500) {
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