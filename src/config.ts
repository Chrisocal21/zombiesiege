// Every tuning number lives here. All values are placeholders until playtested.
// Distances are meters, times are seconds, speeds are meters per second.
export const config = {
  playerCount: 1,
  ticksPerSecond: 120,

  view: {
    bodycamDrop: 0.28,
    fieldOfView: 75,
    aimFieldOfView: 55,
    // How strong the lens warp is. 0 is a flat picture.
    fisheye: 0.12,
    // How far the picture tilts at a full lean, in radians.
    leanRoll: 0.2,
  },

  player: {
    moveSpeed: 6,
    // Fraction of normal speed while aiming down the sights, crouching, or sliding along cover.
    aimMoveMultiplier: 0.6,
    crouchMoveMultiplier: 0.55,
    // Sprinting: forward only, not while aiming, crouching, in cover or carrying.
    sprintMoveMultiplier: 1.5,
    coverMoveMultiplier: 0.5,
    aimSeconds: 0.14,
    // How far the head moves out to the side at a full lean, and how long the lean takes.
    leanDistance: 0.35,
    // The lean is longer when pressed against cover, so you can clear the edge.
    coverLeanDistance: 0.5,
    leanSeconds: 0.15,
    // Meters per second gained per second. 60 reaches full speed in 0.1 seconds.
    acceleration: 60,
    lookSensitivity: 0.002,
    eyeHeight: 1.6,
    crouchEyeHeight: 1.05,
    crouchSeconds: 0.18,
    // Body height, used for the "is something in the way" checks.
    height: 1.8,
    radius: 0.4,
    maxHealth: 100,
    // Each player's own lives. One goes when they bleed out or get up alone. Never more than the cap.
    lives: 3,
    livesCap: 5,
    // Down at 0 health: crawling, the gun in hand with what is in it and no reload, bleeding out.
    down: {
      bleedSeconds: 45,
      // A teammate beside them, uninterrupted, brings them back. Alone, a player can get up by
      // themself, slower, for a life.
      reviveSeconds: 4,
      selfReviveSeconds: 6,
      reach: 1.8,
      reviveHealth: 30,
      // Of crouched speed.
      crawlMultiplier: 0.35,
    },
    // Health comes back after this many seconds without being hit.
    regenDelaySeconds: 5,
    regenPerSecond: 15,
    // Natural regeneration stops here. Bandages and first aid kits heal past it.
    regenCeiling: 60,
    // Hydration lost each second, out of 100.
    thirstPerSecond: 0.3,

    jumpSpeed: 5.4,
    gravity: 16,
    // Anything lower than this is walked over without jumping.
    stepHeight: 0.4,
    // The highest ledge, above the feet, that a jump can grab and pull up onto.
    climbReach: 2.25,
    climbSeconds: 0.55,
    ladderSpeed: 2.4,
    // Back-to-wall cover: how far from a surface you can take cover on it.
    coverGrabDistance: 0.5,
  },

  pistol: {
    damage: 25,
    secondsBetweenShots: 0.15,
    magazineSize: 12,
    // Spare rounds carried beyond the magazine at the start, and the most that can be carried.
    reserveStart: 48,
    reserveMax: 96,
    reloadSeconds: 1.9,
    range: 50,
    // Only the look of the bullet in flight. Damage still lands the instant you fire.
    bulletSpeed: 140,
  },

  doors: {
    // How close to a bundle of boards you must be to pick it up.
    pickupRange: 1.6,
    // How close to a doorway you must be to board it up.
    boardRange: 2.6,
    // How many bundles can be carried at once.
    carryLimit: 2,
    // How close to the gate control you must be to close the gate.
    gateRange: 1.8,
    // How long the gate takes to come down, for the picture only.
    gateSeconds: 2.5,
    // How far inside the room a zombie walks before it goes after you.
    entryDistance: 1.8,
  },

  points: {
    // Earned for every bullet that hits a zombie, and for the bullet that kills it.
    perHit: 10,
    perKill: 60,
    // A headshot pays more than any other kill.
    perHeadshot: 150,
  },

  // The sawed-off shotgun, bought at a wall station. Damage is per pellet.
  shotgun: {
    damage: 22,
    pellets: 8,
    // Half-angle of the cone the pellets scatter in, in radians.
    spread: 0.075,
    secondsBetweenShots: 0.9,
    magazineSize: 2,
    reserveStart: 12,
    reserveMax: 24,
    reloadSeconds: 2.3,
    range: 20,
    bulletSpeed: 140,
  },

  // The AK, bought at a wall station on the upper floors. Automatic: hold fire.
  ak: {
    damage: 24,
    secondsBetweenShots: 0.105,
    magazineSize: 30,
    reserveStart: 90,
    reserveMax: 180,
    reloadSeconds: 2.5,
    range: 60,
    bulletSpeed: 160,
  },

  stations: {
    // How close to a wall station you must be to use it.
    range: 1.8,
    // Points for a full resupply of spare rounds.
    ammoCost: 100,
    // Points for the sawed-off shotgun, and for filling its shells once owned.
    shotgunCost: 500,
    shellCost: 200,
    // The AK, and filling its magazines once owned.
    akCost: 1200,
    akAmmoCost: 250,
  },

  tower: {
    // The floors the elevator stops at, bottom to top. The building has many more storeys, which
    // the elevator rides past. The last one goes up to the roof.
    stops: [
      { number: 0, name: 'Garage', waves: 5 },
      { number: 3, name: 'Admissions', waves: 3 },
      { number: 6, name: 'Pharmacy and lab', waves: 3 },
      { number: 9, name: 'Surgery', waves: 4 },
      { number: 12, name: 'Intensive care', waves: 4 },
    ],
    // The roof, above the last stop: its storey number for the elevator ride, and its waves before
    // the helipad lights can be switched on.
    roof: { number: 14, name: 'Helipad', waves: 2 },
    // The prologue, before the hospital: the floors with negative indexes, -2 then -1. The ambulance dies
    // nine miles out and the crew fights in on foot, P01 to P05, a couple of miles at a time. `number` is unused out of doors, `mile` is how far out it is.
    prelude: [
      { number: 0, name: 'Breakdown', waves: 2, mile: 9 },
      { number: 0, name: 'Roadside Station', waves: 3, mile: 7 },
      { number: 0, name: 'Checkpoint', waves: 3, mile: 5 },
      { number: 0, name: 'Commercial District', waves: 3, mile: 3 },
      { number: 0, name: 'Final Push', waves: 4, mile: 1 },
    ],
    // Act 2, the office tower: the floors after the roof in the run, reached going down by freight lift.
    descent: [
      { number: 44, name: 'Tower roof', waves: 2 },
      { number: 41, name: 'Open-plan offices', waves: 3 },
      { number: 34, name: 'Records floor', waves: 3 },
      { number: 27, name: 'Executive suites', waves: 3 },
      { number: 20, name: 'Server floor', waves: 4 },
      { number: 1, name: 'Lobby', waves: 4 },
      { number: -1, name: 'Tower garage', waves: 5 },
    ],
    // Act 3, the vault: down the service tunnel, up into the pharmacy and down again into the lab.
    vault: [
      { number: -3, name: 'Service tunnel', waves: 4 },
      { number: 0, name: 'Pharmacy', waves: 3 },
      { number: -1, name: 'Hidden lab', waves: 4 },
      { number: -2, name: 'The vault', waves: 5 },
    ],
    // Act 4, daybreak: out of the transit lift and onto the street, block by block, to the park.
    daybreak: [
      { number: 0, name: 'Main Street', waves: 4 },
      { number: 0, name: 'Market square', waves: 4 },
      { number: 0, name: 'The barricades', waves: 4 },
      { number: 0, name: 'The park', waves: 3 },
    ],
    // Act 5, the outskirts camp: the first place worth defending.
    // Act 6, the roads out: fuel first.
    roads: [
      { number: 0, name: 'Running on Empty', waves: 3 },
    ],
    // Act 7, the silence on the air.
    deadAir: [
      { number: 0, name: 'High Ground', waves: 3 },
    ],
    refuge: [
      { number: 0, name: 'Inventory of the Living', waves: 1 },
      { number: 0, name: 'The Missing Delivery', waves: 3 },
      { number: 0, name: 'Last Refuge', waves: 4 },
    ],
  },

  objectives: {
    // How close to a breaker, charger, case or drop-off you must be to use it.
    range: 1.8,
    // Fraction of normal speed while carrying a case in both hands.
    carryMoveMultiplier: 0.8,
    // While holding a room or waiting for the helicopter, a zombie comes through an open door this
    // often, a little more often on each floor up, but never more than this many at once.
    holdSpawnSeconds: 2.6,
    holdSpawnPerFloor: 0.12,
    holdMaxZombies: 14,
  },

  elevator: {
    // How long the doors take to slide, for the picture only.
    doorSeconds: 1.4,
    // The ride up, from the doors closing to the doors opening on the next stop: this plus a
    // little for every storey climbed.
    rideSeconds: 3,
    rideSecondsPerStorey: 1,
    // After arriving, how long the doors stay open before they close again behind the players.
    // On arriving, the beat in the shut cab before the doors slide open.
    arriveSeconds: 1.6,
    // Each step of depth (see tower.ts depth) adds this fraction to every wave's zombie count and to
    // their speed. Speed stops growing at speedDepthCap, so they never outpace a walking player.
    extraZombiesPerFloor: 0.3,
    speedPerFloor: 0.08,
    speedDepthCap: 6,
  },

  zombie: {
    maxHealth: 75,
    moveSpeed: 2.5,
    // Each wave they get this much faster, as a fraction of the base speed.
    speedPerWave: 0.06,
    radius: 0.4,
    height: 1.85,
    // Where the head box starts, and how wide it is as a share of the body's radius: a head is small.
    headHeight: 1.5,
    headWidth: 0.4,
    // A head shot does this many times the damage, and a brute's thick skull this many. Not instant.
    headMultiplier: 2.2,
    bruteHeadMultiplier: 1.4,
    attackDamage: 10,
    attackRange: 1.3,
    secondsBetweenAttacks: 1,
    // A zombie that has just reached you waits this long before the first hit.
    firstAttackDelay: 0.4,
    // A zombie can not hit you if you are standing this far above its feet.
    reachHeight: 1.0,
    // How long a body stays down before it is removed. Dead zombies block nothing.
    deathSeconds: 4,

    // The kinds of infected. Each changes the plain walker's numbers. `size` scales the body and its
    // hit boxes, `speed` multiplies the walking pace, `interval` is the seconds between swings, `range`
    // how far a swing reaches, and `points` multiplies what a kill pays.
    kinds: {
      walker: { health: 75, speed: 1, damage: 10, size: 1, radius: 0.4, interval: 1, range: 1.3, firstDelay: 0.4, points: 1 },
      runner: { health: 38, speed: 2, damage: 7, size: 0.96, radius: 0.36, interval: 0.7, range: 1.2, firstDelay: 0.25, points: 1.4 },
      brute: { health: 340, speed: 0.62, damage: 30, size: 1.25, radius: 0.55, interval: 1.7, range: 1.8, firstDelay: 0.6, points: 4 },
      screamer: { health: 55, speed: 0.95, damage: 8, size: 1, radius: 0.4, interval: 1, range: 1.3, firstDelay: 0.4, points: 2.5 },
    },
    // Shot in the legs for this much damage, a zombie goes down and crawls, slowly, with a low body.
    legDamageToCrawl: 40,
    crawlSpeed: 0.33,
    crawlHeight: 0.7,
    // A zombie further than sightRange from every player (flashlightSightRange if theirs is on) and not
    // alerted by noise walks at unawareSpeed. A gunshot alerts every zombie within noiseRange for alertSeconds.
    sightRange: 22,
    flashlightSightRange: 34,
    unawareSpeed: 0.75,
    // One of the floor's own dead walking about before it knows anyone is there, times moveSpeed.
    roamSpeed: 0.3,
    noiseRange: 32,
    meleeNoiseRange: 8,
    // A silenced shot: a cough and the slide, heard only close by.
    silencedNoiseRange: 5,
    alertSeconds: 8,
    // Within surroundRange of its target a zombie aims for its own spot on a ring round the player, so a
    // crowd spreads out instead of queueing.
    surroundRange: 4.5,
    // A screamer that sees a player within screamRange stops and screams for screamSeconds. Every zombie
    // within screamCallRadius is alerted and, for enrageSeconds, moves enrageSpeed times as fast, and
    // reinforcements come in at the doors. It screams again after screamCooldown.
    screamRange: 16,
    screamSeconds: 1.6,
    screamCallRadius: 32,
    enrageSeconds: 7,
    enrageSpeed: 1.45,
    screamCooldown: 22,
    screamReinforce: 2,
    // A brute roars and charges at a player between chargeMin and chargeMax metres off, at chargeSpeed
    // times its pace, for chargeSeconds, then not again for chargeCooldown.
    chargeMin: 4,
    chargeMax: 11,
    chargeSpeed: 2.7,
    chargeSeconds: 1.2,
    chargeCooldown: 9,
    // A floor's own dead stand still until they notice someone: a player within `sight` metres in plain
    // view (plus `flashlight` with a light on, times `crouch` when crouching), or within `touch` metres
    // whatever they do, or anything that alerts them. Sight is checked every `everyTicks` ticks. One
    // waking wakes the others within `neighbours` metres.
    resident: { sight: 9, flashlight: 4, crouch: 0.5, touch: 1.8, everyTicks: 6, neighbours: 4.5 },
    // The boss, Patient O, a brute that cannot be killed. Its health in each stage is the stage's figure
    // times (healthBase + healthPerPlayer * players). In stage 1 it never drops below stageOneFloor of
    // that, and its speed factor is stageOneSpeed (the floors deep down make every zombie quick); in
    // stage 2 it is stageTwoSpeed. A head shot staggers it for staggerSeconds, no more than once every
    // staggerEvery seconds. Beaten, it has retreatSeconds to get into the vault before it is put there.
    boss: {
      healthBase: 0.55, healthPerPlayer: 0.45, stageOneHealth: 2600, stageTwoHealth: 1500, stageOneFloor: 0.4,
      stageOneSpeed: 0.55, stageTwoSpeed: 0.95, staggerEvery: 3, staggerSeconds: 1.1, retreatSeconds: 12,
      // How fast it falls back, times moveSpeed.
      retreatPace: 1.6,
    },
    // Ordinary walkers trip now and then: every stumbleEvery seconds one in three loses stumbleSeconds.
    stumbleEvery: 11,
    stumbleSeconds: 0.7,
  },

  waves: {
    // The size of each wave on a floor, spread over the floor's waves, for one player on the easy
    // end of the difficulty. See tower.ts waveSize for how depth, crew and difficulty scale it.
    zombiesPerWave: [4, 7, 10, 13, 17],
    // A whole-game dial on every wave's size: 1 as designed, 1.25 for a harder game.
    difficulty: 1,
    // Each extra player adds this fraction of a solo wave on top. Four players face 2.8 times one.
    extraPerPlayer: 0.6,
    // Waiting around brings more: once a wave is all out and still not cleared, every this many
    // seconds a share of it (lingerShare, times the crew) comes through the doors, up to lingerMax times.
    lingerSeconds: 30,
    lingerShare: 0.12,
    lingerMax: 4,
    // Past the hospital roof, each floor counts as this much of a floor for depth.
    laterFloorStep: 0.1,
    // A wave stops coming through the doors while this many are up, and carries on as they fall. More
    // for each extra player.
    maxAlive: 28,
    maxAlivePerPlayer: 10,
    secondsBetweenSpawns: 1.5,
    // The rest between waves, long enough for buying weapons once there is something to buy.
    breakSeconds: 25,
    // The countdown, starting when the gate is closed, to find the bars and board up doors.
    prepSeconds: 30,
    // The moment the gate closes, or a new floor is stepped onto, this many zombies rush in
    // through every door at once, so boarding up is a scramble instead of a quiet beat.
    doorRushZombies: 2,
    // The short pause before the same wave starts again after dying.
    startDelaySeconds: 3,
    // The pause on the floor-cleared message before the elevator opens.
    levelClearedSeconds: 4,
  },
  testing: {
    // Floors on the main menu's route can be clicked to start the game there. Off for release.
    floorSelect: true,
    // The pause menu can change points and spawn inventory for testing. Off for release.
    adminMenu: true,
  },
} as const;
