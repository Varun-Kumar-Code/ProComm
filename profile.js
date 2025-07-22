// Navbar interactivity for profile.html

// Profile picture update logic
function setProfilePicture(src) {
    const profilePic = document.getElementById('profile-picture');
    if (profilePic) profilePic.src = src;
    // Also update navbar user icon
    const navbarUserIcons = document.querySelectorAll('.profile-navbar-icon');
    navbarUserIcons.forEach(icon => {
        icon.style.backgroundImage = `url('${src}')`;
        icon.style.backgroundSize = 'cover';
        icon.innerHTML = '';
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // User dropdown menu
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
        // Hide dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!userDropdown.classList.contains('hidden')) {
                userDropdown.classList.add('hidden');
            }
        });
        userDropdown.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }

    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            mobileMenu.classList.toggle('hidden');
        });
        // Hide mobile menu when clicking outside
        document.addEventListener('click', function (e) {
            if (!mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
            }
        });
        mobileMenu.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }

    // Load saved profile picture
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) {
        setProfilePicture(savedPic);
    }
    // Update Picture button
    const updateBtn = document.getElementById('update-picture-btn');
    const fileInput = document.getElementById('profile-picture-input');
    if (updateBtn && fileInput) {
        updateBtn.addEventListener('click', function () {
            fileInput.click();
        });
        fileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    const imgSrc = evt.target.result;
                    setProfilePicture(imgSrc);
                    localStorage.setItem('profilePicture', imgSrc);
                };
                reader.readAsDataURL(file);
            }
        });
    }
});