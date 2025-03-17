document.addEventListener('DOMContentLoaded', function() {
    const courseGrid = document.getElementById('course-grid');
    const searchInput = document.getElementById('course-search');
    const addCourseBtn = document.getElementById('add-course-btn');
    
    // API URLs
    const API_BASE_URL = 'http://127.0.0.1:8000/api/';
    const UNIVERSITIES_API = `${API_BASE_URL}universities/`;
    const COURSES_API = `${API_BASE_URL}courses/`;
    const USERS_API = `${API_BASE_URL}users/`;
    const STUDENTS_API = `${API_BASE_URL}users/?role=student`;
    const CURRENT_USER_API = `${API_BASE_URL}current-user/`;
    
    // Store fetched data globally
    let universities = [];
    let courses = [];
    let students = [];
    let selectedUniversityId = null;
    let currentUser = null;
    
    // Check authentication and permissions
    async function checkAuth() {
        try {
            // Get the token from localStorage
            const token = localStorage.getItem('authToken');
            
            if (!token) {
                // No token, redirect to login
                window.location.href = 'login.html';
                return null;
            }
            
            const response = await fetch(CURRENT_USER_API, {
                headers: {
                    'Authorization': `Token ${token}`
                }
            });
            
            if (!response.ok) {
                // Invalid token
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                return null;
            }
            
            const userData = await response.json();
            currentUser = userData;
            
            // If university admin, pre-select their university
            if (currentUser.university_id) {
                selectedUniversityId = parseInt(currentUser.university_id);
                console.log("University admin detected, setting university ID:", selectedUniversityId);
                
                // Enable the Add Course button immediately for university admins
                if (addCourseBtn) {
                    addCourseBtn.disabled = false;
                    console.log("Enabling Add Course button for university admin");
                }
            }
            
            // Update UI based on user role
            updateUIForUserRole(currentUser);
            
            return currentUser;
        } catch (error) {
            console.error('Authentication error:', error);
            return null;
        }
    }
    
    // Update UI elements based on user role
    function updateUIForUserRole(user) {
        // If user has university_id, they're a university admin
        const isHeadAdmin = !user.university_id;
        
        // Update page header
        const headerTitle = document.querySelector('.header-title h1');
        if (headerTitle && !isHeadAdmin) {
            const universityName = universities.find(u => u.id === user.university_id)?.name || 'Your University';
            headerTitle.textContent = `Course Management - ${universityName}`;
        }
    }
    
    // Fetch universities from API
    async function fetchUniversities() {
        try {
            console.log("Fetching universities from API...");
            
            const token = localStorage.getItem('authToken');
            
            const fetchOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Token ${token}` : ''
                },
            };
            
            const response = await fetch(UNIVERSITIES_API, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Universities fetched successfully, count:", data.length);
            
            universities = Array.isArray(data) ? data : [];
            
            // Populate university selector if on courses page
            populateUniversitySelector(universities);
            
            // If user is university admin, automatically fetch their courses
            if (currentUser && currentUser.university_id) {
                fetchCourses(currentUser.university_id);
            }
            
            return universities;
        } catch (error) {
            console.error('Error fetching universities:', error);
            return [];
        }
    }
    
    // Fetch courses for a specific university
    async function fetchCourses(universityId = null) {
        try {
            console.log(`Fetching courses${universityId ? ' for university ' + universityId : ''}...`);
            
            const token = localStorage.getItem('authToken');
            
            let url = COURSES_API;
            if (universityId) {
                url += `?university=${universityId}`;
            }
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': token ? `Token ${token}` : ''
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Courses fetched successfully, count: ${data.length}`);
            
            courses = Array.isArray(data) ? data : [];
            console.log('data:', courses);
            displayCourses(courses);
            
            return courses;
        } catch (error) {
            console.error('Error fetching courses:', error);
            displayCourses([]);
            showNotification('Failed to load courses. Please try again later.', 'error');
            return [];
        }
    }
    
    // Fetch students from backend API
    async function fetchStudents() {
        try {
            console.log("Fetching students from API...");
            
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.error('No authentication token available');
                return [];
            }
            
            const response = await fetch(STUDENTS_API, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Students fetched successfully, count:", data.length);
            
            // Filter students and format data
            students = data.filter(user => user.role === 'student').map(student => ({
                id: student.id,
                name: student.name,
                studentId: student.username,
                email: student.email,
                coursesWithGrades: student.coursesWithGrades || [],
                gpa: student.gpa || calculateGPA(student.coursesWithGrades || [])
            }));
            
            return students;
        } catch (error) {
            console.error('Error fetching students:', error);
            showNotification('Failed to load students', 'error');
            return [];
        }
    }
    
    // Helper function to calculate GPA from grades
    function calculateGPA(coursesWithGrades) {
        if (!coursesWithGrades || coursesWithGrades.length === 0) return 0;
        
        const gradeValues = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'D-': 0.7,
            'F': 0
        };
        
        let totalPoints = 0;
        let totalCredits = 0;
        
        coursesWithGrades.forEach(item => {
            const course = courses.find(c => c.id === item.courseId);
            if (course && item.grade) {
                const credits = course.credits || 0;
                const gradeValue = gradeValues[item.grade] || 0;
                totalPoints += credits * gradeValue;
                totalCredits += credits;
            }
        });
        
        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;
    }
    
    // Create a university selector in the header
    function populateUniversitySelector(universities) {
        // Check if selector already exists
        let selectorContainer = document.querySelector('.university-selector-container');
        
        // If user is university admin, they don't need to select university
        if (currentUser && currentUser.university_id) {
            // If container exists, remove it - university admin doesn't need to select
            if (selectorContainer) {
                selectorContainer.remove();
            }
            return;
        }
        
        if (!selectorContainer) {
            // Create the container
            selectorContainer = document.createElement('div');
            selectorContainer.className = 'university-selector-container';
            
            // Create the selector
            const selector = document.createElement('select');
            selector.id = 'university-selector';
            selector.className = 'university-selector';
            
            // Create default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select University';
            selector.appendChild(defaultOption);
            
            // Add event listener
            selector.addEventListener('change', function() {
                const universityId = this.value ? parseInt(this.value) : null;
                selectedUniversityId = universityId;
                
                // Enable/disable add course button based on selection
                if (addCourseBtn) {
                    addCourseBtn.disabled = !universityId;
                }
                
                // Fetch courses for selected university
                if (universityId) {
                    fetchCourses(universityId);
                } else {
                    displayCourses([]);
                }
            });
            
            // Add the selector to the container
            selectorContainer.appendChild(selector);
            
            // Find the search container and insert before it
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer && searchContainer.parentNode) {
                searchContainer.parentNode.insertBefore(selectorContainer, searchContainer);
            }
        }
        
        // Get the selector
        const selector = document.getElementById('university-selector');
        
        // Clear existing options (except default)
        while (selector.options.length > 1) {
            selector.remove(1);
        }
        
        // Add university options
        universities.forEach(uni => {
            const option = document.createElement('option');
            option.value = uni.id;
            option.textContent = uni.name;
            selector.appendChild(option);
        });
    }
    
    // Display courses
    function displayCourses(coursesToDisplay) {
        if (!courseGrid) return;
        
        courseGrid.innerHTML = '';
        
        if (coursesToDisplay.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = selectedUniversityId ? 
                'No courses found for this university' : 
                'Please select a university to view courses';
            noResults.style.gridColumn = '1 / span 2';
            noResults.style.textAlign = 'center';
            noResults.style.padding = '20px';
            courseGrid.appendChild(noResults);
            return;
        }
        
        coursesToDisplay.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = `course-card ${course.type || 'mandatory'}`;
            courseCard.dataset.id = course.id;
            
            // Make the course card clickable to show enrolled students
            courseCard.addEventListener('click', () => {
                showStudentList(course.id);
            });
            
            const typeSpan = document.createElement('span');
            typeSpan.className = `course-type ${course.type || 'mandatory'}`;
            typeSpan.textContent = (course.type || 'Mandatory').charAt(0).toUpperCase() + (course.type || 'mandatory').slice(1);
            
            const title = document.createElement('h3');
            title.className = 'course-title';
            title.textContent = course.name;
            
            const info = document.createElement('div');
            info.className = 'course-info';
            info.innerHTML = `
                <p><strong>Credits:</strong> ${course.credits}</p>
                <p><strong>Professor:</strong> ${course.professor || 'Not assigned'}</p>
                <p>${course.description || 'No description available.'}</p>
                <p><strong>University:</strong> ${getUniversityName(course.university)}</p>
            `;
            
            const actions = document.createElement('div');
            actions.className = 'course-actions';
            
            // Get enrolled students count
            const enrolledCount = getEnrolledStudentCount(course.id);
            
            // Display enrolled students count
            const studentsInfo = document.createElement('div');
            studentsInfo.className = 'enrolled-info';
            studentsInfo.innerHTML = `<i class="fas fa-user-graduate"></i> ${enrolledCount} student${enrolledCount !== 1 ? 's' : ''}`;
            
            // Add enroll student button
            const enrollBtn = document.createElement('button');
            enrollBtn.className = 'btn-enroll';
            enrollBtn.innerHTML = '<i class="fas fa-user-plus"></i> Enroll';
            enrollBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent opening student list
                showEnrollmentDialog(course.id);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteCourse(course.id);
            });
            
            actions.appendChild(studentsInfo);
            actions.appendChild(enrollBtn);
            actions.appendChild(deleteBtn);
            courseCard.appendChild(typeSpan);
            courseCard.appendChild(title);
            courseCard.appendChild(info);
            courseCard.appendChild(actions);
            
            courseGrid.appendChild(courseCard);
        });
    }
    
    // Helper function to get university name from ID
    function getUniversityName(universityId) {
        const university = universities.find(u => u.id === universityId);
        return university ? university.name : 'Unknown University';
    }
    
    // Helper function to get enrolled student count for a course
    function getEnrolledStudentCount(courseId) {
        if (!students || students.length === 0) {
            return 0;
        }
        return students.filter(student => 
            student.coursesWithGrades && 
            student.coursesWithGrades.some(c => c.courseId === courseId)
        ).length;
    }
    
    // Helper function to get students enrolled in a course
    function getEnrolledStudents(courseId) {
        if (!students || students.length === 0) {
            return [];
        }
        return students.filter(student => 
            student.coursesWithGrades && 
            student.coursesWithGrades.some(c => c.courseId === courseId)
        );
    }
    
    // Show students enrolled in a specific course
    function showStudentList(courseId) {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;
        
        // Create dialog container
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'university-dialog student-list-dialog';
        
        // Create dialog content
        const dialogHeader = document.createElement('div');
        dialogHeader.className = 'dialog-header';
        dialogHeader.innerHTML = `<h3>Students Enrolled in ${course.name}</h3><button class="close-btn">&times;</button>`;
        
        const dialogBody = document.createElement('div');
        dialogBody.className = 'dialog-body';
        
        // Get enrolled students
        const enrolledStudents = getEnrolledStudents(courseId);
        
        if (enrolledStudents.length === 0) {
            dialogBody.innerHTML = '<p>No students are currently enrolled in this course.</p>';
        } else {
            let tableContent = `
                <table class="student-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Grade</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            enrolledStudents.forEach(student => {
                // Find the course grade
                const courseGrade = student.coursesWithGrades.find(c => c.courseId === courseId);
                const grade = courseGrade ? courseGrade.grade : 'N/A';
                
                tableContent += `
                    <tr>
                        <td>${student.name}</td>
                        <td>${student.studentId}</td>
                        <td>${student.email}</td>
                        <td>
                            <select class="rating-select" data-student-id="${student.id}" data-course-id="${courseId}">
                                <option value="" ${grade === 'N/A' ? 'selected' : ''}>N/A</option>
                                <option value="A+" ${grade === 'A+' ? 'selected' : ''}>A+</option>
                                <option value="A" ${grade === 'A' ? 'selected' : ''}>A</option>
                                <option value="A-" ${grade === 'A-' ? 'selected' : ''}>A-</option>
                                <option value="B+" ${grade === 'B+' ? 'selected' : ''}>B+</option>
                                <option value="B" ${grade === 'B' ? 'selected' : ''}>B</option>
                                <option value="B-" ${grade === 'B-' ? 'selected' : ''}>B-</option>
                                <option value="C+" ${grade === 'C+' ? 'selected' : ''}>C+</option>
                                <option value="C" ${grade === 'C' ? 'selected' : ''}>C</option>
                                <option value="C-" ${grade === 'C-' ? 'selected' : ''}>C-</option>
                                <option value="D+" ${grade === 'D+' ? 'selected' : ''}>D+</option>
                                <option value="D" ${grade === 'D' ? 'selected' : ''}>D</option>
                                <option value="D-" ${grade === 'D-' ? 'selected' : ''}>D-</option>
                                <option value="F" ${grade === 'F' ? 'selected' : ''}>F</option>
                            </select>
                        </td>
                        <td>
                            <button class="btn-unenroll" data-student-id="${student.id}" data-course-id="${courseId}">
                                <i class="fas fa-user-minus"></i> Unenroll
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            tableContent += `
                    </tbody>
                </table>
            `;
            
            dialogBody.innerHTML = tableContent;
        }
        
        // Add enroll button at the bottom
        const enrollSection = document.createElement('div');
        enrollSection.className = 'enroll-section';
        enrollSection.style.marginTop = '20px';
        enrollSection.style.textAlign = 'center';
        
        const enrollBtn = document.createElement('button');
        enrollBtn.className = 'btn-primary';
        enrollBtn.innerHTML = '<i class="fas fa-user-plus"></i> Enroll Students';
        enrollBtn.addEventListener('click', () => {
            closeDialog();
            showEnrollmentDialog(courseId);
        });
        
        enrollSection.appendChild(enrollBtn);
        dialogBody.appendChild(enrollSection);
        
        const dialogFooter = document.createElement('div');
        dialogFooter.className = 'dialog-footer';
        dialogFooter.innerHTML = `
            <button id="close-dialog-btn" class="btn btn-primary">Close</button>
        `;
        
        // Assemble dialog
        dialog.appendChild(dialogHeader);
        dialog.appendChild(dialogBody);
        dialog.appendChild(dialogFooter);
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // Dialog functionality
        const closeBtn = dialogOverlay.querySelector('.close-btn');
        const closeDialogBtn = dialogOverlay.querySelector('#close-dialog-btn');
        
        // Close dialog handlers
        const closeDialog = () => {
            dialogOverlay.classList.remove('active');
            setTimeout(() => dialogOverlay.remove(), 300);
        };
        
        closeBtn.addEventListener('click', closeDialog);
        closeDialogBtn.addEventListener('click', closeDialog);
        dialogOverlay.addEventListener('click', (e) => {
            if (e.target === dialogOverlay) closeDialog();
        });
        
        // Add event listeners for grade changes
        const gradeSelects = dialogOverlay.querySelectorAll('.rating-select');
        gradeSelects.forEach(select => {
            select.addEventListener('change', function() {
                updateStudentGrade(
                    parseInt(this.dataset.studentId),
                    parseInt(this.dataset.courseId),
                    this.value
                );
            });
        });
        
        // Add event listeners for unenroll buttons
        const unenrollButtons = dialogOverlay.querySelectorAll('.btn-unenroll');
        unenrollButtons.forEach(button => {
            button.addEventListener('click', function() {
                if (confirm('Are you sure you want to unenroll this student?')) {
                    unenrollStudent(
                        parseInt(this.dataset.studentId),
                        parseInt(this.dataset.courseId),
                        closeDialog
                    );
                }
            });
        });
        
        // Show dialog with animation
        setTimeout(() => dialogOverlay.classList.add('active'), 10);
        
        return dialogOverlay;
    }
    
    // Update student's grade for a course
    async function updateStudentGrade(studentId, courseId, grade) {
        try {
            showNotification('Updating grade...', 'info');
            
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Authentication required');
            }
            
            // Find the student
            const student = students.find(s => s.id === studentId);
            if (!student) {
                throw new Error('Student not found');
            }
            
            // Find the course enrollment
            const coursesWithGrades = [...(student.coursesWithGrades || [])];
            const courseIndex = coursesWithGrades.findIndex(c => c.courseId === courseId);
            
            if (courseIndex === -1) {
                throw new Error('Student is not enrolled in this course');
            }
            
            // Update the grade
            coursesWithGrades[courseIndex] = {
                ...coursesWithGrades[courseIndex],
                grade: grade || 'N/A'
            };
            
            // Make API call to update the student record
            const response = await fetch(`${USERS_API}${studentId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify({
                    coursesWithGrades: coursesWithGrades
                })
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Failed to update grade: ${errorData}`);
            }
            
            // Update local data with response
            const updatedStudent = await response.json();
            
            // Update student in our local array
            const studentIndex = students.findIndex(s => s.id === studentId);
            if (studentIndex !== -1) {
                students[studentIndex] = {
                    ...students[studentIndex],
                    coursesWithGrades: updatedStudent.coursesWithGrades || [],
                    gpa: updatedStudent.gpa || calculateGPA(updatedStudent.coursesWithGrades || [])
                };
            }
            
            showNotification('Grade updated successfully');
            return true;
        } catch (error) {
            console.error('Error updating grade:', error);
            showNotification('Failed to update grade: ' + error.message, 'error');
            return false;
        }
    }
    
    // Unenroll a student from a course
    async function unenrollStudent(studentId, courseId, callback) {
        try {
            showNotification('Unenrolling student...', 'info');
            
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Authentication required');
            }
            
            // Find the student
            const student = students.find(s => s.id === studentId);
            if (!student) {
                throw new Error('Student not found');
            }
            
            // Filter out the course to unenroll from
            const updatedCoursesWithGrades = (student.coursesWithGrades || [])
                .filter(c => c.courseId !== courseId);
            
            // Make API call to update the student record
            const response = await fetch(`${USERS_API}${studentId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify({
                    coursesWithGrades: updatedCoursesWithGrades
                })
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Failed to unenroll student: ${errorData}`);
            }
            
            // Update local data with response
            const updatedStudent = await response.json();
            
            // Update student in our local array
            const studentIndex = students.findIndex(s => s.id === studentId);
            if (studentIndex !== -1) {
                students[studentIndex] = {
                    ...students[studentIndex],
                    coursesWithGrades: updatedStudent.coursesWithGrades || [],
                    gpa: updatedStudent.gpa || calculateGPA(updatedStudent.coursesWithGrades || [])
                };
            }
            
            showNotification('Student unenrolled successfully');
            
            // Refresh course display to update student counts
            displayCourses(courses);
            
            // Close the dialog if a callback is provided
            if (typeof callback === 'function') {
                callback();
            }
            
            return true;
        } catch (error) {
            console.error('Error unenrolling student:', error);
            showNotification('Failed to unenroll student: ' + error.message, 'error');
            return false;
        }
    }
    
    // Show enrollment dialog for a course
    function showEnrollmentDialog(courseId) {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;
        
        // Create dialog container
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'university-dialog';
        
        // Create dialog content
        const dialogHeader = document.createElement('div');
        dialogHeader.className = 'dialog-header';
        dialogHeader.innerHTML = `<h3>Enroll Students in ${course.name}</h3><button class="close-btn">&times;</button>`;
        
        const dialogBody = document.createElement('div');
        dialogBody.className = 'dialog-body';
        
        // Get students who are not enrolled in this course
        const enrolledStudentIds = getEnrolledStudents(courseId).map(s => s.id);
        const availableStudents = students.filter(s => !enrolledStudentIds.includes(s.id));
        
        if (availableStudents.length === 0) {
            dialogBody.innerHTML = '<p>All students are already enrolled in this course.</p>';
        } else {
            dialogBody.innerHTML = `
                <div class="search-box" style="margin-bottom: 15px;">
                    <input type="text" id="student-search-input" placeholder="Search students..." 
                           style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
                </div>
                <div class="student-list" style="max-height: 300px; overflow-y: auto;">
                    <table class="student-table">
                        <thead>
                            <tr>
                                <th style="width: 30px;"></th>
                                <th>Name</th>
                                <th>ID</th>
                                <th>Email</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody id="enrollment-student-list">
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        const dialogFooter = document.createElement('div');
        dialogFooter.className = 'dialog-footer';
        dialogFooter.innerHTML = `
            <button id="cancel-btn" class="btn">Cancel</button>
            <button id="enroll-btn" class="btn btn-primary" ${availableStudents.length === 0 ? 'disabled' : ''}>Enroll Selected</button>
        `;
        
        // Assemble dialog
        dialog.appendChild(dialogHeader);
        dialog.appendChild(dialogBody);
        dialog.appendChild(dialogFooter);
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // Add students to the list if there are available students
        if (availableStudents.length > 0) {
            const studentListBody = document.getElementById('enrollment-student-list');
            
            availableStudents.forEach(student => {
                const row = document.createElement('tr');
                row.className = 'student-row';
                row.dataset.studentId = student.id;
                
                row.innerHTML = `
                    <td>
                        <input type="checkbox" class="student-select" data-student-id="${student.id}">
                    </td>
                    <td>${student.name}</td>
                    <td>${student.studentId}</td>
                    <td>${student.email}</td>
                    <td>
                        <select class="initial-grade" data-student-id="${student.id}">
                            <option value="">No Grade</option>
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
                    </td>
                `;
                
                studentListBody.appendChild(row);
            });
            
            // Add search functionality
            const searchInput = document.getElementById('student-search-input');
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const rows = document.querySelectorAll('.student-row');
                
                rows.forEach(row => {
                    const name = row.cells[1].textContent.toLowerCase();
                    const id = row.cells[2].textContent.toLowerCase();
                    const email = row.cells[3].textContent.toLowerCase();
                    
                    if (name.includes(searchTerm) || id.includes(searchTerm) || email.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        }
        
        // Dialog functionality
        const closeBtn = dialogOverlay.querySelector('.close-btn');
        const cancelBtn = dialogOverlay.querySelector('#cancel-btn');
        const enrollBtn = dialogOverlay.querySelector('#enroll-btn');
        
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
        
        // Enroll students handler
        if (enrollBtn && !enrollBtn.disabled) {
            enrollBtn.addEventListener('click', async () => {
                // Get selected students
                const selectedCheckboxes = dialogOverlay.querySelectorAll('.student-select:checked');
                
                if (selectedCheckboxes.length === 0) {
                    showNotification('Please select at least one student to enroll', 'error');
                    return;
                }
                
                // Show loading notification
                showNotification(`Enrolling ${selectedCheckboxes.length} student(s) in ${course.name}...`, 'info');
                
                let successful = 0;
                
                for (const checkbox of selectedCheckboxes) {
                    const studentId = parseInt(checkbox.dataset.studentId);
                    const gradeSelect = dialogOverlay.querySelector(`.initial-grade[data-student-id="${studentId}"]`);
                    const grade = gradeSelect ? gradeSelect.value : '';
                    
                    const success = await enrollStudent(studentId, courseId, grade);
                    if (success) {
                        successful++;
                    }
                }
                
                if (successful > 0) {
                    showNotification(`Successfully enrolled ${successful} student(s) in ${course.name}`);
                    closeDialog();
                    
                    // Refresh course display to update student counts
                    displayCourses(courses);
                }
            });
        }
        
        // Show dialog with animation
        setTimeout(() => dialogOverlay.classList.add('active'), 10);
        
        return dialogOverlay;
    }
    
    // Enroll a student in a course
    async function enrollStudent(studentId, courseId, grade = '') {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Authentication required');
            }
            
            // Find the student
            const student = students.find(s => s.id === studentId);
            if (!student) {
                throw new Error('Student not found');
            }
            
            // Check if already enrolled
            if (student.coursesWithGrades && student.coursesWithGrades.some(c => c.courseId === courseId)) {
                throw new Error('Student is already enrolled in this course');
            }
            
            // Create enrollment data to send to API
            const newCourseWithGrade = {
                courseId: courseId,
                grade: grade || 'N/A'
            };
            
            // Create an updated coursesWithGrades array
            const updatedCoursesWithGrades = [...(student.coursesWithGrades || []), newCourseWithGrade];
            
            // Make API call to update the student record
            const response = await fetch(`${USERS_API}${studentId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify({
                    coursesWithGrades: updatedCoursesWithGrades
                })
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Failed to enroll student: ${errorData}`);
            }
            
            // Update local data with response
            const updatedStudent = await response.json();
            
            // Update student in our local array
            const studentIndex = students.findIndex(s => s.id === studentId);
            if (studentIndex !== -1) {
                students[studentIndex] = {
                    ...students[studentIndex],
                    coursesWithGrades: updatedStudent.coursesWithGrades || [],
                    gpa: updatedStudent.gpa || calculateGPA(updatedStudent.coursesWithGrades || [])
                };
            }
            
            showNotification(`Student enrolled in ${courses.find(c => c.id === courseId)?.name}`);
            return true;
        } catch (error) {
            console.error('Error enrolling student:', error);
            showNotification('Failed to enroll student: ' + error.message, 'error');
            return false;
        }
    }
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filteredCourses = courses.filter(course => 
                course.name.toLowerCase().includes(searchTerm) || 
                (course.professor && course.professor.toLowerCase().includes(searchTerm)) ||
                (course.description && course.description.toLowerCase().includes(searchTerm))
            );
            displayCourses(filteredCourses);
        });
    }
    
    // Add a new function to fetch professors by university
    async function fetchProfessorsByUniversity(universityId) {
        try {
            console.log(`Fetching professors for university ${universityId}...`);
            
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.error('No authentication token available');
                return [];
            }
            
            // Fetch all users
            const users = await fetch(`${API_BASE_URL}users/`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                }
            }).then(res => res.json());
            
            // Filter to get only professors from the specified university
            const professors = users.filter(user => 
                user.role === 'teacher' && 
                user.university_id == universityId
            );
            
            console.log(`Found ${professors.length} professors for university ${universityId}`);
            return professors;
        } catch (error) {
            console.error('Error fetching professors:', error);
            return [];
        }
    }

    // Create course dialog with university selection
    function createCourseDialog() {
        // Create dialog container
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'university-dialog';
        
        // Create dialog content
        const dialogHeader = document.createElement('div');
        dialogHeader.className = 'dialog-header';
        dialogHeader.innerHTML = '<h3>Add New Course</h3><button class="close-btn">&times;</button>';
        
        const dialogBody = document.createElement('div');
        dialogBody.className = 'dialog-body';
        
        // If user is university admin, use their university
        let universityId = selectedUniversityId;
        let universityName = "Unknown University";
        
        if (currentUser && currentUser.university_id) {
            universityId = currentUser.university_id;
            universityName = universities.find(u => u.id === parseInt(universityId))?.name || "Your University";
        } else {
            universityName = getUniversityName(universityId);
        }
        
        console.log(`Creating course dialog with university: ${universityName} (ID: ${universityId})`);
        
        dialogBody.innerHTML = `
            <form id="course-form">
                <div class="form-group">
                    <label>University</label>
                    <input type="text" value="${universityName}" readonly>
                    <input type="hidden" id="university-id" value="${universityId}">
                </div>
                <div class="form-group">
                    <label for="course-name">Course Name *</label>
                    <input type="text" id="course-name" required>
                </div>
                <div class="form-group">
                    <label for="course-credits">Credits *</label>
                    <input type="number" id="course-credits" min="1" max="6" required>
                </div>
                <div class="form-group">
                    <label for="course-professor">Professor</label>
                    <select id="course-professor">
                        <option value="">-- Select a Professor --</option>
                        <option value="To be assigned">To be assigned</option>
                        <!-- Professors will be loaded here -->
                    </select>
                </div>
                <div class="form-group">
                    <label for="course-type">Type</label>
                    <select id="course-type">
                        <option value="mandatory">Mandatory</option>
                        <option value="optional">Optional</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="course-description">Description</label>
                    <textarea id="course-description" rows="3"></textarea>
                </div>
            </form>
        `;
        
        const dialogFooter = document.createElement('div');
        dialogFooter.className = 'dialog-footer';
        dialogFooter.innerHTML = `
            <button id="cancel-btn" class="btn">Cancel</button>
            <button id="save-btn" class="btn btn-primary">Save Course</button>
        `;
        
        // Assemble dialog
        dialog.appendChild(dialogHeader);
        dialog.appendChild(dialogBody);
        dialog.appendChild(dialogFooter);
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // Load professors for the selected university
        fetchProfessorsByUniversity(universityId).then(professors => {
            const professorSelect = document.getElementById('course-professor');
            if (professors.length > 0) {
                professors.forEach(professor => {
                    const option = document.createElement('option');
                    option.value = professor.name;
                    option.textContent = professor.name;
                    professorSelect.appendChild(option);
                });
            }
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
        
        // Save handler
        saveBtn.addEventListener('click', async () => {
            const nameInput = document.getElementById('course-name');
            const creditsInput = document.getElementById('course-credits');
            const universityIdInput = document.getElementById('university-id');
            
            // Simple validation
            if (!nameInput.value.trim() || !creditsInput.value) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }
            
            // Create new course object
            const newCourse = {
                name: nameInput.value.trim(),
                credits: parseInt(creditsInput.value),
                professor: document.getElementById('course-professor').value,
                type: document.getElementById('course-type').value,
                description: document.getElementById('course-description').value.trim() || '',
                university: parseInt(universityIdInput.value)
            };
            
            saveCourse(newCourse, closeDialog);
        });
        
        // Show dialog with animation
        setTimeout(() => dialogOverlay.classList.add('active'), 10);
        
        return dialogOverlay;
    }

    // Save handler for course creation dialog
    async function saveCourse(newCourse, closeDialog) {
        try {
            const token = localStorage.getItem('authToken');
            
            // If user is university admin, force university ID
            if (currentUser && currentUser.university_id) {
                // Make sure university_id is parsed as a number
                newCourse.university = parseInt(currentUser.university_id);
                console.log('Setting university to current user university:', newCourse.university);
            }
            
            // Log what we're sending to the API for debugging
            console.log('Sending course data to API:', JSON.stringify(newCourse));
            
            // Send POST request to API
            const response = await fetch(COURSES_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': token ? `Token ${token}` : ''
                },
                body: JSON.stringify(newCourse)
            });
            
            // Log response status for debugging
            console.log('API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
            }
            
            const savedCourse = await response.json();
            console.log("Successfully saved course:", savedCourse);
            
            // Close the modal
            closeDialog();
            
            // Show success message
            showNotification(`${newCourse.name} has been successfully added!`);
            
            // Refresh the courses list
            fetchCourses(currentUser && currentUser.university_id ? 
                currentUser.university_id : selectedUniversityId);
            
        } catch (error) {
            console.error('Error adding course:', error);
            showNotification(`Failed to add course: ${error.message}`, 'error');
        }
    }
    
    // Add new course
    if (addCourseBtn) {
        // For university admins, we already enabled the button in checkAuth()
        // Only keep it disabled for head admins until they select a university
        if (!currentUser || !currentUser.university_id) {
            addCourseBtn.disabled = !selectedUniversityId;
        }
        
        addCourseBtn.addEventListener('click', function() {
            // For university admins, we always have a university
            if (currentUser && currentUser.university_id) {
                createCourseDialog();
            } else if (!selectedUniversityId) {
                showNotification('Please select a university first', 'error');
            } else {
                createCourseDialog();
            }
        });
    }
    
    // Delete course
    async function deleteCourse(courseId) {
        if (confirm('Are you sure you want to delete this course?')) {
            try {
                const token = localStorage.getItem('authToken');
                
                const response = await fetch(`${COURSES_API}${courseId}/`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': token ? `Token ${token}` : ''
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                // Remove from local array
                courses = courses.filter(course => course.id !== courseId);
                displayCourses(courses);
                showNotification('Course deleted successfully');
                
            } catch (error) {
                console.error('Error deleting course:', error);
                showNotification('Failed to delete course. Please try again.', 'error');
            }
        }
    }
    
    // Show notification
    function showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Add active class to trigger animation
        setTimeout(() => notification.classList.add('active'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('active');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
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
            
            .student-list-dialog {
                width: 700px;
                max-width: 95%;
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
                max-height: 60vh;
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
            
            /* Student table styles */
            .student-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }
            
            .student-table th,
            .student-table td {
                padding: 12px 15px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            
            .student-table th {
                background-color: #f5f7fa;
                font-weight: 600;
                color: #333;
            }
            
            .student-table tr:hover {
                background-color: #f9f9f9;
            }
            
            .rating-select {
                padding: 5px;
                border-radius: 4px;
                border: 1px solid #ddd;
                cursor: pointer;
                font-size: 14px;
                min-width: 80px;
                background-color: #f9f9f9;
            }
            
            .rating-select option {
                padding: 3px;
            }
            
            .enrolled-info {
                display: flex;
                align-items: center;
                gap: 5px;
                color: #666;
                font-size: 14px;
            }
            
            .course-card {
                cursor: pointer;
            }
            
            /* University selector styles */
            .university-selector-container {
                margin-bottom: 20px;
            }
            
            .university-selector {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: #f9f9f9;
                font-size: 16px;
                cursor: pointer;
            }
            
            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add logout functionality
    function setupLogoutButtons() {
        const logoutButtons = document.querySelectorAll('#logout-btn, #header-logout-btn');
        
        logoutButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', function() {
                    // Remove auth token
                    localStorage.removeItem('authToken');
                    
                    // Redirect to login page
                    window.location.href = 'login.html';
                    
                    // Show notification
                    showNotification('Logged out successfully');
                });
            }
        });
    }
    
    // Initialize - check auth first, then fetch universities and students
    if (document.querySelector('.content-area')) {
        checkAuth().then(user => {
            if (user) {
                // Fetch universities
                fetchUniversities().then(() => {
                    // Fetch students after universities have loaded
                    fetchStudents().then(() => {
                        // If user is university admin, get their courses
                        if (currentUser.university_id) {
                            fetchCourses(currentUser.university_id);
                        }
                    });
                });
                
                // Set up logout buttons
                setupLogoutButtons();
            }
        });
    }
});
