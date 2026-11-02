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
    // Fraction of normal speed while aiming down the sights.
    aimMoveMultiplier: 0.6,
    aimSeconds: 0.14,
    // How far the head moves out to the side at a full lean, and how long the lean takes.
    leanDistance: 0.35,
    leanSeconds: 0.15,
    // Meters per second gained per second. 60 reaches full speed in 0.1 seconds.
    acceleration: 60,
    lookSensitivity: 0.002,
    eyeHeight: 1.6,
    radius: 0.4,
    maxHealth: 100,
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
    radius: 0.4,
    height: 1.8,
    attackDamage: 10,
    attackRange: 1.2,
    secondsBetweenAttacks: 1,
  },

  waves: {
    zombiesPerWave: [3, 5, 7, 9, 12],
    secondsBetweenSpawns: 1.5,
    breakSeconds: 10,
  },
} as const;
