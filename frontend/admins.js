document.addEventListener('DOMContentLoaded', function() {
    console.log('Admins.js script loaded');
    
    // Get elements
    const adminListElement = document.getElementById('administrators');
    const adminSearchInput = document.getElementById('admin-search');
    const addAdminBtn = document.getElementById('add-admin-btn');
    const adminModal = document.getElementById('add-admin-modal');
    const closeAddBtn = document.getElementById('close-add-admin');
    const apiUrl = 'http://127.0.0.1:8000/api/';
    
    // Define universities endpoint
    const UNIVERSITIES_API = `${apiUrl}universities/`;
    const CURRENT_USER_API = `${apiUrl}current-user/`;
    let universitiesData = [];
    let currentUser = null;
    let isUniversityAdmin = false;
    
    console.log('Initial setup complete, will check authentication first');
    
    // Check authentication and permissions
    async function checkAuth() {
        try {
            // Get the token from localStorage
            const token = localStorage.getItem('authToken');
            
            if (!token) {
                // No token, redirect to login
                console.log('No authentication token, redirecting to login');
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
                console.log('Invalid token, redirecting to login');
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                return null;
            }
            
            const userData = await response.json();
            currentUser = userData;
            console.log('User authenticated:', currentUser);
            
            // Check if user is university admin
            isUniversityAdmin = currentUser.university_id ? true : false;
            
            // Update UI based on user type
            updateUIForUserRole(currentUser);
            
            return currentUser;
        } catch (error) {
            console.error('Authentication error:', error);
            window.location.href = 'login.html';
            return null;
        }
    }
    
    // Update UI based on user role
    function updateUIForUserRole(user) {
        // Update page title based on role
        const pageTitle = document.querySelector('.admin-header h1');
        if (pageTitle) {
            if (isUniversityAdmin) {
                pageTitle.textContent = 'Professor Management';
                document.title = 'Professor Management';
            }
        }
        
        // Update add button text
        if (addAdminBtn) {
            if (isUniversityAdmin) {
                addAdminBtn.textContent = 'Add New Professor';
            }
        }
    }
    
    // Function to fetch universities from the backend
    async function fetchUniversities() {
        try {
            console.log("Fetching universities from API...");
            
            // Get auth token
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.error('No authentication token available');
                return [];
            }
            
            const fetchOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                }
            };
            
            const response = await fetch(UNIVERSITIES_API, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Universities fetched successfully, count:", data.length);
            
            universitiesData = Array.isArray(data) ? data : [];
            return universitiesData;
        } catch (error) {
            console.error('Error fetching universities:', error);
            return [];
        }
    }
    
    // Populate university dropdown
    function populateUniversityDropdown() {
        const universitySelect = document.getElementById('admin-university');
        if (!universitySelect) {
            console.error("University dropdown not found in the form");
            return;
        }
        
        // Clear existing options
        universitySelect.innerHTML = '';
        
        // For university admin, just set their university and disable the field
        if (isUniversityAdmin && currentUser.university_id) {
            const universityOption = document.createElement('option');
            const universityName = getUniversityNameById(currentUser.university_id) || 'Your University';
            
            universityOption.value = currentUser.university_id;
            universityOption.textContent = universityName;
            universityOption.selected = true;
            
            universitySelect.appendChild(universityOption);
            universitySelect.disabled = true;
            
            // Also hide the role dropdown if it's a university admin (they can only add professors)
            const roleSelect = document.getElementById('admin-role');
            if (roleSelect) {
                // Set to teacher (professor) and hide
                roleSelect.value = 'teacher';
                roleSelect.closest('.form-group').style.display = 'none';
            }
            
            return;
        }
        
        // For head admin, show all options
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a university';
        universitySelect.appendChild(defaultOption);
        
        // Add head admin option (no university)
        const headAdminOption = document.createElement('option');
        headAdminOption.value = 'none';
        headAdminOption.textContent = '-- Head Admin (No University) --';
        universitySelect.appendChild(headAdminOption);
        
        // Add universities as options
        universitiesData.forEach(university => {
            const option = document.createElement('option');
            option.value = university.id;
            option.textContent = university.name;
            universitySelect.appendChild(option);
        });
    }
    
    // Function to fetch data from API
    async function fetchFromAPI(endpoint) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.error('Authentication required');
                window.location.href = 'login.html';
                return null;
            }
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            };
            
            console.log(`Fetching from ${apiUrl}${endpoint}`);
            const response = await fetch(`${apiUrl}${endpoint}`, {
                headers: headers
            });
            
            // For debugging - log the response
            console.log(`Response status: ${response.status}`);
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                
                if (!response.ok) {
                    console.error('API error details:', data);
                    throw new Error(`API error: ${response.status} - ${JSON.stringify(data)}`);
                }
                
                return data;
            } else {
                // Handle non-JSON response
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new Error(`API returned non-JSON response: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching from API:', error);
            throw error;
        }
    }
    
    // Function to send data to API
    async function postToAPI(endpoint, data, method = 'POST') {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Authentication required');
            }
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            };
            
            const response = await fetch(`${apiUrl}${endpoint}`, {
                method: method,
                headers: headers,
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error posting to API:', error);
            alert(`Error: ${error.message}`);
            return null;
        }
    }
    
    // Function to get token for auth calls
    function getAuthToken() {
        return localStorage.getItem('authToken');
    }
    
    // Function to load administrators/professors from API
    async function loadAdministrators() {
        try {
            console.log('Loading administrators...');
            let users = await fetchFromAPI('users/');
            
            // If university admin, filter to only show professors at their university
            if (isUniversityAdmin && currentUser.university_id) {
                users = users.filter(user => 
                    user.role === 'teacher' && 
                    user.university_id == currentUser.university_id
                );
                
                console.log(`Filtered to ${users.length} professors for university ${currentUser.university_id}`);
            }
            
            displayAdministrators(users);
        } catch (error) {
            console.error('Error loading administrators:', error);
            adminListElement.innerHTML = '<li class="no-results">Failed to load administrators: ' + error.message + '</li>';
        }
    }
    
    // Function to get university name by ID
    function getUniversityNameById(universityId) {
        if (!universityId) return "Not assigned";
        
        const university = universitiesData.find(u => u.id == universityId);
        return university ? university.name : "Unknown University";
    }
    
    // Function to display administrators
    function displayAdministrators(admins) {
        adminListElement.innerHTML = '';
        
        if (!admins || admins.length === 0) {
            adminListElement.innerHTML = '<li class="no-results">No administrators found</li>';
            return;
        }
        
        admins.forEach(admin => {
            const li = document.createElement('li');
            li.classList.add('admin-item');
            li.dataset.adminId = admin.id;
            
            // Get university name for this admin
            const universityName = getUniversityNameById(admin.university_id);
            
            // For university admins, display professors differently
            const roleDisplay = isUniversityAdmin ? 'Professor' : (admin.role_display || admin.role);
            
            li.innerHTML = `
                <div class="admin-info">
                    <h3>${admin.name}</h3>
                    <p><strong>Role:</strong> ${roleDisplay}</p>
                    <p><strong>Email:</strong> ${admin.email}</p>
                    <p><strong>University:</strong> <span class="university-badge">${universityName}</span></p>
                </div>
                <div class="admin-actions">
                    <button class="edit-admin" data-id="${admin.id}">Edit</button>
                    <button class="delete-admin" data-id="${admin.id}">Delete</button>
                </div>
            `;
            
            adminListElement.appendChild(li);
        });
        
        // Add event listeners to the edit and delete buttons
        document.querySelectorAll('.edit-admin').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const adminId = this.getAttribute('data-id');
                editAdmin(adminId);
            });
        });
        
        document.querySelectorAll('.delete-admin').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const adminId = this.getAttribute('data-id');
                deleteAdmin(adminId);
            });
        });
    }
    
    // Function to filter administrators based on search
    function filterAdministrators(searchTerm, admins) {
        if (!searchTerm) {
            return admins;
        }
        
        searchTerm = searchTerm.toLowerCase();
        return admins.filter(admin => {
            // Get university name for filtering
            const universityName = getUniversityNameById(admin.university_id).toLowerCase();
            
            return admin.name.toLowerCase().includes(searchTerm) || 
                   admin.role.toLowerCase().includes(searchTerm) || 
                   admin.email.toLowerCase().includes(searchTerm) ||
                   universityName.includes(searchTerm);
        });
    }
    
    // Add event listener to search input
    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', async function() {
            try {
                const admins = await fetchFromAPI('users/');
                // Apply university filter for university admins
                let filteredAdmins = admins;
                if (isUniversityAdmin && currentUser.university_id) {
                    filteredAdmins = admins.filter(user => 
                        user.role === 'teacher' && 
                        user.university_id == currentUser.university_id
                    );
                }
                // Then apply search filter
                filteredAdmins = filterAdministrators(this.value, filteredAdmins);
                displayAdministrators(filteredAdmins);
            } catch (error) {
                console.error('Error filtering administrators:', error);
                adminListElement.innerHTML = '<li class="no-results">Failed to load administrators: ' + error.message + '</li>';
            }
        });
    }
    
    // Function to open add admin modal with university data
    function openAddAdminModal() {
        console.log('Opening add admin modal');
        document.getElementById('admin-form').reset();
        
        // Set form title based on user role
        const modalHeader = document.querySelector('#add-admin-modal .modal-header h2');
        if (modalHeader) {
            if (isUniversityAdmin) {
                modalHeader.textContent = 'Add New Professor';
            } else {
                modalHeader.textContent = 'Add New Administrator';
            }
        }
        
        // Populate dropdown with already fetched university data
        populateUniversityDropdown();
        adminModal.style.display = 'block';
    }
    
    // Function to edit an administrator
    async function editAdmin(adminId) {
        try {
            const admin = await fetchFromAPI(`users/${adminId}/`);
            console.log("Editing user:", admin);
            
            // Open the edit modal
            const editModal = document.getElementById('edit-admin-modal');
            if (!editModal) {
                console.error("Edit modal not found!");
                alert("Cannot edit user - edit form not found.");
                return;
            }
            
            // Populate form fields
            document.getElementById('edit-admin-id').value = admin.id;
            document.getElementById('edit-admin-name').value = admin.name;
            document.getElementById('edit-admin-login').value = admin.username;
            document.getElementById('edit-admin-email').value = admin.email;
            
            // Clear password field (will only be updated if provided)
            document.getElementById('edit-admin-password').value = '';
            
            // Handle role dropdown - for university admin, force to teacher role and hide
            const roleSelect = document.getElementById('edit-admin-role');
            if (isUniversityAdmin) {
                roleSelect.value = 'teacher';
                roleSelect.closest('.form-group').style.display = 'none';
            } else {
                roleSelect.value = admin.role;
                roleSelect.closest('.form-group').style.display = 'block';
            }
            
            // Set form title based on user role
            const modalHeader = document.querySelector('#edit-admin-modal .modal-header h2');
            if (modalHeader) {
                if (isUniversityAdmin) {
                    modalHeader.textContent = 'Edit Professor';
                } else {
                    modalHeader.textContent = 'Edit Administrator';
                }
            }
            
            // Show the modal
            editModal.style.display = 'block';
            
        } catch (error) {
            console.error('Error editing administrator:', error);
            alert('Failed to load administrator details: ' + error.message);
        }
    }
    
    // Function to delete an administrator
    async function deleteAdmin(adminId) {
        if (confirm(isUniversityAdmin ? 
            "Are you sure you want to delete this professor?" : 
            "Are you sure you want to delete this administrator?")) {
            try {
                const token = await getAuthToken();
                if (!token) {
                    throw new Error('Authentication required');
                }
                
                const response = await fetch(`${apiUrl}users/${adminId}/`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Token ${token}`
                    }
                });
                
                if (response.ok) {
                    alert(isUniversityAdmin ? 
                        'Professor deleted successfully' : 
                        'Administrator deleted successfully');
                    loadAdministrators(); // Refresh the list
                } else {
                    const errorData = await response.json();
                    throw new Error(JSON.stringify(errorData));
                }
            } catch (error) {
                console.error('Error deleting administrator:', error);
                alert('Failed to delete ' + (isUniversityAdmin ? 'professor' : 'administrator') + ': ' + error.message);
            }
        }
    }
    
    // Handle form submissions - only if the form exists
    const adminForm = document.getElementById('admin-form');
    if (adminForm) {
        adminForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Admin form submitted');
            
            const universityValue = isUniversityAdmin ? 
                currentUser.university_id :
                document.getElementById('admin-university').value;
            
            const userData = {
                name: document.getElementById('admin-name').value,
                username: document.getElementById('admin-login').value,
                password: document.getElementById('admin-password').value,
                role: isUniversityAdmin ? 'teacher' : document.getElementById('admin-role').value,
                // Handle university id based on role
                university_id: universityValue === 'none' ? null : universityValue,
                email: document.getElementById('admin-email').value,
                is_active: true // Default to active
            };
            
            console.log('Submitting user data:', userData);
            const result = await postToAPI('users/', userData);
            if (result) {
                adminModal.style.display = 'none';
                alert(isUniversityAdmin ? 
                    'Professor added successfully' : 
                    'Administrator added successfully');
                loadAdministrators(); // Refresh the list
            }
        });
    } else {
        console.error('Admin form not found!');
    }
    
    // Handle edit form submission
    const editAdminForm = document.getElementById('edit-admin-form');
    if (editAdminForm) {
        editAdminForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Edit admin form submitted');
            
            const userId = document.getElementById('edit-admin-id').value;
            const userData = {
                name: document.getElementById('edit-admin-name').value,
                username: document.getElementById('edit-admin-login').value,
                email: document.getElementById('edit-admin-email').value,
                role: isUniversityAdmin ? 'teacher' : document.getElementById('edit-admin-role').value
            };
            
            // Only include password if it's provided
            const password = document.getElementById('edit-admin-password').value;
            if (password) {
                userData.password = password;
            }
            
            console.log('Updating user data:', userData);
            
            try {
                const result = await postToAPI(`users/${userId}/`, userData, 'PATCH');
                if (result) {
                    document.getElementById('edit-admin-modal').style.display = 'none';
                    alert(isUniversityAdmin ? 
                        'Professor updated successfully' : 
                        'Administrator updated successfully');
                    loadAdministrators(); // Refresh the list
                }
            } catch (error) {
                console.error('Error updating user:', error);
                alert('Failed to update ' + (isUniversityAdmin ? 'professor' : 'administrator') + ': ' + error.message);
            }
        });
        
        // Add event listener for cancel button inside edit form
        const editCancelBtn = document.querySelector('#edit-admin-form .cancel-btn');
        if (editCancelBtn) {
            editCancelBtn.addEventListener('click', function() {
                document.getElementById('edit-admin-modal').style.display = 'none';
            });
        }
    }
    
    // Add event listener to add admin button
    if (addAdminBtn) {
        console.log('Add admin button found, adding event listener');
        addAdminBtn.addEventListener('click', openAddAdminModal);
    } else {
        console.error('Add admin button not found!');
    }
    
    // Close modals
    if (closeAddBtn) {
        closeAddBtn.addEventListener('click', function() {
            adminModal.style.display = 'none';
        });
    }
    
    // Close edit modal
    const closeEditBtn = document.getElementById('close-edit-admin');
    if (closeEditBtn) {
        closeEditBtn.addEventListener('click', function() {
            document.getElementById('edit-admin-modal').style.display = 'none';
        });
    }
    
    // Add cancel button handlers for both forms
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // Initialize the page
    function initPage() {
        console.log('Initializing admins page');
        // Check authentication first
        checkAuth().then(user => {
            if (user) {
                // Fetch universities first
                fetchUniversities().then(data => {
                    console.log(`Universities loaded for page initialization (${data.length})`);
                    
                    // Only load administrators if the list element exists
                    if (adminListElement) {
                        console.log('Admin list element found, loading administrators');
                        loadAdministrators();
                    } else {
                        console.warn("Admin list element not found in the DOM");
                    }
                }).catch(err => {
                    console.error('Error loading universities:', err);
                });
            }
        }).catch(err => {
            console.error('Authentication failed:', err);
        });
    }
    
    // Start page initialization
    initPage();
});
