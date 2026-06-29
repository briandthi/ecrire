// --- Markdown rendering (single-line, pas de patterns multi-lignes) ---

function renderMarkdown(text) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Titres
  html = html.replace(/^#### (.+)$/, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/, "<h1>$1</h1>");

  // Gras + italique combinés
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  // Gras
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italique
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Barré
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
  // Code inline
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Listes à puces (- ou *)
  html = html.replace(/^[-*]\s+(.+)$/, "<li>$1</li>");
  // Listes numérotées
  html = html.replace(/^\d+\.\s+(.+)$/, "<li>$1</li>");

  // Séparateur
  html = html.replace(/^---+$/, "<hr>");

  return html;
}

// --- Éditeur ---

const editor = document.getElementById("editor");
const status = document.getElementById("status");

let saveTimeout = null;
let currentEditingLine = null;

// Chargement initial
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/note");
    const text = await res.text();
    loadContent(text);
  } catch (e) {
    // Fichier vide ou erreur, on commence avec une ligne vide
    loadContent("");
  }
});

function loadContent(text) {
  editor.innerHTML = "";

  if (!text || text.trim() === "") {
    const line = createLine("");
    editor.appendChild(line);
    setEditing(line);
    placeCursorAtEnd(line);
    return;
  }

  const lines = text.split("\n");
  lines.forEach((lineText) => {
    const line = createLine(lineText);
    renderLine(line);
    editor.appendChild(line);
  });

  // Mettre la dernière ligne en mode édition
  const lastLine = editor.lastElementChild;
  if (lastLine) {
    setEditing(lastLine);
    placeCursorAtEnd(lastLine);
  }
}

function createLine(text) {
  const div = document.createElement("div");
  div.setAttribute("data-md", text);
  div.textContent = text;
  return div;
}

function renderLine(line) {
  const md = line.getAttribute("data-md") || "";
  if (md.trim() === "") {
    line.innerHTML = "<br>";
    return;
  }
  line.innerHTML = renderMarkdown(md);
  line.classList.remove("editing");
}

function setEditing(line) {
  // Quitter le mode édition de la ligne précédente
  if (currentEditingLine && currentEditingLine !== line) {
    commitLine(currentEditingLine);
  }

  currentEditingLine = line;
  const md = line.getAttribute("data-md") || "";
  line.textContent = md;
  line.classList.add("editing");

  // Ligne vide : s'assurer qu'il y a un <br> pour que le curseur fonctionne
  if (md === "") {
    line.innerHTML = "<br>";
  }
}

function commitLine(line) {
  if (!line || !line.parentNode) return;
  const text = getLineText(line);
  line.setAttribute("data-md", text);
  renderLine(line);
  if (line === currentEditingLine) {
    currentEditingLine = null;
  }
}

function getLineText(line) {
  // Récupérer le texte brut d'une ligne
  // Si la ligne est en mode editing, lire textContent
  // Sinon, lire data-md
  if (line.classList.contains("editing")) {
    return line.textContent || "";
  }
  return line.getAttribute("data-md") || "";
}

function placeCursorAtEnd(el) {
  el.focus();
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

// --- Gestion des événements ---

// Enter : valider la ligne courante, en créer une nouvelle
editor.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();

    const sel = window.getSelection();
    const currentLine = getCurrentLine(sel);
    if (!currentLine) return;

    // Récupérer le texte et la position du curseur
    const text = currentLine.textContent || "";
    const range = sel.getRangeAt(0);

    // Calculer l'offset texte dans la ligne
    const preRange = document.createRange();
    preRange.setStart(currentLine, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const offset = preRange.toString().length;

    // Texte avant et après le curseur
    const before = text.substring(0, offset);
    const after = text.substring(offset);

    // Mettre à jour la ligne courante avec le texte avant le curseur
    currentLine.setAttribute("data-md", before);
    currentLine.textContent = before;
    commitLine(currentLine);

    // Créer une nouvelle ligne avec le texte après le curseur
    const newLine = createLine(after);
    currentLine.insertAdjacentElement("afterend", newLine);
    setEditing(newLine);
    placeCursorAtEnd(newLine);

    scheduleSave();
  }
});

// Clic sur une ligne rendue : passer en mode édition
editor.addEventListener("click", (e) => {
  const line = getLineFromEvent(e);
  if (!line) return;

  if (line !== currentEditingLine) {
    setEditing(line);
    placeCursorAtEnd(line);
  }
});

// Input : déclencher la sauvegarde
editor.addEventListener("input", () => {
  // Mettre à jour le data-md de la ligne en cours d'édition
  if (currentEditingLine) {
    currentEditingLine.setAttribute(
      "data-md",
      currentEditingLine.textContent || ""
    );
  }
  scheduleSave();
});

// Backspace sur une ligne vide : fusionner avec la précédente
editor.addEventListener("keydown", (e) => {
  if (e.key === "Backspace") {
    const sel = window.getSelection();
    const currentLine = getCurrentLine(sel);
    if (!currentLine) return;

    const range = sel.getRangeAt(0);
    const preRange = document.createRange();
    preRange.setStart(currentLine, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const offset = preRange.toString().length;

    // Si on est au début de la ligne et qu'il y a une ligne précédente
    if (offset === 0 && currentLine.previousElementSibling) {
      e.preventDefault();
      const prevLine = currentLine.previousElementSibling;
      const prevText = prevLine.getAttribute("data-md") || "";
      const currentText = currentLine.textContent || "";

      // Fusionner les textes
      const mergedText = prevText + currentText;

      // Supprimer la ligne courante
      currentLine.remove();

      // Mettre la ligne précédente en mode édition avec le texte fusionné
      prevLine.setAttribute("data-md", mergedText);
      prevLine.textContent = mergedText;
      prevLine.classList.add("editing");
      currentEditingLine = prevLine;

      // Placer le curseur à la position de jonction
      placeCursorAtOffset(prevLine, prevText.length);

      scheduleSave();
    }
  }
});

function placeCursorAtOffset(el, offset) {
  el.focus();
  const textNode = el.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    placeCursorAtEnd(el);
    return;
  }
  const range = document.createRange();
  const sel = window.getSelection();
  const safeOffset = Math.min(offset, textNode.textContent.length);
  range.setStart(textNode, safeOffset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// --- Utilitaires ---

function getCurrentLine(sel) {
  if (!sel || sel.rangeCount === 0) return null;
  let node = sel.anchorNode;
  while (node && node !== editor) {
    if (node.parentNode === editor && node.nodeType === Node.ELEMENT_NODE) {
      return node;
    }
    node = node.parentNode;
  }
  return null;
}

function getLineFromEvent(e) {
  let node = e.target;
  while (node && node !== editor) {
    if (node.parentNode === editor && node.nodeType === Node.ELEMENT_NODE) {
      return node;
    }
    node = node.parentNode;
  }
  return null;
}

// --- Sauvegarde ---

function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(save, 500);
}

async function save() {
  const lines = Array.from(editor.children);
  const markdown = lines
    .map((line) => {
      if (line.classList.contains("editing")) {
        return line.textContent || "";
      }
      return line.getAttribute("data-md") || "";
    })
    .join("\n");

  try {
    await fetch("/api/note", {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: markdown,
    });
    showStatus("Sauvegardé");
  } catch (e) {
    showStatus("Erreur de sauvegarde");
  }
}

function showStatus(text) {
  status.textContent = text;
  status.classList.add("visible");
  setTimeout(() => {
    status.classList.remove("visible");
  }, 2000);
}
