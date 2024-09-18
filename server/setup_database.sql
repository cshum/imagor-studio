CREATE TABLE storage_configs (
                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                                 name TEXT NOT NULL,
                                 key TEXT NOT NULL UNIQUE,
                                 type TEXT NOT NULL,
                                 config TEXT NOT NULL,
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_storage_configs_updated_at
    AFTER UPDATE ON storage_configs
    FOR EACH ROW
BEGIN
    UPDATE storage_configs SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
