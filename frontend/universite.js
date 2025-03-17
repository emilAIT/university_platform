document.addEventListener('DOMContentLoaded', function() {
    const universitiesList = document.getElementById('universities');
    const universitySearch = document.getElementById('university-search');
    const addUniversityBtn = document.getElementById('add-university-btn');
    const universityModal = document.getElementById('university-modal');
    const closeModalBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-university');
    const universityForm = document.getElementById('university-form');

    // API URLs
    const API_BASE_URL = 'http://127.0.0.1:8000/api/';  // Add /api/ to the base URL
    const UNIVERSITIES_API = `${API_BASE_URL}universities/`;
    const CURRENT_USER_API = `${API_BASE_URL}current-user/`;
    
    // Store fetched universities data globally for search functionality
    let fetchedUniversities = [];
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
        const addUniversityBtn = document.getElementById('add-university-btn');
        
        if (!isHeadAdmin && addUniversityBtn) {
            // Hide add university button for university admins
            addUniversityBtn.style.display = 'none';
        }
        
        // Update page header to show which university the admin belongs to
        if (!isHeadAdmin) {
            const headerTitle = document.querySelector('.header-title h1');
            if (headerTitle) {
                const universityName = universities.find(u => u.id === user.university_id)?.name || 'Your University';
                headerTitle.textContent = `University Management - ${universityName}`;
            }
        }
    }

    // Function to fetch universities from API with improved error handling
    async function fetchUniversities() {
        try {
            console.log("Fetching universities from API...");
            
            // Get the token from localStorage
            const token = localStorage.getItem('authToken');
            
            // Simplified fetch options with auth token
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
            console.log("Data received:", data);
            
            // Store fetched data globally
            fetchedUniversities = Array.isArray(data) ? data : [];
            
            // Actually display the universities on the page
            displayUniversities(fetchedUniversities);
            
            return fetchedUniversities;
        } catch (error) {
            console.error('Error fetching universities:', error);
            // Fallback to sample data if API call fails
            fetchedUniversities = universities; // Use sample data as fallback
            displayUniversities(universities);
            return universities;
        }
    }

    // Sample university data for fallback
    const universities = [
        { id: 1, name: "University of Technology", location: "New York", students: 15000 },
        { id: 2, name: "National University", location: "Chicago", students: 12500 },
        { id: 3, name: "City College", location: "Los Angeles", students: 9800 },
        { id: 4, name: "State University", location: "Houston", students: 18200 },
        { id: 5, name: "International Institute", location: "Miami", students: 7500 }
    ];

    // Function to display universities with better logging
    function displayUniversities(universities) {
        console.log(`Displaying ${universities.length} universities:`, universities);
        
        // Check if the DOM element exists
        if (!universitiesList) {
            console.error('Universities list element not found!');
            return;
        }
        
        // Clear current list
        universitiesList.innerHTML = '';

        if (universities.length === 0) {
            universitiesList.innerHTML = '<li class="no-results">No universities found</li>';
            return;
        }

        // Add universities to the list
        universities.forEach(uni => {
            const li = document.createElement('li');
            li.setAttribute('data-university-id', uni.id);
            li.innerHTML = `
                <div class="university-name">
                    <strong>${uni.name}</strong>
                    <div>${uni.location} | ${uni.students.toLocaleString()} students</div>
                </div>
                <div class="university-actions">
                    <button class="view-btn" title="View"><i class="fas fa-eye"></i></button>
                    <button class="edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            // Add click event handlers for action buttons
            const viewBtn = li.querySelector('.view-btn');
            const editBtn = li.querySelector('.edit-btn');
            const deleteBtn = li.querySelector('.delete-btn');
            
            viewBtn.addEventListener('click', () => viewUniversity(uni.id));
            editBtn.addEventListener('click', () => editUniversity(uni.id));
            deleteBtn.addEventListener('click', () => deleteUniversity(uni.id));
            
            universitiesList.appendChild(li);
        });
    }

    // Search functionality
    if (universitySearch) {
        universitySearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            // Search through the fetched universities, not just the static sample data
            const filteredUniversities = fetchedUniversities.filter(uni => 
                uni.name.toLowerCase().includes(searchTerm) || 
                uni.location.toLowerCase().includes(searchTerm)
            );
            displayUniversities(filteredUniversities);
        });
    }

    // Add university button click handler
    if (addUniversityBtn) {
        addUniversityBtn.addEventListener('click', function() {
            // Open the modal dialog
            universityModal.style.display = 'block';
        });
    }

    // Close modal when clicking the X button
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            universityModal.style.display = 'none';
        });
    }

    // Close modal when clicking the Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            universityModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside the modal
    window.addEventListener('click', function(event) {
        if (event.target === universityModal) {
            universityModal.style.display = 'none';
        }
    });

    // Function to validate and format a URL
    function validateAndFormatURL(url) {
        // If empty, return null so backend treats it as null/blank
        if (!url || url.trim() === '') {
            return null;
        }
        
        // Check if URL starts with http:// or https://
        if (!/^https?:\/\//i.test(url)) {
            // Add https:// as default protocol
            url = 'https://' + url;
        }
        
        try {
            // Test if it's a valid URL by trying to construct a URL object
            new URL(url);
            return url;
        } catch (err) {
            console.error('Invalid URL:', url, err);
            return null;
        }
    }

    // Handle form submission with improved response handling
    if (universityForm) {
        universityForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('university-name').value;
            const foundationYear = document.getElementById('foundation-year').value;
            const location = document.getElementById('university-location').value;
            const students = document.getElementById('student-count').value;
            let website = document.getElementById('university-website').value;
            const description = document.getElementById('university-description').value;
            
            // Validate and format the website URL
            website = validateAndFormatURL(website);
            
            // Create new university object
            const newUniversity = {
                name: name,
                foundation_year: parseInt(foundationYear),
                location: location,
                students: parseInt(students),
                website: website, // This will be null or a properly formatted URL
                description: description
            };
            
            console.log("Submitting university data:", newUniversity);
            
            try {
                // Send POST request to API
                const response = await fetch(UNIVERSITIES_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(newUniversity)
                });
                
                console.log("Response status:", response.status);
                console.log("Response headers:", [...response.headers.entries()]);
                
                const responseText = await response.text();
                console.log("Raw response body:", responseText);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseText}`);
                }
                
                let savedUniversity;
                try {
                    // Parse the JSON only if it's valid and not empty
                    if (responseText && responseText.trim()) {
                        savedUniversity = JSON.parse(responseText);
                        console.log("Successfully saved university:", savedUniversity);
                    } else {
                        console.warn("Empty response received from server");
                    }
                } catch (jsonError) {
                    console.error("Error parsing JSON response:", jsonError);
                    console.error("Raw response was:", responseText);
                }
                
                // Close the modal
                universityModal.style.display = 'none';
                
                // Reset the form
                universityForm.reset();
                
                // Show success message
                alert(`${name} has been successfully added!`);
                
                // Refresh the universities list - with a small delay to ensure the server has processed the addition
                setTimeout(async () => {
                    try {
                        const refreshedData = await fetchUniversities();
                        console.log("List refreshed after addition, universities count:", refreshedData.length);
                    } catch (refreshError) {
                        console.error("Error refreshing university list:", refreshError);
                    }
                }, 500);
                
            } catch (error) {
                console.error('Error adding university:', error);
                alert(`Failed to add university: ${error.message}. Please check the console for details.`);
            }
        });
    }

    // View university details
    async function viewUniversity(id) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${UNIVERSITIES_API}${id}/`, {
                headers: {
                    'Authorization': token ? `Token ${token}` : ''
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const university = await response.json();
            
            // Create a more useful view message with all relevant information
            const detailsMessage = `
