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



// --- 3. FUNCIONES PARA LOS MODALES DE MAPAS ---

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    // Esto evita que el usuario pueda hacer scroll en la página de fondo
    document.body.style.overflow = 'hidden'; 
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    // Esto restaura el scroll normal
    document.body.style.overflow = 'auto'; 
}

// --- 4. LÓGICA DEL FORMULARIO RSVP A WHATSAPP ---
document.getElementById('rsvp-form').addEventListener('submit', function(e) {
    e.preventDefault(); // Evita que la página se recargue

    // 1. Obtener los valores de los campos
    const nombre = document.getElementById('nombre').value.trim();
    const asistencia = document.querySelector('input[name="asistencia"]:checked').value;
    const mensaje = document.getElementById('mensaje').value.trim();

    // 2. Tu número de teléfono (Debe incluir el código de país, ej. 52 para México)
    const telefono = "529999584946"; // <-- CAMBIA ESTO POR EL NÚMERO REAL

    // 3. Armar el mensaje para WhatsApp
    let textoWhatsApp = `¡Hola! Vengo a confirmar mi asistencia a la boda. 💍\n\n`;
    textoWhatsApp += `*Nombre:* ${nombre}\n`;
    textoWhatsApp += `*Asistencia:* ${asistencia}\n`;
    
    if (mensaje !== "") {
        textoWhatsApp += `*Mensaje:* "${mensaje}"\n`;
    }

    // 4. Codificar el texto para que las URLs lo entiendan (espacios, saltos de línea)
    const textoCodificado = encodeURIComponent(textoWhatsApp);

    // 5. Crear el enlace y redirigir
    const url = `https://wa.me/${telefono}?text=${textoCodificado}`;
    window.open(url, '_blank');
});


// --- 5. LÓGICA DE LA GALERÍA (ACORDEÓN, ANIMACIÓN Y SCROLL CONTROLADO) ---
const btnVerMas = document.getElementById('btn-ver-mas');
const wrapperExtra = document.getElementById('wrapper-extra');
const gallerySection = document.querySelector('.gallery-section');
const fotosPrincipales = document.querySelectorAll('.gallery-section > .gallery-grid > .gallery-item'); 
const fotosExtraItems = document.querySelectorAll('#wrapper-extra .gallery-item');

// A. VIGILANTE DE SCROLL (Aparición en cascada de fotos principales)
const observerOpciones = { threshold: 0.1 };
const fotoObserver = new IntersectionObserver((entradas, observador) => {
    entradas.forEach((entrada, index) => {
        if (entrada.isIntersecting) {
            setTimeout(() => {
                entrada.target.classList.add('mostrar-animado');
            }, index * 150);
            observador.unobserve(entrada.target);
        }
    });
}, observerOpciones);

if (fotosPrincipales.length > 0) {
    fotosPrincipales.forEach(foto => {
        foto.style.opacity = '0'; 
        fotoObserver.observe(foto);
    });
}

// B. FUNCIÓN DE SCROLL PERSONALIZADO (Control de velocidad)
function scrollSuave(elemento, duracion) {
    const objetivo = elemento.getBoundingClientRect().top + window.pageYOffset - 50; 
    const inicio = window.pageYOffset;
    const distancia = objetivo - inicio;
    let tiempoInicio = null;

    function animacion(tiempoActual) {
        if (tiempoInicio === null) tiempoInicio = tiempoActual;
        const tiempoTranscurrido = tiempoActual - tiempoInicio;
        
        let progreso = tiempoTranscurrido / duracion;
        let facilidad = progreso < 0.5 
            ? 4 * progreso * progreso * progreso 
            : 1 - Math.pow(-2 * progreso + 2, 3) / 2;

        window.scrollTo(0, inicio + (distancia * facilidad));
        
        if (tiempoTranscurrido < duracion) {
            requestAnimationFrame(animacion);
        }
    }
    requestAnimationFrame(animacion);
}

