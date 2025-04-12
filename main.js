// === SETUP ===
const canvas = document.querySelector("#game");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.y = 2;
camera.position.z = 5;

// === TEXTURES ===
const loader = new THREE.TextureLoader();
const textures = [
  loader.load('textures/grass.png'),
  loader.load('textures/stone.png'),
  loader.load('textures/dirt.png')
];

// === INVENTORY ===
let currentBlockIndex = 0;
window.addEventListener("keydown", e => {
  if (["1", "2", "3"].includes(e.key)) {
    currentBlockIndex = parseInt(e.key) - 1;
  }
});

// === CROSSHAIR + POINTER LOCK ===
document.body.addEventListener("click", () => {
  canvas.requestPointerLock();
});
let isPointerLocked = false;
document.addEventListener("pointerlockchange", () => {
  isPointerLocked = !!document.pointerLockElement;
});

// === PLAYER CONTROLS ===
let keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let pitch = 0;
let yaw = 0;

document.addEventListener("mousemove", (event) => {
  if (!isPointerLocked) return;
  yaw -= event.movementX * 0.002;
  pitch -= event.movementY * 0.002;
  pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
  camera.rotation.set(pitch, yaw, 0);
});

// === BLOCK SYSTEM ===
const blockSize = 1;
const world = new Map();

function getKey(x, y, z) {
  return `${x},${y},${z}`;
}

function placeBlock(x, y, z, typeIndex) {
  if (world.has(getKey(x, y, z))) return;

  const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
  const material = new THREE.MeshBasicMaterial({ map: textures[typeIndex] });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(x + 0.5, y + 0.5, z + 0.5);
  cube.userData = { x, y, z, type: typeIndex };
  scene.add(cube);
  world.set(getKey(x, y, z), cube);
}

function removeBlock(x, y, z) {
  const key = getKey(x, y, z);
  const cube = world.get(key);
  if (cube) {
    scene.remove(cube);
    world.delete(key);
  }
}

// === WORLD GENERATION ===
for (let x = -5; x <= 5; x++) {
  for (let z = -5; z <= 5; z++) {
    placeBlock(x, 0, z, 0); // grass
  }
}

// === RAYCASTING FOR BLOCKS ===
const raycaster = new THREE.Raycaster();
window.addEventListener("mousedown", (event) => {
  if (!isPointerLocked) return;

  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const intersects = raycaster.intersectObjects([...world.values()]);
  if (intersects.length > 0) {
    const hit = intersects[0];
    const pos = hit.object.position.clone().subScalar(0.5);

    if (event.button === 0) {
      // Break block
      removeBlock(pos.x, pos.y, pos.z);
    } else if (event.button === 2) {
      // Place block
      const normal = hit.face.normal;
      const newPos = pos.clone().add(normal);
      placeBlock(Math.floor(newPos.x), Math.floor(newPos.y), Math.floor(newPos.z), currentBlockIndex);
    }
  }
});

// === ANIMATION LOOP ===
function animate() {
  requestAnimationFrame(animate);

  // Movement
  direction.set(0, 0, 0);
  const speed = 0.1;

  if (keys['w']) direction.z -= 1;
  if (keys['s']) direction.z += 1;
  if (keys['a']) direction.x -= 1;
  if (keys['d']) direction.x += 1;

  direction.normalize();
  const angle = yaw;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);

  velocity.x = direction.x * cos - direction.z * sin;
  velocity.z = direction.x * sin + direction.z * cos;

  camera.position.x += velocity.x * speed;
  camera.position.z += velocity.z * speed;

  renderer.render(scene, camera);
}
animate();
