export const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content"><title>LP Insight — Answers from the Living Plus library</title><link rel="stylesheet" href="style.css"></head>
<body>
<aside id="sidebar">
<button id="closeChatSidebar" class="close-chat-sidebar" aria-label="Close menu">✕ Close</button>
<a class="brand" href="/"><span class="logo">lp</span> Insight</a>
<button id="newChat" class="primary new-chat">＋ New chat</button>
<section class="chat-history" aria-label="Your chats"><h2>Your chats</h2><div id="savedChats"></div></section>
<div class="profile account-profile"><div><strong id="accountName">Your account</strong><small id="accountEmail"></small></div><form method="post" action="/api/logout"><button>Sign out</button></form></div>
</aside>
<button id="sidebarBackdrop" class="sidebar-backdrop" aria-label="Close chat menu" hidden></button>
<main>
<header>
<button id="toggleChats" aria-controls="sidebar" aria-expanded="false">☰ Chats</button>
<nav class="tabs" aria-label="Sections"><button class="nav active" data-view="chat">Ask</button><button class="nav" data-view="library">Library <span id="count">0</span></button><button class="nav" data-view="research">Research</button></nav>
<span id="viewTitle" hidden>Ask your library</span><button id="importTop" hidden>Browse sources</button>
</header>
<section id="chatView">
<div id="chatScroll">
<div id="welcome">
<h1>What would you like to know?</h1>
<p>Ask a question in your own words. LP Insight uses the Living Plus library, available PubMed evidence and MedlinePlus health information, with citations you can inspect.</p>
<div class="suggest-label">Try one of these</div>
<div class="suggestions">
<button data-q="What does the library say about intermittent fasting?">What does the library say about intermittent fasting?</button>
<button data-q="Why is sleep important for blood sugar control?">Why is sleep important for blood sugar control?</button>
<button data-q="Make a plant-based protocol to improve my sleep and morning energy.">Make a plant-based protocol to improve sleep and morning energy</button>
<button data-q="Which books or videos in the library talk about cortisol?">Which books or videos talk about cortisol?</button>
</div>
<ol class="steps"><li><b>1. Ask</b>Type a question or request a plan.</li><li><b>2. Read</b>You get a clear answer with the reasoning.</li><li><b>3. Check</b>Click [1], [2]… to see the exact source.</li></ol>
<div class="empty-hint" id="emptyHint" hidden></div>
</div>
<div id="chatActions" hidden><button id="renameChat">Rename chat</button> <button id="deleteChat">Delete chat</button></div>
<button id="olderMessages" hidden>Load earlier messages</button>
<div id="messages" aria-live="polite"></div>
</div>
<div class="composer-wrap"><form id="askForm"><textarea disabled id="question" placeholder="Ask a question about the library…" rows="2" aria-label="Your question" required></textarea><div class="composer-bottom"><span>▤ <span id="readyCount">0 sources ready</span><span class="keyboard-hint"> · Enter to send</span></span><button disabled class="send" aria-label="Send question">↑</button></div></form><p id="chatSaveStatus" class="muted" role="status"></p><p class="fine">Answers come only from the library.</p></div>
</section>
<section id="libraryView" hidden>
<div class="library-head"><h1>Library</h1><p>Everything the assistant can use. Type a title to search, then preview a passage. To add or update sources, ask your administrator.</p></div>
<div class="drop" id="drop" hidden><strong>＋ Add your knowledge</strong><p>Choose .md files or drop them here.</p><button id="choose" class="primary">Choose Markdown files</button><button id="chooseFolder">Choose a folder</button></div>
<div class="library-toolbar"><input id="filter" type="search" placeholder="Search library titles…" aria-label="Search library titles"><button id="clear" hidden>Clear library</button></div>
<div id="libraryList"></div>
<p id="importStatus" role="status"></p>
</section>
<section id="researchView" hidden>
<div class="library-head"><h1>Scientific research</h1><p>Search PubMed research or MedlinePlus health-topic summaries without generating an AI answer.</p></div>
<label for="researchProvider">Source</label><select id="researchProvider"><option value="pubmed">PubMed research</option><option value="medlineplus">MedlinePlus health information</option></select>
<form id="researchForm"><label for="researchQuery">Scientific topic (no identifying patient details)</label><div class="library-toolbar"><input id="researchQuery" type="search" minlength="3" maxlength="240" placeholder="For example: caffeine sleep" required><button type="submit" class="primary">Search</button></div></form>
<p id="researchStatus" role="status"></p><div id="researchResults"></div>
<p class="muted">PubMed supplies abstracts; MedlinePlus.gov supplies health-topic summaries. Linked pages and full journal articles are not retrieved. Sources do not endorse this app. Abstracts may be copyrighted. <a href="https://www.ncbi.nlm.nih.gov/About/disclaimer.html" target="_blank" rel="noopener noreferrer">NCBI disclaimer and copyright</a>.</p>
</section>
</main>
<dialog id="sourceDialog"><div class="dialog-header"><div><div class="eyebrow">Source passage</div><h2 id="sourceTitle"></h2></div><button id="closeDialog" aria-label="Close source">✕</button></div><p id="sourceLocation"></p><pre id="sourceText"></pre></dialog>
<input type="file" id="files" accept=".md,.markdown" multiple hidden><input type="file" id="folder" webkitdirectory multiple hidden>
<script src="app.js"></script><script src="chats.js"></script><script src="ui.js"></script><script src="research.js"></script><script src="agent.js"></script>
</body></html>
`;
