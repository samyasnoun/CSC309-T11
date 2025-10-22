/*
 * controller.js
 *
 * CSC309 Tutorial 8 — Infinite Scrolling
 * Plain JavaScript only.
 */

let nextStartParagraph = 1;   
let isLoading = false;
let reachedEnd = false;

document.addEventListener('DOMContentLoaded', () => {
  loadNextPage();                    
  window.addEventListener('scroll', onScroll);
});

function onScroll() {
  if (reachedEnd || isLoading) return;
  const scrolled = window.scrollY + window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
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
    if (Array.isArray(payload.data) && payload.data.length > 0) {
      renderParagraphs(payload.data);
      nextStartParagraph += payload.data.length;
    }
    if (!payload.next || !Array.isArray(payload.data) || payload.data.length === 0) {
      reachedEnd = true;
      showEndMessage();
      window.removeEventListener('scroll', onScroll);
    }
  } catch (e) {
  } finally {
    isLoading = false;
  }
}

function renderParagraphs(paragraphs) {
  const container = document.getElementById('data');
  paragraphs.forEach(({ id, likes, content }) => {
    const wrapper = document.createElement('div');
    wrapper.id = `paragraph_${id}`;
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(content + ' '));
    const b = document.createElement('b');
    b.textContent = `(Paragraph: ${id})`;
    p.appendChild(b);
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
    if (payload && payload.data && typeof payload.data.likes === 'number') {
      buttonEl.textContent = `Likes: ${payload.data.likes}`;
    }
  } catch (e) {
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