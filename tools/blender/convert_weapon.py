# Blender: turns a weapon .blend into a small GLB of named parts, pointing down -z (y up) in metres,
# its origin on the middle of the main body. The arms and stray scenery in the file are left out.
# blender -b --factory-startup <in.blend> -P convert_weapon.py -- <out.glb> <scale> <rotate z degrees> <main part> <part>[=steel|wood] ...
import math
import os
import sys
import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
out, scale, turn, main = args[0], float(args[1]), float(args[2]), args[3]
parts = {}
for entry in args[4:]:
    name, _, paint = entry.partition('=')
    parts[name] = paint

PAINT = {
    'steel': ((0.16, 0.17, 0.18, 1), 0.65, 0.45),
    'wood': ((0.30, 0.17, 0.085, 1), 0.0, 0.62),
}

for o in list(bpy.data.objects):
    if o.name not in parts:
        bpy.data.objects.remove(o, do_unlink=True)
objects = [bpy.data.objects[name] for name in parts]
for o in objects:
    for mod in list(o.modifiers):
        if mod.type == 'ARMATURE':
            o.modifiers.remove(mod)
    o.vertex_groups.clear()
    world = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = world

fix = Matrix.Rotation(math.radians(turn), 4, 'Z') @ Matrix.Scale(scale, 4)
for o in objects:
    o.matrix_world = fix @ o.matrix_world
bpy.ops.object.select_all(action='DESELECT')
for o in objects:
    o.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

corners = [bpy.data.objects[main].matrix_world @ Vector(c) for c in bpy.data.objects[main].bound_box]
centre = sum(corners, Vector()) / 8
for o in objects:
    o.data.transform(Matrix.Translation(-centre))

for o in objects:
    paint = parts[o.name]
    if paint == 'mixed':
        # Keeps the file's material slots but paints them flat: the wooden ones wood, the rest steel.
        slots = []
        for slot in o.data.materials:
            kind = 'wood' if slot and slot.name.split('.')[0] in ('coloredbody', 'METAL') and slot.name != 'METAL.002' else 'steel'
            colour, metal, rough = PAINT[kind]
            m = bpy.data.materials.new(f'{o.name}-{kind}')
            m.use_nodes = True
            b = m.node_tree.nodes['Principled BSDF']
            b.inputs['Base Color'].default_value = colour
            b.inputs['Metallic'].default_value = metal
            b.inputs['Roughness'].default_value = rough
            slots.append(m)
        o.data.materials.clear()
        for m in slots:
            o.data.materials.append(m)
    elif paint:
        colour, metal, rough = PAINT[paint]
        m = bpy.data.materials.new(f'{o.name}-{paint}')
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = colour
        b.inputs['Metallic'].default_value = metal
        b.inputs['Roughness'].default_value = rough
        o.data.materials.clear()
        o.data.materials.append(m)
    o.data.update()
    vs = [v.co for v in o.data.vertices]
    print('BOX', o.name, [round(min(v[i] for v in vs), 3) for i in range(3)], [round(max(v[i] for v in vs), 3) for i in range(3)], len(o.data.polygons))

os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=85,
                          export_apply=True, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('OK', out, os.path.getsize(out) // 1024, 'KB')
