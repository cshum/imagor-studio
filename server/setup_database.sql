CREATE TABLE storages (
                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                                 name TEXT NOT NULL,
                                 key TEXT NOT NULL UNIQUE,
                                 type TEXT NOT NULL,
                                 config TEXT NOT NULL,
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_storages_updated_at
    AFTER UPDATE ON storages
    FOR EACH ROW
BEGIN
    UPDATE storages SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
