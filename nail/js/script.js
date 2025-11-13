/* ========================================
   LUXURY NAILS & BEAUTY SALON - JAVASCRIPT
   ======================================== */

// ========================================
// UPGRADED: Hero Image Slider with Fade Transition
// ========================================
let currentSlide = 0;
const slides = document.querySelectorAll('.hero-slide');
const totalSlides = slides.length;

function showSlide(index) {
    // Remove active class from current slide
    slides.forEach(slide => slide.classList.remove('active'));
    
    // Add active class to new slide
    slides[index].classList.add('active');
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    showSlide(currentSlide);
}

// Auto-advance slider every 5 seconds
if (slides.length > 0) {
    setInterval(nextSlide, 5000);
}

// ========================================
// UPGRADED: Scroll Animations with IntersectionObserver
// ========================================
const observerOptions = {
    threshold: 0.15, // Trigger when 15% of element is visible
    rootMargin: '0px 0px -50px 0px' // Trigger slightly before element is fully in view
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Optional: Stop observing after animation triggers
            // observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all sections with animate-on-scroll class
document.querySelectorAll('.animate-on-scroll').forEach(section => {
    observer.observe(section);
});

// ========================================
// Mobile Menu Toggle
// ========================================
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Close mobile menu when a link is clicked
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// ========================================
// Service Card Toggle (Collapsible Lists)
// ========================================
const serviceHeaders = document.querySelectorAll('.service-header');

serviceHeaders.forEach(header => {
    // Start with first card open
    if (header === serviceHeaders[0]) {
        header.classList.add('active');
        header.nextElementSibling.classList.add('active');
    }

    header.addEventListener('click', () => {
        const serviceList = header.nextElementSibling;
        
        // Toggle current card
        header.classList.toggle('active');
        serviceList.classList.toggle('active');
    });
});

// ========================================
// Booking Modal
// ========================================
const bookingModal = document.getElementById('bookingModal');
const bookNowBtn = document.getElementById('bookNowBtn');
const bookNowBtn2 = document.getElementById('bookNowBtn2');
const floatingBookBtn = document.getElementById('floatingBookBtn');
const closeModal = document.getElementById('closeModal');

// Open modal when "Book Now" button is clicked
function openBookingModal() {
    bookingModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

// Close modal
function closeBookingModal() {
    bookingModal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

bookNowBtn.addEventListener('click', openBookingModal);
bookNowBtn2.addEventListener('click', openBookingModal);
floatingBookBtn.addEventListener('click', openBookingModal); // ADDED: Floating button
closeModal.addEventListener('click', closeBookingModal);

// Close modal when clicking outside the modal content
bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) {
        closeBookingModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookingModal.classList.contains('active')) {
        closeBookingModal();
    }
});

// ========================================
// Header scroll effect (optional enhancement)
// ========================================
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 100) {
        header.style.padding = '0.5rem 5%';
    } else {
        header.style.padding = '1rem 5%';
    }
});

// ========================================
// Floating Book Button - Hide on Hero Section
// ========================================
window.addEventListener('scroll', () => {
    const floatingBtn = document.getElementById('floatingBookBtn');
    const heroSection = document.getElementById('home');
    
    if (heroSection && floatingBtn) {
        const heroHeight = heroSection.offsetHeight;
        const scrollPosition = window.scrollY;
        
        // Hide button when on hero section, show after scrolling past it
        if (scrollPosition < heroHeight - 100) {
            floatingBtn.classList.add('hidden');
        } else {
            floatingBtn.classList.remove('hidden');
        }
    }
});

