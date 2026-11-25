module.exports=[
 'CREATE TABLE IF NOT EXISTS lp_semantic_vectors(id INTEGER PRIMARY KEY,chunk_id INTEGER NOT NULL,document_version INTEGER NOT NULL,source_hash TEXT NOT NULL,start_char INTEGER NOT NULL,end_char INTEGER NOT NULL,embedding F32_BLOB(384))',
 "CREATE INDEX IF NOT EXISTS lp_semantic_idx ON lp_semantic_vectors(libsql_vector_idx(embedding,'compress_neighbors=float8','max_neighbors=16'))",
 'CREATE INDEX IF NOT EXISTS lp_semantic_parent_idx ON lp_semantic_vectors(chunk_id)',
 'CREATE TRIGGER IF NOT EXISTS lp_semantic_invalidate_update AFTER UPDATE ON lp_chunks WHEN old.content IS NOT new.content OR old.document_version IS NOT new.document_version OR old.document_id IS NOT new.document_id BEGIN DELETE FROM lp_semantic_vectors WHERE chunk_id=old.id; END',
 'CREATE TRIGGER IF NOT EXISTS lp_semantic_invalidate_delete AFTER DELETE ON lp_chunks BEGIN DELETE FROM lp_semantic_vectors WHERE chunk_id=old.id; END'
];
