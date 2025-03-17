import sqlite3
from flask import Flask, redirect, render_template, request, jsonify, url_for
from tables  import create_tables
app = Flask(__name__)
from flask_cors import CORS
CORS(app)
def create_connection():
    try:
        conn = sqlite3.connect('university.db')
        create_tables(conn)
        return conn
    except sqlite3.Error as e:
        print(f"Error connecting to SQLite: {e}")
        return None
@app.route('/logout')
def logout():
 # Clears all session data
    return redirect(url_for('home')) 
@app.route('/mandatory-courses')
def mandatory_courses():
    return render_template('superadmin/mandatory-courses.html')
@app.route('/register-university-page')
def register_university_page():
    return render_template('superadmin/register-university.html')
@app.route('/universities')
def universities():
    return render_template('superadmin/universities.html')
@app.route('/')
def home():
    return render_template('index.html')
@app.route('/superadmin-dashboard')
def superadmin_dashboard():
    return render_template('superadmin/superadmin.html')

@app.route('/admin-dashboard')
def admin_dashboard():
    return render_template('universitet_page/students.html')

@app.route('/user-dashboard')
def user_dashboard():
    return render_template('student_page/student.html')

@app.route('/professor-dashboard')
def professor_dashboard():
    return render_template('professor_page/professor.html')
@app.route('/students')
def students():
    return render_template('universitet_page/students.html')
@app.route('/professors')
def professors():
    return render_template('universitet_page/professors.html')
@app.route('/classes')
def classes():
    return render_template('universitet_page/classes.html')
@app.route('/register-university', methods=['POST'])
def register_university():
    data = request.json
    
    # Validate required fields
    required_fields = ["name", "password", "type", "minCourses", "minGPA", "attendanceRate"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Validate constraints
    if data["type"] not in ["public", "private", "community"]:
        return jsonify({"error": "Invalid university type"}), 400
    if not (1 <= data["minCourses"] <= 10):
        return jsonify({"error": "minCourses must be between 1 and 10"}), 400
    if not (0 <= data["minGPA"] <= 100):
        return jsonify({"error": "minGPA must be between 0 and 100"}), 400
    if not (0 <= data["attendanceRate"] <= 100):
        return jsonify({"error": "attendanceRate must be between 0 and 100"}), 400

    # Hash password before storing
    hashed_password = data["password"]

    # Insert into database
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO Universities (name, password, type, min_courses, min_gpa, attendance_rate)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data["name"], hashed_password, data["type"], data["minCourses"], data["minGPA"], data["attendanceRate"]))

    conn.commit()
    conn.close()

    return jsonify({"message": "University registered successfully"}), 201
@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    is_admin = request.form.get('isAdmin') == 'on'  # Check if the checkbox is checked

    # Superadmin check
    if username == 'superadmin' and password == 'superadmin':
        return jsonify({
            "redirect": "/superadmin-dashboard"  # Redirect URL for superadmin
        })

    conn = create_connection()
    if conn:
        cursor = conn.cursor()

        try:
            if is_admin:
                # Search in the Universities table for admins
                cursor.execute("SELECT * FROM Universities WHERE name = ? AND password = ?", (username, password))
                user = cursor.fetchone()
                user_type = 'admin'
            else:
                # Search in the Users table for simple users
                cursor.execute("SELECT * FROM Users WHERE username = ? AND password = ?", (username, password))
                user = cursor.fetchone()
                user_type = 'user'

            if user:
                # User found, return success response with redirect URL
                conn.close()
                if user_type == 'admin':
                    return jsonify({
                        "redirect": "/admin-dashboard",
                      "university_id": user[0]
                         
                    })
                else:
                    # Check the user's role
                    role = user[3]  # Assuming the role is stored in the 4th column of the Users table
                    if role == 'professor':
                        return jsonify({
                            "redirect": "/professor-dashboard" ,'professor_id':user[0] # Redirect URL for professor
                        })
                    else:
                        return jsonify({
                            "redirect": "/user-dashboard" 
                             ,"student_id":user[0] # Redirect URL for student
                        })
            else:
                conn.close()
                return jsonify({"error": "Invalid credentials"}), 401

        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Database connection failed"}), 500

