# Blender: splits the 3 zombie collection FBX into one GLB per character, each with its own
# skeleton, its meshes and its textures (colour and normal, shrunk).
# blender -b --factory-startup -P split_characters.py -- <in.fbx> <textures dir> <out dir>
import os
import sys
import bpy

fbx, textures, out_dir = sys.argv[sys.argv.index('--') + 1:]
NAMES = {'Man Heroe': 'survivor', 'Zombie': 'zombie-a', 'Zombie Girl': 'zombie-b'}
scratch = os.path.join(out_dir, '_tex')
os.makedirs(scratch, exist_ok=True)


def load():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=fbx)
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    return arm


def descendants(bone):
    names = {bone.name}
    for child in bone.children:
        names |= descendants(child)
    return names


def kind(material):
    return material.name.split('.')[0]


# Which character each mesh belongs to: the skeleton its vertex groups point at.
def characters(arm):
    roots = [b for b in arm.data.bones if b.parent is None]
    groups = {r.name: descendants(r) for r in roots}
    owned = {r.name: [] for r in roots}
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        names = {g.name for g in o.vertex_groups}
        best = max(groups, key=lambda r: len(names & groups[r]))
        owned[best].append(o.name)
    result = {}
    for root, meshes in owned.items():
        kinds = {kind(s.material) for m in meshes for s in bpy.data.objects[m].material_slots if s.material}
        who = 'Man Heroe' if 'Top' in kinds else 'Zombie' if 'Moustache' in kinds else 'Zombie Girl'
        result[who] = (root, meshes, groups[root])
    return result


def image(path, colour, limit):
    if not os.path.exists(path):
        return None
    img = bpy.data.images.load(path)
    if max(img.size) > limit:
        img.scale(limit, limit)
    small = os.path.join(scratch, os.path.basename(path).replace(' ', '_'))
    img.filepath_raw = small
    img.file_format = 'PNG'
    img.save()
    img = bpy.data.images.load(small)
    img.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
    return img


def dress(material, who):
    k = kind(material)
    base = os.path.join(textures, who, f'{who}_{k}_')
    big = 1024 if k == 'Body' else 512
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    bsdf.inputs['Roughness'].default_value = 0.85 if k != 'Shoes' else 0.6
    colour = image(base + 'diffuse.png', True, big)
    if colour:
        node = nodes.new('ShaderNodeTexImage'); node.image = colour
        links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
        # Hair, beards and lashes are cut out by the colour map's alpha.
        if k in ('Hair', 'Beard', 'Moustache'):
            links.new(node.outputs['Alpha'], bsdf.inputs['Alpha'])
            material.blend_method = 'CLIP'
            material.alpha_threshold = 0.5
    normal = image(base + 'normal.png', False, big // 2)
    if normal:
        node = nodes.new('ShaderNodeTexImage'); node.image = normal
        nmap = nodes.new('ShaderNodeNormalMap')
        links.new(node.outputs['Color'], nmap.inputs['Color'])
        links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])


arm = load()
plan = {who: (root, meshes) for who, (root, meshes, _) in characters(arm).items()}
for who, (root, meshes) in plan.items():
    arm = load()
    keep = characters(arm)[who][2]
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH' and o.name not in meshes:
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for bone in list(arm.data.edit_bones):
        if bone.name not in keep:
            arm.data.edit_bones.remove(bone)
    bpy.ops.object.mode_set(mode='OBJECT')
    seen = set()
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            for slot in o.material_slots:
                if slot.material and slot.material.name not in seen:
                    seen.add(slot.material.name)
                    dress(slot.material, who)
    out = os.path.join(out_dir, NAMES[who] + '.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG',
                              export_jpeg_quality=85, export_skins=True, export_animations=False,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
    print(f'OK {who} -> {NAMES[who]}: root {root}, {len(meshes)} meshes, {tris} tris, {len(keep)} bones, {os.path.getsize(out) // 1024} KB')
