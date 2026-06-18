// Shared JavaScript functions for all pages
class SharedFunctions {
    constructor() {
        this.initNavigation();
        this.initTheme();
        this.initErrorHandling();
        this.loadUserData();
    }

    // Initialize navigation
    initNavigation() {
        // Mobile menu toggle
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                hamburger.innerHTML = navMenu.classList.contains('active') 
                    ? '<i class="fas fa-times"></i>' 
                    : '<i class="fas fa-bars"></i>';
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navMenu && navMenu.classList.contains('active') && 
                !e.target.closest('.nav-menu') && 
                !e.target.closest('.hamburger')) {
                navMenu.classList.remove('active');
                if (hamburger) {
                    hamburger.innerHTML = '<i class="fas fa-bars"></i>';
                }
            }
        });

        // Update active nav link based on current page
        this.updateActiveNavLink();
    }

    // Initialize theme (light/dark mode)
    initTheme() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            // Check for saved theme or prefer color scheme
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const savedTheme = localStorage.getItem('theme');
            
            // Determine initial theme
            let isDark = false;
            if (savedTheme) {
                isDark = savedTheme === 'dark';
            } else {
                isDark = prefersDark;
            }
            
            // Apply theme
            this.setTheme(isDark);
            
            // Set initial icon
            themeToggle.innerHTML = isDark 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
            
            // Toggle theme on click
            themeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.contains('dark-theme');
                this.setTheme(!isDark);
                
                // Update icon
                themeToggle.innerHTML = !isDark 
                    ? '<i class="fas fa-sun"></i>' 
                    : '<i class="fas fa-moon"></i>';
            });
        }
    }

    // Set theme
    setTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    }

    // ... rest of the SharedFunctions class remains the same ...
}

// Initialize shared functions when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.shared = new SharedFunctions();
});