// Every tuning number lives here. All values are placeholders until playtested.
// Distances are meters, times are seconds, speeds are meters per second.
export const config = {
  playerCount: 1,
  ticksPerSecond: 120,

  view: {
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
    // Health comes back after this many seconds without being hit.
    regenDelaySeconds: 5,
    regenPerSecond: 15,

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
    reloadSeconds: 1.9,
    range: 50,
    // Only the look of the bullet in flight. Damage still lands the instant you fire.
    bulletSpeed: 140,
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
    deathSeconds: 1.1,
  },

  waves: {
    zombiesPerWave: [3, 5, 7, 9, 12],
    secondsBetweenSpawns: 1.5,
    breakSeconds: 10,
    // The pause before wave 1, and again after dying or clearing the level.
    startDelaySeconds: 3,
    levelClearedSeconds: 8,
  },
} as const;
