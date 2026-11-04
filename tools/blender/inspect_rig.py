# Blender: lists each armature's bone tree, and each skinned mesh's size and triangle count.
import sys
import bpy
from mathutils import Vector

path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
if path.endswith('.fbx'):
    bpy.ops.import_scene.fbx(filepath=path)
else:
    bpy.ops.wm.open_mainfile(filepath=path)
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        dims = o.dimensions
        arm = next((m.object.name for m in o.modifiers if m.type == 'ARMATURE' and m.object), None)
        mats = [s.material.name for s in o.material_slots if s.material]
        print(f'MESH {o.name} tris {tris} dims {dims.x:.2f} {dims.y:.2f} {dims.z:.2f} armature {arm} groups {len(o.vertex_groups)} mats {mats[:6]}')
for o in bpy.context.scene.objects:
    if o.type != 'ARMATURE':
        continue
    print(f'ARMATURE {o.name} bones {len(o.data.bones)} scale {tuple(round(s, 3) for s in o.scale)}')
    def walk(bone, depth):
        if depth > 7:
            return
        head = o.matrix_world @ bone.head_local
        print('  ' * depth + f'{bone.name} ({head.x:.2f},{head.y:.2f},{head.z:.2f})')
        for child in bone.children:
            walk(child, depth + 1)
    for bone in o.data.bones:
        if bone.parent is None:
            walk(bone, 1)
