import * as THREE from './vendor/three.module.min.js';

const halfTurn = Math.PI;
const quarterTurn = Math.PI / 2;

function finish(color, roughness, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// Rounded horizontal tooling profiles keep the moulded edges smooth at macro scale.
function housing(width, height, depth, radius, bevel) {
    const inset = Math.min(bevel, height * 0.45, radius * 0.6);
    const layers = [
        [-height / 2, inset],
        [-height / 2 + inset * 0.3, inset * 0.3],
        [-height / 2 + inset, 0],
        [height / 2 - inset, 0],
        [height / 2 - inset * 0.3, inset * 0.3],
        [height / 2, inset]
    ];
    const positions = [];
    const indices = [];
    const samples = 7;

    for (const [y, offset] of layers) {
        const r = radius - offset;
        for (let corner = 0; corner < 4; corner++) {
            const cx = corner === 0 || corner === 3 ? 1 : -1;
            const cz = corner < 2 ? 1 : -1;
            for (let step = 0; step <= samples; step++) {
                const a = (corner + step / samples) * quarterTurn;
                positions.push(cx * (width / 2 - radius) + Math.cos(a) * r,
                    y, cz * (depth / 2 - radius) + Math.sin(a) * r);
            }
        }
    }

    const count = (samples + 1) * 4;
    for (let layer = 0; layer < layers.length - 1; layer++) {
        for (let j = 0; j < count; j++) {
            const i = layer * count + j;
            const next = layer * count + (j + 1) % count;
            indices.push(i, i + count, next, next, i + count, next + count);
        }
    }
    const last = count * (layers.length - 1);
    for (let j = 1; j < count - 1; j++) {
        indices.push(0, j, j + 1, last, last + j + 1, last + j);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

// One mesh per finish per moving assembly. Tiny contacts and vents share draw calls.
function assembly(parent) {
    const buckets = new Map();
    function part(geometry, material, position, rotation = [0, 0, 0]) {
        const matrix = new THREE.Matrix4().compose(
            new THREE.Vector3(...position),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
            new THREE.Vector3(1, 1, 1)
        );
        geometry.applyMatrix4(matrix);
        if (!buckets.has(material)) buckets.set(material, []);
        buckets.get(material).push(geometry);
    }
    function box(size, material, position, rotation) {
        part(new THREE.BoxGeometry(...size), material, position, rotation);
    }
    function round(size, radius, bevel, material, position, rotation) {
        part(housing(...size, radius, bevel), material, position, rotation);
    }
    function cylinder(radius, length, material, position, rotation) {
        part(new THREE.CylinderGeometry(radius, radius, length, 24), material, position, rotation);
    }
    function build() {
        for (const [material, geometries] of buckets) {
            const pos = [], norm = [], idx = [];
            for (const geom of geometries) {
                const vertex = pos.length / 3;
                pos.push(...geom.attributes.position.array);
                norm.push(...geom.attributes.normal.array);
                if (geom.index) {
                    for (const local of geom.index.array) idx.push(local + vertex);
                } else {
                    for (let n = 0; n < geom.attributes.position.count; n++) idx.push(n + vertex);
                }
                geom.dispose();
            }
            const joined = new THREE.BufferGeometry();
            joined.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            joined.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
            joined.setIndex(idx);
            parent.add(new THREE.Mesh(joined, material));
        }
    }
    return { part, box, round, cylinder, build };
}

function roundedPath(path, x, y, w, h, r) {
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y);
    path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + h - r);
    path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x + r, y + h);
    path.quadraticCurveTo(x, y + h, x, y + h - r);
    path.lineTo(x, y + r);
    path.quadraticCurveTo(x, y, x + r, y);
    return path;
}

function jackOpening(path, x, y) {
    const corners = [
        [-0.214, 0.098], [0.214, 0.098], [0.214, -0.084], [0.122, -0.084],
        [0.122, -0.135], [0.065, -0.135], [0.065, -0.158], [-0.065, -0.158],
        [-0.065, -0.135], [-0.122, -0.135], [-0.122, -0.084], [-0.214, -0.084]
    ];
    corners.forEach(([px, py], i) => path[i === 0 ? 'moveTo' : 'lineTo'](x + px, y + py));
    path.closePath();
    return path;
}

