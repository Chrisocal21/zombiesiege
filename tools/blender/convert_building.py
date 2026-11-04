# Blender: turns one baked building FBX into a light GLB for the game.
# blender -b --factory-startup -P convert_building.py -- <in.fbx> <textures dir> <texture prefix> <out.glb> <target tris> <texture size>
import os
import sys
import bpy

args = sys.argv[sys.argv.index('--') + 1:]
fbx, textures, prefix, out, target, size = args[:6]
# 'careful' skips welding and flat-face merging, which tear some meshes apart.
careful = 'careful' in args[6:]
target, size = int(target), int(size)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in bpy.context.scene.objects:
    o.select_set(o in meshes)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

count = lambda: sum(len(p.vertices) - 2 for p in obj.data.polygons)
tris = count()
# Weld corners the file stored separately, so the reduction can work across faces.
if not careful:
  bpy.ops.object.mode_set(mode='EDIT')
  bpy.ops.mesh.select_all(action='SELECT')
  bpy.ops.mesh.remove_doubles(threshold=0.002)
  bpy.ops.object.mode_set(mode='OBJECT')
# Flat walls first: merging coplanar faces loses nothing a texture does not already show.
if tris > target and not careful:
    mod = obj.modifiers.new('Planar', 'DECIMATE')
    mod.decimate_type = 'DISSOLVE'
    mod.angle_limit = 0.035
    mod.delimit = {'UV'}
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = obj.modifiers.new('Triangulate', 'TRIANGULATE')
    bpy.ops.object.modifier_apply(modifier=mod.name)
# Collapsing stalls on some meshes, so it runs a few times until it gets near the target.
for _ in range(4):
    now = count()
    if now <= target * 1.1:
        break
    mod = obj.modifiers.new('Decimate', 'DECIMATE')
    mod.ratio = target / now
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
after = count()


scratch = os.path.join(os.path.dirname(out), '_tex')
os.makedirs(scratch, exist_ok=True)


# Loads a map, shrinks it, and saves the shrunk copy, since the exporter reads from disk.
def image(kind, colour, limit):
    path = os.path.join(textures, f'{prefix}_{kind}.png')
    if not os.path.exists(path):
        return None
    img = bpy.data.images.load(path)
    if max(img.size) > limit:
        img.scale(limit, limit)
    small = os.path.join(scratch, f'{prefix}_{kind}.jpg')
    img.filepath_raw = small
    img.file_format = 'JPEG'
    img.save()
    img = bpy.data.images.load(small)
    img.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
    return img


mat = bpy.data.materials.new(prefix)
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
bsdf = nodes['Principled BSDF']
bsdf.inputs['Metallic'].default_value = 0.0
diffuse = image('Diffuse', True, size)
if diffuse:
    node = nodes.new('ShaderNodeTexImage'); node.image = diffuse
    links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
rough = image('Roughness', False, size // 2)
if rough:
    node = nodes.new('ShaderNodeTexImage'); node.image = rough
    links.new(node.outputs['Color'], bsdf.inputs['Roughness'])
normal = image('Normal', False, size // 2)
if normal:
    node = nodes.new('ShaderNodeTexImage'); node.image = normal
    nmap = nodes.new('ShaderNodeNormalMap')
    links.new(node.outputs['Color'], nmap.inputs['Color'])
    links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
obj.data.materials.clear()
obj.data.materials.append(mat)
obj.name = prefix

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG',
                          export_jpeg_quality=82, use_selection=False, export_apply=True,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print(f'OK {prefix}: {tris} -> {after} tris, {os.path.getsize(out) // 1024} KB')
