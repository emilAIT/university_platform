document.addEventListener('DOMContentLoaded', function() {
    // Get the university list link and modal
    const universityListLink = document.getElementById('university-list-link');
    const universityModal = document.getElementById('university-window');
    const closeUniversityBtn = document.querySelector('#university-window .close');
    
    // Navigate to university management page when clicking "List of universities"
    if (universityListLink) {
        universityListLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'university.html';
        });
    }
    
    // Close university modal when clicking on X
    if (closeUniversityBtn) {
        closeUniversityBtn.addEventListener('click', function() {
            universityModal.style.display = 'none';
        });
    }
    
    // Add missing reportViewModal variable declaration
    const reportViewModal = document.getElementById('report-view-modal');
    const closeReportViewBtn = document.getElementById('close-report-view');
    const reportTitle = document.getElementById('report-title');
    const reportDate = document.getElementById('report-date');
    const studentTableBody = document.getElementById('student-data-body');
    
    // Reports functionality
    const academicReportLink = document.getElementById('academic-report-link');
    const reportsModal = document.getElementById('reports-window');
    const closeReportsBtn = document.getElementById('close-reports');
    const reportSearch = document.getElementById('report-search');
    
    // Navigate to reports page when clicking on Academic Report instead of showing modal
    if (academicReportLink) {
        academicReportLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'reports.html';
        });
    }
    
    // Close reports modal when clicking on X
    if (closeReportsBtn) {
        closeReportsBtn.addEventListener('click', function() {
            reportsModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === reportsModal) {
            reportsModal.style.display = 'none';
        }
        if (event.target === reportViewModal) {
            reportViewModal.style.display = 'none';
        }
        if (event.target === universityModal) {
            universityModal.style.display = 'none';
        }
    });
    
    // University search functionality
    if (reportSearch) {
        reportSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const universityItems = document.querySelectorAll('.report-item');
            
            universityItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // Handle university selection
    const universityItems = document.querySelectorAll('.report-item');
    universityItems.forEach(item => {
        item.addEventListener('click', function() {
            const universityId = this.getAttribute('data-university-id');
            const universityName = this.textContent;
            openStudentDataView(universityId, universityName);
        });
    });
    
    // Close report view modal
    if (closeReportViewBtn) {
        closeReportViewBtn.addEventListener('click', function() {
            reportViewModal.style.display = 'none';
        });
    }

    // Function to open the student data view
    function openStudentDataView(universityId, universityName) {
        // Set the university name as title
        reportTitle.textContent = universityName;
        
        // Set current date
        const date = new Date();
        reportDate.textContent = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Load student data
        loadStudentData(universityId);
        
        // Display the modal
        reportViewModal.style.display = 'block';
    }
    
    // Function to load student data for a university
    function loadStudentData(universityId) {
        // Clear existing table data
        studentTableBody.innerHTML = '';
        
        // Generate random student data
        const randomStudents = generateRandomStudents(10); // Generate 10 random students
        
        // Generate table rows from student data
        randomStudents.forEach(student => {
            student.courses.forEach(course => {
                const row = document.createElement('tr');
                
                // Create cell for student name
                const nameCell = document.createElement('td');
                nameCell.textContent = student.name;
                row.appendChild(nameCell);
                
                // Create cell for student ID
                const idCell = document.createElement('td');
                idCell.textContent = student.id;
                row.appendChild(idCell);
                
                // Create cell for course name
                const courseCell = document.createElement('td');
                courseCell.textContent = course.name;
                row.appendChild(courseCell);
                
                // Create cell for grade
                const gradeCell = document.createElement('td');
                gradeCell.textContent = course.grade;
                
                // Add class based on grade for styling
                if (course.grade === 'A' || course.grade === 'A+' || course.grade === 'A-') {
                    gradeCell.classList.add('grade-a');
                } else if (course.grade === 'B' || course.grade === 'B+' || course.grade === 'B-') {
                    gradeCell.classList.add('grade-b');
                } else if (course.grade === 'C' || course.grade === 'C+' || course.grade === 'C-') {
                    gradeCell.classList.add('grade-c');
                } else {
                    gradeCell.classList.add('grade-d');
                }
                
                row.appendChild(gradeCell);
                
                // Add row to table
                studentTableBody.appendChild(row);
            });
        });
    }
    
    // Function to generate random student data
    function generateRandomStudents(count) {
        const firstNames = ['John', 'Emily', 'Michael', 'Sarah', 'David', 'Jessica', 'Robert', 'Amanda', 'Thomas', 'Lisa', 'James', 'Maria', 'Alexander', 'Sofia', 'William', 'Anna', 'Chris', 'Emma', 'Daniel', 'Olivia'];
        const lastNames = ['Smith', 'Johnson', 'Davis', 'Williams', 'Wilson', 'Brown', 'Miller', 'Clark', 'Moore', 'Wang', 'Rodriguez', 'Garcia', 'Chen', 'Taylor', 'Lee', 'Martinez', 'Harris', 'Robinson', 'Lewis', 'Walker'];
        const courses = [
            'Computer Science 101', 'Data Structures', 'Algorithms', 'Web Development', 'Database Systems',
            'Advanced Programming', 'Software Engineering', 'Computer Networks', 'Artificial Intelligence',
            'Biology 201', 'Chemistry', 'Physics 101', 'Organic Chemistry', 'Microbiology', 'Genetics',
            'English Literature', 'Creative Writing', 'History of Art', 'Psychology 101', 'Sociology', 
            'Philosophy', 'Political Science', 'Economics', 'Statistics', 'Calculus I',
            'Linear Algebra', 'Differential Equations', 'Discrete Mathematics', 'Probability Theory',
            'International Relations', 'Foreign Policy', 'Global Economics', 'International Law', 'Diplomatic Studies'
        ];
        const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
        const prefixes = ['ST-', 'CS-', 'ENG-', 'MED-', 'ART-', 'SCI-'];
        
        const students = [];
        
        for (let i = 0; i < count; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const name = `${firstName} ${lastName}`;
            
            // Generate random student ID
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const idNumber = Math.floor(10000 + Math.random() * 90000);
            const id = `${prefix}${idNumber}`;
            
            // Generate 2-4 random courses for this student
            const studentCourses = [];
            const numCourses = 2 + Math.floor(Math.random() * 3); // 2-4 courses
            
            // Create a copy of courses array to avoid duplicates
            const availableCourses = [...courses];
            
            for (let j = 0; j < numCourses; j++) {
                if (availableCourses.length === 0) break;
                
                // Select random course
                const courseIndex = Math.floor(Math.random() * availableCourses.length);
                const courseName = availableCourses[courseIndex];
                
                // Remove selected course to avoid duplicates
                availableCourses.splice(courseIndex, 1);
                
                // Assign random grade
                const grade = grades[Math.floor(Math.random() * grades.length)];
                
                studentCourses.push({
                    name: courseName,
                    grade: grade
                });
            }
            
            students.push({
                name: name,
                id: id,
                courses: studentCourses
            });
        }
        
        return students;
    }

    // Administrator functionality
    const adminListLink = document.getElementById('admin-list-link');
    const adminModal = document.getElementById('admin-window');
    const closeAdminBtn = document.getElementById('close-admin');
    const adminSearch = document.getElementById('admin-search');
    
    // Open admin modal when clicking "list of admins"
    if (adminListLink) {
        adminListLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'admin.html';
        });
    }
    
    // Close admin modal when clicking on X
    if (closeAdminBtn) {
        closeAdminBtn.addEventListener('click', function() {
            adminModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === reportsModal) {
            reportsModal.style.display = 'none';
        }
        if (event.target === reportViewModal) {
            reportViewModal.style.display = 'none';
        }
        if (event.target === universityModal) {
            universityModal.style.display = 'none';
        }
        if (event.target === adminModal) {
            adminModal.style.display = 'none';
        }
    });
});

// Function to open a specific university page
function openUniversityPage(universityId) {
    window.location.href = `university/${universityId}.html`;
}
