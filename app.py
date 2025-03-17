
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
import sqlite3
from db import init_db, get_universities
import db

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # For session management

# Initialize the database
init_db()



# @app.route('/get_admins', methods=['GET'])
# def get_admins():
#     conn = sqlite3.connect('university_system.db')
#     cursor = conn.cursor()
    
#     cursor.execute('SELECT admin_id, username, university_name FROM Admins')
#     admins = cursor.fetchall()
    
#     conn.close()
    
#     # Prepare the response
#     return jsonify({
#         'admins': [{'admin_id': admin[0], 'username': admin[1], 'university_name': admin[2]} for admin in admins]
#     })

@app.route('/delete_admin', methods=['POST'])
def delete_admin():
    data = request.get_json()
    admin_id = data.get('admin_id')
    
    # Perform your deletion logic here (e.g., deleting the admin from the database)
    success = db.delete_admin(admin_id)
    
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'message': 'Failed to delete admin'})



@app.route('/logout')
def logout():
    # Here you would clear the session or any user authentication state
    session.pop('user_id', None)  # Example of clearing user session
    return redirect(url_for('home'))

# Home page route (Login Page)
@app.route('/')
def home():
    universities = get_universities()
    return render_template('login.html', universities1=universities)

# Login route for students/admins
@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']
    university_id = request.form.get('university')

    if username == "hello" and password == "111":
        return redirect(url_for('superadmin'))



    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()

    # Admin login check
    cursor.execute('''SELECT admin_id, username, university_id FROM Admins 
                      WHERE username = ? AND password = ? AND university_id = ?''', 
                   (username, password, university_id))
    admin = cursor.fetchone()

    if admin:
        session['admin_id'] = admin[0]  # Store admin ID in session
        session['username'] = admin[1]
        session['university_id'] = admin[2]
        return redirect(url_for('admin_dashboard'))
        

    cursor.execute('''SELECT teacher_id, name, username, university_id FROM Teachers 
                      WHERE username = ? AND password = ? AND university_id = ?''', 
                   (username, password, university_id))
    teacher = cursor.fetchone()

    if teacher:
        session['teacher_id'] = teacher[0]
        session['username'] = teacher[2]  # using username from Teachers table
        session['university_id'] = teacher[3]
        return redirect(url_for('teacher_dashboard'))

    # Student login check
    cursor.execute('''SELECT student_id, username, university_id FROM Students 
                      WHERE username = ? AND password = ? AND university_id = ?''', 
                   (username, password, university_id))
    student = cursor.fetchone()

    if student:
        session['student_id'] = student[0]
        session['username'] = student[1]
        session['university_id'] = student[2]
        return redirect(url_for('student'))

    flash("Invalid credentials. Please try again.", "error")
    return redirect(url_for('home'))