@app.route('/get_mandatory', methods=['GET'])
def get_mandatory():
    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM Mandatory")
            rows = cursor.fetchall()
            columns = [column[0] for column in cursor.description]
            mandatory_courses = [dict(zip(columns, row)) for row in rows]
            conn.close()
            return jsonify(mandatory_courses)
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500
@app.route('/get_mandatory/<int:course_id>', methods=['GET'])
def get_mandatory_course(course_id):
    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM Mandatory WHERE id = ?", (course_id,))
            row = cursor.fetchone()
            if row:
                columns = [column[0] for column in cursor.description]
                course = dict(zip(columns, row))
                conn.close()
                return jsonify(course)
            else:
                conn.close()
                return jsonify({"error": "Course not found"}), 404
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500
@app.route('/update_mandatory/<int:course_id>', methods=['PUT'])
def update_mandatory(course_id):
    data = request.json
    required_fields = ["name", "description", "credits"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute('''
                UPDATE Mandatory
                SET name = ?, description = ?, credits = ?
                WHERE id = ?
            ''', (data["name"], data["description"], data["credits"], course_id))
            conn.commit()
            conn.close()
            return jsonify({"message": "Course updated successfully"})
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500
@app.route('/delete_mandatory/<int:course_id>', methods=['DELETE'])
def delete_mandatory(course_id):
    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM Mandatory WHERE id = ?", (course_id,))
            conn.commit()
            conn.close()
            return jsonify({"message": "Course deleted successfully"})
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500
@app.route('/add_mandatory', methods=['POST'])
def add_mandatory():
    data = request.json
    required_fields = ["name", "description", "credits"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO Mandatory (name, description, credits)
                VALUES (?, ?, ?)
            ''', (data["name"], data["description"], data["credits"]))
            conn.commit()
            conn.close()
            return jsonify({"message": "Course added successfully"}), 201
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500

@app.route('/list_university/<int:university_id>', methods=['GET'])
def list_university(university_id):
    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Universities WHERE id = ?", (university_id,))
        university = cursor.fetchone()

        if university:
            # Get column names from cursor description
            columns = [column[0] for column in cursor.description]
            
            # Create a dictionary by combining column names and values from the result
            university_dict = dict(zip(columns, university))
            
            conn.close()
            return jsonify(university_dict)  # Return the dictionary as JSON
        else:
            conn.close()
            return jsonify({"error": "University not found"}), 404
    return jsonify({"error": "Database connection failed"}), 500

@app.route('/list_universities', methods=['GET'])
def list_universities():
    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Universities")
        universities = cursor.fetchall()
        conn.close()    
        return jsonify(universities)
    return jsonify({"error": "Database connection failed"}), 500

@app.route('/students/<int:university_id>', methods=['GET'])
def get_students_by_university(university_id):
    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            # Fetch all students for the given university_id
            cursor.execute('''
                SELECT id, username, role, university_id 
                FROM Users 
                WHERE role = ? AND university_id = ?
            ''', ('student', university_id))
            students = cursor.fetchall()

            # Convert rows to a list of dictionaries
            students_list = []
            for student in students:
                cursor.execute("SELECT * FROM GraduationRequests WHERE student_id = ?", (student[0],))
                graduation_request = cursor.fetchone()
                if graduation_request:
                    students_list.append({
                        "id": student[0],
                        "username": student[1],
                        "role": student[2],
                        "university_id": student[3],
                        "graduated": True
                    })
                else:
                    students_list.append({
                        "id": student[0],
                        "username": student[1],
                        "role": student[2],
                        "university_id": student[3],
                        "graduated": False
                    })
              

            conn.close()
            return jsonify(students_list)
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500
@app.route('/register-student', methods=['POST'])
def register_student():
    data = request.json
    required_fields = ["username", "password", "role", "university_id"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            # Insert the new student into the Users table
            cursor.execute('''
                INSERT INTO Users (username, password, role, university_id)
                VALUES (?, ?, ?, ?)
            ''', (data["username"], data["password"], data["role"], data["university_id"]))
            conn.commit()

            # Get the ID of the newly inserted student
            student_id = cursor.lastrowid

            conn.close()
            return jsonify({"message": "Student registered successfully", "id": student_id}), 201
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500
@app.route('/enroll-student', methods=['POST'])
def enroll_student():
    data = request.json
    required_fields = ["student_id", "course_id"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            # Insert the enrollment into the Enrollments table
            cursor.execute('''
                INSERT INTO Enrollments (student_id, course_id)
                VALUES (?, ?)
            ''', (data["student_id"], data["course_id"]))
            conn.commit()
            conn.close()
            return jsonify({"message": "Student enrolled successfully"}), 201
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500
@app.route('/professors/<int:university_id>', methods=['GET'])
def get_professors_by_university(university_id):
    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute('''
                SELECT * FROM Users 
                WHERE role = ? AND university_id = ?
            ''', ('professor', university_id))
            professors = cursor.fetchall()

            professors_list = []
            for professor in professors:
                professors_list.append({
                    "id": professor[0],
                    "username": professor[1],
                    "password": professor[2],
                    "role": professor[3],
                    "university_id": professor[4],
                    "created_at": professor[5]
                })

            conn.close()
            return jsonify(professors_list)
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500

@app.route('/professors/<int:professor_id>/classes', methods=['GET'])
def get_classes_by_professor(professor_id):
    conn = create_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()

    try:
        cursor.execute('''
            SELECT * FROM Courses 
            WHERE teacher_id = ?
        ''', (professor_id,))
        classes = cursor.fetchall()

        classes_list = []
        for cls in classes:
            classes_list.append({
                "id": cls[0],
                "name": cls[1],
                "description": cls[2],
                "teacher_id": cls[3],
                "university_id": cls[4],
                "created_at": cls[5]
            })

        conn.close()
        return jsonify(classes_list)
    except sqlite3.Error as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/register-professor', methods=['POST'])
def register_professor():
    data = request.json
    required_fields = ["username", "password", "role", "university_id"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO Users (username, password, role, university_id)
                VALUES (?, ?, ?, ?)
            ''', (data["username"], data["password"], data["role"], data["university_id"]))
            conn.commit()
            conn.close()
            return jsonify({"message": "Professor registered successfully"}), 201
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500
@app.route('/courses/<int:course_id>/students', methods=['GET'])
def get_students_by_course(course_id):
    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute('''
                SELECT u.id, u.username, g.grade
                FROM Users u
                JOIN Enrollments e ON u.id = e.student_id
                LEFT JOIN Grades g ON u.id = g.student_id AND g.course_id = ?
                WHERE e.course_id = ?
            ''', (course_id, course_id))
            students = cursor.fetchall()
            

            students_list = []
            for student in students:
                cursor.execute("SELECT * FROM GraduationRequests WHERE student_id = ?", (student[0],))
                graduation_request = cursor.fetchone()
                if graduation_request:
                    students_list.append({
                        "id": student[0],
                        "username": student[1],
                        "grade": student[2],
                        "graduated": True
                    })
                else:
                    students_list.append({
                        "id": student[0],
                        "username": student[1],
                        "grade": student[2],
                         "graduated": False
                    })

            conn.close()
            return jsonify(students_list)
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500

@app.route('/students/<int:student_id>/grades', methods=['GET'])
def get_student_grades(student_id):
    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute('''
                SELECT g.student_id, u.username, c.id, c.name, g.grade, g.graded_at
                FROM Grades g
                JOIN Courses c ON g.course_id = c.id
                JOIN Users u ON g.student_id = u.id
                WHERE g.student_id = ?
            ''', (student_id,))
            grades = cursor.fetchall()

            grades_list = [
                {
                    "student_id": row[0],
                    "student_name": row[1],
                    "course_id": row[2],
                    "course_name": row[3],
                    "grade": row[4],
                    "graded_at": row[5]
                }
                for row in grades
            ]

            conn.close()
            return jsonify(grades_list)
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500

@app.route('/add-course', methods=['POST'])
def add_course():
    data = request.json
    required_fields = ["name", "description", "university_id", "teacher_id"]  # All required fields
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            # Add the course
            cursor.execute('''
                INSERT INTO Courses (name, description, university_id, teacher_id)
                VALUES (?, ?, ?, ?)
            ''', (data["name"], data["description"], data["university_id"], data["teacher_id"]))
            conn.commit()
            conn.close()
            return jsonify({"message": "Course added successfully"}), 201
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500
@app.route('/teachers/<int:university_id>', methods=['GET'])
def get_teachers_by_university(university_id):
    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute('''
                SELECT * FROM Users 
                WHERE role = ? AND university_id = ?
            ''', ('professor', university_id))
            teachers = cursor.fetchall()

            teachers_list = []
            for teacher in teachers:
                teachers_list.append({
                    "id": teacher[0],
                    "username": teacher[1],
                    "name": teacher[2]
                })

            conn.close()
            return jsonify(teachers_list)
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500
@app.route('/courses', methods=['GET'])
def get_courses():
    university_id = request.args.get('university_id')
    if not university_id:
        return jsonify({"error": "university_id is required"}), 400

    conn = create_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM Courses WHERE university_id = ?", (university_id,))
            courses = cursor.fetchall()

            courses_list = []
            for course in courses:
                courses_list.append({
                    "id": course[0],
                    "name": course[1],
                    "description": course[2],
                    "university_id": course[3],
                    "mandatory": course[4],
                    "teacher_id": course[5],
                    "created_at": course[6]
                })

            conn.close()
            return jsonify(courses_list)
        except sqlite3.Error as e:
            conn.close()
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Database connection failed"}), 500
@app.route('/courses/mandatory', methods=['GET'])
def get_mandatory_courses():
    university_id = request.args.get('university_id')
    if not university_id:
        return jsonify({"error": "university_id is required"}), 400
        
    conn = create_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT id, name, description 
            FROM Courses 
            WHERE mandatory = 1 AND university_id = ?
        ''', (university_id,))
        
        courses = []
        for row in cursor.fetchall():
            courses.append({
                "id": row[0],
                "course_name": row[1],
                "description": row[2]
            })
        
        conn.close()
        return jsonify(courses), 200
        
    except sqlite3.Error as e:
        conn.close()
        return jsonify({"error": str(e)}), 500
@app.route('/students/<int:student_id>/university', methods=['GET'])
def get_student_university(student_id):
    conn = create_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()

    try:
        # Fetch the student's university ID
        cursor.execute('SELECT university_id FROM Users WHERE id = ?', (student_id,))
        student = cursor.fetchone()
        if not student:
            conn.close()
            return jsonify({'error': 'Student not found'}), 404

        # Access the university_id by index (tuples are zero-indexed)
        university_id = student[0]

        # Fetch the university details
        cursor.execute('SELECT min_courses, min_gpa FROM Universities WHERE id = ?', (university_id,))
        university = cursor.fetchone()
        if not university:
            conn.close()
            return jsonify({'error': 'University not found'}), 404

        # Access the min_courses and min_gpa by index
        university_details = {
            "min_courses": university[0],
            "min_gpa": university[1]
        }

        conn.close()
        return jsonify(university_details)
    except sqlite3.Error as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/add-mandatory-course', methods=['POST'])
def add_mandatory_course():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    university_id = data.get('university_id')
    teacher_id = data.get('teacher_id')

    if not name or not description or not university_id or not teacher_id:
        return jsonify({"error": "Missing required fields"}), 400

    conn = create_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()

    try:
        # Check if the course already exists for this university
        cursor.execute('''
            SELECT id FROM Courses
            WHERE name = ? AND university_id = ?
        ''', (name, university_id))
        existing_course = cursor.fetchone()

        if existing_course:
            conn.close()
            return jsonify({"error": "Course already exists for this university"}), 400

        # Insert the mandatory course into the Courses table
        cursor.execute('''
            INSERT INTO Courses (name, description, university_id, teacher_id, mandatory)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, description, university_id, teacher_id, True))
        conn.commit()
        conn.close()
        return jsonify({"message": "Mandatory course added successfully"}), 201
    except sqlite3.Error as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/delete-professor',methods=["POST"])