University Details:
------------------
Name: ${university.name}
Location: ${university.location}
Founded: ${university.foundation_year || 'Unknown'}
Students: ${university.students.toLocaleString()}
${university.website ? 'Website: ' + university.website : ''}
${university.description ? '\nDescription: ' + university.description : ''}
`;
            alert(detailsMessage);
        } catch (error) {
            console.error('Error viewing university details:', error);
            alert('Failed to load university details.');
        }
    }

    // Edit university
    async function editUniversity(id) {
        try {
            // Only head admin can edit universities
            if (currentUser && currentUser.university_id) {
                alert('You do not have permission to edit universities.');
                return;
            }
            
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${UNIVERSITIES_API}${id}/`, {
                headers: {
                    'Authorization': token ? `Token ${token}` : ''
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const university = await response.json();
            
            // Populate the form with university data (extend this in a real app)
            alert(`Editing ${university.name}`);
            
        } catch (error) {
            console.error('Error fetching university details:', error);
            alert('Failed to load university details.');
        }
    }

    // Delete university
    async function deleteUniversity(id) {
        try {
            // Only head admin can delete universities
            if (currentUser && currentUser.university_id) {
                alert('You do not have permission to delete universities.');
                return;
            }
            
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${UNIVERSITIES_API}${id}/`, {
                headers: {
                    'Authorization': token ? `Token ${token}` : ''
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const university = await response.json();
            
            const confirmDelete = confirm(`Are you sure you want to delete ${university.name}?`);
            
            if (confirmDelete) {
                const deleteResponse = await fetch(`${UNIVERSITIES_API}${id}/`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': token ? `Token ${token}` : ''
                    }
                });
                
                if (!deleteResponse.ok) {
                    throw new Error(`HTTP error! Status: ${deleteResponse.status}`);
                }
                
                alert(`${university.name} has been deleted`);
                fetchUniversities();
            }
        } catch (error) {
            console.error('Error deleting university:', error);
            alert('Failed to delete university.');
        }
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
                });
            }
        });
    }

    // Check if we're on a page with the universities list
    if (universitiesList) {
        console.log("University list found, initializing...");
        // Check authentication first, then initialize
        checkAuth().then(user => {
            if (user) {
                // Initialize the university list
                fetchUniversities();
                
                // Setup logout buttons
                setupLogoutButtons();
            }
        });
    } else {
        console.warn("Universities list element not found in the DOM");
        
        // Still setup logout buttons even if we're not on the main universities page
        setupLogoutButtons();
    }
});
