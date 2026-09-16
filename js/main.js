// --- 1. LÓGICA DE LA CUENTA REGRESIVA ---
// Cambia esto a una fecha futura para tu boda.
// Ejemplo: 20 de Diciembre de 2026 a las 17:00 hrs (Diciembre es el mes 11)
const targetDate = new Date(2026, 11, 20, 17, 0, 0).getTime();

function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
        document.getElementById("countdown").innerHTML = "<p>¡Llegó el gran día!</p>";
        return;
    }

    // Cálculos de tiempo
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Inyectar en el HTML con ceros a la izquierda si es menor a 10
    document.getElementById("days").innerText = days.toString().padStart(2, '0');
    document.getElementById("hours").innerText = hours.toString().padStart(2, '0');
    document.getElementById("minutes").innerText = minutes.toString().padStart(2, '0');
    document.getElementById("seconds").innerText = seconds.toString().padStart(2, '0');
}

// Ejecutar cada segundo
setInterval(updateCountdown, 1000);
updateCountdown(); // Llamada inicial para evitar retraso de 1s


// --- 2. ANIMACIONES AL HACER SCROLL (Intersection Observer) ---
const animatedElements = document.querySelectorAll('.scroll-anim');

const observerOptions = {
    root: null,
    threshold: 0.15, // Se activa cuando el 15% del elemento es visible en pantalla
    rootMargin: "0px 0px -50px 0px"
};

const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Añade la clase 'visible' definida en CSS
            entry.target.classList.add('visible');
            // Deja de observar el elemento para que la animación solo ocurra una vez
            observer.unobserve(entry.target); 
        }
    });
}, observerOptions);

animatedElements.forEach(el => {
    scrollObserver.observe(el);
});     