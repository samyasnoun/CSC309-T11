/*
 * controller.js
 *
 * CSC309 Tutorial 8 — Infinite Scrolling
 * Plain JavaScript only.
 */

// ---- State ----
let nextStartParagraph = 1;   // server expects the starting paragraph number
let isLoading = false;
let reachedEnd = false;

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  loadNextPage();                    // load paragraphs 1–5 on page load
  window.addEventListener('scroll', onScroll);
});

// ---- Helpers ----
function onScroll() {
  if (reachedEnd || isLoading) return;

  const scrolled = window.scrollY + window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;

  // close enough to the bottom → fetch more
  if (scrolled >= docHeight - 100) {
    loadNextPage();
  }
}

async function loadNextPage() {
  if (isLoading || reachedEnd) return;
  isLoading = true;

  try {
    const res = await fetch(`/text?paragraph=${nextStartParagraph}`);
    const payload = await res.json();

    // Render any paragraphs we received
    if (Array.isArray(payload.data) && payload.data.length > 0) {
      renderParagraphs(payload.data);
      // Next page should start after the last item we just rendered
      nextStartParagraph += payload.data.length;
    }

    // If the server says there is no next page, show end message and stop listening
    if (!payload.next || !Array.isArray(payload.data) || payload.data.length === 0) {
      reachedEnd = true;
      showEndMessage();
      window.removeEventListener('scroll', onScroll);
    }
  } catch (e) {
    // fail silently per spec (no requirement to show errors)
  } finally {
    isLoading = false;
  }
}

function renderParagraphs(paragraphs) {
  const container = document.getElementById('data');

  paragraphs.forEach(({ id, likes, content }) => {
    // <div id="paragraph_<id>">
    const wrapper = document.createElement('div');
    wrapper.id = `paragraph_${id}`;

    // <p>... <b>(Paragraph: id)</b></p>
    const p = document.createElement('p');
    // Content as text
    p.appendChild(document.createTextNode(content + ' '));
    const b = document.createElement('b');
    b.textContent = `(Paragraph: ${id})`;
    p.appendChild(b);

    // <button class="btn like">Likes: X</button>
    const btn = document.createElement('button');
    btn.className = 'btn like';
    btn.textContent = `Likes: ${likes}`;
    btn.addEventListener('click', () => likeParagraph(id, btn));

    wrapper.appendChild(p);
    wrapper.appendChild(btn);
    container.appendChild(wrapper);
  });
}

async function likeParagraph(paragraphId, buttonEl) {
  try {
    const res = await fetch('/text/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paragraph: paragraphId })
    });

    const payload = await res.json();
    // Update strictly from server response
    if (payload && payload.data && typeof payload.data.likes === 'number') {
      buttonEl.textContent = `Likes: ${payload.data.likes}`;
    }
  } catch (e) {
    // ignore errors as per spec
  }
}

function showEndMessage() {
  const container = document.getElementById('data');
  const p = document.createElement('p');
  const b = document.createElement('b');
  b.textContent = 'You have reached the end';
  p.appendChild(b);
  container.appendChild(p);
}