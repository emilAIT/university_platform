document.addEventListener('DOMContentLoaded', function() {
    console.log("Reports.js loaded");
    
    // API endpoints
    const API_BASE_URL = 'http://127.0.0.1:8000/api';
    const COURSES_API = `${API_BASE_URL}/courses/`;
    const USERS_API = `${API_BASE_URL}/users/`;
    const UNIVERSITIES_API = `${API_BASE_URL}/universities/`;
    
    // Data storage - will be populated from API
    const courses = [];
    let students = [];
    
    console.log("Will load courses and students from API");
    
    // DOM Elements
    const courseGrid = document.getElementById('course-grid');
    if (!courseGrid) {
        console.error("Error: Course grid element not found!");
        return;
    }
    
    const searchInput = document.getElementById('course-search');
    const exportBtn = document.getElementById('export-btn');
    const academicReportBtn = document.getElementById('academic-report-btn');
    const studentsTableContainer = document.getElementById('students-table-container');
    const backButton = document.getElementById('back-to-courses');
    const selectedCourseTitle = document.getElementById('selected-course-title');
    const studentsTableBody = document.getElementById('students-table-body');
    
    // Check if essential elements exist
    if (!studentsTableContainer || !studentsTableBody) {
        console.error("Error: Required DOM elements not found!");
    }
    
    // Loading indicator functions
    function showLoading() {
        // Create loading indicator if it doesn't exist
        if (!document.getElementById('loading-indicator')) {
            const loadingEl = document.createElement('div');
            loadingEl.id = 'loading-indicator';
            loadingEl.style.position = 'fixed';
            loadingEl.style.top = '0';
            loadingEl.style.left = '0';
            loadingEl.style.width = '100%';
            loadingEl.style.height = '100%';
            loadingEl.style.backgroundColor = 'rgba(255,255,255,0.8)';
            loadingEl.style.display = 'flex';
            loadingEl.style.alignItems = 'center';
            loadingEl.style.justifyContent = 'center';
            loadingEl.style.zIndex = '1000';
            
            const spinnerDiv = document.createElement('div');
            spinnerDiv.style.width = '50px';
            spinnerDiv.style.height = '50px';
            spinnerDiv.style.border = '5px solid #f3f3f3';
            spinnerDiv.style.borderTop = '5px solid #1a5fa5';
            spinnerDiv.style.borderRadius = '50%';
            spinnerDiv.style.animation = 'spin 1s linear infinite';
            
            const styleEl = document.createElement('style');
            styleEl.textContent = `@keyframes spin {0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}`;
            document.head.appendChild(styleEl);
            
            loadingEl.appendChild(spinnerDiv);
            document.body.appendChild(loadingEl);
        } else {
            document.getElementById('loading-indicator').style.display = 'flex';
        }
    }
    
    function hideLoading() {
        const loadingEl = document.getElementById('loading-indicator');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }
    
    // Authentication helper functions
    function getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }
    
    function isAuthenticated() {
        return !!getAuthToken();
    }
    
    // API fetch function with authentication
    async function fetchFromAPI(url) {
        const token = getAuthToken();
        
        if (!token) {
            showNotification('Please log in to view courses', 'error');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
            throw new Error('Authentication required');
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    // Load course data from API
    async function loadCourses() {
        try {
            showLoading();
            const courseData = await fetchFromAPI(COURSES_API);
            courses.length = 0; // Clear array while keeping reference
            courses.push(...courseData); // Add all fetched courses
            console.log("Courses data loaded:", courses.length, "courses");
            hideLoading();
            return courses;
        } catch (error) {
            console.error("Error loading courses:", error);
            showNotification(`Failed to load courses: ${error.message}`, 'error');
            hideLoading();
            return [];
        }
    }
    
    // Load student data from API
    async function loadStudents() {
        try {
            showLoading();
            const userData = await fetchFromAPI(USERS_API);
            // Filter users to get only students
            students = userData.filter(user => user.role === 'student');
            console.log("Students data loaded:", students.length, "students");
            hideLoading();
            return students;
        } catch (error) {
            console.error("Error loading students:", error);
            showNotification(`Failed to load students: ${error.message}`, 'error');
            hideLoading();
            return [];
        }
    }
    
    // Initialize application with data from backend
    async function initializeApp() {
        try {
            if (!isAuthenticated()) {
                showNotification('Please log in to view this page', 'error');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1500);
                return;
            }
            
            showLoading();
            
            // Load courses first
            await loadCourses();
            
            // Then load students
            await loadStudents();
            
            // Display courses with student data available
            displayCourses(courses);
            
            hideLoading();
        } catch (error) {
            console.error("Error initializing app:", error);
            hideLoading();
            showNotification(`Error: ${error.message}`, 'error');
        }
    }
    
    // Display courses
    function displayCourses(coursesToDisplay) {
        console.log("Attempting to display", coursesToDisplay.length, "courses");
        
        try {
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
                // Count students enrolled in this course - updated to use courseId field
                const studentCount = students.filter(student => 
                    student.coursesWithGrades && Array.isArray(student.coursesWithGrades) &&
                    student.coursesWithGrades.some(c => c.courseId === course.id)
                ).length;
                
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
                info.innerHTML = `
                    <p><strong>Credits:</strong> ${course.credits}</p>
                    <p><strong>Professor:</strong> ${course.professor || 'Not assigned'}</p>
                    <p>${course.description || 'No description available'}</p>
                `;
                
                const countBadge = document.createElement('div');
                countBadge.className = 'student-count';
                countBadge.textContent = `${studentCount} ${studentCount === 1 ? 'Student' : 'Students'}`;
                
                courseCard.appendChild(typeSpan);
                courseCard.appendChild(title);
                courseCard.appendChild(info);
                courseCard.appendChild(countBadge);
                
                // Add click event to show students for this course
                courseCard.addEventListener('click', () => {
                    console.log("Course clicked:", course.name);
                    showStudentTable(course.id);
                });
                
                courseGrid.appendChild(courseCard);
            });
            
            console.log("Courses displayed successfully, grid now contains:", courseGrid.children.length, "items");
        } catch (error) {
            console.error("Error displaying courses:", error);
        }
    }
    
    // Show students table for a specific course
    function showStudentTable(courseId) {
        console.log("Showing student table for course ID:", courseId);
        
        try {
            const course = courses.find(c => c.id === courseId);
            if (!course) {
                console.error("Course not found with ID:", courseId);
                return;
            }
            
            // Hide course grid and show student table
            const gridContainer = document.querySelector('.course-grid-container');
            if (gridContainer) {
                gridContainer.style.display = 'none';
            } else {
                console.error("Course grid container not found");
            }
            
            if (studentsTableContainer) {
                studentsTableContainer.style.display = 'block';
            } else {
                console.error("Students table container not found");
                return;
            }
            
            // Set selected course title
            if (selectedCourseTitle) {
                selectedCourseTitle.textContent = course.name;
            }
            
            // Get students enrolled in this course - updated to use courseId field
            const enrolledStudents = students.filter(student => 
                student.coursesWithGrades && Array.isArray(student.coursesWithGrades) &&
                student.coursesWithGrades.some(c => c.courseId === courseId)
            );
            
            console.log("Found", enrolledStudents.length, "students enrolled in this course");
            
            // Clear and populate student table
            studentsTableBody.innerHTML = '';
            
            if (enrolledStudents.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = '<td colspan="6" style="text-align: center">No students enrolled in this course</td>';
                studentsTableBody.appendChild(emptyRow);
            } else {
                enrolledStudents.forEach(student => {
                    const row = document.createElement('tr');
                
                    // Create student name cell with avatar
                    const nameCell = document.createElement('td');
                    nameCell.className = 'student-name-cell';
                    
                    const avatar = document.createElement('div');
                    avatar.className = 'student-avatar';
                    const initials = student.name ? student.name.split(' ')
                        .map(n => n[0]).join('') : '??';
                    avatar.textContent = initials;
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = student.name || student.username;
                    
                    nameCell.appendChild(avatar);
                    nameCell.appendChild(nameSpan);
                    
                    // Find course grade data - updated to use courseId field
                    const courseData = student.coursesWithGrades.find(c => c.courseId === courseId);
                    const currentGrade = courseData ? courseData.grade : 'N/A';
                    
                    // Create grade cell with badge
                    const gradeCell = document.createElement('td');
                    const gradeBadge = document.createElement('span');
                    const gradeClass = currentGrade !== 'N/A' ? `grade-${currentGrade.charAt(0).toLowerCase()}` : 'grade-na';
                    gradeBadge.className = `grade-badge ${gradeClass}`;
                    gradeBadge.textContent = currentGrade;
                    gradeCell.appendChild(gradeBadge);
                    
                    // Create action cell with grade input
                    const actionCell = document.createElement('td');
                    
                    const gradeInput = document.createElement('input');
                    gradeInput.type = 'text';
                    gradeInput.className = 'grade-input';
                    gradeInput.placeholder = 'A-F';
                    gradeInput.value = currentGrade !== 'N/A' ? currentGrade : '';
                    gradeInput.maxLength = 2;
                    
                    const saveBtn = document.createElement('button');
                    saveBtn.className = 'save-grade-btn';
                    saveBtn.innerHTML = '<i class="fas fa-save"></i>';
                    saveBtn.title = 'Save Grade';
                    saveBtn.addEventListener('click', async () => {
                        const newGrade = gradeInput.value.trim().toUpperCase();
                        
                        // Simple validation for grades
                        const validGrades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
                        if (!validGrades.includes(newGrade)) {
                            showNotification('Please enter a valid grade (A, A-, B+, etc.)', 'error');
                            return;
                        }
                        
                        try {
                            showLoading();
                            
                            // Update student's coursesWithGrades
                            let updatedCoursesWithGrades = [...(student.coursesWithGrades || [])];
                            const existingCourseIndex = updatedCoursesWithGrades.findIndex(c => c.courseId === courseId);
                            
                            if (existingCourseIndex >= 0) {
                                // Update existing course grade
                                updatedCoursesWithGrades[existingCourseIndex].grade = newGrade;
                            } else {
                                // Add new course with grade
                                updatedCoursesWithGrades.push({ courseId: courseId, grade: newGrade });
                            }
                            
                            // Send update to backend
                            const token = getAuthToken();
                            const response = await fetch(`${USERS_API}${student.id}/`, {
                                method: 'PATCH',
                                headers: {
                                    'Authorization': `Token ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    coursesWithGrades: updatedCoursesWithGrades
                                })
                            });
                            
                            if (!response.ok) {
                                throw new Error('Failed to update grade');
                            }
                            
                            // Update local student object
                            const updatedStudent = await response.json();
                            console.log("Grade updated successfully:", updatedStudent);
                            const studentIndex = students.findIndex(s => s.id === student.id);
                            if (studentIndex >= 0) {
                                students[studentIndex] = updatedStudent;
                            }
                            
                            // Update the grade badge
                            gradeBadge.className = `grade-badge grade-${newGrade.charAt(0).toLowerCase()}`;
                            gradeBadge.textContent = newGrade;
                            
                            showNotification(`Grade for ${student.name} updated to ${newGrade}`);
                            
                            hideLoading();
                        } catch (error) {
                            console.error("Error updating grade:", error);
                            showNotification(`Failed to update grade: ${error.message}`, 'error');
                            hideLoading();
                        }
                    });
                    
                    actionCell.appendChild(gradeInput);
                    actionCell.appendChild(saveBtn);
                    
                    // Build the row
                    row.appendChild(nameCell);
                    row.appendChild(document.createElement('td')).textContent = student.username || 'N/A';
                    row.appendChild(document.createElement('td')).textContent = student.email || 'N/A';
                    
                    // Calculate GPA from grades
                    const gpa = calculateGPA(student.coursesWithGrades);
                    row.appendChild(document.createElement('td')).textContent = gpa;
                    
                    row.appendChild(gradeCell);
                    row.appendChild(actionCell);
                    
                    studentsTableBody.appendChild(row);
                });
            }
            
            console.log("Student table displayed successfully");
            
        } catch (error) {
            console.error("Error showing student table:", error);
        }
    }
    
    // Calculate GPA from grades
    function calculateGPA(coursesWithGrades) {
        if (!coursesWithGrades || !Array.isArray(coursesWithGrades) || coursesWithGrades.length === 0) {
            return 'N/A';
        }
        
        // Define grade values
        const gradeValues = {
            'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'D-': 0.7,
            'F': 0.0
        };
        
        let totalPoints = 0;
        let totalCourses = 0;
        
        coursesWithGrades.forEach(courseData => {
            if (courseData.grade && gradeValues[courseData.grade]) {
                totalPoints += gradeValues[courseData.grade];
                totalCourses++;
            }
        });
        
        if (totalCourses === 0) return 'N/A';
        
        // Calculate average and format to 2 decimal places
        return (totalPoints / totalCourses).toFixed(2);
    }
    
    // Go back to course grid view
    if (backButton) {
        backButton.addEventListener('click', () => {
            console.log("Back button clicked");
            const gridContainer = document.querySelector('.course-grid-container');
            if (gridContainer) {
                gridContainer.style.display = 'block';
            }
            if (studentsTableContainer) {
                studentsTableContainer.style.display = 'none';
            }
        });
    } else {
        console.error("Back button not found");
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
    
    // Academic Report button - opens university list in a new window
    if (academicReportBtn) {
        academicReportBtn.addEventListener('click', function() {
            openUniversityListWindow();
        });
    }
    
    // Export data - keep existing functionality
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            openUniversitySelectionWindow();
        });
    }
    
    // Add test button to display all students
    const testBtnContainer = document.createElement('div');
    testBtnContainer.style.textAlign = 'center';
    testBtnContainer.style.margin = '10px 0';
    testBtnContainer.style.padding = '10px';
    testBtnContainer.style.background = '#f8f9fa';
    testBtnContainer.style.borderRadius = '5px';
    
    const testBtn = document.createElement('button');
    testBtn.id = 'test-students-btn';
    testBtn.innerText = 'Test: View All Students';
    testBtn.classList.add('btn', 'btn-secondary');
    testBtn.style.backgroundColor = '#6c757d';
    testBtn.style.color = 'white';
    testBtn.style.border = 'none';
    testBtn.style.padding = '8px 15px';
    testBtn.style.borderRadius = '4px';
    testBtn.style.cursor = 'pointer';
    
    testBtn.addEventListener('click', function() {
        displayAllStudentsForTesting();
    });
    
    testBtnContainer.appendChild(testBtn);
    
    // Insert after the course search form
    const searchForm = document.querySelector('.search-form');
    if (searchForm && searchForm.parentNode) {
        searchForm.parentNode.insertBefore(testBtnContainer, searchForm.nextSibling);
    }
    
    // Function to display all students for testing
    function displayAllStudentsForTesting() {
        console.log("Opening test window with all students...");
        
        // Create a new window
        const testWindow = window.open('', '_blank', 'width=1000,height=800');
        testWindow.document.title = 'All Students - Testing';
        
        // Add styles to the new window
        testWindow.document.write(`
            <html>
            <head>
                <title>All Students - Testing</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: #f5f7fa;
                    }
                    h1 {
                        color: #1a5fa5;
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .filter-controls {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 20px;
                        padding: 10px;
                        background-color: #fff;
                        border-radius: 5px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .filter-controls input {
                        flex-grow: 1;
                        padding: 8px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                    }
                    .filter-controls select {
                        padding: 8px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        background-color: white;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    th, td {
                        padding: 12px 15px;
                        border: 1px solid #ddd;
                        text-align: left;
                    }
                    th {
                        background-color: #1a5fa5;
                        color: white;
                        position: sticky;
                        top: 0;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    tr:hover {
                        background-color: #f0f7ff;
                    }
                    .university-assigned {
                        background-color: #d4edda;
                    }
                    .university-missing {
                        background-color: #f8d7da;
                    }
                    .status-container {
                        margin-top: 10px;
                        text-align: center;
                    }
                    .loading {
                        text-align: center;
                        padding: 30px;
                    }
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #1a5fa5;
                        border-radius: 50%;
                        margin: 0 auto 20px;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <h1>All Students (Testing View)</h1>
                
                <div class="filter-controls">
                    <input type="text" id="search-students" placeholder="Search students..." />
                    <select id="university-filter">
                        <option value="">All Universities</option>
                    </select>
                    <select id="sort-by">
                        <option value="name">Sort by Name</option>
                        <option value="email">Sort by Email</option>
                        <option value="university">Sort by University</option>
                    </select>
                </div>
                
                <div class="status-container">
                    <div id="student-count"></div>
                </div>
                
                <div id="students-container">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Loading all students...</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        
        // Fetch all users from the API
        const token = getAuthToken();
        
        fetch(USERS_API, {
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch users');
            return response.json();
        })
        .then(async users => {
            // Filter to get only students
            const allStudents = users.filter(user => user.role === 'student');
            console.log(`Found ${allStudents.length} students for display`);
            
            // Fetch universities for reference
            const universitiesResponse = await fetch(UNIVERSITIES_API, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!universitiesResponse.ok) throw new Error('Failed to fetch universities');
            const universities = await universitiesResponse.json();
            
            // Create a map of university IDs to names for easier lookup
            const universityMap = {};
            universities.forEach(univ => {
                universityMap[univ.id] = univ.name;
            });
            
            // Populate university filter dropdown
            const universityFilter = testWindow.document.getElementById('university-filter');
            universities.forEach(univ => {
                const option = testWindow.document.createElement('option');
                option.value = univ.id;
                option.textContent = univ.name;
                universityFilter.appendChild(option);
            });
            
            // Add a special option for students without university
            const noUnivOption = testWindow.document.createElement('option');
            noUnivOption.value = 'none';
            noUnivOption.textContent = 'No University Assigned';
            universityFilter.appendChild(noUnivOption);
            
            // Function to render students table
            function renderStudentsTable(students) {
                const container = testWindow.document.getElementById('students-container');
                const countElement = testWindow.document.getElementById('student-count');
                
                // Update count
                countElement.textContent = `Displaying ${students.length} students`;
                
                // Create table
                container.innerHTML = '';
                const table = testWindow.document.createElement('table');
                
                // Create table header
                const thead = testWindow.document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>University</th>
                        <th>University ID</th>
                        <th>Courses</th>
                        <th>Status</th>
                    </tr>
                `;
                table.appendChild(thead);
                
                // Create table body
                const tbody = testWindow.document.createElement('tbody');
                
                students.forEach(student => {
                    const row = testWindow.document.createElement('tr');
                    
                    // Determine university name and ID values - updated to use university_id field
                    let universityName = 'Not Assigned';
                    let universityId = 'N/A';
                    let rowClass = 'university-missing';
                    
                    if (student.university_id) {
                        universityId = student.university_id;
                        universityName = universityMap[universityId] || 'Unknown';
                        rowClass = 'university-assigned';
                    }
                    
                    // Set row class based on university assignment
                    row.className = rowClass;
                    
                    // Get course count - updated to use courseId field
                    const courseCount = student.coursesWithGrades && Array.isArray(student.coursesWithGrades) 
                        ? student.coursesWithGrades.length 
                        : 0;
                    
                    // Create row cells
                    row.innerHTML = `
                        <td>${student.id}</td>
                        <td>${student.name || 'N/A'}</td>
                        <td>${student.username || 'N/A'}</td>
                        <td>${student.email || 'N/A'}</td>
                        <td>${universityName}</td>
                        <td>${universityId}</td>
                        <td>${courseCount} course(s)</td>
                        <td>${student.status || 'N/A'}</td>
                    `;
                    
                    tbody.appendChild(row);
                });
                
                table.appendChild(tbody);
                container.appendChild(table);
            }
            
            // Initial render
            renderStudentsTable(allStudents);
            
            // Set up search and filter functionality
            const searchInput = testWindow.document.getElementById('search-students');
            const universitySelect = testWindow.document.getElementById('university-filter');
            const sortBySelect = testWindow.document.getElementById('sort-by');
            
            function filterAndSortStudents() {
                const searchTerm = searchInput.value.toLowerCase();
                const universityValue = universitySelect.value;
                const sortBy = sortBySelect.value;
                
                // Filter students
                let filteredStudents = allStudents.filter(student => {
                    // Search term filter
                    const matchesSearch = 
                        (student.name && student.name.toLowerCase().includes(searchTerm)) ||
                        (student.email && student.email.toLowerCase().includes(searchTerm)) ||
                        (student.username && student.username.toLowerCase().includes(searchTerm));
                    
                    // University filter - updated to use university_id field
                    let matchesUniversity = true;
                    if (universityValue) {
                        if (universityValue === 'none') {
                            // Filter for students without university
                            matchesUniversity = !student.university_id;
                        } else {
                            // Filter for specific university
                            matchesUniversity = String(student.university_id) === universityValue;
                        }
                    }
                    
                    return matchesSearch && matchesUniversity;
                });
                
                // Sort students
                filteredStudents.sort((a, b) => {
                    switch (sortBy) {
                        case 'name':
                            return (a.name || '').localeCompare(b.name || '');
                        case 'email':
                            return (a.email || '').localeCompare(b.email || '');
                        case 'university':
                            // Get university names for comparison
                            const aUnivName = getUniversityName(a.university_id) || '';
                            const bUnivName = getUniversityName(b.university_id) || '';
                            return aUnivName.localeCompare(bUnivName);
                        default:
                            return 0;
                    }
                });
                
                // Re-render with filtered and sorted data
                renderStudentsTable(filteredStudents);
            }
            
            function getUniversityName(universityId) {
                if (!universityId) return 'Not Assigned';
                return universityMap[universityId] || 'Unknown';
            }
            
            // Add event listeners
            searchInput.addEventListener('input', filterAndSortStudents);
            universitySelect.addEventListener('change', filterAndSortStudents);
            sortBySelect.addEventListener('change', filterAndSortStudents);
        })
        .catch(error => {
            console.error('Error fetching students data:', error);
            testWindow.document.getElementById('students-container').innerHTML = `
                <div style="text-align: center; color: #e74c3c; padding: 20px;">
                    <h3>Error Loading Students</h3>
                    <p>${error.message}</p>
                </div>
            `;
        });
    }
    
    // Open a simple window displaying only university names
    function openUniversityListWindow() {
        console.log("Opening university list window...");
        
        // Create a new window
        const universityWindow = window.open('', '_blank', 'width=700,height=600');
        universityWindow.document.title = 'University Academic Reports';
        
        // Add styles to the new window
        universityWindow.document.write(`
            <html>
            <head>
                <title>University Academic Reports</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 30px;
                        background-color: #f5f7fa;
                        color: #333;
                    }
                    h1 {
                        color: #1a5fa5;
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #1a5fa5;
                        padding-bottom: 15px;
                    }
                    .university-list {
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .university-card {
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        margin-bottom: 20px;
                        padding: 20px;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .university-card:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.15);
                        background-color: #f0f7ff;
                    }
                    .university-name {
                        font-size: 20px;
                        font-weight: 600;
                        color: #1a5fa5;
                        margin: 0 0 5px 0;
                    }
                    .university-info {
                        color: #666;
                        font-size: 14px;
                        margin: 5px 0 0 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 12px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                    }
                    .report-container {
                        display: none;
                        margin-top: 20px;
                    }
                    .back-button {
                        background-color: #1a5fa5;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-bottom: 20px;
                        font-size: 16px;
                    }
                    .back-button:hover {
                        background-color: #0d4a8f;
                    }
                    .loading {
                        text-align: center;
                        padding: 30px;
                        color: #666;
                    }
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #1a5fa5;
                        border-radius: 50%;
                        margin: 0 auto 20px;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .error {
                        background-color: #ffebee;
                        color: #c62828;
                        padding: 15px;
                        border-radius: 5px;
                        margin-bottom: 20px;
                        text-align: center;
                    }
                    .student-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        background-color: white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .student-table th, .student-table td {
                        border: 1px solid #ddd;
                        padding: 12px;
                        text-align: left;
                    }
                    .student-table th {
                        background-color: #1a5fa5;
                        color: white;
                    }
                    .grade-badge {
                        padding: 3px 8px;
                        border-radius: 4px;
                        display: inline-block;
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
                        background-color: #ffeb3b;
                        color: black;
                    }
                    .grade-d {
                        background-color: #ff9800;
                        color: white;
                    }
                    .grade-f {
                        background-color: #f44336;
                        color: white;
                    }
                    .grade-na {
                        background-color: #9e9e9e;
                        color: white;
                    }
                    .no-data {
                        text-align: center;
                        padding: 30px;
                        font-style: italic;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <h1>Academic Reports</h1>
                <p style="text-align: center; margin-bottom: 30px;">Select a university to view detailed academic reports</p>
                <div id="university-list" class="university-list">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Loading universities...</p>
                    </div>
                </div>
                <div id="report-container" class="report-container">
                    <button id="back-to-universities" class="back-button">← Back to Universities</button>
                    <h2 id="report-university-name"></h2>
                    <div id="report-content">
                        <div class="loading">
                            <div class="spinner"></div>
                            <p>Generating report...</p>
                        </div>
                    </div>
                </div>
                <div class="footer">
                    © ${new Date().getFullYear()} University Management System
                </div>
            </body>
            </html>
        `);
        
        // Get elements
        const universityList = universityWindow.document.getElementById('university-list');
        const reportContainer = universityWindow.document.getElementById('report-container');
        const backButton = universityWindow.document.getElementById('back-to-universities');
        const reportUniversityName = universityWindow.document.getElementById('report-university-name');
        const reportContent = universityWindow.document.getElementById('report-content');
        
        // Add back button functionality
        backButton.addEventListener('click', () => {
            reportContainer.style.display = 'none';
            universityList.style.display = 'block';
        });
        
        // First, get all students to count them by university
        const token = getAuthToken();
        
        // Fetch both universities and students in parallel
        Promise.all([
            // Get universities
            fetch(UNIVERSITIES_API, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                if (!response.ok) throw new Error('Failed to fetch universities');
                return response.json();
            }),
            
            // Get all users
            fetch(USERS_API, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                if (!response.ok) throw new Error('Failed to fetch users');
                return response.json();
            })
        ])
        .then(([universities, users]) => {
            // Filter users to get only students
            console.log('users:', users);
            const allStudents = users.filter(user => user.role === 'student');
            
            // Count students by university - updated to use university_id field
            const studentCountsByUniversity = {};
            
            allStudents.forEach(student => {
                console.log("Processing student:", student.name, "with university:", student.university_id);
                if (student.university_id) {
                    const universityId = student.university_id;
                    studentCountsByUniversity[universityId] = (studentCountsByUniversity[universityId] || 0) + 1;
                }
            });
            
            
            // Clear loading indicator
            universityList.innerHTML = '';
            
            if (universities.length === 0) {
                universityList.innerHTML = '<div class="no-data">No universities found</div>';
                return;
            }
            
            // Add universities to the list with accurate student counts
            universities.forEach(university => {
                const studentCount = studentCountsByUniversity[university.id] || 0;
                
                const universityCard = universityWindow.document.createElement('div');
                universityCard.className = 'university-card';
                universityCard.innerHTML = `
                    <h3 class="university-name">${university.name}</h3>
                    <p class="university-info">${university.location} • Founded ${university.foundation_year}</p>
                    <p class="university-students"><strong>Students:</strong> ${studentCount}</p>
                `;
                
                // Add click event to show report for this university - updated to use university_id
                universityCard.addEventListener('click', () => {
                    universityList.style.display = 'none';
                    reportContainer.style.display = 'block';
                    reportUniversityName.textContent = `${university.name} - Academic Report`;
                    
                    // Pass the pre-filtered students for this university
                    const universityStudents = allStudents.filter(student => 
                        String(student.university_id) === String(university.id)
                    );
                    
                    // Generate and display the report content with pre-filtered students
                    generateUniversityReportFromAPI(university, reportContent, universityWindow, universityStudents);
                });
                
                universityList.appendChild(universityCard);
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            universityList.innerHTML = `
                <div class="error">
                    Error loading universities: ${error.message}
                </div>
            `;
        });
    }
    
    // Generate report for a university using API data - updated to accept pre-filtered students
    function generateUniversityReportFromAPI(university, reportContainer, windowRef, preFilteredStudents = null) {
        console.log("Generating report for university:", university.name, "with ID:", university.id);
        
        // Show loading indicator
        reportContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Generating academic report for ${university.name}...</p>
            </div>
        `;
        
        // Fetch all necessary data for the report
        const token = getAuthToken();
        
        // If we already have pre-filtered students, just fetch courses
        if (preFilteredStudents) {
            console.log(`Using ${preFilteredStudents.length} pre-filtered students for university ${university.id}`);
            
            // Get courses for this university
            fetch(`${COURSES_API}?university=${university.id}`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch courses');
                return response.json();
            })
            .then(courseData => {
                // Display the report with pre-filtered students
                displayUniversityReport(university, courseData, preFilteredStudents, reportContainer, windowRef);
            })
            .catch(error => handleReportError(error, university, reportContainer, windowRef));
        } else {
            // Otherwise fetch both courses and students
            Promise.all([
                // Get courses for this university
                fetch(`${COURSES_API}?university=${university.id}`, {
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).then(response => {
                    if (!response.ok) throw new Error('Failed to fetch courses');
                    return response.json();
                }),
                
                // Get all users
                fetch(USERS_API, {
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).then(response => {
                    if (!response.ok) throw new Error('Failed to fetch users');
                    return response.json();
                })
            ])
            .then(([courseData, userData]) => {
                console.log("Fetched courses:", courseData.length, "and users:", userData.length);
                
                // Filter users to get only students from this university - updated to use university_id field
                const universityStudents = userData.filter(user => {
                    if (user.role !== 'student') return false;
                    return String(user.university_id) === String(university.id);
                });
                
                console.log("Filtered students:", universityStudents.length, "for university ID:", university.id);
                
                // Display the report
                displayUniversityReport(university, courseData, universityStudents, reportContainer, windowRef);
            })
            .catch(error => handleReportError(error, university, reportContainer, windowRef));
        }
    }
    
    // Handle report generation errors
    function handleReportError(error, university, reportContainer, windowRef) {
        console.error('Error generating report:', error);
        reportContainer.innerHTML = `
            <div class="error">
                Error generating report: ${error.message}
            </div>
            <button id="retry-btn" class="back-button">Retry</button>
        `;
        
        // Add retry button functionality
        windowRef.document.getElementById('retry-btn').addEventListener('click', () => {
            generateUniversityReportFromAPI(university, reportContainer, windowRef);
        });
    }
    
    // Display university report - separated logic for reuse
    function displayUniversityReport(university, courseData, universityStudents, reportContainer, windowRef) {
        // Create report table
        const reportTable = windowRef.document.createElement('table');
        reportTable.className = 'student-table';
        
        // Create table header
        const tableHeader = windowRef.document.createElement('thead');
        tableHeader.innerHTML = `
            <tr>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Email</th>
                <th>GPA</th>
                <th>Courses</th>
            </tr>
        `;
        reportTable.appendChild(tableHeader);
        
        // Create table body
        const tableBody = windowRef.document.createElement('tbody');
        
        // Store data for export
        const exportData = [];
        
        // Check if we have any students
        if (universityStudents.length === 0) {
            const emptyRow = windowRef.document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="5" class="no-data">No students enrolled in this university</td>';
            tableBody.appendChild(emptyRow);
            
            console.warn("No students found for university ID:", university.id);
        } else {
            // Process each student
            universityStudents.forEach(student => {
                // Create a row for this student
                const row = windowRef.document.createElement('tr');
                
                // Student name cell
                const nameCell = windowRef.document.createElement('td');
                nameCell.textContent = student.name || 'Unknown';
                row.appendChild(nameCell);
                
                // Student ID cell
                const idCell = windowRef.document.createElement('td');
                idCell.textContent = student.username || 'N/A';
                row.appendChild(idCell);
                
                // Email cell
                const emailCell = windowRef.document.createElement('td');
                emailCell.textContent = student.email || 'N/A';
                row.appendChild(emailCell);
                
                // GPA cell - with warning for GPA below 2.0
                const gpaCell = windowRef.document.createElement('td');
                const gpaValue = student.gpa || 'N/A';
                
                // Check if GPA is below 2.0
                if (gpaValue !== 'N/A') {
                    const gpaNumber = parseFloat(gpaValue);
                    if (!isNaN(gpaNumber) && gpaNumber < 2.0) {
                        // Create a container with warning styling
                        const gpaContainer = windowRef.document.createElement('div');
                        gpaContainer.style.display = 'flex';
                        gpaContainer.style.alignItems = 'center';
                        
                        const gpaText = windowRef.document.createElement('span');
                        gpaText.textContent = gpaValue;
                        gpaText.style.color = '#e74c3c';
                        gpaText.style.fontWeight = 'bold';
                        
                        const warningText = windowRef.document.createElement('span');
                        warningText.textContent = ' - Not Passing';
                        warningText.style.color = '#e74c3c';
                        warningText.style.marginLeft = '5px';
                        warningText.style.fontSize = '12px';
                        warningText.style.fontStyle = 'italic';
                        
                        gpaContainer.appendChild(gpaText);
                        gpaContainer.appendChild(warningText);
                        gpaCell.appendChild(gpaContainer);
                    } else {
                        gpaCell.textContent = gpaValue;
                    }
                } else {
                    gpaCell.textContent = gpaValue;
                }
                
                row.appendChild(gpaCell);
                
                // Create the courses cell element - THIS WAS MISSING
                const coursesCell = windowRef.document.createElement('td');
                
                // Courses cell content
                if (student.coursesWithGrades && Array.isArray(student.coursesWithGrades) && student.coursesWithGrades.length > 0) {
                    const coursesList = windowRef.document.createElement('ul');
                    coursesList.style.margin = '0';
                    coursesList.style.paddingLeft = '15px';
                    
                    student.coursesWithGrades.forEach(courseGrade => {
                        // Find the course details
                        const courseId = typeof courseGrade.courseId === 'string' ? 
                            parseInt(courseGrade.courseId) : courseGrade.courseId;
                        
                        const course = courseData.find(c => c.id === courseId);
                        if (course) {
                            const courseItem = windowRef.document.createElement('li');
                            courseItem.innerHTML = `
                                ${course.name} - 
                                <span class="grade-badge grade-${(courseGrade.grade || 'N/A').charAt(0).toLowerCase()}">
                                    ${courseGrade.grade || 'N/A'}
                                </span>
                            `;
                            coursesList.appendChild(courseItem);
                        }
                    });
                    
                    coursesCell.appendChild(coursesList);
                } else {
                    coursesCell.textContent = 'No courses';
                }
                
                row.appendChild(coursesCell);
                
                // Add row to table body
                tableBody.appendChild(row);
                
                // Add data for export
                exportData.push({
                    name: student.name || 'Unknown',
                    id: student.username || 'N/A',
                    email: student.email || 'N/A',
                    gpa: student.gpa || 'N/A',
                    courses: student.coursesWithGrades || []
                });
            });
        }
        
        reportTable.appendChild(tableBody);
        
        // Clear container and add the report
        reportContainer.innerHTML = '';
        
        // Add university details
        const detailsDiv = windowRef.document.createElement('div');
        detailsDiv.style.marginBottom = '20px';
        detailsDiv.innerHTML = `
            <div style="margin-bottom: 10px;"><strong>Location:</strong> ${university.location}</div>
            <div style="margin-bottom: 10px;"><strong>Founded:</strong> ${university.foundation_year}</div>
            <div style="margin-bottom: 20px;"><strong>Total Students:</strong> ${universityStudents.length}</div>
            <h3>Academic Performance Report</h3>
        `;
        
        reportContainer.appendChild(detailsDiv);
        reportContainer.appendChild(reportTable);
        
        // Add buttons for printing and export
        const exportButtonsDiv = windowRef.document.createElement('div');
        exportButtonsDiv.style.marginTop = '20px';
        exportButtonsDiv.style.display = 'flex';
        exportButtonsDiv.style.gap = '10px';
        exportButtonsDiv.style.justifyContent = 'center';
        
        const exportCsvBtn = windowRef.document.createElement('button');
        exportCsvBtn.textContent = 'Export as CSV';
        exportCsvBtn.style.padding = '8px 16px';
        exportCsvBtn.style.backgroundColor = '#1a5fa5';
        exportCsvBtn.style.color = 'white';
        exportCsvBtn.style.border = 'none';
        exportCsvBtn.style.borderRadius = '4px';
        exportCsvBtn.style.cursor = 'pointer';
        exportCsvBtn.addEventListener('click', () => {
            exportReportData(exportData, university.name, 'csv', windowRef, courseData);
        });
        
        const exportJsonBtn = windowRef.document.createElement('button');
        exportJsonBtn.textContent = 'Export as JSON';
        exportJsonBtn.style.padding = '8px 16px';
        exportJsonBtn.style.backgroundColor = '#4caf50';
        exportJsonBtn.style.color = 'white';
        exportJsonBtn.style.border = 'none';
        exportJsonBtn.style.borderRadius = '4px';
        exportJsonBtn.style.cursor = 'pointer';
        exportJsonBtn.addEventListener('click', () => {
            exportReportData(exportData, university.name, 'json', windowRef, courseData);
        });
        
        const printBtn = windowRef.document.createElement('button');
        printBtn.textContent = 'Print Report';
        printBtn.style.padding = '8px 16px';
        printBtn.style.backgroundColor = '#ff9800';
        printBtn.style.color = 'white';
        printBtn.style.border = 'none';
        printBtn.style.borderRadius = '4px';
        printBtn.style.cursor = 'pointer';
        printBtn.addEventListener('click', () => {
            windowRef.print();
        });
        
        exportButtonsDiv.appendChild(exportCsvBtn);
        exportButtonsDiv.appendChild(exportJsonBtn);
        exportButtonsDiv.appendChild(printBtn);
        
        reportContainer.appendChild(exportButtonsDiv);
    }
    
    // Function to export report data
    function exportReportData(data, universityName, format, windowRef, courseData) {
        try {
            const filename = `${universityName.replace(/\s+/g, '_')}_Report`;
            
            if (format === 'csv') {
                // Create CSV content
                let csv = 'Student Name,Student ID,Email,GPA,Passing Status,Courses,Grades\n';
                
                data.forEach(student => {
                    // Get courses and grades
                    const courseNames = [];
                    const grades = [];
                    
                    if (student.courses && Array.isArray(student.courses)) {
                        student.courses.forEach(course => {
                            const courseId = typeof course.courseId === 'string' ? 
                                parseInt(course.courseId) : course.courseId;
                                
                            const courseObj = courseData.find(c => c.id === courseId);
                            if (courseObj) {
                                courseNames.push(courseObj.name);
                                grades.push(course.grade || 'N/A');
                            }
                        });
                    }
                    
                    // Add passing status field
                    let passingStatus = 'Passing';
                    if (student.gpa !== 'N/A') {
                        const gpa = parseFloat(student.gpa);
                        if (!isNaN(gpa) && gpa < 2.0) {
                            passingStatus = 'Not Passing';
                        }
                    }
                    
                    // Escape fields for CSV
                    const escapeCsv = (text) => `"${String(text).replace(/"/g, '""')}"`;
                    
                    csv += `${escapeCsv(student.name)},${escapeCsv(student.id)},${escapeCsv(student.email)},` +
                           `${student.gpa},${passingStatus},${escapeCsv(courseNames.join(';'))},${escapeCsv(grades.join(';'))}\n`;
                });
                
                // Create download link
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = windowRef.URL.createObjectURL(blob);
                const a = windowRef.document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${filename}.csv`;
                windowRef.document.body.appendChild(a);
                a.click();
                windowRef.setTimeout(() => {
                    windowRef.document.body.removeChild(a);
                    windowRef.URL.revokeObjectURL(url);
                }, 100);
                
            } else if (format === 'json') {
                // Create JSON content with formatted courses
                const jsonData = data.map(student => {
                    const formattedCourses = [];
                    
                    if (student.courses && Array.isArray(student.courses)) {
                        student.courses.forEach(course => {
                            const courseId = typeof course.courseId === 'string' ? 
                                parseInt(course.courseId) : course.courseId;
                                
                            const courseObj = courseData.find(c => c.id === courseId);
                            if (courseObj) {
                                formattedCourses.push({
                                    name: courseObj.name,
                                    grade: course.grade || 'N/A',
                                    credits: courseObj.credits
                                });
                            }
                        });
                    }
                    
                    // Check passing status
                    let passingStatus = 'Passing';
                    if (student.gpa !== 'N/A') {
                        const gpa = parseFloat(student.gpa);
                        if (!isNaN(gpa) && gpa < 2.0) {
                            passingStatus = 'Not Passing';
                        }
                    }
                    
                    return {
                        name: student.name,
                        id: student.id,
                        email: student.email,
                        gpa: student.gpa,
                        passingStatus: passingStatus,
                        courses: formattedCourses
                    };
                });
                
                const json = JSON.stringify(jsonData, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = windowRef.URL.createObjectURL(blob);
                const a = windowRef.document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${filename}.json`;
                windowRef.document.body.appendChild(a);
                a.click();
                windowRef.setTimeout(() => {
                    windowRef.document.body.removeChild(a);
                    windowRef.URL.revokeObjectURL(url);
                }, 100);
            }
        } catch (error) {
            console.error('Error exporting report data:', error);
            // Show error message in the window
            const errorMsg = windowRef.document.createElement('div');
            errorMsg.style.color = 'red';
            errorMsg.style.margin = '10px 0';
            errorMsg.textContent = `Error exporting data: ${error.message}`;
            reportContainer.appendChild(errorMsg);
        }
    }
    
    // Open university selection window with real data - similar changes here
    function openUniversitySelectionWindow() {
        console.log("Opening university selection window for export...");
        
        // Create a new window
        const universityWindow = window.open('', '_blank', 'width=800,height=600');
        universityWindow.document.title = 'Export University Data';
        
        // Add styles to the new window
        universityWindow.document.write(`
            <html>
            <head>
                <title>Export University Data</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: #f5f7fa;
                    }
                    h1 {
                        color: #1a5fa5;
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .intro-text {
                        text-align: center;
                        margin-bottom: 30px;
                        color: #555;
                    }
                    .university-list {
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .university-card {
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        margin-bottom: 20px;
                        padding: 20px;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .university-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.15);
                        background-color: #f0f7ff;
                    }
                    .university-info {
                        flex: 1;
                    }
                    .university-name {
                        font-size: 20px;
                        font-weight: 600;
                        color: #1a5fa5;
                        margin: 0 0 5px 0;
                    }
                    .university-details {
                        color: #666;
                        font-size: 14px;
                    }
                    .export-icon {
                        color: #ff9800;
                        font-size: 24px;
                        margin-left: 15px;
                    }
                    .report-container {
                        display: none;
                        margin-top: 20px;
                    }
                    .back-button {
                        background-color: #1a5fa5;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-bottom: 20px;
                        font-size: 16px;
                    }
                    .back-button:hover {
                        background-color: #0d4a8f;
                    }
                    .loading {
                        text-align: center;
                        padding: 30px;
                        color: #666;
                    }
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #1a5fa5;
                        border-radius: 50%;
                        margin: 0 auto 20px;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .error {
                        background-color: #ffebee;
                        color: #c62828;
                        padding: 15px;
                        border-radius: 5px;
                        margin-bottom: 20px;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <h1>Export University Data</h1>
                <p class="intro-text">Select a university to generate and export its academic report</p>
                <div id="university-list" class="university-list">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Loading universities...</p>
                    </div>
                </div>
                <div id="report-container" class="report-container">
                    <button id="back-to-universities" class="back-button">← Back to Universities</button>
                    <h2 id="report-university-name"></h2>
                    <div id="report-content"></div>
                </div>
            </body>
            </html>
        `);
        
        // Get elements
        const universityList = universityWindow.document.getElementById('university-list');
        const reportContainer = universityWindow.document.getElementById('report-container');
        const backButton = universityWindow.document.getElementById('back-to-universities');
        const reportUniversityName = universityWindow.document.getElementById('report-university-name');
        const reportContent = universityWindow.document.getElementById('report-content');
        
        // Add back button functionality
        backButton.addEventListener('click', () => {
            reportContainer.style.display = 'none';
            universityList.style.display = 'block';
        });
        
        // Fetch both universities and students in parallel
        Promise.all([
            // Get universities
            fetch(UNIVERSITIES_API, {
                headers: {
                    'Authorization': `Token ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                if (!response.ok) throw new Error('Failed to fetch universities');
                return response.json();
            }),
            
            // Get all users
            fetch(USERS_API, {
                headers: {
                    'Authorization': `Token ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                if (!response.ok) throw new Error('Failed to fetch users');
                return response.json();
            })
        ])
        .then(([universities, users]) => {
            // Filter users to get only students
            const allStudents = users.filter(user => user.role === 'student');
            
            // Count students by university - updated to use university_id field
            const studentCountsByUniversity = {};
            
            allStudents.forEach(student => {
                if (student.university_id) {
                    studentCountsByUniversity[student.university_id] = (studentCountsByUniversity[student.university_id] || 0) + 1;
                }
            });
            
            // Clear loading indicator
            universityList.innerHTML = '';
            
            if (universities.length === 0) {
                universityList.innerHTML = '<div style="text-align:center;padding:20px;">No universities found</div>';
                return;
            }
            
            // Add universities to the list
            universities.forEach(university => {
                const studentCount = studentCountsByUniversity[university.id] || 0;
                
                const universityCard = universityWindow.document.createElement('div');
                universityCard.className = 'university-card';
                
                const infoDiv = universityWindow.document.createElement('div');
                infoDiv.className = 'university-info';
                infoDiv.innerHTML = `
                    <h3 class="university-name">${university.name}</h3>
                    <p class="university-details">${university.location} • Founded ${university.foundation_year} • Students: ${studentCount}</p>
                `;
                
                const iconDiv = universityWindow.document.createElement('div');
                iconDiv.className = 'export-icon';
                iconDiv.innerHTML = '📊';
                iconDiv.title = 'Generate report and export data';
                
                universityCard.appendChild(infoDiv);
                universityCard.appendChild(iconDiv);
                
                // Add click event to show report for this university
                universityCard.addEventListener('click', () => {
                    universityList.style.display = 'none';
                    reportContainer.style.display = 'block';
                    reportUniversityName.textContent = `${university.name} - Export Data`;
                    
                    // Pass the pre-filtered students for this university
                    const universityStudents = allStudents.filter(student => 
                        String(student.university_id) === String(university.id)
                    );
                    
                    // Generate and display the report content with pre-filtered students
                    generateUniversityReportFromAPI(university, reportContent, universityWindow, universityStudents);
                });
                
                universityList.appendChild(universityCard);
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            universityList.innerHTML = `
                <div class="error">
                    Error loading universities: ${error.message}
                </div>
            `;
        });
    }
    
    // Show report modal - keeping this for reference but no longer using it
    function showReportModal(reportContent) {
        // This function is replaced by the openUniversitySelectionWindow function
        // ...existing code...
    }
    
    // Generate and display report
    function generateAndShowReport() {
        console.log("Generating report...");
        
        try {
            // Get university data (using the first one from the list)
            const universities = [
                { id: 1, name: "Harvard University", foundedYear: 1636, location: "Cambridge, MA" },
                { id: 2, name: "Massachusetts Institute of Technology", foundedYear: 1861, location: "Cambridge, MA" },
                { id: 3, name: "Stanford University", foundedYear: 1885, location: "Stanford, CA" }
            ];
            const university = universities[0]; // Using Harvard as the default university
            
            // Create report content
            let reportContent = `
                <div class="report-header">
                    <h2>${university.name}</h2>
                    <p>${university.location} - Est. ${university.foundedYear}</p>
                </div>
                <div class="report-section">
                    <h3>Academic Report</h3>
                    <p class="report-date">Generated on: ${new Date().toLocaleDateString()}</p>
                </div>
            `;
            
            // Create student reports
            reportContent += '<div class="report-section student-list">';
            
            // Process each student
            students.forEach(student => {
                // Get courses with grades C or better
                const passedCourses = student.courses.filter(courseId => {
                    const grade = student.grades?.[courseId] || '';
                    const firstChar = grade.charAt(0);
                    return ['A', 'B', 'C'].includes(firstChar);
                });
                
                // Only include students who have passed courses
                if (passedCourses.length > 0) {
                    // Create student section
                    reportContent += `
                        <div class="student-entry">
                            <div class="student-header">
                                <h4>${student.name} (${student.studentId})</h4>
                                <p>Email: ${student.email} | Overall GPA: ${student.gpa}</p>
                            </div>
                            <table class="course-grades-table">
                                <thead>
                                    <tr>
                                        <th>Course</th>
                                        <th>Credits</th>
                                        <th>Professor</th>
                                        <th>Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;
                    
                    // Add passed courses
                    passedCourses.forEach(courseId => {
                        const course = courses.find(c => c.id === courseId);
                        if (course) {
                            const grade = student.grades?.[courseId] || 'N/A';
                            reportContent += `
                                <tr>
                                    <td>${course.name}</td>
                                    <td>${course.credits}</td>
                                    <td>${course.professor}</td>
                                    <td><span class="grade grade-${grade.charAt(0).toLowerCase()}">${grade}</span></td>
                                </tr>
                            `;
                        }
                    });
                    
                    // Calculate total credits
                    const totalCredits = passedCourses.reduce((sum, courseId) => {
                        const course = courses.find(c => c.id === courseId);
                        return sum + (course ? course.credits : 0);
                    }, 0);
                    
                    reportContent += `
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="1">Total Credits:</td>
                                        <td>${totalCredits}</td>
                                        <td colspan="2"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    `;
                }
            });
            
            reportContent += '</div>';
            
            // Create and show the report modal
            showReportModal(reportContent);
            console.log("Report generated successfully");
            
        } catch (error) {
            console.error("Error generating report:", error);
            showNotification("Failed to generate report. Please try again.", "error");
        }
    }
    
    // Show notification
    function showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = type === 'success' ? '#1a5fa5' : '#e74c3c';
        notification.style.color = 'white';
        notification.style.padding = '15px 25px';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
        notification.style.transform = 'translateY(100px)';
        notification.style.opacity = '0';
        notification.style.transition = 'all 0.3s';
        notification.style.zIndex = '1000';
        
        // Add to body
        document.body.appendChild(notification);
        
        // Add active class to trigger animation
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateY(100px)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Add logout functionality
    function setupLogoutButtons() {
        const logoutButtons = document.querySelectorAll('#logout-btn, #header-logout-btn');
        
        logoutButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', function() {
                    // Remove auth token
                    localStorage.removeItem('authToken');
                    sessionStorage.removeItem('authToken'); // Clear both storage options
                    
                    // Show notification
                    showNotification('Logged out successfully');
                    
                    // Redirect to login page
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1000);
                });
            }
        });
    }
    
    // Initial load
    console.log("Initializing course display...");
    initializeApp();
    
    // Setup logout buttons
    setupLogoutButtons();
});

function setupLogoutButtons() {
    const logoutButtons = document.querySelectorAll('#logout-btn, #header-logout-btn');
    
    logoutButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', function() {
                // Remove auth token
                localStorage.removeItem('authToken');
                
                // Redirect to login page
                window.location.href = 'login.html';
            });
        }
    });
}