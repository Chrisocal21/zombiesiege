"""Strip the ghillie soldier down to roughly half its gear: delete every loose piece smaller than a
threshold (the leaf clutter, pouches and straps), keeping the body, vest, cloak and pack.

  "$B" -b --factory-startup -P lite_ghillie.py -- ghillie-raw.glb ghillie-lite-raw.glb [min_verts=150]

Rig the result with rig_ghillie.py as usual.
"""
import bpy, sys, bmesh
args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[:2]
limit = int(args[2]) if len(args) > 2 else 150
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
o = [o for o in bpy.data.objects if o.type == 'MESH'][0]
bm = bmesh.new(); bm.from_mesh(o.data)
# The file splits vertices at texture seams: weld by position to find the real loose pieces.
weld = bm.copy()
bmesh.ops.remove_doubles(weld, verts=weld.verts, dist=1e-4)
seen, drop = set(), []
src_bm, bm = bm, weld
for v in bm.verts:
    if v.index in seen: continue
    st, comp = [v], []
    seen.add(v.index)
    while st:
        a = st.pop(); comp.append(a)
        for e in a.link_edges:
            b = e.other_vert(a)
            if b.index not in seen: seen.add(b.index); st.append(b)
    if len(comp) < limit: drop += comp
# Delete in the original mesh every vertex that sits where a dropped welded vertex was.
from mathutils import kdtree
tree = kdtree.KDTree(len(drop)); [tree.insert(v.co, i) for i, v in enumerate(drop)]; tree.balance()
gone = [v for v in src_bm.verts if tree.find(v.co)[2] < 1e-3] if drop else []
total = len(src_bm.verts)
drop = gone
bmesh.ops.delete(src_bm, geom=gone, context='VERTS')
src_bm.to_mesh(o.data); src_bm.free()
print(f'removed {len(drop)} of {total} vertices')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('OK', out)
