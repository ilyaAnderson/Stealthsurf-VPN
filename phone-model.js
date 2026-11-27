import * as THREE from './vendor/three.module.min.js';

const WIDTH = 464;
const HEIGHT = 960;
const INK = '#1b211e';
const BLUE = '#174df5';
const MUTE = '#59645d';
const PAPER = '#f6f7f0';
const SCREEN_SCALE = 1.5;

function roundedOutline(width, height, radius) {
    const shape = new THREE.Shape();
    const x = width / 2;
    const y = height / 2;
    shape.moveTo(-x + radius, -y);
    shape.lineTo(x - radius, -y);
    shape.absarc(x - radius, -y + radius, radius, -Math.PI / 2, 0, false);
    shape.lineTo(x, y - radius);
    shape.absarc(x - radius, y - radius, radius, 0, Math.PI / 2, false);
    shape.lineTo(-x + radius, y);
    shape.absarc(-x + radius, y - radius, radius, Math.PI / 2, Math.PI, false);
    shape.lineTo(-x, -y + radius);
    shape.absarc(-x + radius, -y + radius, radius, Math.PI, 1.5 * Math.PI, false);
    return shape;
}

function screenGeometry(width, height, radius) {
    const geometry = new THREE.ShapeGeometry(roundedOutline(width, height, radius), 12);
    const {position, uv} = geometry.attributes;
    for (let i = 0; i < position.count; i++) {
        uv.setXY(i, position.getX(i) / width + 0.5, position.getY(i) / height + 0.5);
    }
    return geometry;
}

function panel(ctx, x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
}

function label(ctx, content, x, y, size, weight, color = INK, mono = false) {
    ctx.fillStyle = color;
    ctx.font = weight + ' ' + size + 'px ' + (mono ? 'monospace' : 'Arial, sans-serif');
    ctx.fillText(content, x, y);
}

function line(ctx, points, stroke, weight) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = weight;
    ctx.stroke();
}

function circle(ctx, x, y, radius, fill) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
}

// Draw the map once. The canals and streets stay sharp as the animated route changes.
function makeCanalMap() {
    const canvas = document.createElement('canvas');
    const w = 412;
    const h = 306;
    canvas.width = w * SCREEN_SCALE;
    canvas.height = h * SCREEN_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCREEN_SCALE, SCREEN_SCALE);
    ctx.fillStyle = '#dce3db';
    ctx.fillRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Nested canal belt with independently spaced cross streets between the rings.
    const center = [319, -55];
    const angles = Array.from({length: 15}, (_, i) => 0.18 + i * 0.244);
    const point = (r, a) => [
        center[0] + r * Math.cos(a) * (1.05 + 0.035 * Math.cos(a * 3)),
        center[1] + r * Math.sin(a)
    ];
    const radii = [42, 64, 82, 105, 127, 154, 181, 207, 238, 261, 289, 321, 355, 392, 429, 470];
    radii.forEach((r, ring) => {
        const points = angles.map(a => point(r, a));
        if (ring % 3 === 1) {
            line(ctx, points, '#eef2e8', 9);
            line(ctx, points, '#a7c7d4', 4.7);
        } else {
            line(ctx, points, '#f7f7ee', ring % 2 ? 3.2 : 5);
        }
        if (!ring) return;
        const inner = radii[ring - 1];
        const count = Math.ceil(r / 11);
        for (let k = 0; k < count; k++) {
            const a = 0.2 + k * 3.48 / count + (ring % 2) * 0.026;
            line(ctx, [point(inner + 2, a), point(r - 2, a + 0.011)], '#f5f5ec', 2);
        }
    });
    [0.98, 1.58, 2.17, 2.68, 3.08].forEach(a => {
        line(ctx, radii.map(r => point(r, a + Math.sin(r * 0.018) * 0.035)), '#fbfbf4', 5);
    });

    ctx.beginPath();
    ctx.moveTo(-10, 87);
    ctx.bezierCurveTo(63, 116, 95, 46, 155, 37);
    ctx.bezierCurveTo(222, 29, 250, -3, 312, -18);
    ctx.lineWidth = 19;
    ctx.strokeStyle = '#a7c7d4';
    ctx.stroke();
    label(ctx, 'JORDAAN', 41, 183, 9.5, 600, '#76857c', true);
    label(ctx, 'CENTRUM', 251, 119, 9.5, 600, '#76857c', true);
    return canvas;
}

const routePoints = [[38, 255], [68, 242], [93, 220], [113, 207], [132, 215],
    [163, 197], [173, 176], [191, 157], [207, 166], [226, 154], [239, 133], [266, 121]];

