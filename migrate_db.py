import sqlite3
import os

db_path = "database.sqlite"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE freelancing_services ADD COLUMN business_id INTEGER DEFAULT 1;")
        conn.commit()
        print("Migrated freelancing_services.")
    except Exception as e:
        print("Already migrated?", e)
    
    try:
        cur.execute("ALTER TABLE freelancing_invoices ADD COLUMN business_id INTEGER DEFAULT 1;")
        conn.commit()
    except Exception as e:
        pass
        
    try:
        cur.execute("ALTER TABLE freelancing_time_logs ADD COLUMN business_id INTEGER DEFAULT 1;")
        conn.commit()
    except Exception as e:
        pass
        
    conn.close()
