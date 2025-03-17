import sqlite3

def init_db():
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()

    cursor.execute('''CREATE TABLE IF NOT EXISTS Universities (
        university_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    );''')

    cursor.execute("SELECT COUNT(*) FROM Universities")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO Universities (name) VALUES ('AIT')")
        cursor.execute("INSERT INTO Universities (name) VALUES ('AUCA')")
        cursor.execute("INSERT INTO Universities (name) VALUES ('KGMA')")
        conn.commit()

    cursor.execute('''CREATE TABLE IF NOT EXISTS Necessary_Subjects (
        subject_id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
    );''')
    conn.commit()

    cursor.execute('''CREATE TABLE IF NOT EXISTS Admins (
        admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        university_id INTEGER,
        FOREIGN KEY (university_id) REFERENCES Universities (university_id)
    );''')

    cursor.execute("SELECT COUNT(*) FROM Admins")
    if cursor.fetchone()[0] == 0:
        cursor.execute('''SELECT university_id FROM Universities WHERE name = 'AIT' LIMIT 1''')
        university_id = cursor.fetchone()[0]
        cursor.execute("INSERT INTO Admins (username, password, university_id) VALUES ('admin1', 'pass1', ?)", (university_id,))
        
        cursor.execute('''SELECT university_id FROM Universities WHERE name = 'AUCA' LIMIT 1''')
        university_id = cursor.fetchone()[0]
        cursor.execute("INSERT INTO Admins (username, password, university_id) VALUES ('admin2', 'pass2', ?)", (university_id,))
        
        cursor.execute('''SELECT university_id FROM Universities WHERE name = 'KGMA' LIMIT 1''')
        university_id = cursor.fetchone()[0]
        cursor.execute("INSERT INTO Admins (username, password, university_id) VALUES ('admin3', 'pass3', ?)", (university_id,))
        
        conn.commit()

    cursor.execute('''CREATE TABLE IF NOT EXISTS Students (
        student_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        university_id INTEGER,
        FOREIGN KEY (university_id) REFERENCES Universities (university_id)
    );''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS Subjects (
        subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        university_id INTEGER,
        quantity INTEGER DEFAULT 0,
        FOREIGN KEY (university_id) REFERENCES Universities (university_id)
    );
    ''')


    # cursor.execute("SELECT COUNT(*) FROM Subjects")
    # if cursor.fetchone()[0] == 0:
    #     default_subjects = ['Mathematics', 'Physics', 'Computer Science', 'English', 'History']
    #     cursor.execute("SELECT university_id FROM Universities")
    #     university_ids = cursor.fetchall()
    #     for uni_id in university_ids:
    #         for subject in default_subjects:
    #             cursor.execute("INSERT INTO Subjects (name, university_id) VALUES (?, ?)", (subject, uni_id[0]))
    #     conn.commit()

    cursor.execute('''CREATE TABLE IF NOT EXISTS Teachers (
        teacher_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        university_id INTEGER,
        FOREIGN KEY (university_id) REFERENCES Universities (university_id)
    );''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS Teacher_Subjects (
        teacher_id INTEGER,
        subject_id INTEGER,
        FOREIGN KEY (teacher_id) REFERENCES Teachers (teacher_id),
        FOREIGN KEY (subject_id) REFERENCES Subjects (subject_id),
        PRIMARY KEY (teacher_id, subject_id)
    );''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS Grades (
        grade_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        subject_id INTEGER,
        grade TEXT,
        university_id INTEGER,
        date_assigned TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, subject_id),
        FOREIGN KEY (student_id) REFERENCES Students (student_id),
        FOREIGN KEY (subject_id) REFERENCES Subjects (subject_id)
         );''')

    conn.commit()
    conn.close()

def get_necessary_subjects():
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Necessary_Subjects;")
    subjects = cursor.fetchall()
    conn.close()
    
    # Return subjects as a list of dictionaries for better readability
    return [{"subject_id": subject[0], "name": subject[1]} for subject in subjects]


def add_necessary_subject(name):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Necessary_Subjects (name) VALUES (?);", (name,))
        conn.commit()
        print(f"Subject '{name}' added successfully.")
    except sqlite3.IntegrityError:
        print(f"Error: Subject '{name}' already exists.")