function drawRoute(ctx, amount) {
    line(ctx, routePoints, 'rgba(24,62,132,.18)', 3.5);
    if (amount <= 0) return;
    const cursor = amount * (routePoints.length - 1);
    const end = Math.min(routePoints.length - 2, Math.floor(cursor));
    const a = routePoints[end];
    const b = routePoints[end + 1];
    const tip = [a[0] + (b[0] - a[0]) * (cursor - end), a[1] + (b[1] - a[1]) * (cursor - end)];
    line(ctx, [...routePoints.slice(0, end + 1), tip], BLUE, 4);
    circle(ctx, tip[0], tip[1], 6, '#fff');
    circle(ctx, tip[0], tip[1], 3.8, BLUE);
}

function makeDisplay() {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH * SCREEN_SCALE;
    canvas.height = HEIGHT * SCREEN_SCALE;
    const ctx = canvas.getContext('2d', {alpha: false});
    ctx.scale(SCREEN_SCALE, SCREEN_SCALE);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    const map = makeCanalMap();
    let lastFrame = -1;

    function paint(progress, reduced) {
        const stage = progress < 0.33 ? 0 : progress < 0.66 ? 1 : 2;
        const fraction = Math.max(0, Math.min(1, (progress - 0.33) / 0.33));
        const steps = 22;
        const step = reduced && stage === 1 ? 11 : Math.round(fraction * steps);
        const key = stage * (steps + 1) + step;
        if (key === lastFrame) return;
        lastFrame = key;
        const amount = step / steps;

        ctx.fillStyle = PAPER;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        label(ctx, '9:41', 35, 44, 21, 700);
        for (let i = 0; i < 4; i++) {
            panel(ctx, 349 + i * 6.4, 41 - (6 + i * 3.2), 4.8, 6 + i * 3.2, 1.7, INK);
        }
        panel(ctx, 389, 27, 35, 15, 4, '#a4ada5');
        panel(ctx, 391, 29, 31, 11, 3, PAPER);
        panel(ctx, 393, 31, 24, 7, 2, INK);
        panel(ctx, 425, 31, 2.5, 7, 1, '#a4ada5');

        // The three slanted traces form a compact Surf mark alongside the wordmark.
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(27, 87, 43, 43, 11);
        ctx.fillStyle = INK;
        ctx.fill();
        ctx.clip();
        for (let i = 0; i < 3; i++) {
            line(ctx, [[28 + 9 * i, 119], [40 + 9 * i, 98], [46 + 9 * i, 98]], PAPER, 3.4);
        }
        ctx.restore();
        label(ctx, 'StealthSurf', 80, 120, 35, 700);
        line(ctx, [[27, 161], [437, 161]], '#c9d0c7', 1.2);

        label(ctx, 'Профиль', 27, 210, 23, 500, MUTE);
        label(ctx, 'Амстердам', 24, 279, 64, 700);
        label(ctx, 'Нидерланды', 28, 320, 24, 400, MUTE);

        ctx.save();
        ctx.translate(26, 350);
        ctx.beginPath();
        ctx.roundRect(0, 0, 412, 306, 12);
        ctx.clip();
        ctx.drawImage(map, 0, 0, 412, 306);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        drawRoute(ctx, amount);
        const [px, py] = routePoints[routePoints.length - 1];
        circle(ctx, px, py, 22, stage === 2 ? 'rgba(23,77,245,.14)' : 'rgba(38,51,43,.08)');
        circle(ctx, px, py, 10.5, '#fff');
        circle(ctx, px, py, 6.7, stage === 2 ? BLUE : INK);
        panel(ctx, 19, 17, 85, 34, 17, PAPER);
        label(ctx, 'NL / AMS', 29, 39, 13.5, 700, INK, true);
        ctx.restore();

        panel(ctx, 26, 674, 412, 114, 20, INK);
        label(ctx, 'VPN', 46, 710, 18, 600, '#c6d0c5', true);
        const state = ['Выключен', 'Подключение', 'Подключён'][stage];
        label(ctx, state, 45, 754, 35, 600, '#fff');
        panel(ctx, 333, 708, 82, 45, 23, stage === 2 ? '#496aff' : '#59625b');
        circle(ctx, 355 + 38 * amount, 730.5, 16, '#fff');

        label(ctx, 'Протокол', 28, 840, 22, 400, MUTE);
        ctx.textAlign = 'right';
        label(ctx, 'WireGuard', 436, 840, 23, 600);
        ctx.textAlign = 'left';
        line(ctx, [[27, 858], [437, 858]], '#c9d0c7', 1.2);
        label(ctx, 'Сервер', 28, 898, 22, 400, MUTE);
        ctx.textAlign = 'right';
        label(ctx, 'AMS-01', 436, 898, 21, 600, INK, true);
        ctx.textAlign = 'left';
        panel(ctx, 164, 935, 136, 6.3, 3.2, INK);
        texture.needsUpdate = true;
    }
    return {texture, paint};
}

