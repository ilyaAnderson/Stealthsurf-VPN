import * as THREE from './vendor/three.module.min.js';

// A reflection card is visible to the metal and glass, but never to the page camera.
function reflectionMap(renderer) {
    const room = new THREE.Scene();
    room.background = new THREE.Color(0x687382);
    function card(color, strength, x, y, z, width, height) {
        const source = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
        source.color.multiplyScalar(strength);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), source);
        mesh.position.set(x, y, z);
        mesh.lookAt(0, 0, 0);
        room.add(mesh);
    }
    card(0xffffff, 3.8, -3, 5, 3, 6, 3);
    card(0xc8ddff, 2.6, 4, 1, -2, 1.4, 6);
    card(0xffffff, 1.8, 2, -1, 4, .65, 5);
    card(0x10141b, 1, -4, -2, -2, 5, 4);
    const generator = new THREE.PMREMGenerator(renderer);
    const target = generator.fromScene(room, .04, .1, 30);
    generator.dispose();
    room.children.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
    return target;
}

export function createStudio(canvas) {
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
    if (!context) return null;
    const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    const scene = new THREE.Scene();
    const reflections = reflectionMap(renderer);
    scene.environment = reflections.texture;
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 40);
    camera.position.z = 9;
    const key = new THREE.DirectionalLight(0xfff8ec, 2.55);
    key.position.set(-4, 7, 5);
    const rim = new THREE.DirectionalLight(0xc4d9ff, 1.6);
    rim.position.set(5, 3, -2);
    scene.add(key, rim, new THREE.HemisphereLight(0xf6f8ff, 0x606a7b, 1.1));
    let lastModel, lastWidth, lastHeight, lastDpr;
    function draw(model, progress, reduced, width, height, name, view) {
        if (!width || !height) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.65);
        if (model !== lastModel) {
            if (lastModel) scene.remove(lastModel.object);
            scene.add(model.object);
            lastModel = model;
        }
        if (width !== lastWidth || height !== lastHeight || dpr !== lastDpr) {
            lastWidth = width; lastHeight = height; lastDpr = dpr;
            renderer.setPixelRatio(dpr);
            renderer.setSize(width, height, false);
        }
        camera.aspect = width / height;
        const minWidth = { connector: 4.65, router: 4.95, phone: 2.9 }[name];
        const frame = Math.max(name === 'router' ? 4.65 : 5.3, minWidth / camera.aspect);
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(frame / 18));
        camera.updateProjectionMatrix();
        model.update(progress, reduced, view);
        renderer.render(scene, camera);
    }
    return {draw, dispose() { reflections.dispose(); renderer.dispose(); }};
}