# Function to delete a necessary subject
def delete_necessary_subject(subject_id):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    cursor.execute("DELETE FROM Necessary_Subjects WHERE subject_id = ?;", (subject_id,))
    conn.commit()
    print(f"Subject with ID {subject_id} deleted successfully.")


def delete_student(student_id):
    # Connect to the database
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()

    try:
        # Step 1: Delete the student's grades from the Grades table
        cursor.execute("DELETE FROM Grades WHERE student_id = ?", (student_id,))
        
        # Step 2: Delete the student from the Students table
        cursor.execute("DELETE FROM Students WHERE student_id = ?", (student_id,))
        
        # Commit changes to the database
        conn.commit()

        print(f"Student with ID {student_id} has been deleted successfully.")

    except sqlite3.Error as e:
        # Handle any errors (e.g., if the student ID does not exist)
        print(f"Error occurred while deleting student: {e}")
        conn.rollback()

    finally:
        # Close the database connection
        conn.close()

def delete_admin(admin_id):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    
    # Check if the admin exists
    cursor.execute("SELECT COUNT(*) FROM Admins WHERE admin_id = ?", (admin_id,))
    if cursor.fetchone()[0] == 0:
        print(f"No admin found with ID {admin_id}")
    else:
        # Delete the admin record
        cursor.execute("DELETE FROM Admins WHERE admin_id = ?", (admin_id,))
        conn.commit()
        print(f"Admin with ID {admin_id} has been deleted.")

    conn.close()

def get_all_universities_performance():
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    
    # Get all universities
    cursor.execute("SELECT university_id, name FROM Universities")
    universities = cursor.fetchall()
    
    performance_data = []
    
    for university in universities:
        university_id, university_name = university
        
        # Get total students in the university
        cursor.execute("SELECT COUNT(*) FROM Students WHERE university_id = ?", (university_id,))
        total_students = cursor.fetchone()[0]
        
        # Get the number of students with grades assigned
        cursor.execute('''SELECT COUNT(DISTINCT g.student_id) 
                          FROM Grades g
                          JOIN Students s ON g.student_id = s.student_id
                          WHERE s.university_id = ?''', (university_id,))
        students_with_grades = cursor.fetchone()[0]
        
        # Calculate average grade for students in the university
        cursor.execute('''SELECT AVG(g.grade) 
                          FROM Grades g
                          JOIN Students s ON g.student_id = s.student_id
                          WHERE s.university_id = ?''', (university_id,))
        average_grade = cursor.fetchone()[0]
        
        # Get the number of successfully graduating students (students with passing grades)
        cursor.execute('''SELECT COUNT(DISTINCT g.student_id) 
                          FROM Grades g
                          JOIN Students s ON g.student_id = s.student_id
                          WHERE s.university_id = ? AND g.grade >= 60''', (university_id,))
        graduating_students = cursor.fetchone()[0]
        
        # Calculate percentage of successfully graduating students
        if total_students > 0:
            graduation_percentage = (graduating_students / total_students) * 100
        else:
            graduation_percentage = 0
        
        # Append results for this university
        performance_data.append({
            "university_id": university_id,  # Added university_id to the result
            "university_name": university_name,
            "total_students": total_students,
            "students_with_grades": students_with_grades,
            "average_grade": round(average_grade, 2) if average_grade is not None else 0,  # Handling None values for average_grade
            "graduation_percentage": round(graduation_percentage, 2)
        })
    
    conn.close()
    return performance_data


