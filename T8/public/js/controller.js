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
const NUM_PARAGRAPHS_PER_REQUEST = 5;

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
        console.log('Skipping load: isLoading=', isLoading, 'hasMoreContent=', hasMoreContent);
        return;
    }
    
    isLoading = true;
    console.log(`Loading paragraphs starting from ${currentParagraph}`);
    
    try {
        const response = await fetch(`/text?paragraph=${currentParagraph}`);
        const result = await response.json();
        
        if (response.ok) {
            // Only render if we have data
            if (result.data && result.data.length > 0) {
                console.log(`Loaded ${result.data.length} paragraphs, hasMore: ${result.next}`);
                renderParagraphs(result.data);
                
                // Update state
                currentParagraph += result.data.length;
                hasMoreContent = result.next;
                
                // Additional protection: if we get fewer paragraphs than expected, 
                // we've reached the end
                if (result.data.length < NUM_PARAGRAPHS_PER_REQUEST) {
                    hasMoreContent = false;
                }
                
                // If no more content, show end message and stop all loading
                if (!hasMoreContent) {
                    console.log('No more content, showing end message');
                    showEndMessage();
                    // Remove scroll listener to prevent any further loads
                    window.removeEventListener('scroll', handleScroll);
                    // Set hasMoreContent to false to prevent any race conditions
                    hasMoreContent = false;
                }
            } else {
                // No data returned, mark as no more content
                console.log('No data returned, marking as no more content');
                hasMoreContent = false;
                showEndMessage();
                window.removeEventListener('scroll', handleScroll);
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
    // Disable button during request to prevent multiple clicks
    buttonElement.disabled = true;
    const originalText = buttonElement.textContent;
    buttonElement.textContent = 'Liking...';
    
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
            buttonElement.textContent = originalText;
        }
    } catch (error) {
        console.error('Error liking paragraph:', error);
        buttonElement.textContent = originalText;
    } finally {
        buttonElement.disabled = false;
    }
}

// Function to handle scroll events for infinite scrolling
function handleScroll() {
    // Check if user has scrolled to the bottom of the page
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 5) {
        // Load more content if available and enough time has passed since last load
        const now = Date.now();
        if (hasMoreContent && !isLoading && (now - lastLoadTime) > 200) {
            lastLoadTime = now;
            console.log('Scroll triggered load request');
            loadParagraphs();
        }
    }
}

// Function to show end message when no more content is available
function showEndMessage() {
    const dataContainer = document.getElementById('data');
    
    // Check if end message already exists to avoid duplicates
    if (dataContainer.querySelector('.end-message')) {
        return;
    }
    
    const endDiv = document.createElement('div');
    endDiv.className = 'end-message';
    endDiv.innerHTML = '<b>You have reached the end</b>';
    
    dataContainer.appendChild(endDiv);
}