export const statements = [
    `CREATE TABLE IF NOT EXISTS lp_users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,session_version INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS lp_chats(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,title TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 0,active_turn TEXT,lease_until INTEGER NOT NULL DEFAULT 0)`,
    `CREATE INDEX IF NOT EXISTS lp_chats_owner ON lp_chats(user_id,updated_at DESC,id)`,
    `CREATE TABLE IF NOT EXISTS lp_chat_turns(id TEXT PRIMARY KEY,chat_id TEXT NOT NULL,user_id TEXT NOT NULL,sequence INTEGER NOT NULL,question TEXT NOT NULL,result TEXT,state TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL,bytes INTEGER NOT NULL,created_at INTEGER NOT NULL,UNIQUE(chat_id,sequence))`,
    `CREATE INDEX IF NOT EXISTS lp_turns_owner ON lp_chat_turns(user_id,chat_id,sequence)`,
    `CREATE TABLE IF NOT EXISTS lp_chat_budget(id INTEGER PRIMARY KEY CHECK(id=1),used_bytes INTEGER NOT NULL CHECK(used_bytes>=0))`,
    `INSERT OR IGNORE INTO lp_chat_budget VALUES(1,0)`
];
