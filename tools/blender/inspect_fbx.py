# Blender: imports each FBX given after `--` and prints its size, triangle count and materials.
# blender -b --factory-startup -P inspect_fbx.py -- a.fbx b.fbx
import sys
import bpy
from mathutils import Vector

files = sys.argv[sys.argv.index('--') + 1:]
for path in files:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    lo = Vector((1e9, 1e9, 1e9)); hi = -lo
    tris = 0
    mats = set()
    for o in meshes:
        for corner in o.bound_box:
            p = o.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
        tris += sum(len(poly.vertices) - 2 for poly in o.data.polygons)
        for slot in o.material_slots:
            if slot.material:
                mats.add(slot.material.name)
    armatures = [o.name for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    size = hi - lo
    print(f'== {path.split("/")[-1]}  objects {len(meshes)}  tris {tris}  size {size.x:.1f} x {size.y:.1f} x {size.z:.1f} m  min z {lo.z:.1f}  armatures {armatures}')
    print('   materials:', sorted(mats)[:12], '...' if len(mats) > 12 else '')
    print('   objects:', [o.name for o in meshes][:12], '...' if len(meshes) > 12 else '')
