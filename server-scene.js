import * as T from "./vendor/three.module.min.js";
import { clientDevice, contactShadow, rackServer, router, studio } from "./server-hardware.js";

const lerp = T.MathUtils.lerp;
const smooth = T.MathUtils.smoothstep;

function track(scene, points, color, opacity) {
    const curve = new T.CatmullRomCurve3(points.map(values => new T.Vector3(...values)));
    const geometry = new T.BufferGeometry().setFromPoints(curve.getPoints(72));
    const line = new T.Line(geometry, new T.LineBasicMaterial({ color, transparent: true, opacity }));
    scene.add(line);
    return { curve, line };
}

function makeRoute(scene) {
    const root = new T.Group();
    scene.add(root);

    const home = router(root);
    home.position.set(2.14, -0.15, -0.13);
    home.rotation.y = -0.12;
    const phone = clientDevice(root);
    phone.position.set(3.65, -0.17, 1.03);
    phone.rotation.y = 0.14;

    const homeShadow = contactShadow(root, 2.65, 2.1);
    homeShadow.position.x = 2.09;
    homeShadow.position.z = -0.06;
    const phoneShadow = contactShadow(root, 1.15, 1.3);
    phoneShadow.position.x = 3.65;
    phoneShadow.position.z = 1.03;

    const internet = track(root, [
        [-1.89, 0.04, -0.86], [-1.10, 0.04, -1.33], [0.00, 0.04, -1.29],
        [0.78, 0.04, -0.85], [1.52, 0.04, -0.65], [1.88, 0.07, -0.68],
    ], 0x9fcaff, 0.66);
    const local = track(root, [
        [2.58, 0.04, 0.34], [2.83, 0.04, 0.75], [3.26, 0.04, 0.96], [3.57, 0.04, 1.06],
    ], 0x96badf, 0.56);

    const packetGeometry = new T.BoxGeometry(0.16, 0.065, 0.108);
    const packetMaterial = new T.MeshBasicMaterial({ color: 0x9dd2ff });
    const packets = Array.from({ length: 6 }, () => {
        const packet = new T.Mesh(packetGeometry, packetMaterial);
        root.add(packet);
        return packet;
    });
    const tangent = new T.Vector3();
    const forward = new T.Vector3(1, 0, 0);

    return {
        update(reveal, progress) {
            root.visible = reveal > 0.02;
            home.scale.setScalar(Math.max(0.01, reveal));
            phone.scale.setScalar(Math.max(0.01, reveal));
            homeShadow.visible = reveal > 0.65;
            phoneShadow.visible = reveal > 0.65;
            internet.line.geometry.setDrawRange(0, Math.ceil(reveal * 73));
            local.line.geometry.setDrawRange(0, Math.ceil(smooth(reveal, 0.45, 1) * 73));
            for (const [index, packet] of packets.entries()) {
                const t = progress * 1.66 - index * 0.16;
                packet.visible = t > 0 && t < 1.2 && reveal > 0.7;
                if (!packet.visible) continue;
                const isLocal = t > 0.90;
                const path = isLocal ? local.curve : internet.curve;
                const distance = isLocal ? (t - 0.90) / 0.30 : t / 0.90;
                path.getPointAt(distance, packet.position);
                path.getTangentAt(distance, tangent);
                packet.quaternion.setFromUnitVectors(forward, tangent);
            }
        },
    };
}

export function makeServerScene(viewport) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
    if (!context) throw new Error("WebGL 2 is unavailable");
    const renderer = new T.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.setClearAlpha(0);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new T.Scene();
    const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
    const server = rackServer(scene);
    const shadow = contactShadow(scene, 6.3, 4.6);
    const network = makeRoute(scene);
    const target = new T.Vector3();
    const marker = new T.Vector3();
    studio(scene);

    let aspect = 1.5;
    function size(width, height) {
        aspect = width / Math.max(1, height);
        renderer.setSize(width, height, false);
    }

    function render(progress, activePart) {
        const flight = smooth(progress, 0, 0.31);
        const opening = smooth(progress, 0.27, 0.49);
        const routing = smooth(progress, 0.63, 0.79);
        const amount = opening * (1 - routing);
        const azimuth = lerp(-0.64 + flight * Math.PI * 2 + amount * 0.2, Math.PI * 2 + 0.08, routing);
        const elevation = lerp(0.38 + amount * 0.22, 0.54, routing);
        camera.position.set(Math.sin(azimuth) * 9, Math.sin(elevation) * 12, Math.cos(azimuth) * 9);
        target.set(lerp(0, -0.04, routing), 0.10 + amount * 0.70, -amount * 0.48);
        camera.lookAt(target);

        const minWidth = 7.25 + amount * 1.45 + routing * 2.85;
        const frustumHeight = Math.max(3.5 + amount * 1.9 + routing * 0.32, minWidth / aspect);
        camera.top = frustumHeight / 2;
        camera.bottom = -camera.top;
        camera.right = camera.top * aspect;
        camera.left = -camera.right;
        camera.updateProjectionMatrix();

        server.explode(amount);
        server.root.position.set(-2.65 * routing, 0, 0.13 * routing);
        server.root.rotation.y = -routing * 0.84;
        server.root.scale.setScalar(1 - routing * 0.40);
        shadow.position.x = server.root.position.x;
        shadow.scale.setScalar(server.root.scale.x);
        network.update(routing, smooth(progress, 0.71, 1));
        renderer.render(scene, camera);

        if (activePart && amount > 0.6) {
            server.points[activePart].getWorldPosition(marker).project(camera);
            return { x: (marker.x + 1) / 2, y: (1 - marker.y) / 2 };
        }
        return null;
    }

    viewport.append(renderer.domElement);
    return { canvas: renderer.domElement, render, size, dispose: () => renderer.dispose() };
}
