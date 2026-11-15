# Blender: lists what is in a downloaded pack, or exports chosen pieces of it as light GLBs.
#
#   inspect: every top-level object, its size in metres, triangles, materials and textures (and
#            whether each texture file was found).
#     blender -b --factory-startup -P pack.py -- inspect <in.fbx|glb|obj>
#
#   export:  the named top-level objects (and everything under them) as one GLB, stood on the
#            ground at the origin, textures shrunk, mesh Draco compressed. Names are matched exactly,
#            or as a prefix when they end in '*'. Options:
#              tex=1024     largest texture side (normal and roughness maps get half)
#              tris=20000   reduce the mesh toward this many triangles (skipped when it tears: careful)
#              careful      no welding before reduction
#              scale=1      extra uniform scale (after the file's own units)
#              turn=0       turn round y, degrees, so the front faces +z
#              keep         keep the pieces where the file put them instead of centring
#              search=DIR   where to look for textures the file points at but that moved
#     blender -b --factory-startup -P pack.py -- export <in> <out.glb> <name> [name ...] [options]
import math
import os
import sys
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
mode, source = args[0], args[1]


def load(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ext = os.path.splitext(path)[1].lower()
    if ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=path)
    elif ext in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == '.obj':
        bpy.ops.wm.obj_import(filepath=path)
    elif ext == '.blend':
        bpy.ops.wm.open_mainfile(filepath=path)
    else:
        raise SystemExit(f'cannot open {path}')


def index_files(root):
    found = {}
    for folder, _, files in os.walk(root):
        for name in files:
            found.setdefault(name.lower(), os.path.join(folder, name))
            found.setdefault(os.path.splitext(name)[0].lower(), os.path.join(folder, name))
    return found


def relink(search):
    files = index_files(search)
    missing = []
    for img in bpy.data.images:
        if img.source != 'FILE' or img.packed_file:
            continue
        path = bpy.path.abspath(img.filepath)
        if os.path.exists(path):
            continue
        base = os.path.basename(path.replace('\\', '/')).lower()
        hit = files.get(base) or files.get(os.path.splitext(base)[0])
        if hit:
            img.filepath = hit
            img.reload()
        else:
            missing.append(img.name)
    return missing


def tree(o):
    yield o
    for child in o.children:
        yield from tree(child)


def tris_of(objs):
    total = 0
    for o in objs:
        if o.type == 'MESH':
            total += sum(len(p.vertices) - 2 for p in o.data.polygons)
    return total


def bounds(objs):
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        if o.type != 'MESH':
            continue
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    return lo, hi


def images_of(objs):
    seen = {}
    for o in objs:
        for slot in getattr(o, 'material_slots', []):
            m = slot.material
            if not m or not m.use_nodes:
                continue
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image:
                    seen[n.image.name] = os.path.exists(bpy.path.abspath(n.image.filepath)) or bool(n.image.packed_file)
    return seen


if mode == 'inspect':
    load(source)
    missing = relink(os.path.dirname(source))
    roots = [o for o in bpy.context.scene.objects if o.parent is None]
    print(f'== {source}: {len(roots)} roots, {tris_of(bpy.context.scene.objects)} tris, missing textures: {len(missing)}')
    for r in sorted(roots, key=lambda o: o.name):
        objs = list(tree(r))
        lo, hi = bounds(objs)
        size = hi - lo
        mats = sorted({s.material.name for o in objs for s in getattr(o, 'material_slots', []) if s.material})
        imgs = images_of(objs)
        kinds = sorted({o.type for o in objs})
        print(f'ROOT {r.name!r} [{",".join(kinds)}] size {size.x:.2f} x {size.z:.2f} x {size.y:.2f} (w,h,d) at ({(lo.x+hi.x)/2:.1f},{lo.z:.1f},{(lo.y+hi.y)/2:.1f}) tris {tris_of(objs)} objs {len(objs)}')
        print(f'   mats {mats[:12]}{" ..." if len(mats) > 12 else ""}')
        if imgs:
            print(f'   imgs {[(k, v) for k, v in list(imgs.items())[:10]]}')
    raise SystemExit(0)

