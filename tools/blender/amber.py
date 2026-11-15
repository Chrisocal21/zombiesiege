"""Amber (Character Creator, about 1.6 million triangles) down to a game character with a Mixamo-named skeleton.

Drops the meshes nothing sees (tear lines, eye occlusion, teeth, tongue, underwear), decimates each of the rest
to a budget, renames the main bones (and the matching vertex groups) to the Mixamo names the game's character rig
reads, shrinks the textures and exports a Draco GLB with the skin.

  "$B" -b --factory-startup -P amber.py -- Amber.Fbx amber.glb [scale=1]

She stands in a T pose, so the rig drops her arms like the survivor's.
"""
import bpy, sys

args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src)

DROP = ('CC_Base_TearLine', 'CC_Base_EyeOcclusion', 'CC_Base_Teeth', 'CC_Base_Tongue', 'Underwear_Bottoms', 'Bra')
# target triangles per mesh
BUDGET = {'CC_Base_Body': 9000, 'Jeans': 3500, 'Punk_Leather_Jacket': 4500, 'Crop_T_Shirt': 1500, 'Boots': 1800,
          'CC_Base_Eye': 600, 'Camila_Brow': 300, 'Hair_Base': 2500, 'Bang': 800, 'Bun': 800, 'Real_Hair': 2500}
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name in DROP:
        bpy.data.objects.remove(o)

bpy.context.view_layer.update()
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    if o.data.shape_keys:
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.shape_key_remove(all=True)
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    want = BUDGET.get(o.name, 1000)
    if tris > want:
        bpy.context.view_layer.objects.active = o
        mod = o.modifiers.new('Reduce', 'DECIMATE')
        mod.ratio = want / tris
        mod.use_collapse_triangulate = True
        # keep the armature modifier last
        arm_mod = next((m for m in o.modifiers if m.type == 'ARMATURE'), None)
        if arm_mod:
            while o.modifiers[-1] != arm_mod:
                bpy.ops.object.modifier_move_down(modifier=arm_mod.name)
        # apply the reduction only (the armature modifier stays live)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    print('mesh', o.name, tris, '->', sum(len(p.vertices) - 2 for p in o.data.polygons))

# Mixamo names for the bones the game rig reads (everything else keeps its CC name and follows its parent).
MAP = {'Hip': 'Hips', 'Waist': 'Spine', 'Spine01': 'Spine1', 'Spine02': 'Spine2', 'NeckTwist01': 'Neck', 'Head': 'Head'}
for side, mix in (('L', 'Left'), ('R', 'Right')):
    MAP.update({f'{side}_Clavicle': f'{mix}Shoulder', f'{side}_Upperarm': f'{mix}Arm', f'{side}_Forearm': f'{mix}ForeArm',
                f'{side}_Hand': f'{mix}Hand', f'{side}_Thigh': f'{mix}UpLeg', f'{side}_Calf': f'{mix}Leg',
                f'{side}_Foot': f'{mix}Foot', f'{side}_ToeBase': f'{mix}ToeBase'})
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
# The rig expects the hips to hang straight off the armature, not off a root bone: take BoneRoot out.
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
if 'CC_Base_BoneRoot' in eb:
    for child in list(eb['CC_Base_BoneRoot'].children):
        child.parent = None
    eb.remove(eb['CC_Base_BoneRoot'])
bpy.ops.object.mode_set(mode='OBJECT')
rename = {}
for b in arm.data.bones:
    short = b.name.replace('CC_Base_', '')
    if short in MAP:
        rename[b.name] = 'mixamorig:' + MAP[short]
for o in bpy.data.objects:
    if o.type == 'MESH':
        for g in o.vertex_groups:
            if g.name in rename:
                g.name = rename[g.name]
for old, new in rename.items():
    arm.data.bones[old].name = new
print('renamed', len(rename), 'bones:', sorted(rename.values()))

# Textures: skin, jeans, jacket and shirt colour at 1024, everything else smaller; normal and specular maps as JPEG.
def limit_for(name):
    n = name.lower()
    if any(w in n for w in ('nails', 'eyelash', 'scalp')):
        return 256
    if any(w in n for w in ('normal', 'specular', 'hair', 'brow', 'boots')):
        return 512
    return 1024
for img in bpy.data.images:
    cap = limit_for(img.name)
    if max(img.size) > cap:
        k = cap / max(img.size)
        img.scale(max(1, int(img.size[0] * k)), max(1, int(img.size[1] * k)))
    if any(w in img.name.lower() for w in ('normal', 'specular')):
        img.file_format = 'JPEG'

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_animations=False,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('OK', out)
