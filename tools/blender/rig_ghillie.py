"""Rig the unrigged ghillie soldier (tripo, exported with pack.py turn=-90) onto a Mixamo-named skeleton.

The soldier stands in an A pose (arms angled down), not a T pose, so the bones are laid
along the body as it is and skinned with automatic weights. The game's character rig poses any
Mixamo-named skeleton by joint angles, and reads the arms' rest from these bones.

  "$B" -b --factory-startup -P rig_ghillie.py -- ghillie-raw.glb ghillie.glb

Coordinates are Blender's (x across, y depth with the face towards -y, z up), in metres, read off
the mesh's vertex bands.
"""
import bpy, sys
from mathutils import Vector

src, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
for o in list(bpy.data.objects):
    if o.type != 'MESH':
        bpy.data.objects.remove(o)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
if len(meshes) > 1:
    bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
body.name = 'Ghillie'

# name, head, tail, parent
P = 'mixamorig:'
J = {
    'Hips': ((0, 0.0, 0.92), (0, 0.0, 1.05), None),
    'Spine': ((0, 0.0, 1.05), (0, 0.0, 1.2), 'Hips'),
    'Spine1': ((0, 0.0, 1.2), (0, 0.0, 1.32), 'Spine'),
    'Spine2': ((0, 0.0, 1.32), (0, -0.01, 1.45), 'Spine1'),
    'Neck': ((0, -0.01, 1.45), (0, -0.03, 1.55), 'Spine2'),
    'Head': ((0, -0.03, 1.55), (0, -0.05, 1.78), 'Neck'),
}
for side, sx in (('Left', 1), ('Right', -1)):
    J[side + 'Shoulder'] = ((0.03 * sx, -0.02, 1.38), (0.2 * sx, -0.02, 1.38), 'Spine2')
    J[side + 'Arm'] = ((0.2 * sx, -0.02, 1.38), (0.4 * sx, -0.03, 1.12), side + 'Shoulder')
    J[side + 'ForeArm'] = ((0.4 * sx, -0.03, 1.12), (0.5 * sx, -0.13, 0.95), side + 'Arm')
    J[side + 'Hand'] = ((0.5 * sx, -0.13, 0.95), (0.58 * sx, -0.17, 0.85), side + 'ForeArm')
    J[side + 'UpLeg'] = ((0.11 * sx, 0.0, 0.92), (0.12 * sx, -0.03, 0.5), 'Hips')
    J[side + 'Leg'] = ((0.12 * sx, -0.03, 0.5), (0.11 * sx, 0.03, 0.1), side + 'UpLeg')
    J[side + 'Foot'] = ((0.11 * sx, 0.03, 0.1), (0.11 * sx, -0.08, 0.03), side + 'Leg')
    J[side + 'ToeBase'] = ((0.11 * sx, -0.08, 0.03), (0.11 * sx, -0.2, 0.02), side + 'Foot')

bpy.ops.object.armature_add(enter_editmode=True)
arm = bpy.context.object
arm.name = 'Armature'
bones = arm.data.edit_bones
for b in list(bones):
    bones.remove(b)
for name, (head, tail, parent) in J.items():
    bone = bones.new(P + name)
    bone.head, bone.tail = Vector(head), Vector(tail)
    if parent:
        bone.parent = bones[P + parent]
bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
try:
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
except RuntimeError as error:
    print('auto weights failed, using envelopes:', error)
    bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')
# Loose pieces (teeth, the tongue) get no heat weight: give each to the nearest bone.
def nearest(point):
    best, name = 1e9, None
    for b in arm.data.bones:
        a, c = b.head_local, b.tail_local
        ab = c - a
        t = max(0.0, min(1.0, (point - a).dot(ab) / max(ab.length_squared, 1e-9)))
        d = (point - (a + ab * t)).length
        if d < best:
            best, name = d, b.name
    return name
for v in body.data.vertices:
    if not v.groups:
        body.vertex_groups[nearest(body.matrix_world @ v.co)].add([v.index], 1.0, 'REPLACE')
used = sum(1 for g in body.vertex_groups if any(True for v in body.data.vertices if any(x.group == g.index and x.weight > 0 for x in v.groups)))
unweighted = sum(1 for v in body.data.vertices if not v.groups)
print(f'groups with weight: {used}/{len(body.vertex_groups)}, unweighted vertices: {unweighted}')

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_animations=False,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('OK', out)
