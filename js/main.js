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

// --- 4. RSVP: INVITACIÓN PERSONALIZADA + RESPALDO POR WHATSAPP ---

// URL del Web App de Google Apps Script (ver apps-script/README.md).
// Mientras esté vacía, el formulario funciona como antes (WhatsApp).
const RSVP_API = 'https://script.google.com/macros/s/AKfycbyuWclA_6VzfeZhTP9wMovWKiis_S0OumaE-PAV8MJJNRn63gDRkEFFscIRvdb6jSlcEA/exec';

// Número de los novios para el respaldo por WhatsApp (código de país incluido).
const TELEFONO_NOVIOS = '529999584946';

const rsvpForm = document.getElementById('rsvp-form');
const rsvpBanner = document.getElementById('rsvp-invitacion');
const rsvpBannerNombre = document.getElementById('rsvp-invitacion-nombre');
const rsvpBannerPases = document.getElementById('rsvp-invitacion-pases');
const rsvpStatus = document.getElementById('rsvp-status');
const rsvpWa = document.getElementById('rsvp-wa');
const rsvpHint = document.getElementById('rsvp-hint');
const grupoPersonas = document.getElementById('grupo-personas');
const grupoNombres = document.getElementById('grupo-nombres');
const selectPersonas = document.getElementById('personas');
const inputNombres = document.getElementById('nombres');
const inputNombre = document.getElementById('nombre');
const inputMensaje = document.getElementById('mensaje');
const btnRsvp = rsvpForm ? rsvpForm.querySelector('.btn-rsvp') : null;

let invitacionActual = null;
let enviandoRsvp = false;

function leerTokenInvitacion() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('inv') || '').trim().toUpperCase();
}

function mostrarEstado(mensaje, tipo) {
    if (!rsvpStatus) return;
    rsvpStatus.textContent = mensaje || '';
    rsvpStatus.className = 'rsvp-status' + (tipo ? ' ' + tipo : '');
    rsvpStatus.hidden = !mensaje;
}

function whatsappNovios(texto) {
    return 'https://wa.me/' + TELEFONO_NOVIOS + '?text=' + encodeURIComponent(texto);
}

function textoWhatsAppGenerico(nombre, asistencia, mensaje) {
    let texto = '¡Hola! Vengo a confirmar mi asistencia a la boda. 💍\n\n';
    texto += '*Nombre:* ' + nombre + '\n';
    texto += '*Asistencia:* ' + asistencia + '\n';
    if (mensaje !== '') {
        texto += '*Mensaje:* "' + mensaje + '"\n';
    }
    return texto;
}

// Apps Script no envía cabeceras CORS, así que la lectura se hace con JSONP.
function consultarInvitacion(token) {
    return new Promise(function (resolve, reject) {
        const callback = '__rsvp_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
        const script = document.createElement('script');
        const temporizador = setTimeout(function () {
            limpiar();
            reject(new Error('timeout'));
        }, 25000);

        function limpiar() {
            clearTimeout(temporizador);
            delete window[callback];
            if (script.parentNode) script.parentNode.removeChild(script);
        }

        window[callback] = function (datos) {
            limpiar();
            resolve(datos);
        };

        script.onerror = function () {
            limpiar();
            reject(new Error('red'));
        };

        script.src = RSVP_API
            + '?token=' + encodeURIComponent(token)
            + '&callback=' + encodeURIComponent(callback);
        document.body.appendChild(script);
    });
}

function aplicarInvitacion(datos) {
    invitacionActual = datos;

    rsvpBannerNombre.textContent = datos.familia;
    rsvpBannerPases.textContent = datos.pases === 1 ? '1 pase' : datos.pases + ' pases';
    rsvpBanner.hidden = false;

    inputNombre.value = datos.familia;
    inputNombre.readOnly = true;

    if (rsvpHint) {
        rsvpHint.textContent = datos.pases === 1
            ? 'Tu invitación es para 1 persona.'
            : 'Tu invitación es para hasta ' + datos.pases + ' personas.';
    }

    selectPersonas.innerHTML = '';
    for (let i = 1; i <= datos.pases; i++) {
        const opcion = document.createElement('option');
        opcion.value = i;
        opcion.textContent = i === 1 ? '1 persona' : i + ' personas';
        selectPersonas.appendChild(opcion);
    }

    grupoPersonas.hidden = true;
    grupoNombres.hidden = true;
    btnRsvp.textContent = datos.asistencia ? 'Actualizar respuesta' : 'Confirmar asistencia';

    // Si ya había confirmado, se muestra su respuesta para que pueda cambiarla.
    if (datos.asistencia === 'Sí' || datos.asistencia === 'No') {
        document.querySelectorAll('input[name="asistencia"]').forEach(function (radio) {
            const esSi = radio.value.indexOf('Sí') === 0;
            if ((datos.asistencia === 'Sí' && esSi) || (datos.asistencia === 'No' && !esSi)) {
                radio.checked = true;
            }
        });
        if (datos.asistencia === 'Sí') {
            selectPersonas.value = datos.personas || 1;
            grupoPersonas.hidden = false;
            grupoNombres.hidden = false;
        } else {
            grupoPersonas.hidden = true;
            grupoNombres.hidden = true;
        }
        inputNombres.value = datos.nombres || '';
        inputMensaje.value = datos.comentario || '';
        mostrarEstado('Ya tenemos tu respuesta. Puedes actualizarla si algo cambia.', '');
    } else {
        mostrarEstado('', '');
    }
}

