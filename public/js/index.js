const WINDOW_WIDTH = 640;
const WINDOW_HEIGHT = 480;
const TEXTURE_ATLAS = "images/rdr.json";
const GRAVITY = 0.4;
const FLOOR_MAX_HEIGHT = 130;
const BLOCK_SIZE = 64;
const MAX_POWERS = 5;

const SOUNDS = {
  jump1: new Audio('sounds/jump1.m4a'),
  jump2: new Audio('sounds/jump2.m4a'),
  idle: new Audio('sounds/idle.m4a'),
  chomp: new Audio('sounds/chomp.m4a')
};

const Graphics = PIXI.Graphics;
const Sprite = PIXI.Sprite;
const Texture = PIXI.Texture;

const renderer = PIXI.autoDetectRenderer(WINDOW_WIDTH, WINDOW_HEIGHT);
document.body.appendChild(renderer.view);

let resources = PIXI.loader.resources;

let player;
let trees;
let floors;
let smokes;
let atlas;
let worldSpeed;
let powerMeter;
let scoreboard;
let score;

let playScene = new PIXI.Container();
let endScene = new PIXI.Container();
let stage = new PIXI.Container();

PIXI.loader
  .add(TEXTURE_ATLAS)
  .load(setup);

function setup() {
  setupPlay();
  setupEnd();

  gameLoop();
}

function setupPlay() {
  atlas = PIXI.loader.resources[TEXTURE_ATLAS].textures; 

  var canvas = document.createElement('canvas');
  canvas.width = WINDOW_WIDTH;
  canvas.height = WINDOW_HEIGHT;
  var ctx = canvas.getContext('2d');
  var gradient = ctx.createLinearGradient(0, 0, 0, WINDOW_HEIGHT);
  gradient.addColorStop(0, '#6E9CF8');
  gradient.addColorStop(1, '#CEDBF9');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
  let bgTexture = Texture.fromCanvas(canvas);
  let bgSprite = new Sprite(bgTexture);
  playScene.addChild(bgSprite);

  player = new Player(playScene);
  powerMeter = new PowerMeter(playScene);
  scoreboard = new Scoreboard(playScene);

  SOUNDS.idle.addEventListener('timeupdate', function() {
    let buffer = .44;
    if(play === state && this.currentTime > this.duration - buffer) {
      this.currentTime = 0;
      this.play();
    }
  }, false);

  resetGame();

  stage.addChild(playScene);
}

function resetGame() {
  trees = [];
  worldSpeed = -2;
  score = 0;
  if(floors) floors.forEach(floor => floor.gfx.parent.removeChild(floor.gfx));
  if(smokes) smokes.forEach(smoke => smoke.gfx.parent.removeChild(smoke.gfx));
  smokes = [];
  floors = [new Floor(playScene, 0, WINDOW_HEIGHT - BLOCK_SIZE*2, WINDOW_WIDTH)];
  player.gfx.position.set(BLOCK_SIZE * 1.5, 0);
  scoreboard.set(0);
  player.power = MAX_POWERS;

  SOUNDS.idle.play();

  playScene.visible = true;
  endScene.visible = false;
}

let whyYouDied;
let highScore;
let highScoreboard;
let myScoreboard;
function setupEnd() {
  const diedStyle = new PIXI.TextStyle({
    fill: '#a03b37',
    fontSize: 48,
    fontWeight: 'bolder',
    lineJoin: 'round',
    stroke: 'white',
    strokeThickness: 2
  });
  let message = new PIXI.Text("Y O U   D I E D", diedStyle);
  message.anchor.set(0.5);
  message.position.set(WINDOW_WIDTH/2, WINDOW_HEIGHT/2 - message.height);
  endScene.addChild(message);

  whyYouDied = new PIXI.Text('', {
    fontFamily: "Arial", fontSize: 26, fill: "white"
  });
  whyYouDied.anchor.set(0.5);
  whyYouDied.position.set(WINDOW_WIDTH/2, WINDOW_HEIGHT/2 +whyYouDied.height);
  endScene.addChild(whyYouDied);

  myScoreboard = new PIXI.Text('', {fontFamily: "Arial", fontSize: 26, fill: "white"});
  myScoreboard.anchor.set(0.5);
  myScoreboard.position.set(WINDOW_WIDTH/2, WINDOW_HEIGHT - 2 * myScoreboard.height - 10);
  endScene.addChild(myScoreboard);

  highScoreboard = new PIXI.Text('', {fontFamily: "Arial", fontSize: 26, fill: "white"});
  highScoreboard.anchor.set(0.5);
  highScoreboard.position.set(WINDOW_WIDTH/2, WINDOW_HEIGHT - highScoreboard.height - 10);
  endScene.addChild(highScoreboard);

  stage.addChild(endScene);
}