function printedLabel(group, worldWidth, worldHeight, position, rotation, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.round(canvas.width * worldHeight / worldWidth);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    draw(ctx, canvas.width, canvas.height);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({
        map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
        toneMapped: false
    });
    const imprint = new THREE.Mesh(new THREE.PlaneGeometry(worldWidth, worldHeight), material);
    imprint.position.set(...position);
    imprint.rotation.set(...rotation);
    group.add(imprint);
}

function antenna(side, materials) {
    const hinge = new THREE.Group();
    const a = assembly(hinge);
    const { ivory, darkRubber, metal, blue } = materials;

    a.cylinder(0.126, 0.25, metal, [0, 0, 0], [0, 0, quarterTurn]);
    a.cylinder(0.094, 0.26, darkRubber, [0, 0, 0], [0, 0, quarterTurn]);
    // The soft blade is modelled in its horizontal mould and rotated onto its hinge.
    a.round([1.66, 0.112, 0.248], 0.112, 0.035, ivory, [0, 0.83, 0], [0, quarterTurn, quarterTurn]);
    a.round([0.38, 0.118, 0.255], 0.082, 0.025, ivory, [0, 0.135, 0], [0, quarterTurn, quarterTurn]);
    a.round([0.225, 0.007, 0.052], 0.023, 0.002, blue, [0, 1.415, 0.06], [0, quarterTurn, quarterTurn]);
    a.cylinder(0.046, 0.003, metal, [0.132 * side, 0, 0], [0, 0, quarterTurn]);
    a.build();
    return hinge;
}