function bloquearFormulario(mensaje) {
    mostrarEstado(mensaje, 'error');
    if (rsvpForm) {
        rsvpForm.querySelectorAll('input, select, textarea, button').forEach(function (el) {
            el.disabled = true;
        });
    }
    if (rsvpWa) {
        rsvpWa.href = whatsappNovios('¡Hola! Necesito ayuda con mi invitación a la boda.');
        rsvpWa.hidden = false;
    }
}

// Mostrar u ocultar el selector de personas según la respuesta.
document.querySelectorAll('input[name="asistencia"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
        if (!invitacionActual) return;
        const asiste = radio.value.indexOf('Sí') === 0;
        grupoPersonas.hidden = !asiste;
        grupoNombres.hidden = !asiste;
    });
});

if (rsvpForm) {
    rsvpForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (enviandoRsvp) return;

        const nombre = inputNombre.value.trim();
        const seleccion = document.querySelector('input[name="asistencia"]:checked');
        const mensaje = inputMensaje.value.trim();

        if (!seleccion) {
            mostrarEstado('Elige si podrás asistir.', 'error');
            return;
        }

        // Sin token: se mantiene el comportamiento original (WhatsApp).
        if (!invitacionActual) {
            window.open(whatsappNovios(textoWhatsAppGenerico(nombre, seleccion.value, mensaje)), '_blank');
            return;
        }

        const asiste = seleccion.value.indexOf('Sí') === 0;
        const personas = asiste ? parseInt(selectPersonas.value, 10) || 0 : 0;
        const nombres = inputNombres.value.trim();

        if (asiste && personas < 1) {
            mostrarEstado('Elige cuántas personas asistirán.', 'error');
            return;
        }

        enviandoRsvp = true;
        btnRsvp.disabled = true;
        const textoBoton = btnRsvp.textContent;
        btnRsvp.textContent = 'Enviando…';
        mostrarEstado('Guardando tu respuesta…', '');

        try {
            await fetch(RSVP_API, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    token: leerTokenInvitacion(),
                    asistencia: asiste ? 'si' : 'no',
                    personas: personas,
                    nombres: nombres,
                    comentario: mensaje
                })
            });

            // El POST no se puede leer por CORS; se verifica consultando de nuevo.
            let guardado = false;
            for (let intento = 0; intento < 3 && !guardado; intento++) {
                await new Promise(function (r) { setTimeout(r, 1200); });
                try {
                    const datos = await consultarInvitacion(leerTokenInvitacion());
                    if (datos && datos.ok
                        && datos.asistencia === (asiste ? 'Sí' : 'No')
                        && Number(datos.personas) === personas) {
                        guardado = true;
                    }
                } catch (err) {
                    // Se reintenta.
                }
            }

            if (guardado) {
                invitacionActual.asistencia = asiste ? 'Sí' : 'No';
                invitacionActual.personas = personas;
                btnRsvp.textContent = 'Actualizar respuesta';
                mostrarEstado(
                    asiste
                        ? '¡Gracias! Guardamos tu respuesta: ' + personas + (personas === 1 ? ' persona.' : ' personas.')
                        : 'Gracias por avisarnos. Los extrañaremos.',
                    'exito'
                );
            } else {
                btnRsvp.textContent = textoBoton;
                mostrarEstado('No pudimos confirmar tu respuesta. Revisa tu conexión e inténtalo otra vez.', 'error');
            }
        } catch (err) {
            btnRsvp.textContent = textoBoton;
            mostrarEstado('No pudimos confirmar tu respuesta. Revisa tu conexión e inténtalo otra vez.', 'error');
        } finally {
            enviandoRsvp = false;
            btnRsvp.disabled = false;
        }
    });
}

// Al cargar: si el enlace trae ?inv=TOKEN, se busca la invitación.
(function iniciarInvitacion() {
    const token = leerTokenInvitacion();
    if (!token) return;

    if (!RSVP_API) {
        mostrarEstado('La confirmación en línea todavía no está activa. Escríbenos por WhatsApp.', 'error');
        if (rsvpWa) {
            rsvpWa.href = whatsappNovios('¡Hola! Quiero confirmar mi asistencia a la boda.');
            rsvpWa.hidden = false;
        }
        return;
    }

    mostrarEstado('Cargando tu invitación…', '');

    consultarInvitacion(token).then(function (datos) {
        if (datos && datos.ok) {
            aplicarInvitacion(datos);
        } else {
            bloquearFormulario('No encontramos tu invitación. Revisa el enlace o escríbenos por WhatsApp.');
        }
    }).catch(function () {
        mostrarEstado('No pudimos cargar tu invitación. Revisa tu conexión e inténtalo de nuevo.', 'error');
    });
})();


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