let state = play;

function gameLoop() {
  requestAnimationFrame(gameLoop);

  state();

  renderer.render(stage);
}

// GAME STATES

function play() {
  player.act();

  trees.forEach(tree => {
    if (hitTestRectangle(player.gfx, tree.gfx)) {
      tree.consume();
    }
  });

  smokes.forEach(smoke => smoke.act())

  for(let i=floors.length-1; i>=0; i--) {
    floors[i].act();
  }

  worldSpeed -= .01;
  powerMeter.render();

  player.power -= .01;
  if (player.power < 0) {
    state = end;
    whyYouDied.text = 'You ran out of power';
  }

  player.gfx.parent.addChild(player.gfx);
  powerMeter.gfx.parent.addChild(powerMeter.gfx);
  scoreboard.gfx.parent.addChild(scoreboard.gfx);
}

function end() {
  myScoreboard.text = `Score: ${scoreboard.score}`;
  highScoreboard.text = `High score: ${highScore}`;
  highScore = Math.max(highScore || 0, scoreboard.score);

  playScene.visible = false;
  endScene.visible = true;
}

// CREATORS

class PowerMeter {
  constructor(scene) {
    let gfx = new PIXI.Container();
    gfx.x = 10;
    gfx.y = 10;
    let meter = new Graphics();
    let bg = new Graphics();
    bg.clear();
    bg.lineStyle(1, 0x000000, 1);
    bg.beginFill(0x000000);
    bg.drawRect(0, 0, 128 * player.power / MAX_POWERS, 32);
    bg.endFill();

    this.meter = meter;
    this.gfx = gfx;
    this.render();

    gfx.addChild(bg);
    gfx.addChild(meter);
    scene.addChild(gfx);
  }

  render() {
    let meter = this.meter;
    let powerRatio = player.power / MAX_POWERS;
    // green: rgb(80, 146, 113)
    // red: rgb(160, 59, 55)
    let r = 160 - 80 * powerRatio;
    let g = 59 + 87 * powerRatio;
    let b = 55 + 58 * powerRatio;

    let fill = r
    fill = (fill << 8) + g;
    fill = (fill << 8) + b;
    meter.clear();
    meter.lineStyle(1, 0x000000, 1);
    meter.beginFill(fill);
    meter.drawRect(0, 0, 128 * powerRatio, 32);
    meter.endFill();
  }
}

class Player {
  constructor(scene) {
    this.textures = {
      idle: atlas['df.png'],
      jump: atlas['df_jump.png'],
      chomp: atlas['df_chomp.png'],
    };
    let gfx = new Sprite(this.textures.idle);
    scene.addChild(gfx);
    gfx.vy = 0;
    gfx.halfWidth = gfx.width/2;
    gfx.halfHeight = gfx.height/2;
    gfx.zOrder = 9999999;

    this.gfx = gfx;
  }

  act() {
    let gfx = this.gfx;
    let floor = this.floor;

    gfx.y -= gfx.vy;

    if (this.jumping) this.jumping();
    this.checkFloor();
    if (this.consuming-- > 0) this.gfx.texture = this.textures.chomp;

    if (gfx.y > WINDOW_HEIGHT) {
      state = end;
      whyYouDied.text = 'Gravity hurts';
    }
  }

  jumping() {
    let gfx = this.gfx;
    let floor = this.floor;
    gfx.vy -= GRAVITY;
    if (gfx.vy < 0 && floor && gfx.y >= floor.top - gfx.height/2 + 6) {
      gfx.vy = 0;
      gfx.isJumping = 0;
      gfx.y = floor.top - gfx.height/2 + 6;
      gfx.texture = this.textures.idle;
    } else if (gfx.texture !== this.textures.jump) {
      gfx.texture = this.textures.jump;
    }
  }

  consume() {
    this.gfx.texture = this.textures.chomp;
    this.consuming = 10;
    let sound = SOUNDS.chomp;
    sound.currentTime = 0;
    sound.play();
  }