def check_all_students_performance(university_filter='all'):
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    
    # Fetch necessary subjects
    cursor.execute("SELECT name FROM Necessary_Subjects")
    necessary_subjects = [row[0] for row in cursor.fetchall()]
    
    # If no necessary subjects, use all subjects as necessary (optional fallback)
    if not necessary_subjects:
        cursor.execute("SELECT DISTINCT name FROM Subjects")
        necessary_subjects = [row[0] for row in cursor.fetchall()] or []

    # Fetch students based on university filter
    if university_filter == 'all':
        cursor.execute("SELECT student_id, name FROM Students")
    else:
        cursor.execute("""
            SELECT student_id, name FROM Students
            WHERE university_id = (SELECT university_id FROM Universities WHERE name = ?)
        """, (university_filter,))
    
    students = cursor.fetchall()
    results = []

    for student_id, student_name in students:
        # Get all grades for the student
        cursor.execute("""
            SELECT s.name, g.grade 
            FROM Grades g
            JOIN Subjects s ON g.subject_id = s.subject_id
            WHERE g.student_id = ?
        """, (student_id,))
        grades = cursor.fetchall()

        # Filter out non-numeric grades (e.g., "Not Graded")
        student_grades = {subject: float(grade) for subject, grade in grades if grade.isdigit()}
        total_subjects = len(student_grades)

        # Determine status
        if not necessary_subjects:
            status = "Not Graded" if total_subjects == 0 else "Pending"
        else:
            status = "Success" if all(
                subject in student_grades and student_grades[subject] > 60 
                for subject in necessary_subjects
            ) else "Fail" if total_subjects > 0 else "Not Graded"

        results.append({
            "name": student_name,
            "total_subjects": total_subjects,
            "status": status
        })

    conn.close()
    return results


a = get_all_universities_performance()
print(a)


def check_student_performance(student_id):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    
    # Fetch necessary subjects from the database
    cursor.execute("SELECT subject_id FROM Necessary_Subjects")
    necessary_subject_ids = [row[0] for row in cursor.fetchall()]

    if not necessary_subject_ids:  # If no necessary subjects, consider all subjects as necessary
        cursor.execute("SELECT subject_id FROM Subjects")
        necessary_subject_ids = [row[0] for row in cursor.fetchall()]

    if not necessary_subject_ids:  # Safety check if no subjects are available at all
        conn.close()
        return "Fail"

    for subject_id in necessary_subject_ids:
        cursor.execute('''SELECT grade FROM Grades WHERE student_id = ? AND subject_id = ?''', (student_id, subject_id))
        grade = cursor.fetchone()
        
        if not grade:  # If the student has no grade for a required subject, fail
            conn.close()
            return "Fail"

        try:
            grade_value = float(grade[0])  # Convert grade to float
            if grade_value <= 60:  # If any required subject is 60 or less, fail
                conn.close()
                return "Fail"
        except ValueError:
            conn.close()
            return "Fail"  # If the grade is not a number, fail

    conn.close()
    return "Success"  # Passed all necessary subjects
  # Passed all required subjects



def get_universities():
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    cursor.execute("SELECT university_id, name FROM Universities")
    universities = cursor.fetchall()
    conn.close()
    return universities

