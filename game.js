const canvas = document.getElementById('arena');
const overlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const action = document.getElementById('gameAction');
const gameScreen = document.getElementById('gameScreen');
const scoreLabel = document.getElementById('scoreValue');
let THREE, renderer, scene, camera, raycaster, targets = [], keys = new Set();
let running = false, started = false, ended = false, score = 0, yaw = 0, pitch = 0, previous = 0;
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
let jumpVelocity = 0;
let isGrounded = true;
const groundHeight = 1.7;
const gravity = 18;
const jumpStrength = 7;
let weapon;
let muzzleFlash;
let flashUntil = 0;

const killSound = new Audio('./assets/mystbloom-kill.mp3');
killSound.volume = 0.7;

function playKillSound() {
  killSound.currentTime = 0;
  killSound.play().catch(console.warn);
}

const shootSound = new Audio('./assets/mystbloom-shoot.mp3');
shootSound.volume = 0.8;

function playShootSound() {
  shootSound.currentTime = 0;
  shootSound.play().catch(console.warn);
}

// Background music: track 1 for the shooting game, track 2 for the love letter.
const gameMusic = new Audio('./assets/game-music.mp3');
gameMusic.loop = true;
gameMusic.volume = 0.45;
const surpriseMusic = new Audio('./assets/surprise-music.mp3');
surpriseMusic.loop = true;
surpriseMusic.volume = 0.5;

function startGameMusic() {
  surpriseMusic.pause();
  surpriseMusic.currentTime = 0;
  gameMusic.currentTime = 0;
  gameMusic.play().catch(err => console.warn('Game music could not start:', err));
}
function startSurpriseMusic() {
  gameMusic.pause();
  gameMusic.currentTime = 0;
  surpriseMusic.currentTime = 0;
  surpriseMusic.play().catch(err => console.warn('Surprise music could not start:', err));
}

function heartShape(){ const s=new THREE.Shape();s.moveTo(0,-.55);s.bezierCurveTo(-.2,-.34,-.85,.06,-.75,.49);s.bezierCurveTo(-.64,.95,-.13,.87,0,.56);s.bezierCurveTo(.13,.87,.64,.95,.75,.49);s.bezierCurveTo(.85,.06,.2,-.34,0,-.55);return s; }
function placeTarget(mesh){ mesh.position.set((Math.random()-.5)*17,1.35+Math.random()*2.6,-3-Math.random()*15);mesh.rotation.y=(Math.random()-.5)*.3;mesh.userData.phase=Math.random()*6.28; }


function createWeapon() {
  weapon = new THREE.Group();

  const pink = new THREE.MeshStandardMaterial({
    color: 0xf4a2cb, metalness: 0.65, roughness: 0.25
  });
  const darkPink = new THREE.MeshStandardMaterial({
    color: 0x9b477c, metalness: 0.75, roughness: 0.25
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xe8c477, metalness: 0.85, roughness: 0.2
  });
  const purple = new THREE.MeshStandardMaterial({
    color: 0x67466f, metalness: 0.6, roughness: 0.3
  });
  const glow = new THREE.MeshStandardMaterial({
    color: 0xffd9f0,
    emissive: 0xff69b4,
    emissiveIntensity: 0.9
  });

  function box(w,h,d,x,y,z,material) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w,h,d), material
    );
    mesh.position.set(x,y,z);
    weapon.add(mesh);
    return mesh;
  }

  function cylinder(rt,rb,length,x,y,z,material) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(rt,rb,length,16), material
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x,y,z);
    weapon.add(mesh);
    return mesh;
  }

  // Main receiver
  box(.19,.22,.72,0,0,0,pink);
  box(.205,.035,.65,0,.12,0,gold);
  box(.205,.035,.65,0,-.12,0,gold);

  // Upper receiver and barrel
  box(.15,.09,.58,0,.16,-.08,purple);
  cylinder(.055,.055,.65,0,.04,-.66,darkPink);
  cylinder(.073,.073,.12,0,.04,-1.02,gold);
  cylinder(.045,.045,.13,0,.04,-1.10,purple);

  // Magazine
  box(.13,.28,.19,0,-.23,.12,darkPink);
  box(.14,.025,.2,0,-.37,.12,gold);

  // Grip and stock details
  box(.15,.28,.22,0,-.22,.39,purple);
  box(.18,.09,.3,0,.015,.48,pink);
  box(.18,.035,.3,0,.07,.48,gold);

  // Floral side decorations
  for (let side of [-1,1]) {
    for (let i=0;i<3;i++) {
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(.075,16,12), glow
      );
      petal.scale.set(.28,1.1,.65);
      petal.position.set(
        side*.105,
        Math.sin(i*2.1)*.075,
        -.12+i*.18
      );
      petal.rotation.z = i*.7;
      weapon.add(petal);
    }

    box(.018,.035,.48,side*.105,.02,-.08,gold);
  }

  // Mystbloom flower ornament
  const flower = new THREE.Group();

  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    const petal=new THREE.Mesh(
      new THREE.SphereGeometry(.075,16,12),glow
    );
    petal.scale.set(.65,1.35,.35);
    petal.position.set(
      Math.cos(angle)*.09,
      Math.sin(angle)*.09,
      0
    );
    petal.rotation.z=angle;
    flower.add(petal);
  }

  const center=new THREE.Mesh(
    new THREE.SphereGeometry(.055,16,16),gold
  );
  flower.add(center);
  flower.position.set(.13,.19,-.13);
  weapon.add(flower);

  // Muzzle flash
  muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(.09,16,16),
    new THREE.MeshBasicMaterial({
      color:0xffaadd,
      transparent:true,
      opacity:.85
    })
  );
  muzzleFlash.position.set(0,.04,-1.12);
  muzzleFlash.visible=false;
  weapon.add(muzzleFlash);

  weapon.position.set(.36,-.32,-.65);
  camera.add(weapon);
  scene.add(camera);
}

