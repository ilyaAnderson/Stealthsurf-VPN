import * as T from "./vendor/three.module.min.js";

const cube = new T.BoxGeometry();
const point = new T.Object3D();
const material = (color, metalness = 0.15, roughness = 0.62) =>
    new T.MeshStandardMaterial({ color, metalness, roughness });

const steel = material(0x8094aa, 0.46, 0.43);
const brushed = material(0x637992, 0.45, 0.35);
const front = material(0x384761, 0.28);
const black = material(0x121923);
const plastic = material(0x354259);
const board = material(0x193e48);
const tracks = material(0x518784);
const gold = material(0xbf9855, 0.45);
const ceramic = material(0xc7d4e0, 0.31, 0.42);
const blue = new T.MeshStandardMaterial({ color: 0x5799ed, emissive: 0x204e8b, emissiveIntensity: 0.5 });

function group(parent, x = 0, y = 0, z = 0) {
    const node = new T.Group();
    node.position.set(x, y, z);
    parent.add(node);
    return node;
}

function box(parent, surface, x, y, z, width, height, depth) {
    const mesh = new T.Mesh(cube, surface);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    parent.add(mesh);
    return mesh;
}

function instances(parent, surface, items) {
    const mesh = new T.InstancedMesh(cube, surface, items.length);
    for (const [index, [x, y, z, w, h, d, angle = 0]] of items.entries()) {
        point.position.set(x, y, z);
        point.scale.set(w, h, d);
        point.rotation.set(0, 0, angle);
        point.updateMatrix();
        mesh.setMatrixAt(index, point.matrix);
    }
    parent.add(mesh);
}

function strip(parent, surface, count, step, first, size, axis) {
    instances(parent, surface, Array.from({ length: count }, (_, index) => {
        const position = [...first];
        position[axis] += index * step;
        return [...position, ...size];
    }));
}

function cylinder(parent, surface, x, y, z, radius, height, sides = 10) {
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, height, sides), surface);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
}

function plate(parent, text, x, y, z, width) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 80;
    const pen = canvas.getContext("2d");
    pen.fillStyle = "#d7e3f1";
    pen.font = "600 36px monospace";
    pen.textBaseline = "middle";
    pen.fillText(text, 10, 42);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    const face = new T.Mesh(new T.PlaneGeometry(width, width * 80 / 512),
        new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    face.position.set(x, y, z);
    parent.add(face);
    return face;
}

function screw(parent, x, y, z) {
    cylinder(parent, steel, x, y, z, 0.052, 0.028);
    box(parent, black, x, y + 0.015, z, 0.068, 0.004, 0.012);
}

function tray(parent) {
    const base = group(parent, 0, -0.16, 0);
    box(base, steel, 0, 0, 0, 4.92, 0.095, 3.6);
    for (const side of [-1, 1]) {
        box(base, brushed, side * 2.42, 0.24, 0, 0.095, 0.49, 3.6);
        box(base, steel, side * 2.38, 0.48, 0, 0.15, 0.045, 3.54);
        box(base, front, side * 2.6, 0.23, 1.78, 0.27, 0.5, 0.12);
        box(base, black, side * 2.66, 0.23, 1.846, 0.08, 0.17, 0.006);
        box(base, black, side * 2.05, -0.065, 1.32, 0.42, 0.045, 0.43);
    }
    return base;
}

function cover(parent) {
    const lid = group(parent, 0, 0.355, 0.02);
    box(lid, steel, 0, 0, 0, 4.88, 0.085, 3.56);
    box(lid, brushed, 0, 0.052, -0.58, 4.58, 0.017, 1.86);
    for (const x of [-2.19, 2.19]) {
        for (const z of [-1.54, 1.53]) screw(lid, x, 0.054, z);
    }
    strip(lid, front, 17, 0.15, [-1.2, 0.057, 1.37], [0.095, 0.006, 0.25], 0);
    const label = plate(lid, "STEALTHSURF / 1U", -1.05, 0.064, 0.69, 1.83);
    label.rotation.x = -Math.PI / 2;
    return lid;
}

function faceplate(parent) {
    const bezel = group(parent, 0, 0.105, 1.81);
    box(bezel, front, 0, 0, 0, 4.85, 0.48, 0.12);
    box(bezel, black, 0.55, 0, 0.066, 2.03, 0.30, 0.025);
    for (const y of [-0.09, 0, 0.09]) {
        strip(bezel, brushed, 21, 0.091, [-0.37, y, 0.083], [0.036, 0.036, 0.008], 0);
    }
    for (const x of [-1.87, -0.98]) {
        box(bezel, black, x, 0, 0.068, 0.8, 0.35, 0.025);
        box(bezel, brushed, x + 0.08, 0, 0.087, 0.54, 0.24, 0.032);
        box(bezel, steel, x - 0.28, 0, 0.088, 0.067, 0.23, 0.035);
        box(bezel, blue, x - 0.16, -0.07, 0.107, 0.049, 0.023, 0.005);
    }
    box(bezel, black, 1.98, 0, 0.068, 0.62, 0.28, 0.019);
    const button = cylinder(bezel, steel, 2.15, 0, 0.094, 0.065, 0.026);
    button.rotation.x = Math.PI / 2;
    box(bezel, blue, 1.78, 0.04, 0.086, 0.055, 0.022, 0.01);
    return bezel;
}

