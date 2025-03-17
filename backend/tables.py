from datetime import datetime

def create_tables(conn):
    cursor = conn.cursor()

    # Create Universities table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Universities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            password TEXT NOT NULL,
            type TEXT NOT NULL,
            min_courses INTEGER NOT NULL,
            min_gpa REAL NOT NULL,
            attendance_rate INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            university_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (university_id) REFERENCES Universities(id)
        )
    ''')

    # Create Mandatory Courses table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Mandatory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            credits INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create Courses table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            university_id INTEGER,
            mandatory BOOLEAN DEFAULT 0,
            teacher_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (university_id) REFERENCES Universities(id),
            FOREIGN KEY (teacher_id) REFERENCES Users(id)
        )
    ''')

    # Create Enrollments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            course_id INTEGER,
            enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES Users(id),
            FOREIGN KEY (course_id) REFERENCES Courses(id)
        )
    ''')

    # Create Grades table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Grades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            course_id INTEGER,
            grade INTEGER,
            graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES Users(id),
            FOREIGN KEY (course_id) REFERENCES Courses(id)
        )
    ''')

    # Create GraduationRequests table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS GraduationRequests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            university_id INTEGER,
            status TEXT DEFAULT 'pending',
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_at TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES Users(id),
            FOREIGN KEY (university_id) REFERENCES Universities(id)
        )
    ''')

    conn.commit()