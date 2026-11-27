import { allowed, query, json } from '../../../lib/turso';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!await allowed()) return json({ error: 'Sign in required' }, 401);
    const url = new URL(request.url);
    const docId = (url.searchParams.get('doc') || '').trim();

    try {
        if (docId) {
            const page = Math.max(1, Math.min(500, Number(url.searchParams.get('page')) || 1));
            const pageSize = 6;
            const offset = (page - 1) * pageSize;

            const docs = await query('SELECT * FROM lp_documents WHERE id=? ORDER BY version DESC LIMIT 1', [docId]);
            if (!docs.length) return json({ error: 'Document not found' }, 404);
            const doc = docs[0];

            const countRows = await query(
                'SELECT count(*) AS total FROM lp_chunks WHERE document_id=? AND document_version=? AND length(trim(content)) > 20',
                [doc.id, doc.version]
            );
            const total = Number(countRows[0]?.total || 0);

            const passages = await query(
                'SELECT id, heading, page, start_line, end_line, content FROM lp_chunks WHERE document_id=? AND document_version=? AND length(trim(content)) > 20 ORDER BY id LIMIT ? OFFSET ?',
                [doc.id, doc.version, pageSize, offset]
            );

            return json({
                document: doc,
                passages,
                page,
                pageSize,
                total,
                totalPages: Math.max(1, Math.ceil(total / pageSize))
            });
        }

        const filter = (url.searchParams.get('q') || '').slice(0, 200);
        const rawCol = (url.searchParams.get('collection') || 'all').toLowerCase().trim();
        const validCols = new Set(['books', 'videos', 'nutritionfacts', 'pcrm']);
        const col = validCols.has(rawCol) ? rawCol : 'all';

        const countRows = await query('SELECT collection, count(*) AS n FROM lp_documents GROUP BY collection');
        const counts: Record<string, number> = { all: 0, books: 0, videos: 0, nutritionfacts: 0, pcrm: 0 };
        for (const r of countRows) {
            const k = String(r.collection || '').toLowerCase();
            const n = Number(r.n || 0);
            counts.all += n;
            if (k in counts) counts[k] = n;
        }

        const whereCol = col === 'all' ? '' : 'AND d.collection = ?';
        const args = col === 'all'
            ? ['%' + filter + '%', '%' + filter + '%']
            : ['%' + filter + '%', '%' + filter + '%', col];

        const documents = await query(
            `SELECT d.*, (SELECT count(*) FROM lp_chunks c WHERE c.document_id=d.id AND c.document_version=d.version AND length(trim(c.content)) > 20) AS passage_count FROM lp_documents d WHERE (d.title LIKE ? OR d.path LIKE ?) ${whereCol} ORDER BY d.collection, d.title LIMIT 60`,
            args
        );
        return json({ documents, counts, collection: col });
    } catch {
        return json({ error: 'Library unavailable' }, 503);
    }
}