function motherboard(parent) {
    const pcb = group(parent, -0.37, -0.058, -0.04);
    box(pcb, board, 0, 0, 0, 3.88, 0.055, 2.7);
    for (const x of [-1.79, 1.79]) {
        for (const z of [-1.18, 1.18]) screw(pcb, x, 0.045, z);
    }
    strip(pcb, tracks, 18, 0.048, [-0.83, 0.03, -0.34], [0.015, 0.006, 1.37], 0);
    strip(pcb, tracks, 17, 0.04, [-0.16, 0.03, 0.26], [1.61, 0.006, 0.016], 2);
    strip(pcb, black, 4, 0.2, [0.62, 0.07, -0.22], [0.092, 0.07, 1.37], 0);
    strip(pcb, gold, 10, 0.10, [-1.44, 0.052, -1.05], [0.04, 0.047, 0.09], 0);
    strip(pcb, ceramic, 10, 0.083, [0.32, 0.052, 0.94], [0.03, 0.042, 0.09], 0);
    for (const [x, z] of [[-1.38, 0.33], [-0.62, -0.94], [1.38, 0.8], [1.5, -0.8]]) {
        box(pcb, black, x, 0.06, z, 0.26, 0.066, 0.22);
        strip(pcb, gold, 5, 0.04, [x - 0.08, 0.043, z + 0.13], [0.019, 0.01, 0.07], 0);
    }
    return pcb;
}

export function processor(parent) {
    const chip = group(parent);
    box(chip, board, 0, 0, 0, 0.79, 0.068, 0.77);
    box(chip, gold, 0, 0.042, 0, 0.66, 0.025, 0.64);
    box(chip, ceramic, 0, 0.083, 0, 0.58, 0.067, 0.56);
    box(chip, steel, 0, 0.122, 0, 0.45, 0.012, 0.42);
    for (const direction of [-1, 1]) {
        strip(chip, gold, 12, 0.055, [-0.3, 0.02, direction * 0.36], [0.024, 0.009, 0.045], 0);
    }
    return chip;
}

function memory(parent) {
    const bank = group(parent, 0.51, 0.122, -0.25);
    for (let index = 0; index < 4; index++) {
        const stick = group(bank, index * 0.20);
        box(stick, board, 0, 0.095, 0, 0.05, 0.22, 1.32);
        box(stick, gold, 0, -0.027, 0, 0.052, 0.034, 1.16);
        strip(stick, black, 8, 0.141, [0.035, 0.078, -0.50], [0.025, 0.105, 0.106], 2);
        strip(stick, ceramic, 5, 0.075, [-0.034, 0.12, -0.20], [0.02, 0.04, 0.035], 2);
    }
    return bank;
}

function storage(parent) {
    const disks = group(parent, -1.43, 0.035, 0.25);
    for (const x of [0, 0.39]) {
        box(disks, board, x, 0, 0, 0.28, 0.042, 1.12);
        strip(disks, black, 4, 0.20, [x, 0.035, -0.37], [0.22, 0.039, 0.14], 2);
        box(disks, ceramic, x, 0.058, 0.12, 0.21, 0.009, 0.46);
        box(disks, gold, x, 0.012, 0.55, 0.2, 0.015, 0.12);
        screw(disks, x, 0.04, -0.50);
    }
    return disks;
}

function networkCard(parent) {
    const nic = group(parent, -1.15, 0.075, -1.35);
    box(nic, board, 0, 0, 0.12, 1.22, 0.07, 0.85);
    box(nic, brushed, 0, 0.07, 0.26, 0.41, 0.085, 0.32);
    strip(nic, steel, 8, 0.048, [-0.17, 0.12, 0.26], [0.018, 0.13, 0.34], 0);
    for (const x of [-0.27, 0.27]) {
        box(nic, steel, x, 0.10, -0.31, 0.42, 0.26, 0.42);
        box(nic, black, x, 0.10, -0.526, 0.35, 0.18, 0.017);
        box(nic, blue, x + 0.12, 0.18, -0.537, 0.04, 0.033, 0.007);
    }
    return nic;
}

