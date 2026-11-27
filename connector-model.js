import * as THREE from './vendor/three.module.min.js';

const vector = (x, y, z) => new THREE.Vector3(x, y, z);

function roundedPlate(width, height, depth, corner, edge = 0.012) {
    const x = width / 2;
    const y = height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-x + corner, -y);
    shape.lineTo(x - corner, -y);
    shape.quadraticCurveTo(x, -y, x, -y + corner);
    shape.lineTo(x, y - corner);
    shape.quadraticCurveTo(x, y, x - corner, y);
    shape.lineTo(-x + corner, y);
    shape.quadraticCurveTo(-x, y, -x, y - corner);
    shape.lineTo(-x, -y + corner);
    shape.quadraticCurveTo(-x, -y, -x + corner, -y);
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: depth - 2 * edge, bevelEnabled: true,
        bevelSize: edge, bevelThickness: edge, bevelSegments: 3, curveSegments: 5
    });
    geometry.translate(0, 0, -depth / 2 + edge);
    return geometry;
}

// Cross sections run along the plug, rounding from a moulded rectangle into a cable.
function sleeveGeometry(sections, exponent = 4) {
    const positions = [];
    const indices = [];
    const sides = 48;
    for (const [y, halfWidth, halfDepth] of sections) {
        for (let j = 0; j < sides; j++) {
            const angle = j * Math.PI * 2 / sides;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            positions.push(
                Math.sign(c) * Math.pow(Math.abs(c), 2 / exponent) * halfWidth,
                y,
                Math.sign(s) * Math.pow(Math.abs(s), 2 / exponent) * halfDepth
            );
        }
    }
    for (let r = 0; r < sections.length - 1; r++) {
        for (let j = 0; j < sides; j++) {
            const a = r * sides + j;
            const b = r * sides + (j + 1) % sides;
            indices.push(a, a + sides, b, b, a + sides, b + sides);
        }
    }
    // Caps have their own vertices so the lip doesn't share the end face normals.
    for (const r of [0, sections.length - 1]) {
        const first = positions.length / 3;
        for (let j = 0; j < sides; j++) {
            const i = (r * sides + j) * 3;
            positions.push(positions[i], positions[i + 1], positions[i + 2]);
        }
        for (let j = 1; j < sides - 1; j++) {
            if (r === 0) indices.push(first, first + j, first + j + 1);
            else indices.push(first, first + j + 1, first + j);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function screenPrint() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 256;
    const ink = canvas.getContext('2d');
    ink.fillStyle = '#26323c';
    for (let i = 0; i < 3; i++) {
        ink.beginPath();
        ink.moveTo(20 + i * 22, 38);
        ink.lineTo(32 + i * 22, 38);
        ink.lineTo(18 + i * 22, 65);
        ink.lineTo(6 + i * 22, 65);
        ink.closePath();
        ink.fill();
    }
    ink.font = 'bold 53px Arial, sans-serif';
    ink.fillText('STEALTHSURF', 94, 70);
    ink.fillRect(8, 92, 591, 3);
    ink.font = 'bold 36px monospace';
    ink.fillText('CAT 6A', 8, 147);
    ink.font = '29px monospace';
    ink.fillText('8P8C', 478, 147);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return new THREE.MeshBasicMaterial({
        map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1
    });
}

export function createConnector() {
    const object = new THREE.Group();
    object.name = 'Shielded 8P8C connector';
    const plug = new THREE.Group();
    object.add(plug);
    const solid = (color, roughness, metalness = 0) =>
        new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const alloy = solid(0xa6afba, 0.29, 0.62);
    const edge = solid(0xe0e9f1, 0.21, 0.73);
    const seam = solid(0x273342, 0.42, 0.35);
    const insulation = solid(0x233d51, 0.42, 0.1);
    const gold = solid(0xffc15d, 0.22, 0.69);
    const contactFace = solid(0xffdd94, 0.23, 0.49);
    const boot = solid(0x2353e0, 0.40, 0.07);
    const recess = solid(0x173da7, 0.52, 0.03);
    const cable = solid(0x315be1, 0.44, 0.04);
    const clear = new THREE.MeshPhysicalMaterial({
        color: 0xc3e6ee, metalness: 0.03, roughness: 0.23, clearcoat: 0.75,
        transparent: true, opacity: 0.34, depthWrite: false
    });
    const acrylicEdge = solid(0xbad7dd, 0.25, 0.19);
    const add = (geometry, material, x = 0, y = 0, z = 0) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        plug.add(mesh);
        return mesh;
    };
    const plate = (w, h, d, r, material, x, y, z, bevel) =>
        add(roundedPlate(w, h, d, r, bevel), material, x, y, z);
    const tube = (points, radius, material, steps = 20, sides = 10) =>
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => vector(...p))), steps, radius, sides), material);

    // Rubber boot with raised shoulders, a recessed mould line and separate strain-relief ribs.
    add(sleeveGeometry([
        [-1.82, .201, .199], [-1.78, .203, .204], [-1.41, .254, .247],
        [-1.11, .33, .29], [-.88, .43, .32], [-.70, .52, .356]
    ]), recess);
    for (let i = 0; i < 5; i++) {
        const y = -1.79 + i * .193;
        const w = .225 + .045 * i;
        const d = .221 + .025 * i;
        add(sleeveGeometry([
            [y, w - .017, d - .015], [y + .022, w, d],
            [y + .116, w + .024, d + .01], [y + .145, w + .003, d - .012]
        ]), boot);
    }
    add(sleeveGeometry([
        [-.895, .414, .313], [-.875, .441, .337], [-.69, .551, .375],
        [-.52, .666, .398], [-.45, .685, .409], [-.16, .69, .41],
        [-.12, .684, .405], [-.10, .665, .389]
    ], 5.2), boot);
    add(sleeveGeometry([[-.182, .693, .412], [-.166, .693, .412]], 5.2), recess);

    // The braided wire ends are visible inside the clear plug.
    plate(1.24, 1.22, .61, .075, insulation, 0, .35, -.026);
    const wireColors = [0xf8dcc2, 0xdf772e, 0xc5ded1, 0x5279ac, 0xc1cfdf, 0x528961, 0xd5c4ba, 0x8c6750];
    const contactXs = wireColors.map((_, i) => (i - 3.5) * .142);
    contactXs.forEach((x, i) => {
        tube([[x * .88, .57, .025], [x, .88, .037], [x, 1.16, .065], [x, 1.49, .113]],
            .049, solid(wireColors[i], .45), 10, 7);
    });
    const housing = plate(1.33, 1.16, .706, .052, clear, 0, 1.28, 0, .033);
    housing.renderOrder = 1;
    // Clear guide rails catch hard light at the margins, while individual contact slots stay open.
    for (const sign of [-1, 1]) {
        plate(.063, 1.08, .104, .022, acrylicEdge, sign * .637, 1.29, .300);
        plate(.08, .91, .095, .022, acrylicEdge, sign * .627, 1.31, -.31);
    }
    plate(1.28, .065, .087, .016, acrylicEdge, 0, 1.832, -.275);
    const slot = roundedPlate(.111, .568, .037, .025, .007);
    const blade = roundedPlate(.077, .483, .049, .021, .009);
    const lip = roundedPlate(.074, .059, .091, .009, .008);
    const slots = new THREE.InstancedMesh(slot, insulation, 8);
    const blades = new THREE.InstancedMesh(blade, gold, 8);
    const tips = new THREE.InstancedMesh(lip, contactFace, 8);
    for (const [i, x] of contactXs.entries()) {
        slots.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 1.542, .353));
        blades.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 1.581, .382));
        tips.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 1.826, .366));
    }
    plug.add(slots, blades, tips);

    // Stamped and folded metal shell with wrapped seams, punched locking tabs and ink marking.
    plate(1.328, .982, .727, .044, alloy, 0, .333, 0, .027);
    for (const y of [-.118, .796]) {
        plate(1.334, .035, .738, .012, edge, 0, y, 0, .007);
    }
    for (const sign of [-1, 1]) {
        plate(.023, .866, .036, .01, edge, sign * .628, .34, .364, .005);
        const stamp = plate(.134, .232, .015, .034, seam, 0, .58, 0, .005);
        stamp.rotation.y = sign * Math.PI / 2;
        stamp.position.x = sign * .686;
        const tab = plate(.099, .173, .022, .025, alloy, 0, .590, 0, .005);
        tab.rotation.y = sign * Math.PI / 2;
        tab.rotation.z = sign * .085;
        tab.position.x = sign * .698;
    }
    const branding = add(new THREE.PlaneGeometry(1.05, .420), screenPrint(), 0, .297, .3655);
    branding.renderOrder = 2;

    // Behind the housing, a cantilevered release latch with an exposed thumb paddle.
    tube([[0, 1.73, -.32], [0, 1.61, -.49], [0, 1.30, -.57], [0, .91, -.69], [0, .65, -.81]],
        .090, acrylicEdge, 16, 8);
    const spring = plate(.417, .99, .067, .055, acrylicEdge, 0, 1.195, -.58);
    spring.rotation.x = .33;
    const paddle = plate(.52, .54, .093, .077, acrylicEdge, 0, .564, -.803);
    paddle.rotation.x = .31;

    // A continuous cable tangent through the rubber relief, curving off the right-hand edge.
    tube([[0, -1.71, 0], [0, -2.06, 0], [.05, -2.35, -.025],
        [.26, -2.72, -.095], [.70, -3.00, -.18], [1.27, -3.09, -.24],
        [2.26, -3.13, -.33], [3.30, -3.36, -.62], [4.15, -3.80, -.73]],
        .195, cable, 66, 20);

    function update(progress = 0) {
        const t = Math.max(0, Math.min(1, progress));
        plug.rotation.set(.38 + .07 * t, -.53 + .16 * t, .715 + .05 * t, 'ZXY');
    }
    object.position.set(-.19, .13, 0);
    object.scale.setScalar(1.13);
    update();
    return { object, update };
}