  checkFloor() {
    let gfx = this.gfx;
    let floor = this.floor;
    if (floor) {
      if (gfx.x + gfx.width/2 > floor.gfx.x + floor.gfx.width) {
        this.floor = null;
      }
    } else {
      let minDist = Infinity;
      let minDistFloor;
      floors.forEach(floor => {
        let distY = floor.top - gfx.y - gfx.height/2;
        if (gfx.x + gfx.width/2 > floor.gfx.x && distY > 0 && distY < minDist) {
          minDist = distY;
          minDistFloor = floor;
        }
      });

      if(minDistFloor) {
        this.floor = minDistFloor;
      }
    }
    //let gfx = this.gfx;
    //if (gfx.y >= this.floor.top - gfx.height/2 && this.floor.empty())
  }
}
class Scoreboard {
  constructor (scene) {
    this.score = 0;
    const style = new PIXI.TextStyle({
      fill: [
          '#d2763a',
          '#a03b37'
      ],
      lineJoin: 'round',
      stroke: '#3f4070',
      strokeThickness: 2
    });
    let gfx = new PIXI.Text(this.score, style);
    gfx.anchor.set(1, 0);
    gfx.position.set(WINDOW_WIDTH - gfx.width - 10, 10);
    this.gfx = gfx;
    scene.addChild(gfx);
  }

  set (score) {
    this.score = score;
    this.render();
  }

  change (diff) {
    this.score += diff;
    this.render();
  }

  render () {
    this.gfx.text = this.score;
  }
}

class Smoke {
  constructor (scene) {
    let gfx = new Graphics();
    gfx.beginFill(0x696969);
    gfx.drawCircle(0, 0, 16);
    gfx.endFill();
    gfx.x = player.gfx.x + Math.random() * 12 - 6;
    gfx.y = player.gfx.y;
    gfx.vy = -2;
    this.gfx = gfx;
    scene.addChild(gfx);
  }

  act () {
    let gfx = this.gfx;
    gfx.x += worldSpeed;
    gfx.y += gfx.vy;
    gfx.width *= 1.01;
    gfx.height *= 1.01;
    gfx.alpha *= .95
    if (gfx.y < 0) {
      smokes.splice(smokes.indexOf(this), 1);
      gfx.parent.removeChild(gfx);
    }
  }
}

setInterval(()=> {
  if (player) {
    let smoke = new Smoke(playScene);
    smokes.push(smoke);
  }
}, 100);

class Leafsplosion {
  constructor(scene, startX, startY) {
    this.leaves = [];
    for(let i=0; i<15; i++) {
      let gfx = new Sprite(atlas['leaf.png']);
      let ox = Math.random() * 2 - 1;
      let oy = Math.random() * 2 - 0.5;
      let am = Math.random() / 5 - 0.1;
      gfx.position.set(startX + ox, startY + oy);
      scene.addChild(gfx);
      this.leaves.push({
        gfx: gfx,
        vx: ox * 5,
        vy: oy,
        am: am
      });
    }

    setInterval(()=> {
      this.leaves.forEach(leaf => {
        leaf.vx *= 0.9;
        leaf.vy += GRAVITY*0.01;

        leaf.gfx.rotation += leaf.am;
        leaf.gfx.x += leaf.vx;
        leaf.gfx.y += leaf.vy;
      });
    }, 1);
  }
}

class Tree {
  constructor(scene, startX, startY) {
    let gfx = new Sprite(atlas['treetop.png']);
    let height = Math.round(Math.random() * 2);

    gfx.x = startX;
    gfx.y = startY - gfx.height - height * BLOCK_SIZE;
    gfx.halfWidth = gfx.width/2;
    gfx.halfHeight = gfx.height/2;

    this.trunks = [];
    for(let i=-1; i<=height; i++) {
      let trunk = new Sprite(atlas['stump.png']);
      trunk.x = startX;
      trunk.y = startY - trunk.height - i * BLOCK_SIZE;
      scene.addChild(trunk);
      this.trunks.push(trunk);
    }

    scene.addChild(gfx);
    this.scene = scene;
    this.gfx = gfx;
    this.power = 1;
  }

  consume() {
    if (!this.isConsumed) {
      this.isConsumed = true;
      player.power = Math.min(MAX_POWERS, player.power + this.power);
      this.gfx.visible = false;
      new Leafsplosion(this.scene,
        this.gfx.x + this.gfx.halfWidth,
        this.gfx.y - this.gfx.halfHeight
      );

      scoreboard.change(125);
      player.consume();
    }
  }