# ---- export
out = args[2]
names, opts = [], {}
for a in args[3:]:
    if '=' in a:
        k, v = a.split('=', 1); opts[k] = v
    elif a in ('careful', 'keep'):
        opts[a] = True
    else:
        names.append(a)
tex = int(opts.get('tex', 1024))
target = int(opts.get('tris', 0))
scale = float(opts.get('scale', 1))
turn = math.radians(float(opts.get('turn', 0)))

load(source)
relink(opts.get('search', os.path.dirname(source)))


# Packs whose materials do not point at their textures: wire=DIR finds <material>_<kind> files,
# wireobj=DIR finds <object name without numbers>_<kind> files (a whole new material per object).
def wire_material(m, files, key):
    def find(*words):
        for name, path in files.items():
            if name.startswith(key) and any(w in name[len(key):] for w in words) and '.' in name:
                return path
        return None
    colour = find('base_color', 'basecolor', 'diffuse', 'albedo', '_color', 'col')
    if not colour:
        return False
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    out_node = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    links.new(bsdf.outputs['BSDF'], out_node.inputs['Surface'])

    def tex(path, colour_space):
        n = nodes.new('ShaderNodeTexImage')
        n.image = bpy.data.images.load(path, check_existing=True)
        n.image.colorspace_settings.name = colour_space
        return n
    c = tex(colour, 'sRGB')
    links.new(c.outputs['Color'], bsdf.inputs['Base Color'])
    opacity = find('opacity', 'alpha')
    if opacity:
        o = tex(opacity, 'Non-Color')
        links.new(o.outputs['Color'], bsdf.inputs['Alpha'])
        m.blend_method = 'CLIP'
    rough = find('rough')
    if rough:
        links.new(tex(rough, 'Non-Color').outputs['Color'], bsdf.inputs['Roughness'])
    metal = find('metal')
    if metal:
        links.new(tex(metal, 'Non-Color').outputs['Color'], bsdf.inputs['Metallic'])
    else:
        bsdf.inputs['Metallic'].default_value = 0
    normal = find('normal_opengl', 'normal')
    if normal:
        nm = nodes.new('ShaderNodeNormalMap')
        links.new(tex(normal, 'Non-Color').outputs['Color'], nm.inputs['Color'])
        links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return True


if 'wire' in opts:
    files = {k: v for k, v in index_files(opts['wire']).items() if '.' in k}
    for m in bpy.data.materials:
        wire_material(m, files, m.name.split('.')[0].lower() + '_')
if 'wireobj' in opts:
    import re
    files = {k: v for k, v in index_files(opts['wireobj']).items() if '.' in k}
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        key = re.sub(r'[\s\d.]+$', '', o.name).lower() + '_'
        m = bpy.data.materials.new(key.strip('_'))
        if wire_material(m, files, key):
            o.data.materials.clear()
            o.data.materials.append(m)


def wanted(o):
    return any(o.name == n or (n.endswith('*') and o.name.startswith(n[:-1])) or n == '*' for n in names)


roots = [o for o in bpy.context.scene.objects if o.parent is None and wanted(o)]
if not roots:
    raise SystemExit(f'nothing matches {names}')
keep = {x for r in roots for x in tree(r)}
for o in list(bpy.context.scene.objects):
    if o not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
for o in list(bpy.context.scene.objects):
    if o.type not in ('MESH', 'EMPTY', 'ARMATURE'):
        bpy.data.objects.remove(o, do_unlink=True)

# Pieces at the origin, front to +z (glTF +z is Blender -y), feet on the ground.
pivot = bpy.data.objects.new('pivot', None)
bpy.context.scene.collection.objects.link(pivot)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
lo, hi = bounds(meshes)
for r in roots:
    r.parent = pivot
    r.matrix_parent_inverse = pivot.matrix_world.inverted()
