import SQLite from 'react-native-sqlite-storage';
import { Note, NoteVersion, Tag, Settings, Achievement, Attachment, Drawing } from '../types';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'ConstelloaNotes.db',
        location: 'default',
        createFromLocation: '~ConstelloaNotes.db',
      });

      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const queries = [
      `CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        lastModified INTEGER NOT NULL,
        created INTEGER NOT NULL,
        positionX REAL,
        positionY REAL
      )`,

      `CREATE TABLE IF NOT EXISTS note_versions (
        id TEXT PRIMARY KEY,
        noteId TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        changeType TEXT NOT NULL,
        FOREIGN KEY (noteId) REFERENCES notes (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        noteId TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        size INTEGER NOT NULL,
        FOREIGN KEY (noteId) REFERENCES notes (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS drawings (
        id TEXT PRIMARY KEY,
        noteId TEXT NOT NULL,
        strokes TEXT NOT NULL,
        thumbnail TEXT,
        FOREIGN KEY (noteId) REFERENCES notes (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT,
        count INTEGER DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        unlocked INTEGER DEFAULT 0,
        unlockedAt INTEGER,
        icon TEXT NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_notes_lastModified ON notes (lastModified)`,
      `CREATE INDEX IF NOT EXISTS idx_note_versions_noteId ON note_versions (noteId)`,
      `CREATE INDEX IF NOT EXISTS idx_attachments_noteId ON attachments (noteId)`,
    ];

    for (const query of queries) {
      await this.db.executeSql(query);
    }
  }

  // Notes operations
  async createNote(note: Omit<Note, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const now = Date.now();

    await this.db.executeSql(
      `INSERT INTO notes (id, title, content, tags, lastModified, created, positionX, positionY)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        note.title,
        note.content,
        JSON.stringify(note.tags),
        now,
        now,
        note.position?.x || null,
        note.position?.y || null,
      ]
    );

    // Create initial version
    await this.createNoteVersion(id, note.content, 'create');

    return id;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      setClause.push('title = ?');
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      setClause.push('content = ?');
      values.push(updates.content);
      // Create version entry for content changes
      await this.createNoteVersion(id, updates.content, 'update');
    }
    if (updates.tags !== undefined) {
      setClause.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.position !== undefined) {
      setClause.push('positionX = ?, positionY = ?');
      values.push(updates.position.x, updates.position.y);
    }

    setClause.push('lastModified = ?');
    values.push(Date.now());
    values.push(id);

    await this.db.executeSql(
      `UPDATE notes SET ${setClause.join(', ')} WHERE id = ?`,
      values
    );
  }

  async updateNotePosition(id: string, position: { x: number; y: number } | null): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const timestamp = Date.now();

    if (position) {
      await this.db.executeSql(
        'UPDATE notes SET positionX = ?, positionY = ?, lastModified = ? WHERE id = ?',
        [position.x, position.y, timestamp, id]
      );
    } else {
      await this.db.executeSql(
        'UPDATE notes SET positionX = NULL, positionY = NULL, lastModified = ? WHERE id = ?',
        [timestamp, id]
      );
    }
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM notes WHERE id = ?', [id]);
  }

  async getNote(id: string): Promise<Note | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeSql('SELECT * FROM notes WHERE id = ?', [id]);

    if (result[0].rows.length === 0) return null;

    const row = result[0].rows.item(0);
    return this.mapRowToNote(row);
  }

  async getAllNotes(searchTerm?: string): Promise<Note[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM notes';
    let params: any[] = [];

    if (searchTerm) {
      query += ' WHERE title LIKE ? OR content LIKE ?';
      params = [`%${searchTerm}%`, `%${searchTerm}%`];
    }

    query += ' ORDER BY lastModified DESC';

    const result = await this.db.executeSql(query, params);
    const notes: Note[] = [];

    for (let i = 0; i < result[0].rows.length; i++) {
      const row = result[0].rows.item(i);
      notes.push(this.mapRowToNote(row));
    }

    return notes;
  }

  private mapRowToNote(row: any): Note {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      tags: JSON.parse(row.tags || '[]'),
      lastModified: new Date(row.lastModified),
      created: new Date(row.created),
      position: row.positionX !== null ? { x: row.positionX, y: row.positionY } : undefined,
    };
  }

  // Version history
  async createNoteVersion(noteId: string, content: string, changeType: 'create' | 'update' | 'delete'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    await this.db.executeSql(
      'INSERT INTO note_versions (id, noteId, content, timestamp, changeType) VALUES (?, ?, ?, ?, ?)',
      [id, noteId, content, Date.now(), changeType]
    );
  }

  async getNoteVersions(noteId: string): Promise<NoteVersion[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeSql(
      'SELECT * FROM note_versions WHERE noteId = ? ORDER BY timestamp DESC',
      [noteId]
    );

    const versions: NoteVersion[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      const row = result[0].rows.item(i);
      versions.push({
        id: row.id,
        noteId: row.noteId,
        content: row.content,
        timestamp: new Date(row.timestamp),
        changeType: row.changeType,
      });
    }

    return versions;
  }

  // Settings
  async saveSetting(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  async getSetting(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeSql('SELECT value FROM settings WHERE key = ?', [key]);

    if (result[0].rows.length === 0) return null;
    return result[0].rows.item(0).value;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export const databaseService = new DatabaseService();