def add_student(name, username, password, university_id):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO Students (name, username, password, university_id)
            VALUES (?, ?, ?, ?)
        ''', (name, username, password, university_id))
        conn.commit()
    except sqlite3.IntegrityError:
        return False  # Handle duplicate usernames
    finally:
        conn.close()
    return True

def get_student_by_id(student_id):
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT student_id, name, username, password, university_id FROM Students WHERE student_id = ?", (student_id,))
        student = cursor.fetchone()
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        student = None
    finally:
        conn.close()
    return student



def get_students(university_id):
    try:
        conn = sqlite3.connect("university_system.db")
        c = conn.cursor()
        c.execute("SELECT student_id, name, username, password, university_id FROM Students WHERE university_id = ?", (university_id,))
        students = c.fetchall()
        conn.close()
        return students
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return []

def add_admin(username, password, university_id):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    try:
        cursor.execute('''INSERT INTO Admins (username, password, university_id) 
                          VALUES (?, ?, ?)''', (username, password, university_id))
        conn.commit()
    except sqlite3.IntegrityError:
        print(f"Error: Username '{username}' is already taken.")
    conn.close()

def add_subject(name, university_id):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    cursor.execute('''INSERT INTO Subjects (name, university_id) VALUES (?, ?)''', (name, university_id))
    conn.commit()
    conn.close()

    
def add_subject_and_assign(subject_name, teacher_name, quantity, university_id):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    try:
        # Insert the new subject with quantity
        cursor.execute(
            "INSERT INTO Subjects (name, university_id, quantity) VALUES (?, ?, ?)",
            (subject_name, university_id, quantity)
        )
        subject_id = cursor.lastrowid  # Get the ID of the newly inserted subject

        # Retrieve teacher id based on teacher name and university
        cursor.execute(
            "SELECT teacher_id FROM Teachers WHERE name = ? AND university_id = ?",
            (teacher_name, university_id)
        )
        teacher = cursor.fetchone()
        if teacher:
            teacher_id = teacher[0]
            # Assign the subject to the teacher
            cursor.execute(
                "INSERT INTO Teacher_Subjects (teacher_id, subject_id) VALUES (?, ?)",
                (teacher_id, subject_id)
            )
            conn.commit()
            return True, "Subject added with quantity and assigned to teacher successfully."
        else:
            conn.rollback()
            return False, "Teacher not found."
    except sqlite3.Error as e:
        conn.rollback()
        return False, f"Database error: {e}"
    finally:
        conn.close()


def add_teacher(name, username, password, university_id):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    try:
        cursor.execute('''INSERT INTO Teachers (name, username, password, university_id) 
                          VALUES (?, ?, ?, ?)''', (name, username, password, university_id))
        conn.commit()
    except sqlite3.IntegrityError:
        print(f"Error: Username '{username}' is already taken.")
    conn.close()

def assign_subject_to_teacher(teacher_id, subject_id):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    cursor.execute('''INSERT INTO Teacher_Subjects (teacher_id, subject_id) 
                      VALUES (?, ?)''', (teacher_id, subject_id))
    conn.commit()
    conn.close()

def get_teachers_by_university(university_id):
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    
    try:
        cursor.execute('''SELECT teacher_id, name, username, password 
                          FROM Teachers
                          WHERE university_id = ?''', (university_id,))
        teachers = cursor.fetchall()
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        teachers = []
    finally:
        conn.close()

    return teachers


def get_teacher_subjects(teacher_id):
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    cursor.execute('''SELECT Subjects.subject_id, Subjects.name 
                      FROM Subjects
                      JOIN Teacher_Subjects ON Subjects.subject_id = Teacher_Subjects.subject_id
                      WHERE Teacher_Subjects.teacher_id = ?''', (teacher_id,))
    subjects = cursor.fetchall()
    conn.close()
    return subjects

def get_subjects(university_id):
    try:
        conn = sqlite3.connect("university_system.db")
        cursor = conn.cursor()
        cursor.execute("SELECT subject_id, name FROM Subjects WHERE university_id = ?", (university_id,))
        subjects = cursor.fetchall()
        conn.close()
        return subjects
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return []


def get_subjects_with_teachers(university_id):
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    try:
        cursor.execute('''
            SELECT s.subject_id, s.name, s.quantity, t.name as teacher_name
            FROM Subjects s
            LEFT JOIN Teacher_Subjects ts ON s.subject_id = ts.subject_id
            LEFT JOIN Teachers t ON ts.teacher_id = t.teacher_id
            WHERE s.university_id = ?
        ''', (university_id,))
        subjects = cursor.fetchall()
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        subjects = []
    finally:
        conn.close()
    return subjects


def enroll_student(student_id, subject_id):
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Enrollments (student_id, subject_id) VALUES (?, ?)", (student_id, subject_id))
        conn.commit()
        return True, "Enrollment successful"
    except sqlite3.IntegrityError:
        return False, "Student is already enrolled in this course"
    finally:
        conn.close()

def assign_grade(student_id, subject_id, grade):
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO Grades (student_id, subject_id, grade, date_assigned)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(student_id, subject_id) DO UPDATE SET 
                grade = excluded.grade,
                date_assigned = CURRENT_TIMESTAMP
        ''', (student_id, subject_id, grade))
        conn.commit()
    except sqlite3.Error as e:
        print(f"Database error in assign_grade: {e}")
    finally:
        conn.close()


