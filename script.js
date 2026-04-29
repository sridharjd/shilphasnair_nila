// --- Three.js Moon Setup ---
const container = document.getElementById('moon-container');

// Scene, Camera, Renderer
const scene = new THREE.Scene();
// No background color, keep it transparent or black to match CSS
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Textures
const textureLoader = new THREE.TextureLoader();
// Using high-res public domain moon textures from three.js examples
const textureUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg';

// Moon Geometry & Material
const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textureLoader.load(textureUrl),
    bumpMap: textureLoader.load(textureUrl),
    bumpScale: 0.02,
    roughness: 0.8,
    metalness: 0.1
});

const moon = new THREE.Mesh(geometry, material);
scene.add(moon);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); // Very dark ambient
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 3, 5);
moon.add(directionalLight);

// Add a soft blue rim light for premium aesthetic
const rimLight = new THREE.DirectionalLight(0x4466ff, 0.5);
rimLight.position.set(-5, 0, -5);
moon.add(rimLight);

// --- Interaction & Animation ---
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = { x: 0, y: 0 };

// For smooth lerping
const damping = 0.05;

// Variables for the portrait relighting
const lightingOverlay = document.getElementById('lighting-overlay');
const portraitContainer = document.querySelector('.portrait-container');

// Mouse / Touch events for the Left Side (or window)
container.addEventListener('mousedown', onPointerDown);
container.addEventListener('touchstart', (e) => onPointerDown(e.touches[0]), { passive: false });

window.addEventListener('mousemove', onPointerMove);
window.addEventListener('touchmove', (e) => onPointerMove(e.touches[0]), { passive: false });

window.addEventListener('mouseup', onPointerUp);
window.addEventListener('touchend', onPointerUp);

function onPointerDown(event) {
    isDragging = true;
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
    container.style.cursor = 'grabbing';
}

function onPointerMove(event) {
    if (!isDragging) return;

    const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
    };

    targetRotation.y += deltaMove.x * 0.005;
    targetRotation.x += deltaMove.y * 0.005;

    // Limit X rotation so we don't flip the moon upside down completely
    targetRotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, targetRotation.x));

    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onPointerUp() {
    isDragging = false;
    container.style.cursor = 'grab';
}

// Window resize handling
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Smooth lerp rotation for the moon
    moon.rotation.y += (targetRotation.y - moon.rotation.y) * damping;
    moon.rotation.x += (targetRotation.x - moon.rotation.x) * damping;

    // --- Dynamic Portrait Relighting ---
    // We map the moon's rotation to a light position on the portrait

    // Math.sin maps the endless rotation to a -1 to 1 range, making it cycle smoothly
    const normalizedLightX = Math.sin(moon.rotation.y);
    const normalizedLightY = Math.sin(moon.rotation.x);

    // Map to 0% - 100% for CSS radial gradient position
    // We increase the amplitude slightly so the light can move past the edges
    const lightX = (normalizedLightX * 60) + 50;
    const lightY = (normalizedLightY * 40) + 50;

    // Calculate how much the front side is facing the camera
    // Math.cos(moon.rotation.y) is 1 when front is facing, -1 when back is facing
    const frontFacingRatio = Math.cos(moon.rotation.y);

    let centerColor;
    if (frontFacingRatio > 0) {
        // Front side visible: no added brightness, just transparent center
        centerColor = `rgba(0, 0, 0, 0)`;
    } else {
        // Back side visible: add a dark shadow
        const alpha = Math.abs(frontFacingRatio) * 0.8;
        centerColor = `rgba(0, 0, 0, ${alpha})`;
    }

    // Map to pixel translation for a subtle parallax effect on the portrait image itself
    const parallaxX = normalizedLightX * -10; // Move opposite to light
    const parallaxY = normalizedLightY * -10;

    // Update CSS
    // The gradient uses hard-light blend mode. White lightens, black darkens.
    lightingOverlay.style.background = `radial-gradient(circle at ${lightX}% ${lightY}%, ${centerColor} 0%, rgba(0, 0, 0, 0.95) 80%)`;

    // Apply slight parallax to portrait
    portraitContainer.style.transform = `scale(1.05) translate(${parallaxX}px, ${parallaxY}px)`;

    renderer.render(scene, camera);
}

// Optional: Add a slow continuous auto-rotation if user isn't interacting
setInterval(() => {
    if (!isDragging) {
        targetRotation.y += 0.005;
    }
}, 16); // ~60fps

// Start animation
animate();
