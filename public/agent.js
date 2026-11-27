// LP Insight research agent client. Replaces ask() with a streaming agent call and renders cited, structured answers.
// Add ?classic to the address to use the previous fixed pipeline instead.
(() => {
  if (new URLSearchParams(location.search).has('classic')) return;
  const classicRender = renderAnswer;

  // --- safe inline formatting: **bold**, *italic*; everything else stays text ---
  function appendInline(parent, text) {
    const pattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
    let last = 0;
    for (const m of text.matchAll(pattern)) {
      if (m.index > last) parent.append(document.createTextNode(text.slice(last, m.index)));
      const el = document.createElement(m[0].startsWith('**') ? 'strong' : 'em');
      el.textContent = m[0].replace(/^\*+|\*+$/g, '');
      parent.append(el);
      last = m.index + m[0].length;
    }
    if (last < text.length) parent.append(document.createTextNode(text.slice(last)));
  }

  function appendAgentSentence(parent, sentence, sources, docOrder) {
    appendInline(parent, sentence.text);
    for (const entries of citationGroups(sentence.evidence || [], sources)) {
      const source = entries[0].source, index = docOrder.indexOf(source.document_id) + 1;
      if (index < 1) continue;
      const button = document.createElement('button');
      button.className = 'citation';
      button.textContent = '[' + index + ']';
      button.title = 'View supporting passage: ' + source.title;
      button.setAttribute('aria-label', 'Source ' + index + ': ' + source.title);
      button.onclick = () => showCloudSourceGroup(entries);
      parent.append(document.createTextNode(' '), button);
    }
  }

  function plainText(result, docOrder) {
    const lines = [];
    const text = i => result.sentences[i].text;
    for (const b of result.blocks || []) {
      if (b.t === 'h') lines.push('', b.text.toUpperCase());
      else if (b.t === 'p') lines.push(b.i.map(text).join(' '));
      else b.items.forEach((item, n) => lines.push((b.t === 'ol' ? (n + 1) + '. ' : '- ') + item.map(text).join(' ')));
    }
    if (result.citations?.length) {
      lines.push('', 'SOURCES');
      docOrder.forEach((id, n) => { const c = result.citations.find(x => x.document_id === id); if (c) lines.push('[' + (n + 1) + '] ' + c.title + (c.source_url ? ' — ' + c.source_url : '')); });
    }
    return lines.join('\n').trim();
  }

  function renderAgentAnswer(answer, result) {
    answer.replaceChildren();
    const label = document.createElement('div');
    label.className = 'answer-label';
    label.textContent = 'LP Insight';
    answer.append(label);
    if (result.status !== 'answered') {
      const p = document.createElement('p');
      p.textContent = result.message || 'No answer could be completed.';
      answer.append(p);
      return;
    }
    const sources = new Map((result.citations || []).map(c => [c.id, c]));
    const docOrder = [];
    for (const s of result.sentences) for (const e of s.evidence || []) { const c = sources.get(e.source_id); if (c && !docOrder.includes(c.document_id)) docOrder.push(c.document_id); }
    const citations = [...(result.citations || [])].sort((a, b) => docOrder.indexOf(a.document_id) - docOrder.indexOf(b.document_id));
    const sentenceInto = (parent, indexes) => indexes.forEach((i, n) => { if (n) parent.append(document.createTextNode(' ')); appendAgentSentence(parent, result.sentences[i], sources, docOrder); });
    for (const b of result.blocks || []) {
      if (b.t === 'h') { const h = document.createElement('h3'); h.textContent = b.text; answer.append(h); }
      else if (b.t === 'p') { const p = document.createElement('p'); p.className = 'grounded-sentence'; sentenceInto(p, b.i); answer.append(p); }
      else { const list = document.createElement(b.t); list.className = 'agent-list'; for (const item of b.items) { const li = document.createElement('li'); sentenceInto(li, item); list.append(li); } answer.append(list); }
    }
    if (result.next_questions?.length) {
      const wrap = document.createElement('div');
      wrap.className = 'next-questions';
      const l = document.createElement('small');
      l.className = 'muted';
      l.textContent = 'Ask next:';
      wrap.append(l);
      const ul = document.createElement('ul');
      for (const q of result.next_questions) {
        const li = document.createElement('li'), button = document.createElement('button');
        button.type = 'button'; button.className = 'followup-link'; button.textContent = q;
        button.onclick = () => { if (!answering) ask(q); };
        li.append(button); ul.append(li);
      }
      wrap.append(ul); answer.append(wrap);
    }
    renderSources(answer, citations, 'Sources', result.sentences);
    const tools = document.createElement('div');
    tools.className = 'agent-tools';
    const copy = document.createElement('button');
    copy.type = 'button'; copy.textContent = 'Copy answer with sources';
    copy.onclick = async () => { try { await navigator.clipboard.writeText(plainText(result, docOrder)); copy.textContent = 'Copied'; } catch { copy.textContent = 'Copy failed'; } setTimeout(() => { copy.textContent = 'Copy answer with sources'; }, 2000); };
    tools.append(copy);
    answer.append(tools);
    if (result.agent?.steps?.length) {
      const details = document.createElement('details');
      details.className = 'agent-trace';
      const summary = document.createElement('summary');
      summary.textContent = 'How this was researched (' + result.agent.steps.length + ' searches' + (result.agent.seconds ? ', ' + result.agent.seconds + 's' : '') + ')';
      const ol = document.createElement('ol');
      for (const s of result.agent.steps) { const li = document.createElement('li'); li.textContent = s; ol.append(li); }
      details.append(summary, ol);
      answer.append(details);
    }
    const note = document.createElement('small');
    note.className = 'muted answer-note';
    note.textContent = result.message || '';
    answer.append(note);
  }

  renderAnswer = function (answer, result, context, root) {
    if (result && result.mode === 'agent') return renderAgentAnswer(answer, result);
    return classicRender(answer, result, context, root);
  };

  // --- streaming transport ---
  async function streamAgent(body, onEvent) {
    const response = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!(response.headers.get('content-type') || '').includes('x-ndjson')) {
      const data = await response.json().catch(() => ({}));
      throw Object.assign(Error(data.error || 'Answer unavailable'), { saved: data });
    }
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let buffer = '', final;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let at;
      while ((at = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, at); buffer = buffer.slice(at + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === 'final') final = event.result;
        else if (event.type === 'error') throw Object.assign(Error(event.error), { saved: event });
        else onEvent(event);
      }
    }
    if (!final) throw Error('The answer was interrupted. Please retry.');
    return final;
  }

  ask = async function (q) {
    if (answering || window.lpSavedChats?.loading()) return;
    answering = true; view('chat'); $('welcome').hidden = true;
    const user = document.createElement('div'); user.className = 'message user'; user.textContent = q;
    const answer = document.createElement('div'); answer.className = 'message';
    const header = document.createElement('div'); header.className = 'agent-status'; header.textContent = 'Starting research…';
    const list = document.createElement('ul'); list.className = 'agent-steps'; list.setAttribute('aria-live', 'polite');
    answer.append(header, list);
    $('messages').append(user, answer); $('question').value = '';
    const submit = $('askForm').querySelector('button[type="submit"]') || $('askForm').querySelector('button');
    if (submit) submit.disabled = true;
    const items = new Map();
    const onEvent = event => {
      if (event.type === 'status') header.textContent = event.text;
      else if (event.type === 'step') { const li = document.createElement('li'); li.textContent = event.label; items.set(event.id, li); list.append(li); li.scrollIntoView({ block: 'nearest' }); }
      else if (event.type === 'step_done') { const li = items.get(event.id); if (li) { li.classList.add('done'); li.textContent += ' — ' + event.summary; } }
    };
    try {
      const saved = window.lpSavedChats ? await window.lpSavedChats.prepare() : undefined;
      let semantic;
      try {
        if (!window.lpQuestionVector) await import('/semantic-client.js').catch(() => {});
        const lastQuestion = chatHistory.at(-1)?.q;
        const searchText = q.split(/\s+/).length < 8 && lastQuestion ? lastQuestion + ' ' + q : q;
        // Meaning-based search is a bonus: never make the agent wait more than a few seconds for the browser model.
        const vector = window.lpQuestionVector ? window.lpQuestionVector(searchText, message => { header.textContent = message; }).catch(() => undefined) : undefined;
        semantic = vector ? await Promise.race([vector, new Promise(resolve => setTimeout(resolve, 6000))]) : undefined;
      } catch { semantic = undefined; }
      const messages = chatHistory.slice(-4).flatMap(h => [{ role: 'user', text: h.q }, { role: 'assistant', text: h.a }]);
      const result = await streamAgent({ question: q, ...(saved || {}), ...(semantic ? { semantic } : {}), messages }, onEvent);
      if (result.savedTurn && window.lpSavedChats) await window.lpSavedChats.completed(result);
      clarificationContext = undefined;
      if (result.status === 'answered') {
        const plain = result.sentences.map(s => s.text).join(' ');
        chatHistory.push({ q: q.slice(0, 300), a: plain.slice(0, 600) });
        if (chatHistory.length > 6) chatHistory.shift();
      }
      renderAnswer(answer, result);
      if (result.persistenceError) { const warning = document.createElement('p'); warning.className = 'save-error'; warning.textContent = result.persistenceError; answer.append(warning); }
    } catch (e) {
      if (e.saved?.savedTurn && window.lpSavedChats) await window.lpSavedChats.completed(e.saved).catch(() => {});
      answer.replaceChildren();
      const p = document.createElement('p'); p.textContent = e.message || 'Answer unavailable. Please retry.'; answer.append(p);
    } finally {
      answering = false; if (submit) submit.disabled = false;
    }
    (answer.previousElementSibling || answer).scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const fine = document.querySelector('.fine');
  if (fine) fine.textContent = 'LP Insight researches the library, PubMed and MedlinePlus, then cites its sources. Check citations before acting.';
})();
