export const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content"><title>LP Insight — ClinicLivingPlus Clinical Intelligence</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="style.css"></head>
<body>
<aside id="sidebar">
<button id="closeChatSidebar" class="close-chat-sidebar" aria-label="Close menu">✕ Close</button>
<a class="brand" href="/"><span class="logo">lp</span><span>Insight<small class="brand-sub">ClinicLivingPlus</small></span></a>
<button id="newChat" class="primary new-chat">＋ New chat</button>
<section class="chat-history" aria-label="Your chats"><h2>Your chats</h2><div id="savedChats"></div></section>
<div class="profile account-profile"><div class="profile-meta"><strong id="accountName">Your account</strong><small id="accountEmail"></small></div><form method="post" action="/api/logout"><button>Sign out</button></form></div>
</aside>
<button id="sidebarBackdrop" class="sidebar-backdrop" aria-label="Close chat menu" hidden></button>
<main>
<header>
<button id="toggleChats" aria-controls="sidebar" aria-expanded="false">☰ Chats</button>
<nav class="tabs" aria-label="Sections"><button class="nav active" data-view="chat">Ask</button><button class="nav" data-view="library">Library <span id="count">0</span></button><button class="nav" data-view="research">Research</button></nav>
<div class="header-right"><span class="live-pill"><span class="live-dot"></span>Clinical Library Active</span><a href="/admin" class="admin-link">God View</a></div>
<span id="viewTitle" hidden>Ask your library</span><button id="importTop" hidden>Browse sources</button>
</header>
<section id="chatView">
<div id="chatScroll">
<div id="welcome">
<h1>What can I help you <span>research today?</span></h1>
<p class="hero-sub">Searches your 16,400+ Living Plus database first, then peer-reviewed scientific journals when needed.</p>
<div class="suggestions">
<button data-q="What does the library say about intermittent fasting?">Intermittent fasting</button>
<button data-q="Why is sleep important for blood sugar control?">Sleep &amp; blood sugar</button>
<button data-q="Make a plant-based protocol to improve my sleep and morning energy.">Sleep &amp; energy protocol</button>
<button data-q="Which books or videos in the library talk about cortisol?">Cortisol sources</button>
</div>
<div class="empty-hint" id="emptyHint" hidden></div>
</div>
<div id="chatActions" hidden><button id="renameChat">Rename chat</button> <button id="deleteChat">Delete chat</button></div>
<button id="olderMessages" hidden>Load earlier messages</button>
<div id="messages" aria-live="polite"></div>
</div>
<div class="composer-wrap"><form id="askForm"><textarea disabled id="question" placeholder="Ask any clinical, health, or nutrition question…" rows="2" aria-label="Your question" required></textarea><div class="composer-bottom"><span>▤ <span id="readyCount">0 sources ready</span><span class="keyboard-hint"> · Enter to send</span></span><button disabled class="send" aria-label="Send question">↑</button></div></form><p id="chatSaveStatus" class="muted" role="status"></p><p class="fine">Answers from your Living Plus database first, then scientific journals · Private to your account.</p></div>
</section>
<section id="libraryView" hidden>
<div id="libraryBrowse">
<div class="library-head"><h1>Library</h1><p>Browse and read your 16,400+ Living Plus books, PDFs, YouTube transcripts, and website articles.</p></div>
<div class="drop" id="drop" hidden><strong>＋ Add your knowledge</strong><p>Choose .md files or drop them here.</p><button id="choose" class="primary">Choose Markdown files</button><button id="chooseFolder">Choose a folder</button></div>
<div id="libraryCats" class="lib-cats" role="tablist" aria-label="Library categories">
<button type="button" class="lib-cat active" data-cat="all">All</button>
<button type="button" class="lib-cat" data-cat="books">Books &amp; PDFs</button>
<button type="button" class="lib-cat" data-cat="videos">YouTube Videos</button>
<button type="button" class="lib-cat" data-cat="nutritionfacts">NutritionFacts</button>
<button type="button" class="lib-cat" data-cat="pcrm">PCRM Website</button>
</div>
<div class="library-toolbar"><input id="filter" type="search" placeholder="Search titles in this category…" aria-label="Search library titles"><button id="clear" hidden>Clear library</button></div>
<div id="libraryList"></div>
<p id="importStatus" role="status"></p>
</div>
<article id="libraryReader" class="lib-reader" hidden></article>
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