def delete_professor():
    data = request.get_json()
    professor_id = data.get('professor_id')

    if not professor_id:
        return jsonify({"error":"id not found"})
    conn = create_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Users WHERE id = ?",(professor_id,))
        conn.commit()
        return jsonify({"message":"Professor deleted successfully"}),200
    except sqlite3.Error as e:
        return jsonify({"error":str(e)}),500
@app.route('/delete-student',methods=["POST"])
def delete_student():
    data = request.get_json()
    student_id = data.get('student_id')

    if not student_id:
        return jsonify({"error":"id not found"})
    conn = create_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Users WHERE id = ?",(student_id,))
        conn.commit()
        return jsonify({"message":"Student deleted successfully"}),200
    except sqlite3.Error as e:
        return jsonify({"error":str(e)}),500    

@app.route('/delete-course', methods=['POST'])
def delete_course():
    data = request.get_json()
    course_id = data.get('course_id')

    if not course_id:
        return jsonify({"error": "Course ID is required"}), 400

    conn = create_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()

    try:
        # Delete the course from the Courses table
        cursor.execute('''
            DELETE FROM Courses
            WHERE id = ?
        ''', (course_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Course deleted successfully"}), 200
    except sqlite3.Error as e:
        conn.close()
        return jsonify({"error": str(e)}), 500
@app.route('/request-graduation', methods=['POST'])
def request_graduation():
    try:
        data = request.json
        print(f"Received graduation request with data: {data}")
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        student_id = data.get('student_id')
        print(f"Extracted student_id: {student_id}")
        
        if not student_id:
            return jsonify({"error": "Student ID is required"}), 400

        conn = create_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = conn.cursor()

        # Get student and university data
        cursor.execute('SELECT university_id FROM Users WHERE id = ?', (student_id,))
        student = cursor.fetchone()
        print(f"Found student: {student}")
        
        if not student:
            conn.close()
            return jsonify({"error": "Student not found", "details": f"No student with ID {student_id}"}), 404

        university_id = student[0]

        cursor.execute('SELECT min_courses, min_gpa FROM Universities WHERE id = ?', (university_id,))
        university = cursor.fetchone()
        print(f"Found university: {university}")
        
        if not university:
            conn.close()
            return jsonify({"error": "University not found"}), 404

        min_courses = university[0]
        min_gpa = university[1]

        # Check number of completed courses
        cursor.execute('SELECT COUNT(*) FROM Enrollments WHERE student_id = ?', (student_id,))
        completed_courses = cursor.fetchone()[0]
        print(f"Completed courses: {completed_courses}")

        if completed_courses < min_courses:
            conn.close()
            return jsonify({
                "error": "Graduation request denied",
                "reason": f"Not enough courses completed. Required: {min_courses}, Completed: {completed_courses}",
                "requirements": {
                    "min_courses": min_courses,
                    "completed_courses": completed_courses,
                }
            }), 400

        # Check GPA
        cursor.execute('SELECT AVG(grade) FROM Grades WHERE student_id = ?', (student_id,))
        avg_gpa_result = cursor.fetchone()[0]
        avg_gpa = 0 if avg_gpa_result is None else avg_gpa_result
        print(f"Average GPA: {avg_gpa}")

        if avg_gpa < min_gpa:
            conn.close()
            return jsonify({
                "error": "Graduation request denied",
                "reason": f"GPA too low. Required: {min_gpa}, Your GPA: {round(avg_gpa, 2)}",
                "requirements": {
                    "min_gpa": min_gpa,
                    "avg_gpa": round(avg_gpa, 2),
                }
            }), 400

        # Check mandatory courses (courses where mandatory = 1)
        cursor.execute('SELECT COUNT(*) FROM Courses WHERE mandatory = 1 AND university_id = ?', (university_id,))
        total_mandatory_courses = cursor.fetchone()[0]
        print(f"Total mandatory courses: {total_mandatory_courses}")
        
        cursor.execute('''
            SELECT COUNT(*)
            FROM Grades g
            JOIN Courses c ON g.course_id = c.id
            WHERE g.student_id = ? AND c.mandatory = 1 AND g.grade >= 60
        ''', (student_id,))
        passed_mandatory_courses = cursor.fetchone()[0]
        print(f"Passed mandatory courses: {passed_mandatory_courses}")
        
        if passed_mandatory_courses < total_mandatory_courses:
            conn.close()
            return jsonify({
                "error": "Graduation request denied",
                "reason": f"Not all mandatory courses passed. Required: {total_mandatory_courses}, Passed: {passed_mandatory_courses}",
                "requirements": {
                    "total_mandatory": total_mandatory_courses,
                    "passed_mandatory": passed_mandatory_courses,
                }
            }), 400

        # Check if graduation request already exists
        cursor.execute('SELECT id FROM GraduationRequests WHERE student_id = ?', (student_id,))
        existing_request = cursor.fetchone()
        
        if existing_request:
            conn.close()
            return jsonify({
                "message": "You have already submitted a graduation request",
                "requirements": {
                    "min_courses": min_courses,
                    "completed_courses": completed_courses,
                    "min_gpa": min_gpa,
                    "avg_gpa": round(avg_gpa, 2),
                    "total_mandatory": total_mandatory_courses,
                    "passed_mandatory": passed_mandatory_courses,
                }
            }), 200

        # If all requirements are met, submit the graduation request
        cursor.execute('''
            INSERT INTO GraduationRequests (student_id, university_id, status)
            VALUES (?, ?, ?)
        ''', (student_id, university_id, 'graduated'))
        conn.commit()

        conn.close()
        return jsonify({
            "message": "Graduation request approved!",
            "requirements": {
                "min_courses": min_courses,
                "completed_courses": completed_courses,
                "min_gpa": min_gpa,
                "avg_gpa": round(avg_gpa, 2),
                "total_mandatory": total_mandatory_courses,
                "passed_mandatory": passed_mandatory_courses,
            }
        }), 201

    except Exception as e:
        print(f"Error in request_graduation: {str(e)}")
        return jsonify({"error": str(e)}), 500
@app.route('/grades', methods=['POST'])
def update_grade():
    data = request.json
    required_fields = ["student_id", "course_id", "grade"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    conn = create_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT OR REPLACE INTO Grades (student_id, course_id, grade)
            VALUES (?, ?, ?)
        ''', (data["student_id"], data["course_id"], data["grade"]))
        conn.commit()
        conn.close()
        return jsonify({"message": "Grade updated successfully"}), 200
    except sqlite3.Error as e:
        conn.close()
        return jsonify({"error": str(e)}), 500
if __name__ == '__main__':
    create_connection()
    app.run(debug=True)