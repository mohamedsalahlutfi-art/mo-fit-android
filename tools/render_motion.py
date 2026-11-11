"""Render offline motion sprite sheets from the original rig.

Run from the project root: blender -b -t 2 --python tools/render_motion.py
"""
import math
import subprocess
import tempfile
from pathlib import Path

import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='app/src/main/assets/motion-model.glb')
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
actions = {track.name: track.strips[0].action for track in rig.animation_data.nla_tracks}
for track in rig.animation_data.nla_tracks:
    track.mute = True

def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    return mat

skin = material('Pearl ceramic', (.71, .77, .71))
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        obj.data.materials.clear()
        obj.data.materials.append(skin)

floor = material('Graphite', (.035, .043, .045))
stage = material('Charcoal', (.085, .10, .095))
accent = material('Lime accent', (.40, .62, .16))
props = material('Olive graphite', (.14, .23, .12))

def box(name, xyz, dimensions, mat, bevel=.009):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Soft edges', 'BEVEL')
        mod.width, mod.segments = bevel, 3
        obj.modifiers.new('Surface normals', 'WEIGHTED_NORMAL')
    obj.data.materials.append(mat)
    return obj

box('Backdrop', (0, 0, -.11), (200, 200, .05), floor, 0)
bpy.ops.mesh.primitive_cylinder_add(vertices=100, radius=1.25, depth=.065, location=(0,0,-.035))
bpy.context.object.data.materials.append(stage)
bpy.ops.mesh.primitive_torus_add(major_radius=1.245, minor_radius=.008, major_segments=100,
                                 location=(0,0,-.01))
bpy.context.object.data.materials.append(accent)
chair = [box('Seat',(0,.47,.324),(.54,.42,.05),props)]
for x in (-.23,.23):
    for y in (.64,.30):
        chair.append(box('Chair leg',(x,y,.15),(.045,.045,.30),props))
    chair.append(box('Chair back upright',(x,.65,.52),(.045,.045,.41),props))
chair.append(box('Chair back',(0,.65,.70),(.50,.045,.13),props))

def wall_edge(x, z, dims):
    return box('Wall outline', (x,-.793,z),dims,props)

wall = [wall_edge(x,.80,(.035,.045,1.60)) for x in (-.55,.55)]
wall += [wall_edge(0,z,(1.10,.045,.035)) for z in (.025,)]
for x in (-.242,.242):
    wall.append(wall_edge(x,1.40,(.10,.035,.21)))

bpy.ops.object.camera_add()
camera = bpy.context.object
scene = bpy.context.scene
scene.camera = camera
camera.data.type = 'ORTHO'
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x, scene.render.resolution_y = 288, 320
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
shading = scene.display.shading
shading.light = 'STUDIO'
shading.studio_light = 'paint.sl'
shading.color_type = 'MATERIAL'
shading.show_cavity = False
shading.cavity_type = 'BOTH'
shading.curvature_ridge_factor = .75
shading.curvature_valley_factor = .75
shading.show_shadows = True
scene.display.render_aa = '8'

destination = Path('app/src/main/assets/motion').resolve()
destination.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as temporary:
    frames = Path(temporary)
    for exercise in ('squat','wall','bridge'):
        rig.animation_data.action = actions[exercise]
        start, end = actions[exercise].frame_range
        for obj in chair:
            obj.hide_render = exercise != 'squat'
        for obj in wall:
            obj.hide_render = exercise != 'wall'
        for view, angle in [('front',0), ('side',math.pi/2), ('three',math.pi/4)]:
            bridge = exercise == 'bridge'
            target = Vector((0,-.06,.36 if bridge else .85))
            camera.location = target + Vector((4*math.sin(angle),-4*math.cos(angle),2.2 if bridge else 1.35))
            camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
            camera.data.ortho_scale = 2.22 if bridge else 2.08
            for frame in range(24):
                time = start + (end-start)*frame/24
                scene.frame_set(int(time), subframe=time-int(time))
                scene.render.filepath = str(frames/f'{frame:02d}.png')
                bpy.ops.render.render(write_still=True)
            subprocess.run([
                'ffmpeg','-loglevel','error','-y','-threads','1','-filter_threads','1',
                '-i',str(frames/'%02d.png'),'-vf','tile=6x4','-frames:v','1',
                '-c:v','libwebp','-quality','78',str(destination/f'{exercise}-{view}.webp'),
            ],check=True)
            if view == 'three':
                subprocess.run([
                    'ffmpeg','-loglevel','error','-y','-threads','1',
                    '-i',str(frames/'06.png'),'-c:v','libwebp','-quality','86',
                    str(destination/f'{exercise}-poster.webp'),
                ],check=True)