if 'keep' not in opts:
    pivot.location = Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))
    bpy.context.view_layer.update()
    # Re-centre round the origin before turning and scaling.
    holder = bpy.data.objects.new('holder', None)
    bpy.context.scene.collection.objects.link(holder)
    pivot.parent = holder
    holder.rotation_euler = (math.radians(float(opts.get('rotx', 0))), 0, turn)
    holder.scale = (scale, scale, scale)
else:
    holder = pivot
bpy.context.view_layer.update()

# Bake every transform into the meshes so the GLB has a clean root.
skinned = any(o.type == 'ARMATURE' for o in bpy.context.scene.objects)
if not skinned:
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    for o in list(bpy.context.scene.objects):
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Make single-user data so shared meshes are not transformed twice... join keeps it simple.
    if len(meshes) > 1:
        bpy.ops.object.join()
    meshes = [bpy.context.view_layer.objects.active]
    # After turning, stand it on the ground at the origin again.
    if 'keep' not in opts:
        lo, hi = bounds(meshes)
        shift = Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))
        meshes[0].data.transform(__import__('mathutils').Matrix.Translation(shift))
        meshes[0].data.update()

before = tris_of(meshes)
if target and before > target and not skinned:
    obj = meshes[0]
    bpy.context.view_layer.objects.active = obj
    if 'careful' not in opts:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.001)
        bpy.ops.object.mode_set(mode='OBJECT')
    for _ in range(4):
        now = tris_of([obj])
        if now <= target * 1.1:
            break
        mod = obj.modifiers.new('Decimate', 'DECIMATE')
        mod.ratio = target / now
        mod.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=mod.name)
after = tris_of(meshes)

# Shrink textures and write them where the exporter can read them.
import tempfile
scratch = os.path.join(tempfile.gettempdir(), 'siege-pack-tex', os.path.splitext(os.path.basename(out))[0])
os.makedirs(scratch, exist_ok=True)
alpha_images, data_images = set(), set()
for m in bpy.data.materials:
    if not m.use_nodes:
        continue
    for link in m.node_tree.links:
        n = link.from_node
        if n.type != 'TEX_IMAGE' or not n.image:
            continue
        if link.from_socket.name == 'Alpha':
            alpha_images.add(n.image.name)
        dest = link.to_socket.name.lower()
        if dest not in ('base color', 'emission color', 'color') or link.to_node.type == 'NORMAL_MAP':
            data_images.add(n.image.name)
for img in list(bpy.data.images):
    if img.source != 'FILE' or (not img.packed_file and not os.path.exists(bpy.path.abspath(img.filepath))):
        continue
    if not img.users:
        continue
    try:
        img.pixels[0]
    except Exception:
        continue
    limit = tex // 2 if img.name in data_images else tex
    if max(img.size) > limit:
        w, h = img.size
        f = limit / max(w, h)
        img.scale(max(1, int(w * f)), max(1, int(h * f)))
    png = img.name in alpha_images
    path = os.path.join(scratch, bpy.path.clean_name(img.name) + ('.png' if png else '.jpg'))
    img.filepath_raw = path
    img.file_format = 'PNG' if png else 'JPEG'
    img.save()
    if img.packed_file:
        img.unpack(method='REMOVE')
    img.filepath = path
    img.reload()

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='AUTO',
                          export_jpeg_quality=82, export_apply=True, export_skins=skinned,
                          export_animations=False,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
lo, hi = bounds([o for o in bpy.context.scene.objects if o.type == 'MESH'])
size = hi - lo
print(f'OK {os.path.basename(out)}: {before} -> {after} tris, {size.x:.2f} x {size.z:.2f} x {size.y:.2f} m (w,h,d), {os.path.getsize(out) // 1024} KB')