  act() {
    if (this.gfx.x < 0) {
      trees.splice(trees.indexOf(this), 1);
      this.trunks.forEach(trunk => trunk.parent.removeChild(trunk));
    }
  }
}

class Floor {
  constructor(scene, startX, startY, width) {
    this.time = Date.now();
    let gfx = new PIXI.Container();
    gfx.x = startX;
    gfx.y = startY;
    for(let x=0; x<width/BLOCK_SIZE; x+=1) {
      let block = new Sprite(atlas['ground.png']);
      block.x = x * BLOCK_SIZE;

      if(Math.random() * 4 > 3) {
        trees.push(new Tree(gfx, block.x, 0));
      }
      gfx.addChild(block);
    }

    this.top = startY - BLOCK_SIZE/2;
    this.gfx = gfx;
    scene.addChild(gfx);
  }

  act() {
    let gfx = this.gfx;

    gfx.x += worldSpeed;
    let rightBound = gfx.x + gfx.width;
    if (rightBound < 0) {
      floors.splice(floors.indexOf(this), 1);
      gfx.parent.removeChild(gfx);
    } else if (!this.givenBirth && rightBound < WINDOW_WIDTH - BLOCK_SIZE) {
      this.givenBirth = true;
      this.addNewFloor();
    }
  }

  addNewFloor() {
    let lastFloor = floors.slice(-1)[0];
    let offsetY = Math.min(
      Math.max((Math.random() * 4 - 2) * BLOCK_SIZE + lastFloor.gfx.y, FLOOR_MAX_HEIGHT),
      WINDOW_HEIGHT - player.gfx.height);
    let newFloor = new Floor(
      playScene,
      lastFloor.gfx.x + lastFloor.gfx.width + 2*BLOCK_SIZE,
      offsetY,
      WINDOW_WIDTH/Math.ceil(Math.random()*5)
    );
    floors.push(newFloor);
  }
};

// CONTROLS

const up = keyboard(38);
up.press = onJumpPress;
up.release = onJumpRelease;
const up2 = keyboard(32);
up2.press = onJumpPress;
up2.release = onJumpRelease;

const MAX_JUMPS = 2;
function onJumpPress() {
  if (state === play) {
    if (player.gfx.isJumping < MAX_JUMPS) {
      player.gfx.vy = Math.sqrt(++player.gfx.isJumping) * 8;
      let sound = SOUNDS['jump' + player.gfx.isJumping];
      sound.currentTime = 0;
      sound.play();
    }
  } else {
    state = play;
    resetGame();
  }
}

function onJumpRelease() {
  if (player.gfx.jumping && player.gfx.vy > 0) {
    player.gfx.vy = 0;
  }
}

function keyboard(keyCode) {
  var key = {};
  key.code = keyCode;
  key.isDown = false;
  key.isUp = true;
  key.press = undefined;
  key.release = undefined;

  key.downHandler = function(event) {
    if (event.keyCode === key.code) {
      if (key.isUp && key.press) key.press();
      key.isDown = true;
      key.isUp = false;
    }
    event.preventDefault();
  };

  key.upHandler = function(event) {
    if (event.keyCode === key.code) {
      if (key.isDown && key.release) key.release();
      key.isDown = false;
      key.isUp = true;
    }
    event.preventDefault();
  };

  window.addEventListener(
    "keydown", key.downHandler.bind(key), false
  );
  window.addEventListener(
    "keyup", key.upHandler.bind(key), false
  );
  return key;
}

// COLLISION

function hitTestRectangle(r1, r2) {
  let hit, combinedHalfWidths, combinedHalfHeights, vx, vy;
  let pos1 = r1.getGlobalPosition();
  let pos2 = r2.getGlobalPosition();

  hit = false;

  r1.centerX = pos1.x + r1.width / 2;
  r1.centerY = pos1.y + r1.height / 2;
  r2.centerX = pos2.x + r2.width / 2;
  r2.centerY = pos2.y + r2.height / 2;

  vx = r1.centerX - r2.centerX;
  vy = r1.centerY - r2.centerY;

  combinedHalfWidths = r1.halfWidth + r2.halfWidth;
  combinedHalfHeights = r1.halfHeight + r2.halfHeight;

  if (Math.abs(vx) < combinedHalfWidths) {
    if (Math.abs(vy) < combinedHalfHeights) {
      hit = true;
    } else {
      hit = false;
    }
  } else {
    hit = false;
  }
  return hit;
};