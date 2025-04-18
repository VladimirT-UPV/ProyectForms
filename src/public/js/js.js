
let seconds = 0;

function empezarContador() {
    setInterval(() => {
        seconds++;
        const timerElement = document.getElementById("timer");
        timerElement.innerText = seconds;
    }, 1000);
}

// Ejecutar la función cuando se cargue la página
window.onload = empezarContador;

function modal(){
    document.getElementById('overlay').classList.toggle('active');
    document.getElementById('all').classList.toggle('dimmed');
}

function modal2(){
    document.getElementById('overlay2').classList.toggle('active');
}

// Carrusel deslizable con el mouse
document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.querySelector('.carousel');
    let isDown = false;
    let startX;
    let scrollLeft;

    carousel.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
    });

    carousel.addEventListener('mouseleave', () => {
        isDown = false;
    });

    carousel.addEventListener('mouseup', () => {
        isDown = false;
    });

    carousel.addEventListener('mousemove', (e) => {
        if(!isDown) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeft - walk;
    });
});