async function init(){
 try { THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js'); }
 catch(e){overlayTitle.textContent='Unable to load the arena';overlayText.textContent='Please connect to the internet and reload the page. The 3D engine loads online.';action.textContent='Retry';action.onclick=()=>location.reload();return;}
 renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);renderer.setClearColor(0xfbd9e8);
 scene=new THREE.Scene();scene.fog=new THREE.Fog(0xfbd9e8,16,37);
 camera=new THREE.PerspectiveCamera(74,canvas.clientWidth/canvas.clientHeight,.1,100);camera.position.set(0,1.7,5);
 createWeapon();
 raycaster=new THREE.Raycaster();scene.add(new THREE.HemisphereLight(0xffffff,0xd47ca5,2.1));const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(-5,10,4);scene.add(light);
 const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.82,side:THREE.DoubleSide});
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(50,50),mat(0xe7a3c3));floor.rotation.x=-Math.PI/2;scene.add(floor);
 const grid=new THREE.GridHelper(50,40,0xffffff,0xf6c5d9);grid.position.y=.01;scene.add(grid);
 const back=new THREE.Mesh(new THREE.BoxGeometry(36,9,.5),mat(0xe4a0c1));back.position.set(0,4,-22);scene.add(back);
 for(const side of [-1,1]){const wall=new THREE.Mesh(new THREE.BoxGeometry(.4,8,48),mat(0xf1bad2));wall.position.set(side*18,4,-1);scene.add(wall);}
 for(let i=0;i<9;i++){const col=new THREE.Mesh(new THREE.BoxGeometry(.5,4,.5),mat(i%2?0xc96898:0xffffff));col.position.set(i%2?-9:9,2,-i*3);scene.add(col);}
 const shape=heartShape(),geometry=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelThickness:.08,bevelSize:.06,bevelSegments:2});geometry.center();
 for(let i=0;i<9;i++){const target=new THREE.Mesh(geometry,mat(i%3===0?0xc9427f:0xf36aa1));target.scale.setScalar(.75);placeTarget(target);scene.add(target);targets.push(target);}
 const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(canvas);
 action.onclick=start;canvas.addEventListener('click',()=>{if(running){if(document.pointerLockElement!==canvas)canvas.requestPointerLock?.();}});
 document.addEventListener('pointerlockchange',()=>{if(!running)return;if(document.pointerLockElement!==canvas){running=false;showOverlay('Paused ♡','Click resume to keep popping hearts. Your progress is saved.','Resume game');}else{overlay.hidden=true;running=true;}});
 document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas||!running)return;yaw-=e.movementX*.0025;pitch=clamp(pitch-e.movementY*.0025,-1.15,1.15);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);});
 document.addEventListener('keydown',e=>{if(!gameScreen.hidden&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);});document.addEventListener('keyup',e=>keys.delete(e.code));
 canvas.addEventListener('mousedown',e=>{if(e.button===0&&running&&document.pointerLockElement===canvas)shoot();});
 requestAnimationFrame(frame);
}
function showOverlay(title,message,button){overlayTitle.textContent=title;overlayText.textContent=message;action.textContent=button;overlay.hidden=false;}