def update_grade(student_id, subject_id, grade):
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE Grades
            SET grade = ?, date_assigned = CURRENT_TIMESTAMP
            WHERE student_id = ? AND subject_id = ?
        ''', (grade, student_id, subject_id))
        conn.commit()
    except sqlite3.Error as e:
        print(f"Database error in update_grade: {e}")
    finally:
        conn.close()

def get_subjects_grade(student_id):
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    try:
        cursor.execute('''
            SELECT s.subject_id, s.name, g.grade, g.date_assigned
            FROM Grades g
            JOIN Subjects s ON g.subject_id = s.subject_id
            WHERE g.student_id = ?
        ''', (student_id,))
        results = cursor.fetchall()
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        results = []
    finally:
        conn.close()
    return results

def get_students_grades_by_subject(subject_id):
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    try:
        cursor.execute('''
            SELECT st.student_id, st.name, st.username, g.grade, g.date_assigned
            FROM Grades g
            JOIN Students st ON g.student_id = st.student_id
            WHERE g.subject_id = ?
            ORDER BY st.name
        ''', (subject_id,))
        results = cursor.fetchall()
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        results = []
    finally:
        conn.close()
    return results


def get_subjects_by_teacher(teacher_id):
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    try:
        cursor.execute('''
            SELECT s.subject_id, s.name, s.university_id
            FROM Subjects s
            JOIN Teacher_Subjects ts ON s.subject_id = ts.subject_id
            WHERE ts.teacher_id = ?
            ORDER BY s.name
        ''', (teacher_id,))
        subjects = cursor.fetchall()
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        subjects = []
    finally:
        conn.close()
    return subjects


def get_totals():
    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM Universities")
        universities = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM Admins")
        admins = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM Students")
        students = cursor.fetchone()[0]
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        universities, admins, students = 0, 0, 0
    finally:
        conn.close()
    return universities, admins, students


def add_university(name):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("INSERT INTO Universities (name) VALUES (?)", (name,))
        conn.commit()
        print(f"University '{name}' added successfully.")
    except sqlite3.IntegrityError:
        print(f"Error: University '{name}' already exists.")
    
    conn.close()

def delete_university(name):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT university_id FROM Universities WHERE name = ?", (name,))
    university = cursor.fetchone()
    
    if university:
        university_id = university[0]
        
        cursor.execute("DELETE FROM Admins WHERE university_id = ?", (university_id,))
        cursor.execute("DELETE FROM Students WHERE university_id = ?", (university_id,))
        cursor.execute("DELETE FROM Subjects WHERE university_id = ?", (university_id,))
        cursor.execute("DELETE FROM Teachers WHERE university_id = ?", (university_id,))
        cursor.execute("DELETE FROM Grades WHERE university_id = ?", (university_id,))
        cursor.execute("DELETE FROM Universities WHERE university_id = ?", (university_id,))
        
        conn.commit()
        print(f"University '{name}' and all related data deleted successfully.")
    else:
        print(f"Error: University '{name}' not found.")
    
    conn.close()


def count_students(university_name):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    cursor.execute("SELECT university_id FROM Universities WHERE name = ?", (university_name,))
    result = cursor.fetchone()
    if result:
        university_id = result[0]
        cursor.execute("SELECT COUNT(*) FROM Students WHERE university_id = ?", (university_id,))
        student_count = cursor.fetchone()[0]
        print(f"Total students in '{university_name}': {student_count}")
    else:
        print(f"University '{university_name}' not found.")
    conn.close()


def get_admins():
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()

    # Query to fetch admin details along with university name
    cursor.execute('''
        SELECT Admins.admin_id, Admins.username, Admins.password, Admins.university_id, Universities.name AS university_name
        FROM Admins
        JOIN Universities ON Admins.university_id = Universities.university_id
    ''')

    admins = cursor.fetchall()

    # Loop through the fetched data and print each admin's details
    for admin in admins:
        print(f"Admin ID: {admin[0]}, Username: {admin[1]}, Password: {admin[2]}, University ID: {admin[3]}, University Name: {admin[4]}")

    conn.close()
    return admins 

# Delete Teacher Function
def delete_teacher(teacher_id):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()

    # Delete teacher-subject relationships first to avoid foreign key constraint issues
    cursor.execute("DELETE FROM Teacher_Subjects WHERE teacher_id = ?", (teacher_id,))

    # Now delete the teacher
    cursor.execute("DELETE FROM Teachers WHERE teacher_id = ?", (teacher_id,))

    conn.commit()
    conn.close()

# Delete Subject Function
def delete_subject(subject_id):
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()

    # Delete grades related to this subject
    cursor.execute("DELETE FROM Grades WHERE subject_id = ?", (subject_id,))

    # Delete teacher-subject relationships related to this subject
    cursor.execute("DELETE FROM Teacher_Subjects WHERE subject_id = ?", (subject_id,))

    # Now delete the subject
    cursor.execute("DELETE FROM Subjects WHERE subject_id = ?", (subject_id,))

    conn.commit()
    conn.close()