@app.route('/assign_admin', methods=['POST'])
def assign_admin():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    university_id = data.get('university_id')

    if not username or not password or not university_id:
        return jsonify({"success": False, "message": "All fields are required"}), 400

    # Call the add_admin function from db.py
    try:
        db.add_admin(username, password, university_id)
        return jsonify({"success": True, "message": "Admin assigned successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# @app.route('/get_admins', methods=['GET'])
# def get_admins():
#     conn = sqlite3.connect('university_system.db')
#     cursor = conn.cursor()

#     cursor.execute('''
#         SELECT a.admin_id, a.username, u.name as university_name
#         FROM Admins a
#         JOIN Universities u ON a.university_id = u.university_id
#     ''')
#     admins = cursor.fetchall()

#     admins_data = [
#         {"id": admin[0], "username": admin[1], "university_name": admin[2]}
#         for admin in admins
#     ]
    
#     conn.close()
    
#     return jsonify({"admins": admins_data})




@app.route('/get_students_performance', methods=['GET'])
def get_students_performance():
    university_filter = request.args.get('university', 'all')  # Get the university filter parameter
    students_data = db.check_all_students_performance(university_filter)
    return jsonify({'students': students_data})



@app.route('/get_all_universities_performance', methods=['GET'])
def get_all_universities_performance_route():
    performance_data = db.get_all_universities_performance()
    return jsonify(performance_data)

@app.route('/get_admins', methods=['GET'])
def get_admins_route():
    admins = db.get_admins()
    return jsonify([{"admin_id": a[0], "username": a[1], "password": a[2], "university_id": a[3], "university_name": a[4]} for a in admins])

@app.route('/add_university', methods=['POST'])
def add_university_route():
    data = request.json
    name = data.get('name')
    if name:
        db.add_university(name)
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Invalid data"})

@app.route('/delete_university', methods=['POST'])
def delete_university_route():
    data = request.json
    name = data.get('name')
    if name:
        db.delete_university(name)
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Invalid data"})

@app.route('/get_totals', methods=['GET'])
def get_totals_route():
    universities, admins, students = db.get_totals()
    return jsonify({"universities": universities, "admins": admins, "students": students})

@app.route('/superadmin')
def superadmin():
    amounts = db.get_totals()
    universities = db.get_all_universities_performance()
    univs = db.get_universities()
    performance = db.check_all_students_performance()
    admins = db.get_admins()
    necessary_subjects = db.get_necessary_subjects()
    return render_template(
        "superadmin.html",
        amounts=amounts,
        universities=universities,
        univs=univs,
        performance=performance,
        admins=admins,
        necessary_subjects=necessary_subjects
    )

@app.route('/add_necessary_subject', methods=['POST'])
def add_necessary_subject_route():
    try:
        data = request.json
        subject_name = data.get('subject')
        if not subject_name:
            return jsonify({"success": False, "message": "Subject name is required"}), 400
        success, message = db.add_necessary_subject(subject_name)
        if success:
            return jsonify({"success": True, "message": message or "Subject added successfully"}), 200
        else:
            return jsonify({"success": False, "message": message or "Failed to add subject"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/teacher_dashboard")
def teacher_dashboard():
    if "teacher_id" not in session:
        return redirect(url_for("home"))
    teacher_id = session["teacher_id"]
    username = session["username"]
    university_id = session["university_id"]

    # Get subjects assigned to this teacher
    subjects = db.get_subjects_by_teacher(teacher_id)
    return render_template("teacher.html", username=username, subjects=subjects)


@app.route("/get_student_grades", methods=["GET"])
def get_student_grades():
    # Expects a query parameter subject_id
    subject_id = request.args.get("subject_id")
    if not subject_id:
        return jsonify({"message": "Subject ID is required."}), 400
    try:
        student_grades = db.get_students_grades_by_subject(subject_id)
        # student_grades: list of tuples (student_id, name, username, grade, date_assigned)
        return jsonify({"student_grades": student_grades}), 200
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500


@app.route("/update_student_grade", methods=["POST"])
def update_student_grade():
    # Expects a JSON array of updated grades: [{ "student_id": ..., "subject_id": ..., "grade": ... }, ...]
    try:
        updates = request.json.get("updates")
        if not updates:
            return jsonify({"message": "No updates provided."}), 400
        for update in updates:
            student_id = update.get("student_id")
            subject_id = update.get("subject_id")
            grade = update.get("grade")
            if student_id and subject_id and grade is not None:
                db.update_grade(student_id, subject_id, grade)
        return jsonify({"message": "Grades updated successfully!"}), 200
    except Exception as e:
        return jsonify({"message": f"Error: {str(e)}"}), 500



@app.route("/student")
def student():
    student_id = session["student_id"]
    username = session["username"]
    university_id = session["university_id"]
    student_info = db.get_student_by_id(student_id)  # Returns a tuple (student_id, name, username, password, university_id)
    subjects = db.get_subjects(university_id)         # All subjects available in the university
    subjects_grade = db.get_subjects_grade(student_id)  # Subjects the student is enrolled in with grades

    return render_template("student.html", student=student_info, subjects=subjects, subjects_grade=subjects_grade)


@app.route('/graduate', methods=['GET'])
def graduate():
    # Ensure student is logged in
    student_id = session.get("student_id")
    if not student_id:
        return jsonify({"message": "Please log in as a student."}), 401

    # Check student's performance
    result = db.check_student_performance(student_id)
    if result == "Success":
        message = "You successfully passed all necessary subjects and can graduate!"
    else:
        message = "Your necessary subjects must be passed with 60+ points to graduate."
    return jsonify({"message": message}), 200


@app.route('/enroll_subject', methods=['POST'])
def enroll_subject():
    data = request.json
    student_id = session.get("student_id")
    university_id = session.get("university_id")
    subject_name = data.get("subject")
    
    if not subject_name:
        return jsonify({"message": "Subject name is required!"}), 400

    conn = sqlite3.connect("university_system.db")
    cursor = conn.cursor()
    
    # Get the subject_id and current available quantity for the subject
    cursor.execute("SELECT subject_id, quantity FROM Subjects WHERE name = ? AND university_id = ?", 
                   (subject_name, university_id))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return jsonify({"message": "Subject not found."}), 404
    
    subject_id, available_quantity = row

    if available_quantity <= 0:
        conn.close()
        return jsonify({"message": "Subject is full. No available places."}), 400

    try:
        # Begin transaction
        conn.execute("BEGIN")
        # Enroll the student by inserting a grade record with "Not Graded"
        cursor.execute('''
            INSERT INTO Grades (student_id, subject_id, grade, date_assigned)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(student_id, subject_id) DO UPDATE SET 
                grade = excluded.grade,
                date_assigned = CURRENT_TIMESTAMP
        ''', (student_id, subject_id, "Not Graded"))
        
        # Decrement the available quantity in the Subjects table by 1
        cursor.execute("UPDATE Subjects SET quantity = quantity - 1 WHERE subject_id = ?", (subject_id,))
        
        conn.commit()
        return jsonify({"message": "Subject enrolled successfully!"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"Error: {str(e)}"}), 500
    finally:
        conn.close()

def get_db_connection():
    conn = sqlite3.connect('university_system.db')
    conn.row_factory = sqlite3.Row
    return conn


# Admin Dashboard route
@app.route('/admin_dashboard')
def admin_dashboard():
    if 'admin_id' not in session:
        return redirect(url_for('home'))

    admin_id = session['admin_id']
    username = session['username']
    university_id = session['university_id']

    # Fetch the university name
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM Universities WHERE university_id = ?", (university_id,))
    university_name = cursor.fetchone()
    conn.close()

    if university_name:
        university_name = university_name[0]  # Extract name from tuple

    students = db.get_students(university_id)
    subjects = db.get_subjects(university_id)
    teachers = db.get_teachers_by_university(university_id)
    teachers_with_subjects = db.get_subjects_with_teachers(university_id)

    return render_template(
        'admin.html',
        admin_id=admin_id,
        username=username,
        university_id=university_id,
        university_name=university_name,
        students=students,
        subjects=subjects,
        teachers=teachers,
        teachers_with_subjects=teachers_with_subjects
    )



@app.route('/delete_necessary_subject', methods=['POST'])
def delete_necessary_subject():
    data = request.get_json()
    subject_id = data.get('subject_id')

    if not subject_id:
        return jsonify({"success": False, "message": "Subject ID is required!"}), 400

    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()

    cursor.execute("DELETE FROM Necessary_Subjects WHERE subject_id = ?", (subject_id,))
    conn.commit()

    conn.close()

    return jsonify({"success": True, "message": "Subject deleted successfully!"}), 200


@app.route('/get_necessary_subjects', methods=['GET'])
def get_necessary_subjects():
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    cursor.execute("SELECT subject_id, name FROM Necessary_Subjects")
    subjects = cursor.fetchall()
    conn.close()

    return jsonify({"subjects": [{"subject_id": subject[0], "name": subject[1]} for subject in subjects]})




@app.route('/students')
def students():
    # Fetch all students from the database
    conn = sqlite3.connect('university_system.db')
    cursor = conn.cursor()
    cursor.execute("SELECT student_id, name, username FROM Students")
    students = cursor.fetchall()
    conn.close()

    return render_template('student.html', students=students)

# Add these new routes to your Flask app to fetch updated data
@app.route('/get_students', methods=['GET'])
def get_students_json():
    university_id = session.get('university_id')
    if not university_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    students = db.get_students(university_id)
    students_data = [{"student_id": s[0], "name": s[1], "login": s[2], "password": s[3]} for s in students]
    return jsonify({"students": students_data})

@app.route('/get_teachers', methods=['GET'])
def get_teachers_json():
    university_id = session.get('university_id')
    if not university_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    teachers = db.get_teachers_by_university(university_id)
    teachers_data = [{"teacher_id": t[0], "name": t[1], "login": t[2], "password": t[3]} for t in teachers]
    return jsonify({"teachers": teachers_data})

@app.route('/get_subjects_with_teachers', methods=['GET'])
def get_subjects_with_teachers_json():
    university_id = session.get('university_id')
    if not university_id:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    subjects = db.get_subjects_with_teachers(university_id)
    subjects_data = [{"subject_id": s[0], "name": s[1], "quantity": s[2], "teacher": s[3] if s[3] else "Not Assigned"} for s in subjects]
    return jsonify({"subjects": subjects_data})

# Update the add_student route to return updated student list
@app.route('/add_student', methods=['POST'])
def add_student():
    try:
        data = request.json
        name = data.get('name')
        login = data.get('login')
        password = data.get('password')
        university_id = session.get('university_id')

        if not name or not login or not password:
            return jsonify({"success": False, "message": "All fields are required!"}), 400

        if not university_id:
            return jsonify({"success": False, "message": "Unauthorized request!"}), 403

        success = db.add_student(name, login, password, university_id)
        if success:
            students = db.get_students(university_id)
            students_data = [{"student_id": s[0], "name": s[1], "login": s[2], "password": s[3]} for s in students]
            return jsonify({"success": True, "message": "Student registered successfully!", "students": students_data}), 200
        else:
            return jsonify({"success": False, "message": "Username already taken!"}), 400

    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

# Update the delete_student route to return updated student list
@app.route('/delete_student', methods=['POST'])
def delete_student_route():
    data = request.get_json()
    student_id = data.get('student_id')
    university_id = session.get('university_id')

    if not student_id or not university_id:
        return jsonify({"success": False, "message": "Invalid request"}), 400

    db.delete_student(student_id)
    students = db.get_students(university_id)
    students_data = [{"student_id": s[0], "name": s[1], "login": s[2], "password": s[3]} for s in students]
    return jsonify({"success": True, "message": "Student deleted successfully!", "students": students_data})

# Update the add_teacher route to return updated teacher list
@app.route('/add_teacher', methods=['POST'])
def add_teacher():
    try:
        data = request.json
        name = data.get('name')
        login = data.get('login')
        password = data.get('password')
        university_id = session.get('university_id')

        if not name or not login or not password:
            return jsonify({"success": False, "message": "All fields are required!"}), 400

        if not university_id:
            return jsonify({"success": False, "message": "Unauthorized request!"}), 403

        db.add_teacher(name, login, password, university_id)
        teachers = db.get_teachers_by_university(university_id)
        teachers_data = [{"teacher_id": t[0], "name": t[1], "login": t[2], "password": t[3]} for t in teachers]
        return jsonify({"success": True, "message": "Teacher registered successfully!", "teachers": teachers_data}), 200

    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

# Update the delete_teacher route to return updated teacher list
@app.route('/delete_teacher', methods=['POST'])
def delete_teacher_route():
    teacher_id = request.json.get('teacher_id')
    university_id = session.get('university_id')
    if teacher_id and university_id:
        db.delete_teacher(teacher_id)
        teachers = db.get_teachers_by_university(university_id)
        teachers_data = [{"teacher_id": t[0], "name": t[1], "login": t[2], "password": t[3]} for t in teachers]
        return jsonify({"success": True, "message": "Teacher deleted successfully!", "teachers": teachers_data})
    else:
        return jsonify({"success": False, "message": "Teacher ID or University ID missing"}), 400

# Update the add_subject route to return updated subject list
@app.route('/add_subject', methods=['POST'])
def add_subject_route():
    data = request.json
    subject_name = data.get('subject')
    teacher_name = data.get('teacher')
    university_id = data.get('university_id')
    quantity = data.get("quantity")

    if not subject_name or not teacher_name or not university_id or not quantity:
        return jsonify({"success": False, "message": "All fields are required!"}), 400

    success, message = db.add_subject_and_assign(subject_name, teacher_name, quantity, university_id)
    if success:
        subjects = db.get_subjects_with_teachers(university_id)
        subjects_data = [{"subject_id": s[0], "name": s[1], "quantity": s[2], "teacher": s[3] if s[3] else "Not Assigned"} for s in subjects]
        return jsonify({"success": True, "message": message, "subjects": subjects_data}), 200
    else:
        return jsonify({"success": False, "message": message}), 400

# Update the delete_subject route to return updated subject list
@app.route('/delete_subject', methods=['POST'])
def delete_subject_route():
    subject_id = request.json.get('subject_id')
    university_id = session.get('university_id')
    if subject_id and university_id:
        db.delete_subject(subject_id)
        subjects = db.get_subjects_with_teachers(university_id)
        subjects_data = [{"subject_id": s[0], "name": s[1], "quantity": s[2], "teacher": s[3] if s[3] else "Not Assigned"} for s in subjects]
        return jsonify({"success": True, "message": "Subject deleted successfully!", "subjects": subjects_data})
    else:
        return jsonify({"success": False, "message": "Subject ID or University ID missing"}), 400







# @app.route('/registered_students')
# def registered_students():
#     students = db.get_students()
#     return render_template('registered_students.html')

# @app.route('/registered_teachers')
# def registered_teachers():
#     return render_template('registered_teachers.html')

# @app.route('/subjects')
# def subjects():
#     return render_template('subjects.html')


if __name__ == "__main__":
    app.run(debug=True)