// C. BOTÓN "VER MÁS / VER MENOS" 
if (btnVerMas && wrapperExtra) {
    btnVerMas.addEventListener('click', function() {
        const estaAbierto = wrapperExtra.classList.contains('abierto');

        if (!estaAbierto) {
            // ABRIR
            wrapperExtra.classList.add('abierto');
            btnVerMas.innerText = 'Ver menos';

            fotosExtraItems.forEach((foto, index) => {
                foto.style.opacity = '0'; 
                foto.classList.remove('mostrar-animado');
                void foto.offsetWidth; 
                setTimeout(() => {
                    foto.classList.add('mostrar-animado');
                }, index * 300); 
            });

        } else {
            // CERRAR
            wrapperExtra.classList.remove('abierto');
            btnVerMas.innerText = 'Ver más fotos';
            
            // Aquí ajustas la velocidad: 1500 = 1.5 segundos. 
            // Si lo quieres aún más lento, ponle 2000.
            if (gallerySection) {
                scrollSuave(gallerySection, 1500); 
            }
        }
    });
}

// --- 6. LÓGICA DEL LIGHTBOX (ZOOM Y DESPLAZAMIENTO DEFINITIVO) ---
document.addEventListener('DOMContentLoaded', function() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');
    const galleryImages = document.querySelectorAll('.gallery-item img');

    if (lightbox && lightboxImg) {
        // Variables para el estado de la imagen
        let currentScale = 1; 
        let translateX = 0;
        let translateY = 0;
        
        // Variables para los cálculos de movimiento
        let isDragging = false;
        let startX, startY;
        let initialDistance = null;

        // Función maestra para aplicar los cambios visuales
        const updateTransform = () => {
            lightboxImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
        };

        // Función para limpiar todo al cerrar
        const resetZoom = () => {
            currentScale = 1;
            translateX = 0;
            translateY = 0;
            updateTransform();
            lightbox.style.display = 'none';
        };

        // 1. Abrir Lightbox
        galleryImages.forEach(img => {
            img.addEventListener('click', function() {
                lightbox.style.display = 'flex'; 
                lightboxImg.src = this.src;
                currentScale = 1; 
                translateX = 0;
                translateY = 0;
                updateTransform();
            });
        });

        // 2. Cerrar (Botón X y Fondo oscuro)
        if (lightboxClose) lightboxClose.addEventListener('click', resetZoom);
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) resetZoom();
        });

        // ==========================================
        //  LÓGICA DE RATÓN (PC)
        // ==========================================
        lightboxImg.addEventListener('wheel', (e) => {
            e.preventDefault();
            currentScale += e.deltaY * -0.002;
            currentScale = Math.min(Math.max(1, currentScale), 4);
            if (currentScale === 1) { translateX = 0; translateY = 0; }
            updateTransform();
        });

        lightboxImg.addEventListener('mousedown', (e) => {
            e.preventDefault(); // SOLUCIÓN AL CLIC PEGAJOSO (Evita arrastrar la imagen nativa)
            if (currentScale > 1) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                lightboxImg.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            if (lightboxImg) {
                lightboxImg.style.cursor = 'default';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging && currentScale > 1) {
                e.preventDefault();
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                updateTransform();
            }
        });

        // ==========================================
        //  LÓGICA TÁCTIL (MÓVIL)
        // ==========================================
        lightboxImg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1 && currentScale > 1) {
                // Un dedo: Inicia el arrastre
                isDragging = true;
                startX = e.touches[0].clientX - translateX;
                startY = e.touches[0].clientY - translateY;
            } else if (e.touches.length === 2) {
                // Dos dedos: Inicia el zoom
                isDragging = false;
                initialDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
            }
        });

        lightboxImg.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isDragging && currentScale > 1) {
                // Un dedo: Mueve la imagen
                e.preventDefault();
                translateX = e.touches[0].clientX - startX;
                translateY = e.touches[0].clientY - startY;
                updateTransform();
            } 
            else if (e.touches.length === 2) {
                // Dos dedos: Hace zoom
                e.preventDefault();
                const currentDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );

                if (initialDistance) {
                    const difference = currentDistance - initialDistance;
                    currentScale += difference * 0.005; 
                    currentScale = Math.min(Math.max(1, currentScale), 4);
                    
                    // Si regresan al tamaño original, centramos la foto automáticamente
                    if (currentScale === 1) {
                        translateX = 0;
                        translateY = 0;
                    }
                    
                    updateTransform();
                    initialDistance = currentDistance; 
                }
            }
        });

        lightboxImg.addEventListener('touchend', (e) => {
            isDragging = false;
            if (e.touches.length < 2) {
                initialDistance = null;
            }
        });
    }
});