// Private chat history is stored on the server, never in shared browser storage.
(() => {
    const el = id => document.getElementById(id);
    let active = null, revision = 0, loading = false, turns = [], older = false;
    const notice = message => { el('chatSaveStatus').textContent = message; };
    async function api(path, options) { const response = await fetch(path, { cache: 'no-store', ...options }); let data; try {
        data = await response.json();
    }
    catch {
        throw Error('Saved chats are unavailable. Please retry.');
    } if (response.status === 401) {
        location.href = '/login';
        throw Error('Please sign in again');
    } if (!response.ok)
        throw Error(data.error || 'Saved chats unavailable'); return data; }
    const write = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    function busy() { return loading || window.lpConversation.busy(); }
    async function list() { const data = await api('/api/chats'); const area = el('savedChats'); area.replaceChildren(); for (const chat of data.chats) {
        const row = document.createElement('div');
        row.className = 'saved-chat-row';
        const button = document.createElement('button');
        button.className = 'saved-chat' + (chat.id === active ? ' active' : '');
        button.textContent = chat.title;
        button.title = chat.title;
        button.onclick = () => open(chat.id).catch(e => notice(e.message));
        row.append(button);
        area.append(row);
    } if (!data.chats.length) {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = 'Your saved conversations will appear here.';
        area.append(p);
    } }
    function reset() { active = null; revision = 0; turns = []; older = false; window.lpConversation.restore({}); el('messages').replaceChildren(); el('welcome').hidden = false; el('chatActions').hidden = true; el('olderMessages').hidden = true; el('question').value = ''; history.replaceState(null, '', location.pathname); notice('New conversation. Your older chats remain in the sidebar.'); }
    async function hydrate(items) {
        const ids = [...new Set(items.flatMap(t => (t.result?.citations || []).map(c => c.id)))], sources = new Map();
        let next = 0;
        await Promise.all(Array.from({ length: Math.min(6, ids.length) }, async () => { while (next < ids.length) {
            const id = ids[next++];
            try {
                const metadata=items.flatMap(t=>t.result?.citations||[]).find(c=>c.id===id);
                const extra=metadata?.collection==='medlineplus'?'&medlinePath='+encodeURIComponent(metadata.path)+'&medlineTitle='+encodeURIComponent(metadata.title):'';
                const r = await fetch('/api/source?chunk=' + encodeURIComponent(id)+extra, { cache: 'no-store' });
                if (r.ok)
                    sources.set(id, await r.json());
            }
            catch { }
        } }));
        let unavailable = false;
        for (const turn of items)
            for (const c of turn.result?.citations || []) {
                const source = sources.get(c.id), quotes = (turn.result.sentences || []).flatMap(s => s.evidence || []).filter(e => e.source_id === c.id).map(e => e.quote);
                if (source && quotes.every(q => source.content.includes(q)))
                    c.content = source.content;
                else {
                    unavailable = true;
                    c.content = 'Saved quote snapshot only — the original passage is unavailable or has changed.\n\n' + quotes.join('\n\n');
                }
            }
        return unavailable;
    }
    function render() { el('messages').replaceChildren(); window.lpConversation.restore(turns[0]?.state || {}); for (const turn of turns)
        window.lpConversation.replay(turn); el('welcome').hidden = turns.length > 0; el('olderMessages').hidden = !older; el('chatActions').hidden = false; }
    async function open(id) { if (busy())
        return; loading = true; notice('Loading saved conversation…'); try {
        const data = await api('/api/chats?id=' + encodeURIComponent(id));
        const changed = await hydrate(data.turns);
        active = id;
        revision = Number(data.chat.revision);
        turns = data.turns;
        older = data.hasOlder;
        render();
        document.querySelector('[data-view="chat"]').click();
        history.replaceState(null, '', location.pathname + '#chat=' + id);
        await list();
        notice(changed ? 'Conversation reopened. Some original passages changed; those citations show saved quotes only.' : 'Conversation reopened. Follow-up context restored.');
        el('question').focus();
    }
    finally {
        loading = false;
    } }
    el('question').disabled = true;
    const initialSubmit = el('askForm').querySelector('button');
    initialSubmit.disabled = true;
    const ready = (async () => { try {
        const { user } = await api('/api/account');
        el('accountName').textContent = user.name;
        el('accountEmail').textContent = user.email;
        await list();
        const match = /^#chat=([a-f0-9-]{36})$/.exec(location.hash);
        if (match)
            await open(match[1]);
        else
            notice('Chats are private to your account.');
    }
    catch (e) {
        notice(e.message);
        throw e;
    }
    finally {
        el('question').disabled = false;
        initialSubmit.disabled = false;
    } })();
    ready.catch(() => { });
    window.lpSavedChats = { loading: () => loading, prepare: async () => { await ready; if (loading)
            throw Error('Wait for the conversation to load'); if (!active) {
            const chat = await api('/api/chats', write('POST', {}));
            active = chat.id;
            revision = 0;
            el('chatActions').hidden = false;
            history.replaceState(null, '', location.pathname + '#chat=' + active);
        } return { chatId: active, chatRevision: revision, chatState: window.lpConversation.snapshot() }; }, completed: async (result) => { if (result.savedTurn?.chatId === active) {
            revision = result.savedTurn.revision;
            notice(result.persistenceError || 'Conversation saved.');
            await list().catch(() => notice('Answer saved; sidebar could not refresh. Reopen it later.'));
        } } };
    el('newChat').onclick = () => { if (busy()) {
        notice('Wait for the current answer before switching conversations.');
        return;
    } reset(); list().catch(e => notice(e.message)); document.querySelector('[data-view="chat"]').click(); el('question').focus(); };
    el('olderMessages').onclick = async () => { if (busy() || !active)
        return; loading = true; try {
        const data = await api('/api/chats?id=' + active + '&before=' + turns[0].sequence);
        await hydrate(data.turns);
        turns = [...data.turns, ...turns];
        older = data.hasOlder;
        render();
    }
    catch (e) {
        notice(e.message);
    }
    finally {
        loading = false;
    } };
    el('renameChat').onclick = async () => { if (busy() || !active)
        return; const title = prompt('Conversation title (up to 120 characters)'); if (!title?.trim())
        return; try {
        await api('/api/chats', write('PATCH', { id: active, title }));
        await list();
    }
    catch (e) {
        notice(e.message);
    } };
    el('deleteChat').onclick = async () => { if (busy() || !active || !confirm('Delete this conversation and its messages permanently?'))
        return; try {
        await api('/api/chats', write('DELETE', { id: active }));
        reset();
        await list();
    }
    catch (e) {
        notice(e.message);
    } };
    el('closeChatSidebar').onclick = () => { document.body.classList.remove('show-chat-sidebar'); el('toggleChats').setAttribute('aria-expanded', 'false'); };
    el('toggleChats').onclick = () => { const open = document.body.classList.toggle('show-chat-sidebar'); el('toggleChats').setAttribute('aria-expanded', String(open)); };
})();
