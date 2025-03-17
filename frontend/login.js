document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const apiUrl = 'http://127.0.0.1:8000/api/';
    
    // For demo/development purposes only - remove in production
    const staticAdmins = [
        { username: 'Lia', password: '123456' }, // Super admin bypass
        { username: 'user1', password: 'password123' },
        { username: 'user2', password: 'securepass' }
    ];
    
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Basic validation
        if (!validateForm(username, password)) {
            return; // Stop if validation fails
        }
        
        // Special case for super admin (for development/demo only)
        if (username === 'Lia' && password === '123456') {
            console.log('Super admin logged in');
            localStorage.setItem('user_role', 'super_admin');
            localStorage.setItem('username', username);
            window.location.href = 'main.html';
            return;
        }
        
        try {
            // Try to authenticate with the Django backend
            const response = await fetch(`${apiUrl}api-token-auth/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password
                })
            });
            
            if (response.ok) {
                // Authentication successful
                const data = await response.json();
                console.log('Login successful via API');
                
                // Store the auth token in localStorage
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('username', username);
                
                // Get user details (role, etc.)
                try {
                    const userResponse = await fetch(`${apiUrl}current-user/`, {
                        headers: {
                            'Authorization': `Token ${data.token}`
                        }
                    });
                    
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        localStorage.setItem('user_role', userData.role);
                        localStorage.setItem('user_name', userData.name);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
                
                // Redirect to main page
                window.location.href = 'main.html';
            } else {
                // API authentication failed, fall back to static admin check if in dev mode
                console.log('API authentication failed, checking static admins');
                
                const isStaticAdmin = staticAdmins.some(user => 
                    user.username === username && user.password === password);
                
                if (isStaticAdmin) {
                    console.log('Login successful via static admins');
                    localStorage.setItem('user_role', 'admin');
                    localStorage.setItem('username', username);
                    window.location.href = 'main.html';
                } else {
                    showError('Invalid username or password');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // In case of network issues, fall back to static admins check
            const isStaticAdmin = staticAdmins.some(user => 
                user.username === username && user.password === password);
            
            if (isStaticAdmin) {
                console.log('Login successful via static admins (fallback)');
                localStorage.setItem('user_role', 'admin');
                localStorage.setItem('username', username);
                window.location.href = 'main.html';
            } else {
                showError('Connection error. Please try again later.');
            }
        }
    });
    
    function showError(message) {
        alert(message);
        console.log('Login failed:', message);
    }
    
    function validateForm(username, password) {
        // Basic validation rules
        if (!username || username.trim() === '') {
            showError('Please enter a username');
            return false;
        }
        
        if (!password || password.length < 6) {
            showError('Password must be at least 6 characters long');
            return false;
        }
        
        return true;
    }
});
