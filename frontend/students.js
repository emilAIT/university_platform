document.addEventListener('DOMContentLoaded', function() {
    console.log("Students.js loaded");
    
    // API routes
    const API_BASE_URL = 'http://127.0.0.1:8000/api';
    const COURSES_API = `${API_BASE_URL}/courses/`;
    const LOGIN_API = `${API_BASE_URL}/login/`;
    const USERS_API = `${API_BASE_URL}/users/`;
    const STUDENTS_API = `${API_BASE_URL}/users/?role=student`;
    const UNIVERSITIES_API = `${API_BASE_URL}/universities/`;
    
    // Authentication token storage
    let authToken = localStorage.getItem('authToken');
    
    // Data will be fetched from API
    let courses = [];
    let students = [];
    let universities = []; // Add universities array to store university data

    // DOM Elements
    const courseGrid = document.getElementById('course-grid');
    if (!courseGrid) {
        console.error("Course grid element not found!");
        return;
    }
    
    const searchInput = document.getElementById('course-search');
    const studentSearchInput = document.getElementById('student-search');
    const addStudentBtn = document.getElementById('add-student-btn');
    const studentListModal = document.getElementById('student-list-modal');
    const modalCourseTitle = document.getElementById('modal-course-title');
    const modalCloseBtn = document.querySelector('.modal-close');
    const studentList = document.getElementById('student-list');
    const studentGrid = document.getElementById('student-grid');
    
    // Fetch courses from backend API
    async function fetchCourses() {
        try {
            showLoadingIndicator();
            
            // Set up request headers with authentication token if available
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (authToken) {
                headers['Authorization'] = `Token ${authToken}`;
            }
            
            const response = await fetch(COURSES_API, {
                method: 'GET',
                headers: headers
            });
            
            if (response.status === 401) {
                // Unauthorized: need to login
                hideLoadingIndicator();
                showLoginModal();
                return [];
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Courses fetched from API:", data);
            
            // Normalize API data to match our expected format if needed
            courses = data.map(course => ({
                id: course.id,
                name: course.name,
                credits: course.credits,
                professor: course.professor || 'Not assigned',
                type: course.type || 'mandatory',
                description: course.description || '',
                university_id: course.university_id || null // Add university_id to course data
            }));
            
            // Display courses once they're loaded
            displayCourses(courses);
            
            hideLoadingIndicator();
            return courses;
        } catch (error) {
            console.error("Error fetching courses:", error);
            showErrorMessage("Failed to load courses from server");
            hideLoadingIndicator();
            return [];
        }
    }
    
    // Fetch students from backend API
    async function fetchStudents() {
        try {
            showStudentLoadingIndicator();
            
            // Set up request headers with authentication token if available
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (authToken) {
                headers['Authorization'] = `Token ${authToken}`;
            }
            
            // Use the specific endpoint for students only
            const response = await fetch(STUDENTS_API, {
                method: 'GET',
                headers: headers
            });
            
            if (response.status === 401) {
                // Unauthorized: need to login
                hideStudentLoadingIndicator();
                showLoginModal();
                return [];
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Students fetched from API: Total ${data.length} records`);
            
            // Make doubly sure we only have student role users by applying a strict filter
            const studentUsers = data.filter(user => user.role === 'student');
            console.log(`Filtered to ${studentUsers.length} users with student role`);
            
            if (studentUsers.length === 0) {
                console.warn("No users with student role found!");
            }
            
            // Transform API data to match our expected format and sort by name
            students = studentUsers.map(student => {
                // Ensure coursesWithGrades is always an array
                let coursesWithGrades = [];
                
                if (student.coursesWithGrades) {
                    // Handle both array and object formats for compatibility
                    if (Array.isArray(student.coursesWithGrades)) {
                        coursesWithGrades = student.coursesWithGrades;
                    } else if (typeof student.coursesWithGrades === 'object') {
                        // If it's an object, convert to array
                        coursesWithGrades = Object.values(student.coursesWithGrades);
                    }
                }
                
                return {
                    id: student.id,
                    name: student.name || 'Unnamed Student',
                    studentId: student.username || '',
                    email: student.email || '',
                    role: 'Student',
                    university: student.university_id,
                    // Ensure coursesWithGrades is properly formatted
                    coursesWithGrades: coursesWithGrades.map(c => {
                        if (typeof c === 'object' && c !== null) {
                            return {
                                courseId: parseInt(c.courseId) || 0,
                                grade: c.grade || 'N/A'
                            };
                        }
                        return { courseId: 0, grade: 'N/A' };
                    }),
                    gpa: student.gpa || '0.00'
                };
            });
            
            // Improved sorting - use localeCompare for better internationalization support
            students.sort((a, b) => {
                // Handle null/undefined names
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            
            console.log(`Processed and sorted ${students.length} students`);
            
            // Display students once they're loaded
            displayStudentCards(students);
            
            hideStudentLoadingIndicator();
            return students;
        } catch (error) {
            console.error("Error fetching students:", error);
            showStudentErrorMessage("Failed to load students from server");
            hideStudentLoadingIndicator();
            return [];
        }
    }
    
    // Helper function to calculate GPA from grades
    function calculateGPA(coursesWithGrades) {
        if (!coursesWithGrades || !Array.isArray(coursesWithGrades) || coursesWithGrades.length === 0) {
            return '0.00';
        }
        
        const gradeValues = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'D-': 0.7,
            'F': 0.0, 'N/A': 0.0
        };
        
        let totalPoints = 0;
        let totalCredits = 0;
        let validCourseCount = 0;
        
        coursesWithGrades.forEach(item => {
            try {
                // Ensure courseId is an integer
                const courseId = typeof item.courseId === 'string' ? 
                    parseInt(item.courseId) : item.courseId;
                    
                const course = courses.find(c => c.id === courseId);
                if (course && item.grade) {
                    validCourseCount++;
                    const credits = course.credits || 0;
                    const gradeValue = gradeValues[item.grade] || 0;
                    totalPoints += credits * gradeValue;
                    totalCredits += credits;
                }
            } catch (e) {
                console.warn("Error processing course grade:", e);
            }
        });
        
        console.log(`GPA calculation: points=${totalPoints}, credits=${totalCredits}, valid courses=${validCourseCount}`);
        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    }
    
    // Function to handle user login
    async function handleLogin(username, password) {
        try {
            const response = await fetch(LOGIN_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            if (!response.ok) {
                throw new Error('Login failed');
            }
            
            const data = await response.json();
            
            if (data.token) {
                // Save the token
                authToken = data.token;
                localStorage.setItem('authToken', authToken);
                
                // Close login modal if it's open
                closeLoginModal();
                
                // Re-fetch courses with the new token
                fetchCourses();
                
                showNotification('Login successful');
                return true;
            } else {
                throw new Error('No token received');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Login failed: ' + error.message, 'error');
            return false;
        }
    }
    
    // Create login modal
    function showLoginModal() {
        // Check if modal already exists
        if (document.getElementById('login-modal-overlay')) {
            return;
        }
        
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'login-modal-overlay';
        modalOverlay.className = 'dialog-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'university-dialog';
        
        modal.innerHTML = `
            <div class="dialog-header">
                <h3>Login Required</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="dialog-body">
                <p>Please login to access course data</p>
                <form id="login-form">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" required>
                    </div>
                </form>
            </div>
            <div class="dialog-footer">
                <button id="login-cancel-btn" class="btn">Cancel</button>
                <button id="login-btn" class="btn btn-primary">Login</button>
            </div>
        `;
        
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);
        
        // Add event listeners
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = document.getElementById('login-cancel-btn');
        const loginBtn = document.getElementById('login-btn');
        const loginForm = document.getElementById('login-form');
        
        closeBtn.addEventListener('click', closeLoginModal);
        cancelBtn.addEventListener('click', closeLoginModal);
        
        loginBtn.addEventListener('click', () => {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showNotification('Please enter username and password', 'error');
                return;
            }
            
            handleLogin(username, password);
        });
        
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            loginBtn.click();
        });
        
        // Show modal with animation
        setTimeout(() => modalOverlay.classList.add('active'), 10);
    }
    
    // Close login modal
    function closeLoginModal() {
        const modalOverlay = document.getElementById('login-modal-overlay');
        if (!modalOverlay) return;
        
        modalOverlay.classList.remove('active');
        setTimeout(() => modalOverlay.remove(), 300);
    }
    
    // Helper function to show loading indicator
    function showLoadingIndicator() {
        const existingLoader = document.getElementById('course-loader');
        if (existingLoader) return;
        
        const loader = document.createElement('div');
        loader.id = 'course-loader';
        loader.className = 'loader';
        loader.innerHTML = '<div class="spinner"></div><p>Loading courses...</p>';
        
        courseGrid.innerHTML = '';
        courseGrid.appendChild(loader);
    }
    
    // Helper function to hide loading indicator
    function hideLoadingIndicator() {
        const loader = document.getElementById('course-loader');
        if (loader) {
            loader.remove();
        }
    }
    
    // Helper function to show error message
    function showErrorMessage(message) {
        courseGrid.innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-circle" style="color: #e74c3c; font-size: 24px;"></i>
                <p>${message}</p>
                <button id="retry-btn" class="btn btn-primary">Retry</button>
                ${!authToken ? '<button id="login-btn" class="btn btn-secondary" style="margin-left: 10px;">Login</button>' : ''}
            </div>
        `;
        
        document.getElementById('retry-btn').addEventListener('click', () => {
            fetchCourses();
        });
        
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                showLoginModal();
            });
        }
    }
    
    // Helper function to show student loading indicator
    function showStudentLoadingIndicator() {
        const existingLoader = document.getElementById('student-loader');
        if (existingLoader) return;
        
        const loader = document.createElement('div');
        loader.id = 'student-loader';
        loader.className = 'loader';
        loader.innerHTML = '<div class="spinner"></div><p>Loading students...</p>';
        
        studentGrid.innerHTML = '';
        studentGrid.appendChild(loader);
    }
    
    // Helper function to hide student loading indicator
    function hideStudentLoadingIndicator() {
        const loader = document.getElementById('student-loader');
        if (loader) {
            loader.remove();
        }
    }
    
    // Helper function to show student error message
    function showStudentErrorMessage(message) {
        studentGrid.innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-circle" style="color: #e74c3c; font-size: 24px;"></i>
                <p>${message}</p>
                <button id="retry-students-btn" class="btn btn-primary">Retry</button>
                ${!authToken ? '<button id="login-btn-students" class="btn btn-secondary" style="margin-left: 10px;">Login</button>' : ''}
            </div>
        `;
        
        document.getElementById('retry-students-btn').addEventListener('click', () => {
            fetchStudents();
        });
        
        const loginBtn = document.getElementById('login-btn-students');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                showLoginModal();
            });
        }
    }

    // Helper function to get course enrollments
    function getStudentsInCourse(courseId) {
        // Ensure courseId is an integer for comparison
        const courseIdInt = parseInt(courseId);
        
        return students.filter(student => {
            // Handle case where student or coursesWithGrades might be undefined
            if (!student || !Array.isArray(student.coursesWithGrades)) {
                return false;
            }
            
            return student.coursesWithGrades.some(c => {
                // Convert both to integers for comparison to avoid type mismatches
                const studentCourseId = parseInt(c.courseId);
                return !isNaN(studentCourseId) && studentCourseId === courseIdInt;
            });
        });
    }
    
    // Display courses with student counts and university info
    function displayCourses(coursesToDisplay) {
        console.log("Displaying courses:", coursesToDisplay);
        courseGrid.innerHTML = '';
        
        if (coursesToDisplay.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No courses found';
            noResults.style.gridColumn = '1 / span 2';
            noResults.style.textAlign = 'center';
            noResults.style.padding = '20px';
            courseGrid.appendChild(noResults);
            return;
        }
        
        coursesToDisplay.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = `course-card ${course.type}`;
            courseCard.dataset.id = course.id;
            
            const typeSpan = document.createElement('span');
            typeSpan.className = `course-type ${course.type}`;
            typeSpan.textContent = course.type.charAt(0).toUpperCase() + course.type.slice(1);
            
            const title = document.createElement('h3');
            title.className = 'course-title';
            title.textContent = course.name;
            
            const info = document.createElement('div');
            info.className = 'course-info';
            
            // Get university name for this course
            const universityName = course.university_id ? 
                getUniversityName(course.university_id) : "University not specified";
            
            info.innerHTML = `
                <p><strong>Credits:</strong> ${course.credits}</p>
                <p><strong>Professor:</strong> ${course.professor}</p>
                <p><strong>University:</strong> ${universityName}</p>
                <p>${course.description}</p>
            `;
            
            // Removed the student count badge
            
            courseCard.appendChild(typeSpan);
            courseCard.appendChild(title);
            courseCard.appendChild(info);
            // Removed the line that appends the count badge
            
            // Add click event to show students for this course
            courseCard.addEventListener('click', () => {
                showStudentsInCourse(course.id);
            });
            
            courseGrid.appendChild(courseCard);
        });
        
        console.log("Courses displayed, grid now contains:", courseGrid.children.length, "items");
    }
    
    // Display students enrolled in a specific course
    function showStudentsInCourse(courseId) {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;
        
        // Set modal title with university info
        const universityName = course.university_id ? 
            getUniversityName(course.university_id) : "";
            
        modalCourseTitle.textContent = `${course.name}${universityName ? ` - ${universityName}` : ''} - Students`;
        
        // Get students enrolled in this course
        const enrolledStudents = getStudentsInCourse(courseId);
        
        // Clear and populate student list
        studentList.innerHTML = '';
        
        if (enrolledStudents.length === 0) {
            studentList.innerHTML = '<p class="no-students">No students enrolled in this course.</p>';
        } else {
            enrolledStudents.forEach(student => {
                // Find the grade for this course
                const courseGrade = student.coursesWithGrades.find(c => c.courseId === courseId);
                const grade = courseGrade ? courseGrade.grade : 'N/A';
                
                // Get all courses this student is enrolled in
                const totalCredits = student.coursesWithGrades.reduce((sum, c) => {
                    const course = courses.find(course => course.id === c.courseId);
                    return sum + (course ? course.credits : 0);
                }, 0);
                
                // Get university name
                const universityName = student.university ? 
                    getUniversityName(student.university) : "Unknown University";
                
                const studentItem = document.createElement('div');
                studentItem.className = 'student-item';
                
                // Create avatar with student initials
                const avatar = document.createElement('div');
                avatar.className = 'student-avatar';
                const initials = student.name.split(' ')
                    .map(n => n[0]).join('');
                avatar.textContent = initials;
                
                const info = document.createElement('div');
                info.className = 'student-info';
                
                const name = document.createElement('div');
                name.className = 'student-name';
                name.textContent = student.name;
                
                // Add grade display
                const gradeSpan = document.createElement('span');
                gradeSpan.className = `badge grade-${grade.charAt(0).toLowerCase()}`;
                gradeSpan.textContent = grade;
                name.appendChild(gradeSpan);
                
                // Add university badge
                const universityBadge = document.createElement('span');
                universityBadge.className = 'university-badge';
                universityBadge.textContent = universityName;
                name.appendChild(universityBadge);
                
                // Add credit badge
                const creditBadge = document.createElement('span');
                creditBadge.className = 'credit-badge';
                creditBadge.textContent = `${totalCredits} Credits`;
                name.appendChild(creditBadge);
                
                const details = document.createElement('div');
                details.className = 'student-details';
                details.innerHTML = `
                    ID: ${student.studentId} | Email: ${student.email} | GPA: ${student.gpa}
                `;
                
                info.appendChild(name);
                info.appendChild(details);
                
                studentItem.appendChild(avatar);
                studentItem.appendChild(info);
                
                studentList.appendChild(studentItem);
            });
        }
        
        // Show the modal
        studentListModal.style.display = 'flex';
    }
    
    // Display all student cards with university info
    function displayStudentCards(studentsToDisplay) {
        if (!studentGrid) {
            console.error("Student grid element not found");
            return;
        }
        
        console.log("Displaying student cards:", studentsToDisplay.length);
        studentGrid.innerHTML = '';
        
        if (!Array.isArray(studentsToDisplay) || studentsToDisplay.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No students found';
            noResults.style.gridColumn = '1 / -1';
            noResults.style.textAlign = 'center';
            noResults.style.padding = '20px';
            studentGrid.appendChild(noResults);
            return;
        }
        
        studentsToDisplay.forEach(student => {
            try {
                const card = document.createElement('div');
                card.className = 'student-card';
                
                // Card header with avatar
                const header = document.createElement('div');
                header.className = 'student-card-header';
                
                const avatar = document.createElement('div');
                avatar.className = 'student-card-avatar';
                const initials = (student.name || 'UN').split(' ')
                    .map(n => n[0] || '').join('').substring(0, 2);
                avatar.textContent = initials;
                
                const headerInfo = document.createElement('div');
                headerInfo.innerHTML = `
                    <h3>${student.name || 'Unnamed Student'}</h3>
                    <div>${student.studentId || 'No ID'} <span class="role-badge">Student</span></div>
                `;
                
                header.appendChild(avatar);
                header.appendChild(headerInfo);
                
                // Card body with student info and courses
                const body = document.createElement('div');
                body.className = 'student-card-body';
                
                const info = document.createElement('div');
                info.className = 'student-card-info';

                const totalCredits = calculateTotalCredits(student.coursesWithGrades || []);
                
                // Get university name for this student
                const universityName = student.university ? 
                    getUniversityName(student.university) : "University not specified";
                
                info.innerHTML = `
                    <div><strong>Email:</strong> ${student.email || 'No email'}</div>
                    <div><strong>University:</strong> ${universityName}</div>
                    <div><strong>GPA:</strong> ${student.gpa || '0.00'}</div>
                    <div><strong>Total Credits:</strong> ${totalCredits}</div>
                `;
                
                const coursesList = document.createElement('div');
                coursesList.innerHTML = '<h4>Courses & Grades</h4>';
                
                const list = document.createElement('ul');
                list.className = 'student-courses-list';
                
                // Add courses and grades with better error handling
                const coursesWithGrades = student.coursesWithGrades || [];
                if (coursesWithGrades.length === 0) {
                    const noCourses = document.createElement('li');
                    noCourses.className = 'no-courses';
                    noCourses.textContent = 'No courses enrolled';
                    list.appendChild(noCourses);
                } else {
                    coursesWithGrades.forEach(courseGrade => {
                        try {
                            // Ensure courseId is an integer
                            const courseId = typeof courseGrade.courseId === 'string' ? 
                                parseInt(courseGrade.courseId) : courseGrade.courseId;
                            
                            const course = courses.find(c => c.id === courseId);
                            if (!course) {
                                console.warn(`Course with ID ${courseId} not found`);
                                return;
                            }
                            
                            const courseItem = document.createElement('li');
                            courseItem.className = 'student-course-item';
                            
                            const courseName = document.createElement('span');
                            courseName.textContent = course.name;
                            
                            const grade = courseGrade.grade || 'N/A';
                            const gradeFirstChar = grade.charAt(0).toLowerCase();
                            const gradeClass = 'abcdf'.includes(gradeFirstChar) ? gradeFirstChar : 'n';
                            
                            const gradeSpan = document.createElement('span');
                            gradeSpan.className = `student-course-grade grade-${gradeClass}`;
                            gradeSpan.textContent = grade;
                            
                            courseItem.appendChild(courseName);
                            courseItem.appendChild(gradeSpan);
                            list.appendChild(courseItem);
                        } catch (e) {
                            console.error("Error displaying course:", e);
                        }
                    });
                }
                
                coursesList.appendChild(list);
                body.appendChild(info);
                body.appendChild(coursesList);
                
                // Assemble the card
                card.appendChild(header);
                card.appendChild(body);
                
                studentGrid.appendChild(card);
            } catch (e) {
                console.error("Error creating student card:", e, student);
            }
        });
    }
    
    // Helper function to calculate total credits
    function calculateTotalCredits(coursesWithGrades) {
        if (!Array.isArray(coursesWithGrades) || coursesWithGrades.length === 0) {
            return 0;
        }
        
        let total = 0;
        
        coursesWithGrades.forEach(item => {
            try {
                // Ensure courseId is an integer
                const courseId = typeof item.courseId === 'string' ? 
                    parseInt(item.courseId) : item.courseId;
                    
                const course = courses.find(c => c.id === courseId);
                if (course) {
                    total += course.credits || 0;
                }
            } catch (e) {
                console.warn("Error calculating credits:", e);
            }
        });
        
        return total;
    }
    
    // Close the modal
    modalCloseBtn.addEventListener('click', () => {
        studentListModal.style.display = 'none';
    });
    
    // Close the modal if clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === studentListModal) {
            studentListModal.style.display = 'none';
        }
    });

    // Initial display - fetch courses and then students
    async function initializeApp() {
        try {
            // First fetch universities
            await fetchUniversities();
            
            // Then fetch courses and students
            await fetchCourses();
            await fetchStudents();
        } catch (error) {
            console.error('Error initializing app:', error);
            showNotification('Error loading data from server', 'error');
        }
    }

    // Start the app
    initializeApp();

    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredCourses = courses.filter(course => 
            course.name.toLowerCase().includes(searchTerm) || 
            (course.professor && course.professor.toLowerCase().includes(searchTerm)) ||
            (course.description && course.description.toLowerCase().includes(searchTerm))
        );
        displayCourses(filteredCourses);
    });

    // Add loading spinner styles
    if (!document.getElementById('loader-styles')) {
        const style = document.createElement('style');
        style.id = 'loader-styles';
        style.textContent = `
            .loader {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                grid-column: 1 / -1;
                width: 100%;
            }
            
            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(26, 95, 165, 0.1);
                border-radius: 50%;
                border-left-color: #1a5fa5;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // Student search functionality
    studentSearchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        // Make sure we only filter through actual student records
        if (!Array.isArray(students)) {
            console.error("Students array is not properly initialized");
            return;
        }
        
        const filteredStudents = students.filter(student => 
            (student.name || '').toLowerCase().includes(searchTerm) || 
            (student.studentId || '').toLowerCase().includes(searchTerm) ||
            (student.email || '').toLowerCase().includes(searchTerm)
        );
        
        console.log(`Filtered to ${filteredStudents.length} students matching search term: ${searchTerm}`);
        displayStudentCards(filteredStudents);
    });

    // Create student dialog
    function createStudentDialog() {
        // Create dialog container
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'university-dialog';
        
        // Create dialog content
        const dialogHeader = document.createElement('div');
        dialogHeader.className = 'dialog-header';
        dialogHeader.innerHTML = '<h3>Add New Student</h3><button class="close-btn">&times;</button>';
        
        const dialogBody = document.createElement('div');
        dialogBody.className = 'dialog-body';
        
        // Basic student info form - updated with university field and password field
        const basicInfoForm = `
            <div class="form-group">
                <label for="student-name">Full Name *</label>
                <input type="text" id="student-name" required>
            </div>
            <div class="form-group">
                <label for="student-id">Student ID *</label>
                <input type="text" id="student-id" required>
            </div>
            <div class="form-group">
                <label for="student-email">Email *</label>
                <input type="email" id="student-email" required placeholder="student@university.edu">
            </div>
            <div class="form-group">
                <label for="student-password">Password *</label>
                <input type="password" id="student-password" required>
            </div>
            <div class="form-group">
                <label for="student-university">University *</label>
                <select id="student-university" required>
                    <option value="">-- Select University --</option>
                </select>
            </div>
            <div class="form-group">
                <label for="student-gpa">GPA</label>
                <input type="number" id="student-gpa" min="0" max="4" step="0.1" placeholder="4.0">
            </div>
        `;
        
        // Course selection and grades form
        let courseSelectionForm = `
            <div class="form-group">
                <label>Select Courses & Grades *</label>
                <div class="course-checkbox-container">
        `;
        
        courses.forEach(course => {
            courseSelectionForm += `
                <div class="course-selection-item">
                    <div class="checkbox-group">
                        <input type="checkbox" id="course-${course.id}" value="${course.id}" name="courses">
                        <label for="course-${course.id}">
                            ${course.name} (${course.credits} credits)
                        </label>
                    </div>
                    <div class="grade-selection" id="grade-container-${course.id}" style="display:none; margin-left: 25px; margin-top: 5px;">
                        <label for="grade-${course.id}">Grade:</label>
                        <select id="grade-${course.id}" name="grade-${course.id}" class="grade-select">
                            <option value="A+">A+</option>
                            <option value="A">A</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B">B</option>
                            <option value="B-">B-</option>
                            <option value="C+">C+</option>
                            <option value="C">C</option>
                            <option value="C-">C-</option>
                            <option value="D+">D+</option>
                            <option value="D">D</option>
                            <option value="D-">D-</option>
                            <option value="F">F</option>
                        </select>
                    </div>
                </div>
            `;
        });
        
        courseSelectionForm += `
                </div>
            </div>
        `;
        
        // Assemble form
        dialogBody.innerHTML = `<form id="student-form">${basicInfoForm}${courseSelectionForm}</form>`;
        
        const dialogFooter = document.createElement('div');
        dialogFooter.className = 'dialog-footer';
        dialogFooter.innerHTML = `
            <button id="cancel-btn" class="btn">Cancel</button>
            <button id="save-btn" class="btn btn-primary">Save Student</button>
        `;
        
        // Assemble dialog
        dialog.appendChild(dialogHeader);
        dialog.appendChild(dialogBody);
        dialog.appendChild(dialogFooter);
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // Fetch universities and populate the dropdown
        const universitySelect = document.getElementById('student-university');
        fetchUniversities(universitySelect);
        
        // Add additional CSS for the grade selects
        if (!document.getElementById('grade-select-styles')) {
            const style = document.createElement('style');
            style.id = 'grade-select-styles';
            style.textContent = `
                .course-selection-item {
                    margin-bottom: 10px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eee;
                }
                
                .grade-selection {
                    margin-top: 5px;
                }
                
                .grade-select {
                    padding: 5px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    margin-left: 5px;
                }
                
                .course-checkbox-container {
                    max-height: 250px;
                    overflow-y: auto;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 10px;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Toggle grade select visibility when course is checked/unchecked
        const courseCheckboxes = dialogOverlay.querySelectorAll('input[name="courses"]');
        courseCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const courseId = this.value;
                const gradeContainer = document.getElementById(`grade-container-${courseId}`);
                if (this.checked) {
                    gradeContainer.style.display = 'block';
                } else {
                    gradeContainer.style.display = 'none';
                }
            });
        });
        
        // Dialog functionality
        const closeBtn = dialogOverlay.querySelector('.close-btn');
        const cancelBtn = dialogOverlay.querySelector('#cancel-btn');
        const saveBtn = dialogOverlay.querySelector('#save-btn');
        
        // Close dialog handlers
        const closeDialog = () => {
            dialogOverlay.classList.remove('active');
            setTimeout(() => dialogOverlay.remove(), 300);
        };
        
        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);
        dialogOverlay.addEventListener('click', (e) => {
            if (e.target === dialogOverlay) closeDialog();
        });
        
        // Save handler for student creation 
        saveBtn.addEventListener('click', async () => {
            const nameInput = document.getElementById('student-name');
            const idInput = document.getElementById('student-id');
            const emailInput = document.getElementById('student-email');
            const passwordInput = document.getElementById('student-password');
            const universitySelect = document.getElementById('student-university');
            const gpaInput = document.getElementById('student-gpa');
            
            // Get selected courses with grades
            const coursesWithGrades = [];
            document.querySelectorAll('input[name="courses"]:checked').forEach(checkbox => {
                const courseId = parseInt(checkbox.value);
                const gradeSelect = document.getElementById(`grade-${courseId}`);
                coursesWithGrades.push({
                    courseId: courseId,
                    grade: gradeSelect.value
                });
            });
            
            // Simple validation
            if (!nameInput.value.trim() || !idInput.value.trim() || !emailInput.value.trim() || 
                !passwordInput.value || !universitySelect.value) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }
            
            try {
                // Show loading notification
                showNotification('Creating new student...', 'info');
                
                // Set up request headers with authentication token
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                if (authToken) {
                    headers['Authorization'] = `Token ${authToken}`;
                } else {
                    showNotification('Authentication required to add students', 'error');
                    showLoginModal();
                    return;
                }
                
                // Get university ID from select element
                const universityId = parseInt(universitySelect.value);
                
                // Create student data matching the expected backend format
                const userData = {
                    name: nameInput.value.trim(),
                    username: idInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passwordInput.value,
                    university_id: universityId,
                    university: universityId, // Add both formats to ensure compatibility
                    role: 'student',
                    status: 'active',
                    is_active: true,
                    coursesWithGrades: coursesWithGrades
                };
                
                // Add optional GPA if provided
                if (gpaInput && gpaInput.value) {
                    userData.gpa = parseFloat(gpaInput.value).toFixed(2);
                }
                
                console.log('Sending student creation data:', JSON.stringify(userData));
                
                // Send request to create user
                const response = await fetch(USERS_API, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(userData)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API error response:', errorText);
                    throw new Error(`Failed to create student: ${errorText}`);
                }
                
                const newUserData = await response.json();
                console.log('Received response from API:', newUserData);
                
                // Show success notification
                showNotification('Student added successfully!');
                
                // Close dialog
                closeDialog();
                
                // Reload all data from server to ensure we have fresh data
                await fetchStudents();
                await fetchCourses();
                
            } catch (error) {
                console.error('Error creating student:', error);
                showNotification('Failed to create student: ' + error.message, 'error');
            }
        });
        
        // Show dialog with animation
        setTimeout(() => dialogOverlay.classList.add('active'), 10);
        
        return dialogOverlay;
    }

    // Fetch universities and populate the dropdown
    async function fetchUniversities(selectElement) {
        try {
            
            // Set up request headers with authentication token
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (authToken) {
                headers['Authorization'] = `Token ${authToken}`;
            } else {
                showNotification('Authentication required', 'error');
                return;
            }
            
            // Fetch universities
            const response = await fetch(`${API_BASE_URL}/universities/`, {
                method: 'GET',
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const universities = await response.json();
            
            // Populate the select element
            universities.forEach(university => {
                const option = document.createElement('option');
                option.value = university.id;
                option.textContent = university.name;
                selectElement.appendChild(option);
            });
            
            // Hide the notification
            // The timeout will handle hiding it
            
        } catch (error) {
            console.error('Error fetching universities:', error);
            showNotification('Failed to load universities', 'error');
        }
    }

    // Add new student
    addStudentBtn.addEventListener('click', function() {
        createStudentDialog();
    });
    
    // Show notification - updated to add info type
    function showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Add active class to trigger animation
        setTimeout(() => notification.classList.add('active'), 10);
        
        // Remove after 3 seconds (except for 'info' notifications which might need to stay longer)
        const duration = type === 'info' ? 10000 : 3000;
        setTimeout(() => {
            notification.classList.remove('active');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    
    // Add notification and dialog styles dynamically
    if (!document.getElementById('dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-styles';
        style.textContent = `
            .notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: #1a5fa5;
                color: white;
                padding: 15px 25px;
                border-radius: 5px;
                box-shadow: 0 3px 10px rgba(0,0,0,0.2);
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s;
                z-index: 1000;
            }
            .notification.active {
                transform: translateY(0);
                opacity: 1;
            }
            .notification.error {
                background-color: #e74c3c;
            }
            .notification.info {
                background-color: #3498db;
            }
            
            /* Dialog Styles */
            .dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s;
            }
            
            .dialog-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            .university-dialog {
                width: 500px;
                max-width: 90%;
                background-color: #fff;
                border-radius: 8px;
                border: 3px solid #1a5fa5;
                box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                transform: scale(0.8);
                transition: transform 0.3s;
            }
            
            .dialog-overlay.active .university-dialog {
                transform: scale(1);
            }
            
            .dialog-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid #eaeaea;
                background-color: #1a5fa5;
                color: white;
                border-top-left-radius: 5px;
                border-top-right-radius: 5px;
            }
            
            .dialog-header h3 {
                margin: 0;
                font-size: 18px;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: white;
            }
            
            .dialog-body {
                padding: 20px;
                max-height: 70vh;
                overflow-y: auto;
            }
            
            .form-group {
                margin-bottom: 15px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #333;
            }
            
            .form-group input,
            .form-group textarea,
            .form-group select {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 16px;
            }
            
            .dialog-footer {
                padding: 15px 20px;
                border-top: 1px solid #eaeaea;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            #save-btn {
                background-color: #1a5fa5;
            }
            
            #cancel-btn {
                background-color: #f5f5f5;
                color: #333;
            }

            /* Grade color styles */
            .badge {
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 14px;
                margin-left: 8px;
                font-weight: bold;
            }
            
            .grade-a {
                background-color: #4caf50;
                color: white;
            }
            
            .grade-b {
                background-color: #8bc34a;
                color: white;
            }
            
            .grade-c {
                background-color: #ffc107;
                color: #333;
            }
            
            .grade-d {
                background-color: #ff9800;
                color: white;
            }
            
            .grade-f {
                background-color: #f44336;
                color: white;
            }

            .role-badge {
                display: inline-block;
                background-color: #e0e7ff;
                color: #1a5fa5;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 12px;
                margin-left: 8px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Make sure the initial display is called after all other setup
    setTimeout(() => {
        if (courseGrid.children.length === 0 && courses.length > 0) {
            console.log("No courses displayed yet, trying again...");
            displayCourses(courses);
        }
        if (studentGrid && studentGrid.children.length === 0) {
            console.log("No student cards displayed yet, trying again...");
            displayStudentCards(students);
        }
    }, 500);

    // Add logout button to header if user is logged in
    function addLogoutButton() {
        // Find the existing header logout button
        const headerLogoutBtn = document.getElementById('header-logout-btn');
        
        if (authToken && headerLogoutBtn) {
            // Add click handler to the existing header logout button
            headerLogoutBtn.addEventListener('click', () => {
                localStorage.removeItem('authToken');
                authToken = null;
                showNotification('Logged out successfully');
                // Reload the page or update UI as needed
                setTimeout(() => location.reload(), 1000);
            });
        }
    }
    
    // Call this function on page load
    addLogoutButton();

    // Add academic report and data export functionality
    function createAcademicReportSection() {
        // Check if the container already exists
        let container = document.getElementById('academic-report-section');
        if (container) {
            return container;
        }
        
        // Create container
        container = document.createElement('div');
        container.id = 'academic-report-section';
        container.className = 'report-section';
        
        // Create heading and controls
        const header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = `
            <h2>Academic Report</h2>
            <div class="report-controls">
                <button id="export-students-csv" class="btn btn-secondary">Export Students (CSV)</button>
                <button id="export-students-json" class="btn btn-secondary">Export Students (JSON)</button>
                <button id="export-courses-csv" class="btn btn-secondary">Export Courses (CSV)</button>
                <button id="export-courses-json" class="btn btn-secondary">Export Courses (JSON)</button>
            </div>
        `;
        
        // Create table
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive';
        tableContainer.innerHTML = `
            <table id="academic-report-table" class="table table-striped">
                <thead>
                    <tr>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Courses</th>
                        <th>Credits</th>
                        <th>GPA</th>
                        <th>Grade Distribution</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Table content will be generated by JS -->
                </tbody>
            </table>
        `;
        
        // Assemble the section
        container.appendChild(header);
        container.appendChild(tableContainer);
        
        // Find the appropriate location to insert the section
        let insertAfter = studentGrid;
        if (insertAfter) {
            insertAfter.parentNode.insertBefore(container, insertAfter.nextSibling);
        } else {
            // Fallback - append to body
            document.body.appendChild(container);
        }
        
        // Add event listeners for export buttons
        container.querySelector('#export-students-csv').addEventListener('click', () => exportStudentData('csv'));
        container.querySelector('#export-students-json').addEventListener('click', () => exportStudentData('json'));
        container.querySelector('#export-courses-csv').addEventListener('click', () => exportCourseData('csv'));
        container.querySelector('#export-courses-json').addEventListener('click', () => exportCourseData('json'));
        
        return container;
    }
    
    // Function to generate and display academic report
    function generateAcademicReport() {
        console.log("Generating academic report...");
        
        if (!students || students.length === 0) {
            showNotification('No student data available for report', 'error');
            return;
        }
        
        // Create or get academic report section
        let reportSection = document.getElementById('academic-report-section');
        if (!reportSection) {
            reportSection = createAcademicReportSection();
        }
        
        // Show the section if it was hidden
        reportSection.style.display = 'block';
        
        // Get the report table body
        const reportTableBody = document.querySelector('#academic-report-table tbody');
        if (!reportTableBody) {
            console.error("Academic report table body not found");
            return;
        }
        
        // Clear existing content
        reportTableBody.innerHTML = '';
        
        // Debug: log the students array to check structure
        console.log("Students data for report:", students);
        
        // Use all students in the array since we've already filtered for student role when fetching
        students.forEach(student => {
            console.log("Processing student for report:", student);
            
            const totalCourses = student.coursesWithGrades ? student.coursesWithGrades.length : 0;
            const completedCredits = calculateTotalCredits(student.coursesWithGrades || []);
            
            // Create grade distribution summary
            const gradeDistribution = {};
            if (Array.isArray(student.coursesWithGrades)) {
                student.coursesWithGrades.forEach(item => {
                    const grade = item.grade || 'N/A';
                    gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
                });
            }
            
            // Create grade distribution text
            let gradeDistText = '';
            
            // Create row for this student
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.studentId}</td>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${totalCourses}</td>
                <td>${completedCredits}</td>
                <td>${student.gpa}</td>
                <td>${gradeDistText}</td>
            `;
            
            reportTableBody.appendChild(row);
        });
        
        showNotification('Academic report generated successfully');
    }
    
    // Function to export student data
    function exportStudentData(format = 'csv') {
        console.log(`Exporting student data as ${format}...`);
        
        try {
            if (!students || students.length === 0) {
                showNotification('No student data to export', 'error');
                return;
            }
            
            // Use all students since we've already filtered when fetching
            const studentData = students;
            console.log(`Exporting ${studentData.length} students as ${format}`);
            
            if (format === 'csv') {
                // CSV header
                let csv = 'Student ID,Name,Email,GPA,Total Credits,Courses,Grades\n';
                
                // Add data for each student
                studentData.forEach(student => {
                    const coursesWithGrades = student.coursesWithGrades || [];
                    const totalCredits = calculateTotalCredits(coursesWithGrades);
                    
                    // Prepare course names
                    const courseNames = coursesWithGrades.map(c => {
                        const course = courses.find(course => course.id === c.courseId);
                        return course ? course.name : `Course ${c.courseId}`;
                    }).join(';');
                    
                    // Prepare grades
                    const grades = coursesWithGrades.map(c => c.grade || 'N/A').join(';');
                    
                    // Escape fields that might contain commas
                    const escapeCsv = (text) => `"${String(text || '').replace(/"/g, '""')}"`;
                    
                    csv += `${escapeCsv(student.studentId)},${escapeCsv(student.name)},${escapeCsv(student.email)},`
                        + `${student.gpa},${totalCredits},${escapeCsv(courseNames)},${escapeCsv(grades)}\n`;
                });
                
                downloadData(csv, 'student-data.csv', 'text/csv');
                
            } else if (format === 'json') {
                // Export as JSON with additional calculated fields
                const exportData = studentData.map(student => {
                    const totalCredits = calculateTotalCredits(student.coursesWithGrades || []);
                    const courseDetails = (student.coursesWithGrades || []).map(c => {
                        const course = courses.find(course => course.id === c.courseId);
                        return {
                            courseId: c.courseId,
                            courseName: course ? course.name : `Unknown Course`,
                            grade: c.grade || 'N/A',
                            credits: course ? course.credits : 0
                        };
                    });
                    
                    return {
                        id: student.id,
                        name: student.name,
                        studentId: student.studentId,
                        email: student.email,
                        gpa: student.gpa,
                        totalCredits: totalCredits,
                        courses: courseDetails,
                        universityId: student.university
                    };
                });
                
                downloadData(JSON.stringify(exportData, null, 2), 'student-data.json', 'application/json');
            }
            
            showNotification(`Student data exported as ${format.toUpperCase()}`);
            
        } catch (error) {
            console.error("Error exporting student data:", error);
            showNotification('Failed to export student data: ' + error.message, 'error');
        }
    }
    
    // Function to export course data
    function exportCourseData(format = 'csv') {
        console.log(`Exporting course data as ${format}...`);
        
        try {
            if (!courses || courses.length === 0) {
                showNotification('No course data to export', 'error');
                return;
            }
            
            if (format === 'csv') {
                // CSV header
                let csv = 'Course ID,Name,Credits,Professor,Type,Description,Students Enrolled\n';
                
                // Add data for each course
                courses.forEach(course => {
                    const studentCount = getStudentsInCourse(course.id).length;
                    
                    // Escape fields that might contain commas
                    const escapeCsv = (text) => `"${String(text || '').replace(/"/g, '""')}"`;
                    
                    csv += `${course.id},${escapeCsv(course.name)},${course.credits},`
                        + `${escapeCsv(course.professor)},${course.type},${escapeCsv(course.description)},${studentCount}\n`;
                });
                
                downloadData(csv, 'course-data.csv', 'text/csv');
                
            } else if (format === 'json') {
                // Export as JSON with student enrollment details
                const exportData = courses.map(course => {
                    const enrolledStudents = getStudentsInCourse(course.id);
                    
                    // Get detailed student enrollment info
                    const enrollments = enrolledStudents.map(student => {
                        const enrollment = student.coursesWithGrades.find(c => c.courseId === course.id);
                        return {
                            studentId: student.id,
                            name: student.name,
                            grade: enrollment ? enrollment.grade : 'N/A'
                        };
                    });
                    
                    return {
                        id: course.id,
                        name: course.name,
                        credits: course.credits,
                        professor: course.professor,
                        type: course.type,
                        description: course.description,
                        studentCount: enrolledStudents.length,
                        enrolledStudents: enrollments
                    };
                });
                
                downloadData(JSON.stringify(exportData, null, 2), 'course-data.json', 'application/json');
            }
            
            showNotification(`Course data exported as ${format.toUpperCase()}`);
            
        } catch (error) {
            console.error("Error exporting course data:", error);
            showNotification('Failed to export course data: ' + error.message, 'error');
        }
    }
    
    // Helper function to download data
    function downloadData(content, fileName, contentType) {
        const a = document.createElement('a');
        const file = new Blob([content], {type: contentType});
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }
    
    // Add report generation button to page
    function addReportButton() {
        // Check if button already exists
        if (document.getElementById('generate-report-btn')) {
            return;
        }
        
        const reportBtn = document.createElement('button');
        reportBtn.id = 'generate-report-btn';
        reportBtn.className = 'btn btn-primary';
        reportBtn.textContent = 'Generate Academic Report';
        reportBtn.style.margin = '20px 0';
        
        // Add button after student grid
        if (studentGrid) {
            studentGrid.parentNode.insertBefore(reportBtn, studentGrid.nextSibling);
            reportBtn.addEventListener('click', generateAcademicReport);
        }
    }
    
    // Add styles for the academic report section
    if (!document.getElementById('academic-report-styles')) {
        const style = document.createElement('style');
        style.id = 'academic-report-styles';
        style.textContent = `
            .report-section {
                margin: 20px 0;
                padding: 20px;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            
            .report-controls {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin: 10px 0;
            }
            
            .report-controls button {
                white-space: nowrap;
            }
            
            #academic-report-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            #academic-report-table th,
            #academic-report-table td {
                padding: 10px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            
            #academic-report-table th {
                background-color: #1a5fa5;
                color: white;
            }
            
            #academic-report-table tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            
            #academic-report-table tr:hover {
                background-color: #f1f7fd;
            }
            
            @media (max-width: 768px) {
                .section-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                
                .report-controls {
                    margin-top: 15px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Call this function after all students are loaded to add the report button
    setTimeout(() => {
        addReportButton();
    }, 1000);

    // Fetch university data
    async function fetchUniversities() {
        try {
            // Set up request headers with authentication token if available
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (authToken) {
                headers['Authorization'] = `Token ${authToken}`;
            }
            
            const response = await fetch(UNIVERSITIES_API, {
                method: 'GET',
                headers: headers
            });
            
            if (response.status === 401) {
                // Unauthorized: need to login
                showLoginModal();
                return [];
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Universities fetched:", data);
            universities = data;
            return data;
        } catch (error) {
            console.error("Error fetching universities:", error);
            showNotification("Failed to load universities data", "error");
            return [];
        }
    }
    
    // Helper function to get university name by ID
    function getUniversityName(universityId) {
        if (!universities || universities.length === 0) return "Unknown University";
        
        const university = universities.find(u => u.id === universityId);
        return university ? university.name : "Unknown University";
    }

    // Add university badge styles
    if (!document.getElementById('university-badge-styles')) {
        const style = document.createElement('style');
        style.id = 'university-badge-styles';
        style.textContent = `
            .university-badge {
                display: inline-block;
                background-color: #d4edda;
                color: #155724;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 12px;
                margin-left: 8px;
            }
        `;
        document.head.appendChild(style);
    }
});