function start() {
  if (!THREE) return;

  if (!started || ended) {
    score = 0;
    started = true;
    ended = false;
    scoreLabel.textContent = '0';

    camera.position.set(0, 1.7, 5);
    yaw = 0;
    pitch = 0;
    camera.rotation.set(0, 0, 0);

    jumpVelocity = 0;
    isGrounded = true;
  }

  running = true;
  overlay.hidden = true;
  startGameMusic();

  canvas.requestPointerLock?.().catch(() => {
    showOverlay('Mouse control unavailable',
      'Use a modern desktop browser to play.',
      'Try again');
  });
}

function shoot(){playShootSound();muzzleFlash.visible=true;flashUntil=performance.now()+80;raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const hits=raycaster.intersectObjects(targets);if(hits.length&&hits[0].distance<30){playKillSound();score+=1;scoreLabel.textContent=String(score);if(score>=26){end();return;}placeTarget(hits[0].object);const cross=document.getElementById('crosshair');cross.classList.remove('hit');void cross.offsetWidth;cross.classList.add('hit');}}
function end(){running=false;ended=true;document.exitPointerLock?.();gameScreen.hidden=true;document.getElementById('giftScreen').hidden=false;document.getElementById('finalScore').textContent=String(score);}

function frame(now) {
  requestAnimationFrame(frame);

  const dt = Math.min((now - previous) / 1000 || 0, 0.05);
  previous = now;

  if (running) {
    const speed = 5.7 * dt;

    // SPACEBAR JUMP
    if (keys.has('Space') && isGrounded) {
      jumpVelocity = jumpStrength;
      isGrounded = false;
    }

    // GRAVITY AND LANDING
    if (!isGrounded) {
      jumpVelocity -= gravity * dt;
      camera.position.y += jumpVelocity * dt;

      if (camera.position.y <= groundHeight) {
        camera.position.y = groundHeight;
        jumpVelocity = 0;
        isGrounded = true;
      }
    }

    // WASD MOVEMENT
    const f = Number(keys.has('KeyW') || keys.has('ArrowUp')) -
              Number(keys.has('KeyS') || keys.has('ArrowDown'));

    const r = Number(keys.has('KeyD') || keys.has('ArrowRight')) -
              Number(keys.has('KeyA') || keys.has('ArrowLeft'));

    camera.position.x = clamp(
      camera.position.x + (Math.cos(yaw) * r - Math.sin(yaw) * f) * speed,
      -15, 15
    );

    camera.position.z = clamp(
      camera.position.z + (-Math.cos(yaw) * f - Math.sin(yaw) * r) * speed,
      -19, 13
    );
  }

  // FLOATING HEART ANIMATION
  targets.forEach((t) => {
    t.rotation.z = Math.sin(now * 0.0016 + t.userData.phase) * 0.12;
    t.position.y += Math.sin(now * 0.002 + t.userData.phase) * 0.002;
  });

  if (muzzleFlash && now >= flashUntil) {
  muzzleFlash.visible = false;
}

renderer.render(scene, camera);
}

document.getElementById('replayGame').addEventListener('click',()=>{
  surpriseMusic.pause();
  surpriseMusic.currentTime=0;
  gameMusic.pause();
  gameMusic.currentTime=0;
  document.getElementById('giftScreen').hidden=true;
  gameScreen.hidden=false;
  showOverlay('Ready for another round? ♡','WASD to move · Mouse to aim · Click to shoot','Start again');
});
document.getElementById('openGift').addEventListener('click',()=>{
  document.getElementById('giftIntro').hidden=true;
  document.getElementById('bouquetReveal').hidden=false;
  startSurpriseMusic();
});
window.openMiAmorGame=()=>{document.getElementById('successScreen').hidden=true;gameScreen.hidden=false;init();};