export function createPhone() {
    const object = new THREE.Group();
    object.name = 'StealthSurf phone';
    const metal = (color, metalness, roughness) => new THREE.MeshStandardMaterial({color, metalness, roughness});
    const titanium = metal(0x9ca6ad, 0.79, 0.29);
    const chamfer = metal(0xd9e1e4, 0.74, 0.19);
    const graphite = metal(0x525b60, 0.54, 0.36);
    const antenna = metal(0x585f64, 0.18, 0.5);
    const glass = metal(0x0d1114, 0.26, 0.18);
    const black = new THREE.MeshBasicMaterial({color: 0x101419});
    const optical = metal(0x202c44, 0.46, 0.13);
    const display = makeDisplay();

    function part(geometry, material, x, y, z) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        object.add(mesh);
        return mesh;
    }

    // Extrusions are bevelled on both sides. A separate narrow chamfer catches the key light.
    function housing(width, height, radius, depth, bevel, material, x, y, backZ) {
        const geometry = new THREE.ExtrudeGeometry(roundedOutline(width, height, radius), {
            depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 9
        });
        return part(geometry, material, x, y, backZ);
    }
    function disk(r, thickness, material, x, y, z) {
        const mesh = part(new THREE.CylinderGeometry(r, r, thickness, 28), material, x, y, z);
        mesh.rotation.x = Math.PI / 2;
        return mesh;
    }
    housing(2.15, 4.45, 0.275, 0.192, 0.030, titanium, 0, 0, -0.096);
    housing(2.13, 4.43, 0.267, 0.022, 0.023, chamfer, 0, 0, 0.089);
    housing(2.105, 4.407, 0.261, 0.012, 0.015, glass, 0, 0, 0.12);
    housing(2.11, 4.41, 0.258, 0.009, 0.013, graphite, 0, 0, -0.122);
    const screenMat = new THREE.MeshBasicMaterial({map: display.texture, toneMapped: false});
    part(screenGeometry(2.037, 4.224, 0.218), screenMat, 0, 0, 0.149);
    // Physical speaker slit, camera housing and lens overlay the active display area.
    housing(0.33, 0.017, 0.008, 0.001, 0.0016, black, 0, 2.174, 0.147);
    housing(0.402, 0.080, 0.039, 0.002, 0.002, black, 0, 1.965, 0.151);
    disk(0.024, 0.004, optical, 0.144, 1.965, 0.155);
    disk(0.009, 0.002, metal(0x42546d, 0.4, 0.22), 0.143, 1.965, 0.158);

    // Low-profile volume and sleep keys sit in the flat portion of the machined edge.
    function sideKey(side, y, height) {
        const mesh = housing(0.073, height, 0.03, 0.035, 0.009, chamfer, side * 1.096, y, -0.01);
        mesh.rotation.y = side * Math.PI / 2;
    }
    sideKey(-1, 0.97, 0.20);
    sideKey(-1, 0.51, 0.39);
    sideKey(-1, 0.02, 0.39);
    sideKey(1, 0.44, 0.58);
    for (const sign of [-1, 1]) {
        for (const y of [-1.56, 1.59]) {
            part(new THREE.BoxGeometry(0.008, 0.026, 0.18), antenna, sign * 1.106, y, 0);
        }
    }
    const chargingPort = housing(0.31, 0.068, 0.032, 0.001, 0.001, black, 0, -2.257, 0);
    chargingPort.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
            const speakerHole = disk(0.0175, 0.004, black, side * (0.32 + i * 0.067), -2.257, 0);
            speakerHole.rotation.x = 0;
        }
    }

    housing(0.64, 0.88, 0.14, 0.047, 0.028, graphite, -0.59, 1.51, -0.197);
    for (const [x, y] of [[-0.70, 1.71], [-0.48, 1.32]]) {
        disk(0.144, 0.077, titanium, x, y, -0.22);
        disk(0.118, 0.021, glass, x, y, -0.26);
        disk(0.080, 0.011, optical, x, y, -0.275);
    }
    disk(0.052, 0.011, metal(0xe4ddbb, 0.12, 0.29), -0.43, 1.72, -0.228);

    function update(value, reduced = false) {
        const p = THREE.MathUtils.clamp(value, 0, 1);
        // The screen turns towards the reader as the control reaches its connected position.
        const pose = reduced ? 0.78 : p * p * (3 - 2 * p);
        object.rotation.set(-0.09 + 0.12 * pose, -0.44 + 0.55 * pose, -0.09 + 0.15 * pose);
        display.paint(p, reduced);
    }
    update(0);
    return {object, update};
}
