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
    // Going down costs one. With none left the floor starts over from wave 1.
    lives: 3,
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
    // A headshot kills outright and pays more than any other kill.
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

  stations: {
    // How close to a wall station you must be to use it.
    range: 1.8,
    // Points for a full resupply of spare rounds.
    ammoCost: 100,
    // Points for the sawed-off shotgun, and for filling its shells once owned.
    shotgunCost: 500,
    shellCost: 200,
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
    arrivalOpenSeconds: 4,
    // Each floor up adds this fraction to every wave's zombie count and to their speed.
    extraZombiesPerFloor: 0.4,
    speedPerFloor: 0.08,
  },

  zombie: {
    maxHealth: 75,
    moveSpeed: 2.5,
    // Each wave they get this much faster, as a fraction of the base speed.
    speedPerWave: 0.06,
    radius: 0.4,
    height: 1.85,
    headHeight: 1.45,
    attackDamage: 10,
    attackRange: 1.3,
    secondsBetweenAttacks: 1,
    // A zombie that has just reached you waits this long before the first hit.
    firstAttackDelay: 0.4,
    // A zombie can not hit you if you are standing this far above its feet.
    reachHeight: 1.0,
    // How long a body stays down before it is removed. Dead zombies block nothing.
    deathSeconds: 4,
  },

  waves: {
    zombiesPerWave: [3, 5, 7, 9, 12],
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
