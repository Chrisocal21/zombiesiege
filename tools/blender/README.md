# Blender conversion scripts

Blender 5.2 runs these headless to turn downloaded packs into the game's GLB files.
`B="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"`

- `inspect_fbx.py`: size, triangles and materials of each FBX.
  `"$B" -b --factory-startup -P inspect_fbx.py -- a.fbx b.fbx`
- `inspect_rig.py`: a file's meshes and its bone tree.
  `"$B" -b --factory-startup -P inspect_rig.py -- model.fbx`
- `convert_building.py`: one baked building to a light GLB (1K textures, Draco, mesh reduced
  toward a triangle target). Add `careful` when the reduction tears the mesh; then it only
  compresses.
  `"$B" -b --factory-startup -P convert_building.py -- in.fbx <textures dir> <texture prefix> out.glb 20000 1024 [careful]`
- `convert_weapon.py`: a weapon `.blend` to a GLB of named parts, pointing down -z in metres, the arms
  and scenery left out. Parts are listed with `=steel`, `=wood` or `=mixed` (flat paint, `mixed` keeps
  the file's slots and makes the wooden ones wood).
  `"$B" -b --factory-startup in.blend -P convert_weapon.py -- out.glb <scale> <turn z degrees> <main part> Part=steel ...`
  Pump: scale 1, turn 90. AK: scale 0.2, turn 180.
- `split_characters.py`: the 3 zombie collection into one GLB per character, each with its
  own skeleton and textures.
  `"$B" -b --factory-startup -P split_characters.py -- in.fbx <textures dir> <out dir>`

Check a result with `/tools/models.html?model=<folder>/<name>` on the dev server.