function cooling(parent) {
    const heat = group(parent, -0.37, 0.223, -0.49);
    box(heat, brushed, 0, 0, 0, 0.78, 0.047, 0.73);
    strip(heat, steel, 12, 0.065, [-0.35, 0.061, 0], [0.026, 0.112, 0.72], 0);
    const fanWall = group(parent, 0, 0.09, 1.08);
    for (const x of [-1.76, -1.06, -0.36, 0.34, 1.04]) {
        box(fanWall, black, x, 0, 0, 0.53, 0.43, 0.30);
        const fan = group(fanWall, x, 0, 0.16);
        const rim = new T.Mesh(new T.TorusGeometry(0.157, 0.016, 5, 16), brushed);
        fan.add(rim);
        for (let index = 0; index < 6; index++) {
            const angle = index * Math.PI / 3;
            const blade = box(fan, plastic, Math.cos(angle) * 0.077, Math.sin(angle) * 0.077, 0, 0.13, 0.047, 0.018);
            blade.rotation.z = angle + 0.42;
        }
        const hub = cylinder(fan, steel, 0, 0, 0.018, 0.048, 0.03);
        hub.rotation.x = Math.PI / 2;
    }
    return { heat, fanWall };
}

function power(parent) {
    const supply = group(parent, 1.70, 0.056, -1.19);
    box(supply, brushed, 0, 0, 0.30, 1.03, 0.38, 1.48);
    box(supply, black, 0, 0, -0.451, 0.68, 0.26, 0.021);
    for (const side of [-1, 1]) {
        box(supply, gold, side * 0.085, -0.01, -0.468, 0.036, 0.09, 0.012);
    }
    return supply;
}

export function rackServer(parent) {
    const root = group(parent);
    const base = tray(root);
    const lid = cover(root);
    const bezel = faceplate(root);
    const pcb = motherboard(root);
    const cpu = processor(root);
    cpu.position.set(-0.37, 0.04, -0.49);
    const ram = memory(root);
    const ssd = storage(root);
    const nic = networkCard(root);
    const { heat, fanWall } = cooling(root);
    const psu = power(root);
    const layers = [
        [base, [0, -0.33, 0]],
        [lid, [0.16, 1.36, -2.55]],
        [bezel, [0, -0.09, 0.82]],
        [pcb, [0, 0.58, 0]],
        [cpu, [-0.2, 1.42, 0.13]],
        [ram, [1.06, 1.10, 0.40]],
        [ssd, [-1.38, 0.93, 0.42]],
        [nic, [-1.02, 1.04, -0.47]],
        [heat, [0.48, 1.99, -0.06]],
        [fanWall, [0.06, 0.73, 0.79]],
        [psu, [1.02, 0.62, -0.56]],
    ].map(([node, shift]) => ({ node, origin: node.position.clone(), shift: new T.Vector3(...shift) }));
    return {
        root, points: { board: pcb, cpu, ram, ssd, network: nic, cooling: heat },
        explode(amount) {
            for (const { node, origin, shift } of layers) node.position.copy(origin).addScaledVector(shift, amount);
            lid.rotation.x = -0.12 * amount;
        },
    };
}

export function router(parent) {
    const body = group(parent);
    box(body, black, 0, 0.04, 0, 1.87, 0.15, 1.22);
    box(body, front, 0, 0.155, 0, 1.90, 0.11, 1.23);
    box(body, brushed, 0, 0.218, 0, 1.78, 0.027, 1.12);
    strip(body, black, 15, 0.087, [-0.61, 0.234, 0.18], [0.035, 0.008, 0.46], 0);
    strip(body, blue, 4, 0.17, [-0.26, 0.14, 0.623], [0.065, 0.020, 0.008], 0);
    for (const x of [-0.76, 0.76]) {
        cylinder(body, steel, x, 0.27, -0.43, 0.09, 0.11);
        const antenna = cylinder(body, black, x * 1.09, 0.75, -0.43, 0.046, 0.93);
        antenna.rotation.z = x > 0 ? -0.15 : 0.15;
    }
    return body;
}

export function clientDevice(parent) {
    const client = group(parent);
    box(client, brushed, 0, 0.02, 0, 0.46, 0.10, 0.85);
    box(client, black, 0, 0.075, 0, 0.40, 0.025, 0.78);
    box(client, blue, 0, 0.09, -0.025, 0.35, 0.009, 0.64);
    return client;
}

export function studio(scene) {
    scene.add(new T.HemisphereLight(0xf0f6ff, 0x444f69, 2.0));
    for (const [color, strength, xyz] of [
        [0xfff8ef, 3.25, [-4, 7, 5]],
        [0xa2c6ff, 2.0, [5, 4, -4]],
        [0xe7effb, 0.65, [3, 2, 6]],
    ]) {
        const light = new T.DirectionalLight(color, strength);
        light.position.set(...xyz);
        scene.add(light);
    }
}

export function contactShadow(parent, width, depth) {
    const map = document.createElement("canvas");
    map.width = map.height = 128;
    const pen = map.getContext("2d");
    const fade = pen.createRadialGradient(64, 64, 5, 64, 64, 62);
    fade.addColorStop(0, "#010611a0");
    fade.addColorStop(0.56, "#01061159");
    fade.addColorStop(1, "#01061100");
    pen.fillStyle = fade;
    pen.fillRect(0, 0, 128, 128);
    const shadow = new T.Mesh(new T.PlaneGeometry(width, depth),
        new T.MeshBasicMaterial({ map: new T.CanvasTexture(map), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.30;
    parent.add(shadow);
    return shadow;
}