export function createRouter() {
    const object = new THREE.Group();
    object.name = 'StealthSurf · домашний маршрутизатор';
    const pivot = new THREE.Group();
    object.add(pivot);
    const materials = {
        ivory: finish(0xe4ddca, 0.43),
        darkRubber: finish(0x252a30, 0.69),
        metal: finish(0xb9c4c6, 0.34, 0.58),
        blue: finish(0x244ed4, 0.39, 0.10)
    };
    const { ivory, darkRubber, metal, blue } = materials;
    const grille = finish(0x464941, 0.75);
    const portBlack = finish(0x141b20, 0.71);
    const brass = finish(0xd3a854, 0.30, 0.50);
    const led = new THREE.MeshStandardMaterial({
        color: 0xb5e7b3, emissive: 0x7cc381, emissiveIntensity: 0.52, roughness: 0.35
    });
    const a = assembly(pivot);
    a.round([3.62, 0.18, 1.91], 0.27, 0.055, ivory, [0, -0.27, 0]);
    a.round([3.66, 0.37, 1.77], 0.23, 0.032, darkRubber, [0, -0.016, -0.065]);
    a.round([3.76, 0.066, 1.98], 0.28, 0.018, metal, [0, 0.182, 0]);
    a.round([3.78, 0.23, 2.00], 0.29, 0.059, ivory, [0, 0.324, 0]);

    for (const x of [-1.43, 1.43]) {
        for (const z of [-0.64, 0.64]) {
            a.round([0.43, 0.105, 0.29], 0.13, 0.034, darkRubber, [x, -0.397, z]);
        }
    }

    // Deep sockets sit behind the punched metal face; the stepped notch accepts an RJ45 latch.
    const centers = [-0.21, 0.43, 1.07];
    const face = roundedPath(new THREE.Shape(), -1.65, -0.206, 3.3, 0.356, 0.065);
    for (const x of centers) face.holes.push(jackOpening(new THREE.Path(), x, -0.012));
    const barrel = new THREE.Path();
    barrel.absarc(-1.22, -0.025, 0.105, 0, 2 * halfTurn, true);
    face.holes.push(barrel);
    a.part(new THREE.ExtrudeGeometry(face, { depth: 0.029, bevelEnabled: false, curveSegments: 10 }),
        darkRubber, [0, 0, 0.929]);
    a.cylinder(0.092, 0.07, portBlack, [-1.22, -0.025, 0.882], [quarterTurn, 0, 0]);
    a.part(new THREE.TorusGeometry(0.078, 0.013, 8, 24), metal, [-1.22, -0.025, 0.926]);
    a.cylinder(0.018, 0.038, brass, [-1.22, -0.025, 0.917], [quarterTurn, 0, 0]);
    a.cylinder(0.027, 0.009, portBlack, [-0.86, -0.025, 0.961], [quarterTurn, 0, 0]);

    for (let i = 0; i < centers.length; i++) {
        const x = centers[i];
        const collar = i === 0 ? blue : metal;
        const frame = roundedPath(new THREE.Shape(), -0.257, -0.177, 0.514, 0.307, 0.021);
        frame.holes.push(jackOpening(new THREE.Path(), 0, 0));
        a.part(new THREE.ExtrudeGeometry(frame, { depth: 0.012, bevelEnabled: false, curveSegments: 4 }),
            collar, [x, -0.012, 0.959]);
        a.box([0.43, 0.265, 0.008], portBlack, [x, -0.039, 0.846]);
        for (let pin = 0; pin < 8; pin++) {
            a.box([0.014, 0.013, 0.096], brass,
                [x + (pin - 3.5) * 0.041, 0.032, 0.902], [-0.32, 0, 0]);
        }
    }

    for (const x of [-1.53, 1.52]) {
        a.cylinder(0.041, 0.012, metal, [x, -0.117, 0.963], [quarterTurn, 0, 0]);
        a.box([0.047, 0.009, 0.003], portBlack, [x, -0.117, 0.971], [0, 0, -0.51]);
    }

    // Slotted matte grille and three flush light pipes share the upper shell.
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 15; col++) {
            a.round([0.032, 0.005, 0.36], 0.015, 0.0015, grille,
                [0.415 + col * 0.082, 0.44, -0.51 + row * 0.48]);
        }
    }
    a.round([0.52, 0.008, 0.101], 0.049, 0.003, darkRubber, [-1.20, 0.441, 0.63]);
    for (const [i, x] of [-1.365, -1.20, -1.035].entries()) {
        a.round([0.091, 0.006, 0.032], 0.015, 0.002, i < 2 ? led : grille, [x, 0.447, 0.63]);
    }

    for (const x of [-1.35, 1.35]) {
        a.round([0.41, 0.128, 0.32], 0.098, 0.025, ivory, [x, 0.489, -0.75]);
        a.cylinder(0.117, 0.322, darkRubber, [x, 0.562, -0.75], [0, 0, quarterTurn]);
    }
    a.build();

    printedLabel(pivot, 1.47, 0.52, [-0.80, 0.442, -0.13], [-quarterTurn, 0, 0], (ctx) => {
        ctx.fillStyle = '#28312f';
        ctx.font = 'bold 128px Arial, sans-serif';
        ctx.fillText('StealthSurf', 8, 166);
        ctx.font = '500 57px monospace';
        ctx.fillText('HOME ROUTER', 14, 270);
        ctx.fillStyle = '#214ee8';
        ctx.fillRect(838, 77, 24, 90);
        ctx.fillRect(873, 50, 24, 117);
        ctx.fillRect(908, 24, 24, 143);
    });

    printedLabel(pivot, 3.19, 0.11, [0, 0.319, 1.004], [0, 0, 0], (ctx, w, h) => {
        ctx.fillStyle = '#343b39';
        ctx.font = 'bold 23px monospace';
        ctx.textAlign = 'center';
        ['DC', 'RST', 'WAN', 'LAN 1', 'LAN 2'].forEach((label, i) => {
            const x = [-1.22, -0.86, ...centers][i];
            ctx.fillText(label, (x / 3.19 + 0.5) * w, h * 0.77);
        });
    });

    const left = antenna(-1, materials);
    const right = antenna(1, materials);
    left.position.set(-1.35, 0.562, -0.75);
    right.position.set(1.35, 0.562, -0.75);
    pivot.add(left, right);
    pivot.position.y = -0.65;

    function update(progress, reduced = false, view) {
        const p = reduced ? 0.5 : THREE.MathUtils.clamp(progress, 0, 1);
        const t = p * p * (3 - 2 * p);
        pivot.rotation.set(0.35 + t * 0.105, -0.52 + t * 0.29, -0.047 + t * 0.027);
        if (view === 1) pivot.rotation.set(0.23, -0.13, -0.014);
        left.rotation.set(-0.15 - t * 0.06, 0, 0.27 - t * 0.055);
        right.rotation.set(-0.24 + t * 0.07, 0, -0.14 - t * 0.08);
    }
    update(0);
    return { object, update };
}
